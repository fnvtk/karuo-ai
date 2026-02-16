<?php

namespace app\service;

use app\repository\DataCollectionTaskRepository;
use app\utils\LoggerHelper;
use app\utils\RedisHelper;
use Ramsey\Uuid\Uuid as UuidGenerator;

/**
 * 数据采集任务管理服务
 * 
 * 职责：
 * - 创建、更新、删除采集任务
 * - 管理任务状态（启动、暂停、停止）
 * - 追踪任务进度和统计信息
 */
class DataCollectionTaskService
{
    public function __construct(
        protected DataCollectionTaskRepository $taskRepository
    ) {
    }

    /**
     * 创建采集任务
     * 
     * @param array<string, mixed> $taskData 任务数据
     * @return array<string, mixed> 创建的任务信息
     */
    public function createTask(array $taskData): array
    {
        // 生成任务ID
        $taskId = UuidGenerator::uuid4()->toString();
        
        // 根据Handler类型自动处理目标数据源配置
        $targetType = $taskData['target_type'] ?? '';
        $targetDataSourceId = $taskData['target_data_source_id'] ?? '';
        $targetDatabase = $taskData['target_database'] ?? '';
        $targetCollection = $taskData['target_collection'] ?? '';
        
        if ($targetType === 'consumption_record') {
            // 消费记录Handler：自动使用标签数据库配置
            $dataSourceService = new \app\service\DataSourceService(new \app\repository\DataSourceRepository());
            $dataSources = $dataSourceService->getDataSourceList(['status' => 1]);
            
            // 查找标签数据库数据源（通过名称或ID匹配）
            $tagDataSource = null;
            foreach ($dataSources['list'] ?? [] as $ds) {
                $dsName = strtolower($ds['name'] ?? '');
                $dsId = strtolower($ds['data_source_id'] ?? '');
                if ($dsId === 'tag_mongodb' || 
                    $dsName === 'tag_mongodb' ||
                    stripos($dsName, '标签') !== false ||
                    stripos($dsName, 'tag') !== false) {
                    $tagDataSource = $ds;
                    break;
                }
            }
            
            if ($tagDataSource) {
                $targetDataSourceId = $tagDataSource['data_source_id'];
                $targetDatabase = $tagDataSource['database'] ?? 'ckb';
                $targetCollection = 'consumption_records'; // 消费记录Handler会自动按时间分表
            } else {
                // 如果找不到，使用默认值
                $targetDataSourceId = 'tag_mongodb'; // 尝试使用配置key作为ID
                $targetDatabase = 'ckb';
                $targetCollection = 'consumption_records';
            }
        } elseif ($targetType === 'generic') {
            // 通用Handler：验证用户是否提供了配置
            if (empty($targetDataSourceId) || empty($targetDatabase) || empty($targetCollection)) {
                throw new \InvalidArgumentException('通用Handler必须配置目标数据源、目标数据库和目标集合');
            }
        }
        
        // 构建任务文档
        $task = [
            'task_id' => $taskId,
            'name' => $taskData['name'] ?? '未命名任务',
            'description' => $taskData['description'] ?? '',
            'data_source_id' => $taskData['data_source_id'] ?? '',
            'database' => $taskData['database'] ?? '',
            'collection' => $taskData['collection'] ?? null,
            'collections' => $taskData['collections'] ?? null,
            'target_type' => $targetType,
            'target_data_source_id' => $targetDataSourceId,
            'target_database' => $targetDatabase,
            'target_collection' => $targetCollection,
            'mode' => $taskData['mode'] ?? 'batch', // batch: 批量采集, realtime: 实时监听
            'field_mappings' => $this->cleanFieldMappings($taskData['field_mappings'] ?? []),
            'collection_field_mappings' => $taskData['collection_field_mappings'] ?? [],
            'lookups' => $taskData['lookups'] ?? [],
            'collection_lookups' => $taskData['collection_lookups'] ?? [],
            'filter_conditions' => $taskData['filter_conditions'] ?? [],
            'schedule' => $taskData['schedule'] ?? [
                'enabled' => false,
                'cron' => null,
            ],
            'status' => 'pending', // pending: 待启动, running: 运行中, paused: 已暂停, stopped: 已停止, error: 错误
            'progress' => [
                'status' => 'idle', // idle, running, paused, completed, error
                'processed_count' => 0,
                'success_count' => 0,
                'error_count' => 0,
                'total_count' => 0,
                'percentage' => 0,
                'start_time' => null,
                'end_time' => null,
                'last_sync_time' => null,
            ],
            'statistics' => [
                'total_processed' => 0,
                'total_success' => 0,
                'total_error' => 0,
                'last_run_time' => null,
            ],
            'created_by' => $taskData['created_by'] ?? 'system',
        ];

        // 保存到数据库（使用原生MongoDB客户端，明确指定集合名）
        // 注意：MongoDB Laravel的Model在数据中包含collection字段时，可能会误用该字段作为集合名
        // 因此使用原生客户端明确指定集合名为data_collection_tasks
        $dbConfig = config('database.connections.mongodb');
        
        // 使用 MongoDBHelper 创建客户端（统一DSN构建逻辑）
        $client = \app\utils\MongoDBHelper::createClient([
            'host' => parse_url($dbConfig['dsn'], PHP_URL_HOST) ?? '192.168.1.106',
            'port' => parse_url($dbConfig['dsn'], PHP_URL_PORT) ?? 27017,
            'username' => $dbConfig['username'] ?? '',
            'password' => $dbConfig['password'] ?? '',
            'auth_source' => $dbConfig['options']['authSource'] ?? 'admin',
        ], array_filter($dbConfig['options'] ?? [], function ($value) {
            return $value !== '' && $value !== null;
        }));
        
        $database = $client->selectDatabase($dbConfig['database']);
        $collection = $database->selectCollection('data_collection_tasks');
        
        // 添加时间戳
        $task['created_at'] = new \MongoDB\BSON\UTCDateTime(time() * 1000);
        $task['updated_at'] = new \MongoDB\BSON\UTCDateTime(time() * 1000);

        // 插入文档
        $result = $collection->insertOne($task);

        // 验证插入成功
        if ($result->getInsertedCount() !== 1) {
            throw new \RuntimeException("任务创建失败：未能插入到数据库");
        }

        // 如果任务状态是 running，立即设置 Redis 启动标志，让调度器启动采集进程
        if ($task['status'] === 'running') {
            try {
                \app\utils\RedisHelper::set("data_collection_task:{$taskId}:start", '1', 3600); // 1小时过期
                LoggerHelper::logBusiness('data_collection_task_start_flag_set', [
                    'task_id' => $taskId,
                    'task_name' => $task['name'],
                ]);
            } catch (\Throwable $e) {
                // Redis 设置失败不影响任务创建，只记录日志
                LoggerHelper::logError($e, [
                    'component' => 'DataCollectionTaskService',
                    'action' => 'createTask',
                    'task_id' => $taskId,
                    'message' => '设置启动标志失败',
                ]);
            }
        }

        LoggerHelper::logBusiness('data_collection_task_created', [
            'task_id' => $taskId,
            'task_name' => $task['name'],
        ]);

        return $task;
    }

