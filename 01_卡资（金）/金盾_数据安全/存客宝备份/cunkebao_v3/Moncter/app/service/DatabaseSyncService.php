<?php

namespace app\service;

use app\utils\LoggerHelper;
use MongoDB\Client;
use MongoDB\Collection;
use MongoDB\Database;
use MongoDB\Driver\Exception\Exception as MongoDBException;
use MongoDB\Model\ChangeStreamIterator;

/**
 * 数据库同步服务
 * 
 * 职责：
 * - 处理数据库之间的实时同步
 * - 使用 MongoDB Change Streams 监听源数据库变化
 * - 将变化同步到目标数据库
 */
class DatabaseSyncService
{
    private ?Client $sourceClient = null;
    private ?Client $targetClient = null;
    private array $config;
    private array $stats = [
        'databases' => 0,
        'collections' => 0,
        'documents_inserted' => 0,
        'documents_updated' => 0,
        'documents_deleted' => 0,
        'errors' => 0,
        'last_sync_time' => null,
    ];
    // 同步进度信息
    private array $progress = [
        'status' => 'idle', // idle, full_sync, incremental_sync, error
        'current_database' => null,
        'current_collection' => null,
        'databases_total' => 0,
        'databases_completed' => 0,
        'collections_total' => 0,
        'collections_completed' => 0,
        // 文档级进度（行数）
        'documents_total' => 0,
        'documents_processed' => 0,
        // 数据量级进度（基于 collStats / dbStats 估算的字节数）
        'bytes_total' => 0,
        // 已经清空过的目标数据库列表，避免重复清空影响断点续传
        'cleared_databases' => [],
        // 源端数据库的集合快照（用于检测“同名库但结构已变更/被重建”的情况）
        // 结构示例：'collections_snapshot' => ['KR' => ['coll1', 'coll2', ...]]
        'collections_snapshot' => [],
        // 在历史进度中出现过，但当前源库已不存在的数据库（用于给出提醒）
        'orphan_databases' => [],
        // 断点续传检查点：按数据库/集合记录最后一个处理的 _id 和已处理数量
        // 结构示例：
        // 'checkpoints' => [
        //     'KR_腾讯' => [
        //         '某集合名' => [
        //             'last_id' => 'xxx',
        //             'processed' => 123,
        //             'completed' => false,
        //         ],
        //     ],
        // ],
        'checkpoints' => [],
        // bytes_processed 不单独持久化，在 getProgress 中按 documents 比例动态估算
        'start_time' => null,
        'current_database_start_time' => null,
        'estimated_time_remaining' => null,
        'last_error' => null, // 记录最后一次错误信息
        'error_database' => null, // 出错的数据库名称
    ];

    /**
     * 构造函数
     * 
     * @param array<string, mixed>|null $config 配置数组，必须包含 'source' 和 'target' 数据库配置
     *                                           如果为 null 或配置无效，将跳过数据库连接初始化（仅用于读取进度文件）
     *                                           注意：config('database_sync') 已废弃，必须通过 DatabaseSyncHandler 传递配置
     * 
     * @throws \InvalidArgumentException 如果配置为 null 且无效
     */
    public function __construct(?array $config = null)
    {
        if ($config === null) {
            throw new \InvalidArgumentException(
                'DatabaseSyncService 必须传递配置参数。' .
                'config(\'database_sync\') 已废弃，请使用 DatabaseSyncHandler 传递配置。'
            );
        }
        $this->config = $config;
        
        try {
            // 只有在配置有效时才初始化数据库连接（用于查询进度时可能不需要连接）
            if ($this->hasValidConfig()) {
                $this->initClients();
                LoggerHelper::logBusiness('database_sync_service_initialized', [
                    'source' => $this->config['source']['host'] . ':' . $this->config['source']['port'],
                    'target' => $this->config['target']['host'] . ':' . $this->config['target']['port'],
                ]);
            }
            $this->loadProgress();
        } catch (\Exception $e) {
            LoggerHelper::logError($e, [
                'action' => 'database_sync_service_init_error',
            ]);
            throw $e;
        }
    }

    /**
     * 检查配置是否有效（用于判断是否需要初始化数据库连接）
     * 
     * @return bool
     */
    private function hasValidConfig(): bool
    {
        $sourceHost = $this->config['source']['host'] ?? '';
        $sourcePort = $this->config['source']['port'] ?? 0;
        $targetHost = $this->config['target']['host'] ?? '';
        $targetPort = $this->config['target']['port'] ?? 0;
        
        return !empty($sourceHost) && $sourcePort > 0 && !empty($targetHost) && $targetPort > 0;
    }

    /**
     * 初始化数据库连接
     */
    private function initClients(): void
    {
        // 源数据库连接
        $sourceConfig = $this->config['source'];
        $sourceDsn = $this->buildDsn($sourceConfig);
        $this->sourceClient = new Client($sourceDsn, $sourceConfig['options']);

        // 目标数据库连接
        $targetConfig = $this->config['target'];
        $targetDsn = $this->buildDsn($targetConfig);
        $this->targetClient = new Client($targetDsn, $targetConfig['options']);

        LoggerHelper::logBusiness('database_sync_clients_initialized', [
            'source' => $sourceConfig['host'] . ':' . $sourceConfig['port'],
            'target' => $targetConfig['host'] . ':' . $targetConfig['port'],
        ]);
    }

    /**
     * 构建 MongoDB DSN
     */
    private function buildDsn(array $config): string
    {
        // 验证必需的配置项
        $host = $config['host'] ?? '';
        $port = $config['port'] ?? 0;
        
        if (empty($host)) {
            throw new \InvalidArgumentException(
                'MongoDB host 配置为空。请设置环境变量 DB_SYNC_SOURCE_HOST 和 DB_SYNC_TARGET_HOST'
            );
        }
        
        if (empty($port) || $port <= 0) {
            throw new \InvalidArgumentException(
                'MongoDB port 配置无效。请设置环境变量 DB_SYNC_SOURCE_PORT 和 DB_SYNC_TARGET_PORT'
            );
        }
        
        $dsn = 'mongodb://';
        if (!empty($config['username']) && !empty($config['password'])) {
            $dsn .= urlencode($config['username']) . ':' . urlencode($config['password']) . '@';
        }
        $dsn .= $host . ':' . $port;
        if (!empty($config['auth_source'])) {
            $dsn .= '/?authSource=' . urlencode($config['auth_source']);
        }
        return $dsn;
    }

