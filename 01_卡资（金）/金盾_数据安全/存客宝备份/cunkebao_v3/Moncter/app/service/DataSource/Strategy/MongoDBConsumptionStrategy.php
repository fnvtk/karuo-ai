<?php

namespace app\service\DataSource\Strategy;

use app\service\DataSource\DataSourceAdapterInterface;
use app\service\DataSource\PollingStrategyInterface;
use app\utils\LoggerHelper;

/**
 * MongoDB 消费记录轮询策略
 * 
 * 职责：
 * - 提供 MongoDB 专用的轮询策略实现
 * - 展示如何实现自定义业务逻辑
 */
class MongoDBConsumptionStrategy implements PollingStrategyInterface
{
    /**
     * 执行轮询查询
     * 
     * @param DataSourceAdapterInterface $adapter 数据源适配器
     * @param array<string, mixed> $config 数据源配置
     * @param array<string, mixed> $lastSyncInfo 上次同步信息
     * @return array<array<string, mixed>> 查询结果数组
     */
    public function poll(
        DataSourceAdapterInterface $adapter,
        array $config,
        array $lastSyncInfo = []
    ): array {
        // 从配置中获取集合名和查询条件
        $collectionName = $config['collection'] ?? 'consumption_records';
        $lastSyncTime = $lastSyncInfo['last_sync_time'] ?? null;
        $lastSyncId = $lastSyncInfo['last_sync_id'] ?? null;

        // 构建 MongoDB 查询过滤器
        $filter = [];

        // 如果有上次同步时间，只查询新增或更新的记录
        if ($lastSyncTime !== null) {
            $lastSyncTimestamp = is_numeric($lastSyncTime) ? (int)$lastSyncTime : strtotime($lastSyncTime);
            $lastSyncDate = new \MongoDB\BSON\UTCDateTime($lastSyncTimestamp * 1000);
            
            $filter['$or'] = [
                ['created_at' => ['$gt' => $lastSyncDate]],
                ['updated_at' => ['$gt' => $lastSyncDate]],
            ];
        }

        // 如果有上次同步ID，用于去重（可选）
        if ($lastSyncId !== null) {
            $filter['_id'] = ['$gt' => $lastSyncId];
        }

        // 查询选项
        $options = [
            'sort' => ['created_at' => 1, '_id' => 1], // 按创建时间和ID排序
        ];

        // 执行查询（批量查询，每次最多1000条）
        $limit = $config['batch_size'] ?? 1000;
        $offset = 0;
        $allResults = [];

        do {
            // MongoDB 适配器的 queryBatch 方法签名：queryBatch(string $sql, array $params = [], int $offset = 0, int $limit = 1000)
            // 对于 MongoDB，$sql 是集合名，$params 包含 'filter' 和 'options'
            $results = $adapter->queryBatch($collectionName, [
                'filter' => $filter,
                'options' => $options,
            ], $offset, $limit);
            
            if (empty($results)) {
                break;
            }

            $allResults = array_merge($allResults, $results);
            $offset += $limit;

            // 防止无限循环（最多查询10万条）
            if (count($allResults) >= 100000) {
                LoggerHelper::logBusiness('polling_batch_limit_reached', [
                    'collection' => $collectionName,
                    'count' => count($allResults),
                ]);
                break;
            }
        } while (count($results) === $limit);

        LoggerHelper::logBusiness('polling_query_completed', [
            'collection' => $collectionName,
            'result_count' => count($allResults),
            'last_sync_time' => $lastSyncTime,
        ]);

        return $allResults;
    }

    /**
     * 数据转换
     * 
     * @param array<array<string, mixed>> $rawData 原始数据
     * @param array<string, mixed> $config 数据源配置
     * @return array<array<string, mixed>> 转换后的数据
     */
    public function transform(array $rawData, array $config): array
    {
        // 字段映射配置（从外部数据库字段映射到标准字段）
        $fieldMapping = $config['field_mapping'] ?? [
            // 默认映射（MongoDB 使用 _id，需要转换为 id）
            '_id' => 'id',
            'user_id' => 'user_id',
            'amount' => 'amount',
            'store_id' => 'store_id',
            'product_id' => 'product_id',
            'consume_time' => 'consume_time',
            'created_at' => 'created_at',
        ];

        $transformedData = [];

        foreach ($rawData as $record) {
            $transformed = [];

            // 处理 MongoDB 的 _id 字段（转换为字符串）
            if (isset($record['_id'])) {
                if (is_object($record['_id']) && method_exists($record['_id'], '__toString')) {
                    $record['id'] = (string)$record['_id'];
                } else {
                    $record['id'] = (string)$record['_id'];
                }
            }

            // 处理 MongoDB 的日期字段（UTCDateTime 转换为字符串）
            foreach (['created_at', 'updated_at', 'consume_time'] as $dateField) {
                if (isset($record[$dateField])) {
                    if (is_object($record[$dateField]) && method_exists($record[$dateField], 'toDateTime')) {
                        $record[$dateField] = $record[$dateField]->toDateTime()->format('Y-m-d H:i:s');
                    } elseif (is_object($record[$dateField]) && method_exists($record[$dateField], '__toString')) {
                        $record[$dateField] = (string)$record[$dateField];
                    }
                }
            }

            // 应用字段映射
            foreach ($fieldMapping as $standardField => $sourceField) {
                if (isset($record[$sourceField])) {
                    $transformed[$standardField] = $record[$sourceField];
                }
            }

            // 确保必要字段存在
            if (!empty($transformed)) {
                $transformedData[] = $transformed;
            }
        }

        LoggerHelper::logBusiness('polling_transform_completed', [
            'input_count' => count($rawData),
            'output_count' => count($transformedData),
        ]);

        return $transformedData;
    }

    /**
     * 数据验证
     * 
     * @param array<string, mixed> $record 单条记录
     * @param array<string, mixed> $config 数据源配置
     * @return bool 是否通过验证
     */
    public function validate(array $record, array $config): bool
    {
        // 必填字段验证
        $requiredFields = $config['required_fields'] ?? ['user_id', 'amount', 'consume_time'];

        foreach ($requiredFields as $field) {
            if (!isset($record[$field]) || $record[$field] === null || $record[$field] === '') {
                LoggerHelper::logBusiness('polling_validation_failed', [
                    'reason' => "缺少必填字段: {$field}",
                    'record' => $record,
                ]);
                return false;
            }
        }

        // 金额验证（必须为正数）
        if (isset($record['amount'])) {
            $amount = (float)$record['amount'];
            if ($amount <= 0) {
                LoggerHelper::logBusiness('polling_validation_failed', [
                    'reason' => '金额必须大于0',
                    'amount' => $amount,
                ]);
                return false;
            }
        }

        // 时间格式验证（可选）
        if (isset($record['consume_time'])) {
            $time = strtotime($record['consume_time']);
            if ($time === false) {
                LoggerHelper::logBusiness('polling_validation_failed', [
                    'reason' => '时间格式无效',
                    'consume_time' => $record['consume_time'],
                ]);
                return false;
            }
        }

        return true;
    }

    /**
     * 获取策略名称
     * 
     * @return string 策略名称
     */
    public function getName(): string
    {
        return 'mongodb_consumption';
    }
}

