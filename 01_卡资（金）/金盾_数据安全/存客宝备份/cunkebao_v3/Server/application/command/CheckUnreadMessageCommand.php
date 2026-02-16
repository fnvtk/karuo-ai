<?php

namespace app\command;

use app\common\service\FriendTransferService;
use think\console\Command;
use think\console\Input;
use think\console\Output;
use think\facade\Log;

/**
 * 检查未读/未回复消息并自动迁移好友命令
 * 
 * 功能：
 * 1. 检查消息未读超过30分钟的好友
 * 2. 检查消息未回复超过30分钟的好友
 * 3. 自动迁移这些好友到其他在线账号
 */
class CheckUnreadMessageCommand extends Command
{
    protected function configure()
    {
        $this->setName('check:unread-message')
            ->setDescription('检查未读/未回复消息并自动迁移好友')
            ->addOption('minutes', 'm', \think\console\input\Option::VALUE_OPTIONAL, '未读/未回复分钟数，默认10分钟', 10)
            ->addOption('page-size', 'p', \think\console\input\Option::VALUE_OPTIONAL, '每页处理数量，默认100条', 100);
    }

    protected function execute(Input $input, Output $output)
    {
        $minutes = intval($input->getOption('minutes'));
        if ($minutes <= 0) {
            $minutes = 10;
        }

        $pageSize = intval($input->getOption('page-size'));
        if ($pageSize <= 0) {
            $pageSize = 100;
        }

        $output->writeln("开始检查未读/未回复消息（超过{$minutes}分钟，每页处理{$pageSize}条）...");

        try {
            $friendTransferService = new FriendTransferService();
            $result = $friendTransferService->checkAndTransferUnreadOrUnrepliedFriends($minutes, $pageSize);

            $output->writeln("检查完成：");
            $output->writeln("  总计需要迁移的好友数：{$result['total']}");
            $output->writeln("  成功迁移的好友数：{$result['transferred']}");
            $output->writeln("  迁移失败的好友数：{$result['failed']}");

            if ($result['total'] > 0) {
                Log::info("未读/未回复消息检查完成：总计{$result['total']}，成功{$result['transferred']}，失败{$result['failed']}");
            }

        } catch (\Exception $e) {
            $errorMsg = "检查未读/未回复消息异常：" . $e->getMessage();
            $output->writeln("<error>{$errorMsg}</error>");
            Log::error($errorMsg);
        }
    }
}

