<?php

namespace app\command;

use think\console\Command;
use think\console\Input;
use think\console\Output;
use think\console\input\Option;
use think\facade\Log;
use think\Queue;
use app\job\WorkbenchAutoLikeJob;
use think\facade\Cache;

class WorkbenchAutoLikeCommand extends Command
{
    // 队列名称
    protected $queueName = 'workbench_auto_like';
    
    protected function configure()
    {
        $this->setName('workbench:autoLike')
            ->setDescription('工作台自动点赞任务队列')
            ->addOption('jobId', null, Option::VALUE_OPTIONAL, '任务ID，用于区分不同实例', date('YmdHis') . rand(1000, 9999));
    }

    protected function execute(Input $input, Output $output)
    {
        $output->writeln('开始处理工作台自动点赞任务...');
        
        try {
            // 获取任务ID
            $jobId = $input->getOption('jobId');
            
            $output->writeln('任务ID: ' . $jobId);
            
            // 检查队列是否已经在运行
            $queueLockKey = "queue_lock:{$this->queueName}";
            //Cache::rm($queueLockKey);
            if (Cache::get($queueLockKey)) {
                $output->writeln("队列 {$this->queueName} 已经在运行中，跳过执行");
                Log::warning("队列 {$this->queueName} 已经在运行中，跳过执行");
                return false;
            }
            
            // 设置队列运行锁，有效期1小时
            Cache::set($queueLockKey, $jobId, 3600);
            $output->writeln("已设置队列运行锁，键名:{$queueLockKey}，值:{$jobId}，有效期:1小时");
            
            // 将任务添加到队列
            $this->addToQueue($jobId, $queueLockKey);
            
            $output->writeln('工作台自动点赞任务已添加到队列');
        } catch (\Exception $e) {
            Log::error('工作台自动点赞任务添加失败：' . $e->getMessage());
            $output->writeln('工作台自动点赞任务添加失败：' . $e->getMessage());
            return false;
        }
        
        return true;
    }
    
    /**
     * 添加任务到队列
     * @param string $jobId 任务ID
     * @param string $queueLockKey 队列锁键名
     */
    public function addToQueue($jobId = '', $queueLockKey = '')
    {
        $data = [
            'jobId' => $jobId,
            'queueLockKey' => $queueLockKey
        ];
        
        // 添加到队列，设置任务名为 workbench_auto_like
        Queue::push(WorkbenchAutoLikeJob::class, $data, $this->queueName);
    }
} 