    /**
     * 获取要同步的数据库列表
     */
    public function getDatabasesToSync(): array
    {
        try {
            $databases = $this->sourceClient->listDatabases();
            $databasesToSync = [];
            // 记录每个数据库的大致大小，用于排序（小库优先同步）
            $databaseSizes = [];
            $excludeDatabases = $this->config['sync']['exclude_databases'] ?? [];

            $currentDbNames = [];
            foreach ($databases as $databaseInfo) {
                $dbName = (string)$databaseInfo->getName();
                $currentDbNames[] = $dbName;

                // 记录源端数据库的大致大小（单位：字节），用于后续排序
                try {
                    $sizeOnDisk = method_exists($databaseInfo, 'getSizeOnDisk')
                        ? (int)$databaseInfo->getSizeOnDisk()
                        : 0;
                    $databaseSizes[$dbName] = $sizeOnDisk;
                } catch (\Throwable $e) {
                    $databaseSizes[$dbName] = 0;
                }
                
                // 排除系统数据库
                if (in_array($dbName, $excludeDatabases)) {
                    continue;
                }

                // 如果指定了要同步的数据库列表，只同步列表中的
                $syncDatabases = $this->config['sync']['databases'] ?? [];
                if (!empty($syncDatabases) && !in_array($dbName, $syncDatabases)) {
                    continue;
                }

                $databasesToSync[] = $dbName;
            }

            // 检测历史进度中曾经同步过，但当前源库已不存在的“孤儿数据库”
            $knownDbNames = array_keys($this->progress['collections_snapshot'] ?? []);
            $orphanDatabases = $this->progress['orphan_databases'] ?? [];
            foreach ($knownDbNames as $knownDb) {
                if (!in_array($knownDb, $currentDbNames, true) && !in_array($knownDb, $orphanDatabases, true)) {
                    $orphanDatabases[] = $knownDb;
                    LoggerHelper::logBusiness('database_sync_source_database_missing', [
                        'database' => $knownDb,
                    ], 'warning');
                }
            }
            $this->progress['orphan_databases'] = $orphanDatabases;

            // 更新进度信息
            // 根据数据库大小排序：小的优先同步，便于尽快完成更多库，提高“完成感”
            usort($databasesToSync, function (string $a, string $b) use ($databaseSizes): int {
                $sizeA = $databaseSizes[$a] ?? PHP_INT_MAX;
                $sizeB = $databaseSizes[$b] ?? PHP_INT_MAX;
                if ($sizeA === $sizeB) {
                    return strcmp($a, $b);
                }
                return $sizeA <=> $sizeB;
            });

            $this->progress['databases_total'] = count($databasesToSync);
            // 如果是首次获取数据库列表（start_time 为空），才重置 completed 计数，
            // 避免在进程中途多次调用时把已完成的统计清零。
            if ($this->progress['start_time'] === null) {
                $this->progress['databases_completed'] = 0;
            }
            if ($this->progress['start_time'] === null) {
                $this->progress['start_time'] = microtime(true);
            }
            $this->saveProgress();

            return $databasesToSync;
        } catch (MongoDBException $e) {
            LoggerHelper::logError($e, [
                'action' => 'database_sync_list_databases_error',
            ]);
            return [];
        }
    }

    /**
     * 确保目标数据库存在，如果不存在则创建
     */
    private function ensureTargetDatabaseExists(string $databaseName): void
    {
        try {
            // 检查目标数据库是否存在
            $targetDatabases = $this->targetClient->listDatabases();
            $databaseExists = false;
            
            foreach ($targetDatabases as $dbInfo) {
                if ($dbInfo->getName() === $databaseName) {
                    $databaseExists = true;
                    break;
                }
            }
            
            // 如果数据库不存在，创建一个临时集合并插入一条记录来触发数据库创建
            if (!$databaseExists) {
                $targetDb = $this->targetClient->selectDatabase($databaseName);
                $tempCollection = $targetDb->selectCollection('__temp_sync_init__');
                
                // 插入一条临时记录来创建数据库
                $tempCollection->insertOne(['_created' => new \MongoDB\BSON\UTCDateTime()]);
                
                // 删除临时集合
                $tempCollection->drop();
                
                LoggerHelper::logBusiness('database_sync_database_created', [
                    'database' => $databaseName,
                    'target' => $this->config['target']['host'] . ':' . $this->config['target']['port'],
                ]);
            }
        } catch (MongoDBException $e) {
            LoggerHelper::logError($e, [
                'action' => 'database_sync_ensure_database_error',
                'database' => $databaseName,
            ]);
            // 不抛出异常，继续执行同步（MongoDB 会在第一次插入时自动创建数据库）
        }
    }

    /**
     * 清空目标数据库（用于全量同步前的初始化）
     * 
     * 注意：
     * - 仅在首次同步该数据库时调用（通过 progress.cleared_databases 控制）
     * - 后续断点续传时不会再次清空，避免丢失已同步的数据
     */
    private function clearTargetDatabase(string $databaseName): void
    {
        try {
            $targetDb = $this->targetClient->selectDatabase($databaseName);
            $targetDb->drop();

            LoggerHelper::logBusiness('database_sync_target_database_cleared', [
                'database' => $databaseName,
                'target' => $this->config['target']['host'] . ':' . $this->config['target']['port'],
            ]);
        } catch (MongoDBException $e) {
            LoggerHelper::logError($e, [
                'action' => 'database_sync_clear_target_error',
                'database' => $databaseName,
            ]);
            // 清空失败属于严重问题，这里抛出异常，避免在脏数据基础上继续同步
            throw $e;
        }
    }

