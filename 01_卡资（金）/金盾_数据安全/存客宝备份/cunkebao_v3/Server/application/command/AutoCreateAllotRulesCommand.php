<?php

namespace app\command;

use think\console\Command;
use think\console\Input;
use think\console\Output;
use think\facade\Log;
use think\Queue;
use app\job\AutoCreateAllotRulesJob;

class AutoCreateAllotRulesCommand extends Command
{
    protected function configure()
    {
        $this->setName('allotrule:autocreate')
            ->setDescription('自动创建微信分配规则');
    }

    protected function execute(Input $input, Output $output)
    {
        $output->writeln('开始处理自动创建分配规则任务...');
        
        try {
            // 将任务添加到队列
            $this->addToQueue();
            
            $output->writeln('自动创建分配规则任务已添加到队列');
        } catch (\Exception $e) {
            Log::error('自动创建分配规则任务添加失败：' . $e->getMessage());
            $output->writeln('自动创建分配规则任务添加失败：' . $e->getMessage());
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
        
        // 添加到队列，设置任务名为 autocreate_allotrule
        Queue::push(AutoCreateAllotRulesJob::class, $data, 'autocreate_allotrule');
    }
} 