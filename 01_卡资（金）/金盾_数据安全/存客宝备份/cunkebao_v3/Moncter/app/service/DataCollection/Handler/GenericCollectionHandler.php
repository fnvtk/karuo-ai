<?php

namespace app\service\DataCollection\Handler;

use app\repository\ConsumptionRecordRepository;
use app\service\IdentifierService;
use app\service\ConsumptionService;
use app\service\DataCollectionTaskService;
use app\service\StoreService;
use app\utils\LoggerHelper;
use MongoDB\Client;
use MongoDB\Database;
use MongoDB\Collection;

/**
 * 通用数据采集处理类
 * 
 * 职责：
 * - 根据配置的字段映射采集数据
 * - 支持批量采集和实时监听两种模式
 * - 动态字段映射和转换
 */
class GenericCollectionHandler extends BaseCollectionHandler
{
    use Trait\DataCollectionHelperTrait;
    
    private DataCollectionTaskService $taskService;
    private array $taskConfig;

    public function __construct()
    {
        parent::__construct();
        // 公共服务已在基类中初始化：identifierService, consumptionService, storeService
        
        // 只初始化 GenericCollectionHandler 特有的服务
        $this->taskService = new DataCollectionTaskService(
            new \app\repository\DataCollectionTaskRepository()
        );
    }

    /**
     * 采集数据
     * 
     * @param \app\service\DataSource\DataSourceAdapterInterface $adapter 数据源适配器
     * @param array<string, mixed> $taskConfig 任务配置
     * @return void
     */
    public function collect($adapter, array $taskConfig): void
    {
        $this->taskConfig = $taskConfig;
        $taskId = $taskConfig['task_id'] ?? '';
        $taskName = $taskConfig['name'] ?? '通用采集任务';
        $mode = $taskConfig['mode'] ?? 'batch'; // batch: 批量采集, realtime: 实时监听

        \Workerman\Worker::safeEcho("[GenericCollectionHandler] 【通用-步骤5-Handler开始】任务ID={$taskId}, 任务名称={$taskName}, 模式={$mode}\n");
        LoggerHelper::logBusiness('generic_collection_started', [
            'task_id' => $taskId,
            'task_name' => $taskName,
            'mode' => $mode,
        ]);

        try {
            // 检查任务状态（从Redis或数据库）
            if (!$this->checkTaskStatus($taskId)) {
                LoggerHelper::logBusiness('generic_collection_skipped', [
                    'task_id' => $taskId,
                    'reason' => '任务已暂停或停止',
                ]);
                return;
            }

            // 根据模式执行不同的采集逻辑
            if ($mode === 'realtime') {
                $this->watchCollection($taskConfig);
            } else {
                $this->collectBatch($adapter, $taskConfig);
            }
        } catch (\Throwable $e) {
            LoggerHelper::logError($e, [
                'component' => 'GenericCollectionHandler',
                'action' => 'collect',
                'task_id' => $taskId,
            ]);
            
            // 更新任务状态为错误
            $this->taskService->updateTask($taskId, [
                'status' => 'error',
                'progress.status' => 'error',
                'progress.last_error' => $e->getMessage(),
            ]);
            
            throw $e;
        }
    }

