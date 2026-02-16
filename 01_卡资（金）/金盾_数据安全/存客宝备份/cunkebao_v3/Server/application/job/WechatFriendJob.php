<?php

namespace app\job;

use app\command\WechatFriendCommand;
use think\queue\Job;
use think\facade\Log;
use think\Queue;
use think\facade\Config;
use think\facade\Cache;
use app\api\controller\WechatFriendController;

class WechatFriendJob
{
    /**
     * 队列任务处理
     * @param Job $job 队列任务
     * @param array $data 任务数据
     * @return void
     */
    public function fire(Job $job, $data)
    {
        try {
            // 获取数据
            $pageIndex = $data['pageIndex'];
            $pageSize = $data['pageSize'];
            $preFriendId = $data['preFriendId'];
            $isDel = $data['isDel'];
            $jobId = isset($data['jobId']) ? $data['jobId'] : '';
            $pageIndexCacheKey = isset($data['pageIndexCacheKey']) ? $data['pageIndexCacheKey'] : '';
            $preFriendIdCacheKey = isset($data['preFriendIdCacheKey']) ? $data['preFriendIdCacheKey'] : '';
            $queueLockKey = isset($data['queueLockKey']) ? $data['queueLockKey'] : '';
            
            // 记录日志
            Log::info('开始处理微信好友列表任务: ' . json_encode([
                'pageIndex' => $pageIndex,
                'pageSize' => $pageSize,
                'preFriendId' => $preFriendId,
                'isDel' => $isDel,
                'jobId' => $jobId,
                'pageIndexCacheKey' => $pageIndexCacheKey,
                'preFriendIdCacheKey' => $preFriendIdCacheKey,
                'queueLockKey' => $queueLockKey
            ]));
            
            // 如果没有提供缓存键，根据删除状态和任务ID生成
            if (empty($pageIndexCacheKey)) {
                $cacheKeyPrefix = "friendsPage:" . ($jobId ?: date('YmdHis') . rand(1000, 9999));
                $cacheKeySuffix = $isDel === '' ? '' : ":{$isDel}";
                $pageIndexCacheKey = $cacheKeyPrefix . $cacheKeySuffix;
            }
            
            if (empty($preFriendIdCacheKey)) {
                $cacheKeyPrefix = "preFriendId:" . ($jobId ?: date('YmdHis') . rand(1000, 9999));
                $cacheKeySuffix = $isDel === '' ? '' : ":{$isDel}";
                $preFriendIdCacheKey = $cacheKeyPrefix . $cacheKeySuffix;
            }
            
            // 如果没有提供队列锁键，生成一个
            if (empty($queueLockKey)) {
                $queueLockKey = "queue_lock:wechat_friends:{$isDel}";
            }
            
            // 实例化控制器
            $wechatFriendController = new WechatFriendController();
            
            // 设置请求信息
            $request = request();
            $request->withGet([
                'pageIndex' => $pageIndex,
                'pageSize' => $pageSize,
                'preFriendId' => $preFriendId
            ]);
            
            // 调用微信好友列表获取方法，传入isDel参数
            $result = $wechatFriendController->getlist([
                'pageIndex' => $pageIndex,
                'pageSize' => $pageSize,
                'preFriendId' => $preFriendId,
            ], true, $isDel);
            $response = json_decode($result, true);

            // 判断是否成功
            if ($response['code'] == 200) {
                $data = $response['data'];
                
                // 判断是否有下一页
                if (!empty($data) && count($data) > 0 && empty($response['isUpdate'])) {
                    // 获取最后一条记录的ID
                    $lastFriendId = $data[count($data)-1]['id'];
                    
                    // 更新缓存中的页码和最后一个好友ID，设置1天过期
                    $nextPageIndex = $pageIndex + 1;
                    Cache::set($pageIndexCacheKey, $nextPageIndex, 600);
                    Cache::set($preFriendIdCacheKey, $lastFriendId, 600);
                    
                    Log::info("更新缓存，下一页页码：{$nextPageIndex}，最后好友ID：{$lastFriendId}，缓存键: {$pageIndexCacheKey}, {$preFriendIdCacheKey}");
                    
                    // 有下一页，将下一页任务添加到队列
                    $command = new WechatFriendCommand();
                    $command->addToQueue($nextPageIndex, $pageSize, $lastFriendId, $isDel, $jobId, $pageIndexCacheKey, $preFriendIdCacheKey, $queueLockKey);
                    Log::info("已添加下一页任务到队列: 页码 {$nextPageIndex}");
                } else {
                    // 没有下一页，重置缓存并释放队列锁
                    Cache::set($pageIndexCacheKey, 0, 600);
                    Cache::set($preFriendIdCacheKey, '', 600);
                    Cache::rm($queueLockKey);
                    Log::info("所有微信好友列表页面处理完毕，重置页码为0，释放队列锁: {$queueLockKey}");
                }
                
                $job->delete();
                Log::info('微信好友列表任务执行成功，页码：' . $pageIndex . '，删除状态：' . $this->getDeleteStatusText($isDel));
                return true;
            } else {
                // API调用出错，记录错误
                $errorMsg = isset($response['msg']) ? $response['msg'] : '未知错误';
                Log::error('获取微信好友列表失败：' . $errorMsg);
                
                if ($job->attempts() > 3) {
                    // 超过重试次数，删除任务并释放队列锁
                    Cache::rm($queueLockKey);
                    Log::info("由于错误释放队列锁: {$queueLockKey}");
                    $job->delete();
                } else {
                    // 任务失败，重新放回队列
                    Log::warning('微信好友列表任务执行失败，重试次数：' . $job->attempts() . '，页码：' . $pageIndex);
                    $job->release(Config::get('queue.failed_delay', 10));
                }
                
                return false;
            }
        } catch (\Exception $e) {
            // 出现异常，记录错误并释放队列锁
            Log::error('微信好友列表任务异常：' . $e->getMessage());
            
            if (!empty($queueLockKey)) {
                Cache::rm($queueLockKey);
                Log::info("由于异常释放队列锁: {$queueLockKey}");
            }
            
            if ($job->attempts() > 3) {
                $job->delete();
            } else {
                $job->release(Config::get('queue.failed_delay', 10));
            }
            
            return false;
        }
    }
    
    /**
     * 获取删除状态的文本描述
     * @param string $isDel 删除状态
     * @return string 状态文本描述
     */
    protected function getDeleteStatusText($isDel)
    {
        switch ($isDel) {
            case '0':
            case 0:
                return '未删除(false)';
            case '1':
            case 1:
                return '已删除(true)';
            default:
                return '全部';
        }
    }
}