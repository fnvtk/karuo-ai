<?php

namespace app\service\DataSource\Adapter;

use app\service\DataSource\DataSourceAdapterInterface;
use app\utils\LoggerHelper;
use MongoDB\Client;
use MongoDB\Driver\Exception\Exception as MongoDBException;

/**
 * MongoDB 数据源适配器
 * 
 * 职责：
 * - 封装 MongoDB 数据库连接和查询操作
 * - 实现 DataSourceAdapterInterface 接口
 */
class MongoDBAdapter implements DataSourceAdapterInterface
{
    private ?Client $client = null;
    private ?\MongoDB\Database $database = null;
    private string $type = 'mongodb';
    private string $databaseName = '';

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
            $port = (int)($config['port'] ?? 27017);
            $this->databaseName = $config['database'] ?? '';
            $username = $config['username'] ?? '';
            $password = $config['password'] ?? '';
            $authSource = $config['auth_source'] ?? $this->databaseName;

            // 构建 DSN
            $dsn = "mongodb://";
            if (!empty($username) && !empty($password)) {
                $dsn .= urlencode($username) . ':' . urlencode($password) . '@';
            }
            $dsn .= "{$host}:{$port}";
            if (!empty($this->databaseName)) {
                $dsn .= "/{$this->databaseName}";
            }
            if (!empty($authSource)) {
                $dsn .= "?authSource=" . urlencode($authSource);
            }

            // MongoDB 连接选项
            $options = [];
            if (isset($config['options'])) {
                $options = array_filter($config['options'], function ($value) {
                    return $value !== '' && $value !== null;
                });
            }

            // 设置超时选项
            if (!isset($options['connectTimeoutMS'])) {
                $options['connectTimeoutMS'] = ($config['timeout'] ?? 10) * 1000;
            }
            if (!isset($options['socketTimeoutMS'])) {
                $options['socketTimeoutMS'] = ($config['timeout'] ?? 10) * 1000;
            }

            $this->client = new Client($dsn, $options);

            // 选择数据库
            if (!empty($this->databaseName)) {
                $this->database = $this->client->selectDatabase($this->databaseName);
            }

            // 测试连接
            $this->client->getManager()->selectServer();

            LoggerHelper::logBusiness('mongodb_adapter_connected', [
                'host' => $host,
                'port' => $port,
                'database' => $this->databaseName,
            ]);

