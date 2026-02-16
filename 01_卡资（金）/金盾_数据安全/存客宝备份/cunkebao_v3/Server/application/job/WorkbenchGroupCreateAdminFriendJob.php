<?php

namespace app\job;

use app\api\controller\WebSocketController;
use think\facade\Log;
use think\facade\Env;
use think\Db;
use think\queue\Job;
use think\facade\Cache;
use think\facade\Config;

/**
 * 工作台群创建-拉管理员好友任务
 * Class WorkbenchGroupCreateAdminFriendJob
 * @package app\job
 */
class WorkbenchGroupCreateAdminFriendJob
{
    /**
     * 最大重试次数
     */
    const MAX_RETRY_ATTEMPTS = 3;

    /**
     * 成员类型常量
     */
    const MEMBER_TYPE_ADMIN_FRIEND = 4;

    /**
     * 状态常量
     */
    const STATUS_SUCCESS = 2;
    const STATUS_ADMIN_FRIEND_ADDED = 4;

    /**
     * 队列任务处理
     * @param Job $job 队列任务
     * @param array $data 任务数据
     * @return bool
     */
    public function fire(Job $job, $data)
    {
        $workbenchId = $data['workbenchId'] ?? 0;
        $wechatAccountId = $data['wechatAccountId'] ?? 0;
        $groupId = $data['groupId'] ?? 0;
        $chatroomId = $data['chatroomId'] ?? '';
        $adminFriendIds = $data['adminFriendIds'] ?? [];
        $poolUsers = $data['poolUsers'] ?? [];

        try {
            if (empty($adminFriendIds) || empty($poolUsers)) {
                Log::info("管理员好友或流量池用户为空，跳过。工作台ID: {$workbenchId}");
                $job->delete();
                return true;
            }

            // 获取管理员信息
            $adminFriends = Db::table('s2_wechat_friend')
                ->where('id', 'in', $adminFriendIds)
                ->column('id,wechatId,ownerWechatId');

            if (empty($adminFriends)) {
                Log::warning("未找到管理员好友信息。工作台ID: {$workbenchId}");
                $job->delete();
                return true;
            }

            // 获取微信账号信息
            $wechatAccount = Db::table('s2_wechat_account')->where('id', $wechatAccountId)->find();
            if (empty($wechatAccount)) {
                Log::error("未找到微信账号。微信账号ID: {$wechatAccountId}");
                $job->delete();
                return false;
            }

            // 从流量池用户中查找每个管理员的好友
            // 管理员的好友：从s2_wechat_friend表中查找，ownerWechatId=管理员的wechatId，且wechatId在流量池用户中
            $allAdminFriendIds = [];
            foreach ($adminFriends as $adminFriend) {
                $adminWechatId = $adminFriend['wechatId'];
                
                // 从好友表中查找该管理员的好友（在流量池用户中）
                $adminFriendsList = Db::table('s2_wechat_friend')
                    ->where('ownerWechatId', $adminWechatId)
                    ->whereIn('wechatId', $poolUsers)
                    ->column('id,wechatId');

                if (!empty($adminFriendsList)) {
                    $allAdminFriendIds = array_merge($allAdminFriendIds, array_keys($adminFriendsList));
                }
            }
            
            $allAdminFriendIds = array_unique($allAdminFriendIds);

            if (empty($allAdminFriendIds)) {
                Log::info("未找到管理员的好友，跳过拉人。工作台ID: {$workbenchId}");
                $job->delete();
                return true;
            }

            // 初始化WebSocket
            $toAccountId = '';
            $username = Env::get('api.username2', '');
            $password = Env::get('api.password2', '');
            if (!empty($username) || !empty($password)) {
                $toAccountId = Db::name('users')->where('account', $username)->value('s2_accountId');
            }
            $webSocket = new WebSocketController(['userName' => $username, 'password' => $password, 'accountId' => $toAccountId]);

            // 拉管理员好友进群
            $inviteResult = $webSocket->CmdChatroomInvite([
                'wechatChatroomId' => $groupId,
                'wechatFriendIds' => $allAdminFriendIds
            ]);

            // 记录管理员好友进群
            $installData = [];
            foreach ($allAdminFriendIds as $friendId) {
                $friendInfo = Db::table('s2_wechat_friend')->where('id', $friendId)->find();
                $installData[] = [
                    'workbenchId' => $workbenchId,
                    'friendId' => $friendId,
                    'wechatId' => $friendInfo['wechatId'] ?? '',
                    'groupId' => $groupId,
                    'wechatAccountId' => $wechatAccountId,
                    'status' => self::STATUS_ADMIN_FRIEND_ADDED,
                    'memberType' => self::MEMBER_TYPE_ADMIN_FRIEND,
                    'retryCount' => 0,
                    'chatroomId' => $chatroomId,
                    'createTime' => time(),
                ];
            }

            if (!empty($installData)) {
                Db::name('workbench_group_create_item')->insertAll($installData);
                Log::info("管理员好友已拉入群。工作台ID: {$workbenchId}, 群ID: {$groupId}, 好友数: " . count($installData));
            }

            $job->delete();
            return true;
        } catch (\Exception $e) {
            Log::error("拉管理员好友任务异常：{$e->getMessage()}");

            if ($job->attempts() > self::MAX_RETRY_ATTEMPTS) {
                $job->delete();
            } else {
                $job->release(Config::get('queue.failed_delay', 10));
            }

            return false;
        }
    }
}

