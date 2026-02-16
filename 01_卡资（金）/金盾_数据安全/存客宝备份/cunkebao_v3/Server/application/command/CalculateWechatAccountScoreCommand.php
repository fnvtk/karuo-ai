<?php

namespace app\command;

use think\console\Command;
use think\console\Input;
use think\console\Output;
use think\Db;
use think\facade\Log;
use app\common\service\WechatAccountHealthScoreService;

/**
 * 统一计算微信账号健康分命令
 * 一个命令完成所有评分工作：
 * 1. 初始化未计算的账号（基础分只计算一次）
 * 2. 更新评分记录（根据wechatId和alias不一致情况）
 * 3. 批量更新健康分（只更新动态分）
 */
class CalculateWechatAccountScoreCommand extends Command
{
    /**
     * 数据库表名
     */
    const TABLE_WECHAT_ACCOUNT = 's2_wechat_account';
    const TABLE_WECHAT_ACCOUNT_SCORE = 's2_wechat_account_score';
    protected function configure()
    {
        $this->setName('wechat:calculate-score')
            ->setDescription('统一计算微信账号健康分（包含初始化、更新评分记录、批量计算）')
            ->addOption('only-init', null, \think\console\input\Option::VALUE_NONE, '仅执行初始化步骤')
            ->addOption('only-update', null, \think\console\input\Option::VALUE_NONE, '仅执行更新评分记录步骤')
            ->addOption('only-batch', null, \think\console\input\Option::VALUE_NONE, '仅执行批量更新健康分步骤')
            ->addOption('account-id', 'a', \think\console\input\Option::VALUE_OPTIONAL, '指定账号ID，仅处理该账号')
            ->addOption('batch-size', 'b', \think\console\input\Option::VALUE_OPTIONAL, '批处理大小', 50)
            ->addOption('force-recalculate', 'f', \think\console\input\Option::VALUE_NONE, '强制重新计算基础分');
    }

