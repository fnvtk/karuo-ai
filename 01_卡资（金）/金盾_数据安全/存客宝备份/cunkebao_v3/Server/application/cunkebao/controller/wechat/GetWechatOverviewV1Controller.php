<?php

namespace app\cunkebao\controller\wechat;

use app\common\service\WechatAccountHealthScoreService;
use app\cunkebao\controller\BaseController;
use library\ResponseHelper;
use think\Db;

/**
 * 微信账号概览控制器
 * 提供账号概览页面的所有数据接口
 */
class GetWechatOverviewV1Controller extends BaseController
{
    /**
     * 获取微信账号概览数据
     * 
     * @return \think\response\Json
     */
    public function index()
    {
        try {
            $wechatId = $this->request->param('wechatId', '');
            
            if (empty($wechatId)) {
                return ResponseHelper::error('微信ID不能为空');
            }
            
            $companyId = $this->getUserInfo('companyId');
            
            // 获取微信账号ID（accountId）
            $account = Db::table('s2_wechat_account')
                ->where('wechatId', $wechatId)
                ->find();
            
            if (empty($account)) {
                return ResponseHelper::error('微信账号不存在');
            }
            
            $accountId = $account['id'];
            
            // 1. 健康分评估
            $healthScoreData = $this->getHealthScoreAssessment($accountId, $wechatId);
            
            // 2. 账号价值（模拟数据）
            $accountValue = $this->getAccountValue($accountId);
            
            // 3. 今日价值变化（模拟数据）
            $todayValueChange = $this->getTodayValueChange($accountId);
            
            // 4. 好友总数
            $totalFriends = $this->getTotalFriends($wechatId, $companyId);
            
            // 5. 今日新增好友
            $todayNewFriends = $this->getTodayNewFriends($wechatId);
            
            // 6. 高价群聊
            $highValueChatrooms = $this->getHighValueChatrooms($wechatId, $companyId);
            
            // 7. 今日新增群聊
            $todayNewChatrooms = $this->getTodayNewChatrooms($wechatId, $companyId);
            
            $result = [
                'healthScoreAssessment' => $healthScoreData,
                'accountValue' => $accountValue,
                'todayValueChange' => $todayValueChange,
                'totalFriends' => $totalFriends,
                'todayNewFriends' => $todayNewFriends,
                'highValueChatrooms' => $highValueChatrooms,
                'todayNewChatrooms' => $todayNewChatrooms,
            ];
            
            return ResponseHelper::success($result);
            
        } catch (\Exception $e) {
            return ResponseHelper::error($e->getMessage(), $e->getCode() ?: 500);
        }
    }
    
    /**
     * 获取健康分评估数据
     * 
     * @param int $accountId 账号ID
     * @param string $wechatId 微信ID
     * @return array
     */
    protected function getHealthScoreAssessment($accountId, $wechatId)
    {
        // 获取健康分信息
        $healthScoreService = new WechatAccountHealthScoreService();
        $healthScoreInfo = $healthScoreService->getHealthScore($accountId);
        
        $healthScore = $healthScoreInfo['healthScore'] ?? 0;
        $maxAddFriendPerDay = $healthScoreInfo['maxAddFriendPerDay'] ?? 0;
        
        // 获取今日已加好友数
        $todayAdded = $this->getTodayAddedCount($wechatId);
        
        // 获取最后添加时间
        $lastAddTime = $this->getLastAddTime($wechatId);
        
        // 判断状态标签
        $statusTag = $todayAdded > 0 ? '已添加加人' : '';
        
        // 获取基础构成
        $baseComposition = $this->getBaseComposition($healthScoreInfo);
        
        // 获取动态记录
        $dynamicRecords = $this->getDynamicRecords($healthScoreInfo);
        
        return [
            'score' => $healthScore,
            'dailyLimit' => $maxAddFriendPerDay,
            'todayAdded' => $todayAdded,
            'lastAddTime' => $lastAddTime,
            'statusTag' => $statusTag,
            'baseComposition' => $baseComposition,
            'dynamicRecords' => $dynamicRecords,
        ];
    }
    
