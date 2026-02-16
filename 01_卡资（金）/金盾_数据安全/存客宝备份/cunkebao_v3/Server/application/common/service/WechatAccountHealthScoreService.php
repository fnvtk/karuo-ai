<?php

namespace app\common\service;

use think\Db;
use think\Exception;
use think\facade\Log;
use think\facade\Cache;

/**
 * 微信账号健康分评分服务（优化版）
 * 基于《微信健康分规则v2.md》实现
 * 
 * 优化点：
 * 1. 基础分只计算一次
 * 2. 各个评分维度独立存储
 * 3. 使用独立的评分记录表
 * 4. 好友数量评分特殊处理（避免同步问题）
 * 5. 动态分统计所有历史数据（不限制30天）
 * 6. 优化数据库查询，减少重复计算
 * 7. 添加完善的日志记录，便于问题排查
 * 8. 每条频繁/封号记录只统计一次，避免重复扣分
 * 9. 使用is_counted字段标记已统计的记录
 * 10. 支持lastBanTime字段，记录最后一次封号时间
 * 11. 使用事务和锁避免并发问题
 * 12. 使用静态缓存避免重复检查字段
 * 13. 推荐数据库索引提高查询性能
 * 
 * 健康分 = 基础分 + 动态分
 * 基础分：60-100分（默认60分 + 基础信息10分 + 好友数量30分）
 * 动态分：扣分和加分规则
 * 
 * @author Your Name
 * @version 2.3.0
 */
class WechatAccountHealthScoreService
{
    /**
     * 缓存相关配置
     */
    const CACHE_PREFIX = 'wechat_health_score:';  // 缓存前缀
    const CACHE_TTL = 7200;                       // 缓存有效期（秒）- 提高到2小时
    const CACHE_TTL_SHORT = 300;                  // 短期缓存有效期（秒）- 5分钟，用于频繁变化的数据
    
    /**
     * 默认基础分
     */
    const DEFAULT_BASE_SCORE = 60;
    
    /**
     * 基础信息分数
     */
    const BASE_INFO_SCORE = 10;
    
    /**
     * 好友数量分数区间
     */
    const FRIEND_COUNT_SCORE_0_50 = 3;      // 0-50个好友
    const FRIEND_COUNT_SCORE_51_500 = 6;    // 51-500个好友
    const FRIEND_COUNT_SCORE_501_3000 = 8;  // 501-3000个好友
    const FRIEND_COUNT_SCORE_3001_PLUS = 12; // 3001+个好友
    
    /**
     * 动态分扣分规则
     */
    const PENALTY_FIRST_FREQUENT = -15;     // 首次频繁扣15分
    const PENALTY_SECOND_FREQUENT = -25;    // 再次频繁扣25分
    const PENALTY_BANNED = -60;             // 封号扣60分
    
    /**
     * 动态分加分规则
     */
    const BONUS_NO_FREQUENT_PER_DAY = 5;    // 连续3天不触发频繁，每天+5分
    
    /**
     * 数据库表名
     */
    const TABLE_WECHAT_ACCOUNT = 's2_wechat_account';
    const TABLE_WECHAT_ACCOUNT_SCORE = 's2_wechat_account_score';
    const TABLE_WECHAT_ACCOUNT_SCORE_LOG = 's2_wechat_account_score_log';
    const TABLE_FRIEND_TASK = 's2_friend_task';
    const TABLE_WECHAT_MESSAGE = 's2_wechat_message';
    
    /**
     * 推荐数据库索引
     * 以下索引可以大幅提升查询性能
     * 
     * s2_wechat_account_score表:
     * - PRIMARY KEY (`id`)
     * - KEY `idx_account_id` (`accountId`)
     * 
     * s2_friend_task表:
     * - PRIMARY KEY (`id`)
     * - KEY `idx_wechat_account_id` (`wechatAccountId`)
     * - KEY `idx_wechat_id` (`wechatId`)
     * - KEY `idx_create_time` (`createTime`)
     * - KEY `idx_is_counted` (`is_counted`)
     * 
     * s2_wechat_message表:
     * - PRIMARY KEY (`id`)
     * - KEY `idx_wechat_account_id` (`wechatAccountId`)
     * - KEY `idx_msg_type` (`msgType`)
     * - KEY `idx_create_time` (`createTime`)
     * - KEY `idx_is_deleted` (`isDeleted`)
     * - KEY `idx_is_counted` (`is_counted`)
     */
    