    /**
     * 执行命令
     * 
     * @param Input $input 输入对象
     * @param Output $output 输出对象
     * @return int 命令执行状态码（0表示成功）
     */
    protected function execute(Input $input, Output $output)
    {
        // 解析命令行参数
        $onlyInit = $input->getOption('only-init');
        $onlyUpdate = $input->getOption('only-update');
        $onlyBatch = $input->getOption('only-batch');
        $accountId = $input->getOption('account-id');
        $batchSize = (int)$input->getOption('batch-size');
        $forceRecalculate = $input->getOption('force-recalculate');

        // 参数验证
        if ($batchSize <= 0) {
            $batchSize = 50; // 默认批处理大小
        }

        // 显示执行参数
        $output->writeln("==========================================");
        $output->writeln("开始统一计算微信账号健康分...");
        $output->writeln("==========================================");

        if ($accountId) {
            $output->writeln("指定账号ID: {$accountId}");
        }

        if ($onlyInit) {
            $output->writeln("仅执行初始化步骤");
        } elseif ($onlyUpdate) {
            $output->writeln("仅执行更新评分记录步骤");
        } elseif ($onlyBatch) {
            $output->writeln("仅执行批量更新健康分步骤");
        }

        if ($forceRecalculate) {
            $output->writeln("强制重新计算基础分");
        }

        $output->writeln("批处理大小: {$batchSize}");

        // 记录命令开始执行的日志（仅在非交互模式下记录）
        if (!$output->isVerbose()) {
            Log::info('开始执行微信账号健康分计算命令', [
                'accountId' => $accountId,
                'onlyInit' => $onlyInit ? 'true' : 'false',
                'onlyUpdate' => $onlyUpdate ? 'true' : 'false',
                'onlyBatch' => $onlyBatch ? 'true' : 'false',
                'batchSize' => $batchSize,
                'forceRecalculate' => $forceRecalculate ? 'true' : 'false'
            ]);

            $startTime = time();

            try {
                // 实例化服务
                $service = new WechatAccountHealthScoreService();
            } catch (\Exception $e) {
                $errorMsg = "实例化WechatAccountHealthScoreService失败: " . $e->getMessage();
                $output->writeln("<error>{$errorMsg}</error>");
                Log::error($errorMsg);
                return 1; // 返回非零状态码表示失败
            }

            // 初始化统计数据
            $initStats = ['success' => 0, 'failed' => 0, 'errors' => []];
            $updateStats = ['total' => 0];
            $batchStats = ['success' => 0, 'failed' => 0, 'errors' => []];

            try {
                // 步骤1: 初始化未计算基础分的账号
                if (!$onlyUpdate && !$onlyBatch) {
                    $output->writeln("\n[步骤1] 初始化未计算基础分的账号...");
                    $initStats = $this->initUncalculatedAccounts($service, $output, $accountId, $batchSize);
                    $output->writeln("初始化完成：成功 {$initStats['success']} 条，失败 {$initStats['failed']} 条");
                }

                // 步骤2: 更新评分记录（根据wechatId和alias不一致情况）
                if (!$onlyInit && !$onlyBatch) {
                    $output->writeln("\n[步骤2] 更新评分记录（根据wechatId和alias不一致情况）...");
                    $updateStats = $this->updateScoreRecords($service, $output, $accountId, $batchSize);
                    $output->writeln("更新完成：处理了 {$updateStats['total']} 条记录");
                }

                // 步骤3: 批量更新健康分（只更新动态分，不重新计算基础分）
                if (!$onlyInit && !$onlyUpdate) {
                    $output->writeln("\n[步骤3] 批量更新健康分（只更新动态分）...");
                    $batchStats = $this->batchUpdateHealthScore($service, $output, $accountId, $batchSize, $forceRecalculate);
                    $output->writeln("批量更新完成：成功 {$batchStats['success']} 条，失败 {$batchStats['failed']} 条");
                }

                // 统计信息
                $endTime = time();
                $duration = $endTime - $startTime;

                $output->writeln("\n==========================================");
                $output->writeln("任务完成！");
                $output->writeln("==========================================");
                $output->writeln("总耗时: {$duration} 秒");
                $output->writeln("初始化: 成功 {$initStats['success']} 条，失败 {$initStats['failed']} 条");
                $output->writeln("更新评分记录: {$updateStats['total']} 条");
                $output->writeln("批量更新: 成功 {$batchStats['success']} 条，失败 {$batchStats['failed']} 条");

                // 记录命令执行完成的日志
                Log::info("微信账号健康分计算命令执行完成，总耗时: {$duration} 秒，" .
                    "初始化: 成功 {$initStats['success']} 条，失败 {$initStats['failed']} 条，" .
                    "更新评分记录: {$updateStats['total']} 条，" .
                    "批量更新: 成功 {$batchStats['success']} 条，失败 {$batchStats['failed']} 条");

                if (!empty($initStats['errors'])) {
                    $output->writeln("\n初始化错误详情：");
                    Log::warning("初始化阶段出现 " . count($initStats['errors']) . " 个错误");

                    foreach (array_slice($initStats['errors'], 0, 10) as $error) {
                        $output->writeln("  账号ID {$error['accountId']}: {$error['error']}");
                        Log::error("初始化错误 - 账号ID {$error['accountId']}: {$error['error']}");
                    }

                    if (count($initStats['errors']) > 10) {
                        $output->writeln("  ... 还有 " . (count($initStats['errors']) - 10) . " 个错误");
                        Log::warning("初始化错误过多，只记录前10个，还有 " . (count($initStats['errors']) - 10) . " 个错误未显示");
                    }
                }

                if (!empty($batchStats['errors'])) {
                    $output->writeln("\n批量更新错误详情：");
                    Log::warning("批量更新阶段出现 " . count($batchStats['errors']) . " 个错误");

                    foreach (array_slice($batchStats['errors'], 0, 10) as $error) {
                        $output->writeln("  账号ID {$error['accountId']}: {$error['error']}");
                        Log::error("批量更新错误 - 账号ID {$error['accountId']}: {$error['error']}");
                    }

                    if (count($batchStats['errors']) > 10) {
                        $output->writeln("  ... 还有 " . (count($batchStats['errors']) - 10) . " 个错误");
                        Log::warning("批量更新错误过多，只记录前10个，还有 " . (count($batchStats['errors']) - 10) . " 个错误未显示");
                    }
                }

            } catch (\PDOException $e) {
                // 数据库异常
                $errorMsg = "数据库操作失败: " . $e->getMessage();
                $output->writeln("\n<error>数据库错误: " . $errorMsg . "</error>");
                $output->writeln($e->getTraceAsString());

                // 记录数据库错误
                Log::error("数据库错误: " . $errorMsg);
                Log::error("错误堆栈: " . $e->getTraceAsString());

                return 2; // 数据库错误状态码
            } catch (\Exception $e) {
                // 一般异常
                $errorMsg = "命令执行失败: " . $e->getMessage();
                $output->writeln("\n<error>错误: " . $errorMsg . "</error>");
                $output->writeln($e->getTraceAsString());

                // 记录严重错误
                Log::error($errorMsg);
                Log::error("错误堆栈: " . $e->getTraceAsString());

                return 1; // 一般错误状态码
            } catch (\Throwable $e) {
                // 其他所有错误
                $errorMsg = "严重错误: " . $e->getMessage();
                $output->writeln("\n<error>严重错误: " . $errorMsg . "</error>");
                $output->writeln($e->getTraceAsString());

                // 记录严重错误
                Log::critical($errorMsg);
                Log::critical("错误堆栈: " . $e->getTraceAsString());

                return 3; // 严重错误状态码
            }

            return 0; // 成功执行
        }
    }
    