    /**
     * 获取基础构成数据
     * 
     * @param array $healthScoreInfo 健康分信息
     * @return array
     */
    protected function getBaseComposition($healthScoreInfo)
    {
        $baseScore = $healthScoreInfo['baseScore'] ?? 0;
        $baseInfoScore = $healthScoreInfo['baseInfoScore'] ?? 0;
        $friendCountScore = $healthScoreInfo['friendCountScore'] ?? 0;
        $friendCount = $healthScoreInfo['friendCount'] ?? 0;
        
        // 账号基础分（默认60分）
        $accountBaseScore = 60;
        
        // 已修改微信号（如果baseInfoScore > 0，说明已修改）
        $isModifiedAlias = $baseInfoScore > 0;
        
        $composition = [
            [
                'name' => '账号基础分',
                'score' => $accountBaseScore,
                'formatted' => '+' . $accountBaseScore,
            ]
        ];
        
        // 如果已修改微信号，添加基础信息分
        if ($isModifiedAlias) {
            $composition[] = [
                'name' => '已修改微信号',
                'score' => $baseInfoScore,
                'formatted' => '+' . $baseInfoScore,
            ];
        }
        
        // 好友数量加成
        if ($friendCountScore > 0) {
            $composition[] = [
                'name' => '好友数量加成',
                'score' => $friendCountScore,
                'formatted' => '+' . $friendCountScore,
                'friendCount' => $friendCount, // 显示好友总数
            ];
        }
        
        return $composition;
    }
    
    /**
     * 获取动态记录数据
     * 
     * @param array $healthScoreInfo 健康分信息
     * @return array
     */
    protected function getDynamicRecords($healthScoreInfo)
    {
        $records = [];
        
        $frequentPenalty = $healthScoreInfo['frequentPenalty'] ?? 0;
        $frequentCount = $healthScoreInfo['frequentCount'] ?? 0;
        $banPenalty = $healthScoreInfo['banPenalty'] ?? 0;
        $isBanned = $healthScoreInfo['isBanned'] ?? 0;
        $noFrequentBonus = $healthScoreInfo['noFrequentBonus'] ?? 0;
        $consecutiveNoFrequentDays = $healthScoreInfo['consecutiveNoFrequentDays'] ?? 0;
        $lastFrequentTime = $healthScoreInfo['lastFrequentTime'] ?? null;
        
        // 频繁扣分记录
        // 根据frequentCount判断是首次还是再次
        // frequentPenalty存储的是当前状态的扣分（-15或-25），不是累计值
        if ($frequentCount > 0 && $frequentPenalty < 0) {
            if ($frequentCount == 1) {
                // 首次频繁：-15分
                $records[] = [
                    'name' => '首次触发限额',
                    'score' => $frequentPenalty,
                    'formatted' => (string)$frequentPenalty,
                    'type' => 'penalty',
                    'time' => $lastFrequentTime ? date('Y-m-d H:i:s', $lastFrequentTime) : null,
                ];
            } else {
                // 再次频繁：-25分
                $records[] = [
                    'name' => '再次触发限额',
                    'score' => $frequentPenalty,
                    'formatted' => (string)$frequentPenalty,
                    'type' => 'penalty',
                    'time' => $lastFrequentTime ? date('Y-m-d H:i:s', $lastFrequentTime) : null,
                ];
            }
        }
        
        // 封号扣分记录
        if ($isBanned && $banPenalty < 0) {
            $lastBanTime = $healthScoreInfo['lastBanTime'] ?? null;
            $records[] = [
                'name' => '封号',
                'score' => $banPenalty,
                'formatted' => (string)$banPenalty,
                'type' => 'penalty',
                'time' => $lastBanTime ? date('Y-m-d H:i:s', $lastBanTime) : null,
            ];
        }
        
        // 不频繁加分记录
        if ($noFrequentBonus > 0 && $consecutiveNoFrequentDays >= 3) {
            $lastNoFrequentTime = $healthScoreInfo['lastNoFrequentTime'] ?? null;
            $records[] = [
                'name' => '连续' . $consecutiveNoFrequentDays . '天不触发频繁',
                'score' => $noFrequentBonus,
                'formatted' => '+' . $noFrequentBonus,
                'type' => 'bonus',
                'time' => $lastNoFrequentTime ? date('Y-m-d H:i:s', $lastNoFrequentTime) : null,
            ];
        }
        
        return $records;
    }
    
    /**
     * 获取今日已加好友数
     * 
     * @param string $wechatId 微信ID
     * @return int
     */
    protected function getTodayAddedCount($wechatId)
    {
        $start = strtotime(date('Y-m-d 00:00:00'));
        $end = strtotime(date('Y-m-d 23:59:59'));
        
        return Db::table('s2_friend_task')
            ->where('wechatId', $wechatId)
            ->whereBetween('createTime', [$start, $end])
            ->count();
    }
    