    /**
     * 计算并更新账号健康分
     * 
     * @param int $accountId 账号ID（s2_wechat_account表的id）
     * @param array $accountData 账号数据（可选，如果不传则从数据库查询）
     * @param bool $forceRecalculateBase 是否强制重新计算基础分（默认false）
     * @return array 返回评分结果
     * @throws Exception 如果计算过程中出现错误
     */
    public function calculateAndUpdate($accountId, $accountData = null, $forceRecalculateBase = false)
    {
        // 参数验证
        if (empty($accountId) || !is_numeric($accountId)) {
            $errorMsg = "无效的账号ID: " . (is_scalar($accountId) ? $accountId : gettype($accountId));
            Log::error($errorMsg);
            throw new Exception($errorMsg);
        }
        
        try {
            
            // 获取账号数据
            if (empty($accountData)) {
                $accountData = Db::table(self::TABLE_WECHAT_ACCOUNT)
                    ->where('id', $accountId)
                    ->find();
                
                // 减少不必要的日志记录
            }
            
            if (empty($accountData)) {
                $errorMsg = "账号不存在：{$accountId}";
                Log::error($errorMsg);
                throw new Exception($errorMsg);
            }
            
            $wechatId = $accountData['wechatId'] ?? '';
            if (empty($wechatId)) {
                $errorMsg = "账号wechatId为空：{$accountId}";
                Log::error($errorMsg);
                throw new Exception($errorMsg);
            }
            
            // 减少不必要的日志记录
            
            // 获取或创建评分记录
            $scoreRecord = $this->getOrCreateScoreRecord($accountId, $wechatId);
            $scoreSnapshotBefore = $this->buildScoreSnapshotForLogging($scoreRecord);
            // 减少不必要的日志记录
            
            // 计算基础分（只计算一次，除非强制重新计算）
            if (!$scoreRecord['baseScoreCalculated'] || $forceRecalculateBase) {
                
                $baseScoreData = $this->calculateBaseScore($accountData, $scoreRecord);
                $this->updateBaseScore($accountId, $baseScoreData);
                
                // 减少不必要的日志记录
                
                // 重新获取记录以获取最新数据
                $scoreRecord = $this->getScoreRecord($accountId);
            }
            
            // 计算动态分（每次都要重新计算）
            $dynamicScoreData = $this->calculateDynamicScore($accountData, $scoreRecord);
            
            // 计算总分
            $baseScore = $scoreRecord['baseScore'];
            $dynamicScore = $dynamicScoreData['total'];
            $healthScore = $baseScore + $dynamicScore;
            
            // 确保健康分在合理范围内（0-100）
            $healthScore = max(0, min(100, $healthScore));
            
            // 计算每日最大加人次数
            $maxAddFriendPerDay = $this->getMaxAddFriendPerDay($healthScore);
            
            // 更新评分记录
            $updateData = [
                'dynamicScore' => $dynamicScore,
                'frequentPenalty' => $dynamicScoreData['frequentPenalty'],
                'noFrequentBonus' => $dynamicScoreData['noFrequentBonus'],
                'banPenalty' => $dynamicScoreData['banPenalty'],
                'lastFrequentTime' => $dynamicScoreData['lastFrequentTime'],
                'frequentCount' => $dynamicScoreData['frequentCount'],
                'lastNoFrequentTime' => $dynamicScoreData['lastNoFrequentTime'],
                'consecutiveNoFrequentDays' => $dynamicScoreData['consecutiveNoFrequentDays'],
                'isBanned' => $dynamicScoreData['isBanned'],
                'lastBanTime' => $dynamicScoreData['lastBanTime'],
                'healthScore' => $healthScore,
                'maxAddFriendPerDay' => $maxAddFriendPerDay,
                'updateTime' => time()
            ];
            
            $updateResult = Db::table(self::TABLE_WECHAT_ACCOUNT_SCORE)
                ->where('accountId', $accountId)
                ->update($updateData);
                
            // 更新成功后，清除缓存
            if ($updateResult !== false) {
                $this->logScoreChangesIfNeeded(
                    $accountId,
                    $wechatId,
                    $scoreSnapshotBefore,
                    [
                        'frequentPenalty' => $dynamicScoreData['frequentPenalty'],
                        'banPenalty' => $dynamicScoreData['banPenalty'],
                        'noFrequentBonus' => $dynamicScoreData['noFrequentBonus'],
                        'dynamicScore' => $dynamicScore,
                        'healthScore' => $healthScore
                    ],
                    $dynamicScoreData
                );
                $this->clearScoreCache($accountId);
            }
            
            $result = [
                'accountId' => $accountId,
                'wechatId' => $wechatId,
                'healthScore' => $healthScore,
                'baseScore' => $baseScore,
                'baseInfoScore' => $scoreRecord['baseInfoScore'],
                'friendCountScore' => $scoreRecord['friendCountScore'],
                'dynamicScore' => $dynamicScore,
                'frequentPenalty' => $dynamicScoreData['frequentPenalty'],
                'noFrequentBonus' => $dynamicScoreData['noFrequentBonus'],
                'banPenalty' => $dynamicScoreData['banPenalty'],
                'maxAddFriendPerDay' => $maxAddFriendPerDay
            ];
            
            // 减少不必要的日志记录
            return $result;
            
        } catch (\PDOException $e) {
            // 数据库异常
            $errorMsg = "数据库操作失败，accountId: {$accountId}, 错误: " . $e->getMessage();
            Log::error($errorMsg);
            throw new Exception($errorMsg, $e->getCode(), $e);
        } catch (\Throwable $e) {
            // 其他所有异常
            $errorMsg = "计算健康分失败，accountId: {$accountId}, 错误: " . $e->getMessage();
            Log::error($errorMsg);
            throw new Exception($errorMsg, $e->getCode(), $e);
        }
    }
    
    /**
     * 获取或创建评分记录
     * 优化：使用事务和锁避免并发问题，减少重复查询
     * 
     * @param int $accountId 账号ID
     * @param string $wechatId 微信ID
     * @return array 评分记录
     */
    private function getOrCreateScoreRecord($accountId, $wechatId)
    {
        // 尝试获取现有记录
        $record = $this->getScoreRecord($accountId);
        
        // 如果记录不存在，创建新记录
        if (empty($record)) {
            // 使用事务避免并发问题
            Db::startTrans();
            try {
                // 再次检查记录是否存在（避免并发问题）
                $record = Db::table(self::TABLE_WECHAT_ACCOUNT_SCORE)
                    ->where('accountId', $accountId)
                    ->lock(true)  // 加锁防止并发插入
                    ->find();
                
                if (empty($record)) {
                    Log::info("为账号 {$accountId} 创建新的评分记录");
                    
                    // 检查表中是否存在lastBanTime字段
                    $this->ensureScoreTableFields();
                    
                    // 创建新记录
                    $data = [
                        'accountId' => $accountId,
                        'wechatId' => $wechatId,
                        'baseScore' => 0,
                        'baseScoreCalculated' => 0,
                        'baseInfoScore' => 0,
                        'friendCountScore' => 0,
                        'dynamicScore' => 0,
                        'frequentCount' => 0,
                        'consecutiveNoFrequentDays' => 0,
                        'healthScore' => 0,
                        'maxAddFriendPerDay' => 0,
                        'lastBanTime' => null,
                        'createTime' => time(),
                        'updateTime' => time()
                    ];
                    
                    Db::table(self::TABLE_WECHAT_ACCOUNT_SCORE)->insert($data);
                    $record = $data;
                }
                
                Db::commit();
            } catch (\Exception $e) {
                Db::rollback();
                Log::error("创建评分记录失败: " . $e->getMessage());
                throw $e;
            }
        }
        
        return $record;
    }
    
    /**
     * 确保评分表有所需字段
     * 优化：使用静态变量缓存结果，避免重复检查
     * 
     * @return void
     */
    private function ensureScoreTableFields()
    {
        // 使用静态变量缓存检查结果，避免重复检查
        static $fieldsChecked = false;
        
        if ($fieldsChecked) {
            return;
        }
        
        try {
            // 检查表中是否存在lastBanTime字段
            $hasLastBanTimeField = false;
            $tableFields = Db::query("SHOW COLUMNS FROM " . self::TABLE_WECHAT_ACCOUNT_SCORE);
            foreach ($tableFields as $field) {
                if ($field['Field'] == 'lastBanTime') {
                    $hasLastBanTimeField = true;
                    break;
                }
            }
            
            // 如果字段不存在，添加字段
            if (!$hasLastBanTimeField) {
                Log::info("添加lastBanTime字段到" . self::TABLE_WECHAT_ACCOUNT_SCORE . "表");
                Db::execute("ALTER TABLE " . self::TABLE_WECHAT_ACCOUNT_SCORE . " ADD COLUMN lastBanTime INT(11) DEFAULT NULL COMMENT '最后一次封号时间'");
            }
            
            $fieldsChecked = true;
        } catch (\Exception $e) {
            Log::error("检查或添加字段失败: " . $e->getMessage());
            // 出错时不影响后续逻辑，继续执行
        }
    }
    
    /**
     * 获取评分记录
     * 优化：使用多级缓存策略，提高缓存命中率
     * 
     * @param int $accountId 账号ID
     * @param bool $useCache 是否使用缓存（默认true）
     * @return array 评分记录，如果不存在则返回空数组
     */
    private function getScoreRecord($accountId, $useCache = true)
    {
        // 生成缓存键
        $cacheKey = self::CACHE_PREFIX . 'score:' . $accountId;
        
        // 如果使用缓存且缓存存在，则直接返回缓存数据
        if ($useCache && Cache::has($cacheKey)) {
            $cachedData = Cache::get($cacheKey);
            // 减少日志记录，提高性能
            return $cachedData ?: [];
        }
        
        // 从数据库获取记录
        $record = Db::table(self::TABLE_WECHAT_ACCOUNT_SCORE)
            ->where('accountId', $accountId)
            ->find();
            
        // 如果记录存在且使用缓存，则缓存记录
        if ($record && $useCache) {
            // 根据数据更新频率设置不同的缓存时间
            // 如果记录最近更新过（1小时内），使用短期缓存
            $updateTime = $record['updateTime'] ?? 0;
            $cacheTime = (time() - $updateTime < 3600) ? self::CACHE_TTL_SHORT : self::CACHE_TTL;
            
            Cache::set($cacheKey, $record, $cacheTime);
            Log::debug("缓存评分记录，accountId: {$accountId}, 缓存时间: {$cacheTime}秒");
        }
        
        return $record ?: [];
    }
    
