<?php

namespace app\process;

use Workerman\Worker;
use Workerman\Timer;
use app\service\DataSource\DataSourceAdapterFactory;
use app\service\DataCollectionTaskService;
use app\service\DataSourceService;
use app\repository\DataCollectionTaskRepository;
use app\repository\DataSourceRepository;
use app\utils\QueueService;
use app\utils\RedisHelper;
use app\utils\LoggerHelper;
use Cron\CronExpression;

/**
 * 数据采集任务调度器
 * 
 * 职责：
 * - 定时执行数据采集任务
 * - 多进程并行处理（每个 Worker 处理分配给它的任务）
 * - 使用分布式锁防止重复执行
 * - 调用业务处理类执行数据采集逻辑
 * - 支持从配置文件和数据库读取任务
 */
class DataSyncScheduler
{
    private array $tasks = [];
    private array $globalConfig = [];
    private array $dataSourcesConfig = []; // 缓存的数据源配置（从数据库读取）
    private DataCollectionTaskService $taskService;
    private DataSourceService $dataSourceService;
    private ?\app\service\TagTaskService $tagTaskService = null; // 延迟初始化
    private array $runningTasks = []; // 正在运行的任务（实时监听模式）

    public function onWorkerStart(Worker $worker): void
    {
        // 初始化任务服务
        $this->taskService = new DataCollectionTaskService(
            new DataCollectionTaskRepository()
        );

        // 初始化数据源服务
        $this->dataSourceService = new DataSourceService(
            new DataSourceRepository()
        );
        
        // 初始化标签任务服务（避免在多个方法中重复实例化）
        $this->tagTaskService = new \app\service\TagTaskService(
            new \app\repository\TagTaskRepository(),
            new \app\repository\TagTaskExecutionRepository(),
            new \app\repository\UserProfileRepository(),
            new \app\service\TagService(
                new \app\repository\TagDefinitionRepository(),
                new \app\repository\UserProfileRepository(),
                new \app\repository\UserTagRepository(),
                new \app\repository\TagHistoryRepository(),
                new \app\service\TagRuleEngine\SimpleRuleEngine()
            )
        );

        // 加载任务采集配置（配置文件中的任务）
        $taskConfig = config('data_collection_tasks', []);
        $this->tasks = $taskConfig['tasks'] ?? [];
        $this->globalConfig = $taskConfig['global'] ?? [];

        // 从数据库加载数据源配置（替代config('data_sources')）
        $this->loadDataSourcesConfig();

        LoggerHelper::logBusiness('data_collection_scheduler_started', [
            'worker_id' => $worker->id,
            'total_workers' => $worker->count,
            'config_task_count' => count($this->tasks),
            'data_source_count' => count($this->dataSourcesConfig),
        ]);

        // 加载配置文件中的任务
        $this->loadConfigTasks($worker);

        // 加载数据库中的动态任务
        $this->loadDatabaseTasks($worker);

        // 每30秒刷新一次数据库任务列表（检查新任务、状态变更等）
        Timer::add(30, function () use ($worker) {
            $this->refreshDatabaseTasks($worker);
        });
    }

    /**
     * 从数据库加载数据源配置
     */
    private function loadDataSourcesConfig(): void
    {
        try {
            $this->dataSourcesConfig = $this->dataSourceService->getAllEnabledDataSources();
        } catch (\Throwable $e) {
            LoggerHelper::logError($e, [
                'component' => 'DataSyncScheduler',
                'action' => 'loadDataSourcesConfig',
            ]);
            // 如果加载失败，使用空数组，避免后续错误
            $this->dataSourcesConfig = [];
        }
    }

    /**
     * 加载配置文件中的任务
     */
    private function loadConfigTasks(Worker $worker): void
    {
        // 为每个启用的任务设置定时任务
        foreach ($this->tasks as $taskId => $taskConfig) {
            if (!($taskConfig['enabled'] ?? true)) {
                continue;
            }

            // 检查是否应该由当前 Worker 处理（分片分配）
            if (!$this->shouldHandleTask($taskId, $taskConfig, $worker)) {
                continue;
            }

            // 获取调度配置
            $schedule = $taskConfig['schedule'] ?? [];
            
            // 如果调度被禁用，直接启动任务（持续运行）
            if (!($schedule['enabled'] ?? true)) {
                // 使用 Timer 延迟启动，避免阻塞 Worker 启动
                Timer::add(0, function () use ($taskId, $taskConfig, $worker) {
                    $this->executeTask($taskId, $taskConfig, $worker);
                }, [], false);
                continue;
            }

            $cronExpression = $schedule['cron'] ?? '*/5 * * * *'; // 默认每5分钟

            // 创建定时任务
            $this->scheduleTask($taskId, $taskConfig, $cronExpression, $worker);
        }
    }

