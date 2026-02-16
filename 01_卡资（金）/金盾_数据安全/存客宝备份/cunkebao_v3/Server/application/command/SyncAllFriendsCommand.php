<?php
namespace app\command;

use think\console\Command;
use think\console\Input;
use think\console\Output;
use think\console\input\Option;
use think\facade\Log;
use think\Queue;
use app\job\SyncAllFriendsJob;
use think\facade\Cache;
use think\Db;

class SyncAllFriendsCommand extends Command
{
    protected $queueName = 'sync_all_friends';

    protected function configure()
    {
        $this->setName('sync:allFriends')
            ->setDescription('同步所有好友（自动分页队列）')
            ->addOption('jobId', null, Option::VALUE_OPTIONAL, '任务ID', date('YmdHis') . rand(1000, 9999));
    }

    protected function execute(Input $input, Output $output)
    {
        $output->writeln('开始同步所有好友...');
        try {
            $jobId = $input->getOption('jobId');
            $queueLockKey = "queue_lock:{$this->queueName}";
            Cache::rm($queueLockKey);
            if (Cache::get($queueLockKey)) {
                $output->writeln("队列 {$this->queueName} 已经在运行中，跳过执行");
                Log::warning("队列 {$this->queueName} 已经在运行中，跳过执行");
                return false;
            }
            Cache::set($queueLockKey, $jobId, 3600);
            $output->writeln("已设置队列运行锁，键名:{$queueLockKey}，值:{$jobId}，有效期:1小时");

            $pageSize = 1000;
            $accounts = Db::table('s2_wechat_account')->where('wechatAlive', 1)->select();
            foreach ($accounts as $account) {
                $this->addToQueue($account['wechatId'], 0, $pageSize, '', $jobId, $queueLockKey);
            }

            $output->writeln('同步所有好友任务已添加到队列');
        } catch (\Exception $e) {
            Log::error('同步所有好友任务添加失败：' . $e->getMessage());
            $output->writeln('同步所有好友任务添加失败：' . $e->getMessage());
            return false;
        }
        return true;
    }

    public function addToQueue($wechatId, $pageIndex, $pageSize, $preFriendId, $jobId, $queueLockKey)
    {
        $data = [
            'wechatId' => $wechatId,
            'pageIndex' => $pageIndex,
            'pageSize' => $pageSize,
            'preFriendId' => $preFriendId,
            'jobId' => $jobId,
            'queueLockKey' => $queueLockKey
        ];
        Queue::push(SyncAllFriendsJob::class, $data, $this->queueName);
    }
} 