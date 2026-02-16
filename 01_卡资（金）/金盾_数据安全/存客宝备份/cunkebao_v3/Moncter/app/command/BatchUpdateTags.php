<?php

namespace app\command;

use app\repository\TagDefinitionRepository;
use app\repository\UserProfileRepository;
use app\service\TagService;
use app\repository\UserTagRepository;
use app\repository\TagHistoryRepository;
use app\service\TagRuleEngine\SimpleRuleEngine;
use app\utils\LoggerHelper;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;

/**
 * 批量更新标签命令
 *
 * 用于定时批量更新非实时标签（daily/weekly/monthly）
 * 
 * 使用方式：
 * php start.php batch-update-tags [--frequency=daily|weekly|monthly] [--limit=1000]
 */
class BatchUpdateTags extends Command
{
    protected static $defaultName = 'batch-update-tags';
    protected static $defaultDescription = '批量更新标签（定时任务）';

    protected function configure(): void
    {
        $this->addOption(
            'frequency',
            'f',
            InputOption::VALUE_OPTIONAL,
            '更新频率：daily/weekly/monthly',
            'daily'
        );
        
        $this->addOption(
            'limit',
            'l',
            InputOption::VALUE_OPTIONAL,
            '每次处理的最大用户数',
            1000
        );
        
        $this->addOption(
            'user-ids',
            'u',
            InputOption::VALUE_OPTIONAL,
            '指定用户ID列表（逗号分隔），如果提供则只更新这些用户',
            null
        );
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $frequency = $input->getOption('frequency');
        $limit = (int)$input->getOption('limit');
        $userIdsOption = $input->getOption('user-ids');
        
        $output->writeln("开始批量更新标签...");
        $output->writeln("更新频率: {$frequency}");
        $output->writeln("处理限制: {$limit}");
        
        try {
            // 获取需要更新的标签定义
            $tagDefinitionRepo = new TagDefinitionRepository();
            $tagDefinitions = $tagDefinitionRepo->newQuery()
                ->where('status', 0) // 只获取启用的标签
                ->where('update_frequency', $frequency) // 匹配更新频率
                ->get();
            
            if ($tagDefinitions->isEmpty()) {
                $output->writeln("没有找到需要更新的标签定义（频率: {$frequency}）");
                return Command::SUCCESS;
            }
            
            $tagIds = $tagDefinitions->pluck('tag_id')->toArray();
            $output->writeln("找到 " . count($tagIds) . " 个标签需要更新");
            
            // 获取需要更新的用户列表
            $userProfileRepo = new UserProfileRepository();
            if ($userIdsOption !== null) {
                // 指定用户ID列表
                $userIds = array_filter(array_map('trim', explode(',', $userIdsOption)));
            } else {
                // 获取所有有效用户（限制数量）
                $users = $userProfileRepo->newQuery()
                    ->where('status', 0)
                    ->limit($limit)
                    ->get();
                $userIds = $users->pluck('user_id')->toArray();
            }
            
            if (empty($userIds)) {
                $output->writeln("没有找到需要更新的用户");
                return Command::SUCCESS;
            }
            
            $output->writeln("找到 " . count($userIds) . " 个用户需要更新");
            
            // 创建 TagService 实例
            $tagService = new TagService(
                new TagDefinitionRepository(),
                new UserProfileRepository(),
                new UserTagRepository(),
                new TagHistoryRepository(),
                new SimpleRuleEngine()
            );
            
            // 批量更新标签
            $successCount = 0;
            $errorCount = 0;
            $startTime = microtime(true);
            
            foreach ($userIds as $index => $userId) {
                try {
                    $tagService->calculateTags($userId, $tagIds);
                    $successCount++;
                    
                    if (($index + 1) % 100 === 0) {
                        $output->writeln("已处理: " . ($index + 1) . " / " . count($userIds));
                    }
                } catch (\Throwable $e) {
                    $errorCount++;
                    LoggerHelper::logError($e, [
                        'component' => 'BatchUpdateTags',
                        'user_id' => $userId,
                        'frequency' => $frequency,
                    ]);
                }
            }
            
            $duration = microtime(true) - $startTime;
            
            $output->writeln("批量更新完成！");
            $output->writeln("成功: {$successCount}");
            $output->writeln("失败: {$errorCount}");
            $output->writeln("耗时: " . round($duration, 2) . " 秒");
            
            LoggerHelper::logBusiness('batch_tag_update_completed', [
                'frequency' => $frequency,
                'tag_count' => count($tagIds),
                'user_count' => count($userIds),
                'success_count' => $successCount,
                'error_count' => $errorCount,
                'duration' => $duration,
            ]);
            
            return Command::SUCCESS;
        } catch (\Throwable $e) {
            $output->writeln("批量更新失败: " . $e->getMessage());
            LoggerHelper::logError($e, [
                'component' => 'BatchUpdateTags',
                'frequency' => $frequency,
            ]);
            return Command::FAILURE;
        }
    }
}

