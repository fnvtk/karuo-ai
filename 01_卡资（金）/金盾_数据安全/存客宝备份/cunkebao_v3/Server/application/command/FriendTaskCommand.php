<?php

namespace app\command;

use think\console\Command;
use think\console\Input;
use think\console\Output;
use think\facade\Log;
use think\Queue;
use app\job\FriendTaskJob;
use think\facade\Cache;

class FriendTaskCommand extends Command
{
    protected function configure()
    {
        $this->setName('friend:task')
            ->setDescription('获取添加好友认为列表，并根据分页自动处理下一页');
    }

    protected function execute(Input $input, Output $output)
    {
        $output->writeln('开始处理添加好友任务...');
        
        try {
            // 从缓存获取初始页码，缓存10分钟有效
            $pageIndex = Cache::get('friendTaskPage', 0);
            $output->writeln('从缓存获取页码：' . $pageIndex);
            
            $pageSize = 1000; // 每页获取1000条记录
            
            // 将任务添加到队列
            $this->addToQueue($pageIndex, $pageSize);
            
            $output->writeln('添加好友任务已添加到队列');
        } catch (\Exception $e) {
            Log::error('添加好友任务添加失败：' . $e->getMessage());
            $output->writeln('添加好友任务添加失败：' . $e->getMessage());
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
        
        // 添加到队列，设置任务名为 friend_task
        Queue::push(FriendTaskJob::class, $data, 'friend_task');
    }
} 