    /**
     * 全量同步数据库
     */
    public function fullSyncDatabase(string $databaseName): bool
    {
        try {
            // 更新进度状态
            if ($this->progress['start_time'] === null) {
                $this->progress['start_time'] = microtime(true);
            }
            $this->progress['status'] = 'full_sync';
            $this->progress['current_database'] = $databaseName;
            $this->progress['current_database_start_time'] = microtime(true);
            $this->saveProgress();
            
            LoggerHelper::logBusiness('database_sync_database_start', [
                'database' => $databaseName,
                'status' => 'full_sync',
            ]);

            // 确保目标数据库存在
            $this->ensureTargetDatabaseExists($databaseName);

            // 如果尚未清空过该目标数据库，则执行一次清空（适用于你当前“目标库可以清空”的场景）
            $clearedDatabases = $this->progress['cleared_databases'] ?? [];
            if (!in_array($databaseName, $clearedDatabases, true)) {
                $this->clearTargetDatabase($databaseName);
                $clearedDatabases[] = $databaseName;
                $this->progress['cleared_databases'] = $clearedDatabases;
                $this->saveProgress();
            }

            $sourceDb = $this->sourceClient->selectDatabase($databaseName);
            $targetDb = $this->targetClient->selectDatabase($databaseName);

            // 获取所有集合
            $collections = $sourceDb->listCollections();
            $batchSize = $this->config['sync']['change_stream']['full_sync_batch_size'] ?? 1000;
            $excludeCollections = $this->config['sync']['exclude_collections'] ?? [];

            // 统计集合总数，同时预估总文档数和总数据量（用于更精确的进度估算）
            $collectionList = [];
            $totalDocuments = 0;
            $totalBytes = 0;

            foreach ($collections as $collectionInfo) {
                $collectionName = $collectionInfo->getName();
                if (in_array($collectionName, $excludeCollections)) {
                    continue;
                }

                $collectionList[] = $collectionName;

                try {
                    // 使用 collStats 获取集合的文档数和大小
                    $statsCursor = $sourceDb->command(['collStats' => $collectionName]);
                    $statsArray = $statsCursor->toArray();
                    $collStats = $statsArray[0] ?? [];

                    $collCount = (int)($collStats['count'] ?? 0);
                    $collSizeBytes = (int)($collStats['size'] ?? 0);

                    $totalDocuments += $collCount;
                    $totalBytes += $collSizeBytes;
                } catch (MongoDBException $e) {
                    // 单个集合统计失败不影响整体同步，只记录日志
                    LoggerHelper::logError($e, [
                        'action' => 'database_sync_collstats_error',
                        'database' => $databaseName,
                        'collection' => $collectionName,
                    ]);
                }
            }

            // 按名称排序，便于与历史快照稳定对比
            sort($collectionList);

            // 检测同名数据库结构是否发生重大变化（例如：被删除后重建）
            $collectionsSnapshot = $this->progress['collections_snapshot'] ?? [];
            $previousSnapshot = $collectionsSnapshot[$databaseName] ?? null;
            if ($previousSnapshot !== null && $previousSnapshot !== $collectionList) {
                // 源库结构变化：为了避免旧 checkpoint 导致数据不一致，将该库视为“新库”，重新清空目标并丢弃旧断点
                LoggerHelper::logBusiness('database_sync_source_schema_changed', [
                    'database' => $databaseName,
                    'previous_collections' => $previousSnapshot,
                    'current_collections' => $collectionList,
                ], 'warning');

                // 重新清空目标库
                $this->clearTargetDatabase($databaseName);
                // 丢弃该库的旧断点
                unset($this->progress['checkpoints'][$databaseName]);
                // 标记为已清空
                $clearedDatabases = $this->progress['cleared_databases'] ?? [];
                if (!in_array($databaseName, $clearedDatabases, true)) {
                    $clearedDatabases[] = $databaseName;
                }
                $this->progress['cleared_databases'] = $clearedDatabases;
            }

            // 记录当前集合快照
            $collectionsSnapshot[$databaseName] = $collectionList;
            $this->progress['collections_snapshot'] = $collectionsSnapshot;

            $this->progress['collections_total'] = count($collectionList);
            $this->progress['collections_completed'] = 0;
            // 为整个数据库预先写入总文档数和总数据量（按库维度估算进度）
            if ($totalDocuments > 0) {
                $this->progress['documents_total'] = $totalDocuments;
            }
            if ($totalBytes > 0) {
                $this->progress['bytes_total'] = $totalBytes;
            }
            // 每次开始全量同步时重置已处理文档数
            $this->progress['documents_processed'] = 0;
            $this->saveProgress();

            // 根据配置决定是否并行同步集合
            $enableParallel = $this->config['sync']['performance']['enable_parallel_sync'] ?? true;
            $concurrentCollections = $this->config['sync']['performance']['concurrent_collections'] ?? 10;

            if ($enableParallel && count($collectionList) > 1) {
                // 并行同步多个集合
                $this->syncCollectionsParallel($sourceDb, $targetDb, $collectionList, $databaseName, $batchSize, $concurrentCollections);
            } else {
                // 顺序同步集合
                foreach ($collectionList as $collectionName) {
                    $this->syncCollection($sourceDb, $targetDb, $collectionName, $databaseName, $batchSize);
                }
            }

            $this->stats['databases']++;
            $this->progress['databases_completed']++;
            $this->progress['current_database'] = null;
            $this->progress['current_collection'] = null;
            $this->saveProgress();

            return true;
        } catch (MongoDBException $e) {
            // 记录错误信息，但不停止整个同步流程
            $errorMessage = $e->getMessage();
            $this->progress['status'] = 'error';
            $this->progress['last_error'] = [
                'message' => $errorMessage,
                'database' => $databaseName,
                'collection' => $this->progress['current_collection'],
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'time' => date('Y-m-d H:i:s'),
            ];
            $this->progress['error_database'] = $databaseName;
            $this->saveProgress();
            
            LoggerHelper::logError($e, [
                'action' => 'database_sync_full_sync_error',
                'database' => $databaseName,
                'collection' => $this->progress['current_collection'],
            ]);
            $this->stats['errors']++;
            
            // 不返回 false，让调用者决定是否继续同步其他数据库
            // 这样可以跳过有问题的数据库，继续同步其他数据库
            return false;
        }
    }

