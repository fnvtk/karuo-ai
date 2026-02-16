<?php

namespace app\service\DataCollection\Handler;

use app\repository\ConsumptionRecordRepository;
use app\service\IdentifierService;
use app\service\ConsumptionService;
use app\service\StoreService;
use app\utils\LoggerHelper;
use MongoDB\Database;
use MongoDB\Collection;
use Ramsey\Uuid\Uuid as UuidGenerator;

/**
 * 消费记录采集处理类
 * 
 * 职责：
 * - 从多个数据源采集消费记录/订单数据
 * - 字段映射和转换
 * - 通过手机号解析user_id
 * - 写入消费记录表
 */
class ConsumptionCollectionHandler extends BaseCollectionHandler
{
    use Trait\DataCollectionHelperTrait;
    
    private array $taskConfig;
    private \app\service\DataCollectionTaskService $taskService;

    public function __construct()
    {
        parent::__construct();
        // 公共服务已在基类中初始化：identifierService, consumptionService, storeService
        
        // 初始化任务服务（用于检查任务状态）
        $this->taskService = new \app\service\DataCollectionTaskService(
            new \app\repository\DataCollectionTaskRepository()
        );
    }

    /**
     * 采集消费记录
     * 
     * @param \app\service\DataSource\DataSourceAdapterInterface $adapter 数据源适配器
     * @param array<string, mixed> $taskConfig 任务配置
     * @return void
     */
    public function collect($adapter, array $taskConfig): void
    {
        $this->taskConfig = $taskConfig;
        $taskId = $taskConfig['task_id'] ?? '';
        $taskName = $taskConfig['name'] ?? '消费记录采集';
        $sourceType = $taskConfig['source_type'] ?? 'kr_mall'; // kr_mall, kr_finance
        $mode = $taskConfig['mode'] ?? 'batch'; // batch: 批量采集, realtime: 实时监听

        // \Workerman\Worker::safeEcho("[ConsumptionCollectionHandler] 【步骤5-Handler开始】任务ID={$taskId}, 任务名称={$taskName}, 数据源类型={$sourceType}, 模式={$mode}\n");
        LoggerHelper::logBusiness('consumption_collection_started', [
            'task_id' => $taskId,
            'task_name' => $taskName,
            'source_type' => $sourceType,
            'mode' => $mode,
        ]);

        try {
            // 根据模式执行不同的采集逻辑
            if ($mode === 'realtime') {
                // 实时监听模式
                switch ($sourceType) {
                    case 'kr_mall':
                        $this->watchKrMallCollection($taskConfig);
                        break;
                    case 'kr_finance':
                        $this->watchKrFinanceCollections($taskConfig);
                        break;
                    default:
                        throw new \InvalidArgumentException("不支持的数据源类型: {$sourceType}");
                }
            } else {
                // 批量采集模式
                switch ($sourceType) {
                    case 'kr_mall':
                        $this->collectFromKrMall($adapter, $taskConfig);
                        break;
                    case 'kr_finance':
                        $this->collectFromKrFinance($adapter, $taskConfig);
                        break;
                    default:
                        throw new \InvalidArgumentException("不支持的数据源类型: {$sourceType}");
                }

                LoggerHelper::logBusiness('consumption_collection_completed', [
                    'task_id' => $taskId,
                    'task_name' => $taskName,
                ]);
            }

        } catch (\Throwable $e) {
            LoggerHelper::logError($e, [
                'component' => 'ConsumptionCollectionHandler',
                'action' => 'collect',
                'task_id' => $taskId,
            ]);
            throw $e;
        }
    }

