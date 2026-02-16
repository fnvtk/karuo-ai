<?php

namespace app\job;

use app\command\AllotFriendCommand;
use think\facade\Log;
use think\facade\Cache;
use think\Queue;
use app\api\controller\AutomaticAssign;

class AllotFriendJob
{
    /**
     * 队列执行方法
     * @param $job 队列任务
     * @param $data 数据
     * @return bool
     */
    public function fire($job, $data)
    {
        try {
            // 获取数据
            $toAccountId = $data['toAccountId'];
            $wechatAccountKeyword = $data['wechatAccountKeyword'];
            $isDeleted = $data['isDeleted'];
            $jobId = isset($data['jobId']) ? $data['jobId'] : '';
            $queueLockKey = isset($data['queueLockKey']) ? $data['queueLockKey'] : '';
            
            // 记录日志
            Log::info('开始处理微信好友自动分配任务: ' . json_encode([
                'toAccountId' => $toAccountId,
                'wechatAccountKeyword' => $wechatAccountKeyword,
                'isDeleted' => $isDeleted,
                'jobId' => $jobId,
                'queueLockKey' => $queueLockKey
            ]));
            
            // 如果没有提供队列锁键，生成一个
            if (empty($queueLockKey)) {
                $queueLockKey = "queue_lock:allot_friends:{$wechatAccountKeyword}";
            }
            
            // 实例化控制器
            $automaticAssignController = new AutomaticAssign();
            
            // 调用微信好友自动分配方法
            $result = $automaticAssignController->autoAllotWechatFriend($toAccountId, $wechatAccountKeyword, $isDeleted);
            $response = json_decode($result, true);
            
            // 判断是否成功
            if ($response['code'] == 1) {
                Log::info("微信好友自动分配成功: toAccountId={$toAccountId}, wechatAccountKeyword={$wechatAccountKeyword}");
                
                // 释放队列锁
                Cache::rm($queueLockKey);
                Log::info("任务完成，释放队列锁: {$queueLockKey}");
                
                $job->delete();
                return true;
            } else {
                // API调用出错，记录错误
                $errorMsg = isset($response['msg']) ? $response['msg'] : '未知错误';
                Log::error("微信好友自动分配失败: {$errorMsg}");
                
                if ($job->attempts() > 3) {
                    // 超过重试次数，删除任务并释放队列锁
                    Cache::rm($queueLockKey);
                    Log::info("由于错误多次尝试失败，释放队列锁: {$queueLockKey}");
                    $job->delete();
                } else {
                    // 任务失败，重新放回队列
                    Log::warning("微信好友自动分配任务执行失败，重试次数: " . $job->attempts());
                    $job->release(10); // 延迟10秒后重试
                }
                
                return false;
            }
        } catch (\Exception $e) {
            // 出现异常，记录错误并释放队列锁
            Log::error('微信好友自动分配任务异常: ' . $e->getMessage());
            
            if (!empty($queueLockKey)) {
                Cache::rm($queueLockKey);
                Log::info("由于异常释放队列锁: {$queueLockKey}");
            }
            
            if ($job->attempts() > 3) {
                $job->delete();
            } else {
                $job->release(10);
            }
            
            return false;
        }
    }
} 