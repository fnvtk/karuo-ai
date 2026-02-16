<?php

namespace app\command;

use think\console\Command;
use think\console\Input;
use think\console\Output;
use think\facade\Log;
use think\Queue;
use app\job\AccountListJob;

class AccountListCommand extends Command
{
    protected function configure()
    {
        $this->setName('account:list')
            ->setDescription('获取公司账号列表，并根据分页自动处理下一页');
    }

    protected function execute(Input $input, Output $output)
    {
        $output->writeln('开始处理公司账号列表任务...');
        
        try {
            // 初始页码
            $pageIndex = 0;
            $pageSize = 100; // 每页获取100条记录
            
            // 将第一页任务添加到队列
            $this->addToQueue($pageIndex, $pageSize);
            
            $output->writeln('公司账号列表任务已添加到队列');
        } catch (\Exception $e) {
            Log::error('公司账号列表任务添加失败：' . $e->getMessage());
            $output->writeln('公司账号列表任务添加失败：' . $e->getMessage());
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
        
        // 添加到队列，设置任务名为 account_list
        Queue::push(AccountListJob::class, $data, 'account_list');
    }
} 