            return true;
        } catch (MongoDBException $e) {
            LoggerHelper::logError($e, [
                'component' => 'MongoDBAdapter',
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
        if ($this->client !== null) {
            $this->client = null;
            $this->database = null;
            LoggerHelper::logBusiness('mongodb_adapter_disconnected', []);
        }
    }

    /**
     * 测试连接是否有效
     * 
     * @return bool 连接是否有效
     */
    public function isConnected(): bool
    {
        if ($this->client === null) {
            return false;
        }

        try {
            // 执行 ping 命令测试连接
            $adminDb = $this->client->selectDatabase('admin');
            $adminDb->command(['ping' => 1]);
            return true;
        } catch (MongoDBException $e) {
            LoggerHelper::logError($e, [
                'component' => 'MongoDBAdapter',
                'action' => 'isConnected',
            ]);
            return false;
        }
    }

    /**
     * 执行查询（返回多条记录）
     * 
     * 注意：对于 MongoDB，$sql 参数表示集合名称，$params 是一个包含 'filter' 和 'options' 的数组
     * 
     * @param string $sql 集合名称（MongoDB 中相当于表名）
     * @param array<string, mixed> $params 查询参数，格式：['filter' => [...], 'options' => [...]]
     * @return array<array<string, mixed>> 查询结果数组
     */
    public function query(string $sql, array $params = []): array
    {
        if ($this->database === null) {
            throw new \RuntimeException('数据库连接未建立或未选择数据库');
        }

        try {
            $collection = $sql; // $sql 参数在 MongoDB 中表示集合名
            $filter = $params['filter'] ?? [];
            $options = $params['options'] ?? [];

            $cursor = $this->database->selectCollection($collection)->find($filter, $options);
            $results = [];

            foreach ($cursor as $document) {
                $results[] = $this->convertMongoDocumentToArray($document);
            }

            LoggerHelper::logBusiness('mongodb_query_executed', [
                'collection' => $collection,
                'filter' => $filter,
                'result_count' => count($results),
            ]);

            return $results;
        } catch (MongoDBException $e) {
            LoggerHelper::logError($e, [
                'component' => 'MongoDBAdapter',
                'action' => 'query',
                'collection' => $sql,
                'params' => $params,
            ]);
            throw $e;
        }
    }

    /**
     * 执行查询（返回单条记录）
     * 
     * 注意：对于 MongoDB，$sql 参数表示集合名称，$params 是一个包含 'filter' 和 'options' 的数组
     * 
     * @param string $sql 集合名称
     * @param array<string, mixed> $params 查询参数，格式：['filter' => [...], 'options' => [...]]
     * @return array<string, mixed>|null 查询结果（单条记录）或 null
     */
    public function queryOne(string $sql, array $params = []): ?array
    {
        if ($this->database === null) {
            throw new \RuntimeException('数据库连接未建立或未选择数据库');
        }

        try {
            $collection = $sql; // $sql 参数在 MongoDB 中表示集合名
            $filter = $params['filter'] ?? [];
            $options = $params['options'] ?? [];

            $document = $this->database->selectCollection($collection)->findOne($filter, $options);

            if ($document === null) {
                return null;
            }

            LoggerHelper::logBusiness('mongodb_query_one_executed', [
                'collection' => $collection,
                'filter' => $filter,
                'has_result' => true,
            ]);

            return $this->convertMongoDocumentToArray($document);
        } catch (MongoDBException $e) {
            LoggerHelper::logError($e, [
                'component' => 'MongoDBAdapter',
                'action' => 'queryOne',
                'collection' => $sql,
                'params' => $params,
            ]);
            throw $e;
        }
    }

    /**
     * 批量查询（分页查询，用于大数据量场景）
     * 
     * 注意：对于 MongoDB，$sql 参数表示集合名称，$params 是一个包含 'filter' 和 'options' 的数组
     * 
     * @param string $sql 集合名称
     * @param array<string, mixed> $params 查询参数，格式：['filter' => [...], 'options' => [...]]
     * @param int $offset 偏移量
     * @param int $limit 每页数量
     * @return array<array<string, mixed>> 查询结果数组
     */
    public function queryBatch(string $sql, array $params = [], int $offset = 0, int $limit = 1000): array
    {
        if ($this->database === null) {
            throw new \RuntimeException('数据库连接未建立或未选择数据库');
        }

        try {
            $collection = $sql; // $sql 参数在 MongoDB 中表示集合名
            $filter = $params['filter'] ?? [];
            $options = $params['options'] ?? [];

            // 设置分页选项
            $options['skip'] = $offset;
            $options['limit'] = $limit;

            $cursor = $this->database->selectCollection($collection)->find($filter, $options);
            $results = [];

            foreach ($cursor as $document) {
                $results[] = $this->convertMongoDocumentToArray($document);
            }

            LoggerHelper::logBusiness('mongodb_query_batch_executed', [
                'collection' => $collection,
                'offset' => $offset,
                'limit' => $limit,
                'result_count' => count($results),
            ]);

            return $results;
        } catch (MongoDBException $e) {
            LoggerHelper::logError($e, [
                'component' => 'MongoDBAdapter',
                'action' => 'queryBatch',
                'collection' => $sql,
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

    /**
     * 将 MongoDB 文档转换为数组
     * 
     * @param mixed $document MongoDB 文档对象
     * @return array<string, mixed> 数组格式的数据
     */
    private function convertMongoDocumentToArray($document): array
    {
        if (is_array($document)) {
            return $document;
        }

        // MongoDB\BSON\Document 或 MongoDB\Model\BSONDocument
        if (method_exists($document, 'toArray')) {
            return $document->toArray();
        }

        // 转换为数组
        return json_decode(json_encode($document), true) ?? [];
    }
}

