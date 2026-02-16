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
 * 工作台群创建-拉群主好友任务
 * Class WorkbenchGroupCreateOwnerFriendJob
 * @package app\job
 */
class WorkbenchGroupCreateOwnerFriendJob
{
    /**
     * 最大重试次数
     */
    const MAX_RETRY_ATTEMPTS = 3;

    /**
     * 成员类型常量
     */
    const MEMBER_TYPE_OWNER_FRIEND = 3;

    /**
     * 状态常量
     */
    const STATUS_SUCCESS = 2;

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
        $ownerFriendIds = $data['ownerFriendIds'] ?? [];
        $createTime = $data['createTime'] ?? 0;

        try {
            if (empty($ownerFriendIds) || empty($groupId)) {
                Log::info("群主好友或群ID为空，跳过。工作台ID: {$workbenchId}");
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

            // 拉群主好友进群
            $inviteResult = $webSocket->CmdChatroomInvite([
                'wechatChatroomId' => $groupId,
                'wechatFriendIds' => $ownerFriendIds
            ]);

            // 获取好友微信ID映射
            $friendWechatIds = Db::table('s2_wechat_friend')
                ->where('id', 'in', $ownerFriendIds)
                ->column('id,wechatId');

            // 更新群主好友记录状态
            Db::name('workbench_group_create_item')
                ->where('workbenchId', $workbenchId)
                ->where('wechatAccountId', $wechatAccountId)
                ->where('status', 1) // 创建中
                ->where('memberType', self::MEMBER_TYPE_OWNER_FRIEND)
                ->where('createTime', '>=', $createTime - 10)
                ->where('createTime', '<=', $createTime + 10)
                ->update([
                    'status' => self::STATUS_SUCCESS,
                    'groupId' => $groupId,
                    'chatroomId' => $chatroomId,
                    'verifyTime' => time()
                ]);

            Log::info("群主好友已拉入群。工作台ID: {$workbenchId}, 群ID: {$groupId}, 好友数: " . count($ownerFriendIds));

            $job->delete();
            return true;
        } catch (\Exception $e) {
            Log::error("拉群主好友任务异常：{$e->getMessage()}");

            if ($job->attempts() > self::MAX_RETRY_ATTEMPTS) {
                $job->delete();
            } else {
                $job->release(Config::get('queue.failed_delay', 10));
            }

            return false;
        }
    }
}

