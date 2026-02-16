<?php
namespace app\command;

use think\console\Command;
use think\console\Input;
use think\console\Output;
use think\Queue;

class SyncContentCommand extends Command
{
    protected function configure()
    {
        $this->setName('content:sync')
             ->setDescription('同步内容库数据');
    }

    protected function execute(Input $input, Output $output)
    {
        // 将任务推送到队列
        $jobHandlerClassName = 'app\job\SyncContentJob';
        $jobData = [
            'time' => time(),
            'type' => 'sync_content'
        ];
        
        $isPushed = Queue::push($jobHandlerClassName, $jobData);
        
        if ($isPushed !== false) {
            $output->writeln("同步任务已推送到队列");
        } else {
            $output->writeln("同步任务推送失败");
        }
    }
} 