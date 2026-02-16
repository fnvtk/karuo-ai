<?php

namespace app\service\DataSource;

/**
 * 轮询策略接口
 * 
 * 职责：
 * - 定义自定义轮询业务逻辑的接口
 * - 每个数据源可配置独立的轮询策略
 * - 支持自定义查询、转换、验证逻辑
 */
interface PollingStrategyInterface
{
    /**
     * 执行轮询查询
     * 
     * @param DataSourceAdapterInterface $adapter 数据源适配器
     * @param array<string, mixed> $config 数据源配置
     * @param array<string, mixed> $lastSyncInfo 上次同步信息（包含 last_sync_time、last_sync_id 等）
     * @return array<array<string, mixed>> 查询结果数组（原始数据）
     */
    public function poll(
        DataSourceAdapterInterface $adapter,
        array $config,
        array $lastSyncInfo = []
    ): array;

    /**
     * 数据转换
     * 
     * @param array<array<string, mixed>> $rawData 原始数据
     * @param array<string, mixed> $config 数据源配置
     * @return array<array<string, mixed>> 转换后的数据（标准格式）
     */
    public function transform(array $rawData, array $config): array;

    /**
     * 数据验证
     * 
     * @param array<string, mixed> $record 单条记录
     * @param array<string, mixed> $config 数据源配置
     * @return bool 是否通过验证
     */
    public function validate(array $record, array $config): bool;

    /**
     * 获取策略名称
     * 
     * @return string 策略名称
     */
    public function getName(): string;
}