    /**
     * 获取最后添加时间
     * 
     * @param string $wechatId 微信ID
     * @return string
     */
    protected function getLastAddTime($wechatId)
    {
        $lastTask = Db::table('s2_friend_task')
            ->where('wechatId', $wechatId)
            ->order('createTime', 'desc')
            ->find();
        
        if (empty($lastTask) || empty($lastTask['createTime'])) {
            return '';
        }
        
        return date('H:i:s', $lastTask['createTime']);
    }
    
    /**
     * 获取账号价值（模拟数据）
     * 
     * @param int $accountId 账号ID
     * @return array
     */
    protected function getAccountValue($accountId)
    {
        // TODO: 后续替换为真实计算逻辑
        // 模拟数据：¥29,800
        $value = 29800;
        
        return [
            'value' => $value,
            'formatted' => '¥' . number_format($value, 0, '.', ','),
        ];
    }
    
    /**
     * 获取今日价值变化（模拟数据）
     * 
     * @param int $accountId 账号ID
     * @return array
     */
    protected function getTodayValueChange($accountId)
    {
        // TODO: 后续替换为真实计算逻辑
        // 模拟数据：+500
        $change = 500;
        
        return [
            'change' => $change,
            'formatted' => $change > 0 ? '+' . $change : (string)$change,
            'isPositive' => $change > 0,
        ];
    }
    
    /**
     * 获取好友总数
     * 
     * @param string $wechatId 微信ID
     * @param int $companyId 公司ID
     * @return int
     */
    protected function getTotalFriends($wechatId, $companyId)
    {
        // 优先从 s2_wechat_account 表获取
        $account = Db::table('s2_wechat_account')
            ->where('wechatId', $wechatId)
            ->field('totalFriend')
            ->find();
        
        if (!empty($account) && isset($account['totalFriend'])) {
            return (int)$account['totalFriend'];
        }
        
        // 如果 totalFriend 为空，则从 s2_wechat_friend 表统计
        return Db::table('s2_wechat_friend')
            ->where('ownerWechatId', $wechatId)
            ->where('isDeleted', 0)
            ->count();
    }
    
    /**
     * 获取今日新增好友数
     * 
     * @param string $wechatId 微信ID
     * @return int
     */
    protected function getTodayNewFriends($wechatId)
    {
        $start = strtotime(date('Y-m-d 00:00:00'));
        $end = strtotime(date('Y-m-d 23:59:59'));
        
        // 从 s2_wechat_friend 表统计今日新增
        return Db::table('s2_wechat_friend')
            ->where('ownerWechatId', $wechatId)
            ->whereBetween('createTime', [$start, $end])
            ->where('isDeleted', 0)
            ->count();
    }
    
    /**
     * 获取高价群聊数量
     * 高价群聊定义：群成员数 >= 50 的群聊
     * 
     * @param string $wechatId 微信ID
     * @param int $companyId 公司ID
     * @return int
     */
    protected function getHighValueChatrooms($wechatId, $companyId)
    {
        // 高价群聊定义：群成员数 >= 50
        $minMemberCount = 50;
        
        // 查询该微信账号下的高价群聊
        // 使用子查询统计每个群的成员数
        $result = Db::query("
            SELECT COUNT(DISTINCT c.chatroomId) as count
            FROM s2_wechat_chatroom c
            INNER JOIN (
                SELECT chatroomId, COUNT(*) as memberCount
                FROM s2_wechat_chatroom_member
                GROUP BY chatroomId
                HAVING memberCount >= ?
            ) m ON c.chatroomId = m.chatroomId
            WHERE c.wechatAccountWechatId = ?
            AND c.isDeleted = 0
        ", [$minMemberCount, $wechatId]);
        
        return !empty($result) ? (int)$result[0]['count'] : 0;
    }
    
    /**
     * 获取今日新增群聊数
     * 
     * @param string $wechatId 微信ID
     * @param int $companyId 公司ID
     * @return int
     */
    protected function getTodayNewChatrooms($wechatId, $companyId)
    {
        $start = strtotime(date('Y-m-d 00:00:00'));
        $end = strtotime(date('Y-m-d 23:59:59'));
        
        return Db::table('s2_wechat_chatroom')
            ->where('wechatAccountWechatId', $wechatId)
            ->whereBetween('createTime', [$start, $end])
            ->where('isDeleted', 0)
            ->count();
    }
}

