<?php

namespace app\job;

use think\queue\Job;
use think\facade\Log;
use think\Queue;
use think\facade\Config;
use app\api\controller\MessageController;

class MessageChatroomListJob
{
    /**
     * 最大同步页数（0表示不限制，同步所有页面）
     */
    const MAX_SYNC_PAGES = 0;
    
    /**
     * 队列任务处理
     * @param Job $job 队列任务
     * @param array $data 任务数据
     * @return void
     */
    public function fire(Job $job, $data)
    {
        try {
            // 如果任务执行成功后删除任务
            if ($this->processMessageChatroomList($data, $job->attempts())) {
                $job->delete();
                Log::info('微信群聊消息列表任务执行成功，页码：' . $data['pageIndex']);
            } else {
                if ($job->attempts() > 3) {
                    // 超过重试次数，删除任务
                    Log::error('微信群聊消息列表任务执行失败，已超过重试次数，页码：' . $data['pageIndex']);
                    $job->delete();
                } else {
                    // 任务失败，重新放回队列
                    Log::warning('微信群聊消息列表任务执行失败，重试次数：' . $job->attempts() . '，页码：' . $data['pageIndex']);
                    $job->release(Config::get('queue.failed_delay', 10));
                }
            }
        } catch (\Exception $e) {
            // 出现异常，记录日志
            Log::error('微信群聊消息列表任务异常：' . $e->getMessage());
            if ($job->attempts() > 3) {
                $job->delete();
            } else {
                $job->release(Config::get('queue.failed_delay', 10));
            }
        }
    }
    
    /**
     * 处理微信群聊消息列表获取
     * @param array $data 任务数据
     * @param int $attempts 重试次数
     * @return bool
     */
    protected function processMessageChatroomList($data, $attempts)
    {
        // 获取参数
        $pageIndex = isset($data['pageIndex']) ? $data['pageIndex'] : 0;
        $pageSize = isset($data['pageSize']) ? $data['pageSize'] : 100;
        
        Log::info('开始获取微信群聊消息列表，页码：' . $pageIndex . '，页大小：' . $pageSize);
        
        // 实例化控制器
        $messageController = new MessageController();
        
        // 构建请求参数
        $params = [
            'pageIndex' => $pageIndex,
            'pageSize' => $pageSize
        ];
        
        // 设置请求信息
        $request = request();
        $request->withGet($params);
        
        // 调用添加好友任务获取方法
        $result = $messageController->getChatroomList($pageIndex,$pageSize,true);
        $response = json_decode($result,true);
        
        // 确保 response 是数组格式
        if (!is_array($response)) {
            $response = [];
        }

        
        // 判断是否成功
        if (isset($response['code']) && $response['code'] == 200) {
            $data = isset($response['data']) ? $response['data'] : [];
            
            // 确保 data 是数组格式
            if (!is_array($data)) {
                $data = [];
            }
            
            // 获取 results 数组（实际的数据列表）
            $results = isset($data['results']) && is_array($data['results']) ? $data['results'] : [];
            $resultsCount = count($results);
            
            Log::info("获取到 {$resultsCount} 条群聊记录，页码：{$pageIndex}，页大小：{$pageSize}");
            
            // 判断是否有下一页
            // 1. 如果返回的数据量等于页大小，说明可能还有下一页
            // 2. 或者检查是否有 total 字段，通过计算判断是否有下一页
            $hasNextPage = false;
            
            if ($resultsCount > 0) {
                // 方法1: 如果返回的数据量等于页大小，可能还有下一页
                if ($resultsCount >= $pageSize) {
                    $hasNextPage = true;
                    Log::info("返回数据量（{$resultsCount}）等于或大于页大小（{$pageSize}），可能存在下一页");
                }
                
                // 方法2: 如果有 total 字段，通过计算判断
                if (isset($data['total']) && is_numeric($data['total'])) {
                    $total = intval($data['total']);
                    $currentPageEnd = ($pageIndex + 1) * $pageSize;
                    $hasNextPage = ($currentPageEnd < $total);
                    Log::info("根据 total（{$total}）计算，当前页结束位置：{$currentPageEnd}，是否有下一页：" . ($hasNextPage ? '是' : '否'));
                }
            }
            
            // 如果有下一页，且未超过最大同步页数，添加下一页任务
            if ($hasNextPage) {
                $nextPageIndex = $pageIndex + 1;
                
                // 检查是否超过最大同步页数（0表示不限制）
                if (self::MAX_SYNC_PAGES == 0 || $nextPageIndex < self::MAX_SYNC_PAGES) {
                    $this->addNextPageToQueue($nextPageIndex, $pageSize);
                    Log::info("添加下一页任务到队列，页码：{$nextPageIndex}");
                } else {
                    Log::info("已达到最大同步页数（" . self::MAX_SYNC_PAGES . "），停止添加下一页任务");
                }
            } else {
                Log::info("没有更多页面需要同步，页码：{$pageIndex}，返回数据量：{$resultsCount}");
            }
            
            return true;
        } else {
            $errorMsg = isset($response['msg']) ? $response['msg'] : '未知错误';
            Log::error('获取微信群聊消息列表失败：' . $errorMsg);
            return false;
        }
    }
    
    /**
     * 添加下一页任务到队列
     * @param int $pageIndex 页码
     * @param int $pageSize 每页大小
     */
    protected function addNextPageToQueue($pageIndex, $pageSize)
    {
        $data = [
            'pageIndex' => $pageIndex,
            'pageSize' => $pageSize
        ];
        
        // 添加到队列，设置任务名为 message_chatroom_list
        Queue::push(self::class, $data, 'message_chatroom_list');
    }
} 