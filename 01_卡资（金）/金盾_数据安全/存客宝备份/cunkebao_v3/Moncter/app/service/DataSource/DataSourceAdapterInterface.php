<?php

namespace app\service\DataSource;

/**
 * 数据源适配器接口
 * 
 * 职责：
 * - 定义统一的数据源访问接口
 * - 支持多种数据库类型（MySQL、PostgreSQL、MongoDB 等）
 * - 提供基础查询能力
 */
interface DataSourceAdapterInterface
{
    /**
     * 建立数据库连接
     * 
     * @param array<string, mixed> $config 数据源配置
     * @return bool 是否连接成功
     */
    public function connect(array $config): bool;

    /**
     * 关闭数据库连接
     * 
     * @return void
     */
    public function disconnect(): void;

    /**
     * 测试连接是否有效
     * 
     * @return bool 连接是否有效
     */
    public function isConnected(): bool;

    /**
     * 执行查询（返回多条记录）
     * 
     * @param string $sql SQL 查询语句（或 MongoDB 查询条件）
     * @param array<string, mixed> $params 查询参数（绑定参数或 MongoDB 查询选项）
     * @return array<array<string, mixed>> 查询结果数组
     */
    public function query(string $sql, array $params = []): array;

    /**
     * 执行查询（返回单条记录）
     * 
     * @param string $sql SQL 查询语句（或 MongoDB 查询条件）
     * @param array<string, mixed> $params 查询参数
     * @return array<string, mixed>|null 查询结果（单条记录）或 null
     */
    public function queryOne(string $sql, array $params = []): ?array;

    /**
     * 批量查询（分页查询，用于大数据量场景）
     * 
     * @param string $sql SQL 查询语句
     * @param array<string, mixed> $params 查询参数
     * @param int $offset 偏移量
     * @param int $limit 每页数量
     * @return array<array<string, mixed>> 查询结果数组
     */
    public function queryBatch(string $sql, array $params = [], int $offset = 0, int $limit = 1000): array;

    /**
     * 获取数据源类型
     * 
     * @return string 数据源类型（mysql、postgresql、mongodb 等）
     */
    public function getType(): string;
}