    /**
     * 清理字段映射数据，移除无效的映射项
     * 
     * @param array $fieldMappings 原始字段映射数组
     * @return array 清理后的字段映射数组
     */
    private function cleanFieldMappings(array $fieldMappings): array
    {
        $cleaned = [];
        foreach ($fieldMappings as $mapping) {
            // 如果缺少target_field，跳过该项
            if (empty($mapping['target_field'])) {
                continue;
            }
            
            // 清理状态值映射中的源状态值（移除多余的引号）
            if (isset($mapping['value_mapping']) && is_array($mapping['value_mapping'])) {
                foreach ($mapping['value_mapping'] as &$vm) {
                    if (isset($vm['source_value'])) {
                        // 移除字符串两端的单引号或双引号
                        $vm['source_value'] = trim($vm['source_value'], "'\"");
                    }
                }
                unset($vm); // 解除引用
            }
            
            $cleaned[] = $mapping;
        }
        return $cleaned;
    }

    /**
     * 更新任务
     * 
     * @param string $taskId 任务ID
     * @param array<string, mixed> $taskData 任务数据
     * @return bool 是否更新成功
     */
    public function updateTask(string $taskId, array $taskData): bool
    {
        // 使用where查询，因为主键是task_id而不是_id
        $task = $this->taskRepository->where('task_id', $taskId)->first();
        
        if (!$task) {
            throw new \InvalidArgumentException("任务不存在: {$taskId}");
        }

        // 如果任务正在运行，完全禁止编辑（与前端逻辑保持一致）
        if ($task->status === 'running') {
            throw new \RuntimeException("运行中的任务不允许编辑，请先停止任务: {$taskId}");
        }

        // timestamps会自动处理updated_at
        
        $result = $this->taskRepository->where('task_id', $taskId)->update($taskData);

        LoggerHelper::logBusiness('data_collection_task_updated', [
            'task_id' => $taskId,
            'updated_fields' => array_keys($taskData),
        ]);

        return $result > 0;
    }

