<?php

namespace app\job;

use app\command\WechatChatroomCommand;
use think\facade\Log;
use think\facade\Cache;
use think\Queue;
use app\api\controller\WechatChatroomController;

class WechatChatroomJob
{
    /**
     * 队列执行方法
     * @param $data 数据
     * @return array|bool
     */
    public function fire($job, $data)
    {
        try {
            // 获取数据
            $pageIndex = $data['pageIndex'];
            $pageSize = $data['pageSize'];
            $isDel = $data['isDel'];
            $jobId = isset($data['jobId']) ? $data['jobId'] : '';
            $cacheKey = isset($data['cacheKey']) ? $data['cacheKey'] : '';
            $queueLockKey = isset($data['queueLockKey']) ? $data['queueLockKey'] : '';
            
            // 记录日志
            Log::info('开始处理微信聊天室列表任务: ' . json_encode([
                'pageIndex' => $pageIndex,
                'pageSize' => $pageSize,
                'isDel' => $isDel,
                'jobId' => $jobId,
                'cacheKey' => $cacheKey,
                'queueLockKey' => $queueLockKey
            ]));
            
            // 如果没有提供缓存键，根据删除状态和任务ID生成一个
            if (empty($cacheKey)) {
                $cacheKeyPrefix = "chatroomPage:" . ($jobId ?: date('YmdHis') . rand(1000, 9999));
                $cacheKeySuffix = $isDel === '' ? '' : ":{$isDel}";
                $cacheKey = $cacheKeyPrefix . $cacheKeySuffix;
            }
            
            // 如果没有提供队列锁键，生成一个
            if (empty($queueLockKey)) {
                $queueLockKey = "queue_lock:wechat_chatroom:{$isDel}";
            }
            
            // 调用业务逻辑获取微信聊天室列表
            $logic = new WechatChatroomController();
            $result = $logic->getlist(['pageIndex' => $pageIndex, 'pageSize' => $pageSize],true, $isDel);
            $response = json_decode($result, true);
            $data = $response['data'];
             // 判断是否有下一页
             if (!empty($data) && count($data['results']) > 0 && empty($response['isUpdate'])) {
                $dataCount = count($data['results']);
                $totalCount = $data['total'];
                
                // 计算是否还有下一页
                $hasNextPage = ($pageIndex + 1) * $pageSize < $totalCount;
                
                if ($hasNextPage) {
                    // 缓存页码信息，设置有效期1天
                    $nextPageIndex = $pageIndex + 1;
                    Cache::set($cacheKey, $nextPageIndex, 600);
                    Log::info("更新缓存页码: {$nextPageIndex}, 缓存键: {$cacheKey}");
                    
                    // 添加下一页任务到队列
                    $command = new WechatChatroomCommand();
                    $command->addToQueue($nextPageIndex, $pageSize, $isDel, $jobId, $cacheKey, $queueLockKey);
                    Log::info("已添加下一页任务到队列: 页码 {$nextPageIndex}");
                } else {
                    // 处理完所有页面，重置页码并释放队列锁
                    Cache::set($cacheKey, 0, 600);
                    Cache::rm($queueLockKey);
                    Log::info("所有微信聊天室列表页面处理完毕，重置页码为0，释放队列锁: {$queueLockKey}");
                }
            } else {
                // API调用出错，记录错误并释放队列锁
                Log::error("微信聊天室列表获取失败: " . $response['msg']);
                Cache::rm($queueLockKey);
                Log::info("由于错误释放队列锁: {$queueLockKey}");
            }
            
            $job->delete();
            return true;
        } catch (\Exception $e) {
            // 出现异常，记录错误并释放队列锁
            Log::error('微信聊天室列表任务处理异常: ' . $e->getMessage());
            if (!empty($queueLockKey)) {
                Cache::rm($queueLockKey);
                Log::info("由于异常释放队列锁: {$queueLockKey}");
            }
            
            $job->delete();
            return false;
        }
    }
} 