    /**
     * 初始化未计算基础分的账号
     * 
     * @param WechatAccountHealthScoreService $service 健康分服务实例
     * @param Output $output 输出对象
     * @return array 处理结果统计
     * @throws \Exception 如果查询或处理过程中出现错误
     */
    private function initUncalculatedAccounts($service, $output, $accountId = null, $batchSize = 50)
    {
        $stats = [
            'total' => 0,
            'success' => 0,
            'failed' => 0,
            'errors' => []
        ];
        
        try {
            // 获取所有未计算基础分的账号
            // 优化查询：使用索引字段，只查询必要的字段
            $query = Db::table(self::TABLE_WECHAT_ACCOUNT)
                ->alias('a')
                ->leftJoin([self::TABLE_WECHAT_ACCOUNT_SCORE => 's'], 's.accountId = a.id')
                ->where('a.isDeleted', 0)
                ->where(function($query) {
                    $query->whereNull('s.id')
                          ->whereOr('s.baseScoreCalculated', 0);
                });
                
            // 如果指定了账号ID，则只处理该账号
            if ($accountId) {
                $query->where('a.id', $accountId);
            }
            
            $accounts = $query->field('a.id, a.wechatId')  // 只查询必要的字段
                ->select();
        } catch (\Exception $e) {
            Log::error("查询未计算基础分的账号失败: " . $e->getMessage());
            throw new \Exception("查询未计算基础分的账号失败: " . $e->getMessage(), 0, $e);
        }
        
        $stats['total'] = count($accounts);
        
        if ($stats['total'] == 0) {
            $output->writeln("没有需要初始化的账号");
            Log::info("没有需要初始化的账号");
            return $stats;
        }
        
        $output->writeln("找到 {$stats['total']} 个需要初始化的账号");
        Log::info("找到 {$stats['total']} 个需要初始化的账号");
        
        // 优化批处理：使用传入的批处理大小
        $batches = array_chunk($accounts, $batchSize);
        $batchCount = count($batches);
        
        Log::info("将分 {$batchCount} 批处理，每批 {$batchSize} 个账号");
        
        foreach ($batches as $batchIndex => $batch) {
            $batchStartTime = microtime(true);
            $batchSuccessCount = 0;
            $batchFailedCount = 0;
            
            foreach ($batch as $account) {
                try {
                    $service->calculateAndUpdate($account['id']);
                    $stats['success']++;
                    $batchSuccessCount++;
                    
                    if ($stats['success'] % 20 == 0) { // 更频繁地显示进度
                        $output->write(".");
                        Log::debug("已成功初始化 {$stats['success']} 个账号");
                    }
                } catch (\Exception $e) {
                    $stats['failed']++;
                    $batchFailedCount++;
                    $errorMsg = "初始化账号 {$account['id']} 失败: " . $e->getMessage();
                    Log::error($errorMsg);
                    $stats['errors'][] = [
                        'accountId' => $account['id'],
                        'error' => $e->getMessage()
                    ];
                }
            }
            
            $batchEndTime = microtime(true);
            $batchDuration = round($batchEndTime - $batchStartTime, 2);
            
            // 每批次完成后输出进度信息
            $output->writeln(" 批次 " . ($batchIndex + 1) . "/{$batchCount} 完成，耗时 {$batchDuration} 秒，成功 {$batchSuccessCount}，失败 {$batchFailedCount}");
            Log::info("初始化批次 " . ($batchIndex + 1) . "/{$batchCount} 完成，耗时 {$batchDuration} 秒，成功 {$batchSuccessCount}，失败 {$batchFailedCount}");
        }
        
        return $stats;
    }
    
