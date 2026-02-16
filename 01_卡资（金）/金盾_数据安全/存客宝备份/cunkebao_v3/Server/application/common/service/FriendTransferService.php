<?php

namespace app\common\service;

use app\api\controller\AutomaticAssign;
use think\Db;
use think\facade\Log;

/**
 * 好友迁移服务类
 * 负责处理好友在不同账号之间的迁移逻辑
 */
class FriendTransferService
{
    /**
     * 迁移好友到其他账号
     * @param int $wechatFriendId 微信好友ID
     * @param int $currentAccountId 当前账号ID
     * @param string $reason 迁移原因
     * @return array ['success' => bool, 'message' => string, 'toAccountId' => int|null]
     */
    public function transferFriend($wechatFriendId, $currentAccountId, $reason = '')
    {
        try {
            // 获取好友信息
            $friend = Db::table('s2_wechat_friend')->where('id', $wechatFriendId)->find();
            if (empty($friend)) {
                return [
                    'success' => false,
                    'message' => '好友不存在',
                    'toAccountId' => null
                ];
            }

            // 获取当前账号的部门信息
            $accountData = Db::table('s2_company_account')->where('id', $currentAccountId)->find();
            if (empty($accountData)) {
                return [
                    'success' => false,
                    'message' => '当前账号不存在',
                    'toAccountId' => null
                ];
            }

            // 获取同部门的在线账号列表
            $accountIds = Db::table('s2_company_account')
                ->where([
                    'departmentId' => $accountData['departmentId'],
                    'alive' => 1
                ])
                ->column('id');
            if (empty($accountIds)) {
                return [
                    'success' => false,
                    'message' => '没有可用的在线账号',
                    'toAccountId' => null
                ];
            }

            // 如果好友当前账号不在可用账号列表中，或者需要迁移到其他账号
            $needTransfer = !in_array($friend['accountId'], $accountIds);
            
            // 如果需要迁移，选择目标账号
            if ($needTransfer || $currentAccountId != $friend['accountId']) {
                // 排除当前账号，选择其他账号
                $availableAccountIds = array_filter($accountIds, function($id) use ($currentAccountId) {
                    return $id != $currentAccountId;
                });

                if (empty($availableAccountIds)) {
                    return [
                        'success' => false,
                        'message' => '没有其他可用的在线账号',
                        'toAccountId' => null
                    ];
                }

                // 随机选择一个账号
                $availableAccountIds = array_values($availableAccountIds);
                $randomKey = array_rand($availableAccountIds, 1);
                $toAccountId = $availableAccountIds[$randomKey];

                // 获取目标账号信息
                $toAccountData = Db::table('s2_company_account')->where('id', $toAccountId)->find();
                if (empty($toAccountData)) {
                    return [
                        'success' => false,
                        'message' => '目标账号不存在',
                        'toAccountId' => null
                    ];
                }

                // 执行迁移
                $automaticAssign = new AutomaticAssign();
                $result = $automaticAssign->allotWechatFriend([
                    'wechatFriendId' => $wechatFriendId,
                    'toAccountId' => $toAccountId
                ], true);

                $resultData = json_decode($result, true);
                
                if (isset($resultData['code']) && $resultData['code'] == 200) {
                    // 更新好友的账号信息
                    Db::table('s2_wechat_friend')
                        ->where('id', $wechatFriendId)
                        ->update([
                            'accountId' => $toAccountId,
                            'accountUserName' => $toAccountData['userName'],
                            'accountRealName' => $toAccountData['realName'],
                            'accountNickname' => $toAccountData['nickname'],
                        ]);

                    $logMessage = "好友迁移成功：好友ID={$wechatFriendId}，从账号{$currentAccountId}迁移到账号{$toAccountId}";
                    if (!empty($reason)) {
                        $logMessage .= "，原因：{$reason}";
                    }
                    Log::info($logMessage);

                    return [
                        'success' => true,
                        'message' => '好友迁移成功',
                        'toAccountId' => $toAccountId
                    ];
                } else {
                    $errorMsg = isset($resultData['msg']) ? $resultData['msg'] : '迁移失败';
                    Log::error("好友迁移失败：好友ID={$wechatFriendId}，错误：{$errorMsg}");
                    return [
                        'success' => false,
                        'message' => $errorMsg,
                        'toAccountId' => null
                    ];
                }
            }

            return [
                'success' => true,
                'message' => '好友已在正确的账号上，无需迁移',
                'toAccountId' => $friend['accountId']
            ];

        } catch (\Exception $e) {
            Log::error("好友迁移异常：好友ID={$wechatFriendId}，错误：" . $e->getMessage());
            return [
                'success' => false,
                'message' => '迁移异常：' . $e->getMessage(),
                'toAccountId' => null
            ];
        }
    }

