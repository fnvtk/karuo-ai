<?php

namespace app\command;

use think\console\Command;
use think\console\Input;
use think\console\Output;
use think\facade\Log;
use think\Queue;
use app\job\GroupFriendsJob;
use think\facade\Cache;

class GroupFriendsCommand extends Command
{
    protected function configure()
    {
        $this->setName('groupFriends:list')
            ->setDescription('获取微信群好友列表，并根据分页自动处理下一页');
    }

    protected function execute(Input $input, Output $output)
    {
        $output->writeln('开始处理微信群好友列表任务...');
        
        try {
            // 从缓存获取初始页码，缓存有效期一天
            $pageIndex = Cache::get('groupFriendsPage', 0);
            $output->writeln('从缓存获取页码：' . $pageIndex);
            
            $pageSize = 100; // 每页获取100条记录
            
            // 将任务添加到队列
            $this->addToQueue($pageIndex, $pageSize);
            
            $output->writeln('微信群好友列表任务已添加到队列');
        } catch (\Exception $e) {
            Log::error('微信群好友列表任务添加失败：' . $e->getMessage());
            $output->writeln('微信群好友列表任务添加失败：' . $e->getMessage());
            return false;
        }
        
        return true;
    }
    
    /**
     * 添加任务到队列
     * @param int $pageIndex 页码
     * @param int $pageSize 每页大小
     */
    protected function addToQueue($pageIndex, $pageSize)
    {
        $data = [
            'pageIndex' => $pageIndex,
            'pageSize' => $pageSize
        ];
        
        // 添加到队列，设置任务名为 group_friends
        Queue::push(GroupFriendsJob::class, $data, 'group_friends');
    }
} 