    /**
     * 同步单个集合（支持大数据量分片）
     * 
     * 错误隔离：集合级错误不会影响其他集合的同步
     */
    private function syncCollection(Database $sourceDb, Database $targetDb, string $collectionName, string $databaseName, int $batchSize): void
    {
        $this->progress['current_collection'] = $collectionName;
        $this->saveProgress();

        LoggerHelper::logBusiness('database_sync_full_sync_collection_start', [
            'database' => $databaseName,
            'collection' => $collectionName,
        ]);

        try {
            $sourceCollection = $sourceDb->selectCollection($collectionName);
            $targetCollection = $targetDb->selectCollection($collectionName);

            // 统计当前集合文档总数（用于分片和日志），但不再覆盖全局 documents_total，
            // 全库的总文档数在 fullSyncDatabase 中基于 collStats 预估
            $totalDocuments = $sourceCollection->countDocuments([]);

            // 检查是否需要分片处理（大数据量）
            $documentsPerTask = $this->config['sync']['performance']['documents_per_task'] ?? 100000;
            $enableParallel = $this->config['sync']['performance']['enable_parallel_sync'] ?? true;
            $maxParallelTasks = $this->config['sync']['performance']['max_parallel_tasks_per_collection'] ?? 4;

            if ($enableParallel && $totalDocuments > $documentsPerTask && $maxParallelTasks > 1) {
                // 大数据量集合，使用分片并行处理
                $this->syncCollectionParallel($sourceCollection, $targetCollection, $collectionName, $databaseName, $batchSize, $totalDocuments, $maxParallelTasks);
            } else {
                // 小数据量集合，直接同步
                $this->syncCollectionSequential($sourceCollection, $targetCollection, $collectionName, $databaseName, $batchSize);
            }

            LoggerHelper::logBusiness('database_sync_full_sync_collection_complete', [
                'database' => $databaseName,
                'collection' => $collectionName,
                'count' => $totalDocuments,
            ]);

            $this->stats['collections']++;
            $this->progress['collections_completed']++;
        } catch (\Throwable $e) {
            // 集合级错误隔离：记录错误但继续同步其他集合
            LoggerHelper::logError($e, [
                'action' => 'database_sync_collection_error',
                'database' => $databaseName,
                'collection' => $collectionName,
            ]);
            
            $this->stats['errors']++;
            
            // 记录集合级错误到进度文件
            $this->progress['last_error'] = [
                'message' => $e->getMessage(),
                'database' => $databaseName,
                'collection' => $collectionName,
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'time' => date('Y-m-d H:i:s'),
            ];
            
            // 仍然标记集合为已完成（跳过），继续同步其他集合
            $this->stats['collections']++;
            $this->progress['collections_completed']++;
        } finally {
            $this->progress['current_collection'] = null;
            $this->saveProgress();
        }
    }

    /**
     * 顺序同步集合（小数据量）
     */
    private function syncCollectionSequential(Collection $sourceCollection, Collection $targetCollection, string $collectionName, string $databaseName, int $batchSize): void
    {
        // 从断点读取上次同步位置（基于 _id 断点）
        $checkpoint = $this->progress['checkpoints'][$databaseName][$collectionName] ?? null;
        $lastId = $checkpoint['last_id'] ?? null;

        $filter = [];
        if ($lastId) {
            try {
                $filter['_id'] = ['$gt' => new \MongoDB\BSON\ObjectId($lastId)];
            } catch (\Throwable $e) {
                // 如果 last_id 无法解析为 ObjectId，则退回全量同步
                LoggerHelper::logError($e, [
                    'action' => 'database_sync_invalid_checkpoint_id',
                    'database' => $databaseName,
                    'collection' => $collectionName,
                    'last_id' => $lastId,
                ]);
                $filter = [];
            }
        }

        $options = [
            'batchSize' => $batchSize,
            // 确保按 _id 递增，便于基于 _id 做断点续传
            'sort' => ['_id' => 1],
        ];

        $cursor = $sourceCollection->find($filter, $options);
        $batch = [];
        $lastProgressLogTime = time();

        foreach ($cursor as $document) {
            $batch[] = $document;

            if (count($batch) >= $batchSize) {
                $this->batchInsert($targetCollection, $batch);
                $batchCount = count($batch);
                $this->progress['documents_processed'] += $batchCount;

                // 记录本批次最后一个文档的 _id 作为断点
                $lastDoc = end($batch);
                if (isset($lastDoc['_id'])) {
                    $this->progress['checkpoints'][$databaseName][$collectionName] = [
                        'last_id' => (string)$lastDoc['_id'],
                        'processed' => ($this->progress['checkpoints'][$databaseName][$collectionName]['processed'] ?? 0) + $batchCount,
                        'completed' => false,
                    ];
                }

                $batch = [];

                // 每5秒输出一次进度
                if (time() - $lastProgressLogTime >= 5) {
                    $this->logProgress();
                    $lastProgressLogTime = time();
                }
                $this->saveProgress();
            }
        }

        // 处理剩余数据
        if (!empty($batch)) {
            $this->batchInsert($targetCollection, $batch);
            $batchCount = count($batch);
            $this->progress['documents_processed'] += $batchCount;

            $lastDoc = end($batch);
            if (isset($lastDoc['_id'])) {
                $this->progress['checkpoints'][$databaseName][$collectionName] = [
                    'last_id' => (string)$lastDoc['_id'],
                    'processed' => ($this->progress['checkpoints'][$databaseName][$collectionName]['processed'] ?? 0) + $batchCount,
                    'completed' => true,
                ];
            }

            $this->saveProgress();
        }
    }

    /**
     * 并行同步集合（大数据量，使用分片）
     */
    private function syncCollectionParallel(Collection $sourceCollection, Collection $targetCollection, string $collectionName, string $databaseName, int $batchSize, int $totalDocuments, int $maxParallelTasks): void
    {
        // 计算每个任务处理的文档数
        $documentsPerTask = (int)ceil($totalDocuments / $maxParallelTasks);
        
        LoggerHelper::logBusiness('database_sync_collection_parallel_start', [
            'database' => $databaseName,
            'collection' => $collectionName,
            'total_documents' => $totalDocuments,
            'parallel_tasks' => $maxParallelTasks,
            'documents_per_task' => $documentsPerTask,
        ]);

        // 创建任务列表
        $tasks = [];
        for ($i = 0; $i < $maxParallelTasks; $i++) {
            $skip = $i * $documentsPerTask;
            $limit = min($documentsPerTask, $totalDocuments - $skip);
            
            if ($limit <= 0) {
                break;
            }

            $tasks[] = [
                'skip' => $skip,
                'limit' => $limit,
                'task_id' => $i + 1,
            ];
        }

        // 使用 Workerman 的协程或进程并行执行
        $this->executeParallelTasks($sourceCollection, $targetCollection, $tasks, $batchSize);
    }

