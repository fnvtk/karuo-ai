<?php

namespace app\job;

use app\api\controller\WebSocketController;
use app\cunkebao\model\Workbench;
use app\cunkebao\model\WorkbenchGroupCreate;
use app\api\model\WechatFriendModel as WechatFriend;
use app\api\model\WechatMomentsModel as WechatMoments;
use app\common\model\DeviceWechatLogin as DeviceWechatLoginModel;
use think\facade\Log;
use think\facade\Env;
use think\Db;
use think\queue\Job;
use think\facade\Cache;
use think\facade\Config;
use app\api\controller\MomentsController as Moments;
use Workerman\Lib\Timer;
use app\api\controller\WechatController;
use think\Queue;

/**
 * 工作台群创建任务
 * Class WorkbenchGroupCreateJob
 * @package app\job
 */
class WorkbenchGroupCreateJob
{

    /**
     * 最大重试次数
     */
    const MAX_RETRY_ATTEMPTS = 3;

    /**
     * 队列任务处理
     * @param Job $job 队列任务
     * @param array $data 任务数据
     * @return bool
     */
    public function fire(Job $job, $data)
    {
        $jobId = $data['jobId'] ?? '';
        $queueLockKey = $data['queueLockKey'] ?? '';
        try {
            $this->logJobStart($jobId, $queueLockKey);
            $this->execute();
            $this->handleJobSuccess($job, $queueLockKey);
            return true;
        } catch (\Exception $e) {
            return $this->handleJobError($e, $job, $queueLockKey);
        }
    }

    /**
     * 成员类型常量
     */
    const MEMBER_TYPE_OWNER = 1;      // 群主成员
    const MEMBER_TYPE_ADMIN = 2;      // 管理员
    const MEMBER_TYPE_OWNER_FRIEND = 3;  // 群主好友
    const MEMBER_TYPE_ADMIN_FRIEND = 4;  // 管理员好友

    /**
     * 状态常量
     */
    const STATUS_PENDING = 0;         // 待创建
    const STATUS_CREATING = 1;       // 创建中
    const STATUS_SUCCESS = 2;        // 创建成功
    const STATUS_FAILED = 3;         // 创建失败
    const STATUS_ADMIN_FRIEND_ADDED = 4;  // 管理员好友已拉入