    /**
     * 批量采集
     */
    private function collectBatch($adapter, array $taskConfig): void
    {
        $taskId = $taskConfig['task_id'] ?? '';
        $database = $taskConfig['database'] ?? '';
        $collection = $taskConfig['collection'] ?? null;
        $collections = $taskConfig['collections'] ?? null;
        $fieldMappings = $taskConfig['field_mappings'] ?? [];
        $filterConditions = $taskConfig['filter_conditions'] ?? [];
        $batchSize = $taskConfig['batch_size'] ?? 1000;

        \Workerman\Worker::safeEcho("[GenericCollectionHandler] 【通用-步骤6-连接源数据库】开始连接源数据库: database={$database}\n");
        $client = $this->getMongoClient($taskConfig);
        $db = $client->selectDatabase($database);
        \Workerman\Worker::safeEcho("[GenericCollectionHandler] 【通用-步骤6-连接源数据库】✓ 源数据库连接成功: database={$database}\n");

        // 确定要处理的集合列表
        $targetCollections = [];
        if ($collection) {
            $targetCollections[] = $collection;
        } elseif ($collections && is_array($collections)) {
            $targetCollections = $collections;
        } else {
            \Workerman\Worker::safeEcho("[GenericCollectionHandler] 【通用-步骤6-连接源数据库】✗ 未指定collection或collections\n");
            throw new \InvalidArgumentException('必须指定 collection 或 collections');
        }
        \Workerman\Worker::safeEcho("[GenericCollectionHandler] 【通用-步骤6-连接源数据库】要处理的集合: " . json_encode($targetCollections, JSON_UNESCAPED_UNICODE) . "\n");

        // 先计算总记录数（用于进度计算和更新间隔）
        $totalCount = 0;
        $filter = $this->buildFilter($filterConditions);
        foreach ($targetCollections as $collName) {
            $coll = $db->selectCollection($collName);
            $collTotal = $coll->countDocuments($filter);
            $totalCount += $collTotal;
        }
        \Workerman\Worker::safeEcho("[GenericCollectionHandler] 【通用-步骤6-连接源数据库】总记录数: {$totalCount}\n");

        // 计算进度更新间隔（根据总数动态调整）
        $updateInterval = $this->calculateProgressUpdateInterval($totalCount);
        \Workerman\Worker::safeEcho("[GenericCollectionHandler] 【通用-步骤6-连接源数据库】进度更新间隔: 每 {$updateInterval} 条更新一次\n");

        // 更新进度：开始
        $this->updateProgress($taskId, [
            'status' => 'running',
            'start_time' => new \MongoDB\BSON\UTCDateTime(time() * 1000),
            'total_count' => $totalCount,
            'processed_count' => 0,
            'success_count' => 0,
            'error_count' => 0,
            'percentage' => 0,
        ]);

        $processedCount = 0;
        $successCount = 0;
        $errorCount = 0;
        $lastUpdateCount = 0; // 记录上次更新的处理数量

        foreach ($targetCollections as $collName) {
            if (!$this->checkTaskStatus($taskId)) {
                break; // 任务已暂停或停止
            }

            \Workerman\Worker::safeEcho("[GenericCollectionHandler] 【通用-步骤7-处理集合】开始处理集合: collection={$collName}\n");
            $coll = $db->selectCollection($collName);
            
            // 获取该集合的字段映射（优先使用集合级映射）
            $collectionFieldMappings = $this->getFieldMappingsForCollection($collName, $taskConfig);
            \Workerman\Worker::safeEcho("[GenericCollectionHandler] 【通用-步骤7-处理集合】字段映射数量: " . count($collectionFieldMappings) . "\n");
            
            // 获取该集合的连表查询配置
            $collectionLookups = $this->getLookupsForCollection($collName, $taskConfig);
            
            // 如果有连表查询，使用聚合管道
            if (!empty($collectionLookups)) {
                \Workerman\Worker::safeEcho("[GenericCollectionHandler] 【通用-步骤7-处理集合】使用连表查询模式\n");
                $result = $this->collectWithLookup($coll, $collName, $collectionFieldMappings, $collectionLookups, $filterConditions, $taskConfig, $taskId);
                $processedCount += $result['processed'];
                $successCount += $result['success'];
                $errorCount += $result['error'];
            } else {
                // 普通查询
                // 构建查询条件
                $filter = $this->buildFilter($filterConditions);
                \Workerman\Worker::safeEcho("[GenericCollectionHandler] 【通用-步骤7-处理集合】查询条件: " . json_encode($filter, JSON_UNESCAPED_UNICODE) . "\n");
                
                // 获取当前集合的总数（用于日志）
                $collTotalCount = $coll->countDocuments($filter);
                \Workerman\Worker::safeEcho("[GenericCollectionHandler] 【通用-步骤7-处理集合】集合总文档数: {$collTotalCount}\n");
                
                // 分页查询
                $offset = 0;
                do {
                    if (!$this->checkTaskStatus($taskId)) {
                        break; // 任务已暂停或停止
                    }

                    $cursor = $coll->find(
                        $filter,
                        [
                            'limit' => $batchSize,
                            'skip' => $offset,
                        ]
                    );

                    $batch = [];
                    foreach ($cursor as $doc) {
                        $batch[] = $this->convertMongoDocumentToArray($doc);
                    }

                    if (empty($batch)) {
                        \Workerman\Worker::safeEcho("[GenericCollectionHandler] 【通用-步骤8-查询数据】批次为空，结束查询\n");
                        break;
                    }

                    \Workerman\Worker::safeEcho("[GenericCollectionHandler] 【通用-步骤8-查询数据】查询到 {$batchSize} 条数据，offset={$offset}\n");
                    
                    // 处理批量数据
                    foreach ($batch as $index => $docData) {
                        // 检查是否已达到总数（在每条处理前检查，避免超出）
                        if ($totalCount > 0 && $processedCount >= $totalCount) {
                            break 2; // 跳出两层循环（foreach 和 do-while）
                        }
                        
                        $processedCount++;
                        try {
                            \Workerman\Worker::safeEcho("[GenericCollectionHandler] 【通用-步骤9-处理文档】开始处理第 {$processedCount} 条文档 (批次内第 " . ($index + 1) . " 条)\n");
                            $this->processDocument($docData, $collectionFieldMappings, $taskConfig);
                            $successCount++;
                            if (($index + 1) % 100 === 0) {
                                \Workerman\Worker::safeEcho("[GenericCollectionHandler] 【通用-步骤9-处理文档】已处理 {$successCount} 条成功\n");
                            }
                        } catch (\Exception $e) {
                            $errorCount++;
                            \Workerman\Worker::safeEcho("[GenericCollectionHandler] 【通用-步骤9-处理文档】✗ 处理文档失败: " . $e->getMessage() . "\n");
                            LoggerHelper::logError($e, [
                                'component' => 'GenericCollectionHandler',
                                'action' => 'processDocument',
                                'task_id' => $taskId,
                                'collection' => $collName,
                            ]);
                        }
                    }

                    // 根据更新间隔决定是否更新进度
                    if ($totalCount == 0 || ($processedCount - $lastUpdateCount) >= $updateInterval || $processedCount >= $totalCount) {
                        $percentage = $totalCount > 0 ? round(($processedCount / $totalCount) * 100, 2) : 0;
                        
                        // 检查是否达到100%
                        if ($totalCount > 0 && $processedCount >= $totalCount) {
                            // 进度达到100%，停止采集并更新状态为已完成
                            $this->updateProgress($taskId, [
                                'status' => 'completed',
                                'processed_count' => $processedCount,
                                'success_count' => $successCount,
                                'error_count' => $errorCount,
                                'total_count' => $totalCount,
                                'percentage' => 100,
                                'end_time' => new \MongoDB\BSON\UTCDateTime(time() * 1000),
                            ]);
                            \Workerman\Worker::safeEcho("[GenericCollectionHandler] ✅ 采集完成，进度已达到100%，已停止采集\n");
                            break 2; // 跳出两层循环（foreach 和 do-while）
                        } else {
                            $this->updateProgress($taskId, [
                                'processed_count' => $processedCount,
                                'success_count' => $successCount,
                                'error_count' => $errorCount,
                                'total_count' => $totalCount,
                                'percentage' => $percentage,
                            ]);
                        }
                        $lastUpdateCount = $processedCount;
                    }

                    $offset += $batchSize;

                } while (count($batch) === $batchSize && $processedCount < $totalCount);
            }
        }

        // 更新进度：完成（如果循环正常结束，也更新状态为已完成）
        $task = $this->taskService->getTask($taskId);
        if ($task) {
            // 只有在任务状态不是 completed、paused、stopped 时，才更新为 completed
            // 如果任务被暂停或停止，不应该更新为 completed
            if ($task['status'] === 'completed') {
                // 已经是 completed，不需要更新
            } elseif (in_array($task['status'], ['paused', 'stopped'])) {
                // 任务被暂停或停止，只更新进度，不更新状态
                \Workerman\Worker::safeEcho("[GenericCollectionHandler] ⚠️  任务已被暂停或停止，不更新为completed状态\n");
                $percentage = $totalCount > 0 ? round(($processedCount / $totalCount) * 100, 2) : 0;
                $this->updateProgress($taskId, [
                    'total_count' => $totalCount,
                    'processed_count' => $processedCount,
                    'success_count' => $successCount,
                    'error_count' => $errorCount,
                    'percentage' => $percentage,
                ]);
            } else {
                // 任务正常完成，更新状态为 completed
                $this->updateProgress($taskId, [
                    'status' => 'completed',
                    'processed_count' => $processedCount,
                    'success_count' => $successCount,
                    'error_count' => $errorCount,
                    'total_count' => $totalCount,
                    'percentage' => 100, // 完成时强制设置为100%
                    'end_time' => new \MongoDB\BSON\UTCDateTime(time() * 1000),
                ]);
                \Workerman\Worker::safeEcho("[GenericCollectionHandler] ✅ 采集任务完成，状态已更新为completed\n");
            }
        }

        LoggerHelper::logBusiness('generic_collection_completed', [
            'task_id' => $taskId,
            'processed' => $processedCount,
            'success' => $successCount,
            'error' => $errorCount,
        ]);
    }

