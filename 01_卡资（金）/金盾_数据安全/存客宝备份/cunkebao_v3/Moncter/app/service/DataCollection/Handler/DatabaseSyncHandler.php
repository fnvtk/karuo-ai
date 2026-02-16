<?php

namespace app\service\DataCollection\Handler;

use app\service\DataSource\DataSourceAdapterInterface;
use app\service\DatabaseSyncService;
use app\service\DataSourceService;
use app\repository\DataSourceRepository;
use app\utils\LoggerHelper;
use MongoDB\Client;

/**
 * 数据库同步采集处理类
 * 
 * 职责：
 * - 从源数据库同步数据到目标数据库
 * - 支持全量同步和增量同步（Change Streams）
 * - 处理同步进度和错误恢复
 */
class DatabaseSyncHandler
{
    private DatabaseSyncService $syncService;
    private array $taskConfig;
    private int $progressTimerId = 0; // 进度日志定时器ID

    /**
     * 采集/同步数据库
     * 
     * @param DataSourceAdapterInterface $adapter 数据源适配器（源数据库）
     * @param array<string, mixed> $taskConfig 任务配置
     * @return void
     */
    public function collect(DataSourceAdapterInterface $adapter, array $taskConfig): void
    {
        $this->taskConfig = $taskConfig;
        $taskId = $taskConfig['task_id'] ?? '';
        $taskName = $taskConfig['name'] ?? '数据库同步';

        LoggerHelper::logBusiness('database_sync_collection_started', [
            'task_id' => $taskId,
            'task_name' => $taskName,
        ]);
        // 控制台直接输出一条提示，方便在启动时观察数据库同步任务是否真正开始执行
        error_log("[DatabaseSyncHandler] 数据库同步任务已启动：task_id={$taskId}, task_name={$taskName}");

        try {
            // 创建 DatabaseSyncService（使用任务配置中的源和目标数据源）
            $this->syncService = $this->createSyncService($taskConfig);

            // 获取要同步的数据库列表
            $databases = $this->getDatabasesToSync($taskConfig);

            if (empty($databases)) {
                LoggerHelper::logBusiness('database_sync_no_databases', [
                    'task_id' => $taskId,
                    'message' => '没有找到要同步的数据库',
                ]);
                return;
            }

            // 启动进度日志定时器（定期输出同步进度）
            $this->startProgressTimer($taskConfig);

            // 是否执行全量同步（从业务配置中获取）
            $businessConfig = $this->getBusinessConfig();
            $fullSyncEnabled = $businessConfig['change_stream']['full_sync_on_start'] ?? false;
            
            if ($fullSyncEnabled) {
                // 执行全量同步
                $this->performFullSync($databases, $taskConfig);
            }

            // 启动增量同步监听（Change Streams）
            $this->startIncrementalSync($databases, $taskConfig);

        } catch (\Throwable $e) {
            LoggerHelper::logError($e, [
                'component' => 'DatabaseSyncHandler',
                'action' => 'collect',
                'task_id' => $taskId,
            ]);
            throw $e;
        }
    }

    /**
     * 获取业务配置（从独立配置文件或使用默认值）
     * 
     * @return array<string, mixed> 业务配置
     */
    private function getBusinessConfig(): array
    {
        // 可以从独立配置文件读取，或使用默认值
        // 这里使用默认值，业务逻辑统一在代码中管理
        return [
            // 数据库同步配置
            'databases' => [], // 空数组表示同步所有数据库
            'exclude_databases' => ['admin', 'local', 'config'], // 排除的系统数据库
            'exclude_collections' => ['system.profile', 'system.js'], // 排除的系统集合
            
            // Change Streams 配置
            'change_stream' => [
                'batch_size' => 100,
                'max_await_time_ms' => 1000,
                'full_sync_on_start' => true, // 首次启动时是否执行全量同步
                'full_sync_batch_size' => 1000,
            ],
            
            // 重试配置
            'retry' => [
                'max_connect_retries' => 10,
                'retry_interval' => 5,
                'max_sync_retries' => 3,
                'sync_retry_interval' => 2,
            ],
            
            // 性能配置
            'performance' => [
                'concurrent_databases' => 5,
                'concurrent_collections' => 10,
                'batch_write_size' => 5000,
                // 为了让断点续传逻辑简单可靠，这里关闭集合级并行同步
                // 后续如果需要再做更复杂的分片断点策略，可以重新打开
                'enable_parallel_sync' => false,
                'max_parallel_tasks_per_collection' => 4,
                'documents_per_task' => 100000,
            ],
            
            // 监控配置
            'monitoring' => [
                'log_sync' => true,
                'log_detail' => false,
                'stats_interval' => 10, // 每10秒输出一次进度日志
            ],
        ];
    }