    /**
     * 执行任务
     * @throws \Exception
     */
    public function execute()
    {
        try {
            // 1. 查询启用了建群功能的数据
            $workbenches = Workbench::where(['status' => 0, 'type' => 4, 'isDel' => 0,'id' => 354])->order('id desc')->select();
        
            foreach ($workbenches as $workbench) {
                // 获取工作台配置
                $config = WorkbenchGroupCreate::where('workbenchId', $workbench->id)->find();
                if (!$config) {
                    continue;
                }
                
                // 解析配置
                $config['poolGroups'] = json_decode($config['poolGroups'] ?? '[]', true) ?: [];
                $config['devices'] = json_decode($config['devices'] ?? '[]', true) ?: [];
                $config['wechatGroups'] = json_decode($config['wechatGroups'] ?? '[]', true) ?: [];
                $config['admins'] = json_decode($config['admins'] ?? '[]', true) ?: [];
                
                // 检查时间限制
                if (!$this->isWithinTimeRange($config)) {
                    continue;
                }
                
                // 检查每日建群数量限制
                if (!$this->checkDailyLimit($workbench->id, $config)) {
                    continue;
                }

                // 检查是否有正在创建中的群，如果有则跳过（避免重复创建）
                $creatingCount = Db::name('workbench_group_create_item')
                    ->where('workbenchId', $workbench->id)
                    ->where('status', self::STATUS_CREATING)
                    ->where('groupId', '<>', null) // 有groupId的记录
                    ->group('groupId')
                    ->count();
                if ($creatingCount > 0) {
                    Log::info("工作台ID: {$workbench->id} 有正在创建中的群（{$creatingCount}个），跳过本次执行");
                    continue;
                }
                
                if (empty($config['devices'])) {
                    continue;
                }
                // 获取群主成员（从设备中获取）
                $groupMember = [];
                $wechatIds = Db::name('device_wechat_login')
                    ->whereIn('deviceId', $config['devices'])
                    ->where('alive', DeviceWechatLoginModel::ALIVE_WECHAT_ACTIVE)
                    ->order('id desc')
                    ->column('wechatId');
                
                if (empty($wechatIds)) {
                    continue;
                }
                $groupMember = array_unique($wechatIds);
                
                // 获取群主好友ID映射（所有群主的好友）
                $groupMemberWechatId = [];
                $groupMemberId = [];
                
                foreach ($groupMember as $ownerWechatId) {
                    $friends = Db::table('s2_wechat_friend')
                        ->where('ownerWechatId', $ownerWechatId)
                        ->whereIn('wechatId', $groupMember)
                        ->where('isDeleted', 0)
                        ->field('id,wechatId')
                        ->select();
                    
                    foreach ($friends as $friend) {
                        if (!isset($groupMemberWechatId[$friend['id']])) {
                            $groupMemberWechatId[$friend['id']] = $friend['wechatId'];
                            $groupMemberId[] = $friend['id'];
                        }
                    }
                }
                
                // 如果配置了wechatGroups，从指定的群组中获取成员
                if (!empty($config['wechatGroups'])) {
                    $this->addGroupMembersFromWechatGroups($config['wechatGroups'], $groupMember, $groupMemberId, $groupMemberWechatId);
                }
                
                if (empty($groupMemberId)) {
                    continue;
                }

                // 获取流量池用户（如果配置了流量池）
                $poolItem = [];
                if (!empty($config['poolGroups'])) {
                    // 检查是否包含"所有好友"（packageId=0）
                    $hasAllFriends = in_array(0, $config['poolGroups']) || in_array('0', $config['poolGroups']);
                    $normalPools = array_filter($config['poolGroups'], function($id) {
                        return $id !== 0 && $id !== '0';
                    });
                    
                    // 处理"所有好友"特殊流量池
                    if ($hasAllFriends) {
                        $companyId = $workbench->companyId ?? 0;
                        $allFriendsIdentifiers = $this->getAllFriendsIdentifiersByCompany($companyId);
                        $poolItem = array_merge($poolItem, $allFriendsIdentifiers);
                    }
                    
                    // 处理普通流量池
                    if (!empty($normalPools)) {
                        $normalIdentifiers = Db::name('traffic_source_package_item')
                            ->whereIn('packageId', $normalPools)
                            ->where('isDel', 0)
                            ->group('identifier')
                            ->column('identifier');
                        $poolItem = array_merge($poolItem, $normalIdentifiers);
                    }
                    
                    // 去重
                    $poolItem = array_unique($poolItem);
                }
                
                // 如果既没有流量池也没有指定群组，跳过
                if (empty($poolItem) && empty($config['wechatGroups'])) {
                    continue;
                }

                // 获取已入群的用户（排除已成功入群的）
                $groupUser = [];
                if (!empty($poolItem)) {
                    $groupUser = Db::name('workbench_group_create_item')
                        ->where('workbenchId', $workbench->id)
                        ->where('status', 'in', [self::STATUS_SUCCESS, self::STATUS_ADMIN_FRIEND_ADDED, self::STATUS_CREATING])
                        ->whereIn('wechatId', $poolItem)
                        ->group('wechatId')
                        ->column('wechatId');
                }
                
                // 待入群的用户（从流量池中筛选）
                $joinUser = !empty($poolItem) ? array_diff($poolItem, $groupUser) : [];
                
                // 如果流量池用户已用完或没有配置流量池，但配置了wechatGroups，至少创建一次（使用群主成员）
                if (empty($joinUser) && !empty($config['wechatGroups'])) {
                    // 如果没有流量池用户，创建一个空批次，让processBatchUsers处理只有群主成员的情况
                    $joinUser = []; // 空数组，但会继续执行
                }
                
                // 如果既没有流量池用户也没有配置wechatGroups，跳过
                if (empty($joinUser) && empty($config['wechatGroups'])) {
                    continue;
                }
                
                // 计算随机群人数（不包含管理员，只减去群主成员数）
                // 群主成员数 = 群主好友ID数量
                $minGroupSize = max(2, $config['groupSizeMin']); // 至少2人才能建群
                $maxGroupSize = max($minGroupSize, $config['groupSizeMax']);
                $groupRandNum = mt_rand($minGroupSize, $maxGroupSize) - count($groupMemberId);
                if ($groupRandNum <= 0) {
                    $groupRandNum = 1; // 至少需要1个成员
                }
              
                // 分批处理待入群用户
                $addGroupUser = [];
                if (!empty($joinUser)) {
                    $totalRows = count($joinUser);
                    for ($i = 0; $i < $totalRows; $i += $groupRandNum) {
                        $batchRows = array_slice($joinUser, $i, $groupRandNum);
                        if (!empty($batchRows)) {
                            $addGroupUser[] = $batchRows;
                        }
                    }
                } else {
                    // 如果没有流量池用户但配置了wechatGroups，创建一个空批次
                    $addGroupUser[] = [];
                }
                // 初始化WebSocket
                $toAccountId = '';
                $username = Env::get('api.username2', '');
                $password = Env::get('api.password2', '');
                if (!empty($username) || !empty($password)) {
                    $toAccountId = Db::name('users')->where('account', $username)->value('s2_accountId');
                }
                $webSocket = new WebSocketController(['userName' => $username, 'password' => $password, 'accountId' => $toAccountId]);
                
                // 遍历每批用户
                foreach ($addGroupUser as $batchUsers) {
                    $this->processBatchUsers($workbench, $config, $batchUsers, $groupMemberId, $groupMemberWechatId, $groupRandNum, $webSocket);
                }
            }
        } catch (\Exception $e) {
            Log::error("工作台建群任务异常: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * 处理一批用户
     * @param Workbench $workbench 工作台
     * @param array $config 配置
     * @param array $batchUsers 批次用户（微信ID数组，来自流量池）
     * @param array $groupMemberId 群主成员ID数组
     * @param array $groupMemberWechatId 群主成员微信ID映射
     * @param int $groupRandNum 随机群人数（不包含管理员）
     * @param WebSocketController $webSocket WebSocket实例
     */
    protected function processBatchUsers($workbench, $config, $batchUsers, $groupMemberId, $groupMemberWechatId, $groupRandNum, $webSocket)
    {
        // 1. 获取群主微信ID列表（用于验证管理员）
        // 从群主成员的好友记录中提取所有群主的微信ID（ownerWechatId）
        $groupOwnerWechatIds = [];
        foreach ($groupMemberId as $memberId) {
            $member = Db::table('s2_wechat_friend')->where('id', $memberId)->find();
            if ($member && !in_array($member['ownerWechatId'], $groupOwnerWechatIds)) {
                $groupOwnerWechatIds[] = $member['ownerWechatId'];
            }
        }
      
        
        // 如果从好友表获取不到，使用群主成员微信ID列表（作为备用）
        if (empty($groupOwnerWechatIds)) {
            $groupOwnerWechatIds = array_values(array_unique($groupMemberWechatId));
        }
        // 2. 验证并获取管理员好友ID（管理员必须是群主的好友）
        $adminFriendIds = [];
        $adminWechatIds = [];
        if (!empty($config['admins'])) {
            $adminFriends = Db::table('s2_wechat_friend')
                ->where('id', 'in', $config['admins'])
                ->field('id,wechatId,ownerWechatId')
                ->select();
            
            foreach ($adminFriends as $adminFriend) {
                // 验证：管理员必须是群主的好友
                if (in_array($adminFriend['ownerWechatId'], $groupOwnerWechatIds)) {
                    $adminFriendIds[] = $adminFriend['id'];
                    $adminWechatIds[$adminFriend['id']] = $adminFriend['wechatId'];
                }
            }
        }

     
        // 3. 从流量池用户中筛选出是群主好友的用户（按微信账号分组）
        $ownerFriendIdsByAccount = [];
        $wechatIds = [];
        
        // 如果batchUsers为空，说明没有流量池用户，但可能配置了wechatGroups
        // 这种情况下，使用群主成员作为基础，按账号分组
        if (empty($batchUsers)) {
            // 按账号分组群主成员
            foreach ($groupMemberId as $memberId) {
                $member = Db::table('s2_wechat_friend')->where('id', $memberId)->find();
                if ($member) {
                    $accountWechatId = $member['ownerWechatId'];
                    $account = Db::table('s2_wechat_account')
                        ->where('wechatId', $accountWechatId)
                        ->field('id')
                        ->find();
                    
                    if ($account) {
                        $wechatAccountId = $account['id'];
                        if (!isset($ownerFriendIdsByAccount[$wechatAccountId])) {
                            $ownerFriendIdsByAccount[$wechatAccountId] = [];
                        }
                        $ownerFriendIdsByAccount[$wechatAccountId][] = $memberId;
                        $wechatIds[$memberId] = $groupMemberWechatId[$memberId] ?? '';
                    }
                }
            }
        } else {
            // 获取群主的好友关系（从流量池中筛选）
            $ownerFriends = Db::table('s2_wechat_friend')->alias('f')
                ->join(['s2_wechat_account' => 'a'], 'f.wechatAccountId=a.id')
                ->whereIn('f.wechatId', $batchUsers)
                ->whereIn('a.wechatId', $groupOwnerWechatIds)
                ->where('f.isDeleted', 0)
                ->field('f.id,f.wechatId,a.id as wechatAccountId')
                ->select();
                
            if (empty($ownerFriends)) {
                Log::warning("未找到群主的好友，跳过。工作台ID: {$workbench->id}");
                return;
            }

            // 按微信账号分组群主好友
            foreach ($ownerFriends as $friend) {
                $wechatAccountId = $friend['wechatAccountId'];
                if (!isset($ownerFriendIdsByAccount[$wechatAccountId])) {
                    $ownerFriendIdsByAccount[$wechatAccountId] = [];
                }
                $ownerFriendIdsByAccount[$wechatAccountId][] = $friend['id'];
                $wechatIds[$friend['id']] = $friend['wechatId'];
            }
        }
        
        // 如果没有找到任何好友，跳过
        if (empty($ownerFriendIdsByAccount)) {
            Log::warning("未找到任何群主好友或成员，跳过。工作台ID: {$workbench->id}");
            return;
        }
       
        // 4. 遍历每个微信账号，创建群
        foreach ($ownerFriendIdsByAccount as $wechatAccountId => $ownerFriendIds) {
            // 4.1 获取当前账号的管理员好友ID
            $currentAdminFriendIds = [];
            $accountWechatId = Db::table('s2_wechat_account')->where('id', $wechatAccountId)->value('wechatId');
            foreach ($adminFriendIds as $adminFriendId) {
                $adminFriend = Db::table('s2_wechat_friend')->where('id', $adminFriendId)->find();
                if ($adminFriend && $adminFriend['ownerWechatId'] == $accountWechatId) {
                    $currentAdminFriendIds[] = $adminFriendId;
                    $wechatIds[$adminFriendId] = $adminWechatIds[$adminFriendId];
                }
            }

            // 4.2 获取当前账号的群主成员ID
            $currentGroupMemberIds = [];
            foreach ($groupMemberId as $memberId) {
                $member = Db::table('s2_wechat_friend')->where('id', $memberId)->find();
                if ($member && $member['ownerWechatId'] == $accountWechatId) {
                    $currentGroupMemberIds[] = $memberId;
                    if (!isset($wechatIds[$memberId])) {
                        $wechatIds[$memberId] = $groupMemberWechatId[$memberId] ?? '';
                    }
                }
            }
 
            // 4.3 限制群主好友数量（按随机群人数）
            // 如果ownerFriendIds只包含群主成员（没有流量池用户），则不需要限制
            $limitedOwnerFriendIds = $ownerFriendIds;
            if (count($ownerFriendIds) > $groupRandNum) {
                $limitedOwnerFriendIds = array_slice($ownerFriendIds, 0, $groupRandNum);
            }
            
            // 4.4 创建群：管理员 + 群主成员 + 群主好友（从流量池筛选）
            // 合并时去重，避免重复添加群主成员
            $createFriendIds = array_merge($currentAdminFriendIds, $currentGroupMemberIds);
            foreach ($limitedOwnerFriendIds as $friendId) {
                if (!in_array($friendId, $createFriendIds)) {
                    $createFriendIds[] = $friendId;
                }
            }
            
            // 微信建群至少需要2个人
            if (count($createFriendIds) < 2) {
                Log::warning("建群好友数量不足（至少需要2人），跳过。工作台ID: {$workbench->id}, 微信账号ID: {$wechatAccountId}, 当前人数: " . count($createFriendIds));
                continue;
            }

            // 4.5 检查当前账号是否有正在创建中的群，如果有则跳过
            $creatingGroupCount = Db::name('workbench_group_create_item')
                ->where('workbenchId', $workbench->id)
                ->where('wechatAccountId', $wechatAccountId)
                ->where('status', self::STATUS_CREATING)
                ->where('groupId', '<>', null)
                ->group('groupId')
                ->count();
            
            if ($creatingGroupCount > 0) {
                Log::info("工作台ID: {$workbench->id}, 微信账号ID: {$wechatAccountId} 有正在创建中的群（{$creatingGroupCount}个），跳过本次创建");
                continue;
            }
            
            // 4.6 生成群名称
            $existingGroupCount = Db::name('workbench_group_create_item')
                ->where('workbenchId', $workbench->id)
                ->where('wechatAccountId', $wechatAccountId)
                ->where('status', self::STATUS_SUCCESS)
                ->where('groupId', '<>', null) // 排除groupId为NULL的记录
                ->group('groupId')
                ->count();
            
            $chatroomName = $existingGroupCount > 0 
                ? $config['groupNameTemplate'] . ($existingGroupCount + 1) . '群'
                : $config['groupNameTemplate'];

            // 4.7 调用建群接口
            $createTime = time();
            $createResult = $webSocket->CmdChatroomCreate([
                'chatroomName' => $chatroomName,
                'wechatFriendIds' => $createFriendIds,
                'wechatAccountId' => $wechatAccountId
            ]);

            $createResultData = json_decode($createResult, true);
            
            // 4.8 解析建群结果，获取群ID
            // chatroomId: varchar(64) - 微信的群聊ID（字符串）
            // groupId: int(10) - 数据库中的群组ID（整数）
            $chatroomId = null; // 微信群聊ID（字符串）
            $groupId = 0; // 数据库群组ID（整数）
            $tempGroupId = null; // 临时群标识，用于轮询查询
            
            if (!empty($createResultData) && isset($createResultData['code']) && $createResultData['code'] == 200) {
                // 尝试从返回数据中获取群ID（根据实际API返回格式调整）
                if (isset($createResultData['data']['chatroomId'])) {
                    // API返回的是chatroomId（字符串）
                    $chatroomId = (string)$createResultData['data']['chatroomId'];
                    // 通过chatroomId查询数据库获取groupId
                    $group = Db::name('wechat_group')
                        ->where('chatroomId', $chatroomId)
                        ->where('deleteTime', 0)
                        ->find();
                    if ($group) {
                        $groupId = intval($group['id']);
                    }
                } elseif (isset($createResultData['data']['id'])) {
                    // API返回的是数据库ID（整数）
                    $groupId = intval($createResultData['data']['id']);
                    // 通过groupId查询chatroomId
                    $group = Db::name('wechat_group')
                        ->where('id', $groupId)
                        ->where('deleteTime', 0)
                        ->find();
                    if ($group && !empty($group['chatroomId'])) {
                        $chatroomId = (string)$group['chatroomId'];
                    }
                }
                // 如果有临时标识，保存用于轮询
                if (isset($createResultData['data']['tempId'])) {
                    $tempGroupId = $createResultData['data']['tempId'];
                }
            }

            // 4.9 如果建群接口没有立即返回群ID，进行同步轮询检查
            if ($groupId == 0) {
                // 获取账号的微信ID（群主微信ID）
                $accountWechatId = Db::table('s2_wechat_account')
                    ->where('id', $wechatAccountId)
                    ->value('wechatId');
                
                if (!empty($accountWechatId)) {
                    $pollResult = $this->pollGroupCreation($chatroomName, $accountWechatId, $wechatAccountId, $tempGroupId);
                    if ($pollResult && is_array($pollResult)) {
                        $groupId = intval($pollResult['groupId'] ?? 0);
                        $chatroomId = !empty($pollResult['chatroomId']) ? (string)$pollResult['chatroomId'] : null;
                    } elseif ($pollResult > 0) {
                        // 兼容旧返回值（只返回groupId）
                        $groupId =0;
                        $chatroomId = null;
                    }
                }
            }

            // 4.10 记录创建请求
            $installData = [];
            foreach ($createFriendIds as $friendId) {
                $memberType = in_array($friendId, $currentAdminFriendIds) 
                    ? self::MEMBER_TYPE_ADMIN 
                    : (in_array($friendId, $currentGroupMemberIds) ? self::MEMBER_TYPE_OWNER : self::MEMBER_TYPE_OWNER_FRIEND);
                
                $installData[] = [
                    'workbenchId' => $workbench->id,
                    'friendId' => $friendId,
                    'wechatId' => $wechatIds[$friendId] ?? ($groupMemberWechatId[$friendId] ?? ''),
                    'groupId' => $groupId > 0 ? $groupId : null, // int类型
                    'wechatAccountId' => $wechatAccountId,
                    'status' => $groupId > 0 ? self::STATUS_SUCCESS : self::STATUS_FAILED,
                    'memberType' => $memberType,
                    'retryCount' => 0,
                    'chatroomId' => $chatroomId, // varchar类型
                    'createTime' => $createTime,
                ];
            }
            Db::name('workbench_group_create_item')->insertAll($installData);

            // 5. 如果群创建成功，拉管理员的好友进群
            // 注意：拉人接口需要chatroomId（字符串），而不是groupId（整数）
            if (!empty($chatroomId) && !empty($currentAdminFriendIds)) {
                $this->inviteAdminFriends($workbench, $config, $batchUsers, $currentAdminFriendIds, $chatroomId, $groupId, $wechatAccountId, $wechatIds, $createTime, $webSocket);
            }
        }
    }

    /**
     * 拉管理员的好友进群
     * @param Workbench $workbench 工作台
     * @param array $config 配置
     * @param array $batchUsers 批次用户（流量池微信ID数组）
     * @param array $adminFriendIds 管理员好友ID数组
     * @param string $chatroomId 群聊ID（字符串，用于API调用）
     * @param int $groupId 数据库群组ID（整数）
     * @param int $wechatAccountId 微信账号ID
     * @param array $wechatIds 好友ID到微信ID的映射
     * @param int $createTime 创建时间
     * @param WebSocketController $webSocket WebSocket实例
     */
    protected function inviteAdminFriends($workbench, $config, $batchUsers, $adminFriendIds, $chatroomId, $groupId, $wechatAccountId, $wechatIds, $createTime, $webSocket)
    {
        // 获取管理员的微信ID列表
        $adminWechatIds = [];
        foreach ($adminFriendIds as $adminFriendId) {
            if (isset($wechatIds[$adminFriendId])) {
                $adminWechatIds[] = $wechatIds[$adminFriendId];
            }
        }

        if (empty($adminWechatIds)) {
            return;
        }

        // 从流量池用户中筛选出是管理员好友的用户
        $adminFriendsFromPool = Db::table('s2_wechat_friend')->alias('f')
            ->join(['s2_wechat_account' => 'a'], 'f.wechatAccountId=a.id')
            ->whereIn('f.wechatId', $batchUsers)
            ->whereIn('a.wechatId', $adminWechatIds)
            ->where('a.id', $wechatAccountId)
            ->where('f.isDeleted', 0)
            ->field('f.id,f.wechatId')
            ->select();

        if (empty($adminFriendsFromPool)) {
            Log::info("未找到管理员的好友，跳过拉人。工作台ID: {$workbench->id}, 群ID: {$chatroomId}");
            return;
        }

        // 提取好友ID列表
        $adminFriendIdsToInvite = [];
        foreach ($adminFriendsFromPool as $friend) {
            $adminFriendIdsToInvite[] = $friend['id'];
            $wechatIds[$friend['id']] = $friend['wechatId'];
        }

        // 调用拉人接口（使用chatroomId字符串）
        $inviteResult = $webSocket->CmdChatroomInvite([
            'wechatChatroomId' => $chatroomId,
            'wechatFriendIds' => $adminFriendIdsToInvite
        ]);

        $inviteResultData = json_decode($inviteResult, true);
        $inviteSuccess = !empty($inviteResultData) && isset($inviteResultData['code']) && $inviteResultData['code'] == 200;

        // 记录管理员好友拉入状态
        $adminFriendData = [];
        foreach ($adminFriendIdsToInvite as $friendId) {
            $adminFriendData[] = [
                'workbenchId' => $workbench->id,
                'friendId' => $friendId,
                'wechatId' => $wechatIds[$friendId] ?? '',
                'groupId' => $groupId > 0 ? $groupId : null, // int类型
                'wechatAccountId' => $wechatAccountId,
                'status' => $inviteSuccess ? self::STATUS_ADMIN_FRIEND_ADDED : self::STATUS_FAILED,
                'memberType' => self::MEMBER_TYPE_ADMIN_FRIEND,
                'retryCount' => 0,
                'chatroomId' => $chatroomId, // varchar类型
                'createTime' => $createTime,
            ];
        }
        Db::name('workbench_group_create_item')->insertAll($adminFriendData);

        if ($inviteSuccess) {
            // 去除成功日志，减少日志空间消耗
        } else {
            Log::warning("管理员好友拉入失败。工作台ID: {$workbench->id}, 群组ID: {$groupId}, 群聊ID: {$chatroomId}");
        }
    }


    /**
     * 轮询检查群是否创建成功
     * @param string $chatroomName 群名称
     * @param string $ownerWechatId 群主微信ID
     * @param int $wechatAccountId 微信账号ID
     * @param string|null $tempGroupId 临时群标识（如果有）
     * @return array|int 返回数组包含groupId和chatroomId，或只返回groupId（兼容旧代码），如果未找到返回0
     */
    protected function pollGroupCreation($chatroomName, $ownerWechatId, $wechatAccountId, $tempGroupId = null)
    {
        $maxAttempts = 10; // 最多查询10次
        $interval = 5; // 每次间隔5秒
        
        // 获取账号ID（accountId）和微信账号的微信ID（wechatAccountWechatId），用于查询s2_wechat_chatroom表
        $accountInfo = Db::table('s2_wechat_account')
            ->where('id', $wechatAccountId)
            ->field('id,wechatId')
            ->find();
        
        $accountId = $accountInfo['id'] ?? null;
        $wechatAccountWechatId = $accountInfo['wechatId'] ?? null;
        
        if (empty($accountId) && empty($wechatAccountWechatId)) {
            Log::warning("无法获取账号ID和微信账号ID，跳过轮询。微信账号ID: {$wechatAccountId}");
            return 0;
        }
        
        // 获取授权信息（用于调用同步接口）
        $username = Env::get('api.username2', '');
        $password = Env::get('api.password2', '');
        
        for ($attempt = 1; $attempt <= $maxAttempts; $attempt++) {
            // 等待5秒（第一次立即查询，后续等待）
            if ($attempt > 1) {
                sleep($interval);
            }
            
            // 1. 先调用接口同步最新的群组信息
            try {
                $chatroomController = new \app\api\controller\WechatChatroomController();
                // 构建同步参数
                $syncData = [
                    'wechatAccountKeyword' => $ownerWechatId, // 通过群主微信ID筛选
                    'isDeleted' => false,
                    'pageIndex' => 0,
                    'pageSize' => 5 // 获取足够多的数据
                ];
                // 调用getlist方法同步数据（内部调用，isInner=true）
                $chatroomController->getlist($syncData, true, 0);
            } catch (\Exception $e) {
                Log::warning("同步群组信息失败: " . $e->getMessage());
                // 即使同步失败，也继续查询本地数据
            }
            
            // 2. 查询本地表 s2_wechat_chatroom
            // 计算5分钟前的时间戳
            $fiveMinutesAgo = time() - 300; // 5分钟 = 300秒
            $now = time();
            
            // 查询群聊：通过群名称、账号ID或微信账号ID和创建时间查询
            // 如果accountId不为空，优先使用accountId查询；如果accountId为空，则使用wechatAccountWechatId查询
            $chatroom = Db::table('s2_wechat_chatroom')
                ->where('nickname', $chatroomName)
                ->where('isDeleted', 0)
                ->where('createTime', '>=', $fiveMinutesAgo) // 创建时间在5分钟内
                ->where('createTime', '<=', $now)
                ->where('wechatAccountWechatId', $wechatAccountWechatId)
                ->order('createTime', 'desc')
                ->find();
            
            
            // 如果找到了群聊，返回群ID和chatroomId
            if ($chatroom && !empty($chatroom['id'])) {
                $chatroomId = !empty($chatroom['chatroomId']) ? (string)$chatroom['chatroomId'] : null;
                // 如果有chatroomId，尝试查询wechat_group表获取groupId
                $groupId = $chatroom['id'];
                Log::info("轮询检查群创建成功。群名称: {$chatroomName}, 群聊ID: {$chatroom['id']}, chatroomId: {$chatroomId}, 群组ID: {$groupId}, 尝试次数: {$attempt}");
                return [
                    'groupId' => $groupId > 0 ? $groupId : intval($chatroom['id']), // 如果没有groupId，使用chatroom的id
                    'chatroomId' => $chatroomId ?: (string)$chatroom['id']
                ];
            }
            
            Log::debug("轮询检查群创建中。群名称: {$chatroomName}, 尝试次数: {$attempt}/{$maxAttempts}");
        }
        
        // 10次查询后仍未找到，返回0表示失败
        Log::warning("轮询检查群创建失败，已查询{$maxAttempts}次仍未找到群组。群名称: {$chatroomName}, 群主微信ID: {$ownerWechatId}, 账号ID: {$accountId}");
        return 0;
    }

    /**
     * 检查是否在时间范围内
     * @param array $config 配置
     * @return bool
     */
    protected function isWithinTimeRange($config)
    {
        if (empty($config['startTime']) || empty($config['endTime'])) {
            return true; // 如果没有配置时间，则允许执行
        }
        
        $today = date('Y-m-d');
        $startTimestamp = strtotime($today . ' ' . $config['startTime'] . ':00');
        $endTimestamp = strtotime($today . ' ' . $config['endTime'] . ':00');

        $currentTime = time();
        
        // 如果开始时间大于当前时间，还未到执行时间
        if ($startTimestamp > $currentTime) {
            return false;
        }
        
        // 如果结束时间小于当前时间，已过执行时间
        if ($endTimestamp < $currentTime) {
            return false;
        }
        
        return true;
    }

    /**
     * 检查每日建群数量限制
     * @param int $workbenchId 工作台ID
     * @param array $config 配置
     * @return bool
     */
    protected function checkDailyLimit($workbenchId, $config)
    {
        if (empty($config['maxGroupsPerDay']) || $config['maxGroupsPerDay'] <= 0) {
            return true; // 如果没有配置限制，则允许执行
        }
        
        $today = date('Y-m-d');
        $startTimestamp = strtotime($today . ' 00:00:00');
        $endTimestamp = strtotime($today . ' 23:59:59');
        
        // 查询今日已创建的群数量（状态为成功）
        $todayCount = Db::name('workbench_group_create_item')
            ->where('workbenchId', $workbenchId)
            ->where('status', self::STATUS_SUCCESS)
            ->where('groupId', '<>', null) // 排除groupId为NULL的记录
            ->where('createTime', 'between', [$startTimestamp, $endTimestamp])
            ->group('groupId')
            ->count();
        
        return $todayCount < $config['maxGroupsPerDay'];
    }

    /**
     * 从指定的微信群组中获取成员
     * @param array $wechatGroups 群组ID数组（可能是好友ID或群组ID）
     * @param array $groupMember 群主成员微信ID数组（引用传递）
     * @param array $groupMemberId 群主成员好友ID数组（引用传递）
     * @param array $groupMemberWechatId 群主成员微信ID映射（引用传递）
     */
    protected function addGroupMembersFromWechatGroups($wechatGroups, &$groupMember, &$groupMemberId, &$groupMemberWechatId)
    {
        foreach ($wechatGroups as $groupId) {
            if (is_numeric($groupId)) {
                // 数字ID：可能是好友ID，查询好友信息
                $friend = Db::table('s2_wechat_friend')
                    ->where('id', $groupId)
                    ->where('isDeleted', 0)
                    ->field('id,wechatId,ownerWechatId')
                    ->find();
                
                if ($friend) {
                    // 添加到群主成员
                    if (!in_array($friend['ownerWechatId'], $groupMember)) {
                        $groupMember[] = $friend['ownerWechatId'];
                    }
                    
                    if (!isset($groupMemberWechatId[$friend['id']])) {
                        $groupMemberWechatId[$friend['id']] = $friend['wechatId'];
                        $groupMemberId[] = $friend['id'];
                    }
                } else {
                    // 如果不是好友ID，可能是群组ID，查询群组信息
                    $group = Db::name('wechat_group')
                        ->where('id', $groupId)
                        ->where('deleteTime', 0)
                        ->field('ownerWechatId')
                        ->find();
                    
                    if ($group && !in_array($group['ownerWechatId'], $groupMember)) {
                        $groupMember[] = $group['ownerWechatId'];
                    }
                }
            } else {
                // 字符串ID：手动创建的群组，可能是wechatId
                if (!in_array($groupId, $groupMember)) {
                    $groupMember[] = $groupId;
                }
            }
        }
    }


    /**
     * 获取公司下所有好友的identifier列表（特殊流量池 packageId=0）
     * @param int $companyId
     * @return array
     */
    protected function getAllFriendsIdentifiersByCompany($companyId)
    {
        // 获取公司下所有设备的微信ID
        $wechatIds = Db::name('device')->alias('d')
            ->join('(SELECT MAX(id) AS id, deviceId FROM ck_device_wechat_login WHERE companyId='.$companyId.' GROUP BY deviceId) dwl_max', 'dwl_max.deviceId = d.id')
            ->join('device_wechat_login dwl', 'dwl.id = dwl_max.id')
            ->where(['d.companyId' => $companyId, 'd.deleteTime' => 0])
            ->column('dwl.wechatId');

        if (empty($wechatIds)) {
            return [];
        }

        // 获取所有好友的wechatId作为identifier
        $identifiers = Db::table('s2_wechat_friend')
            ->where('ownerWechatId', 'in', $wechatIds)
            ->where('isDeleted', 0)
            ->group('wechatId')
            ->column('wechatId');

        return $identifiers ?: [];
    }

    /**
     * 记录任务开始
     * @param string $jobId
     * @param string $queueLockKey
     */
    protected function logJobStart($jobId, $queueLockKey)
    {
        // 去除开始日志，减少日志空间消耗
    }

    /**
     * 处理任务成功
     * @param Job $job
     * @param string $queueLockKey
     */
    protected function handleJobSuccess($job, $queueLockKey)
    {
        $job->delete();
        Cache::rm($queueLockKey);
        // 去除成功日志，减少日志空间消耗
    }

    /**
     * 处理任务错误
     * @param \Exception $e
     * @param Job $job
     * @param string $queueLockKey
     * @return bool
     */
    protected function handleJobError(\Exception $e, $job, $queueLockKey)
    {
        Log::error('工作台消息群发任务异常：' . $e->getMessage());

        if (!empty($queueLockKey)) {
            Cache::rm($queueLockKey);
            Log::info("由于异常释放队列锁: {$queueLockKey}");
        }

        if ($job->attempts() > self::MAX_RETRY_ATTEMPTS) {
            $job->delete();
        } else {
            $job->release(Config::get('queue.failed_delay', 10));
        }

        return false;
    }

}