    /**
     * 实时监听
     */
    private function watchCollection(array $taskConfig): void
    {
        $taskId = $taskConfig['task_id'] ?? '';
        $database = $taskConfig['database'] ?? '';
        $collection = $taskConfig['collection'] ?? null;
        $collections = $taskConfig['collections'] ?? null;
        $fieldMappings = $taskConfig['field_mappings'] ?? [];

        // 更新进度：开始
        $this->updateProgress($taskId, [
            'status' => 'running',
            'start_time' => new \MongoDB\BSON\UTCDateTime(time() * 1000),
        ]);

        $client = $this->getMongoClient($taskConfig);
        $db = $client->selectDatabase($database);

        // 如果指定了单个集合，监听该集合
        if ($collection) {
            $coll = $db->selectCollection($collection);
            $this->watchSingleCollection($coll, $fieldMappings, $taskConfig);
        } elseif ($collections && is_array($collections)) {
            // 如果指定了多个集合，监听数据库级别（然后过滤）
            $this->watchMultipleCollections($db, $collections, $fieldMappings, $taskConfig);
        } else {
            throw new \InvalidArgumentException('实时模式必须指定 collection 或 collections');
        }
    }

    /**
     * 监听单个集合
     */
    private function watchSingleCollection(Collection $collection, array $fieldMappings, array $taskConfig): void
    {
        $taskId = $taskConfig['task_id'] ?? '';
        
        $changeStream = $collection->watch(
            [],
            [
                'fullDocument' => 'updateLookup',
                'batchSize' => 100,
                'maxAwaitTimeMS' => 1000,
            ]
        );

        LoggerHelper::logBusiness('generic_collection_watch_ready', [
            'task_id' => $taskId,
            'collection' => $collection->getCollectionName(),
        ]);

        foreach ($changeStream as $change) {
            if (!$this->checkTaskStatus($taskId)) {
                break; // 任务已暂停或停止
            }

            try {
                $operationType = $change['operationType'] ?? '';

                if ($operationType === 'insert' || $operationType === 'update') {
                    $document = $change['fullDocument'] ?? null;
                    
                    if ($document === null && $operationType === 'update') {
                        $documentId = $change['documentKey']['_id'] ?? null;
                        if ($documentId !== null) {
                            $document = $collection->findOne(['_id' => $documentId]);
                        }
                    }

                    if ($document !== null) {
                        $docData = $this->convertMongoDocumentToArray($document);
                        $this->processDocument($docData, $fieldMappings, $taskConfig);
                        
                        // 更新进度
                        $this->updateProgress($taskId, [
                            'processed_count' => ['$inc' => 1],
                            'success_count' => ['$inc' => 1],
                        ]);
                    }
                }
            } catch (\Exception $e) {
                LoggerHelper::logError($e, [
                    'component' => 'GenericCollectionHandler',
                    'action' => 'watchSingleCollection',
                    'task_id' => $taskId,
                ]);
                
                // 更新错误计数
                $this->updateProgress($taskId, [
                    'error_count' => ['$inc' => 1],
                ]);
            }
        }
    }

    /**
     * 监听多个集合
     */
    private function watchMultipleCollections(Database $database, array $collections, array $fieldMappings, array $taskConfig): void
    {
        $taskId = $taskConfig['task_id'] ?? '';
        
        $changeStream = $database->watch(
            [],
            [
                'fullDocument' => 'updateLookup',
                'batchSize' => 100,
                'maxAwaitTimeMS' => 1000,
            ]
        );

        LoggerHelper::logBusiness('generic_collection_watch_ready', [
            'task_id' => $taskId,
            'collections' => $collections,
        ]);

        foreach ($changeStream as $change) {
            if (!$this->checkTaskStatus($taskId)) {
                break; // 任务已暂停或停止
            }

            try {
                $collectionName = $change['ns']['coll'] ?? '';
                
                // 只处理配置的集合
                if (!in_array($collectionName, $collections)) {
                    continue;
                }

                $operationType = $change['operationType'] ?? '';

                if ($operationType === 'insert' || $operationType === 'update') {
                    $document = $change['fullDocument'] ?? null;
                    
                    if ($document === null && $operationType === 'update') {
                        $documentId = $change['documentKey']['_id'] ?? null;
                        if ($documentId !== null) {
                            $collection = $database->selectCollection($collectionName);
                            $document = $collection->findOne(['_id' => $documentId]);
                        }
                    }

                    if ($document !== null) {
                        $docData = $this->convertMongoDocumentToArray($document);
                        $this->processDocument($docData, $fieldMappings, $taskConfig);
                        
                        // 更新进度
                        $this->updateProgress($taskId, [
                            'processed_count' => ['$inc' => 1],
                            'success_count' => ['$inc' => 1],
                        ]);
                    }
                }
            } catch (\Exception $e) {
                LoggerHelper::logError($e, [
                    'component' => 'GenericCollectionHandler',
                    'action' => 'watchMultipleCollections',
                    'task_id' => $taskId,
                ]);
                
                // 更新错误计数
                $this->updateProgress($taskId, [
                    'error_count' => ['$inc' => 1],
                ]);
            }
        }
    }

