<?php

namespace app\command;

use think\console\Command;
use think\console\Input;
use think\console\Output;
use think\console\input\Option;
use think\facade\Log;
use think\Queue;
use app\job\DeviceListJob;
use think\facade\Cache;

class DeviceListCommand extends Command
{
    // 队列名称
    protected $queueName = 'device_list';
    
    protected function configure()
    {
        $this->setName('device:list')
            ->setDescription('获取设备列表，并根据分页自动处理下一页')
            ->addOption('isDel', null, Option::VALUE_OPTIONAL, '删除状态: 0=未删除(unDeleted), 1=已删除(deleted), 2=已停用(deletedAndStop)', '')
            ->addOption('jobId', null, Option::VALUE_OPTIONAL, '任务ID，用于区分不同实例', date('YmdHis') . rand(1000, 9999));
    }

    protected function execute(Input $input, Output $output)
    {
        $output->writeln('开始处理设备列表任务...');
        
        try {
            // 获取是否删除参数和任务ID
            $isDel = $input->getOption('isDel');
            $jobId = $input->getOption('jobId');
            
            $output->writeln('删除状态参数: ' . ($isDel === '' ? '全部' : ($isDel == 0 ? '未删除' : ($isDel == 1 ? '已删除' : '已停用'))));
            $output->writeln('任务ID: ' . $jobId);
            
            // 检查队列是否已经在运行
            $queueLockKey = "queue_lock:{$this->queueName}:{$isDel}";
            if (Cache::get($queueLockKey)) {
                $output->writeln("队列 {$this->queueName} 已经在运行中，删除状态:{$isDel}，跳过执行");
                Log::warning("队列 {$this->queueName} 已经在运行中，删除状态:{$isDel}，跳过执行");
                return false;
            }
            
            // 设置队列运行锁，有效期1小时
            Cache::set($queueLockKey, $jobId, 3600);
            $output->writeln("已设置队列运行锁，键名:{$queueLockKey}，值:{$jobId}，有效期:1小时");
            
            // 为不同的删除状态和任务ID使用不同的缓存键名
            $cacheKeyPrefix = "devicePage:{$jobId}";
            $cacheKeySuffix = $isDel === '' ? '' : ":{$isDel}";
            $cacheKey = $cacheKeyPrefix . $cacheKeySuffix;
            
            // 从缓存获取初始页码，缓存有效期1天
            $pageIndex = Cache::get($cacheKey, 0);
            $output->writeln("从缓存获取页码: {$pageIndex}, 缓存键: {$cacheKey}");
            
            $pageSize = 100; // 每页获取100条记录
            
            // 将任务添加到队列
            $this->addToQueue($pageIndex, $pageSize, $isDel, $jobId, $cacheKey, $queueLockKey);
            
            $output->writeln('设备列表任务已添加到队列');
        } catch (\Exception $e) {
            Log::error('设备列表任务添加失败：' . $e->getMessage());
            $output->writeln('设备列表任务添加失败：' . $e->getMessage());
            return false;
        }
        
        return true;
    }
    
    /**
     * 添加任务到队列
     * @param int $pageIndex 页码
     * @param int $pageSize 每页大小
     * @param string $isDel 删除状态
     * @param string $jobId 任务ID
     * @param string $cacheKey 缓存键名
     * @param string $queueLockKey 队列锁键名
     */
    public function addToQueue($pageIndex, $pageSize, $isDel = '', $jobId = '', $cacheKey = '', $queueLockKey = '')
    {
        $data = [
            'pageIndex' => $pageIndex,
            'pageSize' => $pageSize,
            'isDel' => $isDel,
            'jobId' => $jobId,
            'cacheKey' => $cacheKey,
            'queueLockKey' => $queueLockKey
        ];
        
        // 添加到队列，设置任务名为 device_list
        Queue::push(DeviceListJob::class, $data, $this->queueName);
    }
}