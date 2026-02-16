<?php

namespace app\command;

use think\console\Command;
use think\console\Input;
use think\console\Output;
use think\facade\Log;
use think\Queue;
use app\job\ContentCollectJob;

class ContentCollectCommand extends Command
{
    protected function configure()
    {
        $this->setName('content:collect')
            ->setDescription('执行内容采集任务');
    }

    protected function execute(Input $input, Output $output)
    {
        $output->writeln('开始处理内容采集任务...');
        
        try {
            // 将任务添加到队列
            $this->addToQueue();
            
            $output->writeln('内容采集任务已添加到队列');
        } catch (\Exception $e) {
            Log::error('内容采集任务添加失败：' . $e->getMessage());
            $output->writeln('内容采集任务添加失败：' . $e->getMessage());
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
            'libraryId' => 0, // 0表示采集所有内容库
            'timestamp' => time()
        ];
        
        // 添加到队列，设置任务名为 content_collect
        Queue::push(ContentCollectJob::class, $data, 'content_collect');
    }
} 