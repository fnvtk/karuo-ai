<?php
namespace app\command;

use think\console\Command;
use think\console\Input;
use think\console\Output;
use think\Db;

class OptimizeMessageIndexes extends Command
{
    protected function configure()
    {
        $this->setName('optimize:message_indexes')
            ->setDescription('Optimize database indexes for message-related tables');
    }

    protected function execute(Input $input, Output $output)
    {
        $output->writeln("Starting index optimization for message-related tables...");

        // 优化 s2_wechat_message 表索引
        $this->optimizeWechatMessageIndexes($output);

        // 优化 s2_wechat_chatroom 表索引
        $this->optimizeWechatChatroomIndexes($output);

        // 优化 s2_wechat_friend 表索引
        $this->optimizeWechatFriendIndexes($output);

        $output->writeln("Index optimization completed successfully.");
    }

    protected function optimizeWechatMessageIndexes(Output $output)
    {
        $output->writeln("Optimizing s2_wechat_message table indexes...");

        // 检查并添加 wechatChatroomId 索引
        $this->addIndexIfNotExists('s2_wechat_message', 'idx_chatroom_id', 'wechatChatroomId', $output);

        // 检查并添加 wechatFriendId 索引
        $this->addIndexIfNotExists('s2_wechat_message', 'idx_friend_id', 'wechatFriendId', $output);

        // 检查并添加 isRead 索引
        $this->addIndexIfNotExists('s2_wechat_message', 'idx_is_read', 'isRead', $output);

        // 检查并添加 type 索引
        $this->addIndexIfNotExists('s2_wechat_message', 'idx_type', 'type', $output);

        // 检查并添加 createTime 索引
        $this->addIndexIfNotExists('s2_wechat_message', 'idx_create_time', 'createTime', $output);

        // 检查并添加组合索引 (wechatChatroomId, isRead)
        $this->addIndexIfNotExists('s2_wechat_message', 'idx_chatroom_read', 'wechatChatroomId,isRead', $output);

        // 检查并添加组合索引 (wechatFriendId, isRead)
        $this->addIndexIfNotExists('s2_wechat_message', 'idx_friend_read', 'wechatFriendId,isRead', $output);
    }

    protected function optimizeWechatChatroomIndexes(Output $output)
    {
        $output->writeln("Optimizing s2_wechat_chatroom table indexes...");

        // 检查并添加 accountId 索引
        $this->addIndexIfNotExists('s2_wechat_chatroom', 'idx_account_id', 'accountId', $output);

        // 检查并添加 isDeleted 索引
        $this->addIndexIfNotExists('s2_wechat_chatroom', 'idx_is_deleted', 'isDeleted', $output);

        // 检查并添加组合索引 (accountId, isDeleted)
        $this->addIndexIfNotExists('s2_wechat_chatroom', 'idx_account_deleted', 'accountId,isDeleted', $output);
    }

    protected function optimizeWechatFriendIndexes(Output $output)
    {
        $output->writeln("Optimizing s2_wechat_friend table indexes...");

        // 检查并添加 accountId 索引
        $this->addIndexIfNotExists('s2_wechat_friend', 'idx_account_id', 'accountId', $output);

        // 检查并添加 isDeleted 索引
        $this->addIndexIfNotExists('s2_wechat_friend', 'idx_is_deleted', 'isDeleted', $output);

        // 检查并添加组合索引 (accountId, isDeleted)
        $this->addIndexIfNotExists('s2_wechat_friend', 'idx_account_deleted', 'accountId,isDeleted', $output);
    }

    protected function addIndexIfNotExists($table, $indexName, $columns, Output $output)
    {
        try {
            // 检查索引是否已存在
            $indexExists = false;
            $indexes = Db::query("SHOW INDEX FROM {$table}");
            
            foreach ($indexes as $index) {
                if ($index['Key_name'] === $indexName) {
                    $indexExists = true;
                    break;
                }
            }

            if (!$indexExists) {
                // 添加索引
                Db::execute("ALTER TABLE {$table} ADD INDEX {$indexName} ({$columns})");
                $output->writeln("  - Added index {$indexName} on {$table}({$columns})");
            } else {
                $output->writeln("  - Index {$indexName} already exists on {$table}");
            }
        } catch (\Exception $e) {
            $output->writeln("  - Error adding index {$indexName} to {$table}: " . $e->getMessage());
        }
    }
}