    /**
     * 删除任务
     * 
     * 如果任务正在运行或已暂停，会先停止任务再删除
     * 
     * @param string $taskId 任务ID
     * @return bool 是否删除成功
     */
    public function deleteTask(string $taskId): bool
    {
        // 使用where查询，因为主键是task_id而不是_id
        $task = $this->taskRepository->where('task_id', $taskId)->first();
        
        if (!$task) {
            throw new \InvalidArgumentException("任务不存在: {$taskId}");
        }

        // 如果任务正在运行或已暂停，先停止
        if (in_array($task->status, ['running', 'paused'])) {
            $this->stopTask($taskId);
        }

        $result = $this->taskRepository->where('task_id', $taskId)->delete();

        LoggerHelper::logBusiness('data_collection_task_deleted', [
            'task_id' => $taskId,
            'previous_status' => $task->status,
        ]);

        return $result > 0;
    }

    /**
     * 启动任务
     * 
     * 允许从以下状态启动：
     * - pending (待启动) -> running
     * - paused (已暂停) -> running (恢复)
     * - stopped (已停止) -> running (重新启动)
     * - completed (已完成) -> running (重新启动)
     * - error (错误) -> running (重新启动)
     * 
     * @param string $taskId 任务ID
     * @return bool 是否启动成功
     */
    public function startTask(string $taskId): bool
    {
        // 使用where查询，因为主键是task_id而不是_id
        $task = $this->taskRepository->where('task_id', $taskId)->first();
        
        if (!$task) {
            throw new \InvalidArgumentException("任务不存在: {$taskId}");
        }

        // 只允许从特定状态启动
        $allowedStatuses = ['pending', 'paused', 'stopped', 'completed', 'error'];
        if (!in_array($task->status, $allowedStatuses)) {
            if ($task->status === 'running') {
                throw new \RuntimeException("任务已在运行中: {$taskId}");
            }
            throw new \RuntimeException("任务当前状态不允许启动: {$taskId} (当前状态: {$task->status})");
        }

        // 如果是从 paused, stopped, completed, error 状态启动（重新启动），需要重置进度
        $progress = $task->progress ?? [];
        if (in_array($task->status, ['paused', 'stopped', 'completed', 'error'])) {
            // 重新启动时，重置进度（保留总数为0，表示重新开始）
            $progress = [
                'status' => 'running',
                'processed_count' => 0,
                'success_count' => 0,
                'error_count' => 0,
                'total_count' => 0, // 总数量会在采集开始时设置
                'percentage' => 0,
                'start_time' => new \MongoDB\BSON\UTCDateTime(time() * 1000),
                'end_time' => null,
                'last_sync_time' => null,
            ];
        } else {
            // 从 pending 状态启动，初始化进度
            $progress['status'] = 'running';
            $progress['start_time'] = new \MongoDB\BSON\UTCDateTime(time() * 1000);
        }
        
        $this->taskRepository->where('task_id', $taskId)->update([
            'status' => 'running',
            'progress' => $progress,
        ]);

        // 清除之前的暂停和停止标志（如果存在）
        RedisHelper::del("data_collection_task:{$taskId}:pause");
        RedisHelper::del("data_collection_task:{$taskId}:stop");
        
        // 设置Redis标志，通知调度器启动任务
        RedisHelper::set("data_collection_task:{$taskId}:start", '1', 3600);

        LoggerHelper::logBusiness('data_collection_task_started', [
            'task_id' => $taskId,
            'previous_status' => $task->status,
        ]);

        return true;
    }