    /**
     * 加载数据库中的动态任务
     */
    private function loadDatabaseTasks(Worker $worker): void
    {
        try {
            // 加载数据采集任务
            $dataCollectionTaskService = new \app\service\DataCollectionTaskService(
                new \app\repository\DataCollectionTaskRepository()
            );
            $runningCollectionTasks = $dataCollectionTaskService->getRunningTasks();
            
            \Workerman\Worker::safeEcho("[DataSyncScheduler] 从数据库加载到 " . count($runningCollectionTasks) . " 个运行中的任务 (worker_id={$worker->id})\n");
            
            foreach ($runningCollectionTasks as $task) {
                $taskId = $task['task_id'];
                $taskName = $task['name'] ?? $taskId;
                
                if (!$this->shouldHandleDatabaseTask($taskId, $worker)) {
                    \Workerman\Worker::safeEcho("[DataSyncScheduler] 跳过任务 [{$taskName}]，由其他 Worker 处理 (worker_id={$worker->id})\n");
                    continue;
                }

                \Workerman\Worker::safeEcho("[DataSyncScheduler] ✓ 准备启动任务: [{$taskName}] task_id={$taskId} (worker_id={$worker->id})\n");
                    
                    $taskConfig = $this->convertDatabaseTaskToConfig($task);
                    
                // 使用统一的任务启动方法
                $this->startTask($taskId, $taskConfig, $worker);
            }

            // 加载标签任务（使用已初始化的服务）
            $runningTagTasks = $this->tagTaskService->getTaskList(['status' => 'running'], 1, 1000);
            
            foreach ($runningTagTasks['tasks'] as $task) {
                $taskId = $task['task_id'];
                
                if (!$this->shouldHandleDatabaseTask($taskId, $worker)) {
                    continue;
                }

                \Workerman\Worker::safeEcho("[DataSyncScheduler] ✓ 准备启动标签任务: task_id={$taskId} (worker_id={$worker->id})\n");
                    
                    $taskConfig = $this->convertDatabaseTaskToConfig($task);
                    
                    // 标签任务通常是批量执行，根据调度配置执行
                    $schedule = $taskConfig['schedule'] ?? [];
                    if (!($schedule['enabled'] ?? true)) {
                        // 立即执行一次
                    \Workerman\Worker::safeEcho("[DataSyncScheduler] → 立即执行标签任务\n");
                        Timer::add(0, function () use ($taskId, $taskConfig, $worker) {
                            $this->executeTask($taskId, $taskConfig, $worker);
                        }, [], false);
                    } else {
                        $cronExpression = $schedule['cron'] ?? '0 2 * * *'; // 默认每天凌晨2点
                    \Workerman\Worker::safeEcho("[DataSyncScheduler] → 定时执行标签任务，Cron: {$cronExpression}\n");
                        $this->scheduleTask($taskId, $taskConfig, $cronExpression, $worker);
                }
            }
        } catch (\Throwable $e) {
            LoggerHelper::logError($e, [
                'component' => 'DataSyncScheduler',
                'action' => 'loadDatabaseTasks',
            ]);
        }
    }

