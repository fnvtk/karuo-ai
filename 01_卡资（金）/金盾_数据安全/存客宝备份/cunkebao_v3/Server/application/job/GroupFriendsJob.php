<?php

namespace app\job;

use think\queue\Job;
use think\facade\Log;
use think\Queue;
use think\facade\Config;
use think\facade\Cache;
use app\api\controller\WechatChatroomController;
use app\api\model\WechatChatroomModel;
use think\Db;

class GroupFriendsJob
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
            // 如果任务执行成功后删除任务
            if ($this->processGroupFriendsList($data, $job->attempts())) {
                $job->delete();
                Log::info('微信群好友列表任务执行成功，页码：' . $data['pageIndex']);
            } else {
                if ($job->attempts() > 3) {
                    // 超过重试次数，删除任务
                    Log::error('微信群好友列表任务执行失败，已超过重试次数，页码：' . $data['pageIndex']);
                    $job->delete();
                } else {
                    // 任务失败，重新放回队列
                    Log::warning('微信群好友列表任务执行失败，重试次数：' . $job->attempts() . '，页码：' . $data['pageIndex']);
                    $job->release(Config::get('queue.failed_delay', 10));
                }
            }
        } catch (\Exception $e) {
            // 出现异常，记录日志
            Log::error('微信群好友列表任务异常：' . $e->getMessage());
            if ($job->attempts() > 3) {
                $job->delete();
            } else {
                $job->release(Config::get('queue.failed_delay', 10));
            }
        }
    }
    
    /**
     * 处理微信群好友列表获取
     * @param array $data 任务数据
     * @param int $attempts 重试次数
     * @return bool
     */
    protected function processGroupFriendsList($data, $attempts)
    {
        // 获取参数
        $pageIndex = isset($data['pageIndex']) ? $data['pageIndex'] : 0;
        $pageSize = isset($data['pageSize']) ? $data['pageSize'] : 100;
        
        Log::info('开始获取微信群好友列表，页码：' . $pageIndex . '，页大小：' . $pageSize);
        
        try {
            // 从数据库获取未删除的群聊列表
            $chatrooms = WechatChatroomModel::where('isDeleted', 0)
                ->page($pageIndex + 1, $pageSize)
                ->order('id', 'desc')
                ->select();
            
            if (empty($chatrooms)) {
                Log::info('未找到需要处理的群聊数据，页码：' . $pageIndex);
                return true;
            }
            
            
            // 实例化控制器
            $wechatChatroomController = new WechatChatroomController();
            
            // 遍历每个群聊，获取其成员
            foreach ($chatrooms as $chatroom) {
                try {
                    // 调用获取群成员列表方法
                    $result = $wechatChatroomController->listChatroomMember($chatroom['id'],$chatroom['chatroomId'],true);
                    $response = is_string($result) ? json_decode($result, true) : $result;
                    
                    // 判断是否成功
                    if (is_array($response) && isset($response['code']) && $response['code'] == 200) {
                        //Log::info('成功获取群 ' . $chatroom['chatroomId'] . ' 的成员列表');
                    } else {
                        $errorMsg = isset($response['msg']) ? $response['msg'] : '未知错误';
                        Log::error('获取群 ' . $chatroom['chatroomId'] . ' 的成员列表失败：' . $errorMsg);
                    }
                } catch (\Exception $e) {
                    Log::error('获取群 ' . $chatroom['chatroomId'] . ' 的成员列表异常：' . $e->getMessage());
                }
                
            }
            
            //Log::info('群成员获取完成，成功：' . $successCount . '，失败：' . $failCount);
            
            // 计算总数量
            $totalCount = WechatChatroomModel::where('isDeleted', 0)->count();
            $processedCount = ($pageIndex + 1) * $pageSize;
            
            // 判断是否有下一页
            if ($processedCount < $totalCount) {
                // 更新缓存中的页码，设置一天过期
                Cache::set('groupFriendsPage', $pageIndex + 1, 600);
                //Log::info('更新缓存，下一页页码：' . ($pageIndex + 1) . '，缓存时间：1天');
                
                // 有下一页，将下一页任务添加到队列
                $nextPageIndex = $pageIndex + 1;
                $this->addNextPageToQueue($nextPageIndex, $pageSize);
                Log::info('添加下一页任务到队列，页码：' . $nextPageIndex);
            } else {
                // 没有下一页，重置缓存，设置一天过期
                Cache::set('groupFriendsPage', 0, 600);
                Log::info('获取完成，重置缓存，缓存时间：1天');
            }
            
            return true;
        } catch (\Exception $e) {
            Log::error('获取微信群好友列表处理失败：' . $e->getMessage());
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
        
        // 添加到队列，设置任务名为 group_friends
        Queue::push(self::class, $data, 'group_friends');
    }
} 