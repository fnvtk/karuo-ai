<?php

namespace app\command;

use think\console\Command;
use think\console\Input;
use think\console\Output;
use think\facade\Log;
use think\Queue;
use app\job\OwnMomentsCollectJob;

class OwnMomentsCollectCommand extends Command
{
    protected function configure()
    {
        $this->setName('own:moments:collect')
            ->setDescription('采集在线微信账号自己的朋友圈');
    }

    protected function execute(Input $input, Output $output)
    {
        $output->writeln('开始处理自己朋友圈采集任务...');
        
        try {
            // 将任务添加到队列
            $this->addToQueue();
            
            $output->writeln('自己朋友圈采集任务已添加到队列');
        } catch (\Exception $e) {
            Log::error('自己朋友圈采集任务添加失败：' . $e->getMessage());
            $output->writeln('自己朋友圈采集任务添加失败：' . $e->getMessage());
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
            'timestamp' => time()
        ];
        
        // 添加到队列，设置任务名为 own_moments_collect
        Queue::push(OwnMomentsCollectJob::class, $data, 'own_moments_collect');
    }
}

