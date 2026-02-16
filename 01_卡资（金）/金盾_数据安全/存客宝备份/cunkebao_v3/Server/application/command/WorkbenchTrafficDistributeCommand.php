<?php

namespace app\command;

use think\console\Command;
use think\console\Input;
use think\console\Output;
use think\console\input\Option;
use think\facade\Log;
use think\Queue;
use app\job\WorkbenchTrafficDistributeJob;
use think\facade\Cache;

class WorkbenchTrafficDistributeCommand extends Command
{
    protected $queueName = 'workbench_traffic_distribute';

    protected function configure()
    {
        $this->setName('workbench:trafficDistribute')
            ->setDescription('工作台流量分发任务队列')
            ->addOption('jobId', null, Option::VALUE_OPTIONAL, '任务ID', date('YmdHis') . rand(1000, 9999));
    }

    protected function execute(Input $input, Output $output)
    {
        $output->writeln('开始处理流量分发任务...');
        try {
            $jobId = $input->getOption('jobId');
            $output->writeln('任务ID: ' . $jobId);

            $queueLockKey = "queue_lock:{$this->queueName}";
            Cache::rm($queueLockKey);
            if (Cache::get($queueLockKey)) {
                $output->writeln("队列 {$this->queueName} 已经在运行中，跳过执行");
                Log::warning("队列 {$this->queueName} 已经在运行中，跳过执行");
                return false;
            }
            Cache::set($queueLockKey, $jobId, 3600);
            $output->writeln("已设置队列运行锁，键名:{$queueLockKey}，值:{$jobId}，有效期:1小时");

            $this->addToQueue($jobId, $queueLockKey);

            $output->writeln('流量分发任务已添加到队列');
        } catch (\Exception $e) {
            Log::error('流量分发任务添加失败：' . $e->getMessage());
            $output->writeln('流量分发任务添加失败：' . $e->getMessage());
            return false;
        }
        return true;
    }

    public function addToQueue($jobId = '', $queueLockKey = '')
    {
        $data = [
            'jobId' => $jobId,
            'queueLockKey' => $queueLockKey
        ];
        Queue::push(WorkbenchTrafficDistributeJob::class, $data, $this->queueName);
    }
} 