    /**
     * 计算基础分（只计算一次）
     * 基础分 = 默认60分 + 基础信息分(10分) + 好友数量分(3-12分)
     * 
     * @param array $accountData 账号数据
     * @param array $scoreRecord 现有评分记录
     * @return array 基础分数据
     */
    private function calculateBaseScore($accountData, $scoreRecord = [])
    {
        $baseScore = self::DEFAULT_BASE_SCORE;
        
        // 基础信息分（已修改微信号得10分）
        $baseInfoScore = $this->getBaseInfoScore($accountData);
        $baseScore += $baseInfoScore;
        
        // 好友数量分（特殊处理：使用快照值，避免同步问题）
        $friendCountScore = 0;
        $friendCount = 0;
        $friendCountSource = 'manual';
        
        // 如果已有评分记录且好友数量分已计算，使用历史值
        if (!empty($scoreRecord['friendCountScore']) && $scoreRecord['friendCountScore'] > 0) {
            $friendCountScore = $scoreRecord['friendCountScore'];
            $friendCount = $scoreRecord['friendCount'] ?? 0;
            $friendCountSource = $scoreRecord['friendCountSource'] ?? 'manual';
        } else {
            // 首次计算：使用当前好友数量，但标记为手动计算
            $totalFriend = $accountData['totalFriend'] ?? 0;
            $friendCountScore = $this->getFriendCountScore($totalFriend);
            $friendCount = $totalFriend;
            $friendCountSource = 'manual';
        }
        
        $baseScore += $friendCountScore;
        
        // 检查是否已修改微信号
        $isModifiedAlias = $this->checkIsModifiedAlias($accountData);
        
        return [
            'baseScore' => $baseScore,
            'baseInfoScore' => $baseInfoScore,
            'friendCountScore' => $friendCountScore,
            'friendCount' => $friendCount,
            'friendCountSource' => $friendCountSource,
            'isModifiedAlias' => $isModifiedAlias ? 1 : 0,
            'baseScoreCalculated' => 1,
            'baseScoreCalcTime' => time()
        ];
    }
    