    /**
     * 执行并行任务
     * 
     * 注意：由于 Workerman Coroutine 可能存在类加载冲突问题，这里使用顺序执行
     * MongoDB 操作本身已经很快，顺序执行也能保证良好的性能
     */
    private function executeParallelTasks(Collection $sourceCollection, Collection $targetCollection, array $tasks, int $batchSize): void
    {
        // 顺序执行任务（避免协程类加载冲突）
        foreach ($tasks as $task) {
            $this->syncCollectionChunk($sourceCollection, $targetCollection, $task['skip'], $task['limit'], $batchSize);
        }
    }

    /**
     * 同步集合的一个分片
     */
    private function syncCollectionChunk(Collection $sourceCollection, Collection $targetCollection, int $skip, int $limit, int $batchSize): void
    {
        $cursor = $sourceCollection->find([], [
            'skip' => $skip,
            'limit' => $limit,
            'batchSize' => $batchSize,
        ]);

        $batch = [];
        $count = 0;

        foreach ($cursor as $document) {
            $batch[] = $document;
            $count++;

            if (count($batch) >= $batchSize) {
                $this->batchInsert($targetCollection, $batch);
                $this->progress['documents_processed'] += count($batch);
                $batch = [];
                $this->saveProgress();
            }
        }

        // 处理剩余数据
        if (!empty($batch)) {
            $this->batchInsert($targetCollection, $batch);
            $this->progress['documents_processed'] += count($batch);
            $this->saveProgress();
        }
    }

    /**
     * 并行同步多个集合
     */
    private function syncCollectionsParallel(Database $sourceDb, Database $targetDb, array $collectionList, string $databaseName, int $batchSize, int $concurrentCollections): void
    {
        // 将集合列表分成多个批次
        $chunks = array_chunk($collectionList, $concurrentCollections);

        foreach ($chunks as $chunk) {
            // 顺序同步当前批次（避免协程类加载冲突）
            // 注意：虽然配置了并发集合数，但由于协程存在类加载问题，这里使用顺序执行
            // MongoDB 操作本身已经很快，顺序执行也能保证良好的性能
            foreach ($chunk as $collectionName) {
                $this->syncCollection($sourceDb, $targetDb, $collectionName, $databaseName, $batchSize);
            }
        }
    }

    /**
     * 批量插入文档（支持重试机制）
     * 
     * 错误隔离：文档级错误不会影响其他批次的同步
     */
    private function batchInsert(Collection $collection, array $documents): void
    {
        if (empty($documents)) {
            return;
        }

        $maxRetries = $this->config['sync']['retry']['max_sync_retries'] ?? 3;
        $retryDelay = $this->config['sync']['retry']['sync_retry_interval'] ?? 2;
        $retryCount = 0;

        while ($retryCount <= $maxRetries) {
            try {
                // 使用 bulkWrite 进行批量写入
                $operations = [];
                foreach ($documents as $doc) {
                    $operations[] = [
                        'insertOne' => [$doc],
                    ];
                }

                $collection->bulkWrite($operations, ['ordered' => false]);
                $this->stats['documents_inserted'] += count($documents);
                return; // 成功，退出重试循环
            } catch (MongoDBException $e) {
                $retryCount++;
                
                if ($retryCount > $maxRetries) {
                    // 超过最大重试次数，记录错误但继续处理下一批
                    LoggerHelper::logError($e, [
                        'action' => 'database_sync_batch_insert_error',
                        'collection' => $collection->getCollectionName(),
                        'count' => count($documents),
                        'retry_count' => $retryCount - 1,
                    ]);
                    
                    $this->stats['errors']++;
                    
                    // 对于文档级错误，不抛出异常，继续处理下一批
                    // 这样可以保证即使某些文档失败，也能继续同步其他文档
                    return;
                }
                
                // 指数退避重试
                $delay = $retryDelay * pow(2, $retryCount - 1);
                LoggerHelper::logBusiness('database_sync_batch_insert_retry', [
                    'collection' => $collection->getCollectionName(),
                    'retry_count' => $retryCount,
                    'max_retries' => $maxRetries,
                    'delay' => $delay,
                ]);
                
                // 等待后重试
                sleep($delay);
            }
        }
    }

    /**
     * 监听数据库变化并同步
     * 
     * 注意：此方法会阻塞，需要在独立进程中运行
     */
    public function watchDatabase(string $databaseName): void
    {
        try {
            // 确保目标数据库存在
            $this->ensureTargetDatabaseExists($databaseName);
            
            $sourceDb = $this->sourceClient->selectDatabase($databaseName);
            $targetDb = $this->targetClient->selectDatabase($databaseName);

            $batchSize = $this->config['sync']['change_stream']['batch_size'] ?? 100;
            $maxAwaitTimeMs = $this->config['sync']['change_stream']['max_await_time_ms'] ?? 1000;
            $excludeCollections = $this->config['sync']['exclude_collections'] ?? [];

            // 使用数据库级别的 Change Stream（MongoDB 4.0+）
            // 这样可以监听整个数据库的所有集合变化
            $changeStream = $sourceDb->watch(
                [],
                [
                    'fullDocument' => 'updateLookup',
                    'batchSize' => $batchSize,
                    'maxAwaitTimeMS' => $maxAwaitTimeMs,
                ]
            );

            LoggerHelper::logBusiness('database_sync_watch_database_start', [
                'database' => $databaseName,
            ]);

            // 处理变更事件
            foreach ($changeStream as $change) {
                $collectionName = $change['ns']['coll'] ?? '';
                
                // 排除系统集合
                if (in_array($collectionName, $excludeCollections)) {
                    continue;
                }

                // 获取目标集合
                $targetCollection = $targetDb->selectCollection($collectionName);
                
                // 处理变更
                $this->processChange($targetCollection, $change);
                $this->stats['last_sync_time'] = time();
                $this->progress['status'] = 'incremental_sync';
                $this->saveProgress();
            }
        } catch (MongoDBException $e) {
            LoggerHelper::logError($e, [
                'action' => 'database_sync_watch_database_error',
                'database' => $databaseName,
            ]);
            throw $e;
        }
    }


