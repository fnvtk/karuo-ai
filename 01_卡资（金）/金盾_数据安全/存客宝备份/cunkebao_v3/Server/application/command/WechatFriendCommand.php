<?php

namespace app\command;

use think\console\Command;
use think\console\Input;
use think\console\Output;
use think\console\input\Option;
use think\facade\Log;
use think\Queue;
use app\job\WechatFriendJob;
use think\facade\Cache;

class WechatFriendCommand extends Command
{
    // 队列名称
    protected $queueName = 'wechat_friends';
    
    protected function configure()
    {
        $this->setName('wechatFriends:list')
            ->setDescription('获微信列表，并根据分页自动处理下一页')
            ->addOption('isDel', null, Option::VALUE_OPTIONAL, '删除状态: 0=未删除(false), 1=已删除(true)', '')
            ->addOption('jobId', null, Option::VALUE_OPTIONAL, '任务ID，用于区分不同实例', date('YmdHis') . rand(1000, 9999));
    }

    protected function execute(Input $input, Output $output)
    {
        $output->writeln('开始处理微信列表任务...');
        
        try {
            // 获取是否删除参数和任务ID
            $isDel = $input->getOption('isDel');
            $jobId = $input->getOption('jobId');
            
            $output->writeln('删除状态参数: ' . ($isDel === '' ? '全部' : ($isDel == 0 ? '未删除' : '已删除')));
            $output->writeln('任务ID: ' . $jobId);
            
            // 检查队列是否已经在运行
            $queueLockKey = "queue_lock:{$this->queueName}:{$isDel}";
            Cache::rm($queueLockKey);
            if (Cache::get($queueLockKey)) {
                $output->writeln("队列 {$this->queueName} 已经在运行中，删除状态:{$isDel}，跳过执行");
                Log::warning("队列 {$this->queueName} 已经在运行中，删除状态:{$isDel}，跳过执行");
                return false;
            }
            
            // 设置队列运行锁，有效期1小时
            Cache::set($queueLockKey, $jobId, 3600);
            $output->writeln("已设置队列运行锁，键名:{$queueLockKey}，值:{$jobId}，有效期:1小时");
            
            // 为不同的删除状态和任务ID使用不同的缓存键名
            $cacheKeyPrefix = "friendsPage:{$jobId}";
            $cacheKeySuffix = $isDel === '' ? '' : ":{$isDel}";
            $pageIndexCacheKey = $cacheKeyPrefix . $cacheKeySuffix;
            $preFriendIdCacheKey = "preFriendId:{$jobId}" . $cacheKeySuffix;
            
            // 从缓存获取初始页码和上次处理的好友ID
            $pageIndex = Cache::get($pageIndexCacheKey, 0);
            $preFriendId = Cache::get($preFriendIdCacheKey, '');
            
            $output->writeln("从缓存获取页码: {$pageIndex}, 上次处理的好友ID: {$preFriendId}");
            $output->writeln("缓存键: {$pageIndexCacheKey}, {$preFriendIdCacheKey}");
            
            $pageSize = 100; // 每页获取100条记录
            
            // 将任务添加到队列
            $this->addToQueue($pageIndex, $pageSize, $preFriendId, $isDel, $jobId, $pageIndexCacheKey, $preFriendIdCacheKey, $queueLockKey);
            
            $output->writeln('微信列表任务已添加到队列');
        } catch (\Exception $e) {
            Log::error('微信列表任务添加失败：' . $e->getMessage());
            $output->writeln('微信列表任务添加失败：' . $e->getMessage());
            return false;
        }
        
        return true;
    }
    
    /**
     * 添加任务到队列
     * @param int $pageIndex 页码
     * @param int $pageSize 每页大小
     * @param string $preFriendId 上一个好友ID
     * @param string $isDel 删除状态
     * @param string $jobId 任务ID
     * @param string $pageIndexCacheKey 页码缓存键名
     * @param string $preFriendIdCacheKey 好友ID缓存键名
     * @param string $queueLockKey 队列锁键名
     */
    public function addToQueue($pageIndex, $pageSize, $preFriendId = '', $isDel = '', $jobId = '', $pageIndexCacheKey = '', $preFriendIdCacheKey = '', $queueLockKey = '')
    {
        $data = [
            'pageIndex' => $pageIndex,
            'pageSize' => $pageSize,
            'preFriendId' => $preFriendId,
            'isDel' => $isDel,
            'jobId' => $jobId,
            'pageIndexCacheKey' => $pageIndexCacheKey,
            'preFriendIdCacheKey' => $preFriendIdCacheKey,
            'queueLockKey' => $queueLockKey
        ];
        
        // 添加到队列，设置任务名为 wechat_friends
        Queue::push(WechatFriendJob::class, $data, $this->queueName);
    }
}