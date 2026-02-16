<?php

namespace app\service;

use app\repository\TagTaskRepository;
use app\repository\TagTaskExecutionRepository;
use app\repository\UserProfileRepository;
use app\service\TagService;
use app\utils\LoggerHelper;
use app\utils\RedisHelper;
use Ramsey\Uuid\Uuid as UuidGenerator;

/**
 * 标签任务管理服务
 * 
 * 职责：
 * - 创建、更新、删除标签任务
 * - 管理任务状态（启动、暂停、停止）
 * - 执行标签计算任务
 * - 追踪任务进度和统计信息
 */
class TagTaskService
{
    public function __construct(
        protected TagTaskRepository $taskRepository,
        protected TagTaskExecutionRepository $executionRepository,
        protected UserProfileRepository $userProfileRepository,
        protected TagService $tagService
    ) {
    }

    /**
     * 创建标签任务
     * 
     * @param array<string, mixed> $taskData 任务数据
     * @return array<string, mixed> 创建的任务信息
     */
    public function createTask(array $taskData): array
    {
        $taskId = UuidGenerator::uuid4()->toString();
        
        $task = [
            'task_id' => $taskId,
            'name' => $taskData['name'] ?? '未命名标签任务',
            'description' => $taskData['description'] ?? '',
            'task_type' => $taskData['task_type'] ?? 'full',
            'target_tag_ids' => $taskData['target_tag_ids'] ?? [],
            'user_scope' => $taskData['user_scope'] ?? ['type' => 'all'],
            'schedule' => $taskData['schedule'] ?? [
                'enabled' => false,
                'cron' => null,
            ],
            'config' => $taskData['config'] ?? [
                'concurrency' => 10,
                'batch_size' => 100,
                'error_handling' => 'skip',
            ],
            'status' => 'pending',
            'progress' => [
                'total_users' => 0,
                'processed_users' => 0,
                'success_count' => 0,
                'error_count' => 0,
                'percentage' => 0,
            ],
            'statistics' => [
                'total_executions' => 0,
                'success_executions' => 0,
                'failed_executions' => 0,
                'last_run_time' => null,
            ],
            'created_by' => $taskData['created_by'] ?? 'system',
            'created_at' => new \MongoDB\BSON\UTCDateTime(time() * 1000),
            'updated_at' => new \MongoDB\BSON\UTCDateTime(time() * 1000),
        ];

        $this->taskRepository->create($task);

        LoggerHelper::logBusiness('tag_task_created', [
            'task_id' => $taskId,
            'task_name' => $task['name'],
        ]);

        return $task;
    }

    /**
     * 更新任务
     */
    public function updateTask(string $taskId, array $taskData): bool
    {
        $task = $this->taskRepository->find($taskId);
        
        if (!$task) {
            throw new \InvalidArgumentException("任务不存在: {$taskId}");
        }

        if ($task->status === 'running') {
            $allowedFields = ['name', 'description', 'schedule'];
            $taskData = array_intersect_key($taskData, array_flip($allowedFields));
        }

        $taskData['updated_at'] = new \MongoDB\BSON\UTCDateTime(time() * 1000);
        
        return $this->taskRepository->where('task_id', $taskId)->update($taskData) > 0;
    }

    /**
     * 删除任务
     */
    public function deleteTask(string $taskId): bool
    {
        $task = $this->taskRepository->find($taskId);
        
        if (!$task) {
            throw new \InvalidArgumentException("任务不存在: {$taskId}");
        }

        if ($task->status === 'running') {
            $this->stopTask($taskId);
        }

        return $this->taskRepository->where('task_id', $taskId)->delete() > 0;
    }

    /**
     * 启动任务
     */
    public function startTask(string $taskId): bool
    {
        $task = $this->taskRepository->find($taskId);
        
        if (!$task) {
            throw new \InvalidArgumentException("任务不存在: {$taskId}");
        }

        if ($task->status === 'running') {
            throw new \RuntimeException("任务已在运行中: {$taskId}");
        }

        $this->taskRepository->where('task_id', $taskId)->update([
            'status' => 'running',
            'updated_at' => new \MongoDB\BSON\UTCDateTime(time() * 1000),
        ]);

        // 设置Redis标志，通知调度器启动任务
        RedisHelper::set("tag_task:{$taskId}:start", '1', 3600);

        LoggerHelper::logBusiness('tag_task_started', [
            'task_id' => $taskId,
        ]);

        return true;
    }

    /**
     * 暂停任务
     */
    public function pauseTask(string $taskId): bool
    {
        $task = $this->taskRepository->find($taskId);
        
        if (!$task) {
            throw new \InvalidArgumentException("任务不存在: {$taskId}");
        }

        if ($task->status !== 'running') {
            throw new \RuntimeException("任务未在运行中: {$taskId}");
        }

        $this->taskRepository->where('task_id', $taskId)->update([
            'status' => 'paused',
            'updated_at' => new \MongoDB\BSON\UTCDateTime(time() * 1000),
        ]);

        RedisHelper::set("tag_task:{$taskId}:pause", '1', 3600);

        return true;
    }

    /**
     * 停止任务
     */
    public function stopTask(string $taskId): bool
    {
        $task = $this->taskRepository->find($taskId);
        
        if (!$task) {
            throw new \InvalidArgumentException("任务不存在: {$taskId}");
        }

        $this->taskRepository->where('task_id', $taskId)->update([
            'status' => 'stopped',
            'updated_at' => new \MongoDB\BSON\UTCDateTime(time() * 1000),
        ]);

        RedisHelper::set("tag_task:{$taskId}:stop", '1', 3600);

        return true;
    }

    /**
     * 获取任务列表
     */
    public function getTaskList(array $filters = [], int $page = 1, int $pageSize = 20): array
    {
        $query = $this->taskRepository->query();

        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }
        if (isset($filters['task_type'])) {
            $query->where('task_type', $filters['task_type']);
        }
        if (isset($filters['name'])) {
            $query->where('name', 'like', '%' . $filters['name'] . '%');
        }

        $total = $query->count();
        $tasks = $query->orderBy('created_at', 'desc')
            ->skip(($page - 1) * $pageSize)
            ->take($pageSize)
            ->get()
            ->toArray();

        return [
            'tasks' => $tasks,
            'total' => $total,
            'page' => $page,
            'page_size' => $pageSize,
            'total_pages' => ceil($total / $pageSize),
        ];
    }

    /**
     * 获取任务详情
     */
    public function getTask(string $taskId): ?array
    {
        $task = $this->taskRepository->find($taskId);
        return $task ? $task->toArray() : null;
    }

    /**
     * 获取任务执行记录
     */
    public function getExecutions(string $taskId, int $page = 1, int $pageSize = 20): array
    {
        $query = $this->executionRepository->query()->where('task_id', $taskId);

        $total = $query->count();
        $executions = $query->orderBy('started_at', 'desc')
            ->skip(($page - 1) * $pageSize)
            ->take($pageSize)
            ->get()
            ->toArray();

        return [
            'executions' => $executions,
            'total' => $total,
            'page' => $page,
            'page_size' => $pageSize,
            'total_pages' => ceil($total / $pageSize),
        ];
    }

    /**
     * 执行任务（供调度器调用）
     */
    public function executeTask(string $taskId): void
    {
        $executor = new \app\service\TagTaskExecutor(
            $this->taskRepository,
            $this->executionRepository,
            $this->userProfileRepository,
            new \app\repository\TagDefinitionRepository(),
            $this->tagService
        );
        
        $executor->execute($taskId);
    }
}

