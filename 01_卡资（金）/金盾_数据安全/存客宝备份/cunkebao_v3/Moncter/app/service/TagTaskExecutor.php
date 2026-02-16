<?php

namespace app\service;

use app\repository\TagTaskRepository;
use app\repository\TagTaskExecutionRepository;
use app\repository\UserProfileRepository;
use app\repository\TagDefinitionRepository;
use app\service\TagService;
use app\utils\LoggerHelper;
use app\utils\RedisHelper;
use Ramsey\Uuid\Uuid as UuidGenerator;

/**
 * 标签任务执行器
 * 
 * 职责：
 * - 执行标签计算任务
 * - 批量遍历用户数据打标签
 * - 更新任务进度和统计信息
 */
class TagTaskExecutor
{
    public function __construct(
        protected TagTaskRepository $taskRepository,
        protected TagTaskExecutionRepository $executionRepository,
        protected UserProfileRepository $userProfileRepository,
        protected TagDefinitionRepository $tagDefinitionRepository,
        protected TagService $tagService
    ) {
    }

    /**
     * 执行标签任务
     * 
     * @param string $taskId 任务ID
     * @return void
     */
    public function execute(string $taskId): void
    {
        $task = $this->taskRepository->find($taskId);
        
        if (!$task) {
            throw new \InvalidArgumentException("任务不存在: {$taskId}");
        }

        // 创建执行记录
        $executionId = UuidGenerator::uuid4()->toString();
        $execution = $this->executionRepository->create([
            'execution_id' => $executionId,
            'task_id' => $taskId,
            'started_at' => new \MongoDB\BSON\UTCDateTime(time() * 1000),
            'status' => 'running',
            'processed_users' => 0,
            'success_count' => 0,
            'error_count' => 0,
        ]);

        try {
            // 获取用户列表
            $userIds = $this->getUserIds($task);
            $totalUsers = count($userIds);

            // 更新任务进度
            $this->updateTaskProgress($taskId, [
                'total_users' => $totalUsers,
                'processed_users' => 0,
                'success_count' => 0,
                'error_count' => 0,
                'percentage' => 0,
            ]);

            // 获取目标标签ID列表
            $targetTagIds = $task->target_tag_ids ?? null;

            // 批量处理用户
            $batchSize = $task->config['batch_size'] ?? 100;
            $processedCount = 0;
            $successCount = 0;
            $errorCount = 0;

            foreach (array_chunk($userIds, $batchSize) as $batch) {
                // 检查任务状态（是否被暂停或停止）
                if (!$this->checkTaskStatus($taskId)) {
                    LoggerHelper::logBusiness('tag_task_paused_or_stopped', [
                        'task_id' => $taskId,
                        'execution_id' => $executionId,
                        'processed' => $processedCount,
                    ]);
                    break;
                }

                // 批量处理用户
                foreach ($batch as $userId) {
                    try {
                        // 计算用户标签
                        $this->tagService->calculateTags($userId, $targetTagIds);
                        $successCount++;
                    } catch (\Exception $e) {
                        $errorCount++;
                        LoggerHelper::logError($e, [
                            'component' => 'TagTaskExecutor',
                            'action' => 'calculateTags',
                            'task_id' => $taskId,
                            'user_id' => $userId,
                        ]);

                        // 根据错误处理策略决定是否继续
                        $errorHandling = $task->config['error_handling'] ?? 'skip';
                        if ($errorHandling === 'stop') {
                            throw $e;
                        }
                    }

                    $processedCount++;

                    // 每处理一定数量更新一次进度
                    if ($processedCount % 10 === 0) {
                        $this->updateTaskProgress($taskId, [
                            'processed_users' => $processedCount,
                            'success_count' => $successCount,
                            'error_count' => $errorCount,
                            'percentage' => $totalUsers > 0 ? round(($processedCount / $totalUsers) * 100, 2) : 0,
                        ]);

                        // 更新执行记录
                        $this->executionRepository->where('execution_id', $executionId)->update([
                            'processed_users' => $processedCount,
                            'success_count' => $successCount,
                            'error_count' => $errorCount,
                        ]);
                    }
                }
            }

            // 更新最终进度
            $this->updateTaskProgress($taskId, [
                'processed_users' => $processedCount,
                'success_count' => $successCount,
                'error_count' => $errorCount,
                'percentage' => $totalUsers > 0 ? round(($processedCount / $totalUsers) * 100, 2) : 100,
            ]);

            // 更新执行记录为完成
            $this->executionRepository->where('execution_id', $executionId)->update([
                'status' => 'completed',
                'finished_at' => new \MongoDB\BSON\UTCDateTime(time() * 1000),
                'processed_users' => $processedCount,
                'success_count' => $successCount,
                'error_count' => $errorCount,
            ]);

            // 更新任务统计
            $this->updateTaskStatistics($taskId, $successCount, $errorCount);

            LoggerHelper::logBusiness('tag_task_execution_completed', [
                'task_id' => $taskId,
                'execution_id' => $executionId,
                'total_users' => $totalUsers,
                'processed' => $processedCount,
                'success' => $successCount,
                'error' => $errorCount,
            ]);

        } catch (\Throwable $e) {
            // 更新执行记录为失败
            $this->executionRepository->where('execution_id', $executionId)->update([
                'status' => 'failed',
                'finished_at' => new \MongoDB\BSON\UTCDateTime(time() * 1000),
                'error_message' => $e->getMessage(),
            ]);

            // 更新任务状态为错误
            $this->taskRepository->where('task_id', $taskId)->update([
                'status' => 'error',
                'progress.status' => 'error',
                'progress.last_error' => $e->getMessage(),
            ]);

            LoggerHelper::logError($e, [
                'component' => 'TagTaskExecutor',
                'action' => 'execute',
                'task_id' => $taskId,
                'execution_id' => $executionId,
            ]);

            throw $e;
        }
    }