    /**
     * 处理变更事件
     */
    private function processChange(Collection $targetCollection, $change): void
    {
        try {
            $operationType = $change['operationType'] ?? '';

            switch ($operationType) {
                case 'insert':
                    $this->handleInsert($targetCollection, $change);
                    break;
                case 'update':
                case 'replace':
                    $this->handleUpdate($targetCollection, $change);
                    break;
                case 'delete':
                    $this->handleDelete($targetCollection, $change);
                    break;
                default:
                    LoggerHelper::logBusiness('database_sync_unknown_operation', [
                        'operation' => $operationType,
                        'collection' => $targetCollection->getCollectionName(),
                    ]);
            }
        } catch (MongoDBException $e) {
            LoggerHelper::logError($e, [
                'action' => 'database_sync_process_change_error',
                'collection' => $targetCollection->getCollectionName(),
                'operation' => $change['operationType'] ?? 'unknown',
            ]);
            $this->stats['errors']++;
        }
    }

    /**
     * 处理插入操作
     */
    private function handleInsert(Collection $targetCollection, array $change): void
    {
        $document = $change['fullDocument'] ?? null;
        if ($document) {
            $targetCollection->insertOne($document);
            $this->stats['documents_inserted']++;
            
            if ($this->config['monitoring']['log_detail'] ?? false) {
                LoggerHelper::logBusiness('database_sync_insert', [
                    'collection' => $targetCollection->getCollectionName(),
                    'document_id' => (string)($document['_id'] ?? ''),
                ]);
            }
        }
    }

    /**
     * 处理更新操作
     */
    private function handleUpdate(Collection $targetCollection, array $change): void
    {
        $documentId = $change['documentKey']['_id'] ?? null;
        $fullDocument = $change['fullDocument'] ?? null;

        if ($documentId) {
            if ($fullDocument) {
                // 使用完整文档替换
                $targetCollection->replaceOne(
                    ['_id' => $documentId],
                    $fullDocument,
                    ['upsert' => true]
                );
            } else {
                // 使用更新操作
                $updateDescription = $change['updateDescription'] ?? [];
                $updatedFields = $updateDescription['updatedFields'] ?? [];
                $removedFields = $updateDescription['removedFields'] ?? [];

                $update = [];
                if (!empty($updatedFields)) {
                    $update['$set'] = $updatedFields;
                }
                if (!empty($removedFields)) {
                    $update['$unset'] = array_fill_keys($removedFields, '');
                }

                if (!empty($update)) {
                    $targetCollection->updateOne(
                        ['_id' => $documentId],
                        $update,
                        ['upsert' => true]
                    );
                }
            }
            $this->stats['documents_updated']++;
            
            if ($this->config['monitoring']['log_detail'] ?? false) {
                LoggerHelper::logBusiness('database_sync_update', [
                    'collection' => $targetCollection->getCollectionName(),
                    'document_id' => (string)$documentId,
                ]);
            }
        }
    }

    /**
     * 处理删除操作
     */
    private function handleDelete(Collection $targetCollection, array $change): void
    {
        $documentId = $change['documentKey']['_id'] ?? null;
        if ($documentId) {
            $targetCollection->deleteOne(['_id' => $documentId]);
            $this->stats['documents_deleted']++;
            
            if ($this->config['monitoring']['log_detail'] ?? false) {
                LoggerHelper::logBusiness('database_sync_delete', [
                    'collection' => $targetCollection->getCollectionName(),
                    'document_id' => (string)$documentId,
                ]);
            }
        }
    }

    /**
     * 获取同步统计信息
     */
    public function getStats(): array
    {
        return $this->stats;
    }

    /**
     * 获取同步进度信息
     */
    public function getProgress(): array
    {
        // 计算进度百分比（优先使用文档级进度，更准确）
        $progressPercent = 0;
        
        // 方法1：基于文档数计算（最准确）
        if ($this->progress['documents_total'] > 0 && $this->progress['documents_processed'] > 0) {
            $docProgress = ($this->progress['documents_processed'] / $this->progress['documents_total']) * 100;
            $progressPercent = round($docProgress, 2);
        }
        // 方法2：基于数据库和集合计算（备用）
        elseif ($this->progress['databases_total'] > 0) {
            $dbProgress = ($this->progress['databases_completed'] / $this->progress['databases_total']) * 100;
            
            // 如果当前正在处理某个数据库，考虑集合进度
            if ($this->progress['collections_total'] > 0 && $this->progress['current_database']) {
                $collectionProgress = ($this->progress['collections_completed'] / $this->progress['collections_total']) * 100;
                // 当前数据库的进度 = 已完成数据库数 + 当前数据库的集合进度
                $dbProgress = ($this->progress['databases_completed'] + ($collectionProgress / 100)) / $this->progress['databases_total'] * 100;
            }
            
            $progressPercent = round($dbProgress, 2);
        }
        
        // 确保进度在 0-100 之间
        $progressPercent = max(0, min(100, $progressPercent));

        // 计算已用时间
        $elapsedTime = null;
        if ($this->progress['start_time']) {
            $elapsedTime = round(microtime(true) - $this->progress['start_time'], 2);
        }

        // 基于文档数和预估总数据量，计算按“数据量”的同步进度（字节级）
        $bytesTotal = (int)($this->progress['bytes_total'] ?? 0);
        $bytesProcessed = 0;
        if ($bytesTotal > 0 && $this->progress['documents_total'] > 0) {
            $ratio = $this->progress['documents_processed'] / max(1, $this->progress['documents_total']);
            if ($ratio > 1) {
                $ratio = 1;
            } elseif ($ratio < 0) {
                $ratio = 0;
            }
            $bytesProcessed = (int)round($bytesTotal * $ratio);
        }

        // 计算预计剩余时间
        $estimatedRemaining = null;
        if ($progressPercent > 0 && $elapsedTime) {
            $totalEstimatedTime = $elapsedTime / ($progressPercent / 100);
            $estimatedRemaining = round($totalEstimatedTime - $elapsedTime, 2);
        }

        return [
            'status' => $this->progress['status'],
            'progress_percent' => $progressPercent,
            'current_database' => $this->progress['current_database'],
            'current_collection' => $this->progress['current_collection'],
            'databases' => [
                'total' => $this->progress['databases_total'],
                'completed' => $this->progress['databases_completed'],
                'remaining' => $this->progress['databases_total'] - $this->progress['databases_completed'],
            ],
            'collections' => [
                'total' => $this->progress['collections_total'],
                'completed' => $this->progress['collections_completed'],
                'remaining' => $this->progress['collections_total'] - $this->progress['collections_completed'],
            ],
            'documents' => [
                'total' => $this->progress['documents_total'],
                'processed' => $this->progress['documents_processed'],
                'remaining' => max(0, $this->progress['documents_total'] - $this->progress['documents_processed']),
            ],
            'bytes' => [
                'total' => $bytesTotal,
                'processed' => $bytesProcessed,
                'remaining' => max(0, $bytesTotal - $bytesProcessed),
            ],
            'time' => [
                'elapsed_seconds' => $elapsedTime,
                'estimated_remaining_seconds' => $estimatedRemaining,
                'start_time' => $this->progress['start_time'] ? date('Y-m-d H:i:s', (int)$this->progress['start_time']) : null,
            ],
            'stats' => $this->stats,
            'last_error' => $this->progress['last_error'] ?? null,
            'error_database' => $this->progress['error_database'] ?? null,
        ];
    }
    
