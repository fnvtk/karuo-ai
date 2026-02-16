<?php

namespace app\job;

use app\api\controller\WebSocketController;
use app\cunkebao\model\Workbench;
use app\cunkebao\model\WorkbenchGroupCreate;
use think\facade\Log;
use think\facade\Env;
use think\Db;
use think\queue\Job;
use think\facade\Cache;
use think\facade\Config;
use think\Queue;

/**
 * 工作台群创建重试任务
 * Class WorkbenchGroupCreateRetryJob
 * @package app\job
 */
class WorkbenchGroupCreateRetryJob
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
        $workbenchId = $data['workbenchId'] ?? 0;
        $wechatAccountId = $data['wechatAccountId'] ?? 0;
        $createTime = $data['createTime'] ?? 0;

        try {
            // 获取工作台和配置
            $workbench = Workbench::where('id', $workbenchId)->find();
            if (!$workbench) {
                Log::error("未找到工作台。工作台ID: {$workbenchId}");
                $job->delete();
                return false;
            }

            $config = WorkbenchGroupCreate::where('workbenchId', $workbench->id)->find();
            if (!$config) {
                Log::error("未找到工作台配置。工作台ID: {$workbenchId}");
                $job->delete();
                return false;
            }

            // 获取失败记录
            $failedItems = Db::name('workbench_group_create_item')
                ->where('workbenchId', $workbenchId)
                ->where('wechatAccountId', $wechatAccountId)
                ->where('createTime', '>=', $createTime - 10)
                ->where('createTime', '<=', $createTime + 10)
                ->where('status', 'in', [1, 3]) // 创建中或失败
                ->select();

            if (empty($failedItems)) {
                Log::info("未找到需要重试的记录。工作台ID: {$workbenchId}");
                $job->delete();
                return true;
            }

            // 解析配置
            $config['poolGroups'] = json_decode($config['poolGroups'], true);
            $config['devices'] = json_decode($config['devices'], true);
            $config['admins'] = json_decode($config['admins'] ?? '[]', true) ?: [];

            // 获取群主成员
            $groupMember = Db::name('device_wechat_login')->alias('dwl')
                ->join(['s2_wechat_account' => 'a'], 'dwl.wechatId = a.wechatId')
                ->whereIn('dwl.deviceId', $config['devices'])
                ->group('a.id')
                ->column('a.wechatId');

            $groupMemberWechatId = Db::table('s2_wechat_friend')
                ->where('ownerWechatId', $groupMember[0])
                ->whereIn('wechatId', $groupMember)
                ->column('id,wechatId');

            $groupMemberId = array_keys($groupMemberWechatId);

            // 获取管理员好友ID
            $adminFriendIds = [];
            if (!empty($config['admins'])) {
                $adminFriends = Db::table('s2_wechat_friend')
                    ->where('id', 'in', $config['admins'])
                    ->column('id,wechatId,ownerWechatId');
                
                $accountWechatId = Db::table('s2_wechat_account')->where('id', $wechatAccountId)->value('wechatId');
                foreach ($adminFriends as $adminFriend) {
                    if ($adminFriend['ownerWechatId'] == $accountWechatId) {
                        $adminFriendIds[] = $adminFriend['id'];
                    }
                }
            }

            // 初始化WebSocket
            $toAccountId = '';
            $username = Env::get('api.username2', '');
            $password = Env::get('api.password2', '');
            if (!empty($username) || !empty($password)) {
                $toAccountId = Db::name('users')->where('account', $username)->value('s2_accountId');
            }
            $webSocket = new WebSocketController(['userName' => $username, 'password' => $password, 'accountId' => $toAccountId]);

            // 重新创建群
            $createFriendIds = array_merge($adminFriendIds, $groupMemberId);
            
            if (count($createFriendIds) < 2) {
                Log::error("重试建群好友数量不足。工作台ID: {$workbenchId}");
                $job->delete();
                return false;
            }

            // 生成群名称
            $existingGroupCount = Db::name('workbench_group_create_item')
                ->where('workbenchId', $workbenchId)
                ->where('wechatAccountId', $wechatAccountId)
                ->where('status', 2) // 成功
                ->group('groupId')
                ->count();
            
            $chatroomName = $existingGroupCount > 0 
                ? $config['groupNameTemplate'] . ($existingGroupCount + 1) . '群'
                : $config['groupNameTemplate'];

            // 调用建群接口
            $createResult = $webSocket->CmdChatroomCreate([
                'chatroomName' => $chatroomName,
                'wechatFriendIds' => $createFriendIds,
                'wechatAccountId' => $wechatAccountId
            ]);

            // 更新记录状态为创建中
            Db::name('workbench_group_create_item')
                ->where('workbenchId', $workbenchId)
                ->where('wechatAccountId', $wechatAccountId)
                ->where('createTime', '>=', $createTime - 10)
                ->where('createTime', '<=', $createTime + 10)
                ->update([
                    'status' => 1, // 创建中
                    'createTime' => time() // 更新创建时间
                ]);

            // 创建新的轮询验证任务
            Queue::later(5, 'app\job\WorkbenchGroupCreateVerifyJob', [
                'workbenchId' => $workbenchId,
                'wechatAccountId' => $wechatAccountId,
                'createTime' => time(),
                'adminFriendIds' => $adminFriendIds,
                'poolUsers' => [], // 重试时暂时不传poolUsers，后续可以优化
            ], 'default');

            Log::info("重试建群任务已创建。工作台ID: {$workbenchId}, 微信账号ID: {$wechatAccountId}");
            
            $job->delete();
            return true;
        } catch (\Exception $e) {
            Log::error("重试建群任务异常：{$e->getMessage()}");

            if ($job->attempts() > self::MAX_RETRY_ATTEMPTS) {
                $job->delete();
            } else {
                $job->release(Config::get('queue.failed_delay', 10));
            }

            return false;
        }
    }
}