    /**
     * 创建 DatabaseSyncService 实例
     * 
     * @param array<string, mixed> $taskConfig 任务配置
     * @return DatabaseSyncService
     */
    private function createSyncService(array $taskConfig): DatabaseSyncService
    {
        // 从数据库获取源和目标数据源配置
        $dataSourceService = new DataSourceService(new DataSourceRepository());
        $sourceDataSourceId = $taskConfig['source_data_source'] ?? 'kr_mongodb';
        $targetDataSourceId = $taskConfig['target_data_source'] ?? 'sync_mongodb';

        $sourceConfig = $dataSourceService->getDataSourceConfigById($sourceDataSourceId);
        $targetConfig = $dataSourceService->getDataSourceConfigById($targetDataSourceId);

        if (empty($sourceConfig) || empty($targetConfig)) {
            throw new \InvalidArgumentException("数据源配置不存在: source={$sourceDataSourceId}, target={$targetDataSourceId}");
        }

        // 获取业务配置（统一在代码中管理）
        $businessConfig = $this->getBusinessConfig();

        // 构建同步配置
        $syncConfig = [
            'enabled' => true,
            'source' => [
                'host' => $sourceConfig['host'],
                'port' => $sourceConfig['port'],
                'username' => $sourceConfig['username'] ?? '',
                'password' => $sourceConfig['password'] ?? '',
                'auth_source' => $sourceConfig['auth_source'] ?? 'admin',
                'options' => array_merge([
                    'connectTimeoutMS' => 10000,
                    'socketTimeoutMS' => 30000,
                    'serverSelectionTimeoutMS' => 10000,
                    'heartbeatFrequencyMS' => 10000,
                ], $sourceConfig['options'] ?? []),
            ],
            'target' => [
                'host' => $targetConfig['host'],
                'port' => $targetConfig['port'],
                'username' => $targetConfig['username'] ?? '',
                'password' => $targetConfig['password'] ?? '',
                'auth_source' => $targetConfig['auth_source'] ?? 'admin',
                'options' => array_merge([
                    'connectTimeoutMS' => 10000,
                    'socketTimeoutMS' => 30000,
                    'serverSelectionTimeoutMS' => 10000,
                ], $targetConfig['options'] ?? []),
            ],
            'sync' => [
                'databases' => $businessConfig['databases'],
                'exclude_databases' => $businessConfig['exclude_databases'],
                'exclude_collections' => $businessConfig['exclude_collections'],
                'change_stream' => $businessConfig['change_stream'],
                'retry' => $businessConfig['retry'],
                'performance' => $businessConfig['performance'],
            ],
            'monitoring' => $businessConfig['monitoring'],
        ];

        // 直接传递配置给 DatabaseSyncService 构造函数
        return new DatabaseSyncService($syncConfig);
    }

    /**
     * 获取要同步的数据库列表
     * 
     * @param array<string, mixed> $taskConfig 任务配置
     * @return array<string> 数据库名称列表
     */
    private function getDatabasesToSync(array $taskConfig): array
    {
        return $this->syncService->getDatabasesToSync();
    }