    /**
     * 暂停任务
     * 
     * @param string $taskId 任务ID
     * @return bool 是否暂停成功
     */
    public function pauseTask(string $taskId): bool
    {
        // 使用where查询，因为主键是task_id而不是_id
        $task = $this->taskRepository->where('task_id', $taskId)->first();
        
        if (!$task) {
            throw new \InvalidArgumentException("任务不存在: {$taskId}");
        }

        if ($task->status !== 'running') {
            throw new \RuntimeException("任务未在运行中: {$taskId}");
        }

        // 更新任务状态
        // 注意：需要使用完整的数组来更新嵌套字段，timestamps会自动处理updated_at
        $progress = $task->progress ?? [];
        $progress['status'] = 'paused';
        
        $this->taskRepository->where('task_id', $taskId)->update([
            'status' => 'paused',
            'progress' => $progress,
        ]);

        // 设置Redis标志，通知调度器暂停任务
        RedisHelper::set("data_collection_task:{$taskId}:pause", '1', 3600);

        LoggerHelper::logBusiness('data_collection_task_paused', [
            'task_id' => $taskId,
        ]);

        return true;
    }

    /**
     * 停止任务
     * 
     * 只允许从以下状态停止：
     * - running (运行中) -> stopped
     * - paused (已暂停) -> stopped
     * 
     * @param string $taskId 任务ID
     * @return bool 是否停止成功
     */
    public function stopTask(string $taskId): bool
    {
        // 使用where查询，因为主键是task_id而不是_id
        $task = $this->taskRepository->where('task_id', $taskId)->first();
        
        if (!$task) {
            throw new \InvalidArgumentException("任务不存在: {$taskId}");
        }

        // 只允许从 running 或 paused 状态停止
        if (!in_array($task->status, ['running', 'paused'])) {
            throw new \RuntimeException("任务当前状态不允许停止: {$taskId} (当前状态: {$task->status})");
        }

        // 停止任务时，保持当前进度，不重置（只更新状态）
        $currentProgress = $task->progress ?? [];
        $progress = [
            'status' => 'idle', // idle, running, paused, completed, error
            'processed_count' => $currentProgress['processed_count'] ?? 0,
            'success_count' => $currentProgress['success_count'] ?? 0,
            'error_count' => $currentProgress['error_count'] ?? 0,
            'total_count' => $currentProgress['total_count'] ?? 0,
            'percentage' => $currentProgress['percentage'] ?? 0, // 保持当前进度百分比
            'start_time' => $currentProgress['start_time'] ?? null,
            'end_time' => new \MongoDB\BSON\UTCDateTime(time() * 1000), // 记录停止时间
            'last_sync_time' => $currentProgress['last_sync_time'] ?? null,
        ];
        
        $this->taskRepository->where('task_id', $taskId)->update([
            'status' => 'stopped',
            'progress' => $progress,
        ]);

        // 设置Redis标志，通知调度器停止任务
        RedisHelper::set("data_collection_task:{$taskId}:stop", '1', 3600);
        
        // 如果任务之前是 paused，也需要清除暂停标志
        if ($task->status === 'paused') {
            RedisHelper::del("data_collection_task:{$taskId}:pause");
        }

        LoggerHelper::logBusiness('data_collection_task_stopped', [
            'task_id' => $taskId,
            'previous_status' => $task->status,
            'progress_reset' => true,
        ]);

        return true;
    }

