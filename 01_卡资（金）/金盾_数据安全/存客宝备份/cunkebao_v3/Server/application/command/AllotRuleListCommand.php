<?php

namespace app\command;

use think\console\Command;
use think\console\Input;
use think\console\Output;
use think\facade\Log;
use think\Queue;
use app\job\AllotRuleListJob;

class AllotRuleListCommand extends Command
{
    protected function configure()
    {
        $this->setName('allotrule:list')
            ->setDescription('获取分配规则列表，自动同步到数据库');
    }

    protected function execute(Input $input, Output $output)
    {
        $output->writeln('开始处理分配规则列表任务...');
        
        try {
            // 将任务添加到队列
            $this->addToQueue();
            
            $output->writeln('分配规则列表任务已添加到队列');
        } catch (\Exception $e) {
            Log::error('分配规则列表任务添加失败：' . $e->getMessage());
            $output->writeln('分配规则列表任务添加失败：' . $e->getMessage());
            return false;
        }
        
        return true;
    }
    
    /**
     * 添加任务到队列
     */
    protected function addToQueue()
    {
        $data = [
            'time' => time()
        ];
        
        // 添加到队列，设置任务名为 allotrule_list
        Queue::push(AllotRuleListJob::class, $data, 'allotrule_list');
    }
} 