    /**
     * 重置进度并清除错误状态（用于恢复同步）
     */
    public function resetProgress(): void
    {
        $this->resetStats();
        LoggerHelper::logBusiness('database_sync_progress_reset', []);
    }
    
    /**
     * 跳过当前错误数据库，继续同步下一个
     */
    public function skipErrorDatabase(): bool
    {
        if ($this->progress['status'] === 'error' && $this->progress['error_database']) {
            $errorDb = $this->progress['error_database'];
            
            // 标记该数据库为已完成（跳过）
            $this->stats['databases']++;
            $this->progress['databases_completed']++;
            
            // 清除错误状态
            $this->progress['status'] = 'full_sync';
            $this->progress['current_database'] = null;
            $this->progress['current_collection'] = null;
            $this->progress['error_database'] = null;
            $this->progress['last_error'] = null;
            
            $this->saveProgress();
            
            LoggerHelper::logBusiness('database_sync_skip_error_database', [
                'database' => $errorDb,
            ]);
            
            return true;
        }
        return false;
    }

    /**
     * 获取运行时目录路径
     */
    private function getRuntimePath(): string
    {
        if (function_exists('runtime_path')) {
            $path = runtime_path();
        } else {
            $basePath = function_exists('base_path') ? base_path() : __DIR__ . '/../../';
            $path = config('app.runtime_path', $basePath . DIRECTORY_SEPARATOR . 'runtime');
        }
        if (!is_dir($path)) {
            mkdir($path, 0777, true);
        }
        return $path;
    }