    /**
     * 处理文档
     */
    private function processDocument(array $docData, array $fieldMappings, array $taskConfig): void
    {
        \Workerman\Worker::safeEcho("[GenericCollectionHandler] 【通用-步骤10-字段映射】开始应用字段映射，源字段数量: " . count(array_keys($docData)) . "\n");
        // 应用字段映射
        $mappedData = $this->applyFieldMappings($docData, $fieldMappings);
        \Workerman\Worker::safeEcho("[GenericCollectionHandler] 【通用-步骤10-字段映射】✓ 字段映射完成，目标字段数量: " . count(array_keys($mappedData)) . "\n");
        
        // 提取用户标识（优先使用user_id，否则使用phone_number或id_card）
        $userId = $mappedData['user_id'] ?? null;
        $phoneNumber = $mappedData['phone_number'] ?? null;
        $idCard = $mappedData['id_card'] ?? null;
        
        // 如果既没有user_id，也没有phone_number和id_card，则跳过
        if (empty($userId) && empty($phoneNumber) && empty($idCard)) {
            \Workerman\Worker::safeEcho("[GenericCollectionHandler] 【通用-步骤10-字段映射】✗ 跳过：缺少用户标识\n");
            LoggerHelper::logBusiness('generic_collection_skip_no_user_identifier', [
                'task_id' => $taskConfig['task_id'] ?? '',
            ]);
            return;
        }
        \Workerman\Worker::safeEcho("[GenericCollectionHandler] 【通用-步骤10-字段映射】用户标识: user_id=" . ($userId ?? 'null') . ", phone=" . ($phoneNumber ?? 'null') . "\n");

        // 店铺名称：优先保存从源数据映射的店铺名称（无论店铺表查询结果如何）
        $storeName = $mappedData['store_name'] ?? null;
        
        // 调试：输出映射后的店铺名称（用于排查问题）
        \Workerman\Worker::safeEcho("[GenericCollectionHandler] 【通用-步骤10-字段映射】映射后的店铺名称: " . ($storeName ?? 'null') . "\n");
        
        // 如果映射后没有店铺名称，尝试从源数据中查找可能的店铺名称字段（作为后备方案）
        if (empty($storeName)) {
            // 常见的店铺名称字段名
            $possibleStoreNameFields = ['store_name', '门店名称', '店铺名称', '门店名', '店铺名', 'storeName', '门店', '店铺', '新零售成交门店昵称'];
            foreach ($possibleStoreNameFields as $fieldName) {
                $value = $docData[$fieldName] ?? null;
                if (!empty($value)) {
                    $storeName = $value;
                    \Workerman\Worker::safeEcho("[GenericCollectionHandler] 【通用-步骤10-字段映射】从源数据中提取店铺名称: {$fieldName} = {$storeName}\n");
                    break;
                }
            }
        }
        
        // 处理门店ID：如果提供了store_name但没有store_id，则通过门店服务获取或创建
        // 注意：即使获取store_id失败，也要保存store_name
        $storeId = $mappedData['store_id'] ?? null;
        if (empty($storeId) && !empty($storeName)) {
            try {
                $source = $taskConfig['data_source_id'] ?? $taskConfig['name'] ?? 'unknown';
                $storeId = $this->storeService->getOrCreateStoreByName(
                    $storeName,
                    $source
                );
            } catch (\Throwable $e) {
                // 店铺ID获取失败不影响店铺名称的保存，只记录日志
                LoggerHelper::logError($e, [
                    'component' => 'GenericCollectionHandler',
                    'action' => 'processDocument',
                    'message' => '获取店铺ID失败，但会继续保存店铺名称',
                    'store_name' => $storeName,
                ]);
            }
        }

        // 构建消费记录数据
        $recordData = [
            'consume_time' => $mappedData['consume_time'] ?? date('Y-m-d H:i:s'),
            'amount' => $mappedData['amount'] ?? 0,
            'actual_amount' => $mappedData['actual_amount'] ?? $mappedData['amount'] ?? 0,
            'currency' => $mappedData['currency'] ?? 'CNY',
            'status' => $mappedData['status'] ?? 0,
        ];

        // 添加用户标识（优先使用user_id，否则使用phone_number或id_card）
        if (!empty($userId)) {
            $recordData['user_id'] = $userId;
        } elseif (!empty($phoneNumber)) {
            $recordData['phone_number'] = $phoneNumber;
        } elseif (!empty($idCard)) {
            $recordData['id_card'] = $idCard;
        }

        // 添加门店ID（如果已转换或已提供）
        if (!empty($storeId)) {
            $recordData['store_id'] = $storeId;
        }
        
        // 添加店铺名称（优先保存从源数据映射的店铺名称）
        if (!empty($storeName)) {
            $recordData['store_name'] = $storeName;
        }

        // 根据任务配置保存到目标数据源
        $targetType = $taskConfig['target_type'] ?? 'generic';
        \Workerman\Worker::safeEcho("[GenericCollectionHandler] 【通用-步骤11-保存数据】开始保存数据到目标数据源: target_type={$targetType}\n");
        
        if ($targetType === 'consumption_record') {
            // 消费记录类型：使用 ConsumptionService（它会写入到目标数据源）
            // 但需要确保 ConsumptionService 使用正确的数据源连接
            $this->saveToTargetDataSource($recordData, $taskConfig, 'consumption_record');
        } else {
            // 通用类型：直接保存到指定的目标数据源、数据库、集合
            $this->saveToTargetDataSource($recordData, $taskConfig, 'generic');
        }
        \Workerman\Worker::safeEcho("[GenericCollectionHandler] 【通用-步骤11-保存数据】✓ 数据保存完成\n");
    }

