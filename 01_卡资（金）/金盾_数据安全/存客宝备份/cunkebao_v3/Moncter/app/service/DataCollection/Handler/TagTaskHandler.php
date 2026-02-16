<?php

namespace app\service\DataCollection\Handler;

use app\service\TagTaskService;
use app\repository\TagTaskRepository;
use app\repository\TagTaskExecutionRepository;
use app\repository\UserProfileRepository;
use app\service\TagService;
use app\repository\TagDefinitionRepository;
use app\repository\UserTagRepository;
use app\repository\TagHistoryRepository;
use app\service\TagRuleEngine\SimpleRuleEngine;
use app\utils\LoggerHelper;

/**
 * 标签任务处理类
 * 
 * 职责：
 * - 执行标签计算任务
 * - 批量遍历用户数据打标签
 */
class TagTaskHandler
{
    /**
     * 执行标签任务
     * 
     * @param mixed $adapter 数据源适配器（标签任务不需要）
     * @param array<string, mixed> $taskConfig 任务配置
     * @return void
     */
    public function collect($adapter, array $taskConfig): void
    {
        $taskId = $taskConfig['task_id'] ?? '';
        $taskName = $taskConfig['name'] ?? '标签任务';

        LoggerHelper::logBusiness('tag_task_handler_started', [
            'task_id' => $taskId,
            'task_name' => $taskName,
        ]);

        try {
            // 创建TagTaskService实例
            $tagTaskService = new TagTaskService(
                new TagTaskRepository(),
                new TagTaskExecutionRepository(),
                new UserProfileRepository(),
                new TagService(
                    new TagDefinitionRepository(),
                    new UserProfileRepository(),
                    new UserTagRepository(),
                    new TagHistoryRepository(),
                    new SimpleRuleEngine()
                )
            );

            // 执行任务
            $tagTaskService->executeTask($taskId);

            LoggerHelper::logBusiness('tag_task_handler_completed', [
                'task_id' => $taskId,
                'task_name' => $taskName,
            ]);
        } catch (\Throwable $e) {
            LoggerHelper::logError($e, [
                'component' => 'TagTaskHandler',
                'action' => 'collect',
                'task_id' => $taskId,
            ]);
            throw $e;
        }
    }
}

