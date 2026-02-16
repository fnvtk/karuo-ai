<?php

namespace app\service\DataSource\Strategy;

use app\service\DataSource\DataSourceAdapterInterface;
use app\service\DataSource\PollingStrategyInterface;
use app\utils\LoggerHelper;

/**
 * 默认消费记录轮询策略（示例）
 * 
 * 职责：
 * - 提供默认的轮询策略实现示例
 * - 展示如何实现自定义业务逻辑
 * - 可根据实际需求扩展或替换
 */
class DefaultConsumptionStrategy implements PollingStrategyInterface
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
        // 从配置中获取表名和查询条件
        $tableName = $config['table'] ?? 'consumption_records';
        $lastSyncTime = $lastSyncInfo['last_sync_time'] ?? null;
        $lastSyncId = $lastSyncInfo['last_sync_id'] ?? null;

        // 构建 SQL 查询（增量查询）
        $sql = "SELECT * FROM `{$tableName}` WHERE 1=1";
        $params = [];

        // 如果有上次同步时间，只查询新增或更新的记录
        if ($lastSyncTime !== null) {
            $sql .= " AND (`created_at` > :last_sync_time OR `updated_at` > :last_sync_time)";
            $params[':last_sync_time'] = $lastSyncTime;
        }

        // 如果有上次同步ID，用于去重（可选）
        if ($lastSyncId !== null) {
            $sql .= " AND `id` > :last_sync_id";
            $params[':last_sync_id'] = $lastSyncId;
        }

        // 按创建时间排序
        $sql .= " ORDER BY `created_at` ASC, `id` ASC";

        // 执行查询（批量查询，每次最多1000条）
        $limit = $config['batch_size'] ?? 1000;
        $offset = 0;
        $allResults = [];

        do {
            $batchSql = $sql . " LIMIT {$limit} OFFSET {$offset}";
            $results = $adapter->queryBatch($batchSql, $params, $offset, $limit);
            
            if (empty($results)) {
                break;
            }

            $allResults = array_merge($allResults, $results);
            $offset += $limit;

            // 防止无限循环（最多查询10万条）
            if (count($allResults) >= 100000) {
                LoggerHelper::logBusiness('polling_batch_limit_reached', [
                    'table' => $tableName,
                    'count' => count($allResults),
                ]);
                break;
            }
        } while (count($results) === $limit);

        LoggerHelper::logBusiness('polling_query_completed', [
            'table' => $tableName,
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
            // 默认映射（如果外部数据库字段名与标准字段名一致，则无需映射）
            'id' => 'id',
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
        return 'default_consumption';
    }
}

