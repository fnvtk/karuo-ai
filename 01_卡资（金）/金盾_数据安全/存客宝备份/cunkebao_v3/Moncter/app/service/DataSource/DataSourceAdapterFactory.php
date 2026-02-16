<?php

namespace app\service\DataSource;

use app\service\DataSource\Adapter\MySQLAdapter;
use app\service\DataSource\Adapter\MongoDBAdapter;
use app\utils\LoggerHelper;

/**
 * 数据源适配器工厂
 * 
 * 职责：
 * - 根据数据源类型创建对应的适配器实例
 * - 管理适配器实例（单例模式，避免重复创建连接）
 */
class DataSourceAdapterFactory
{
    /**
     * 适配器实例缓存（单例模式）
     * 
     * @var array<string, DataSourceAdapterInterface>
     */
    private static array $instances = [];

    /**
     * 创建数据源适配器
     * 
     * @param string $type 数据源类型（mysql、postgresql、mongodb 等）
     * @param array<string, mixed> $config 数据源配置
     * @return DataSourceAdapterInterface 适配器实例
     * @throws \InvalidArgumentException 不支持的数据源类型
     */
    public static function create(string $type, array $config): DataSourceAdapterInterface
    {
        // 生成缓存键（基于类型和配置）
        $cacheKey = self::generateCacheKey($type, $config);

        // 如果已存在实例，直接返回
        if (isset(self::$instances[$cacheKey])) {
            $adapter = self::$instances[$cacheKey];
            // 检查连接是否有效
            if ($adapter->isConnected()) {
                return $adapter;
            }
            // 连接已断开，重新创建
            unset(self::$instances[$cacheKey]);
        }

        // 根据类型创建适配器
        $adapter = match (strtolower($type)) {
            'mysql' => new MySQLAdapter(),
            'mongodb' => new MongoDBAdapter(),
            // 'postgresql' => new PostgreSQLAdapter(),
            default => throw new \InvalidArgumentException("不支持的数据源类型: {$type}"),
        };

        // 建立连接
        if (!$adapter->connect($config)) {
            throw new \RuntimeException("无法连接到数据源: {$type}");
        }

        // 缓存实例
        self::$instances[$cacheKey] = $adapter;

        LoggerHelper::logBusiness('data_source_adapter_created', [
            'type' => $type,
            'cache_key' => $cacheKey,
        ]);

        return $adapter;
    }

    /**
     * 生成缓存键
     * 
     * @param string $type 数据源类型
     * @param array<string, mixed> $config 数据源配置
     * @return string 缓存键
     */
    private static function generateCacheKey(string $type, array $config): string
    {
        // 基于类型、主机、端口、数据库名生成唯一键
        $host = $config['host'] ?? 'unknown';
        $port = $config['port'] ?? 'unknown';
        $database = $config['database'] ?? 'unknown';
        return md5("{$type}:{$host}:{$port}:{$database}");
    }

    /**
     * 清除所有适配器实例（用于测试或重新连接）
     * 
     * @return void
     */
    public static function clearInstances(): void
    {
        foreach (self::$instances as $adapter) {
            try {
                $adapter->disconnect();
            } catch (\Throwable $e) {
                LoggerHelper::logError($e, ['component' => 'DataSourceAdapterFactory', 'action' => 'clearInstances']);
            }
        }
        self::$instances = [];
    }

    /**
     * 获取所有已创建的适配器实例
     * 
     * @return array<string, DataSourceAdapterInterface>
     */
    public static function getInstances(): array
    {
        return self::$instances;
    }
}

