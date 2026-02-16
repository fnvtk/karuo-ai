<?php

namespace app\job;

use think\queue\Job;
use think\facade\Log;
use think\Queue;
use think\facade\Config;
use app\api\controller\MessageController;

class MessageFriendsListJob
{
    /**
     * 最大同步页数
     */
    const MAX_SYNC_PAGES = 5;
    
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
            if ($this->processMessageFriendsList($data, $job->attempts())) {
                $job->delete();
                // 去除成功日志，减少日志空间消耗
            } else {
                if ($job->attempts() > 3) {
                    // 超过重试次数，删除任务
                    Log::error('好友消息列表任务执行失败，已超过重试次数，页码：' . $data['pageIndex']);
                    $job->delete();
                } else {
                    // 任务失败，重新放回队列
                    Log::warning('好友消息列表任务执行失败，重试次数：' . $job->attempts() . '，页码：' . $data['pageIndex']);
                    $job->release(Config::get('queue.failed_delay', 10));
                }
            }
        } catch (\Exception $e) {
            // 出现异常，记录日志
            Log::error('好友消息列表任务异常：' . $e->getMessage());
            if ($job->attempts() > 3) {
                $job->delete();
            } else {
                $job->release(Config::get('queue.failed_delay', 10));
            }
        }
    }
    
    /**
     * 处理好友消息列表获取
     * @param array $data 任务数据
     * @param int $attempts 重试次数
     * @return bool
     */
    protected function processMessageFriendsList($data, $attempts)
    {
        // 获取参数
        $pageIndex = isset($data['pageIndex']) ? $data['pageIndex'] : 0;
        $pageSize = isset($data['pageSize']) ? $data['pageSize'] : 100;
        
        // 去除开始日志，减少日志空间消耗
        
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
        $result = $messageController->getFriendsList($pageIndex,$pageSize,true);
        $response = json_decode($result,true);

        
        // 判断是否成功
        if ($response['code'] == 200) {
            $data = $response['data'];
            
            // 判断是否有下一页，且未超过最大同步页数
            if (!empty($data) && count($data) > 0) {
                $nextPageIndex = $pageIndex + 1;
                // 检查是否超过最大同步页数
                if ($nextPageIndex < self::MAX_SYNC_PAGES) {
                    // 有下一页且未超过最大页数，将下一页任务添加到队列
                    $this->addNextPageToQueue($nextPageIndex, $pageSize);
                    Log::info('添加下一页任务到队列，页码：' . $nextPageIndex);
                } else {
                    Log::info('已达到最大同步页数（' . self::MAX_SYNC_PAGES . '），停止添加下一页任务');
                }
            }
            
            return true;
        } else {
            $errorMsg = isset($response['msg']) ? $response['msg'] : '未知错误';
            Log::error('获取好友消息列表失败：' . $errorMsg);
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
        
        // 添加到队列，设置任务名为 message_friends_list
        Queue::push(self::class, $data, 'message_friends_list');
    }
} 