    /**
     * 获取任务列表
     * 
     * @param array<string, mixed> $filters 过滤条件
     * @param int $page 页码
     * @param int $pageSize 每页数量
     * @return array<string, mixed> 任务列表
     */
    public function getTaskList(array $filters = [], int $page = 1, int $pageSize = 20): array
    {
        $query = $this->taskRepository->query();

        // 应用过滤条件（只处理非空值，如果筛选条件为空则返回所有任务）
        if (!empty($filters['status']) && $filters['status'] !== '') {
            $query->where('status', $filters['status']);
        }
        if (!empty($filters['data_source_id']) && $filters['data_source_id'] !== '') {
            $query->where('data_source_id', $filters['data_source_id']);
        }
        if (!empty($filters['name']) && $filters['name'] !== '') {
            // MongoDB 使用正则表达式进行模糊查询
            $namePattern = preg_quote($filters['name'], '/');
            $query->where('name', 'regex', "/{$namePattern}/i");
        }

        // 分页
        $total = $query->count();
        $taskModels = $query->orderBy('created_at', 'desc')
            ->skip(($page - 1) * $pageSize)
            ->take($pageSize)
            ->get();
        
        // 手动转换为数组，避免 cast 机制对数组字段的错误处理
        $tasks = [];
        foreach ($taskModels as $model) {
            $task = $model->getAttributes();
            // 使用统一的日期字段处理方法
            $task = $this->normalizeDateFields($task);
            $tasks[] = $task;
        }

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
     * 
     * @param string $taskId 任务ID
     * @return array<string, mixed>|null 任务详情
     */
    public function getTask(string $taskId): ?array
    {
        // 使用where查询，因为主键是task_id而不是_id
        $task = $this->taskRepository->where('task_id', $taskId)->first();
        
        if (!$task) {
            return null;
        }

        // 手动转换为数组，避免 cast 机制对数组字段的错误处理
        $taskArray = $task->getAttributes();
        // 使用统一的日期字段处理方法
        $taskArray = $this->normalizeDateFields($taskArray);
        
        return $taskArray;
    }

    /**
     * 更新任务进度
     * 
     * @param string $taskId 任务ID
     * @param array<string, mixed> $progress 进度信息
     * @return bool 是否更新成功
     */
    public function updateProgress(string $taskId, array $progress): bool
    {
        $updateData = [
            'progress' => $progress,
        ];

        // 如果进度包含统计信息，也更新统计
        // 注意：这里的统计应该是累加的，但进度字段（processed_count等）应该直接设置
        if (isset($progress['success_count']) || isset($progress['error_count'])) {
            // 使用where查询，因为主键是task_id而不是_id
            $task = $this->taskRepository->where('task_id', $taskId)->first();
            if ($task) {
                $statistics = $task->statistics ?? [];
                // 统计信息使用增量更新（累加本次运行的数据）
                // 但这里需要判断是增量还是绝对值，如果是绝对值则应该直接设置
                // 由于进度更新传入的是绝对值，所以这里应该直接使用最新值而不是累加
                if (isset($progress['processed_count'])) {
                    $statistics['total_processed'] = $progress['processed_count'];
                }
                if (isset($progress['success_count'])) {
                    $statistics['total_success'] = $progress['success_count'];
                }
                if (isset($progress['error_count'])) {
                    $statistics['total_error'] = $progress['error_count'];
                }
                $statistics['last_run_time'] = new \MongoDB\BSON\UTCDateTime(time() * 1000);
                
                $updateData['statistics'] = $statistics;
            }
        }

        // 使用 where()->update() 更新文档
        // 注意：MongoDB Laravel Eloquent 的 update() 返回匹配的文档数量（通常是1或0）
        $result = $this->taskRepository->where('task_id', $taskId)->update($updateData);
        
        // 添加日志以便调试
        if ($result === false || $result === 0) {
            \Workerman\Worker::safeEcho("[DataCollectionTaskService] ⚠️  更新进度失败: task_id={$taskId}, result={$result}\n");
        } else {
            \Workerman\Worker::safeEcho("[DataCollectionTaskService] ✅ 更新进度成功: task_id={$taskId}, 匹配文档数={$result}\n");
        }
        
        return $result > 0;
    }

    /**
     * 统一处理日期字段，转换为 ISO 8601 字符串格式
     * 
     * @param array<string, mixed> $task 任务数据
     * @return array<string, mixed> 处理后的任务数据
     */
    private function normalizeDateFields(array $task): array
    {
        foreach (['created_at', 'updated_at'] as $dateField) {
            if (isset($task[$dateField])) {
                if ($task[$dateField] instanceof \MongoDB\BSON\UTCDateTime) {
                    $task[$dateField] = $task[$dateField]->toDateTime()->format('Y-m-d\TH:i:s.000\Z');
                } elseif ($task[$dateField] instanceof \DateTime || $task[$dateField] instanceof \DateTimeInterface) {
                    $task[$dateField] = $task[$dateField]->format('Y-m-d\TH:i:s.000\Z');
                } elseif (is_array($task[$dateField]) && isset($task[$dateField]['$date'])) {
                    // 处理 JSON 编码后的日期格式
                    $dateValue = $task[$dateField]['$date'];
                    if (is_numeric($dateValue)) {
                        // 如果是数字，假设是毫秒时间戳
                        $timestamp = $dateValue / 1000;
                        $task[$dateField] = date('Y-m-d\TH:i:s.000\Z', (int)$timestamp);
                    } elseif (is_array($dateValue) && isset($dateValue['$numberLong'])) {
                        // MongoDB 扩展 JSON 格式：{"$date": {"$numberLong": "1640000000000"}}
                        $timestamp = intval($dateValue['$numberLong']) / 1000;
                        $task[$dateField] = date('Y-m-d\TH:i:s.000\Z', (int)$timestamp);
                    } else {
                        // 其他格式，尝试解析或保持原样
                        $task[$dateField] = is_string($dateValue) ? $dateValue : json_encode($dateValue);
                    }
                }
            }
        }
        return $task;
    }

    /**
     * 获取所有运行中的任务
     * 
     * @return array<int, array<string, mixed>> 运行中的任务列表
     */
    public function getRunningTasks(): array
    {
        // 使用原生 MongoDB 查询，避免 Model 的 cast 机制导致数组字段被错误处理
        $dbConfig = config('database.connections.mongodb');
        
        // 使用 MongoDBHelper 创建客户端（统一DSN构建逻辑）
        $client = \app\utils\MongoDBHelper::createClient([
            'host' => parse_url($dbConfig['dsn'], PHP_URL_HOST) ?? '192.168.1.106',
            'port' => parse_url($dbConfig['dsn'], PHP_URL_PORT) ?? 27017,
            'username' => $dbConfig['username'] ?? '',
            'password' => $dbConfig['password'] ?? '',
            'auth_source' => $dbConfig['options']['authSource'] ?? 'admin',
        ], array_filter($dbConfig['options'] ?? [], function ($value) {
            return $value !== '' && $value !== null;
        }));
        
        $database = $client->selectDatabase($dbConfig['database']);
        $collection = $database->selectCollection('data_collection_tasks');
        
        // 查询所有运行中的任务
        $cursor = $collection->find(['status' => 'running']);
        
        $tasks = [];
        foreach ($cursor as $document) {
            // MongoDB BSONDocument 需要转换为数组
            if ($document instanceof \MongoDB\Model\BSONDocument) {
                $task = json_decode(json_encode($document), true);
            } elseif (is_array($document)) {
                $task = $document;
            } else {
                // 其他类型，尝试转换为数组
                $task = (array)$document;
            }
            
            // 处理 MongoDB 的 _id 字段
            if (isset($task['_id'])) {
                if (is_object($task['_id'])) {
                    $task['_id'] = (string)$task['_id'];
                }
            }
            // 使用统一的日期字段处理方法
            $task = $this->normalizeDateFields($task);
            $tasks[] = $task;
        }
        
        return $tasks;
    }
}