    /**
     * 保存数据到目标数据源
     * 
     * @param array<string, mixed> $data 要保存的数据
     * @param array<string, mixed> $taskConfig 任务配置
     * @param string $targetType 目标类型（consumption_record 或 generic）
     * @return void
     */
    private function saveToTargetDataSource(array $data, array $taskConfig, string $targetType): void
    {
        $targetDataSourceId = $taskConfig['target_data_source_id'] ?? null;
        $targetDatabase = $taskConfig['target_database'] ?? null;
        $targetCollection = $taskConfig['target_collection'] ?? null;
        
        \Workerman\Worker::safeEcho("[GenericCollectionHandler] 【通用-步骤12-连接目标数据源】目标数据源ID={$targetDataSourceId}, 目标数据库={$targetDatabase}, 目标集合={$targetCollection}\n");
        
        if (empty($targetDataSourceId)) {
            \Workerman\Worker::safeEcho("[GenericCollectionHandler] 【通用-步骤12-连接目标数据源】✗ 缺少target_data_source_id\n");
            throw new \InvalidArgumentException('任务配置中缺少 target_data_source_id');
        }
        
        // 连接到目标数据源
        // \Workerman\Worker::safeEcho("[GenericCollectionHandler] 【通用-步骤12-连接目标数据源】开始查询目标数据源配置\n");
        $connectionInfo = $this->connectToTargetDataSource($targetDataSourceId, $targetDatabase);
        $targetDataSourceConfig = $connectionInfo['config'];
        $dbName = $connectionInfo['dbName'];
        $database = $connectionInfo['database'];
        
        // \Workerman\Worker::safeEcho("[GenericCollectionHandler] 【通用-步骤12-连接目标数据源】✓ 目标数据源配置查询成功: host={$targetDataSourceConfig['host']}, port={$targetDataSourceConfig['port']}\n");
        
        // 确定目标集合
        if ($targetType === 'consumption_record') {
            // 消费记录类型：集合名为 consumption_records（按月份分表）
            $collectionName = 'consumption_records';
            
            // 如果有 consume_time，根据时间确定月份集合
            if (isset($data['consume_time'])) {
                try {
                    $consumeTime = new \DateTimeImmutable($data['consume_time']);
                    $monthSuffix = $consumeTime->format('Ym');
                    $collectionName = "consumption_records_{$monthSuffix}";
                } catch (\Exception $e) {
                    // 如果解析失败，使用当前月份
                    $collectionName = 'consumption_records_' . date('Ym');
                }
            } else {
                $collectionName = 'consumption_records_' . date('Ym');
            }
            
            // 对于消费记录，需要先通过 ConsumptionService 处理（解析用户ID等）
            // 但需要确保它写入到正确的数据源
            // 这里我们直接写入，但需要先解析用户ID
            if (empty($data['user_id']) && (!empty($data['phone_number']) || !empty($data['id_card']))) {
                // 需要解析用户ID
                $userId = $this->identifierService->resolvePersonId(
                    $data['phone_number'] ?? null,
                    $data['id_card'] ?? null
                );
                $data['user_id'] = $userId;
            }
            
            // 确保有 record_id
            if (empty($data['record_id'])) {
                $data['record_id'] = \Ramsey\Uuid\Uuid::uuid4()->toString();
            }
            
            // 转换时间字段
            if (isset($data['consume_time']) && is_string($data['consume_time'])) {
                $data['consume_time'] = new \MongoDB\BSON\UTCDateTime(strtotime($data['consume_time']) * 1000);
            }
            if (empty($data['create_time'])) {
                $data['create_time'] = new \MongoDB\BSON\UTCDateTime(time() * 1000);
            } elseif (is_string($data['create_time'])) {
                $data['create_time'] = new \MongoDB\BSON\UTCDateTime(strtotime($data['create_time']) * 1000);
            }
        } else {
            // 通用类型：使用任务配置中的目标集合
            if (empty($targetCollection)) {
                throw new \InvalidArgumentException('通用类型任务必须配置 target_collection');
            }
            $collectionName = $targetCollection;
        }
        
        // 写入数据
        $collection = $database->selectCollection($collectionName);
        
        // 对于消费记录类型，基于业务唯一标识检查是否已存在（防止重复插入）
        if ($targetType === 'consumption_record') {
            // 转换 consume_time 为 UTCDateTime（如果存在）
            $consumeTimeForQuery = null;
            if (isset($data['consume_time'])) {
                if (is_string($data['consume_time'])) {
                    $consumeTimeForQuery = new \MongoDB\BSON\UTCDateTime(strtotime($data['consume_time']) * 1000);
                } elseif ($data['consume_time'] instanceof \MongoDB\BSON\UTCDateTime) {
                    $consumeTimeForQuery = $data['consume_time'];
                }
            }
            
            // 获取店铺名称（用于去重）
            // 优先使用从源数据映射的店铺名称，无论店铺表查询结果如何
            $storeName = $data['store_name'] ?? null;
            
            // 如果源数据中没有 store_name 但有 store_id，尝试从店铺表获取店铺名称（作为后备方案）
            // 但即使查询失败，也要确保 store_name 字段被保存（可能为 null）
            if (empty($storeName) && !empty($data['store_id'])) {
                try {
                    $store = $this->storeService->getStoreById($data['store_id']);
                    if ($store && $store->store_name) {
                        $storeName = $store->store_name;
                    }
                } catch (\Throwable $e) {
                    // 从店铺表反查失败不影响数据保存，只记录日志
                    LoggerHelper::logError($e, [
                        'component' => 'GenericCollectionHandler',
                        'action' => 'saveToTargetDataSource',
                        'message' => '从店铺表反查店铺名称失败，将保存null值',
                        'store_id' => $data['store_id'] ?? null,
                    ]);
                }
            }
            
            // 确保 store_name 字段被保存到 data 中（即使为 null 也要保存，保持数据结构一致）
            $data['store_name'] = $storeName;
            
            // 基于业务唯一标识检查重复（防止重复插入）
            // 方案：使用 store_name + source_order_id 作为唯一标识
            // 注意：order_no 是系统自动生成的（自动递增），不参与去重判断
            $duplicateQuery = null;
            $duplicateIdentifier = null;
            $sourceOrderId = $data['source_order_id'] ?? null;
            
            if (!empty($storeName) && !empty($sourceOrderId)) {
                // 使用店铺名称 + 原始订单ID作为唯一标识
                $duplicateQuery = [
                    'store_name' => $storeName,
                    'source_order_id' => $sourceOrderId,
                ];
                $duplicateIdentifier = "store_name={$storeName}, source_order_id={$sourceOrderId}";
            }
            
            // 如果找到了唯一标识，检查是否已存在
            if ($duplicateQuery) {
                $existingRecord = $collection->findOne($duplicateQuery);
                if ($existingRecord) {
                    \Workerman\Worker::safeEcho("[GenericCollectionHandler] ⚠️  消费记录已存在，跳过插入: {$duplicateIdentifier}, collection={$collectionName}\n");
                    LoggerHelper::logBusiness('generic_collection_duplicate_skipped', [
                        'task_id' => $taskId,
                        'duplicate_identifier' => $duplicateIdentifier,
                        'target_collection' => $collectionName,
                    ]);
                    return; // 跳过重复记录
                }
            }
            
            // 生成 record_id（如果还没有）
            // 使用店铺名称 + 原始订单ID生成稳定的 record_id
            if (empty($data['record_id'])) {
                if (!empty($storeName) && !empty($sourceOrderId)) {
                    // 使用店铺名称 + 原始订单ID生成稳定的 record_id
                    $uniqueKey = "{$storeName}|{$sourceOrderId}";
                    $data['record_id'] = 'store_source_' . md5($uniqueKey);
                } else {
                    // 如果都没有，生成 UUID
                    $data['record_id'] = \Ramsey\Uuid\Uuid::uuid4()->toString();
                }
            }
            
            // 生成 order_no（系统自动生成，自动递增）
            // 注意：order_no 不参与去重判断，仅用于展示和查询
            // 使用计数器集合来生成唯一的 order_no（在去重检查之后，只有实际插入的记录才生成 order_no）
            if (empty($data['order_no'])) {
                try {
                    // 使用计数器集合来生成唯一的 order_no
                    $counterCollection = $database->selectCollection($collectionName . '_counter');
                    
                    // 原子性地递增计数器
                    $counterResult = $counterCollection->findOneAndUpdate(
                        ['_id' => 'order_no'],
                        ['$inc' => ['seq' => 1], '$setOnInsert' => ['_id' => 'order_no', 'seq' => 1]],
                        ['upsert' => true, 'returnDocument' => 1] // 1 = RETURN_DOCUMENT_AFTER
                    );
                    
                    $nextOrderNo = $counterResult['seq'] ?? 1;
                    $data['order_no'] = (string)$nextOrderNo;
                } catch (\Throwable $e) {
                    // 如果计数器操作失败，回退到查询最大值的方案
                    LoggerHelper::logError($e, [
                        'component' => 'GenericCollectionHandler',
                        'action' => 'saveToTargetDataSource',
                        'message' => '使用计数器生成order_no失败，回退到查询最大值方案',
                    ]);
                    
                    try {
                        $maxOrderNo = $collection->findOne(
                            [],
                            ['sort' => ['order_no' => -1], 'projection' => ['order_no' => 1]]
                        );
                        $nextOrderNo = 1;
                        if ($maxOrderNo && isset($maxOrderNo['order_no']) && is_numeric($maxOrderNo['order_no'])) {
                            $nextOrderNo = (int)$maxOrderNo['order_no'] + 1;
                        }
                        $data['order_no'] = (string)$nextOrderNo;
                    } catch (\Throwable $e2) {
                        // 如果查询也失败，使用时间戳作为备选方案
                        $data['order_no'] = (string)(time() * 1000 + mt_rand(1000, 9999));
                        LoggerHelper::logError($e2, [
                            'component' => 'GenericCollectionHandler',
                            'action' => 'saveToTargetDataSource',
                            'message' => '查询最大order_no也失败，使用时间戳作为备选',
                        ]);
                    }
                }
            }
            
            // 确保 consume_time 是 UTCDateTime 类型
            if ($consumeTimeForQuery) {
                $data['consume_time'] = $consumeTimeForQuery;
            }
        }
        
        // 格式化输出流水信息
        $timestamp = date('Y-m-d H:i:s');
        $taskId = $taskConfig['task_id'] ?? 'unknown';
        $recordId = $data['record_id'] ?? $data['_id'] ?? 'auto';
        $userId = $data['user_id'] ?? 'null';
        $phoneNumber = $data['phone_number'] ?? $data['phone'] ?? 'null';
        
        // 提取关键字段用于显示（最多显示10个字段）
        $keyFields = [];
        $fieldCount = 0;
        foreach ($data as $key => $value) {
            if ($fieldCount >= 10) break;
            if (in_array($key, ['_id', 'record_id', 'user_id', 'phone_number', 'phone'])) continue;
            if (is_array($value) || is_object($value)) {
                $keyFields[] = "{$key}: " . json_encode($value, JSON_UNESCAPED_UNICODE);
            } else {
                $keyFields[] = "{$key}: {$value}";
            }
            $fieldCount++;
        }
        $keyFieldsStr = !empty($keyFields) ? implode(', ', $keyFields) : '(无其他字段)';
        
        // 输出详细的插入流水信息（输出到终端）
        $output = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            . "📝 [{$timestamp}] 通用数据插入流水 | 任务ID: {$taskId}\n"
            . "   ├─ 记录ID: {$recordId}\n"
            . "   ├─ 用户ID: {$userId}\n"
            . "   ├─ 手机号: {$phoneNumber}\n"
            . "   ├─ 关键字段: {$keyFieldsStr}\n"
            . "   ├─ 目标数据库: {$dbName}\n"
            . "   └─ 目标集合: {$collectionName}\n";
        
        \Workerman\Worker::safeEcho($output);
        
        $result = $collection->insertOne($data);
        $insertedId = $result->getInsertedId();
        
        $successOutput = "   ✅ 插入成功 | MongoDB ID: " . (is_object($insertedId) ? (string)$insertedId : json_encode($insertedId)) . "\n"
            . "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
        
        \Workerman\Worker::safeEcho($successOutput);
        
        LoggerHelper::logBusiness('generic_collection_data_saved', [
            'task_id' => $taskConfig['task_id'] ?? '',
            'target_data_source_id' => $targetDataSourceId,
            'target_database' => $dbName,
            'target_collection' => $collectionName,
            'inserted_id' => (string)$insertedId,
        ]);
    }