    /**
     * 刷新数据库任务列表
     */
    private function refreshDatabaseTasks(Worker $worker): void
    {
        try {
            // 刷新数据采集任务
            $dataCollectionTaskService = new \app\service\DataCollectionTaskService(
                new \app\repository\DataCollectionTaskRepository()
            );
            $runningCollectionTasks = $dataCollectionTaskService->getRunningTasks();
            $collectionTaskIds = array_column($runningCollectionTasks, 'task_id');
            
            foreach ($runningCollectionTasks as $task) {
                $taskId = $task['task_id'];
                
                if (isset($this->runningTasks[$taskId])) {
                    \Workerman\Worker::safeEcho("[DataSyncScheduler] 任务 {$taskId} 已在运行中，跳过\n");
                    continue;
                }
                
                \Workerman\Worker::safeEcho("[DataSyncScheduler] 检测到新的运行中任务: {$taskId}\n");
                    
                    $taskConfig = $this->convertDatabaseTaskToConfig($task);
                    
                // 使用统一的任务启动方法
                $this->startTask($taskId, $taskConfig, $worker);
            }

            // 刷新标签任务（使用已初始化的服务）
            $runningTagTasks = $this->tagTaskService->getTaskList(['status' => 'running'], 1, 1000);
            $tagTaskIds = array_column($runningTagTasks['tasks'], 'task_id');
            
            foreach ($runningTagTasks['tasks'] as $task) {
                $taskId = $task['task_id'];
                
                if (isset($this->runningTasks[$taskId])) {
                    continue;
                }
                
                if (RedisHelper::exists("tag_task:{$taskId}:start")) {
                    RedisHelper::del("tag_task:{$taskId}:start");
                    
                    $taskConfig = $this->convertDatabaseTaskToConfig($task);
                    
                    Timer::add(0, function () use ($taskId, $taskConfig, $worker) {
                        $this->executeTask($taskId, $taskConfig, $worker);
                    }, [], false);
                    $this->runningTasks[$taskId] = true;
                }
            }
            
            // 检查是否有任务需要停止或暂停
            $allTaskIds = array_merge($collectionTaskIds, $tagTaskIds);
            foreach (array_keys($this->runningTasks) as $taskId) {
                if (!in_array($taskId, $allTaskIds)) {
                    // 任务不在运行列表中了，移除
                    unset($this->runningTasks[$taskId]);
                } elseif (RedisHelper::exists("data_collection_task:{$taskId}:stop") || 
                          RedisHelper::exists("tag_task:{$taskId}:stop")) {
                    // 检查停止标志
                    RedisHelper::del("data_collection_task:{$taskId}:stop");
                    RedisHelper::del("tag_task:{$taskId}:stop");
                    unset($this->runningTasks[$taskId]);
                    \Workerman\Worker::safeEcho("[DataSyncScheduler] 检测到停止信号，任务 {$taskId} 已停止\n");
                } elseif (RedisHelper::exists("data_collection_task:{$taskId}:pause")) {
                    // 检查暂停标志
                    RedisHelper::del("data_collection_task:{$taskId}:pause");
                    unset($this->runningTasks[$taskId]);
                    \Workerman\Worker::safeEcho("[DataSyncScheduler] 检测到暂停信号，任务 {$taskId} 已暂停（正在执行的任务会在下次检查时停止）\n");
                }
            }
        } catch (\Throwable $e) {
            LoggerHelper::logError($e, [
                'component' => 'DataSyncScheduler',
                'action' => 'refreshDatabaseTasks',
            ]);
        }
    }

    /**
     * 判断是否应该处理数据库任务
     */
    private function shouldHandleDatabaseTask(string $taskId, Worker $worker): bool
    {
        // 简单策略：按 Worker ID 取模分配
        // 可以根据需要调整分配策略
        return ($worker->id % $worker->count) === (hexdec(substr($taskId, 0, 8)) % $worker->count);
    }