    /**
     * 从KR_商城数据库采集订单数据
     * 
     * @param mixed $adapter 数据源适配器
     * @param array<string, mixed> $taskConfig 任务配置
     * @return void
     */
    private function collectFromKrMall($adapter, array $taskConfig): void
    {
        $taskId = $taskConfig['task_id'] ?? '';
        $databaseName = $taskConfig['database'] ?? 'KR_商城';
        $collectionName = $taskConfig['collection'] ?? '21年贝蒂喜订单整合';
        $lastSyncTime = $taskConfig['last_sync_time'] ?? null;
        $batchSize = $taskConfig['batch_size'] ?? 1000;

        // \Workerman\Worker::safeEcho("[ConsumptionCollectionHandler] 【步骤6-连接源数据库】开始连接: database={$databaseName}, collection={$collectionName}\n");
        // \Workerman\Worker::safeEcho("[ConsumptionCollectionHandler] 【步骤6-连接源数据库】任务配置来源: task_id={$taskId}\n");
        LoggerHelper::logBusiness('kr_mall_collection_start', [
            'database' => $databaseName,
            'collection' => $collectionName,
        ]);

        // 获取MongoDB客户端和数据库
        $client = $this->getMongoClient($taskConfig);
        $database = $client->selectDatabase($databaseName);
        $collection = $database->selectCollection($collectionName);
        // \Workerman\Worker::safeEcho("[ConsumptionCollectionHandler] 【步骤6-连接源数据库】✓ 源数据库连接成功\n");

        // 构建查询条件（如果有上次同步时间，只查询新数据）
        $filter = [];
        if ($lastSyncTime !== null) {
            $lastSyncTimestamp = is_numeric($lastSyncTime) ? (int)$lastSyncTime : strtotime($lastSyncTime);
            $lastSyncDate = new \MongoDB\BSON\UTCDateTime($lastSyncTimestamp * 1000);
            $filter['订单创建时间'] = ['$gt' => $lastSyncDate];
        }

        // 获取总数（用于计算进度）
        $totalCount = $collection->countDocuments($filter);
        // \Workerman\Worker::safeEcho("[ConsumptionCollectionHandler] 【步骤7-统计总数】总记录数: {$totalCount}\n");

        // 计算进度更新间隔（根据总数动态调整）
        $updateInterval = $this->calculateProgressUpdateInterval($totalCount);
        // \Workerman\Worker::safeEcho("[ConsumptionCollectionHandler] 【步骤7-统计总数】进度更新间隔: 每 {$updateInterval} 条更新一次\n");

        // 更新进度：开始采集
        // 注意：任务状态已经在 startTask 方法中设置为 running，这里不需要再次更新状态
        // 只需要更新进度信息（start_time, total_count等）
        if (!empty($taskId)) {
            $this->updateProgress($taskId, [
                // 不更新 status，因为 startTask 已经设置为 running
                'start_time' => new \MongoDB\BSON\UTCDateTime(time() * 1000),
                'total_count' => $totalCount,
                'processed_count' => 0,
                'success_count' => 0,
                'error_count' => 0,
                'percentage' => 0,
            ]);
        }

        // 分页查询
        $offset = 0;
        $processedCount = 0;
        $successCount = 0;
        $errorCount = 0;
        $lastUpdateCount = 0; // 记录上次更新的处理数量
        $isCompleted = false; // 标记是否已完成

        do {
            $cursor = $collection->find(
                $filter,
                [
                    'limit' => $batchSize,
                    'skip' => $offset,
                    'sort' => ['订单创建时间' => 1],
                ]
            );

            $batch = [];
            foreach ($cursor as $doc) {
                $batch[] = $this->convertMongoDocumentToArray($doc);
            }

            if (empty($batch)) {
                // \Workerman\Worker::safeEcho("[ConsumptionCollectionHandler] 【步骤8-查询数据】批次为空，结束查询\n");
                break;
            }

            $batchCount = count($batch);
            // \Workerman\Worker::safeEcho("[ConsumptionCollectionHandler] 【步骤8-查询数据】查询到 {$batchCount} 条数据，offset={$offset}\n");
            
            // 获取任务ID
            $taskId = $taskConfig['task_id'] ?? '';
            
            // 检查任务状态（在批次处理前）
            if (!empty($taskId) && !$this->checkTaskStatus($taskId)) {
                // \Workerman\Worker::safeEcho("[ConsumptionCollectionHandler] ⚠️  任务已暂停或停止，停止采集\n");
                break;
            }
            
            // 如果已完成，不再处理
            if ($isCompleted) {
                break;
            }
            
            // 处理批量数据
            foreach ($batch as $index => $orderData) {
                // 每10条检查一次任务状态
                if (!empty($taskId) && ($index + 1) % 10 === 0) {
                    if (!$this->checkTaskStatus($taskId)) {
                        // \Workerman\Worker::safeEcho("[ConsumptionCollectionHandler] ⚠️  任务已暂停或停止，停止处理剩余数据\n");
                        break 2; // 跳出两层循环（foreach 和 do-while）
                    }
                }
                
                // 检查是否已达到总数（在每条处理前检查，避免超出）
                // 注意：检查在递增之前，如果 processedCount == totalCount - 1，会继续处理一条
                // 然后 processedCount 变成 totalCount，下次循环时会 break
                if ($totalCount > 0 && $processedCount >= $totalCount) {
                    $isCompleted = true;
                    break; // 跳出当前批次处理循环
                }
                
                $processedCount++;
                $orderNo = $orderData['订单编号'] ?? 'unknown';
                
                try {
                    // 每10条输出一次简要进度
                    if (($index + 1) % 10 === 0) {
                        // \Workerman\Worker::safeEcho("   ⏳ 批量处理进度: {$processedCount} / {$batchCount} (本批次) | 总成功: {$successCount} | 总失败: {$errorCount}\n");
                    }
                    
                    $this->processKrMallOrder($orderData, $taskConfig);
                    $successCount++;
                } catch (\Exception $e) {
                    $errorCount++;
                    $errorMsg = $e->getMessage();
                    // \Workerman\Worker::safeEcho("   ❌ [订单编号: {$orderNo}] 处理失败: {$errorMsg}\n");
                    LoggerHelper::logError($e, [
                        'component' => 'ConsumptionCollectionHandler',
                        'action' => 'processKrMallOrder',
                        'order_no' => $orderNo,
                    ]);
                }
            }
            
            // 批次处理完成，根据更新间隔决定是否更新进度
            if (!empty($taskId) && $totalCount > 0) {
                // 只有当处理数量达到更新间隔时才更新进度
                if (($processedCount - $lastUpdateCount) >= $updateInterval || $processedCount >= $totalCount) {
                    $percentage = round(($processedCount / $totalCount) * 100, 2);
                    
                    // 检查是否达到100%
                    if ($processedCount >= $totalCount) {
                        // 进度达到100%，停止采集并更新状态为已完成
                        $this->updateProgress($taskId, [
                            'status' => 'completed',
                            'processed_count' => $processedCount,
                            'success_count' => $successCount,
                            'error_count' => $errorCount,
                            'percentage' => 100,
                            'end_time' => new \MongoDB\BSON\UTCDateTime(time() * 1000),
                        ]);
                        // \Workerman\Worker::safeEcho("[ConsumptionCollectionHandler] ✅ 采集完成，进度已达到100%，已停止采集\n");
                        $isCompleted = true; // 标记为已完成
                    } else {
                        $this->updateProgress($taskId, [
                            'total_count' => $totalCount, // 确保每次更新都包含 total_count
                            'processed_count' => $processedCount,
                            'success_count' => $successCount,
                            'error_count' => $errorCount,
                            'percentage' => $percentage,
                        ]);
                    }
                    $lastUpdateCount = $processedCount;
                }
            }
            
            // 批次处理完成，输出统计
            if ($batchCount > 0) {
                // \Workerman\Worker::safeEcho("   📊 本批次完成: 总数={$batchCount}, 成功={$successCount}, 失败={$errorCount}\n");
            }

            $offset += $batchSize;

            LoggerHelper::logBusiness('kr_mall_collection_batch_processed', [
                'processed' => $processedCount,
                'success' => $successCount,
                'error' => $errorCount,
                'offset' => $offset,
            ]);

        } while (count($batch) === $batchSize && !$isCompleted);

        // 更新进度：采集完成（如果循环正常结束，也更新状态为已完成）
        if (!empty($taskId)) {
            $percentage = $totalCount > 0 ? round(($processedCount / $totalCount) * 100, 2) : 100;
            // 获取当前任务状态
            $task = $this->taskService->getTask($taskId);
            if ($task) {
                // 只有在任务状态不是 completed、paused、stopped 时，才更新为 completed
                // 如果任务被暂停或停止，不应该更新为 completed
                if ($task['status'] === 'completed') {
                    // 已经是 completed，不需要更新
                } elseif (in_array($task['status'], ['paused', 'stopped'])) {
                    // 任务被暂停或停止，只更新进度，不更新状态
                    // \Workerman\Worker::safeEcho("[ConsumptionCollectionHandler] ⚠️  任务已被暂停或停止，不更新为completed状态\n");
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
                        'total_count' => $totalCount,
                        'processed_count' => $processedCount,
                        'success_count' => $successCount,
                        'error_count' => $errorCount,
                        'percentage' => 100, // 完成时强制设置为100%
                        'end_time' => new \MongoDB\BSON\UTCDateTime(time() * 1000),
                    ]);
                    // \Workerman\Worker::safeEcho("[ConsumptionCollectionHandler] ✅ 采集任务完成，状态已更新为completed\n");
                }
            }
        }

        LoggerHelper::logBusiness('kr_mall_collection_completed', [
            'total_processed' => $processedCount,
            'total_success' => $successCount,
            'total_error' => $errorCount,
        ]);
    }

    /**
     * 处理KR_商城订单数据
     * 
     * @param array<string, mixed> $orderData 订单数据
     * @param array<string, mixed> $taskConfig 任务配置
     * @return void
     */
    private function processKrMallOrder(array $orderData, array $taskConfig): void
    {
        $orderNo = $orderData['订单编号'] ?? 'unknown';
        
        // 1. 提取手机号（优先使用支付宝账号，其次是收货人电话）
        $phoneNumber = $this->extractPhoneNumber($orderData);
        if (empty($phoneNumber)) {
            LoggerHelper::logBusiness('consumption_collection_skip_no_phone', [
                'order_no' => $orderNo,
                'reason' => '无法提取手机号',
            ]);
            // \Workerman\Worker::safeEcho("   ⚠️  [订单编号: {$orderNo}] 跳过：无法提取手机号\n");
            return; // 跳过无法提取手机号的记录
        }

        // 2. 字段映射和转换
        $consumeRecord = $this->transformKrMallOrder($orderData, $phoneNumber, $taskConfig);

        // 3. 写入消费记录（会在saveConsumptionRecord中输出详细的流水信息）
        $this->saveConsumptionRecord($consumeRecord);
    }

    /**
     * 转换KR_商城订单数据为标准消费记录格式
     * 
     * @param array<string, mixed> $orderData 订单数据
     * @param string $phoneNumber 手机号
     * @param array<string, mixed> $taskConfig 任务配置
     * @return array<string, mixed> 标准消费记录数据
     */
    private function transformKrMallOrder(array $orderData, string $phoneNumber, array $taskConfig): array
    {
        // 首先应用字段映射（从任务配置中读取字段映射）
        $fieldMappings = $taskConfig['field_mappings'] ?? [];
        
        // 调试：输出字段映射配置和源数据字段
        // \Workerman\Worker::safeEcho("[ConsumptionCollectionHandler] 【步骤9-字段映射】字段映射配置数量: " . count($fieldMappings) . "\n");
        if (!empty($fieldMappings)) {
            foreach ($fieldMappings as $idx => $mapping) {
                $targetField = $mapping['target_field'] ?? '';
                $sourceField = $mapping['source_field'] ?? '';
                if ($targetField === 'store_name') {
                    // \Workerman\Worker::safeEcho("[ConsumptionCollectionHandler] 【步骤9-字段映射】找到store_name映射: target={$targetField}, source={$sourceField}\n");
                }
            }
        }
        
        // 调试：输出源数据中的字段名（用于排查）
        $sourceFields = array_keys($orderData);
        // \Workerman\Worker::safeEcho("[ConsumptionCollectionHandler] 【步骤9-字段映射】源数据字段列表: " . implode(', ', array_slice($sourceFields, 0, 20)) . (count($sourceFields) > 20 ? '...' : '') . "\n");
        
        $mappedData = $this->applyFieldMappings($orderData, $fieldMappings);
        
        // \Workerman\Worker::safeEcho("[ConsumptionCollectionHandler] 【步骤9-字段映射】应用字段映射完成，映射字段数: " . count($mappedData) . ", 映射后的字段: " . implode(', ', array_keys($mappedData)) . "\n");

        // 从映射后的数据中获取字段值（如果没有映射，使用默认值或从源数据获取）
        // 消费时间：从字段映射中获取，如果没有则尝试从源数据获取
        $consumeTimeStr = $mappedData['consume_time'] ?? null;
        if (empty($consumeTimeStr)) {
            // 后备方案：尝试从源数据中获取（向后兼容）
            $consumeTimeStr = $orderData['订单付款时间'] ?? $orderData['订单创建时间'] ?? null;
        }
        $consumeTime = $this->parseDateTime($consumeTimeStr);
        if ($consumeTime === null) {
            throw new \InvalidArgumentException('无法解析消费时间');
        }

        // 金额：从字段映射中获取
        $totalAmount = $this->parseAmount($mappedData['amount'] ?? '0');
        $actualAmount = $this->parseAmount($mappedData['actual_amount'] ?? $totalAmount);
        $discountAmount = $totalAmount - $actualAmount;

        // 积分抵扣：从字段映射中获取（如果有）
        $pointsDeduction = 0;
        if (isset($mappedData['points_deduction']) && !empty($mappedData['points_deduction'])) {
            $pointsDeduction = $this->parseAmount($mappedData['points_deduction']);
        }

        // 门店名称：从字段映射中获取，优先保存原始门店名称
        $storeName = $mappedData['store_name'] ?? null;
        // \Workerman\Worker::safeEcho("[ConsumptionCollectionHandler] 【步骤9-字段映射】映射后的store_name值: " . ($storeName ?? 'null') . "\n");
        
        if (empty($storeName)) {
            // 后备方案：尝试从源数据中获取（向后兼容）
            // \Workerman\Worker::safeEcho("[ConsumptionCollectionHandler] 【步骤9-字段映射】store_name为空，尝试从源数据中查找\n");
            // 尝试多个可能的字段名
            $possibleStoreNameFields = ['新零售成交门店昵称', '门店名称', '店铺名称', '门店名', '店铺名', 'store_name', 'storeName', '门店', '店铺'];
            foreach ($possibleStoreNameFields as $fieldName) {
                if (isset($orderData[$fieldName]) && !empty($orderData[$fieldName])) {
                    $storeName = $orderData[$fieldName];
                    // \Workerman\Worker::safeEcho("[ConsumptionCollectionHandler] 【步骤9-字段映射】从源数据中找到门店名称: {$fieldName} = {$storeName}\n");
                    break;
                }
            }
            if (empty($storeName)) {
                $storeName = 'KR_商城_在线店铺'; // 默认值
                // \Workerman\Worker::safeEcho("[ConsumptionCollectionHandler] 【步骤9-字段映射】未找到门店名称字段，使用默认值: {$storeName}\n");
            }
        }
        
        // 门店ID：通过门店服务获取或创建（即使失败也不影响门店名称的保存）
        $storeId = $mappedData['store_id'] ?? null;
        if (empty($storeId) && !empty($storeName)) {
            try {
                $source = $taskConfig['data_source_id'] ?? $taskConfig['name'] ?? 'KR_商城';
                $storeId = $this->storeService->getOrCreateStoreByName($storeName, $source);
            } catch (\Throwable $e) {
                // 店铺ID获取失败不影响门店名称的保存，只记录日志
                LoggerHelper::logError($e, [
                    'component' => 'ConsumptionCollectionHandler',
                    'action' => 'transformKrMallOrder',
                    'message' => '获取店铺ID失败，但会继续保存门店名称',
                    'store_name' => $storeName,
                ]);
            }
        }

        // 支付方式：从字段映射中获取
        $paymentMethodCode = $mappedData['payment_method_code'] ?? null;
        if (empty($paymentMethodCode)) {
            // 后备方案：从源数据解析（向后兼容）
            $paymentMethodCode = $this->parsePaymentMethod($orderData['支付详情'] ?? '');
        }

        // 支付状态：从字段映射中获取，如果没有则从订单状态解析
        $paymentStatus = $mappedData['payment_status'] ?? null;
        if ($paymentStatus === null) {
            // 后备方案：从源数据解析（向后兼容）
            $paymentStatus = $this->parsePaymentStatus($orderData['订单状态'] ?? '');
        }

        // 消费渠道：从字段映射中获取
        $consumeChannel = $mappedData['consume_channel'] ?? null;
        if (empty($consumeChannel)) {
            // 后备方案：从源数据解析（向后兼容）
            $consumeChannel = $this->parseConsumeChannel($orderData['是否手机订单'] ?? '');
        }

        // 消费时段
        $consumePeriod = $this->parseConsumePeriod($consumeTime);

        // 原始订单ID：从字段映射中获取
        $sourceOrderId = $mappedData['source_order_id'] ?? null;
        if (empty($sourceOrderId)) {
            // 后备方案：从源数据获取（向后兼容）
            $sourceOrderId = $orderData['订单编号'] ?? null;
        }

        // 币种：从字段映射中获取，默认为CNY
        $currency = $mappedData['currency'] ?? 'CNY';

        // 状态：从字段映射中获取，默认为0（正常）
        $status = $mappedData['status'] ?? 0;

        // 支付单号：从字段映射中获取
        $paymentTransactionId = $mappedData['payment_transaction_id'] ?? null;
        if (empty($paymentTransactionId)) {
            // 后备方案：从源数据获取（向后兼容）
            $paymentTransactionId = $orderData['支付单号'] ?? null;
        }

        return [
            'phone_number' => $phoneNumber, // 传递手机号，让ConsumptionService解析user_id
            'consume_time' => $consumeTime->format('Y-m-d H:i:s'),
            'amount' => $totalAmount,
            'actual_amount' => $actualAmount,
            'discount_amount' => $discountAmount > 0 ? $discountAmount : null,
            'points_deduction' => $pointsDeduction > 0 ? $pointsDeduction : null,
            'currency' => $currency,
            'store_id' => $storeId,
            'store_name' => $storeName, // 保存门店名称，用于去重和展示
            'payment_method_code' => $paymentMethodCode,
            'payment_channel' => $paymentMethodCode === 'alipay' ? '支付宝' : '其他',
            'payment_transaction_id' => $paymentTransactionId,
            'payment_status' => $paymentStatus,
            'consume_channel' => $consumeChannel,
            'consume_period' => $consumePeriod,
            'is_workday' => $this->isWorkday($consumeTime) ? 1 : 0,
            'source_order_id' => $sourceOrderId, // 原始订单ID，用于去重
            'status' => $status,
        ];
    }

    /**
     * 从KR数据库采集金融贷款数据
     * 
     * @param mixed $adapter 数据源适配器
     * @param array<string, mixed> $taskConfig 任务配置
     * @return void
     */
    private function collectFromKrFinance($adapter, array $taskConfig): void
    {
        $taskId = $taskConfig['task_id'] ?? '';
        $databaseName = $taskConfig['database'] ?? 'KR';
        $collections = $taskConfig['collections'] ?? [
            '金融客户_厦门_A级用户',
            '金融客户_厦门_B级用户',
            '金融客户_厦门_C级用户',
            '金融客户_厦门_D级用户',
            '金融客户_厦门_E级用户',
            '厦门用户资产2025年9月_优化版',
        ];

        LoggerHelper::logBusiness('kr_finance_collection_start', [
            'database' => $databaseName,
            'collections' => $collections,
        ]);

        $client = $this->getMongoClient($taskConfig);
        $database = $client->selectDatabase($databaseName);

        // 计算总数（遍历所有集合）
        $totalCount = 0;
        foreach ($collections as $collectionName) {
            $collection = $database->selectCollection($collectionName);
            $totalCount += $collection->countDocuments([
                'loan_amount' => ['$exists' => true, '$ne' => null, '$ne' => ''],
            ]);
        }
        // \Workerman\Worker::safeEcho("[ConsumptionCollectionHandler] 【步骤7-统计总数】总记录数: {$totalCount}\n");

        // 计算进度更新间隔（根据总数动态调整）
        $updateInterval = $this->calculateProgressUpdateInterval($totalCount);
        // \Workerman\Worker::safeEcho("[ConsumptionCollectionHandler] 【步骤7-统计总数】进度更新间隔: 每 {$updateInterval} 条更新一次\n");

        // 更新进度：开始采集
        if (!empty($taskId)) {
            $this->updateProgress($taskId, [
                'status' => 'running',
                'start_time' => new \MongoDB\BSON\UTCDateTime(time() * 1000),
                'total_count' => $totalCount,
                'processed_count' => 0,
                'success_count' => 0,
                'error_count' => 0,
                'percentage' => 0,
            ]);
        }

        $processedCount = 0;
        $successCount = 0;
        $errorCount = 0;
        $lastUpdateCount = 0; // 记录上次更新的处理数量
        $isCompleted = false; // 标记是否已完成

        foreach ($collections as $collectionName) {
            // 如果已完成，不再处理
            if ($isCompleted) {
                break;
            }
            
            try {
                $collection = $database->selectCollection($collectionName);
                
                // 查询有loan_amount的记录
                $cursor = $collection->find([
                    'loan_amount' => ['$exists' => true, '$ne' => null, '$ne' => ''],
                ]);

                foreach ($cursor as $doc) {
                    // 检查任务状态
                    if (!empty($taskId) && !$this->checkTaskStatus($taskId)) {
                        // \Workerman\Worker::safeEcho("[ConsumptionCollectionHandler] ⚠️  任务已暂停或停止，停止采集\n");
                        $isCompleted = true;
                        break 2; // 跳出两层循环
                    }
                    
                    // 检查是否已达到总数（在每条处理前检查，避免超出）
                    if ($totalCount > 0 && $processedCount >= $totalCount) {
                        $isCompleted = true;
                        break 2; // 跳出两层循环
                    }
                    
                    $processedCount++;
                    try {
                        $financeData = $this->convertMongoDocumentToArray($doc);
                        $this->processKrFinanceRecord($financeData, $collectionName, $taskConfig);
                        $successCount++;
                        
                        // 根据更新间隔更新进度
                        if (!empty($taskId)) {
                            // 如果totalCount为0，也要更新进度（显示已处理数量）
                            if ($totalCount == 0 || ($processedCount - $lastUpdateCount) >= $updateInterval || $processedCount >= $totalCount) {
                                if ($totalCount > 0) {
                                    $percentage = round(($processedCount / $totalCount) * 100, 2);
                                } else {
                                    $percentage = 0; // 总数未知时，百分比为0
                                }
                                
                                // 检查是否达到100%
                                if ($totalCount > 0 && $processedCount >= $totalCount) {
                                    // 进度达到100%，停止采集并更新状态为已完成
                                    $this->updateProgress($taskId, [
                                        'status' => 'completed',
                                        'total_count' => $totalCount,
                                        'processed_count' => $processedCount,
                                        'success_count' => $successCount,
                                        'error_count' => $errorCount,
                                        'percentage' => 100,
                                        'end_time' => new \MongoDB\BSON\UTCDateTime(time() * 1000),
                                    ]);
                                    // \Workerman\Worker::safeEcho("[ConsumptionCollectionHandler] ✅ 采集完成，进度已达到100%，已停止采集\n");
                                    $isCompleted = true; // 标记为已完成
                                    break 2; // 跳出两层循环
                                } else {
                                    $this->updateProgress($taskId, [
                                        'total_count' => $totalCount,
                                        'processed_count' => $processedCount,
                                        'success_count' => $successCount,
                                        'error_count' => $errorCount,
                                        'percentage' => $percentage,
                                    ]);
                                }
                                $lastUpdateCount = $processedCount;
                            }
                        }
                    } catch (\Exception $e) {
                        $errorCount++;
                        LoggerHelper::logError($e, [
                            'component' => 'ConsumptionCollectionHandler',
                            'action' => 'processKrFinanceRecord',
                            'collection' => $collectionName,
                        ]);
                    }
                }
            } catch (\Exception $e) {
                LoggerHelper::logError($e, [
                    'component' => 'ConsumptionCollectionHandler',
                    'action' => 'collectFromKrFinance',
                    'collection' => $collectionName,
                ]);
            }
        }

        // 更新进度：采集完成（如果循环正常结束，也更新状态为已完成）
        if (!empty($taskId)) {
            $percentage = $totalCount > 0 ? round(($processedCount / $totalCount) * 100, 2) : 100;
            // 获取当前任务状态
            $task = $this->taskService->getTask($taskId);
            if ($task) {
                // 只有在任务状态不是 completed、paused、stopped 时，才更新为 completed
                // 如果任务被暂停或停止，不应该更新为 completed
                if ($task['status'] === 'completed') {
                    // 已经是 completed，不需要更新
                } elseif (in_array($task['status'], ['paused', 'stopped'])) {
                    // 任务被暂停或停止，只更新进度，不更新状态
                    // \Workerman\Worker::safeEcho("[ConsumptionCollectionHandler] ⚠️  任务已被暂停或停止，不更新为completed状态\n");
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
                        'total_count' => $totalCount,
                        'processed_count' => $processedCount,
                        'success_count' => $successCount,
                        'error_count' => $errorCount,
                        'percentage' => 100, // 完成时强制设置为100%
                        'end_time' => new \MongoDB\BSON\UTCDateTime(time() * 1000),
                    ]);
                    // \Workerman\Worker::safeEcho("[ConsumptionCollectionHandler] ✅ 采集任务完成，状态已更新为completed\n");
                }
            }
        }

        LoggerHelper::logBusiness('kr_finance_collection_completed', [
            'total_processed' => $processedCount,
            'total_success' => $successCount,
            'total_error' => $errorCount,
        ]);
    }

    /**
     * 处理KR金融记录数据
     * 
     * @param array<string, mixed> $financeData 金融数据
     * @param string $collectionName 集合名称
     * @param array<string, mixed> $taskConfig 任务配置
     * @return void
     */
    private function processKrFinanceRecord(array $financeData, string $collectionName, array $taskConfig): void
    {
        // 1. 提取手机号
        $phoneNumber = $financeData['mobile'] ?? null;
        if (empty($phoneNumber)) {
            LoggerHelper::logBusiness('consumption_collection_skip_no_phone', [
                'collection' => $collectionName,
                'reason' => '无法提取手机号',
            ]);
            return; // 跳过无法提取手机号的记录
        }

        // 2. 字段映射和转换
        $consumeRecord = $this->transformKrFinanceRecord($financeData, $phoneNumber, $collectionName, $taskConfig);

        // 3. 写入消费记录
        $this->saveConsumptionRecord($consumeRecord);
    }

    /**
     * 转换KR金融记录数据为标准消费记录格式
     * 
     * @param array<string, mixed> $financeData 金融数据
     * @param string $phoneNumber 手机号
     * @param string $collectionName 集合名称
     * @param array<string, mixed> $taskConfig 任务配置
     * @return array<string, mixed> 标准消费记录数据
     */
    private function transformKrFinanceRecord(
        array $financeData,
        string $phoneNumber,
        string $collectionName,
        array $taskConfig
    ): array {
        // 首先应用字段映射（从任务配置中读取字段映射）
        $fieldMappings = $taskConfig['field_mappings'] ?? [];
        $mappedData = $this->applyFieldMappings($financeData, $fieldMappings);
        
        // \Workerman\Worker::safeEcho("[ConsumptionCollectionHandler] 【步骤9-字段映射】应用字段映射完成，映射字段数: " . count($mappedData) . "\n");

        // 从映射后的数据中获取字段值
        // 贷款金额作为消费金额：从字段映射中获取
        $loanAmount = $this->parseAmount($mappedData['amount'] ?? '0');
        if ($loanAmount <= 0) {
            // 后备方案：从源数据获取（向后兼容）
            $loanAmount = $this->parseAmount($financeData['loan_amount'] ?? '0');
            if ($loanAmount <= 0) {
                throw new \InvalidArgumentException('贷款金额无效');
            }
        }

        // 消费时间：从字段映射中获取
        $consumeTimeStr = $mappedData['consume_time'] ?? null;
        if (empty($consumeTimeStr)) {
            // 后备方案：从源数据获取（向后兼容）
            $consumeTimeStr = $financeData['借款日期'] ?? null;
        }
        $consumeTime = $this->parseDateTime($consumeTimeStr);
        if ($consumeTime === null) {
            $consumeTime = new \DateTimeImmutable('now');
        }

        // 门店名称：从字段映射中获取
        $storeName = $mappedData['store_name'] ?? "未知门店";
        
        
        // 门店ID：通过门店服务获取或创建（即使失败也不影响门店名称的保存）
        $storeId = $mappedData['store_id'] ?? null;
        if (empty($storeId) && !empty($storeName)) {
            try {
                $source = $taskConfig['data_source_id'] ?? $taskConfig['name'] ?? 'KR_金融';
                $storeId = $this->storeService->getOrCreateStoreByName($storeName, $source);
            } catch (\Throwable $e) {
                // 店铺ID获取失败不影响门店名称的保存，只记录日志
                LoggerHelper::logError($e, [
                    'component' => 'ConsumptionCollectionHandler',
                    'action' => 'transformKrFinanceRecord',
                    'message' => '获取店铺ID失败，但会继续保存门店名称',
                    'store_name' => $storeName,
                ]);
            }
        }

        // 消费时段
        $consumePeriod = $this->parseConsumePeriod($consumeTime);

        // 币种：从字段映射中获取，默认为CNY
        $currency = $mappedData['currency'] ?? 'CNY';

        // 状态：从字段映射中获取，默认为0（正常）
        $status = $mappedData['status'] ?? 0;

        // 支付方式：从字段映射中获取，默认为finance_loan
        $paymentMethodCode = $mappedData['payment_method_code'] ?? 'finance_loan';

        // 支付渠道：从字段映射中获取，默认为金融
        $paymentChannel = $mappedData['payment_channel'] ?? '金融';

        // 支付状态：从字段映射中获取，默认为0（成功）
        $paymentStatus = $mappedData['payment_status'] ?? 0;

        // 消费渠道：从字段映射中获取，默认为线下
        $consumeChannel = $mappedData['consume_channel'] ?? '线下';

        return [
            'phone_number' => $phoneNumber, // 传递手机号，让ConsumptionService解析user_id
            'consume_time' => $consumeTime->format('Y-m-d H:i:s'),
            'amount' => $loanAmount,
            'actual_amount' => $loanAmount, // 金融贷款，实际金额等于贷款金额
            'currency' => $currency,
            'store_id' => $storeId,
            'store_name' => $storeName, // 保存门店名称，用于去重和展示
            'payment_method_code' => $paymentMethodCode,
            'payment_channel' => $paymentChannel,
            'payment_status' => $paymentStatus,
            'consume_channel' => $consumeChannel,
            'consume_period' => $consumePeriod,
            'is_workday' => $this->isWorkday($consumeTime) ? 1 : 0,
            'status' => $status,
        ];
    }

    /**
     * 保存消费记录
     * 
     * @param array<string, mixed> $recordData 记录数据
     * @return void
     */
    private function saveConsumptionRecord(array $recordData): void
    {
        // \Workerman\Worker::safeEcho("[ConsumptionCollectionHandler] 【步骤11-保存数据】开始保存消费记录\n");
        // 根据任务配置保存到目标数据源
        $targetDataSourceId = $this->taskConfig['target_data_source_id'] ?? null;
        $targetDatabase = $this->taskConfig['target_database'] ?? null;
        $targetCollection = $this->taskConfig['target_collection'] ?? 'consumption_records';
        
        // \Workerman\Worker::safeEcho("[ConsumptionCollectionHandler] 【步骤11-保存数据】目标配置: data_source_id={$targetDataSourceId}, database={$targetDatabase}, collection={$targetCollection}\n");
        
        if (empty($targetDataSourceId)) {
            // \Workerman\Worker::safeEcho("[ConsumptionCollectionHandler] 【步骤11-保存数据】使用默认ConsumptionService（向后兼容）\n");
            // 如果没有配置目标数据源，使用默认的 ConsumptionService（向后兼容）
            $result = $this->consumptionService->createRecord($recordData);
            // 如果返回 null，说明手机号和身份证号都为空，跳过该记录
            if ($result === null) {
                // \Workerman\Worker::safeEcho("[ConsumptionCollectionHandler] 【步骤11-保存数据】⚠️ 跳过记录：手机号和身份证号都为空\n");
                return;
            }
            return;
        }
        
        // 连接到目标数据源
        // \Workerman\Worker::safeEcho("[ConsumptionCollectionHandler] 【步骤12-连接目标数据源】开始查询目标数据源配置: data_source_id={$targetDataSourceId}\n");
        $connectionInfo = $this->connectToTargetDataSource($targetDataSourceId, $targetDatabase);
        $targetDataSourceConfig = $connectionInfo['config'];
        $dbName = $connectionInfo['dbName'];
        $database = $connectionInfo['database'];
        
        // \Workerman\Worker::safeEcho("[ConsumptionCollectionHandler] 【步骤12-连接目标数据源】✓ 目标数据源配置查询成功: host={$targetDataSourceConfig['host']}, port={$targetDataSourceConfig['port']}\n");
        
        // 根据消费时间确定月份集合（使用 Trait 方法）
        $collectionName = $this->getMonthlyCollectionName(
            $targetCollection,
            $recordData['consume_time'] ?? null
        );
        
        // 解析用户ID（如果提供了手机号或身份证）
        if (empty($recordData['user_id']) && (!empty($recordData['phone_number']) || !empty($recordData['id_card']))) {
            // 解析 consume_time 作为查询时间点
            $consumeTime = null;
            if (isset($recordData['consume_time'])) {
                if (is_string($recordData['consume_time'])) {
                    $consumeTime = new \DateTimeImmutable($recordData['consume_time']);
                } elseif ($recordData['consume_time'] instanceof \MongoDB\BSON\UTCDateTime) {
                    $timestamp = $recordData['consume_time']->toDateTime()->getTimestamp();
                    $consumeTime = new \DateTimeImmutable('@' . $timestamp);
                }
            }
            
            $userId = $this->identifierService->resolvePersonId(
                $recordData['phone_number'] ?? null,
                $recordData['id_card'] ?? null,
                $consumeTime
            );
            $recordData['user_id'] = $userId;
        }
        
        // 转换时间字段为 MongoDB UTCDateTime（在去重检查前转换，用于查询）
        $consumeTimeForQuery = null;
        if (isset($recordData['consume_time'])) {
            if (is_string($recordData['consume_time'])) {
                $consumeTimeForQuery = new \MongoDB\BSON\UTCDateTime(strtotime($recordData['consume_time']) * 1000);
            } elseif ($recordData['consume_time'] instanceof \MongoDB\BSON\UTCDateTime) {
                $consumeTimeForQuery = $recordData['consume_time'];
            }
        }
        $recordData['consume_time'] = $consumeTimeForQuery ?? new \MongoDB\BSON\UTCDateTime(time() * 1000);
        
        if (empty($recordData['create_time'])) {
            $recordData['create_time'] = new \MongoDB\BSON\UTCDateTime(time() * 1000);
        } elseif (is_string($recordData['create_time'])) {
            $recordData['create_time'] = new \MongoDB\BSON\UTCDateTime(strtotime($recordData['create_time']) * 1000);
        }
        
        // 写入数据
        $collection = $database->selectCollection($collectionName);
        
        // 获取门店名称（用于去重）
        // 优先使用从源数据映射的门店名称，无论店铺表查询结果如何
        $storeName = $recordData['store_name'] ?? null;
        
        // 如果源数据中没有 store_name 但有 store_id，尝试从店铺表获取门店名称（作为后备方案）
        // 但即使查询失败，也要确保 store_name 字段被保存（可能为 null）
        if (empty($storeName) && !empty($recordData['store_id'])) {
            try {
                $store = $this->storeService->getStoreById($recordData['store_id']);
                if ($store && $store->store_name) {
                    $storeName = $store->store_name;
                }
            } catch (\Throwable $e) {
                // 从店铺表反查失败不影响数据保存，只记录日志
                LoggerHelper::logError($e, [
                    'component' => 'ConsumptionCollectionHandler',
                    'action' => 'saveConsumptionRecord',
                    'message' => '从店铺表反查门店名称失败，将保存null值',
                    'store_id' => $recordData['store_id'] ?? null,
                ]);
            }
        }
        
        // 确保 store_name 字段被保存到 recordData 中（即使为 null 也要保存，保持数据结构一致）
        $recordData['store_name'] = $storeName;
        
        // 基于业务唯一标识检查重复（防止重复插入）
        // 方案：使用 store_name + source_order_id 作为唯一标识
        // 注意：order_no 是系统自动生成的（自动递增），不参与去重判断
        $duplicateQuery = null;
        $duplicateIdentifier = null;
        $sourceOrderId = $recordData['source_order_id'] ?? null;
        
        if (!empty($storeName) && !empty($sourceOrderId)) {
            // 使用门店名称 + 原始订单ID作为唯一标识
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
                // \Workerman\Worker::safeEcho("[ConsumptionCollectionHandler] ⚠️  记录已存在，跳过插入: {$duplicateIdentifier}, collection={$collectionName}\n");
                LoggerHelper::logBusiness('consumption_record_duplicate_skipped', [
                    'duplicate_identifier' => $duplicateIdentifier,
                    'target_collection' => $collectionName,
                ]);
                return; // 跳过重复记录
            }
        }
        
        // 生成 record_id（如果还没有）
        // 使用门店名称 + 原始订单ID生成稳定的 record_id
        if (empty($recordData['record_id'])) {
            if (!empty($storeName) && !empty($sourceOrderId)) {
                // 使用门店名称 + 原始订单ID生成稳定的 record_id
                $uniqueKey = "{$storeName}|{$sourceOrderId}";
                $recordData['record_id'] = 'store_source_' . md5($uniqueKey);
            } else {
                // 如果都没有，生成 UUID（这种情况应该很少）
                $recordData['record_id'] = UuidGenerator::uuid4()->toString();
            }
        }
        
        // 生成 order_no（系统自动生成，自动递增）
        // 注意：order_no 不参与去重判断，仅用于展示和查询
        // 使用计数器集合来生成唯一的 order_no（在去重检查之后，只有实际插入的记录才生成 order_no）
        if (empty($recordData['order_no'])) {
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
                $recordData['order_no'] = (string)$nextOrderNo;
            } catch (\Throwable $e) {
                // 如果计数器操作失败，回退到查询最大值的方案
                LoggerHelper::logError($e, [
                    'component' => 'ConsumptionCollectionHandler',
                    'action' => 'saveConsumptionRecord',
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
                    $recordData['order_no'] = (string)$nextOrderNo;
                } catch (\Throwable $e2) {
                    // 如果查询也失败，使用时间戳作为备选方案
                    $recordData['order_no'] = (string)(time() * 1000 + mt_rand(1000, 9999));
                    LoggerHelper::logError($e2, [
                        'component' => 'ConsumptionCollectionHandler',
                        'action' => 'saveConsumptionRecord',
                        'message' => '查询最大order_no也失败，使用时间戳作为备选',
                    ]);
                }
            }
        }
        
        // 格式化输出流水信息
        $timestamp = date('Y-m-d H:i:s');
        $recordId = $recordData['record_id'] ?? 'null';
        $userId = $recordData['user_id'] ?? 'null';
        $amount = $recordData['amount'] ?? 0;
        $actualAmount = $recordData['actual_amount'] ?? $amount;
        $consumeTime = isset($recordData['consume_time']) && $recordData['consume_time'] instanceof \MongoDB\BSON\UTCDateTime
            ? $recordData['consume_time']->toDateTime()->format('Y-m-d H:i:s')
            : ($recordData['consume_time'] ?? 'null');
        $storeId = $recordData['store_id'] ?? 'null';
        $phoneNumber = $recordData['phone_number'] ?? 'null';
        
        // 确保 storeName 变量已定义（从 recordData 中获取，如果之前已赋值）
        $storeNameOutput = $recordData['store_name'] ?? 'null';
        
        // 输出详细的插入流水信息（输出到终端）
        // $output = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        //     . "📝 [{$timestamp}] 消费记录插入流水\n"
        //     . "   ├─ 记录ID: {$recordId}\n"
        //     . "   ├─ 用户ID: {$userId}\n"
        //     . "   ├─ 手机号: {$phoneNumber}\n"
        //     . "   ├─ 消费时间: {$consumeTime}\n"
        //     . "   ├─ 消费金额: ¥" . number_format($amount, 2) . "\n"
        //     . "   ├─ 实际金额: ¥" . number_format($actualAmount, 2) . "\n"
        //     . "   ├─ 店铺ID: {$storeId}\n"
        //     . "   ├─ 门店名称: {$storeNameOutput}\n"
        //     . "   ├─ 目标数据库: {$dbName}\n"
        //     . "   └─ 目标集合: {$collectionName}\n";
        
        // // \Workerman\Worker::safeEcho($output); 
        
        $result = $collection->insertOne($recordData);
        $insertedId = $result->getInsertedId();
        
        $successOutput = "   ✅ 插入成功 | MongoDB ID: " . (is_object($insertedId) ? (string)$insertedId : json_encode($insertedId)) . "\n"
            . "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
        
        // \Workerman\Worker::safeEcho($successOutput);
        
        LoggerHelper::logBusiness('consumption_record_saved_to_target', [
            'target_data_source_id' => $targetDataSourceId,
            'target_database' => $dbName,
            'target_collection' => $collectionName,
            'record_id' => $recordData['record_id'],
            'inserted_id' => (string)$insertedId,
        ]);
        
        // 更新用户统计信息（使用默认连接，因为用户数据在主数据库）
        // 如果身份证和手机号都是空的（没有user_id），则不更新用户主表
        if (empty($recordData['user_id'])) {
            // \Workerman\Worker::safeEcho("[ConsumptionCollectionHandler] ⚠️  身份证和手机号都为空，跳过用户主表更新\n");
            LoggerHelper::logBusiness('consumption_record_skip_user_update_no_identifier', [
                'record_id' => $recordData['record_id'] ?? null,
                'phone_number' => $recordData['phone_number'] ?? null,
                'id_card' => isset($recordData['id_card']) ? '***' : null, // 不记录敏感信息
            ]);
            return;
        }
        
        try {
            $userProfileRepo = new \app\repository\UserProfileRepository();
            $consumeTime = isset($recordData['consume_time']) && $recordData['consume_time'] instanceof \MongoDB\BSON\UTCDateTime
                ? \DateTimeImmutable::createFromMutable($recordData['consume_time']->toDateTime())
                : new \DateTimeImmutable();
            $user = $userProfileRepo->increaseStats(
                $recordData['user_id'],
                $recordData['actual_amount'] ?? $recordData['amount'] ?? 0,
                $consumeTime
            );
        } catch (\Exception $e) {
            // 更新用户统计失败不影响数据保存，只记录日志
            LoggerHelper::logError($e, [
                'component' => 'ConsumptionCollectionHandler',
                'action' => 'saveConsumptionRecord',
                'message' => '更新用户统计失败',
            ]);
        }
    }

    /**
     * 应用字段映射
     * 
     * @param array<string, mixed> $sourceData 源数据
     * @param array $fieldMappings 字段映射配置
     * @return array<string, mixed> 映射后的数据
     */
    private function applyFieldMappings(array $sourceData, array $fieldMappings): array
    {
        $mappedData = [];

        foreach ($fieldMappings as $mapping) {
            $sourceField = $mapping['source_field'] ?? '';
            $targetField = $mapping['target_field'] ?? '';
            $transform = $mapping['transform'] ?? null;

            // 如果源字段或目标字段为空，跳过该映射
            if (empty($sourceField) || empty($targetField)) {
                continue;
            }

            // 从源数据中获取值（支持嵌套字段，如 "user.name"）
            $value = $this->getNestedValue($sourceData, $sourceField);

            // 调试：输出store_name字段的映射详情
            if ($targetField === 'store_name') {
                // \Workerman\Worker::safeEcho("[ConsumptionCollectionHandler] 【步骤9-字段映射】字段映射详情: target={$targetField}, source={$sourceField}, value=" . ($value ?? 'null') . "\n");
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
     * 
     * @param array<string, mixed> $data 数据
     * @param string $fieldPath 字段路径（支持嵌套，如 "user.name"）
     * @return mixed 字段值
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
     * 
     * @param mixed $value 原始值
     * @param string $transform 转换函数名称
     * @return mixed 转换后的值
     */
    private function applyTransform($value, string $transform)
    {
        switch ($transform) {
            case 'parse_amount':
                return $this->parseAmount($value);
            case 'parse_datetime':
                return is_string($value) ? $value : ($value instanceof \DateTimeImmutable ? $value->format('Y-m-d H:i:s') : (string)$value);
            case 'parse_phone':
                return $this->extractPhoneNumberFromValue($value);
            default:
                return $value;
        }
    }

    /**
     * 从值中提取手机号
     * 
     * @param mixed $value 值
     * @return string|null 手机号
     */
    private function extractPhoneNumberFromValue($value): ?string
    {
        if (empty($value)) {
            return null;
        }
        $phone = trim((string)$value);
        
        // 先过滤非数字字符
        $cleanedPhone = $this->filterPhoneNumber($phone);
        
        // 验证过滤后的手机号
        if ($this->isValidPhone($cleanedPhone)) {
            // 返回过滤后的手机号
            return $cleanedPhone;
        }
        
        return null;
    }

    /**
     * 从订单数据中提取手机号
     * 
     * @param array<string, mixed> $orderData 订单数据
     * @return string|null 手机号
     */
    private function extractPhoneNumber(array $orderData): ?string
    {
        // 优先使用支付宝账号（通常是手机号）
        if (!empty($orderData['买家支付宝账号'])) {
            $phone = trim($orderData['买家支付宝账号']);
            // 先过滤非数字字符
            $cleanedPhone = $this->filterPhoneNumber($phone);
            if (!empty($cleanedPhone) && $this->isValidPhone($cleanedPhone)) {
                return $cleanedPhone;
            }
        }

        // 其次使用联系电话
        if (!empty($orderData['联系电话'])) {
            $phone = trim($orderData['联系电话']);
            // 先过滤非数字字符
            $cleanedPhone = $this->filterPhoneNumber($phone);
            if (!empty($cleanedPhone) && $this->isValidPhone($cleanedPhone)) {
                return $cleanedPhone;
            }
        }

        return null;
    }

    /**
     * 提取手机号（订单数据专用）
     * 
     * 注意：这个方法保留在此类中，因为它处理的是订单数据的特定字段
     * 通用的手机号提取逻辑在 Trait 中
     */


    /**
     * 解析支付方式
     * 
     * @param string $paymentDetail 支付详情
     * @return string 支付方式编码
     */
    private function parsePaymentMethod(string $paymentDetail): string
    {
        $detail = strtolower($paymentDetail);
        
        if (strpos($detail, '支付宝') !== false || strpos($detail, 'alipay') !== false) {
            return 'alipay';
        }
        if (strpos($detail, '微信') !== false || strpos($detail, 'wechat') !== false || strpos($detail, 'weixin') !== false) {
            return 'wechat';
        }
        if (strpos($detail, '银行卡') !== false || strpos($detail, 'card') !== false) {
            return 'bank_card';
        }

        return 'other';
    }

    /**
     * 解析支付状态
     * 
     * @param string $orderStatus 订单状态
     * @return int 支付状态：0-成功，1-失败，2-退款
     */
    private function parsePaymentStatus(string $orderStatus): int
    {
        $status = strtolower($orderStatus);
        
        if (strpos($status, '退款') !== false || strpos($status, 'refund') !== false) {
            return 2; // 退款
        }
        if (strpos($status, '失败') !== false || strpos($status, 'fail') !== false) {
            return 1; // 失败
        }

        return 0; // 成功
    }

    /**
     * 解析消费渠道
     * 
     * @param string $isMobileOrder 是否手机订单
     * @return string 消费渠道
     */
    private function parseConsumeChannel(string $isMobileOrder): string
    {
        if (strpos($isMobileOrder, '是') !== false || strpos(strtolower($isMobileOrder), 'true') !== false || $isMobileOrder === '1') {
            return '线上_移动端';
        }
        return '线上_PC端';
    }

    /**
     * 解析消费时段
     * 
     * @param \DateTimeImmutable $dateTime 日期时间
     * @return string 消费时段
     */
    private function parseConsumePeriod(\DateTimeImmutable $dateTime): string
    {
        $hour = (int)$dateTime->format('H');
        
        if ($hour >= 6 && $hour < 12) {
            return '上午';
        } elseif ($hour >= 12 && $hour < 14) {
            return '中午';
        } elseif ($hour >= 14 && $hour < 18) {
            return '下午';
        } elseif ($hour >= 18 && $hour < 22) {
            return '晚上';
        } else {
            return '深夜';
        }
    }

    /**
     * 判断是否为工作日
     * 
     * @param \DateTimeImmutable $dateTime 日期时间
     * @return bool 是否为工作日
     */
    private function isWorkday(\DateTimeImmutable $dateTime): bool
    {
        $dayOfWeek = (int)$dateTime->format('w'); // 0=Sunday, 6=Saturday
        return $dayOfWeek >= 1 && $dayOfWeek <= 5;
    }


    /**
     * 从集合名称中提取用户等级
     * 
     * @param string $collectionName 集合名称
     * @return string 用户等级
     */
    private function extractUserLevel(string $collectionName): string
    {
        if (preg_match('/[ABCEDS]级用户/', $collectionName, $matches)) {
            return $matches[0];
        }
        return '未知';
    }


    /**
     * 实时监听KR商城集合变化
     * 
     * @param array<string, mixed> $taskConfig 任务配置
     * @return void
     */
    private function watchKrMallCollection(array $taskConfig): void
    {
        $databaseName = $taskConfig['database'] ?? 'KR_商城';
        $collectionName = $taskConfig['collection'] ?? '21年贝蒂喜订单整合';

        LoggerHelper::logBusiness('kr_mall_realtime_watch_start', [
            'database' => $databaseName,
            'collection' => $collectionName,
        ]);

        $client = $this->getMongoClient($taskConfig);
        $database = $client->selectDatabase($databaseName);
        $collection = $database->selectCollection($collectionName);

        // 创建Change Stream监听集合变化
        $changeStream = $collection->watch(
            [],
            [
                'fullDocument' => 'updateLookup',
                'batchSize' => 100,
                'maxAwaitTimeMS' => 1000,
            ]
        );

        LoggerHelper::logBusiness('kr_mall_realtime_watch_ready', [
            'database' => $databaseName,
            'collection' => $collectionName,
        ]);

        // 处理变更事件
        foreach ($changeStream as $change) {
            try {
                $operationType = $change['operationType'] ?? '';

                // 只处理插入和更新操作
                if ($operationType === 'insert' || $operationType === 'update') {
                    $document = $change['fullDocument'] ?? null;
                    
                    if ($document === null) {
                        // 如果是更新操作但没有fullDocument，需要查询完整文档
                        if ($operationType === 'update') {
                            $documentId = $change['documentKey']['_id'] ?? null;
                            if ($documentId !== null) {
                                $document = $collection->findOne(['_id' => $documentId]);
                            }
                        }
                    }

                    if ($document !== null) {
                        $orderData = $this->convertMongoDocumentToArray($document);
                        $orderNo = $orderData['订单编号'] ?? 'unknown';
                        
                        try {
                            // \Workerman\Worker::safeEcho("   🔔 [实时监听] 检测到变更: operation={$operationType}, 订单编号={$orderNo}\n");
                            $this->processKrMallOrder($orderData, $taskConfig);
                            
                            LoggerHelper::logBusiness('kr_mall_realtime_record_processed', [
                                'operation' => $operationType,
                                'order_no' => $orderNo,
                            ]);
                        } catch (\Exception $e) {
                            $errorMsg = $e->getMessage();
                            // \Workerman\Worker::safeEcho("   ❌ [实时监听] 处理失败: 订单编号={$orderNo}, 错误={$errorMsg}\n");
                            LoggerHelper::logError($e, [
                                'component' => 'ConsumptionCollectionHandler',
                                'action' => 'processKrMallOrder_realtime',
                                'operation' => $operationType,
                                'order_no' => $orderNo,
                            ]);
                        }
                    }
                }
            } catch (\Exception $e) {
                LoggerHelper::logError($e, [
                    'component' => 'ConsumptionCollectionHandler',
                    'action' => 'watchKrMallCollection',
                    'change' => $change,
                ]);
            }
        }
    }

    /**
     * 实时监听KR金融集合变化
     * 
     * @param array<string, mixed> $taskConfig 任务配置
     * @return void
     */
    private function watchKrFinanceCollections(array $taskConfig): void
    {
        $databaseName = $taskConfig['database'] ?? 'KR';
        $collections = $taskConfig['collections'] ?? [
            '金融客户_厦门_A级用户',
            '金融客户_厦门_B级用户',
            '金融客户_厦门_C级用户',
            '金融客户_厦门_D级用户',
            '金融客户_厦门_E级用户',
            '厦门用户资产2025年9月_优化版',
        ];

        LoggerHelper::logBusiness('kr_finance_realtime_watch_start', [
            'database' => $databaseName,
            'collections' => $collections,
        ]);

        $client = $this->getMongoClient($taskConfig);
        $database = $client->selectDatabase($databaseName);

        // 使用数据库级别的Change Stream监听所有集合
        $changeStream = $database->watch(
            [],
            [
                'fullDocument' => 'updateLookup',
                'batchSize' => 100,
                'maxAwaitTimeMS' => 1000,
            ]
        );

        LoggerHelper::logBusiness('kr_finance_realtime_watch_ready', [
            'database' => $databaseName,
        ]);

        // 处理变更事件
        foreach ($changeStream as $change) {
            try {
                $collectionName = $change['ns']['coll'] ?? '';
                
                // 只处理配置的集合
                if (!in_array($collectionName, $collections)) {
                    continue;
                }

                $operationType = $change['operationType'] ?? '';

                // 只处理插入和更新操作，且必须有loan_amount字段
                if ($operationType === 'insert' || $operationType === 'update') {
                    $document = $change['fullDocument'] ?? null;
                    
                    if ($document === null && $operationType === 'update') {
                        // 如果是更新操作但没有fullDocument，需要查询完整文档
                        $documentId = $change['documentKey']['_id'] ?? null;
                        if ($documentId !== null) {
                            $collection = $database->selectCollection($collectionName);
                            $document = $collection->findOne(['_id' => $documentId]);
                        }
                    }

                    if ($document !== null) {
                        $docArray = $this->convertMongoDocumentToArray($document);
                        
                        // 检查是否有loan_amount字段
                        if (isset($docArray['loan_amount']) && !empty($docArray['loan_amount'])) {
                            try {
                                $this->processKrFinanceRecord($docArray, $collectionName, $taskConfig);
                                
                                LoggerHelper::logBusiness('kr_finance_realtime_record_processed', [
                                    'operation' => $operationType,
                                    'collection' => $collectionName,
                                    'mobile' => $docArray['mobile'] ?? 'unknown',
                                ]);
                            } catch (\Exception $e) {
                                LoggerHelper::logError($e, [
                                    'component' => 'ConsumptionCollectionHandler',
                                    'action' => 'processKrFinanceRecord_realtime',
                                    'operation' => $operationType,
                                    'collection' => $collectionName,
                                ]);
                            }
                        }
                    }
                }
            } catch (\Exception $e) {
                LoggerHelper::logError($e, [
                    'component' => 'ConsumptionCollectionHandler',
                    'action' => 'watchKrFinanceCollections',
                    'change' => $change,
                ]);
            }
        }
    }

    /**
     * 检查任务状态（是否应该继续执行）
     * 
     * @param string $taskId 任务ID
     * @return bool true=继续执行, false=暂停/停止
     */
    private function checkTaskStatus(string $taskId): bool
    {
        // 检查Redis标志
        if (\app\utils\RedisHelper::exists("data_collection_task:{$taskId}:pause")) {
            // \Workerman\Worker::safeEcho("[ConsumptionCollectionHandler] 检测到暂停标志，任务 {$taskId} 暂停\n");
            return false;
        }
        if (\app\utils\RedisHelper::exists("data_collection_task:{$taskId}:stop")) {
            // \Workerman\Worker::safeEcho("[ConsumptionCollectionHandler] 检测到停止标志，任务 {$taskId} 停止\n");
            return false;
        }

        // 检查数据库状态
        $task = $this->taskService->getTask($taskId);
        if ($task && in_array($task['status'], ['paused', 'stopped', 'error'])) {
            // \Workerman\Worker::safeEcho("[ConsumptionCollectionHandler] 检测到任务状态为 {$task['status']}，任务 {$taskId} 停止\n");
            return false;
        }

        return true;
    }

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

    /**
     * 更新任务进度
     * 
     * @param string $taskId 任务ID
     * @param array<string, mixed> $progress 进度信息（可以包含status字段来更新任务状态）
     * @return void
     */
    private function updateProgress(string $taskId, array $progress): void
    {
        try {
            $task = $this->taskService->getTask($taskId);
            if (!$task) {
                // \Workerman\Worker::safeEcho("[ConsumptionCollectionHandler] ⚠️  更新进度失败：任务不存在 task_id={$taskId}\n");
                return;
            }

            $currentProgress = $task['progress'] ?? [];
            
            // 保护已完成任务的进度：如果任务已完成且百分比为100%，且没有明确指定要更新百分比，则保护当前进度
            $isCompleted = $task['status'] === 'completed';
            $currentPercentage = $currentProgress['percentage'] ?? 0;
            $shouldProtectProgress = $isCompleted && $currentPercentage === 100 && !isset($progress['percentage']);
            
            // 检查是否需要更新任务状态
            $updateTaskStatus = false;
            $newStatus = null;
            if (isset($progress['status'])) {
                $newStatus = $progress['status'];
                unset($progress['status']); // 从progress中移除，单独处理
                
                // 如果当前任务状态是 completed，不允许再更新为 running（防止循环）
                // 只有用户手动重新启动任务时（通过 startTask），才会从 completed 变为 running
                if ($newStatus === 'running' && $task['status'] === 'completed') {
                    // \Workerman\Worker::safeEcho("[ConsumptionCollectionHandler] ⚠️  任务已完成，不允许更新为 running，跳过状态更新\n");
                    LoggerHelper::logBusiness('task_status_update_skipped_completed', [
                        'task_id' => $taskId,
                        'current_status' => $task['status'],
                        'attempted_status' => $newStatus,
                    ]);
                } else {
                    $updateTaskStatus = true;
                }
            }
            
            // 合并进度信息
            foreach ($progress as $key => $value) {
                $currentProgress[$key] = $value;
            }
            
            // 确保 percentage 字段存在且正确计算（基于已采集条数/总条数）
            if (isset($currentProgress['processed_count']) && isset($currentProgress['total_count'])) {
                if ($currentProgress['total_count'] > 0) {
                    // 进度 = 已采集条数 / 总条数 * 100
                    $calculatedPercentage = round(
                        ($currentProgress['processed_count'] / $currentProgress['total_count']) * 100,
                        2
                    );
                    // 确保不超过100%
                    $calculatedPercentage = min(100, $calculatedPercentage);
                    
                    // 如果任务已完成且当前百分比为100%，且计算出的百分比小于100%，保持100%
                    // 否则使用计算出的百分比
                    if ($isCompleted && $currentPercentage === 100 && $calculatedPercentage < 100) {
                        $currentProgress['percentage'] = 100; // 保护已完成任务的100%进度
                    } else {
                        $currentProgress['percentage'] = $calculatedPercentage;
                    }
                } else {
                    // 如果 total_count 为 0，但任务已完成且百分比为100%，保持100%
                    // 否则设置为0（表示重新开始）
                    if ($isCompleted && $currentPercentage === 100) {
                        $currentProgress['percentage'] = 100; // 保持100%
                    } else {
                        $currentProgress['percentage'] = 0;
                    }
                }
            } elseif ($shouldProtectProgress) {
                // 如果没有传入 processed_count 或 total_count，但应该保护进度，保持当前百分比
                $currentProgress['percentage'] = $currentPercentage;
            } elseif (!isset($currentProgress['percentage'])) {
                // 如果没有传入 percentage，且不需要保护，保持当前百分比（如果存在）
                $currentProgress['percentage'] = $currentPercentage;
            }

            // 输出进度更新日志（用于调试）
            $processedCount = $currentProgress['processed_count'] ?? 0;
            $totalCount = $currentProgress['total_count'] ?? 0;
            $percentage = $currentProgress['percentage'] ?? 0;
            // \Workerman\Worker::safeEcho("[ConsumptionCollectionHandler] 📊 更新进度: processed={$processedCount}/{$totalCount}, percentage={$percentage}%\n");

            // 更新进度到数据库
            $result = $this->taskService->updateProgress($taskId, $currentProgress);
            if ($result) {
                // \Workerman\Worker::safeEcho("[ConsumptionCollectionHandler] ✅ 进度已保存到数据库\n");
            } else {
                // \Workerman\Worker::safeEcho("[ConsumptionCollectionHandler] ⚠️  进度保存到数据库失败\n");
            }
            
            // 如果指定了状态，更新任务状态（例如：completed）
            if ($updateTaskStatus && $newStatus !== null) {
                $this->taskService->updateTask($taskId, ['status' => $newStatus]);
                // \Workerman\Worker::safeEcho("[ConsumptionCollectionHandler] ✅ 任务状态已更新为: {$newStatus}\n");
            }
        } catch (\Exception $e) {
            // \Workerman\Worker::safeEcho("[ConsumptionCollectionHandler] ❌ 更新进度异常: " . $e->getMessage() . "\n");
            LoggerHelper::logError($e, [
                'component' => 'ConsumptionCollectionHandler',
                'action' => 'updateProgress',
                'task_id' => $taskId,
            ]);
        }
    }
}