    /**
     * 执行全量同步（支持多进程数据库级并行）
     * 
     * @param array<string> $databases 数据库列表
     * @param array<string, mixed> $taskConfig 任务配置
     * @return void
     */
    private function performFullSync(array $databases, array $taskConfig): void
    {
        // 获取 Worker 信息（用于多进程分配）
        $workerId = $taskConfig['worker_id'] ?? 0;
        $workerCount = $taskConfig['worker_count'] ?? 1;
        
        // 分配数据库给当前 Worker（负载均衡算法）
        $assignedDatabases = $this->assignDatabasesToWorker($databases, $workerId, $workerCount);
        
        LoggerHelper::logBusiness('database_sync_full_sync_start', [
            'worker_id' => $workerId,
            'worker_count' => $workerCount,
            'total_databases' => count($databases),
            'assigned_databases' => $assignedDatabases,
            'assigned_count' => count($assignedDatabases),
        ]);

        foreach ($assignedDatabases as $databaseName) {
            try {
                $this->syncService->fullSyncDatabase($databaseName);
            } catch (\Throwable $e) {
                LoggerHelper::logError($e, [
                    'component' => 'DatabaseSyncHandler',
                    'action' => 'performFullSync',
                    'database' => $databaseName,
                    'worker_id' => $workerId,
                ]);
                // 继续同步其他数据库
            }
        }

        LoggerHelper::logBusiness('database_sync_full_sync_completed', [
            'worker_id' => $workerId,
            'databases' => $assignedDatabases,
        ]);
    }
    
    /**
     * 分配数据库给当前 Worker（负载均衡算法）
     * 
     * 策略：
     * 1. 按数据库大小排序（小库优先，提升完成感）
     * 2. 使用贪心算法：每次分配给当前负载最小的 Worker
     * 3. 考虑 Worker 当前处理的数据库数量
     * 
     * @param array<string> $databases 数据库列表（已按大小排序）
     * @param int $workerId 当前 Worker ID
     * @param int $workerCount Worker 总数
     * @return array<string> 分配给当前 Worker 的数据库列表
     */
    private function assignDatabasesToWorker(array $databases, int $workerId, int $workerCount): array
    {
        // 如果只有一个 Worker，返回所有数据库
        if ($workerCount <= 1) {
            return $databases;
        }
        
        // 方案A：简单取模分配（快速实现）
        // 适用于数据库数量较多且大小相近的场景
        $assignedDatabases = [];
        foreach ($databases as $index => $databaseName) {
            if ($index % $workerCount === $workerId) {
                $assignedDatabases[] = $databaseName;
            }
        }
        
        // 方案B：负载均衡分配（推荐，但需要数据库大小信息）
        // 由于 getDatabasesToSync 已经按大小排序，简单取模即可实现较好的负载均衡
        // 如果后续需要更精确的负载均衡，可以从 DatabaseSyncService 获取数据库大小信息
        
        return $assignedDatabases;
    }

    /**
     * 启动增量同步监听（支持多进程数据库级并行）
     * 
     * @param array<string> $databases 数据库列表
     * @param array<string, mixed> $taskConfig 任务配置
     * @return void
     */
    private function startIncrementalSync(array $databases, array $taskConfig): void
    {
        // 获取 Worker 信息（用于多进程分配）
        $workerId = $taskConfig['worker_id'] ?? 0;
        $workerCount = $taskConfig['worker_count'] ?? 1;
        
        // 分配数据库给当前 Worker（与全量同步使用相同的分配策略）
        $assignedDatabases = $this->assignDatabasesToWorker($databases, $workerId, $workerCount);
        
        LoggerHelper::logBusiness('database_sync_incremental_sync_start', [
            'worker_id' => $workerId,
            'worker_count' => $workerCount,
            'total_databases' => count($databases),
            'assigned_databases' => $assignedDatabases,
            'assigned_count' => count($assignedDatabases),
        ]);

        // 为分配给当前 Worker 的数据库启动监听（在后台进程中）
        foreach ($assignedDatabases as $databaseName) {
            // 使用 Timer 在后台启动监听，避免阻塞
            \Workerman\Timer::add(0, function () use ($databaseName) {
                try {
                    $this->syncService->watchDatabase($databaseName);
                } catch (\Throwable $e) {
                    LoggerHelper::logError($e, [
                        'component' => 'DatabaseSyncHandler',
                        'action' => 'startIncrementalSync',
                        'database' => $databaseName,
                    ]);
                    
                    // 重试逻辑（从业务配置中获取）
                    $businessConfig = $this->getBusinessConfig();
                    $retryConfig = $businessConfig['retry'] ?? [];
                    $maxRetries = $retryConfig['max_connect_retries'] ?? 10;
                    $retryInterval = $retryConfig['retry_interval'] ?? 5;
                    
                    static $retryCount = [];
                    if (!isset($retryCount[$databaseName])) {
                        $retryCount[$databaseName] = 0;
                    }
                    
                    if ($retryCount[$databaseName] < $maxRetries) {
                        $retryCount[$databaseName]++;
                        \Workerman\Timer::add($retryInterval, function () use ($databaseName) {
                            $this->startIncrementalSync([$databaseName], $this->taskConfig);
                        }, [], false);
                    }
                }
            }, [], false);
        }
    }