    /**
     * 将数据库任务转换为配置格式
     */
    private function convertDatabaseTaskToConfig(array $task): array
    {
        // 判断任务类型：数据采集任务还是标签任务
        // 如果任务有 data_source_id，说明是数据采集任务
        // 如果任务有 target_tag_ids，说明是标签任务
        if (isset($task['data_source_id']) && !empty($task['data_source_id'])) {
            // 数据采集任务
            // 根据 target_type 选择不同的 Handler
            $targetType = $task['target_type'] ?? 'generic';
            $handlerClass = \app\service\DataCollection\Handler\GenericCollectionHandler::class;
            
            if ($targetType === 'consumption_record') {
                $handlerClass = \app\service\DataCollection\Handler\ConsumptionCollectionHandler::class;
            }
            
            $config = [
                'task_id' => $task['task_id'],
                'name' => $task['name'] ?? '',
                'data_source_id' => $task['data_source_id'],
                'data_source' => $task['data_source_id'],
                'database' => $task['database'] ?? '',
                'collection' => $task['collection'] ?? null,
                'collections' => $task['collections'] ?? null,
                'target_type' => $targetType,
                'target_data_source_id' => $task['target_data_source_id'] ?? null,
                'target_database' => $task['target_database'] ?? null,
                'target_collection' => $task['target_collection'] ?? null,
                'mode' => $task['mode'] ?? 'batch',
                'field_mappings' => $task['field_mappings'] ?? [],
                'collection_field_mappings' => $task['collection_field_mappings'] ?? [],
                'lookups' => $task['lookups'] ?? [],
                'collection_lookups' => $task['collection_lookups'] ?? [],
                'filter_conditions' => $task['filter_conditions'] ?? [],
                'schedule' => $task['schedule'] ?? [
                    'enabled' => false,
                    'cron' => null,
                ],
                'handler_class' => $handlerClass,
                'batch_size' => $task['batch_size'] ?? 1000,
            ];
            
            // 对于consumption_record类型的任务，添加source_type字段（如果存在）
            if ($targetType === 'consumption_record' && isset($task['source_type'])) {
                $config['source_type'] = $task['source_type'];
            }
            
            return $config;
        } elseif (isset($task['target_tag_ids']) || isset($task['task_type'])) {
            // 标签任务
            return [
                'task_id' => $task['task_id'],
                'name' => $task['name'] ?? '',
                'task_type' => $task['task_type'] ?? 'full',
                'target_tag_ids' => $task['target_tag_ids'] ?? [],
                'user_scope' => $task['user_scope'] ?? ['type' => 'all'],
                'schedule' => $task['schedule'] ?? [
                    'enabled' => false,
                    'cron' => null,
                ],
                'config' => $task['config'] ?? [
                    'concurrency' => 10,
                    'batch_size' => 100,
                    'error_handling' => 'skip',
                ],
                'handler_class' => \app\service\DataCollection\Handler\TagTaskHandler::class,
            ];
        } else {
            throw new \InvalidArgumentException("无法识别任务类型: {$task['task_id']}");
        }
    }

    /**
     * 判断当前 Worker 是否应该处理该任务（分片分配）
     * 
     * @param string $taskId 任务ID
     * @param array<string, mixed> $taskConfig 任务配置
     * @param Worker $worker Worker 实例
     * @return bool 是否应该处理
     */
    private function shouldHandleTask(string $taskId, array $taskConfig, Worker $worker): bool
    {
        $sharding = $taskConfig['sharding'] ?? [];
        $strategy = $sharding['strategy'] ?? 'none';

        // 如果不需要分片，所有 Worker 都处理（但通过分布式锁保证只有一个执行）
        if ($strategy === 'none') {
            return true;
        }

        // by_database 策略：所有 Worker 都处理，但每个 Worker 处理不同的数据库（在 Handler 中分配）
        if ($strategy === 'by_database') {
            return true; // 所有 Worker 都处理，数据库分配在 Handler 中进行
        }

        // 其他分片策略：按 Worker ID 取模分配
        $shardCount = $sharding['shard_count'] ?? 1;
        if ($shardCount <= 1) {
            // 如果 shard_count <= 1，所有 Worker 都处理
            return true;
        }
        
        $assignedShardId = $worker->id % $shardCount;
        // 对于分片策略，只处理分配给当前 Worker 的分片
        return $assignedShardId === ($worker->id % $shardCount);
    }

    /**
     * 为任务设置定时任务
     * 
     * @param string $taskId 任务ID
     * @param array<string, mixed> $taskConfig 任务配置
     * @param string $cronExpression Cron 表达式
     * @param Worker $worker Worker 实例
     * @return void
     */
    private function scheduleTask(string $taskId, array $taskConfig, string $cronExpression, Worker $worker): void
    {
        try {
            $cron = CronExpression::factory($cronExpression);
            
            // 计算下次执行时间
            $nextRunTime = $cron->getNextRunDate()->getTimestamp();
            $now = time();
            $delay = max(0, $nextRunTime - $now);

            LoggerHelper::logBusiness('data_collection_task_scheduled', [
                'task_id' => $taskId,
                'task_name' => $taskConfig['name'] ?? $taskId,
                'cron' => $cronExpression,
                'next_run_time' => date('Y-m-d H:i:s', $nextRunTime),
                'delay' => $delay,
            ]);

            // 设置定时器（延迟执行第一次，然后每60秒检查一次）
            Timer::add(60, function () use ($taskId, $taskConfig, $cron, $worker) {
                $now = time();
                $nextRunTime = $cron->getNextRunDate()->getTimestamp();

                // 如果到了执行时间（允许1秒误差）
                if ($nextRunTime <= $now + 1) {
                    $this->executeTask($taskId, $taskConfig, $worker);
                }
            }, [], false, $delay);
        } catch (\Throwable $e) {
            LoggerHelper::logError($e, [
                'component' => 'DataSyncScheduler',
                'action' => 'scheduleTask',
                'task_id' => $taskId,
                'cron' => $cronExpression,
            ]);
        }
    }