    /**
     * 更新评分记录（根据wechatId和alias不一致情况）
     * 
     * @param WechatAccountHealthScoreService $service 健康分服务实例
     * @param Output $output 输出对象
     * @return array 处理结果统计
     * @throws \Exception 如果查询或处理过程中出现错误
     */
    private function updateScoreRecords($service, $output, $accountId = null, $batchSize = 50)
    {
        $stats = ['total' => 0];
        
        try {
            // 优化查询：合并两次查询为一次，减少数据库访问次数
            $query = Db::table(self::TABLE_WECHAT_ACCOUNT)
                ->where('isDeleted', 0)
                ->where('wechatId', '<>', '')
                ->where('alias', '<>', '');
                
            // 如果指定了账号ID，则只处理该账号
            if ($accountId) {
                $query->where('id', $accountId);
            }
            
            $accounts = $query->field('id, wechatId, alias, IF(wechatId = alias, 0, 1) as isModifiedAlias')
                ->select();
                
            // 分类处理查询结果
            $inconsistentAccounts = [];
            $consistentAccounts = [];
            
            foreach ($accounts as $account) {
                if ($account['isModifiedAlias'] == 1) {
                    $inconsistentAccounts[] = $account;
                } else {
                    $consistentAccounts[] = $account;
                }
            }
        } catch (\Exception $e) {
            Log::error("查询需要更新评分记录的账号失败: " . $e->getMessage());
            throw new \Exception("查询需要更新评分记录的账号失败: " . $e->getMessage(), 0, $e);
        }
        
        $allAccounts = array_merge($inconsistentAccounts, $consistentAccounts);
        $stats['total'] = count($allAccounts);
        
        if ($stats['total'] == 0) {
            $output->writeln("没有需要更新的账号");
            Log::info("没有需要更新的评分记录");
            return $stats;
        }
        
        $output->writeln("找到 {$stats['total']} 个需要更新的账号（不一致: " . count($inconsistentAccounts) . "，一致: " . count($consistentAccounts) . "）");
        Log::info("找到 {$stats['total']} 个需要更新的账号（不一致: " . count($inconsistentAccounts) . "，一致: " . count($consistentAccounts) . "）");
        
        $updatedCount = 0;
        
        // 优化批处理：使用传入的批处理大小
        $batches = array_chunk($allAccounts, $batchSize);
        $batchCount = count($batches);
        
        Log::info("将分 {$batchCount} 批更新评分记录，每批 {$batchSize} 个账号");
        
        foreach ($batches as $batchIndex => $batch) {
            $batchStartTime = microtime(true);
            $batchUpdatedCount = 0;
            
            foreach ($batch as $account) {
                $isModifiedAlias = isset($account['isModifiedAlias']) ? 
                    ($account['isModifiedAlias'] == 1) : 
                    in_array($account['id'], array_column($inconsistentAccounts, 'id'));
                
                $this->updateScoreRecord($account['id'], $isModifiedAlias, $service);
                $updatedCount++;
                $batchUpdatedCount++;
                
                if ($batchUpdatedCount % 20 == 0) {
                    $output->write(".");
                }
            }
            
            $batchEndTime = microtime(true);
            $batchDuration = round($batchEndTime - $batchStartTime, 2);
            
            // 每批次完成后输出进度信息
            $output->writeln(" 批次 " . ($batchIndex + 1) . "/{$batchCount} 完成，耗时 {$batchDuration} 秒，更新 {$batchUpdatedCount} 条记录");
            Log::info("更新评分记录批次 " . ($batchIndex + 1) . "/{$batchCount} 完成，耗时 {$batchDuration} 秒，更新 {$batchUpdatedCount} 条记录");
        }
        
        if ($updatedCount > 0 && $updatedCount % 100 == 0) {
            $output->writeln("");
        }
        
        return $stats;
    }
    
    /**
     * 批量更新健康分（只更新动态分）
     * 
     * @param WechatAccountHealthScoreService $service 健康分服务实例
     * @param Output $output 输出对象
     * @return array 处理结果统计
     * @throws \Exception 如果查询或处理过程中出现错误
     */
    private function batchUpdateHealthScore($service, $output, $accountId = null, $batchSize = 50, $forceRecalculate = false)
    {
        try {
            // 获取所有已计算基础分的账号
            // 优化查询：只查询必要的字段，使用索引字段
            $query = Db::table(self::TABLE_WECHAT_ACCOUNT_SCORE)
                ->where('baseScoreCalculated', 1);
                
            // 如果指定了账号ID，则只处理该账号
            if ($accountId) {
                $query->where('accountId', $accountId);
            }
            
            $accountIds = $query->column('accountId');
        } catch (\Exception $e) {
            Log::error("查询需要批量更新健康分的账号失败: " . $e->getMessage());
            throw new \Exception("查询需要批量更新健康分的账号失败: " . $e->getMessage(), 0, $e);
        }
        
        $total = count($accountIds);
        
        if ($total == 0) {
            $output->writeln("没有需要更新的账号");
            Log::info("没有需要批量更新健康分的账号");
            return ['success' => 0, 'failed' => 0, 'errors' => []];
        }
        
        $output->writeln("找到 {$total} 个需要更新动态分的账号");
        Log::info("找到 {$total} 个需要更新动态分的账号");
        
        // 使用传入的批处理大小和强制重新计算标志
        Log::info("使用批量大小 {$batchSize} 进行批量更新健康分，强制重新计算基础分: " . ($forceRecalculate ? 'true' : 'false'));
        $stats = $service->batchCalculateAndUpdate($accountIds, $batchSize, $forceRecalculate);
        
        return $stats;
    }
    