    /**
     * 批量迁移好友到其他账号（按账号分组处理）
     * @param array $friends 好友列表，格式：[['friendId' => int, 'accountId' => int], ...]
     * @param int $currentAccountId 当前账号ID
     * @param string $reason 迁移原因
     * @return array ['transferred' => int, 'failed' => int]
     */
    public function transferFriendsBatch($friends, $currentAccountId, $reason = '')
    {
        $transferred = 0;
        $failed = 0;

        if (empty($friends)) {
            return ['transferred' => 0, 'failed' => 0];
        }

        try {
            // 获取当前账号的部门信息
            $accountData = Db::table('s2_company_account')->where('id', $currentAccountId)->find();
            if (empty($accountData)) {
                Log::error("批量迁移失败：当前账号不存在，账号ID={$currentAccountId}");
                return ['transferred' => 0, 'failed' => count($friends)];
            }

            // 获取同部门的在线账号列表
            $accountIds = Db::table('s2_company_account')
                ->where([
                    'departmentId' => $accountData['departmentId'],
                    'alive' => 1
                ])
                ->column('id');
            if (empty($accountIds)) {
                Log::warning("批量迁移失败：没有可用的在线账号，账号ID={$currentAccountId}");
                return ['transferred' => 0, 'failed' => count($friends)];
            }
            // 排除当前账号，选择其他账号
            $availableAccountIds = array_filter($accountIds, function($id) use ($currentAccountId) {
                return $id != $currentAccountId;
            });
            if (empty($availableAccountIds)) {
                Log::warning("批量迁移失败：没有其他可用的在线账号，账号ID={$currentAccountId}");
                return ['transferred' => 0, 'failed' => count($friends)];
            }

            // 随机选择一个目标账号（同一批次使用同一个目标账号）
            $availableAccountIds = array_values($availableAccountIds);
            $randomKey = array_rand($availableAccountIds, 1);
            $toAccountId = $availableAccountIds[$randomKey];

            // 获取目标账号信息
            $toAccountData = Db::table('s2_company_account')->where('id', $toAccountId)->find();
            if (empty($toAccountData)) {
                Log::error("批量迁移失败：目标账号不存在，账号ID={$toAccountId}");
                return ['transferred' => 0, 'failed' => count($friends)];
            }

            // 批量获取好友信息
            $friendIds = array_column($friends, 'friendId');
            $friendList = Db::table('s2_wechat_friend')
                ->where('id', 'in', $friendIds)
                ->select();

            $friendMap = [];
            foreach ($friendList as $friend) {
                $friendMap[$friend['id']] = $friend;
            }

            // 批量执行迁移
            $automaticAssign = new AutomaticAssign();
            $updateData = [];

            foreach ($friends as $friendItem) {
                $wechatFriendId = $friendItem['friendId'];
                
                if (!isset($friendMap[$wechatFriendId])) {
                    $failed++;
                    Log::warning("批量迁移失败：好友不存在，好友ID={$wechatFriendId}");
                    continue;
                }

                $friend = $friendMap[$wechatFriendId];

                // 如果好友当前账号不在可用账号列表中，或者需要迁移到其他账号
                $needTransfer = !in_array($friend['accountId'], $accountIds) || $currentAccountId != $friend['accountId'];

                if ($needTransfer) {
                    // 执行迁移
                    $result = $automaticAssign->allotWechatFriend([
                        'wechatFriendId' => $wechatFriendId,
                        'toAccountId' => $toAccountId
                    ], true);

                    $resultData = json_decode($result, true);
                    
                    if (isset($resultData['code']) && $resultData['code'] == 200) {
                        // 收集需要更新的数据
                        $updateData[] = [
                            'id' => $wechatFriendId,
                            'accountId' => $toAccountId,
                            'accountUserName' => $toAccountData['userName'],
                            'accountRealName' => $toAccountData['realName'],
                            'accountNickname' => $toAccountData['nickname'],
                        ];
                        $transferred++;
                    } else {
                        $errorMsg = isset($resultData['msg']) ? $resultData['msg'] : '迁移失败';
                        $failed++;
                        Log::warning("批量迁移失败：好友ID={$wechatFriendId}，错误：{$errorMsg}");
                    }
                } else {
                    // 无需迁移
                    $transferred++;
                }
            }

            // 批量更新好友的账号信息
            if (!empty($updateData)) {
                foreach ($updateData as $data) {
                    Db::table('s2_wechat_friend')
                        ->where('id', $data['id'])
                        ->update([
                            'accountId' => $data['accountId'],
                            'accountUserName' => $data['accountUserName'],
                            'accountRealName' => $data['accountRealName'],
                            'accountNickname' => $data['accountNickname'],
                        ]);
                }

                $logMessage = "批量迁移成功：账号ID={$currentAccountId}，共" . count($updateData) . "个好友迁移到账号{$toAccountId}";
                if (!empty($reason)) {
                    $logMessage .= "，原因：{$reason}";
                }
                Log::info($logMessage);
            }

            return [
                'transferred' => $transferred,
                'failed' => $failed
            ];

        } catch (\Exception $e) {
            Log::error("批量迁移异常：账号ID={$currentAccountId}，错误：" . $e->getMessage());
            return [
                'transferred' => $transferred,
                'failed' => count($friends) - $transferred
            ];
        }
    }

