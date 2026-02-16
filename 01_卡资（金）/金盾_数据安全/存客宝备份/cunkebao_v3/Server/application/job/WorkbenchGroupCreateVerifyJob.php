<?php

namespace app\job;

use app\api\controller\WechatChatroomController;
use think\facade\Log;
use think\Db;
use think\queue\Job;
use think\facade\Cache;
use think\facade\Config;
use think\Queue;

/**
 * 工作台群创建验证任务（轮询群创建状态）
 * Class WorkbenchGroupCreateVerifyJob
 * @package app\job
 */
class WorkbenchGroupCreateVerifyJob
{
    /**
     * 最大重试次数
     */
    const MAX_RETRY_ATTEMPTS = 15; // 最多轮询15次

    /**
     * 轮询间隔（秒）
     */
    const POLL_INTERVAL = 5;

    /**
     * 状态常量
     */
    const STATUS_CREATING = 1;
    const STATUS_SUCCESS = 2;
    const STATUS_FAILED = 3;

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
        $adminFriendIds = $data['adminFriendIds'] ?? [];
        $poolUsers = $data['poolUsers'] ?? [];

        try {
            $attempts = $job->attempts();
            
            // 查询待验证的群记录
            $groupItems = Db::name('workbench_group_create_item')
                ->where('workbenchId', $workbenchId)
                ->where('wechatAccountId', $wechatAccountId)
                ->where('status', self::STATUS_CREATING)
                ->where('createTime', '>=', $createTime - 10) // 允许10秒误差
                ->where('createTime', '<=', $createTime + 10)
                ->group('wechatAccountId')
                ->select();

            if (empty($groupItems)) {
                // 去除信息日志，减少日志空间消耗
                $job->delete();
                return true;
            }

            // 获取微信账号信息
            $wechatAccount = Db::table('s2_wechat_account')->where('id', $wechatAccountId)->find();
            if (empty($wechatAccount)) {
                Log::error("未找到微信账号，任务失败。微信账号ID: {$wechatAccountId}");
                $job->delete();
                return false;
            }

            // 调用接口查询群聊列表
            $chatroomController = new WechatChatroomController();
            $chatroomList = $chatroomController->getlist([
                'wechatAccountKeyword' => $wechatAccount['wechatId'],
                'pageIndex' => 0,
                'pageSize' => 100
            ], true);

            $chatroomListData = json_decode($chatroomList, true);
            
            if (empty($chatroomListData['data']['results'])) {
                // 如果超过最大重试次数，标记为失败并重试创建
                if ($attempts >= self::MAX_RETRY_ATTEMPTS) {
                    $this->handleCreateFailed($workbenchId, $wechatAccountId, $createTime, $job);
                    return false;
                }
                
                // 继续轮询
                $job->release(self::POLL_INTERVAL);
                return false;
            }

            // 查找符合条件的群（chatroomOwnerAvatar和chatroomOwnerNickname不为空）
            $successGroup = null;
            foreach ($chatroomListData['data']['results'] as $chatroom) {
                if (!empty($chatroom['chatroomOwnerAvatar']) && !empty($chatroom['chatroomOwnerNickname'])) {
                    // 检查创建时间是否匹配（允许30秒误差）
                    $chatroomCreateTime = isset($chatroom['createTime']) ? strtotime($chatroom['createTime']) : 0;
                    if (abs($chatroomCreateTime - $createTime) <= 30) {
                        $successGroup = $chatroom;
                        break;
                    }
                }
            }

            if ($successGroup) {
                // 群创建成功，更新记录状态
                $groupId = $successGroup['id'] ?? 0;
                $chatroomId = $successGroup['chatroomId'] ?? '';

                // 更新管理员和群主成员的记录状态
                Db::name('workbench_group_create_item')
                    ->where('workbenchId', $workbenchId)
                    ->where('wechatAccountId', $wechatAccountId)
                    ->where('status', self::STATUS_CREATING)
                    ->where('memberType', 'in', [1, 2]) // 群主成员和管理员
                    ->where('createTime', '>=', $createTime - 10)
                    ->where('createTime', '<=', $createTime + 10)
                    ->update([
                        'status' => self::STATUS_SUCCESS,
                        'groupId' => $groupId,
                        'chatroomId' => $chatroomId,
                        'verifyTime' => time()
                    ]);

                // 去除成功日志，减少日志空间消耗

                // 3. 拉群主好友进群（在验证成功后执行）
                $ownerFriendIds = $data['ownerFriendIds'] ?? [];
                if (!empty($ownerFriendIds)) {
                    Queue::push('app\job\WorkbenchGroupCreateOwnerFriendJob', [
                        'workbenchId' => $workbenchId,
                        'wechatAccountId' => $wechatAccountId,
                        'groupId' => $groupId,
                        'chatroomId' => $chatroomId,
                        'ownerFriendIds' => $ownerFriendIds,
                        'createTime' => $createTime
                    ], 'default');
                }

                // 5. 创建拉管理员好友的任务（在群主好友拉入后执行）
                if (!empty($adminFriendIds) && !empty($poolUsers)) {
                    Queue::push('app\job\WorkbenchGroupCreateAdminFriendJob', [
                        'workbenchId' => $workbenchId,
                        'wechatAccountId' => $wechatAccountId,
                        'groupId' => $groupId,
                        'chatroomId' => $chatroomId,
                        'adminFriendIds' => $adminFriendIds,
                        'poolUsers' => $poolUsers
                    ], 'default');
                }

                $job->delete();
                return true;
            } else {
                // 如果超过最大重试次数，标记为失败并重试创建
                if ($attempts >= self::MAX_RETRY_ATTEMPTS) {
                    $this->handleCreateFailed($workbenchId, $wechatAccountId, $createTime, $job);
                    return false;
                }

                // 继续轮询
                $job->release(self::POLL_INTERVAL);
                return false;
            }
        } catch (\Exception $e) {
            Log::error("群创建验证任务异常：{$e->getMessage()}");
            
            if ($job->attempts() >= self::MAX_RETRY_ATTEMPTS) {
                $job->delete();
            } else {
                $job->release(self::POLL_INTERVAL);
            }
            
            return false;
        }
    }

    /**
     * 处理创建失败的情况（重试创建）
     * @param int $workbenchId 工作台ID
     * @param int $wechatAccountId 微信账号ID
     * @param int $createTime 创建时间
     * @param Job $job 队列任务
     */
    protected function handleCreateFailed($workbenchId, $wechatAccountId, $createTime, $job)
    {
        // 更新状态为失败
        Db::name('workbench_group_create_item')
            ->where('workbenchId', $workbenchId)
            ->where('wechatAccountId', $wechatAccountId)
            ->where('status', self::STATUS_CREATING)
            ->where('createTime', '>=', $createTime - 10)
            ->where('createTime', '<=', $createTime + 10)
            ->update([
                'status' => self::STATUS_FAILED,
                'verifyTime' => time()
            ]);

        Log::warning("群创建失败，准备重试。工作台ID: {$workbenchId}, 微信账号ID: {$wechatAccountId}");

        // 检查重试次数
        $failedItems = Db::name('workbench_group_create_item')
            ->where('workbenchId', $workbenchId)
            ->where('wechatAccountId', $wechatAccountId)
            ->where('createTime', '>=', $createTime - 10)
            ->where('createTime', '<=', $createTime + 10)
            ->select();

        $maxRetryCount = 0;
        foreach ($failedItems as $item) {
            if ($item['retryCount'] >= 3) {
                Log::error("群创建重试次数已达上限，放弃重试。工作台ID: {$workbenchId}, 微信账号ID: {$wechatAccountId}");
                $job->delete();
                return;
            }
            $maxRetryCount = max($maxRetryCount, $item['retryCount']);
        }

        // 增加重试次数并重置状态
        Db::name('workbench_group_create_item')
            ->where('workbenchId', $workbenchId)
            ->where('wechatAccountId', $wechatAccountId)
            ->where('createTime', '>=', $createTime - 10)
            ->where('createTime', '<=', $createTime + 10)
            ->update([
                'status' => self::STATUS_CREATING,
                'retryCount' => Db::raw('retryCount + 1')
            ]);

        // 重新创建建群任务（延迟10秒）
        Queue::later(10, 'app\job\WorkbenchGroupCreateRetryJob', [
            'workbenchId' => $workbenchId,
            'wechatAccountId' => $wechatAccountId,
            'createTime' => $createTime
        ], 'default');

        $job->delete();
    }
}

