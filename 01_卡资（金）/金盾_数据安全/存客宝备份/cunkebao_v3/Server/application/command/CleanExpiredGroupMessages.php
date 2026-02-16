<?php
namespace app\command;

use think\console\Command;
use think\console\Input;
use think\console\Output;
use think\console\input\Option;
use think\Db;

class CleanExpiredGroupMessages extends Command
{
    protected function configure()
    {
        $this->setName('clean:expired_group_messages')
            ->setDescription('Clean expired group messages from the database')
            ->addOption('days', 'd', Option::VALUE_OPTIONAL, 'Number of days to keep messages (default: 90)', 90)
            ->addOption('dry-run', null, Option::VALUE_NONE, 'Perform a dry run without deleting any data')
            ->addOption('batch-size', 'b', Option::VALUE_OPTIONAL, 'Batch size for deletion (default: 1000)', 1000);
    }

    protected function execute(Input $input, Output $output)
    {
        $days = (int)$input->getOption('days');
        $dryRun = $input->getOption('dry-run');
        $batchSize = (int)$input->getOption('batch-size');

        if ($dryRun) {
            $output->writeln("<info>Running in dry-run mode. No data will be deleted.</info>");
        }

        $cutoffDate = date('Y-m-d H:i:s', strtotime("-{$days} days"));
        $output->writeln("<info>Cleaning group messages older than {$cutoffDate} (keeping last {$days} days)</info>");

        // 清理微信群组消息
        $this->cleanWechatGroupMessages($cutoffDate, $dryRun, $batchSize, $output);

        $output->writeln("<info>Group message cleanup completed successfully.</info>");
    }

    protected function cleanWechatGroupMessages($cutoffDate, $dryRun, $batchSize, Output $output)
    {   
        $output->writeln("\nCleaning s2_wechat_group_message table...");
        
        // 获取符合条件的消息总数
        $totalCount = Db::table('s2_wechat_group_message')
            ->where('createTime', '<', $cutoffDate)
            ->count();
            
        if ($totalCount === 0) {
            $output->writeln("  <comment>No expired group messages found.</comment>");
            return;
        }
        
        $output->writeln("  Found {$totalCount} group messages to clean up.");
        
        if ($dryRun) {
            $output->writeln("  <comment>Dry run mode: would delete {$totalCount} group messages.</comment>");
            return;
        }
        
        // 计算需要执行的批次数
        $batches = ceil($totalCount / $batchSize);
        $deletedCount = 0;
        
        $output->writeln("  Deleting in {$batches} batches of {$batchSize} records...");
        
        // 分批删除数据
        for ($i = 0; $i < $batches; $i++) {
            // 获取一批要删除的ID
            $ids = Db::table('s2_wechat_group_message')
                ->where('createTime', '<', $cutoffDate)
                ->limit($batchSize)
                ->column('id');
                
            if (empty($ids)) {
                break;
            }
            
            // 删除这批数据
            $count = Db::table('s2_wechat_group_message')
                ->whereIn('id', $ids)
                ->delete();
                
            $deletedCount += $count;
            $progress = round(($deletedCount / $totalCount) * 100, 2);
            $output->write("  Progress: {$progress}% ({$deletedCount}/{$totalCount})\r");
            
            // 短暂暂停，减轻数据库负担
            usleep(500000); // 暂停0.5秒
        }
        
        $output->writeln("");
        $output->writeln("  <info>Successfully deleted {$deletedCount} expired group messages.</info>");
        
        // 优化表
        $output->writeln("  Optimizing table...");
        Db::execute("OPTIMIZE TABLE s2_wechat_group_message");
        $output->writeln("  <info>Table optimization completed.</info>");
    }
}