    /**
     * 保存进度到文件（用于多进程共享）
     * 
     * 使用文件锁（LOCK_EX）保证多进程写入的原子性，避免并发冲突
     */
    private function saveProgress(): void
    {
        $progressFile = $this->getRuntimePath() . DIRECTORY_SEPARATOR . 'database_sync_progress.json';
        
        // 使用文件锁保证原子性写入
        $fp = fopen($progressFile, 'c+'); // 'c+' 模式：如果文件不存在则创建，如果存在则打开用于读写
        if ($fp === false) {
            LoggerHelper::logError(new \RuntimeException("无法打开进度文件: {$progressFile}"), [
                'action' => 'database_sync_save_progress_error',
            ]);
            return;
        }
        
        // 获取独占锁（LOCK_EX），阻塞直到获取锁
        if (flock($fp, LOCK_EX)) {
            try {
                // 读取现有进度（如果存在），智能合并更新
                $existingContent = stream_get_contents($fp);
                if ($existingContent) {
                    $existingProgress = json_decode($existingContent, true);
                    if ($existingProgress && is_array($existingProgress)) {
                        // 智能合并策略：
                        // 1. 保留全局统计信息（databases_total, collections_total 等）
                        // 2. 合并 checkpoints（每个进程只更新自己负责的数据库）
                        // 3. 合并 cleared_databases（避免重复清空）
                        // 4. 合并 collections_snapshot（保留所有数据库的快照）
                        // 5. 更新当前进程的进度信息
                        
                        // 保留全局统计（取最大值，确保不丢失）
                        $this->progress['databases_total'] = max(
                            $this->progress['databases_total'] ?? 0,
                            $existingProgress['databases_total'] ?? 0
                        );
                        $this->progress['collections_total'] = max(
                            $this->progress['collections_total'] ?? 0,
                            $existingProgress['collections_total'] ?? 0
                        );
                        $this->progress['documents_total'] = max(
                            $this->progress['documents_total'] ?? 0,
                            $existingProgress['documents_total'] ?? 0
                        );
                        $this->progress['bytes_total'] = max(
                            $this->progress['bytes_total'] ?? 0,
                            $existingProgress['bytes_total'] ?? 0
                        );
                        
                        // 对于 completed 计数，需要累加（多进程场景）
                        // 但由于每个进程只处理部分数据库，直接累加会导致重复计数
                        // 因此采用基于 checkpoints 重新计算的方式
                        // 这里先保留现有值，在 getProgress 中基于 checkpoints 重新计算
                        // 为了简化，这里采用取最大值的方式（每个进程只更新自己完成的部分）
                        // 注意：这种方式在多进程场景下可能不够精确，但可以避免重复计数
                        $this->progress['databases_completed'] = max(
                            $this->progress['databases_completed'] ?? 0,
                            $existingProgress['databases_completed'] ?? 0
                        );
                        $this->progress['collections_completed'] = max(
                            $this->progress['collections_completed'] ?? 0,
                            $existingProgress['collections_completed'] ?? 0
                        );
                        $this->progress['documents_processed'] = max(
                            $this->progress['documents_processed'] ?? 0,
                            $existingProgress['documents_processed'] ?? 0
                        );
                        
                        // 合并 checkpoints（每个进程只更新自己负责的数据库）
                        if (isset($existingProgress['checkpoints']) && is_array($existingProgress['checkpoints'])) {
                            if (!isset($this->progress['checkpoints'])) {
                                $this->progress['checkpoints'] = [];
                            }
                            $this->progress['checkpoints'] = array_merge(
                                $existingProgress['checkpoints'],
                                $this->progress['checkpoints']
                            );
                        }
                        
                        // 合并 cleared_databases（避免重复清空）
                        if (isset($existingProgress['cleared_databases']) && is_array($existingProgress['cleared_databases'])) {
                            if (!isset($this->progress['cleared_databases'])) {
                                $this->progress['cleared_databases'] = [];
                            }
                            $this->progress['cleared_databases'] = array_unique(array_merge(
                                $existingProgress['cleared_databases'],
                                $this->progress['cleared_databases']
                            ));
                        }
                        
                        // 合并 collections_snapshot（保留所有数据库的快照）
                        if (isset($existingProgress['collections_snapshot']) && is_array($existingProgress['collections_snapshot'])) {
                            if (!isset($this->progress['collections_snapshot'])) {
                                $this->progress['collections_snapshot'] = [];
                            }
                            $this->progress['collections_snapshot'] = array_merge(
                                $existingProgress['collections_snapshot'],
                                $this->progress['collections_snapshot']
                            );
                        }
                        
                        // 合并 orphan_databases
                        if (isset($existingProgress['orphan_databases']) && is_array($existingProgress['orphan_databases'])) {
                            if (!isset($this->progress['orphan_databases'])) {
                                $this->progress['orphan_databases'] = [];
                            }
                            $this->progress['orphan_databases'] = array_unique(array_merge(
                                $existingProgress['orphan_databases'],
                                $this->progress['orphan_databases']
                            ));
                        }
                        
                        // 保留最早的 start_time
                        if (isset($existingProgress['start_time']) && $existingProgress['start_time'] > 0) {
                            if (!isset($this->progress['start_time']) || $this->progress['start_time'] === null) {
                                $this->progress['start_time'] = $existingProgress['start_time'];
                            } else {
                                $this->progress['start_time'] = min(
                                    $this->progress['start_time'],
                                    $existingProgress['start_time']
                                );
                            }
                        }
                    }
                }
                
                // 清空文件并写入合并后的进度
                ftruncate($fp, 0);
                rewind($fp);
                fwrite($fp, json_encode($this->progress, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
                fflush($fp); // 确保立即写入磁盘
            } finally {
                // 释放锁
                flock($fp, LOCK_UN);
            }
        } else {
            LoggerHelper::logError(new \RuntimeException("无法获取进度文件锁: {$progressFile}"), [
                'action' => 'database_sync_save_progress_lock_error',
            ]);
        }
        
        fclose($fp);
    }

    /**
     * 设置进度状态（公开方法，供外部调用）
     */
    public function setProgressStatus(string $status): void
    {
        $this->progress['status'] = $status;
        if ($status !== 'idle' && $this->progress['start_time'] === null) {
            $this->progress['start_time'] = microtime(true);
        }
        $this->saveProgress();
    }

    /**
     * 从文件加载进度（使用文件锁保证读取一致性）
     */
    public function loadProgress(): void
    {
        $progressFile = $this->getRuntimePath() . DIRECTORY_SEPARATOR . 'database_sync_progress.json';
        if (!file_exists($progressFile)) {
            return;
        }
        
        // 使用文件锁保证读取一致性
        $fp = fopen($progressFile, 'r');
        if ($fp === false) {
            LoggerHelper::logError(new \RuntimeException("无法打开进度文件: {$progressFile}"), [
                'action' => 'database_sync_load_progress_error',
            ]);
            return;
        }
        
        // 获取共享锁（LOCK_SH），允许多个进程同时读取
        if (flock($fp, LOCK_SH)) {
            try {
                $content = stream_get_contents($fp);
                if ($content) {
                    $loaded = json_decode($content, true);
                    if ($loaded && is_array($loaded)) {
                        // 合并进度：保留现有字段，更新加载的字段
                        $this->progress = array_merge($this->progress, $loaded);
                    }
                }
            } finally {
                // 释放锁
                flock($fp, LOCK_UN);
            }
        } else {
            LoggerHelper::logError(new \RuntimeException("无法获取进度文件锁: {$progressFile}"), [
                'action' => 'database_sync_load_progress_lock_error',
            ]);
        }
        
        fclose($fp);
    }

    /**
     * 输出进度日志
     */
    private function logProgress(): void
    {
        $progress = $this->getProgress();
        LoggerHelper::logBusiness('database_sync_progress', [
            'status' => $progress['status'],
            'progress_percent' => $progress['progress_percent'] . '%',
            'current_database' => $progress['current_database'],
            'current_collection' => $progress['current_collection'],
            'databases' => "{$progress['databases']['completed']}/{$progress['databases']['total']}",
            'collections' => "{$progress['collections']['completed']}/{$progress['collections']['total']}",
            'documents' => "{$progress['documents']['processed']}/{$progress['documents']['total']}",
            'elapsed_time' => $progress['time']['elapsed_seconds'] . 's',
            'estimated_remaining' => $progress['time']['estimated_remaining_seconds'] ? $progress['time']['estimated_remaining_seconds'] . 's' : 'calculating...',
        ]);
    }

    /**
     * 重置统计信息
     */
    public function resetStats(): void
    {
        $this->stats = [
            'databases' => 0,
            'collections' => 0,
            'documents_inserted' => 0,
            'documents_updated' => 0,
            'documents_deleted' => 0,
            'errors' => 0,
            'last_sync_time' => null,
        ];
        $this->progress = [
            'status' => 'idle',
            'current_database' => null,
            'current_collection' => null,
            'databases_total' => 0,
            'databases_completed' => 0,
            'collections_total' => 0,
            'collections_completed' => 0,
            'documents_total' => 0,
            'documents_processed' => 0,
        'bytes_total' => 0,
        'cleared_databases' => [],
        'collections_snapshot' => [],
        'orphan_databases' => [],
            'start_time' => null,
            'current_database_start_time' => null,
            'estimated_time_remaining' => null,
            'last_error' => null,
            'error_database' => null,
        ];
        $this->saveProgress();
    }
}

