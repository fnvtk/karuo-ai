<?php
namespace app\job;

use think\queue\Job;
use think\facade\Log;
use think\facade\Cache;
use think\facade\Config;
use think\Db;

class SyncAllFriendsJob
{
    public function fire(Job $job, $data)
    {
        try {
            $wechatId = 'Lytiao1';
            $pageIndex = $data['pageIndex'];
            $pageSize = $data['pageSize'];
            $preFriendId = isset($data['preFriendId']) ? $data['preFriendId'] : '';
            $queueLockKey = $data['queueLockKey'];
            $jobId = $data['jobId'];

            $controller = new \app\api\controller\WechatFriendController();
            Log::info('开始同步微信id: ' . $wechatId . '，第' . $pageIndex . '页，preFriendId: ' . $preFriendId);
            $result = $controller->getlist([
                'wechatAccountKeyword' => $wechatId,
                'pageIndex' => $pageIndex,
                'pageSize' => $pageSize,
                'preFriendId' => $preFriendId
            ], true);

            if (is_string($result)) {
                $result = json_decode($result, true);
            }

            if ($result['code'] == 200) {
                $friends = $result['data']['list'] ?? $result['data'];
                if (is_array($friends) && count($friends) == $pageSize) {
                    $lastFriendId = $friends[count($friends) - 1]['id'];
                    // 还有下一页，重新入队
                    $nextPageIndex = $pageIndex + 1;
                    \think\Queue::push(self::class, [
                        'wechatId' => $wechatId,
                        'pageIndex' => $nextPageIndex,
                        'pageSize' => $pageSize,
                        'preFriendId' => $lastFriendId,
                        'jobId' => $jobId,
                        'queueLockKey' => $queueLockKey
                    ], $job->getQueue());
                    Log::info("微信id: {$wechatId} 下一页任务已入队，pageIndex: {$nextPageIndex}，preFriendId: {$lastFriendId}");
                }
            }

            $job->delete();
            Log::info('同步微信id: ' . $wechatId . ' 第' . $pageIndex . '页任务执行成功');
            // 释放锁逻辑可在所有账号所有分页都完成后处理
            return true;
        } catch (\Exception $e) {
            Log::error('同步所有好友任务异常：' . $e->getMessage());
            if (!empty($data['queueLockKey'])) {
                \think\facade\Cache::rm($data['queueLockKey']);
            }
            if ($job->attempts() > 3) {
                $job->delete();
            } else {
                $job->release(\think\facade\Config::get('queue.failed_delay', 10));
            }
            return false;
        }
    }
} 