    /**
     * 获取用户ID列表
     * 
     * @param mixed $task 任务对象
     * @return array<string> 用户ID列表
     */
    private function getUserIds($task): array
    {
        $userScope = $task->user_scope ?? ['type' => 'all'];
        $scopeType = $userScope['type'] ?? 'all';

        switch ($scopeType) {
            case 'all':
                // 获取所有用户
                $users = $this->userProfileRepository->newQuery()
                    ->where('status', 0) // 只获取正常状态的用户
                    ->get();
                return $users->pluck('user_id')->toArray();

            case 'list':
                // 指定用户列表
                return $userScope['user_ids'] ?? [];

            case 'filter':
                // 按条件筛选
                // 这里可以扩展支持更复杂的筛选条件
                $query = $this->userProfileRepository->newQuery()
                    ->where('status', 0);

                // 可以添加更多筛选条件
                if (isset($userScope['conditions']) && is_array($userScope['conditions'])) {
                    foreach ($userScope['conditions'] as $condition) {
                        $field = $condition['field'] ?? '';
                        $operator = $condition['operator'] ?? '=';
                        $value = $condition['value'] ?? null;

                        if (empty($field)) {
                            continue;
                        }

                        switch ($operator) {
                            case '>':
                                $query->where($field, '>', $value);
                                break;
                            case '>=':
                                $query->where($field, '>=', $value);
                                break;
                            case '<':
                                $query->where($field, '<', $value);
                                break;
                            case '<=':
                                $query->where($field, '<=', $value);
                                break;
                            case '=':
                                $query->where($field, $value);
                                break;
                            case '!=':
                                $query->where($field, '!=', $value);
                                break;
                            case 'in':
                                if (is_array($value)) {
                                    $query->whereIn($field, $value);
                                }
                                break;
                        }
                    }
                }

                $users = $query->get();
                return $users->pluck('user_id')->toArray();

            default:
                throw new \InvalidArgumentException("不支持的用户范围类型: {$scopeType}");
        }
    }

    /**
     * 更新任务进度
     */
    private function updateTaskProgress(string $taskId, array $progress): void
    {
        $task = $this->taskRepository->find($taskId);
        if (!$task) {
            return;
        }

        $currentProgress = $task->progress ?? [];
        $currentProgress = array_merge($currentProgress, $progress);
        $currentProgress['status'] = 'running';

        $this->taskRepository->where('task_id', $taskId)->update([
            'progress' => $currentProgress,
            'updated_at' => new \MongoDB\BSON\UTCDateTime(time() * 1000),
        ]);
    }

    /**
     * 更新任务统计
     */
    private function updateTaskStatistics(string $taskId, int $successCount, int $errorCount): void
    {
        $task = $this->taskRepository->find($taskId);
        if (!$task) {
            return;
        }

        $statistics = $task->statistics ?? [];
        $statistics['total_executions'] = ($statistics['total_executions'] ?? 0) + 1;
        $statistics['success_executions'] = ($statistics['success_executions'] ?? 0) + ($errorCount === 0 ? 1 : 0);
        $statistics['failed_executions'] = ($statistics['failed_executions'] ?? 0) + ($errorCount > 0 ? 1 : 0);
        $statistics['last_run_time'] = new \MongoDB\BSON\UTCDateTime(time() * 1000);

        $this->taskRepository->where('task_id', $taskId)->update([
            'statistics' => $statistics,
            'updated_at' => new \MongoDB\BSON\UTCDateTime(time() * 1000),
        ]);
    }

    /**
     * 检查任务状态
     */
    private function checkTaskStatus(string $taskId): bool
    {
        // 检查Redis标志
        if (RedisHelper::exists("tag_task:{$taskId}:pause")) {
            return false;
        }
        if (RedisHelper::exists("tag_task:{$taskId}:stop")) {
            return false;
        }

        // 检查数据库状态
        $task = $this->taskRepository->find($taskId);
        if ($task && in_array($task->status, ['paused', 'stopped', 'error'])) {
            return false;
        }

        return true;
    }
}

