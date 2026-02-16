<?php

namespace app\command;

use think\console\Command;
use think\console\Input;
use think\console\Output;
use think\console\input\Option;
use think\facade\Log;
use think\Queue;
use app\job\AllotChatroomJob;
use think\facade\Cache;

class AllotChatroomCommand extends Command
{
    // 队列名称
    protected $queueName = 'allot_chatroom';
    
    protected function configure()
    {
        $this->setName('allotChatroom:run')
            ->setDescription('自动分配微信群聊')
            ->addOption('toAccountId', null, Option::VALUE_REQUIRED, '目标账号ID')
            ->addOption('wechatAccountKeyword', null, Option::VALUE_REQUIRED, '微信账号关键字')
            ->addOption('isDeleted', null, Option::VALUE_OPTIONAL, '是否已删除状态: 0=未删除(false), 1=已删除(true)', 0)
            ->addOption('jobId', null, Option::VALUE_OPTIONAL, '任务ID，用于区分不同实例', date('YmdHis') . rand(1000, 9999));
    }

    protected function execute(Input $input, Output $output)
    {
        $output->writeln('开始处理微信群聊自动分配任务...');
        
        try {
            // 获取命令参数
            $toAccountId = $input->getOption('toAccountId');
            $wechatAccountKeyword = $input->getOption('wechatAccountKeyword');
            $isDeleted = $input->getOption('isDeleted');
            $jobId = $input->getOption('jobId');
            
            // 验证必填参数
            if (empty($toAccountId)) {
                $output->writeln('错误: 目标账号ID不能为空');
                return false;
            }
            
            if (empty($wechatAccountKeyword)) {
                $output->writeln('错误: 微信账号关键字不能为空');
                return false;
            }
            
            $output->writeln('目标账号ID: ' . $toAccountId);
            $output->writeln('微信账号关键字: ' . $wechatAccountKeyword);
            $output->writeln('删除状态: ' . ($isDeleted ? '已删除' : '未删除'));
            $output->writeln('任务ID: ' . $jobId);
            
            // 检查队列是否已经在运行
            $queueLockKey = "queue_lock:{$this->queueName}:{$wechatAccountKeyword}";
            if (Cache::get($queueLockKey)) {
                $output->writeln("队列 {$this->queueName} 已经在运行中，wechatAccountKeyword:{$wechatAccountKeyword}，跳过执行");
                Log::warning("队列 {$this->queueName} 已经在运行中，wechatAccountKeyword:{$wechatAccountKeyword}，跳过执行");
                return false;
            }
            
            // 设置队列运行锁，有效期1小时
            Cache::set($queueLockKey, $jobId, 3600);
            $output->writeln("已设置队列运行锁，键名:{$queueLockKey}，值:{$jobId}，有效期:1小时");
            
            // 将任务添加到队列
            $this->addToQueue($toAccountId, $wechatAccountKeyword, $isDeleted, $jobId, $queueLockKey);
            
            $output->writeln('微信群聊自动分配任务已添加到队列');
        } catch (\Exception $e) {
            Log::error('微信群聊自动分配任务添加失败：' . $e->getMessage());
            $output->writeln('微信群聊自动分配任务添加失败：' . $e->getMessage());
            return false;
        }
        
        return true;
    }
    
    /**
     * 添加任务到队列
     * @param string $toAccountId 目标账号ID
     * @param string $wechatAccountKeyword 微信账号关键字
     * @param bool $isDeleted 是否已删除状态
     * @param string $jobId 任务ID
     * @param string $queueLockKey 队列锁键名
     */
    public function addToQueue($toAccountId, $wechatAccountKeyword, $isDeleted = false, $jobId = '', $queueLockKey = '')
    {
        $data = [
            'toAccountId' => $toAccountId,
            'wechatAccountKeyword' => $wechatAccountKeyword,
            'isDeleted' => $isDeleted,
            'jobId' => $jobId,
            'queueLockKey' => $queueLockKey
        ];
        
        // 添加到队列
        Queue::push(AllotChatroomJob::class, $data, $this->queueName);
    }
} 