<?php

namespace app\service\DataSource\Adapter;

use app\service\DataSource\DataSourceAdapterInterface;
use app\utils\LoggerHelper;
use PDO;
use PDOException;

/**
 * MySQL 数据源适配器
 * 
 * 职责：
 * - 封装 MySQL 数据库连接和查询操作
 * - 实现 DataSourceAdapterInterface 接口
 */
class MySQLAdapter implements DataSourceAdapterInterface
{
    private ?PDO $connection = null;
    private string $type = 'mysql';

    /**
     * 建立数据库连接
     * 
     * @param array<string, mixed> $config 数据源配置
     * @return bool 是否连接成功
     */
    public function connect(array $config): bool
    {
        try {
            $host = $config['host'] ?? '127.0.0.1';
            $port = $config['port'] ?? 3306;
            $database = $config['database'] ?? '';
            $username = $config['username'] ?? '';
            $password = $config['password'] ?? '';
            $charset = $config['charset'] ?? 'utf8mb4';

            // 构建 DSN
            $dsn = "mysql:host={$host};port={$port};dbname={$database};charset={$charset}";

            // PDO 选项
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false, // 禁用预处理语句模拟
                PDO::ATTR_PERSISTENT => $config['persistent'] ?? false, // 是否持久连接
                PDO::ATTR_TIMEOUT => $config['timeout'] ?? 10, // 连接超时
            ];

            $this->connection = new PDO($dsn, $username, $password, $options);

            LoggerHelper::logBusiness('mysql_adapter_connected', [
                'host' => $host,
                'port' => $port,
                'database' => $database,
            ]);

            return true;
        } catch (PDOException $e) {
            LoggerHelper::logError($e, [
                'component' => 'MySQLAdapter',
                'action' => 'connect',
                'config' => array_merge($config, ['password' => '***']), // 隐藏密码
            ]);
            return false;
        }
    }

    /**
     * 关闭数据库连接
     * 
     * @return void
     */
    public function disconnect(): void
    {
        if ($this->connection !== null) {
            $this->connection = null;
            LoggerHelper::logBusiness('mysql_adapter_disconnected', []);
        }
    }

    /**
     * 测试连接是否有效
     * 
     * @return bool 连接是否有效
     */
    public function isConnected(): bool
    {
        if ($this->connection === null) {
            return false;
        }

        try {
            // 执行简单查询测试连接
            $this->connection->query('SELECT 1');
            return true;
        } catch (PDOException $e) {
            LoggerHelper::logError($e, [
                'component' => 'MySQLAdapter',
                'action' => 'isConnected',
            ]);
            return false;
        }
    }

    /**
     * 执行查询（返回多条记录）
     * 
     * @param string $sql SQL 查询语句
     * @param array<string, mixed> $params 查询参数（绑定参数）
     * @return array<array<string, mixed>> 查询结果数组
     */
    public function query(string $sql, array $params = []): array
    {
        if ($this->connection === null) {
            throw new \RuntimeException('数据库连接未建立');
        }

        try {
            $stmt = $this->connection->prepare($sql);
            $stmt->execute($params);
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

            LoggerHelper::logBusiness('mysql_query_executed', [
                'sql' => $sql,
                'params_count' => count($params),
                'result_count' => count($results),
            ]);

            return $results;
        } catch (PDOException $e) {
            LoggerHelper::logError($e, [
                'component' => 'MySQLAdapter',
                'action' => 'query',
                'sql' => $sql,
                'params' => $params,
            ]);
            throw $e;
        }
    }

    /**
     * 执行查询（返回单条记录）
     * 
     * @param string $sql SQL 查询语句
     * @param array<string, mixed> $params 查询参数
     * @return array<string, mixed>|null 查询结果（单条记录）或 null
     */
    public function queryOne(string $sql, array $params = []): ?array
    {
        if ($this->connection === null) {
            throw new \RuntimeException('数据库连接未建立');
        }

        try {
            $stmt = $this->connection->prepare($sql);
            $stmt->execute($params);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            LoggerHelper::logBusiness('mysql_query_one_executed', [
                'sql' => $sql,
                'params_count' => count($params),
                'has_result' => $result !== false,
            ]);

            return $result !== false ? $result : null;
        } catch (PDOException $e) {
            LoggerHelper::logError($e, [
                'component' => 'MySQLAdapter',
                'action' => 'queryOne',
                'sql' => $sql,
                'params' => $params,
            ]);
            throw $e;
        }
    }

    /**
     * 批量查询（分页查询，用于大数据量场景）
     * 
     * @param string $sql SQL 查询语句（需要包含 LIMIT 和 OFFSET，或由适配器自动添加）
     * @param array<string, mixed> $params 查询参数
     * @param int $offset 偏移量
     * @param int $limit 每页数量
     * @return array<array<string, mixed>> 查询结果数组
     */
    public function queryBatch(string $sql, array $params = [], int $offset = 0, int $limit = 1000): array
    {
        if ($this->connection === null) {
            throw new \RuntimeException('数据库连接未建立');
        }

        try {
            // 如果 SQL 中已包含 LIMIT，则直接使用；否则自动添加
            if (stripos($sql, 'LIMIT') === false) {
                $sql .= " LIMIT {$limit} OFFSET {$offset}";
            }

            $stmt = $this->connection->prepare($sql);
            $stmt->execute($params);
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

            LoggerHelper::logBusiness('mysql_query_batch_executed', [
                'sql' => $sql,
                'offset' => $offset,
                'limit' => $limit,
                'result_count' => count($results),
            ]);

            return $results;
        } catch (PDOException $e) {
            LoggerHelper::logError($e, [
                'component' => 'MySQLAdapter',
                'action' => 'queryBatch',
                'sql' => $sql,
                'params' => $params,
                'offset' => $offset,
                'limit' => $limit,
            ]);
            throw $e;
        }
    }

    /**
     * 获取数据源类型
     * 
     * @return string 数据源类型
     */
    public function getType(): string
    {
        return $this->type;
    }
}