    /**
     * 应用字段映射
     * 
     * 注意：如果源字段或目标字段为空（空字符串、null、未设置），则跳过该映射
     * 这样用户可以清除源字段选择，表示不需要映射该目标字段
     */
    private function applyFieldMappings(array $sourceData, array $fieldMappings): array
    {
        $mappedData = [];

        foreach ($fieldMappings as $mapping) {
            $sourceField = $mapping['source_field'] ?? '';
            $targetField = $mapping['target_field'] ?? '';
            $transform = $mapping['transform'] ?? null;

            // 如果源字段或目标字段为空，跳过该映射（兼容用户清除源字段选择的情况）
            if (empty($sourceField) || empty($targetField)) {
                continue;
            }

            // 从源数据中获取值（支持嵌套字段，如 "user.name"）
            $value = $this->getNestedValue($sourceData, $sourceField);

            // 调试：输出字段映射详情（仅对关键字段）
            if ($targetField === 'store_name') {
                \Workerman\Worker::safeEcho("[GenericCollectionHandler] 【通用-步骤10-字段映射】字段映射详情: target={$targetField}, source={$sourceField}, value=" . ($value ?? 'null') . "\n");
            }

            // 应用转换函数
            if ($transform && is_callable($transform)) {
                $value = $transform($value);
            } elseif ($transform && is_string($transform)) {
                $value = $this->applyTransform($value, $transform);
            }

            $mappedData[$targetField] = $value;
        }

        return $mappedData;
    }

    /**
     * 获取嵌套字段值
     */
    private function getNestedValue(array $data, string $fieldPath)
    {
        $parts = explode('.', $fieldPath);
        $value = $data;

        foreach ($parts as $part) {
            if (is_array($value) && isset($value[$part])) {
                $value = $value[$part];
            } elseif (is_object($value) && isset($value->$part)) {
                $value = $value->$part;
            } else {
                return null;
            }
        }

        return $value;
    }