    /**
     * 执行采集任务
     * 
     * @param string $taskId 任务ID
     * @param array<string, mixed> $taskConfig 任务配置
     * @param Worker $worker Worker 实例
     * @return void
     */
    private function executeTask(string $taskId, array $taskConfig, Worker $worker): void
    {
        // 在执行前，检查任务状态，如果已经是 completed，就不应该再执行
        try {
            $task = $this->taskService->getTask($taskId);
            if ($task && isset($task['status'])) {
                if ($task['status'] === 'completed') {
                    \Workerman\Worker::safeEcho("[DataSyncScheduler] ⚠️  任务已完成，跳过执行: task_id={$taskId}\n");
                    LoggerHelper::logBusiness('data_collection_skipped_completed', [
                        'task_id' => $taskId,
                        'worker_id' => $worker->id,
                    ]);
                    return;
                }
                if (in_array($task['status'], ['stopped', 'paused', 'error'])) {
                    \Workerman\Worker::safeEcho("[DataSyncScheduler] ⚠️  任务状态为 {$task['status']}，跳过执行: task_id={$taskId}\n");
                    LoggerHelper::logBusiness('data_collection_skipped_status', [
                        'task_id' => $taskId,
                        'status' => $task['status'],
                        'worker_id' => $worker->id,
                    ]);
                    return;
                }
            }
        } catch (\Throwable $e) {
            // 如果查询任务状态失败，记录日志但继续执行（避免因为查询失败而阻塞任务）
            LoggerHelper::logError($e, [
                'component' => 'DataSyncScheduler',
                'action' => 'executeTask',
                'task_id' => $taskId,
                'message' => '检查任务状态失败，继续执行任务',
            ]);
        }
        
        $sharding = $taskConfig['sharding'] ?? [];
        $strategy = $sharding['strategy'] ?? 'none';
        
        // 对于 by_database 策略，不使用全局锁，让所有 Worker 并行执行
        // 每个 Worker 会在 Handler 中分配不同的数据库
        $useLock = ($strategy !== 'by_database');
        
        if ($useLock) {
            $lockKey = "data_collection:{$taskId}";
            $lockConfig = $this->globalConfig['distributed_lock'] ?? [];
            $ttl = $lockConfig['ttl'] ?? 300;
            $retryTimes = $lockConfig['retry_times'] ?? 3;
            $retryDelay = $lockConfig['retry_delay'] ?? 1000;

            // 尝试获取分布式锁
            if (!RedisHelper::acquireLock($lockKey, $ttl, $retryTimes, $retryDelay)) {
                LoggerHelper::logBusiness('data_collection_skipped_locked', [
                    'task_id' => $taskId,
                    'worker_id' => $worker->id,
                ]);
                return;
            }
        }

        try {
            LoggerHelper::logBusiness('data_collection_started', [
                'task_id' => $taskId,
                'task_name' => $taskConfig['name'] ?? $taskId,
                'worker_id' => $worker->id,
            ]);
            // 控制台提示，标记具体哪个采集/同步任务被当前 Worker 拉起，方便排查任务是否真正执行
            \Workerman\Worker::safeEcho("[DataSyncScheduler] 【步骤1-任务启动】执行采集任务：task_id={$taskId}, task_name=" . ($taskConfig['name'] ?? $taskId) . ", worker_id={$worker->id}\n");

            // 判断任务类型：数据采集任务需要数据源适配器，标签任务不需要
            $handlerClass = $taskConfig['handler_class'] ?? '';
            $isTagTask = strpos($handlerClass, 'TagTaskHandler') !== false;
            
            $adapter = null;
            if (!$isTagTask) {
                // 数据采集任务：需要数据源适配器
                // 支持两种配置方式：
                // 1. 单数据源：data_source（用于普通采集任务）
                // 2. 多数据源：source_data_source 和 target_data_source（用于数据库同步任务）
                // 3. 动态任务：data_source_id（从数据库读取的任务）
                $dataSourceId = $taskConfig['data_source'] ?? $taskConfig['data_source_id'] ?? '';
                $sourceDataSourceId = $taskConfig['source_data_source'] ?? '';
                
                // 如果配置了 source_data_source，说明是多数据源任务（如数据库同步）
                // 这种情况下，只需要创建源数据源适配器，目标数据源由 Handler 内部处理
                if (!empty($sourceDataSourceId)) {
                    $dataSourceId = $sourceDataSourceId;
                }
                
                // 从缓存或数据库获取数据源配置
                \Workerman\Worker::safeEcho("[DataSyncScheduler] 【步骤2-查询数据源配置】开始查询数据源配置: data_source_id={$dataSourceId}\n");
                $dataSourceConfig = $this->dataSourcesConfig[$dataSourceId] ?? null;
                
                // 如果缓存中没有，尝试从数据库加载
                if (empty($dataSourceConfig)) {
                    \Workerman\Worker::safeEcho("[DataSyncScheduler] 【步骤2-查询数据源配置】缓存中没有，从数据库加载: data_source_id={$dataSourceId}\n");
                    $dataSourceConfig = $this->dataSourceService->getDataSourceConfigById($dataSourceId);
                    if ($dataSourceConfig) {
                        // 更新缓存（使用原始 dataSourceId 作为 key）
                        $this->dataSourcesConfig[$dataSourceId] = $dataSourceConfig;
                        \Workerman\Worker::safeEcho("[DataSyncScheduler] 【步骤2-查询数据源配置】✓ 数据源配置加载成功: host={$dataSourceConfig['host']}, port={$dataSourceConfig['port']}, database={$dataSourceConfig['database']}\n");
                    } else {
                        \Workerman\Worker::safeEcho("[DataSyncScheduler] 【步骤2-查询数据源配置】✗ 数据源配置不存在: data_source_id={$dataSourceId}\n");
                        \Workerman\Worker::safeEcho("[DataSyncScheduler] 【步骤2-查询数据源配置】提示：请检查 data_sources 表中是否存在该数据源，或检查 name 字段是否匹配\n");
                    }
                } else {
                    \Workerman\Worker::safeEcho("[DataSyncScheduler] 【步骤2-查询数据源配置】✓ 从缓存获取数据源配置: host={$dataSourceConfig['host']}, port={$dataSourceConfig['port']}\n");
                }
                
                if (empty($dataSourceConfig)) {
                    throw new \InvalidArgumentException("数据源配置不存在: {$dataSourceId}");
                }

                // 创建数据源适配器
                \Workerman\Worker::safeEcho("[DataSyncScheduler] 【步骤3-创建数据源适配器】开始创建适配器: type={$dataSourceConfig['type']}\n");
                $adapter = DataSourceAdapterFactory::create(
                    $dataSourceConfig['type'],
                    $dataSourceConfig
                );

                // 确保适配器已连接
                if (!$adapter->isConnected()) {
                    \Workerman\Worker::safeEcho("[DataSyncScheduler] 【步骤3-创建数据源适配器】适配器未连接，尝试连接...\n");
                    if (!$adapter->connect($dataSourceConfig)) {
                        \Workerman\Worker::safeEcho("[DataSyncScheduler] 【步骤3-创建数据源适配器】✗ 连接失败: data_source_id={$dataSourceId}\n");
                        throw new \RuntimeException("无法连接到数据源: {$dataSourceId}");
                    }
                }
                \Workerman\Worker::safeEcho("[DataSyncScheduler] 【步骤3-创建数据源适配器】✓ 数据源适配器创建并连接成功\n");
            }

            // 创建业务处理类（处理逻辑在业务代码中）
            $handlerClass = $taskConfig['handler_class'] ?? '';
            \Workerman\Worker::safeEcho("[DataSyncScheduler] 【步骤4-创建Handler】开始创建Handler: handler_class={$handlerClass}\n");
            if (empty($handlerClass) || !class_exists($handlerClass)) {
                \Workerman\Worker::safeEcho("[DataSyncScheduler] 【步骤4-创建Handler】✗ Handler类不存在: {$handlerClass}\n");
                throw new \InvalidArgumentException("处理类不存在或未配置: {$handlerClass}");
            }

            // 实例化处理类
            $handler = new $handlerClass();
            
            // 检查处理类是否实现了采集接口
            if (!method_exists($handler, 'collect')) {
                \Workerman\Worker::safeEcho("[DataSyncScheduler] 【步骤4-创建Handler】✗ Handler未实现collect方法: {$handlerClass}\n");
                throw new \InvalidArgumentException("处理类必须实现 collect 方法: {$handlerClass}");
            }

            // 添加任务ID到配置中
            $taskConfig['task_id'] = $taskId;
            
            // 添加 Worker 信息到配置中（用于多进程数据库分配）
            $taskConfig['worker_id'] = $worker->id;
            $taskConfig['worker_count'] = $worker->count;

            \Workerman\Worker::safeEcho("[DataSyncScheduler] 【步骤4-创建Handler】✓ Handler创建成功，开始调用collect方法\n");
            // 调用业务处理类的采集方法
            try {
            $handler->collect($adapter, $taskConfig);
                \Workerman\Worker::safeEcho("[DataSyncScheduler] 【步骤4-创建Handler】✓ Handler.collect()方法执行完成\n");
            } catch (\Throwable $collectException) {
                \Workerman\Worker::safeEcho("[DataSyncScheduler] 【步骤4-创建Handler】✗ Handler.collect()方法执行失败: " . $collectException->getMessage() . "\n");
                \Workerman\Worker::safeEcho("[DataSyncScheduler] 【步骤4-创建Handler】异常堆栈: " . $collectException->getTraceAsString() . "\n");
                throw $collectException; // 重新抛出异常，让外层catch处理
            }

            LoggerHelper::logBusiness('data_collection_completed', [
                'task_id' => $taskId,
                'task_name' => $taskConfig['name'] ?? $taskId,
            ]);
        } catch (\Throwable $e) {
            // 在控制台输出异常信息，方便排查
            \Workerman\Worker::safeEcho("[DataSyncScheduler] 【异常捕获】任务执行失败: task_id={$taskId}, error=" . $e->getMessage() . "\n");
            \Workerman\Worker::safeEcho("[DataSyncScheduler] 【异常捕获】异常文件: " . $e->getFile() . ":" . $e->getLine() . "\n");
            \Workerman\Worker::safeEcho("[DataSyncScheduler] 【异常捕获】异常堆栈: " . $e->getTraceAsString() . "\n");
            
            LoggerHelper::logError($e, [
                'component' => 'DataSyncScheduler',
                'action' => 'executeTask',
                'task_id' => $taskId,
                'worker_id' => $worker->id,
            ]);
        } finally {
            // 释放锁（仅在使用锁的情况下）
            if (isset($useLock) && $useLock && isset($lockKey)) {
                RedisHelper::releaseLock($lockKey);
            }
        }
    }