    /**
     * 检查并迁移未读或未回复的好友
     * @param int $unreadMinutes 未读分钟数，默认30分钟
     * @param int $pageSize 每页处理数量，默认100
     * @return array ['total' => int, 'transferred' => int, 'failed' => int]
     */
    public function checkAndTransferUnreadOrUnrepliedFriends($unreadMinutes = 30, $pageSize = 100)
    {
        $total = 0;
        $transferred = 0;
        $failed = 0;

        try {
            $currentTime = time();
            $timeThreshold = $currentTime - ($unreadMinutes * 60);  // 超过指定分钟数的时间点
            $last24Hours = $currentTime - (24 * 60 * 60);  // 近24小时的时间点
            
            // 确保每页数量合理
            $pageSize = max(1, min(1000, intval($pageSize)));

            // 查询需要迁移的好友
            // 条件：以消息表为主表，查询近24小时内的消息
            // 1. 最后一条消息是用户发送的消息（isSend=0）
            // 2. 消息时间在近24小时内
            // 3. 消息时间超过指定分钟数（默认30分钟）
            // 4. 在这条用户消息之后，客服没有发送任何回复
            // 即：用户发送了消息，但客服超过30分钟没有回复，需要迁移给其他客服处理
            
            // SQL逻辑说明（以消息表为主表）：
            // 1. 从消息表开始，筛选近24小时内的用户消息（isSend=0）
            // 2. 找到每个好友的最后一条用户消息（通过MAX(id)）
            // 3. 这条消息的时间超过指定分钟数（wm.wechatTime <= timeThreshold）
            // 4. 在这条用户消息之后，客服没有发送任何回复（NOT EXISTS isSend=1的消息）
            // 5. 关联好友表，确保好友未删除且已分配账号
            
            // 先统计总数
            $countSql = "
                SELECT COUNT(DISTINCT wm.wechatFriendId) as total
                FROM s2_wechat_message wm
                INNER JOIN (
                    SELECT wechatFriendId, MAX(id) as maxId
                    FROM s2_wechat_message
                    WHERE type = 1
                    AND isSend = 0  -- 用户发送的消息
                    AND wechatTime >= ?  -- 近24小时内的消息
                    GROUP BY wechatFriendId
                ) last_msg ON wm.id = last_msg.maxId
                INNER JOIN s2_wechat_friend wf ON wf.id = wm.wechatFriendId
                WHERE wm.type = 1
                AND wm.isSend = 0  -- 最后一条消息是用户发送的（客服接收的）
                AND wm.wechatTime >= ?  -- 近24小时内的消息
                AND wm.wechatTime <= ?  -- 超过指定时间（默认30分钟）
                AND wf.isDeleted = 0
                AND wf.accountId IS NOT NULL
                AND NOT EXISTS (
                    -- 检查在这条用户消息之后，是否有客服的回复
                    SELECT 1 
                    FROM s2_wechat_message 
                    WHERE wechatFriendId = wm.wechatFriendId 
                    AND type = 1 
                    AND isSend = 1  -- 客服发送的消息
                    AND wechatTime > wm.wechatTime  -- 在用户消息之后
                )
            ";

            $countResult = Db::query($countSql, [$last24Hours, $last24Hours, $timeThreshold]);
            $total = isset($countResult[0]['total']) ? intval($countResult[0]['total']) : 0;

            if ($total == 0) {
                Log::info("未找到需要迁移的未读/未回复好友（近24小时内）");
                return [
                    'total' => 0,
                    'transferred' => 0,
                    'failed' => 0
                ];
            }

            Log::info("开始检查未读/未回复好友（近24小时内），共找到 {$total} 个需要迁移的好友，将分页处理（每页{$pageSize}条）");

            // 分页处理
            $page = 1;
            $processed = 0;
            
            do {
                $offset = ($page - 1) * $pageSize;
                
                $sql = "
                    SELECT DISTINCT 
                        wf.id as friendId, 
                        wf.accountId, 
                        wm.wechatAccountId, 
                        wm.wechatTime,
                        wm.id as lastMessageId
                    FROM s2_wechat_message wm
                    INNER JOIN (
                        SELECT wechatFriendId, MAX(id) as maxId
                        FROM s2_wechat_message
                        WHERE type = 1
                        AND isSend = 0  -- 用户发送的消息
                        AND wechatTime >= ?  -- 近24小时内的消息
                        GROUP BY wechatFriendId
                    ) last_msg ON wm.id = last_msg.maxId
                    INNER JOIN s2_wechat_friend wf ON wf.id = wm.wechatFriendId
                    WHERE wm.type = 1
                    AND wm.isSend = 0  -- 最后一条消息是用户发送的（客服接收的）
                    AND wm.wechatTime >= ?  -- 近24小时内的消息
                    AND wm.wechatTime <= ?  -- 超过指定时间（默认30分钟）
                    AND wf.isDeleted = 0
                    AND wf.accountId IS NOT NULL
                    AND NOT EXISTS (
                        -- 检查在这条用户消息之后，是否有客服的回复
                        SELECT 1 
                        FROM s2_wechat_message 
                        WHERE wechatFriendId = wm.wechatFriendId 
                        AND type = 1 
                        AND isSend = 1  -- 客服发送的消息
                        AND wechatTime > wm.wechatTime  -- 在用户消息之后
                    )
                    ORDER BY wf.accountId ASC, wm.id ASC
                    LIMIT ? OFFSET ?
                ";

                $friends = Db::query($sql, [$last24Hours, $last24Hours, $timeThreshold, $pageSize, $offset]);
                $currentPageCount = count($friends);

                if ($currentPageCount == 0) {
                    break;
                }

                Log::info("处理第 {$page} 页，本页 {$currentPageCount} 条记录");

                // 按 accountId 分组
                $friendsByAccount = [];
                foreach ($friends as $friend) {
                    $accountId = $friend['accountId'];
                    if (!isset($friendsByAccount[$accountId])) {
                        $friendsByAccount[$accountId] = [];
                    }
                    $friendsByAccount[$accountId][] = $friend;
                }
                // 按账号分组批量处理
                foreach ($friendsByAccount as $accountId => $accountFriends) {
                    $batchResult = $this->transferFriendsBatch(
                        $accountFriends,
                        $accountId,
                        "消息未读或未回复超过{$unreadMinutes}分钟"
                    );

                    $transferred += $batchResult['transferred'];
                    $failed += $batchResult['failed'];
                    $processed += count($accountFriends);

                    Log::info("账号 {$accountId} 批量迁移完成：成功{$batchResult['transferred']}，失败{$batchResult['failed']}，共" . count($accountFriends) . "个好友");
                }

                $page++;
                
                // 每处理一页后记录进度
                Log::info("已处理 {$processed}/{$total} 条记录，成功：{$transferred}，失败：{$failed}");

            } while ($currentPageCount == $pageSize && $processed < $total);

            Log::info("未读/未回复好友迁移完成：总计{$total}，成功{$transferred}，失败{$failed}");

            return [
                'total' => $total,
                'transferred' => $transferred,
                'failed' => $failed
            ];

        } catch (\Exception $e) {
            Log::error("检查未读/未回复好友异常：" . $e->getMessage());
            return [
                'total' => $total,
                'transferred' => $transferred,
                'failed' => $failed
            ];
        }
    }
}