    /**
     * 应用转换函数
     */
    private function applyTransform($value, string $transform)
    {
        switch ($transform) {
            case 'parse_amount':
                return $this->parseAmount($value);
            case 'parse_datetime':
                return $this->parseDateTimeToString($value);
            case 'parse_phone':
                return $this->extractPhoneNumber(['phone' => $value]);
            default:
                return $value;
        }
    }

    /**
     * 提取手机号（通用数据专用）
     * 
     * 注意：这个方法保留在此类中，因为它处理的是通用数据的字段名
     * 订单数据的手机号提取在 ConsumptionCollectionHandler 中
     */
    private function extractPhoneNumber(array $data): ?string
    {
        // 尝试多个可能的字段名
        $phoneFields = ['phone_number', 'phone', 'mobile', 'tel', 'contact_phone'];
        
        foreach ($phoneFields as $field) {
            if (isset($data[$field])) {
                $phone = trim((string)$data[$field]);
                // 先过滤非数字字符
                $cleanedPhone = $this->filterPhoneNumber($phone);
                if (!empty($cleanedPhone) && $this->isValidPhone($cleanedPhone)) {
                    // 返回过滤后的手机号
                    return $cleanedPhone;
                }
            }
        }

        return null;
    }

    /**
     * 解析日期时间为字符串（用于通用数据保存）
     * 
     * 注意：这个方法与 Trait 中的 parseDateTime 不同，它返回字符串格式
     */
    private function parseDateTimeToString($dateTimeStr): string
    {
        if (empty($dateTimeStr)) {
            return date('Y-m-d H:i:s');
        }

        $dateTime = $this->parseDateTime($dateTimeStr);
        if ($dateTime === null) {
            return date('Y-m-d H:i:s');
        }

        return $dateTime->format('Y-m-d H:i:s');
    }

    /**
     * 构建过滤条件
     */
    private function buildFilter(array $filterConditions): array
    {
        $filter = [];

        foreach ($filterConditions as $condition) {
            $field = $condition['field'] ?? '';
            $operator = $condition['operator'] ?? 'eq';
            $value = $condition['value'] ?? null;

            if (empty($field)) {
                continue;
            }

            switch ($operator) {
                case 'eq':
                    $filter[$field] = $value;
                    break;
                case 'ne':
                    $filter[$field] = ['$ne' => $value];
                    break;
                case 'gt':
                    $filter[$field] = ['$gt' => $value];
                    break;
                case 'gte':
                    $filter[$field] = ['$gte' => $value];
                    break;
                case 'lt':
                    $filter[$field] = ['$lt' => $value];
                    break;
                case 'lte':
                    $filter[$field] = ['$lte' => $value];
                    break;
                case 'in':
                    $filter[$field] = ['$in' => $value];
                    break;
                case 'nin':
                    $filter[$field] = ['$nin' => $value];
                    break;
            }
        }

        return $filter;
    }

    /**
     * 检查任务状态
     */
    private function checkTaskStatus(string $taskId): bool
    {
        // 检查Redis标志
        if (\app\utils\RedisHelper::exists("data_collection_task:{$taskId}:pause")) {
            return false;
        }
        if (\app\utils\RedisHelper::exists("data_collection_task:{$taskId}:stop")) {
            return false;
        }

        // 检查数据库状态
        $task = $this->taskService->getTask($taskId);
        if ($task && in_array($task['status'], ['paused', 'stopped', 'error'])) {
            return false;
        }

        return true;
    }

    /**
     * 更新进度
     */
    /**
     * 根据总记录数计算合适的进度更新间隔
     * 
     * @param int $totalCount 总记录数
     * @return int 更新间隔（每处理多少条记录更新一次）
     */
    private function calculateProgressUpdateInterval(int $totalCount): int
    {
        // 根据总数动态调整更新间隔，确保既不会太频繁也不会太慢
        // 策略：大约每1%更新一次，但限制在合理范围内
        
        if ($totalCount <= 0) {
            return 50; // 默认50条
        }
        
        // 计算1%的数量
        $onePercent = max(1, (int)($totalCount * 0.01));
        
        // 根据总数范围调整：
        // - 小于1000条：每50条更新（保证至少更新20次）
        // - 1000-10000条：每1%更新（约10-100条）
        // - 10000-100000条：每1%更新（约100-1000条）
        // - 100000-1000000条：每1%更新（约1000-10000条），但最多5000条
        // - 大于1000000条：每5000条更新（避免更新太频繁）
        
        if ($totalCount < 1000) {
            return 50;
        } elseif ($totalCount < 10000) {
            return max(50, min(500, $onePercent));
        } elseif ($totalCount < 100000) {
            return max(100, min(1000, $onePercent));
        } elseif ($totalCount < 1000000) {
            return max(500, min(5000, $onePercent));
        } else {
            return 5000; // 大数据量固定5000条更新一次
        }
    }

    private function updateProgress(string $taskId, array $progress): void
    {
        try {
            $task = $this->taskService->getTask($taskId);
            if (!$task) {
                return;
            }

            $currentProgress = $task['progress'] ?? [];
            
            // 检查是否需要更新任务状态
            $updateTaskStatus = false;
            $newStatus = null;
            if (isset($progress['status'])) {
                $updateTaskStatus = true;
                $newStatus = $progress['status'];
                unset($progress['status']); // 从progress中移除，单独处理
            }
            
            // 处理增量更新
            foreach ($progress as $key => $value) {
                if (is_array($value) && isset($value['$inc'])) {
                    $currentProgress[$key] = ($currentProgress[$key] ?? 0) + $value['$inc'];
                } else {
                    $currentProgress[$key] = $value;
                }
            }

            // 确保 percentage 字段存在且正确计算（基于已采集条数/总条数）
            if (isset($currentProgress['processed_count']) && isset($currentProgress['total_count'])) {
                if ($currentProgress['total_count'] > 0) {
                    // 进度 = 已采集条数 / 总条数 * 100
                    $currentProgress['percentage'] = round(
                        ($currentProgress['processed_count'] / $currentProgress['total_count']) * 100,
                        2
                    );
                    // 确保不超过100%
                    $currentProgress['percentage'] = min(100, $currentProgress['percentage']);
                } else {
                    $currentProgress['percentage'] = 0;
                }
            }

            // 更新进度到数据库
            $this->taskService->updateProgress($taskId, $currentProgress);
            
            // 如果指定了状态，更新任务状态（例如：completed）
            if ($updateTaskStatus && $newStatus !== null) {
                $this->taskService->updateTask($taskId, ['status' => $newStatus]);
            }
        } catch (\Exception $e) {
            LoggerHelper::logError($e, [
                'component' => 'GenericCollectionHandler',
                'action' => 'updateProgress',
                'task_id' => $taskId,
            ]);
        }
    }