    /**
     * 更新评分记录
     * 
     * @param int $accountId 账号ID
     * @param bool $isModifiedAlias 是否已修改微信号
     * @param WechatAccountHealthScoreService $service 评分服务
     */
    /**
     * 更新评分记录
     * 
     * @param int $accountId 账号ID
     * @param bool $isModifiedAlias 是否已修改微信号
     * @param WechatAccountHealthScoreService $service 评分服务
     * @return bool 是否成功更新
     */
    private function updateScoreRecord($accountId, $isModifiedAlias, $service)
    {
        Log::debug("开始更新账号 {$accountId} 的评分记录，isModifiedAlias: " . ($isModifiedAlias ? 'true' : 'false'));
        
        try {
            // 获取账号数据 - 只查询必要的字段
            $accountData = Db::table(self::TABLE_WECHAT_ACCOUNT)
                ->where('id', $accountId)
                ->field('id, wechatId, alias')  // 只查询必要的字段
                ->find();
            
            if (empty($accountData)) {
                Log::warning("账号 {$accountId} 不存在，跳过更新评分记录");
                return false;
            }
            
            // 确保评分记录存在 - 只查询必要的字段
            $scoreRecord = Db::table(self::TABLE_WECHAT_ACCOUNT_SCORE)
                ->where('accountId', $accountId)
                ->field('accountId, baseScore, baseScoreCalculated, baseInfoScore, dynamicScore')  // 只查询必要的字段
                ->find();
        
        if (empty($scoreRecord)) {
            // 如果记录不存在，创建并计算基础分
            Log::info("账号 {$accountId} 的评分记录不存在，创建并计算基础分");
            $service->calculateAndUpdate($accountId);
            $scoreRecord = Db::table(self::TABLE_WECHAT_ACCOUNT_SCORE)
                ->where('accountId', $accountId)
                ->find();
        }
        
        if (empty($scoreRecord)) {
            Log::warning("账号 {$accountId} 的评分记录创建失败，跳过更新");
            return;
        }
        
        // 更新isModifiedAlias字段
        $updateData = [
            'isModifiedAlias' => $isModifiedAlias ? 1 : 0,
            'updateTime' => time()
        ];
        
        // 如果基础分已计算，需要更新基础信息分和基础分
        if ($scoreRecord['baseScoreCalculated']) {
            $oldBaseInfoScore = $scoreRecord['baseInfoScore'] ?? 0;
            $newBaseInfoScore = $isModifiedAlias ? 10 : 0; // 已修改微信号得10分
            
            if ($oldBaseInfoScore != $newBaseInfoScore) {
                $oldBaseScore = $scoreRecord['baseScore'] ?? 60;
                $newBaseScore = $oldBaseScore - $oldBaseInfoScore + $newBaseInfoScore;
                
                $updateData['baseInfoScore'] = $newBaseInfoScore;
                $updateData['baseScore'] = $newBaseScore;
                
                // 重新计算健康分
                $dynamicScore = $scoreRecord['dynamicScore'] ?? 0;
                $healthScore = $newBaseScore + $dynamicScore;
                $healthScore = max(0, min(100, $healthScore));
                $updateData['healthScore'] = $healthScore;
                $updateData['maxAddFriendPerDay'] = (int)floor($healthScore * 0.2);
                
                Log::info("账号 {$accountId} 的基础信息分从 {$oldBaseInfoScore} 更新为 {$newBaseInfoScore}，" . 
                    "基础分从 {$oldBaseScore} 更新为 {$newBaseScore}，健康分更新为 {$healthScore}");
            }
        } else {
            // 基础分未计算，只更新标记和基础信息分
            $updateData['baseInfoScore'] = $isModifiedAlias ? 10 : 0;
        }
        
        $result = Db::table(self::TABLE_WECHAT_ACCOUNT_SCORE)
            ->where('accountId', $accountId)
            ->update($updateData);
            
        Log::debug("账号 {$accountId} 的评分记录更新" . ($result !== false ? "成功" : "失败"));
        
        return $result !== false;
        } catch (\Exception $e) {
            Log::error("更新账号 {$accountId} 的评分记录失败: " . $e->getMessage());
            return false;
        }
    }
}