    /**
     * 启动进度日志定时器
     * 
     * @param array<string, mixed> $taskConfig 任务配置
     * @return void
     */
    private function startProgressTimer(array $taskConfig): void
    {
        $businessConfig = $this->getBusinessConfig();
        $statsInterval = $businessConfig['monitoring']['stats_interval'] ?? 10; // 默认10秒输出一次进度

        // 使用 Workerman Timer 定期输出进度
        $this->progressTimerId = \Workerman\Timer::add($statsInterval, function () use ($taskConfig) {
            try {
                // 重新加载最新进度（从文件读取）
                $this->syncService->loadProgress();
                $progress = $this->syncService->getProgress();
                $stats = $this->syncService->getStats();

                // 输出格式化的进度信息
                $progressInfo = [
                    'task_id' => $taskConfig['task_id'] ?? '',
                    'task_name' => $taskConfig['name'] ?? '数据库同步',
                    'status' => $progress['status'],
                    'progress_percent' => $progress['progress_percent'] . '%',
                    'current_database' => $progress['current_database'] ?? '无',
                    'current_collection' => $progress['current_collection'] ?? '无',
                    'databases' => "{$progress['databases']['completed']}/{$progress['databases']['total']}",
                    'collections' => "{$progress['collections']['completed']}/{$progress['collections']['total']}",
                    'documents' => "{$progress['documents']['processed']}/{$progress['documents']['total']}",
                    'documents_inserted' => $stats['documents_inserted'],
                    'documents_updated' => $stats['documents_updated'],
                    'documents_deleted' => $stats['documents_deleted'],
                    'errors' => $stats['errors'],
                    'elapsed_time' => round($progress['time']['elapsed_seconds'], 2) . 's',
                    'estimated_remaining' => $progress['time']['estimated_remaining_seconds'] 
                        ? round($progress['time']['estimated_remaining_seconds'], 2) . 's' 
                        : '计算中...',
                ];

                // 输出到日志
                LoggerHelper::logBusiness('database_sync_progress_report', $progressInfo);

                // 如果状态是错误，输出错误信息
                if ($progress['status'] === 'error' && isset($progress['last_error'])) {
                    LoggerHelper::logBusiness('database_sync_error_info', [
                        'error_message' => $progress['last_error']['message'] ?? '未知错误',
                        'error_database' => $progress['error_database'] ?? '未知',
                        'error_collection' => $progress['last_error']['collection'] ?? '未知',
                    ]);
                }
            } catch (\Throwable $e) {
                LoggerHelper::logError($e, [
                    'component' => 'DatabaseSyncHandler',
                    'action' => 'startProgressTimer',
                ]);
            }
        });
    }

    /**
     * 停止进度日志定时器
     * 
     * @return void
     */
    public function stopProgressTimer(): void
    {
        if ($this->progressTimerId > 0) {
            \Workerman\Timer::del($this->progressTimerId);
            $this->progressTimerId = 0;
        }
    }
}