    /**
     * 获取集合的字段映射（优先使用集合级映射，否则使用全局映射）
     * 
     * @param string $collectionName 集合名称
     * @param array<string, mixed> $taskConfig 任务配置
     * @return array 字段映射配置
     */
    private function getFieldMappingsForCollection(string $collectionName, array $taskConfig): array
    {
        // 优先使用集合级映射
        $collectionMappings = $taskConfig['collection_field_mappings'][$collectionName] ?? null;
        if ($collectionMappings !== null && is_array($collectionMappings)) {
            return $collectionMappings;
        }
        
        // 回退到全局映射
        return $taskConfig['field_mappings'] ?? [];
    }

    /**
     * 获取集合的连表查询配置（优先使用集合级配置，否则使用全局配置）
     * 
     * @param string $collectionName 集合名称
     * @param array<string, mixed> $taskConfig 任务配置
     * @return array 连表查询配置
     */
    private function getLookupsForCollection(string $collectionName, array $taskConfig): array
    {
        // 优先使用集合级连表查询配置
        $collectionLookups = $taskConfig['collection_lookups'][$collectionName] ?? null;
        if ($collectionLookups !== null && is_array($collectionLookups)) {
            return $collectionLookups;
        }
        
        // 回退到全局连表查询配置（单集合模式）
        return $taskConfig['lookups'] ?? [];
    }

    /**
     * 使用连表查询采集数据
     * 
     * @param Collection $collection MongoDB集合对象
     * @param string $collectionName 集合名称
     * @param array $fieldMappings 字段映射配置
     * @param array $lookups 连表查询配置
     * @param array $filterConditions 过滤条件
     * @param array<string, mixed> $taskConfig 任务配置
     * @param string $taskId 任务ID
     * @return array{processed: int, success: int, error: int} 处理结果统计
     */
    private function collectWithLookup(
        Collection $collection,
        string $collectionName,
        array $fieldMappings,
        array $lookups,
        array $filterConditions,
        array $taskConfig,
        string $taskId
    ): array {
        $processedCount = 0;
        $successCount = 0;
        $errorCount = 0;
        $batchSize = $taskConfig['batch_size'] ?? 1000;
        
        // 构建聚合管道
        $pipeline = $this->buildAggregationPipeline($filterConditions, $lookups);
        
        LoggerHelper::logBusiness('generic_collection_lookup_start', [
            'task_id' => $taskId,
            'collection' => $collectionName,
            'lookups' => $lookups,
        ]);
        
        $offset = 0;
        do {
            if (!$this->checkTaskStatus($taskId)) {
                break; // 任务已暂停或停止
            }
            
            // 构建分页管道
            $pagedPipeline = $pipeline;
            if ($offset > 0) {
                $pagedPipeline[] = ['$skip' => $offset];
            }
            $pagedPipeline[] = ['$limit' => $batchSize];
            
            // 执行聚合查询
            $cursor = $collection->aggregate($pagedPipeline);
            
            $batch = [];
            foreach ($cursor as $doc) {
                $batch[] = $this->convertMongoDocumentToArray($doc);
            }
            
            if (empty($batch)) {
                break;
            }
            
            // 处理批量数据
            foreach ($batch as $docData) {
                $processedCount++;
                try {
                    $this->processDocument($docData, $fieldMappings, $taskConfig);
                    $successCount++;
                } catch (\Exception $e) {
                    $errorCount++;
                    LoggerHelper::logError($e, [
                        'component' => 'GenericCollectionHandler',
                        'action' => 'processDocument_lookup',
                        'task_id' => $taskId,
                        'collection' => $collectionName,
                    ]);
                }
            }
            
            // 更新进度
            $this->updateProgress($taskId, [
                'processed_count' => $processedCount,
                'success_count' => $successCount,
                'error_count' => $errorCount,
            ]);
            
            $offset += $batchSize;
            
        } while (count($batch) === $batchSize);
        
        LoggerHelper::logBusiness('generic_collection_lookup_completed', [
            'task_id' => $taskId,
            'collection' => $collectionName,
            'processed' => $processedCount,
            'success' => $successCount,
            'error' => $errorCount,
        ]);
        
        return [
            'processed' => $processedCount,
            'success' => $successCount,
            'error' => $errorCount,
        ];
    }

    /**
     * 构建MongoDB聚合管道（支持连表查询）
     * 
     * @param array $filterConditions 过滤条件
     * @param array $lookups 连表查询配置
     * @return array MongoDB聚合管道
     */
    private function buildAggregationPipeline(array $filterConditions, array $lookups): array
    {
        $pipeline = [];
        
        // 1. 匹配条件（$match）
        $filter = $this->buildFilter($filterConditions);
        if (!empty($filter)) {
            $pipeline[] = ['$match' => $filter];
        }
        
        // 2. 连表查询（$lookup）
        foreach ($lookups as $lookup) {
            $from = $lookup['from'] ?? '';
            $localField = $lookup['local_field'] ?? '';
            $foreignField = $lookup['foreign_field'] ?? '';
            $as = $lookup['as'] ?? 'joined';
            
            if (empty($from) || empty($localField) || empty($foreignField)) {
                LoggerHelper::logBusiness('generic_collection_lookup_invalid', [
                    'lookup' => $lookup,
                ]);
                continue;
            }
            
            // 构建 $lookup 阶段
            $lookupStage = [
                '$lookup' => [
                    'from' => $from,
                    'localField' => $localField,
                    'foreignField' => $foreignField,
                    'as' => $as,
                ],
            ];
            $pipeline[] = $lookupStage;
            
            // 如果配置了解构（unwrap），添加 $unwind 阶段
            if ($lookup['unwrap'] ?? false) {
                $pipeline[] = [
                    '$unwind' => [
                        'path' => '$' . $as,
                        'preserveNullAndEmptyArrays' => $lookup['preserve_null'] ?? true, // 默认保留没有关联的记录
                    ],
                ];
            }
        }
        
        return $pipeline;
    }
}

