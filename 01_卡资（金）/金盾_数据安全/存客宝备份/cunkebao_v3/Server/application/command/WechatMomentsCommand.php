<?php

namespace app\command;

use think\console\Command;
use think\console\Input;
use think\console\Output;
use think\console\input\Option;
use think\facade\Log;
use think\Queue;
use app\job\WechatMomentsJob;
use think\facade\Cache;

class WechatMomentsCommand extends Command
{
    // 队列名称
    protected $queueName = 'wechat_moments';
    
    protected function configure()
    {
        $this->setName('wechatMoments:list')
            ->setDescription('获取朋友圈列表，并根据分页自动处理下一页')
            ->addOption('jobId', null, Option::VALUE_OPTIONAL, '任务ID，用于区分不同实例', date('YmdHis') . rand(1000, 9999));
    }

    protected function execute(Input $input, Output $output)
    {
        $output->writeln('开始处理朋友圈列表任务...');
        
        try {
            // 获取任务ID
            $jobId = $input->getOption('jobId');
            
            $output->writeln('任务ID: ' . $jobId);
            
            // 检查队列是否已经在运行
            $queueLockKey = "queue_lock:{$this->queueName}";
            if (Cache::get($queueLockKey)) {
                $output->writeln("队列 {$this->queueName} 已经在运行中，跳过执行");
                Log::warning("队列 {$this->queueName} 已经在运行中，跳过执行");
                return false;
            }
            
            // 设置队列运行锁，有效期1小时
            Cache::set($queueLockKey, $jobId, 3600);
            $output->writeln("已设置队列运行锁，键名:{$queueLockKey}，值:{$jobId}，有效期:1小时");
            
            // 为不同的任务ID使用不同的缓存键名
            $pageIndexCacheKey = "momentsPage:{$jobId}";
            $preMomentIdCacheKey = "preMomentId:{$jobId}";
            
            // 从缓存获取初始页码和上次处理的朋友圈ID
            $pageIndex = Cache::get($pageIndexCacheKey, 1);
            $preMomentId = Cache::get($preMomentIdCacheKey, '');
            
            $output->writeln("从缓存获取页码: {$pageIndex}, 上次处理的朋友圈ID: {$preMomentId}");
            $output->writeln("缓存键: {$pageIndexCacheKey}, {$preMomentIdCacheKey}");
            
            $pageSize = 100; // 每页获取100条记录
            
            // 将任务添加到队列
            $this->addToQueue($pageIndex, $pageSize, $preMomentId, $jobId, $pageIndexCacheKey, $preMomentIdCacheKey, $queueLockKey);
            
            $output->writeln('朋友圈列表任务已添加到队列');
        } catch (\Exception $e) {
            Log::error('朋友圈列表任务添加失败：' . $e->getMessage());
            $output->writeln('朋友圈列表任务添加失败：' . $e->getMessage());
            return false;
        }
        
        return true;
    }
    
    /**
     * 添加任务到队列
     * @param int $pageIndex 页码
     * @param int $pageSize 每页大小
     * @param string $preMomentId 上一个朋友圈ID
     * @param string $jobId 任务ID
     * @param string $pageIndexCacheKey 页码缓存键名
     * @param string $preMomentIdCacheKey 朋友圈ID缓存键名
     * @param string $queueLockKey 队列锁键名
     */
    public function addToQueue($pageIndex, $pageSize, $preMomentId = '', $jobId = '', $pageIndexCacheKey = '', $preMomentIdCacheKey = '', $queueLockKey = '')
    {
        $data = [
            'pageIndex' => $pageIndex,
            'pageSize' => $pageSize,
            'preMomentId' => $preMomentId,
            'jobId' => $jobId,
            'pageIndexCacheKey' => $pageIndexCacheKey,
            'preMomentIdCacheKey' => $preMomentIdCacheKey,
            'queueLockKey' => $queueLockKey
        ];
        
        // 添加到队列，设置任务名为 wechat_moments
        Queue::push(WechatMomentsJob::class, $data, $this->queueName);
    }
} 