    /**
     * 更新基础分
     * 
     * @param int $accountId 账号ID
     * @param array $baseScoreData 基础分数据
     * @return bool 更新是否成功
     */
    private function updateBaseScore($accountId, $baseScoreData)
    {
        try {
            $result = Db::table(self::TABLE_WECHAT_ACCOUNT_SCORE)
                ->where('accountId', $accountId)
                ->update($baseScoreData);
                
            // 减少不必要的日志记录
            
            // 更新成功后，清除缓存
            if ($result !== false) {
                $this->clearScoreCache($accountId);
            }
            
            return $result !== false;
        } catch (Exception $e) {
            Log::error("更新基础分失败，accountId: {$accountId}, 错误: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * 清除评分记录缓存
     * 
     * @param int $accountId 账号ID
     * @return bool 是否成功清除缓存
     */
    private function clearScoreCache($accountId)
    {
        $cacheKey = self::CACHE_PREFIX . 'score:' . $accountId;
        $result = Cache::rm($cacheKey);
        // 减少不必要的日志记录
        return $result;
    }
    
    /**
     * 获取基础信息分
     * 已修改微信号：10分
     * 
     * @param array $accountData 账号数据
     * @return int 基础信息分
     */
    private function getBaseInfoScore($accountData)
    {
        if ($this->checkIsModifiedAlias($accountData)) {
            return self::BASE_INFO_SCORE;
        }
        return 0;
    }
    
    /**
     * 检查是否已修改微信号
     * 判断标准：wechatId和alias不一致且都不为空，则认为已修改微信号
     * 注意：这里只用于评分，不修复数据
     * 
     * @param array $accountData 账号数据
     * @return bool
     */
    private function checkIsModifiedAlias($accountData)
    {
        $wechatId = trim($accountData['wechatId'] ?? '');
        $alias = trim($accountData['alias'] ?? '');
        
        // 如果wechatId和alias不一致且都不为空，则认为已修改微信号（用于评分）
        if (!empty($wechatId) && !empty($alias) && $wechatId !== $alias) {
            return true;
        }
        
        return false;
    }
    
    /**
     * 获取好友数量分
     * 根据好友数量区间得分（最高12分）
     * 
     * @param int $totalFriend 总好友数
     * @return int 好友数量分
     */
    private function getFriendCountScore($totalFriend)
    {
        if ($totalFriend <= 50) {
            return self::FRIEND_COUNT_SCORE_0_50;
        } elseif ($totalFriend <= 500) {
            return self::FRIEND_COUNT_SCORE_51_500;
        } elseif ($totalFriend <= 3000) {
            return self::FRIEND_COUNT_SCORE_501_3000;
        } else {
            return self::FRIEND_COUNT_SCORE_3001_PLUS;
        }
    }
    
    /**
     * 手动更新好友数量分（用于处理同步问题）
     * 
     * @param int $accountId 账号ID
     * @param int $friendCount 好友数量
     * @param string $source 来源（manual=手动，sync=同步）
     * @return bool 更新是否成功
     * @throws Exception 如果参数无效或更新过程中出现错误
     */
    public function updateFriendCountScore($accountId, $friendCount, $source = 'manual')
    {
        // 参数验证
        if (empty($accountId) || !is_numeric($accountId)) {
            $errorMsg = "无效的账号ID: " . (is_scalar($accountId) ? $accountId : gettype($accountId));
            Log::error($errorMsg);
            throw new Exception($errorMsg);
        }
        
        if (!is_numeric($friendCount) || $friendCount < 0) {
            $errorMsg = "无效的好友数量: {$friendCount}";
            Log::error($errorMsg);
            throw new Exception($errorMsg);
        }
        
        if (!in_array($source, ['manual', 'sync'])) {
            $errorMsg = "无效的来源: {$source}，必须是 'manual' 或 'sync'";
            Log::error($errorMsg);
            throw new Exception($errorMsg);
        }
        
        try {
            $scoreRecord = $this->getScoreRecord($accountId);
            
            // 如果基础分已计算，不允许修改好友数量分（除非是手动更新）
            if (!empty($scoreRecord['baseScoreCalculated']) && $source === 'sync') {
                // 同步数据不允许修改已计算的基础分
                Log::warning("同步数据不允许修改已计算的基础分，accountId: {$accountId}");
                return false;
            }
        }
        catch (\Exception $e) {
            $errorMsg = "获取评分记录失败，accountId: {$accountId}, 错误: " . $e->getMessage();
            Log::error($errorMsg);
            throw new Exception($errorMsg, $e->getCode(), $e);
        }
        
        $friendCountScore = $this->getFriendCountScore($friendCount);
        
        // 重新计算基础分
        $oldBaseScore = $scoreRecord['baseScore'] ?? self::DEFAULT_BASE_SCORE;
        $oldFriendCountScore = $scoreRecord['friendCountScore'] ?? 0;
        $baseInfoScore = $scoreRecord['baseInfoScore'] ?? 0;
        
        $newBaseScore = self::DEFAULT_BASE_SCORE + $baseInfoScore + $friendCountScore;
        
        $updateData = [
            'friendCountScore' => $friendCountScore,
            'friendCount' => $friendCount,
            'friendCountSource' => $source,
            'baseScore' => $newBaseScore,
            'updateTime' => time()
        ];
        
        // 如果基础分已计算，需要更新总分
        if (!empty($scoreRecord['baseScoreCalculated'])) {
            $dynamicScore = $scoreRecord['dynamicScore'] ?? 0;
            $healthScore = $newBaseScore + $dynamicScore;
            $healthScore = max(0, min(100, $healthScore));
            $updateData['healthScore'] = $healthScore;
            $updateData['maxAddFriendPerDay'] = $this->getMaxAddFriendPerDay($healthScore);
        }
        
        try {
            $result = Db::table(self::TABLE_WECHAT_ACCOUNT_SCORE)
                ->where('accountId', $accountId)
                ->update($updateData);
                
            // 更新成功后，清除缓存
            if ($result !== false) {
                $this->clearScoreCache($accountId);
                $this->clearHealthScoreCache($accountId);
                Log::info("更新好友数量分成功，accountId: {$accountId}, friendCount: {$friendCount}, source: {$source}");
            } else {
                Log::warning("更新好友数量分失败，accountId: {$accountId}, friendCount: {$friendCount}, source: {$source}");
            }
            
            return $result !== false;
        } catch (\PDOException $e) {
            $errorMsg = "数据库操作失败，accountId: {$accountId}, 错误: " . $e->getMessage();
            Log::error($errorMsg);
            throw new Exception($errorMsg, $e->getCode(), $e);
        } catch (\Throwable $e) {
            $errorMsg = "更新好友数量分失败，accountId: {$accountId}, 错误: " . $e->getMessage();
            Log::error($errorMsg);
            throw new Exception($errorMsg, $e->getCode(), $e);
        }
    }
    
    /**
     * 计算动态分
     * 动态分 = 扣分 + 加分
     * 如果添加好友记录表没有记录，则动态分为0
     * 
     * @param array $accountData 账号数据
     * @param array $scoreRecord 现有评分记录
     * @return array 动态分数据
     */
    private function calculateDynamicScore($accountData, $scoreRecord)
    {
        $accountId = $accountData['id'] ?? 0;
        $wechatId = $accountData['wechatId'] ?? '';
        
        Log::debug("开始计算动态分，accountId: {$accountId}, wechatId: {$wechatId}");
        
        $result = [
            'total' => 0,
            'frequentPenalty' => 0,
            'noFrequentBonus' => 0,
            'banPenalty' => 0,
            'lastFrequentTime' => null,
            'frequentCount' => 0,
            'lastNoFrequentTime' => null,
            'consecutiveNoFrequentDays' => 0,
            'isBanned' => 0,
            'lastBanTime' => null,
            'frequentTaskIds' => [],
            'banMessageId' => null
        ];
        
        if (empty($accountId) || empty($wechatId)) {
            Log::warning("计算动态分失败: accountId或wechatId为空");
            return $result;
        }
        
        // 不再使用30天限制
        
        // 检查添加好友记录表是否有记录，如果没有记录则动态分为0
        // 使用EXISTS子查询优化性能，只检查是否存在记录，不需要计数
        $hasFriendTask = Db::table(self::TABLE_FRIEND_TASK)
            ->where('wechatAccountId', $accountId)
            ->where(function($query) use ($wechatId) {
                if (!empty($wechatId)) {
                    $query->where('wechatId', $wechatId);
                }
            })
            ->value('id'); // 只获取ID，比count()更高效
        
        // 如果添加好友记录表没有记录，则动态分为0
        if (empty($hasFriendTask)) {
            Log::info("账号没有添加好友记录，动态分为0，accountId: {$accountId}");
            return $result;
        }
        
        Log::debug("账号有添加好友记录，继续计算动态分，accountId: {$accountId}");
        
        // 继承现有数据
        if (!empty($scoreRecord)) {
            $result['lastFrequentTime'] = $scoreRecord['lastFrequentTime'] ?? null;
            $result['frequentCount'] = $scoreRecord['frequentCount'] ?? 0;
            $result['lastNoFrequentTime'] = $scoreRecord['lastNoFrequentTime'] ?? null;
            $result['consecutiveNoFrequentDays'] = $scoreRecord['consecutiveNoFrequentDays'] ?? 0;
            $result['frequentPenalty'] = $scoreRecord['frequentPenalty'] ?? 0;
            $result['noFrequentBonus'] = $scoreRecord['noFrequentBonus'] ?? 0;
            $result['banPenalty'] = $scoreRecord['banPenalty'] ?? 0;
            $result['lastBanTime'] = $scoreRecord['lastBanTime'] ?? null;
        }
        
        // 1. 检查频繁记录（从s2_friend_task表查询，不限制时间）
        $frequentData = $this->checkFrequentFromFriendTask($accountId, $wechatId, $scoreRecord);
        $result['lastFrequentTime'] = $frequentData['lastFrequentTime'] ?? null;
        $result['frequentCount'] = $frequentData['frequentCount'] ?? 0;
        $result['frequentPenalty'] = $frequentData['frequentPenalty'] ?? 0;
        $result['frequentTaskIds'] = $frequentData['taskIds'] ?? [];
        
        // 2. 检查封号记录（从s2_wechat_message表查询，不限制时间）
        $banData = $this->checkBannedFromMessage($accountId, $wechatId);
        if (!empty($banData)) {
            $result['isBanned'] = $banData['isBanned'];
            $result['banPenalty'] = $banData['banPenalty'];
            $result['lastBanTime'] = $banData['lastBanTime'];
            $result['banMessageId'] = $banData['messageId'] ?? null;
        }
        
        // 3. 计算不频繁加分（基于频繁记录，反向参考频繁规则）
        $noFrequentData = $this->calculateNoFrequentBonus($accountId, $wechatId, $frequentData);
        $result['noFrequentBonus'] = $noFrequentData['bonus'] ?? 0;
        $result['consecutiveNoFrequentDays'] = $noFrequentData['consecutiveDays'] ?? 0;
        $result['lastNoFrequentTime'] = $noFrequentData['lastNoFrequentTime'] ?? null;
        
        // 计算总分
        $result['total'] = $result['frequentPenalty'] + $result['noFrequentBonus'] + $result['banPenalty'];
        
        Log::debug("动态分计算结果，accountId: {$accountId}, frequentPenalty: {$result['frequentPenalty']}, " . 
            "noFrequentBonus: {$result['noFrequentBonus']}, banPenalty: {$result['banPenalty']}, " . 
            "total: {$result['total']}");
        
        return $result;
    }
    
    /**
     * 从s2_friend_task表检查频繁记录
     * extra字段包含"操作过于频繁"即需要扣分
     * 统计所有时间的数据（不限制30天）
     * 每条记录只统计一次，使用is_counted字段标记
     * 
     * @param int $accountId 账号ID
     * @param string $wechatId 微信ID
     * @param array $scoreRecord 现有评分记录
     * @param int $thirtyDaysAgo 已废弃参数，保留是为了兼容性
     * @return array|null
     */
    private function checkFrequentFromFriendTask($accountId, $wechatId, $scoreRecord, $thirtyDaysAgo = null)
    {
        // 不再使用30天限制
        
        // 减少不必要的日志记录
        
        // 查询包含"操作过于频繁"的记录（统计所有时间且未被统计过的记录）
        // extra字段可能是文本或JSON格式，使用LIKE查询
        // 优化查询：只查询必要的字段，减少数据传输量
        // 添加is_counted条件，只查询未被统计过的记录
        $frequentTasks = Db::table(self::TABLE_FRIEND_TASK)
            ->where('wechatAccountId', $accountId)
            ->where(function($query) use ($wechatId) {
                if (!empty($wechatId)) {
                    $query->where('wechatId', $wechatId);
                }
            })
            ->where(function($query) {
                // 检查extra字段是否包含"操作过于频繁"（可能是文本或JSON）
                $query->where('extra', 'like', '%操作过于频繁%')
                      ->whereOr('extra', 'like', '%"当前账号存在安全风险"%');
            })
            ->where(function($query) {
                // 只查询未被统计过的记录
                // 注意：需要兼容is_counted字段不存在的情况
                $query->where('is_counted', 0)
                      ->whereOr('is_counted', null);
            })
            ->order('createTime', 'desc')
            ->field('id, createTime, extra')
            ->select();
        
        // 获取最新的频繁时间
        $latestFrequentTime = !empty($frequentTasks) ? $frequentTasks[0]['createTime'] : null;
        
        // 计算频繁次数（统计近30天内包含"操作过于频繁"的记录）
        $frequentCount = count($frequentTasks);
        
        Log::info("找到 {$frequentCount} 条未统计的频繁记录，accountId: {$accountId}, wechatId: {$wechatId}");
        
        // 标记这些记录为已统计
        if (!empty($frequentTasks)) {
            $taskIds = array_column($frequentTasks, 'id');
            try {
                // 检查表中是否存在is_counted字段
                $hasIsCountedField = false;
                $tableFields = Db::query("SHOW COLUMNS FROM " . self::TABLE_FRIEND_TASK);
                foreach ($tableFields as $field) {
                    if ($field['Field'] == 'is_counted') {
                        $hasIsCountedField = true;
                        break;
                    }
                }
                
                // 如果字段不存在，添加字段
                if (!$hasIsCountedField) {
                    Log::info("添加is_counted字段到" . self::TABLE_FRIEND_TASK . "表");
                    Db::execute("ALTER TABLE " . self::TABLE_FRIEND_TASK . " ADD COLUMN is_counted TINYINT(1) DEFAULT 0 COMMENT '是否已统计（0=未统计，1=已统计）'");
                }
                
                // 更新记录为已统计
                Db::table(self::TABLE_FRIEND_TASK)
                    ->where('id', 'in', $taskIds)
                    ->update(['is_counted' => 1]);
                
                // 减少不必要的日志记录
            } catch (\Exception $e) {
                Log::error("标记频繁记录失败: " . $e->getMessage());
                // 出错时不影响后续逻辑，继续执行
            }
        }
        
        // 如果30天内没有频繁记录，清除扣分
        if (empty($frequentTasks)) {
            return [
                'lastFrequentTime' => null,
                'frequentCount' => 0,
                'frequentPenalty' => 0,
                'taskIds' => []
            ];
        }
        
        // 根据30天内的频繁次数计算扣分
        $penalty = 0;
        if ($frequentCount == 1) {
            $penalty = self::PENALTY_FIRST_FREQUENT;  // 首次频繁-15分
            Log::info("首次频繁，扣除 " . abs(self::PENALTY_FIRST_FREQUENT) . " 分，accountId: {$accountId}");
        } elseif ($frequentCount >= 2) {
            $penalty = self::PENALTY_SECOND_FREQUENT;  // 再次频繁-25分
            Log::info("再次频繁，扣除 " . abs(self::PENALTY_SECOND_FREQUENT) . " 分，accountId: {$accountId}");
        }
        
        return [
            'lastFrequentTime' => $latestFrequentTime,
            'frequentCount' => $frequentCount,
            'frequentPenalty' => $penalty,
            'taskIds' => $taskIds
        ];
    }
    
    /**
     * 从s2_wechat_message表检查封号记录
     * content包含"你的账号被限制"且msgType为10000
     * 统计所有时间的数据（不限制30天）
     * 每条记录只统计一次，使用is_counted字段标记
     * 
     * @param int $accountId 账号ID
     * @param string $wechatId 微信ID
     * @param int $thirtyDaysAgo 已废弃参数，保留是为了兼容性
     * @return array|null
     */
    private function checkBannedFromMessage($accountId, $wechatId, $thirtyDaysAgo = null)
    {
        // 不再使用30天限制
        
        // 减少不必要的日志记录
        
        // 查询封号消息（统计所有时间且未被统计过的记录）
        // 优化查询：只查询必要的字段，减少数据传输量
        $banMessage = Db::table(self::TABLE_WECHAT_MESSAGE)
            ->where('wechatAccountId', $accountId)
            ->where('msgType', 10000)
            ->where('content', 'like', '%你的账号被限制%')
            ->where('isDeleted', 0)
            ->where(function($query) {
                // 只查询未被统计过的记录
                // 注意：需要兼容is_counted字段不存在的情况
                $query->where('is_counted', 0)
                      ->whereOr('is_counted', null);
            })
            ->field('id, createTime')  // 只查询必要的字段
            ->order('createTime', 'desc')
            ->find();
        
        if (!empty($banMessage)) {
            try {
                // 检查表中是否存在is_counted字段
                $hasIsCountedField = false;
                $tableFields = Db::query("SHOW COLUMNS FROM " . self::TABLE_WECHAT_MESSAGE);
                foreach ($tableFields as $field) {
                    if ($field['Field'] == 'is_counted') {
                        $hasIsCountedField = true;
                        break;
                    }
                }
                
                // 如果字段不存在，添加字段
                if (!$hasIsCountedField) {
                    Log::info("添加is_counted字段到" . self::TABLE_WECHAT_MESSAGE . "表");
                    Db::execute("ALTER TABLE " . self::TABLE_WECHAT_MESSAGE . " ADD COLUMN is_counted TINYINT(1) DEFAULT 0 COMMENT '是否已统计（0=未统计，1=已统计）'");
                }
                
                // 更新记录为已统计
                Db::table(self::TABLE_WECHAT_MESSAGE)
                    ->where('id', $banMessage['id'])
                    ->update(['is_counted' => 1]);
                
                // 减少不必要的日志记录
                Log::info("发现封号记录，扣除 " . abs(self::PENALTY_BANNED) . " 分，accountId: {$accountId}");
            } catch (\Exception $e) {
                Log::error("标记封号记录失败: " . $e->getMessage());
                // 出错时不影响后续逻辑，继续执行
            }
            
            return [
                'isBanned' => 1,
                'banPenalty' => self::PENALTY_BANNED,  // 封号-60分
                'lastBanTime' => $banMessage['createTime'],
                'messageId' => $banMessage['id']
            ];
        }
        
        return [
            'isBanned' => 0,
            'banPenalty' => 0,
            'lastBanTime' => null,
            'messageId' => null
        ];
    }
    
    /**
     * 计算不频繁加分
     * 反向参考频繁规则：计算连续不频繁天数
     * 规则：连续不频繁的，只要有一次频繁就得重新计算（重置连续不频繁天数）
     * 如果连续3天没有频繁，则每天+5分
     * 
     * @param int $accountId 账号ID
     * @param string $wechatId 微信ID
     * @param array $frequentData 频繁数据（包含lastFrequentTime和frequentCount）
     * @param int $thirtyDaysAgo 已废弃参数，保留是为了兼容性
     * @return array 包含bonus、consecutiveDays、lastNoFrequentTime
     */
    private function calculateNoFrequentBonus($accountId, $wechatId, $frequentData, $thirtyDaysAgo = null)
    {
        $result = [
            'bonus' => 0,
            'consecutiveDays' => 0,
            'lastNoFrequentTime' => null
        ];
        
        if (empty($accountId) || empty($wechatId)) {
            return $result;
        }
        
        $currentTime = time();
        
        // 获取最后一次频繁时间
        $lastFrequentTime = $frequentData['lastFrequentTime'] ?? null;
        
        // 规则：连续不频繁的，只要有一次频繁就得重新计算（重置连续不频繁天数）
        if (empty($lastFrequentTime)) {
            // 情况1：没有频繁记录，说明一直连续不频繁
            // 默认给30天的连续不频繁天数（可以根据需要调整）
            $consecutiveDays = 30;
        } else {
            // 情况2：有频繁记录，从最后一次频繁时间开始重新计算连续不频繁天数
            // 只要有一次频繁，连续不频繁天数就从最后一次频繁时间开始重新计算
            // 计算从最后一次频繁时间到现在，连续多少天没有频繁
            $timeDiff = $currentTime - $lastFrequentTime;
            $consecutiveDays = floor($timeDiff / 86400); // 向下取整，得到完整的天数
        }
        
        // 如果连续3天或以上没有频繁，则每天+5分
        if ($consecutiveDays >= 3) {
            $bonus = $consecutiveDays * self::BONUS_NO_FREQUENT_PER_DAY;
            $result['bonus'] = $bonus;
            $result['consecutiveDays'] = $consecutiveDays;
            $result['lastNoFrequentTime'] = $currentTime;
        } else {
            $result['consecutiveDays'] = $consecutiveDays;
        }
        
        return $result;
    }
    
    /**
     * 构建日志快照（用于对比前后分值）
     * 
     * @param array $scoreRecord
     * @return array
     */
    private function buildScoreSnapshotForLogging($scoreRecord)
    {
        $baseScore = $scoreRecord['baseScore'] ?? self::DEFAULT_BASE_SCORE;
        $dynamicScore = $scoreRecord['dynamicScore'] ?? 0;
        $healthScore = $scoreRecord['healthScore'] ?? ($baseScore + $dynamicScore);
        
        return [
            'frequentPenalty' => $scoreRecord['frequentPenalty'] ?? 0,
            'banPenalty' => $scoreRecord['banPenalty'] ?? 0,
            'noFrequentBonus' => $scoreRecord['noFrequentBonus'] ?? 0,
            'dynamicScore' => $dynamicScore,
            'healthScore' => $healthScore
        ];
    }
    
    /**
     * 根据前后快照写加减分日志
     * 
     * @param int   $accountId
     * @param string $wechatId
     * @param array $before
     * @param array $after
     * @param array $context
     * @return void
     */
    private function logScoreChangesIfNeeded($accountId, $wechatId, array $before, array $after, array $context = [])
    {
        $healthBefore = $before['healthScore'] ?? 0;
        $healthAfter = $after['healthScore'] ?? 0;
        
        $this->recordScoreLog($accountId, $wechatId, 'frequentPenalty', $before['frequentPenalty'] ?? 0, $after['frequentPenalty'] ?? 0, [
            'category' => 'penalty',
            'source' => 'friend_task',
            'sourceId' => !empty($context['frequentTaskIds']) ? $context['frequentTaskIds'][0] : null,
            'extra' => [
                'taskIds' => $context['frequentTaskIds'] ?? [],
                'frequentCount' => $context['frequentCount'] ?? 0,
                'lastFrequentTime' => $context['lastFrequentTime'] ?? null
            ],
            'totalScoreBefore' => $healthBefore,
            'totalScoreAfter' => $healthAfter
        ]);
        
        $this->recordScoreLog($accountId, $wechatId, 'banPenalty', $before['banPenalty'] ?? 0, $after['banPenalty'] ?? 0, [
            'category' => 'penalty',
            'source' => 'wechat_message',
            'sourceId' => $context['banMessageId'] ?? null,
            'extra' => [
                'lastBanTime' => $context['lastBanTime'] ?? null
            ],
            'totalScoreBefore' => $healthBefore,
            'totalScoreAfter' => $healthAfter
        ]);
        
        $this->recordScoreLog($accountId, $wechatId, 'noFrequentBonus', $before['noFrequentBonus'] ?? 0, $after['noFrequentBonus'] ?? 0, [
            'category' => 'bonus',
            'source' => 'system',
            'extra' => [
                'consecutiveDays' => $context['consecutiveNoFrequentDays'] ?? 0,
                'lastNoFrequentTime' => $context['lastNoFrequentTime'] ?? null
            ],
            'totalScoreBefore' => $healthBefore,
            'totalScoreAfter' => $healthAfter
        ]);
        
        $this->recordScoreLog($accountId, $wechatId, 'dynamicScore', $before['dynamicScore'] ?? 0, $after['dynamicScore'] ?? 0, [
            'category' => 'dynamic_total',
            'source' => 'system',
            'totalScoreBefore' => $healthBefore,
            'totalScoreAfter' => $healthAfter
        ]);
        
        $this->recordScoreLog($accountId, $wechatId, 'healthScore', $before['healthScore'] ?? 0, $after['healthScore'] ?? 0, [
            'category' => 'health_total',
            'source' => 'system',
            'totalScoreBefore' => $healthBefore,
            'totalScoreAfter' => $healthAfter
        ]);
    }
    
    /**
     * 插入健康分加减分日志
     * 
     * @param int $accountId
     * @param string $wechatId
     * @param string $field
     * @param int|null $beforeValue
     * @param int|null $afterValue
     * @param array $context
     * @return void
     */
    private function recordScoreLog($accountId, $wechatId, $field, $beforeValue, $afterValue, array $context = [])
    {
        $beforeValue = (int)($beforeValue ?? 0);
        $afterValue = (int)($afterValue ?? 0);
        
        if ($beforeValue === $afterValue) {
            return;
        }
        
        $extraPayload = $context['extra'] ?? null;
        if (is_array($extraPayload)) {
            $extraPayload = json_encode($extraPayload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        } elseif (!is_string($extraPayload)) {
            $extraPayload = null;
        }
        
        $sourceId = null;
        if (array_key_exists('sourceId', $context)) {
            $sourceId = $context['sourceId'];
        }
        
        $totalScoreBefore = null;
        if (array_key_exists('totalScoreBefore', $context)) {
            $totalScoreBefore = $context['totalScoreBefore'];
        }
        
        $totalScoreAfter = null;
        if (array_key_exists('totalScoreAfter', $context)) {
            $totalScoreAfter = $context['totalScoreAfter'];
        }
        
        $data = [
            'accountId' => $accountId,
            'wechatId' => $wechatId,
            'field' => $field,
            'changeValue' => $afterValue - $beforeValue,
            'valueBefore' => $beforeValue,
            'valueAfter' => $afterValue,
            'category' => $context['category'] ?? null,
            'source' => $context['source'] ?? null,
            'sourceId' => $sourceId,
            'extra' => $extraPayload,
            'totalScoreBefore' => $totalScoreBefore,
            'totalScoreAfter' => $totalScoreAfter,
            'createTime' => time()
        ];
        
        try {
            Db::table(self::TABLE_WECHAT_ACCOUNT_SCORE_LOG)->insert($data);
        } catch (\Exception $e) {
            Log::error("记录健康分加减分日志失败，accountId: {$accountId}, field: {$field}, 错误: " . $e->getMessage());
        }
    }
    
    /**
     * 根据健康分计算每日最大加人次数
     * 公式：每日最大加人次数 = 健康分 * 0.2
     * 
     * @param int $healthScore 健康分
     * @return int 每日最大加人次数
     */
    public function getMaxAddFriendPerDay($healthScore)
    {
        return (int)floor($healthScore * 0.2);
    }
    
    /**
     * 批量计算并更新多个账号的健康分
     * 优化：使用多线程处理、优化批处理逻辑、减少日志记录
     * 
     * @param array $accountIds 账号ID数组（为空则处理所有账号）
     * @param int $batchSize 每批处理数量
     * @param bool $forceRecalculateBase 是否强制重新计算基础分
     * @param bool $useMultiThread 是否使用多线程处理（需要pcntl扩展支持）
     * @return array 处理结果统计
     * @throws Exception 如果参数无效或批量处理过程中出现严重错误
     */
    public function batchCalculateAndUpdate($accountIds = [], $batchSize = 50, $forceRecalculateBase = false, $useMultiThread = false)
    {
        // 参数验证
        if (!is_array($accountIds)) {
            $errorMsg = "无效的账号ID数组: " . gettype($accountIds);
            Log::error($errorMsg);
            throw new Exception($errorMsg);
        }
        
        if (!is_numeric($batchSize) || $batchSize <= 0) {
            $errorMsg = "无效的批处理大小: {$batchSize}";
            Log::error($errorMsg);
            throw new Exception($errorMsg);
        }
        
        // 检查是否支持多线程
        if ($useMultiThread && !function_exists('pcntl_fork')) {
            $useMultiThread = false;
            Log::warning("系统不支持pcntl扩展，无法使用多线程处理，将使用单线程模式");
        }
        
        try {
            $startTime = microtime(true);
            // 去除开始日志，减少日志空间消耗 
               
            
            $stats = [
                'total' => 0,
                'success' => 0,
                'failed' => 0,
                'errors' => []
            ];
            
            // 如果没有指定账号ID，则处理所有账号
            if (empty($accountIds)) {
                $accountIds = Db::table(self::TABLE_WECHAT_ACCOUNT)
                    ->where('isDeleted', 0)
                    ->column('id');
            }
        
            $stats['total'] = count($accountIds);
            
            // 优化：减小批次大小，提高并行处理效率
            $batchSize = min($batchSize, 50);
            
            // 分批处理
            $batches = array_chunk($accountIds, $batchSize);
            $batchCount = count($batches);
            Log::info("分批处理，共 {$batchCount} 批");
            
            // 多线程处理
            if ($useMultiThread && $batchCount > 1) {
                $childPids = [];
                $maxProcesses = 4; // 最大并行进程数
                $runningProcesses = 0;
                
                for ($i = 0; $i < $batchCount; $i++) {
                    // 如果达到最大进程数，等待某个子进程结束
                    if ($runningProcesses >= $maxProcesses) {
                        $pid = pcntl_wait($status);
                        $runningProcesses--;
                    }
                    
                    // 创建子进程
                    $pid = pcntl_fork();
                    
                    if ($pid == -1) {
                        // 创建进程失败
                        Log::error("创建子进程失败");
                        continue;
                    } elseif ($pid == 0) {
                        // 子进程
                        $this->processBatch($batches[$i], $i, $batchCount, $forceRecalculateBase);
                        exit(0);
                    } else {
                        // 父进程
                        $childPids[] = $pid;
                        $runningProcesses++;
                    }
                }
                
                // 等待所有子进程结束
                foreach ($childPids as $pid) {
                    pcntl_waitpid($pid, $status);
                }
                
                Log::info("所有批次处理完成");
            } else {
                // 单线程处理
                foreach ($batches as $batchIndex => $batch) {
                    $batchStats = $this->processBatch($batch, $batchIndex, $batchCount, $forceRecalculateBase);
                    $stats['success'] += $batchStats['success'];
                    $stats['failed'] += $batchStats['failed'];
                    $stats['errors'] = array_merge($stats['errors'], $batchStats['errors']);
                }
            }
            
            $endTime = microtime(true);
            $totalDuration = round($endTime - $startTime, 2);
            // 只在有失败时记录日志
            if ($stats['failed'] > 0) {
                Log::warning("批量计算健康分完成，总耗时: {$totalDuration}秒，成功: {$stats['success']}，失败: {$stats['failed']}");
            }
            
            return $stats;
        } catch (\PDOException $e) {
            $errorMsg = "批量计算健康分过程中数据库操作失败: " . $e->getMessage();
            Log::error($errorMsg);
            throw new Exception($errorMsg, $e->getCode(), $e);
        } catch (\Throwable $e) {
            $errorMsg = "批量计算健康分过程中发生严重错误: " . $e->getMessage();
            Log::error($errorMsg);
            throw new Exception($errorMsg, $e->getCode(), $e);
        }
    }
    
    /**
     * 处理单个批次的账号
     * 
     * @param array $batch 批次账号ID数组
     * @param int $batchIndex 批次索引
     * @param int $batchCount 总批次数
     * @param bool $forceRecalculateBase 是否强制重新计算基础分
     * @return array 处理结果统计
     */
    private function processBatch($batch, $batchIndex, $batchCount, $forceRecalculateBase)
    {
        $batchStartTime = microtime(true);
        // 去除批次开始日志，减少日志空间消耗
        
        $stats = [
            'success' => 0,
            'failed' => 0,
            'errors' => []
        ];
        
        // 优化：预先获取账号数据，减少重复查询
        $accountIds = implode(',', $batch);
        $accountDataMap = [];
        if (!empty($batch)) {
            $accountDataList = Db::table(self::TABLE_WECHAT_ACCOUNT)
                ->where('id', 'in', $batch)
                ->select();
                
            foreach ($accountDataList as $accountData) {
                $accountDataMap[$accountData['id']] = $accountData;
            }
        }
        
        // 批量处理账号
        foreach ($batch as $accountId) {
            try {
                $accountData = $accountDataMap[$accountId] ?? null;
                $this->calculateAndUpdate($accountId, $accountData, $forceRecalculateBase);
                $stats['success']++;
                
                // 减少日志记录，每10个账号记录一次进度
                if ($stats['success'] % 10 == 0) {
                    Log::debug("批次 " . ($batchIndex + 1) . " 已处理 {$stats['success']} 个账号");
                }
            } catch (Exception $e) {
                $stats['failed']++;
                $stats['errors'][] = [
                    'accountId' => $accountId,
                    'error' => $e->getMessage()
                ];
                Log::error("账号 {$accountId} 计算失败: " . $e->getMessage());
            }
        }
        
        $batchEndTime = microtime(true);
        $batchDuration = round($batchEndTime - $batchStartTime, 2);
        Log::info("第 " . ($batchIndex + 1) . "/" . $batchCount . " 批处理完成，耗时: {$batchDuration}秒，" . 
            "成功: {$stats['success']}，失败: {$stats['failed']}");
            
        return $stats;
    }
    
    /**
     * 记录频繁事件（已废弃，改为从s2_friend_task表自动检测）
     * 保留此方法以兼容旧代码，实际频繁检测在calculateDynamicScore中完成
     * 
     * @param int $accountId 账号ID
     * @return bool
     */
    public function recordFrequent($accountId)
    {
        // 频繁检测已改为从s2_friend_task表自动检测
        // 直接重新计算健康分即可
        try {
            $this->calculateAndUpdate($accountId);
            return true;
        } catch (\Exception $e) {
            return false;
        }
    }
    
    /**
     * 记录不频繁事件（用于加分）
     * 
     * @param int $accountId 账号ID
     * @return bool
     */
    public function recordNoFrequent($accountId)
    {
        $scoreRecord = $this->getScoreRecord($accountId);
        
        if (empty($scoreRecord)) {
            // 如果记录不存在，先创建
            $accountData = Db::table(self::TABLE_WECHAT_ACCOUNT)
                ->where('id', $accountId)
                ->find();
            
            if (empty($accountData)) {
                return false;
            }
            
            $this->getOrCreateScoreRecord($accountId, $accountData['wechatId']);
            $scoreRecord = $this->getScoreRecord($accountId);
        }
        
        $lastNoFrequentTime = $scoreRecord['lastNoFrequentTime'] ?? null;
        $consecutiveNoFrequentDays = $scoreRecord['consecutiveNoFrequentDays'] ?? 0;
        $currentTime = time();
        
        // 如果上次不频繁时间是昨天或更早，则增加连续天数
        if (empty($lastNoFrequentTime) || ($currentTime - $lastNoFrequentTime) >= 86400) {
            // 如果间隔超过2天，重置为1天
            if (!empty($lastNoFrequentTime) && ($currentTime - $lastNoFrequentTime) > 86400 * 2) {
                $consecutiveNoFrequentDays = 1;
            } else {
                $consecutiveNoFrequentDays++;
            }
        }
        
        // 计算加分（连续3天及以上才加分）
        $bonus = 0;
        if ($consecutiveNoFrequentDays >= 3) {
            $bonus = $consecutiveNoFrequentDays * self::BONUS_NO_FREQUENT_PER_DAY;
        }
        
        $updateData = [
            'lastNoFrequentTime' => $currentTime,
            'consecutiveNoFrequentDays' => $consecutiveNoFrequentDays,
            'noFrequentBonus' => $bonus,
            'updateTime' => $currentTime
        ];
        
        Db::table('s2_wechat_account_score')
            ->where('accountId', $accountId)
            ->update($updateData);
        
        // 重新计算健康分
        $this->calculateAndUpdate($accountId);
        
        return true;
    }
    
    /**
     * 获取账号健康分信息
     * 优化：使用多级缓存策略，提高缓存命中率
     * 
     * @param int $accountId 账号ID
     * @param bool $useCache 是否使用缓存（默认true）
     * @param bool $forceRecalculate 是否强制重新计算（默认false）
     * @return array|null
     */
    public function getHealthScore($accountId, $useCache = true, $forceRecalculate = false)
    {
        // 如果强制重新计算，则不使用缓存
        if ($forceRecalculate) {
            Log::info("强制重新计算健康分，accountId: {$accountId}");
            return $this->calculateAndUpdate($accountId, null, false);
        }
        
        // 生成缓存键
        $cacheKey = self::CACHE_PREFIX . 'health:' . $accountId;
        
        // 如果使用缓存且缓存存在，则直接返回缓存数据
        if ($useCache && !$forceRecalculate && Cache::has($cacheKey)) {
            $cachedData = Cache::get($cacheKey);
            // 减少日志记录，提高性能
            return $cachedData;
        }
        
        // 从数据库获取记录
        $scoreRecord = $this->getScoreRecord($accountId, $useCache);
        
        if (empty($scoreRecord)) {
            return null;
        }
        
        $healthScoreInfo = [
            'accountId' => $scoreRecord['accountId'],
            'wechatId' => $scoreRecord['wechatId'],
            'healthScore' => $scoreRecord['healthScore'] ?? 0,
            'baseScore' => $scoreRecord['baseScore'] ?? 0,
            'baseInfoScore' => $scoreRecord['baseInfoScore'] ?? 0,
            'friendCountScore' => $scoreRecord['friendCountScore'] ?? 0,
            'friendCount' => $scoreRecord['friendCount'] ?? 0,
            'dynamicScore' => $scoreRecord['dynamicScore'] ?? 0,
            'frequentPenalty' => $scoreRecord['frequentPenalty'] ?? 0,
            'noFrequentBonus' => $scoreRecord['noFrequentBonus'] ?? 0,
            'banPenalty' => $scoreRecord['banPenalty'] ?? 0,
            'maxAddFriendPerDay' => $scoreRecord['maxAddFriendPerDay'] ?? 0,
            'baseScoreCalculated' => $scoreRecord['baseScoreCalculated'] ?? 0,
            'lastFrequentTime' => $scoreRecord['lastFrequentTime'] ?? null,
            'frequentCount' => $scoreRecord['frequentCount'] ?? 0,
            'isBanned' => $scoreRecord['isBanned'] ?? 0,
            'lastBanTime' => $scoreRecord['lastBanTime'] ?? null
        ];
        
        // 如果使用缓存，则缓存健康分信息
        if ($useCache) {
            // 根据数据更新频率设置不同的缓存时间
            // 如果有频繁记录或封号记录，使用短期缓存
            $cacheTime = (!empty($scoreRecord['lastFrequentTime']) || !empty($scoreRecord['isBanned'])) 
                ? self::CACHE_TTL_SHORT 
                : self::CACHE_TTL;
                
            Cache::set($cacheKey, $healthScoreInfo, $cacheTime);
            Log::debug("缓存健康分信息，accountId: {$accountId}, 缓存时间: {$cacheTime}秒");
        }
        
        return $healthScoreInfo;
    }
    
    /**
     * 清除健康分信息缓存
     * 
     * @param int $accountId 账号ID
     * @return bool 是否成功清除缓存
     */
    public function clearHealthScoreCache($accountId)
    {
        $cacheKey = self::CACHE_PREFIX . 'health:' . $accountId;
        $result = Cache::rm($cacheKey);
        
        // 同时清除评分记录缓存
        $this->clearScoreCache($accountId);
        
        // 减少不必要的日志记录
        return $result;
    }
}