    /**
     * 统一的任务启动方法
     * 
     * @param string $taskId 任务ID
     * @param array<string, mixed> $taskConfig 任务配置
     * @param Worker $worker Worker 实例
     * @return void
     */
    private function startTask(string $taskId, array $taskConfig, Worker $worker): void
    {
        $taskName = $taskConfig['name'] ?? $taskId;
        
        if ($taskConfig['mode'] === 'realtime') {
            // 实时模式：立即启动，持续运行
            \Workerman\Worker::safeEcho("[DataSyncScheduler] → 实时模式任务: [{$taskName}]\n");
            Timer::add(0, function () use ($taskId, $taskConfig, $worker) {
                $this->executeTask($taskId, $taskConfig, $worker);
            }, [], false);
            $this->runningTasks[$taskId] = true;
        } else {
            // 批量模式：根据调度配置执行
            \Workerman\Worker::safeEcho("[DataSyncScheduler] → 批量模式任务: [{$taskName}]\n");
            $schedule = $taskConfig['schedule'] ?? [];
            if (!($schedule['enabled'] ?? true)) {
                // 调度被禁用，立即执行一次
                \Workerman\Worker::safeEcho("[DataSyncScheduler] → 立即执行（调度已禁用）\n");
                Timer::add(0, function () use ($taskId, $taskConfig, $worker) {
                    $this->executeTask($taskId, $taskConfig, $worker);
                }, [], false);
            } else {
                // 使用 Cron 表达式定时执行
                $cronExpression = $schedule['cron'] ?? '*/5 * * * *';
                \Workerman\Worker::safeEcho("[DataSyncScheduler] → 定时执行，Cron: {$cronExpression}\n");
                $this->scheduleTask($taskId, $taskConfig, $cronExpression, $worker);
            }
        }
    }

    public function onWorkerStop(Worker $worker): void
    {
        LoggerHelper::logBusiness('data_collection_scheduler_stopped', [
            'worker_id' => $worker->id,
        ]);
    }
}
