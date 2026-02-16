<?php

namespace app\service;

use app\repository\DataSourceRepository;
use app\service\DataSource\DataSourceAdapterFactory;
use app\utils\LoggerHelper;
use MongoDB\Client;
use Ramsey\Uuid\Uuid as UuidGenerator;

/**
 * 数据源服务
 *
 * 职责：
 * - 管理数据源的CRUD操作
 * - 验证数据源连接
 * - 提供数据源配置
 */
class DataSourceService
{
    public function __construct(
        protected DataSourceRepository $repository
    ) {
    }

    /**
     * 创建数据源
     *
     * @param array<string, mixed> $data
     * @return DataSourceRepository
     * @throws \Exception
     */
    public function createDataSource(array $data): DataSourceRepository
    {
        // 生成ID
        if (empty($data['data_source_id'])) {
            $data['data_source_id'] = UuidGenerator::uuid4()->toString();
        }

        // 验证必填字段
        $requiredFields = ['name', 'type', 'host', 'port', 'database'];
        foreach ($requiredFields as $field) {
            if (empty($data[$field])) {
                throw new \InvalidArgumentException("缺少必填字段: {$field}");
            }
        }

        // 验证类型
        $allowedTypes = ['mongodb', 'mysql', 'postgresql'];
        if (!in_array(strtolower($data['type']), $allowedTypes)) {
            throw new \InvalidArgumentException("不支持的数据源类型: {$data['type']}");
        }

        // 验证ID唯一性
        $existing = $this->repository->newQuery()
            ->where('data_source_id', $data['data_source_id'])
            ->first();

        if ($existing) {
            throw new \InvalidArgumentException("数据源ID已存在: {$data['data_source_id']}");
        }

        // 验证名称唯一性
        $existingByName = $this->repository->newQuery()
            ->where('name', $data['name'])
            ->first();

        if ($existingByName) {
            throw new \InvalidArgumentException("数据源名称已存在: {$data['name']}");
        }

        // 设置默认值
        $data['status'] = $data['status'] ?? 1; // 1:启用, 0:禁用
        $data['options'] = $data['options'] ?? [];
        $data['is_tag_engine'] = $data['is_tag_engine'] ?? false; // 默认不是标签引擎数据库

        // 创建数据源
        $dataSource = new DataSourceRepository($data);
        $dataSource->save();

        // 如果设置为标签引擎数据库，自动将其他数据源设置为 false（确保只有一个）
        if (!empty($data['is_tag_engine'])) {
            // 将所有其他数据源的 is_tag_engine 设置为 false
            $this->repository->newQuery()
                ->where('data_source_id', '!=', $dataSource->data_source_id)
                ->update(['is_tag_engine' => false]);
            
            LoggerHelper::logBusiness('tag_engine_set', [
                'data_source_id' => $dataSource->data_source_id,
                'action' => 'create',
            ]);
        }

        LoggerHelper::logBusiness('data_source_created', [
            'data_source_id' => $dataSource->data_source_id,
            'name' => $dataSource->name,
            'type' => $dataSource->type,
        ]);

        return $dataSource;
    }

    /**
     * 更新数据源
     *
     * @param string $dataSourceId
     * @param array<string, mixed> $data
     * @return bool
     */
    public function updateDataSource(string $dataSourceId, array $data): bool
    {
        $dataSource = $this->repository->find($dataSourceId);

        if (!$dataSource) {
            throw new \InvalidArgumentException("数据源不存在: {$dataSourceId}");
        }

        // 如果更新名称，验证唯一性
        if (isset($data['name']) && $data['name'] !== $dataSource->name) {
            $existing = $this->repository->newQuery()
                ->where('name', $data['name'])
                ->where('data_source_id', '!=', $dataSourceId)
                ->first();

            if ($existing) {
                throw new \InvalidArgumentException("数据源名称已存在: {$data['name']}");
            }
        }

        // 如果设置为标签引擎数据库，自动将其他数据源设置为 false（确保只有一个）
        if (isset($data['is_tag_engine']) && !empty($data['is_tag_engine'])) {
            // 将所有其他数据源的 is_tag_engine 设置为 false
            $this->repository->newQuery()
                ->where('data_source_id', '!=', $dataSourceId)
                ->update(['is_tag_engine' => false]);
            
            LoggerHelper::logBusiness('tag_engine_set', [
                'data_source_id' => $dataSourceId,
                'action' => 'update',
            ]);
        }

        // 更新数据
        $dataSource->fill($data);
        $result = $dataSource->save();

        if ($result) {
            LoggerHelper::logBusiness('data_source_updated', [
                'data_source_id' => $dataSourceId,
            ]);
        }

        return $result;
    }

    /**
     * 删除数据源
     *
     * @param string $dataSourceId
     * @return bool
     */
    public function deleteDataSource(string $dataSourceId): bool
    {
        $dataSource = $this->repository->find($dataSourceId);

        if (!$dataSource) {
            throw new \InvalidArgumentException("数据源不存在: {$dataSourceId}");
        }

        // TODO: 检查是否有任务在使用此数据源
        // 可以查询 DataCollectionTask 中是否有引用此数据源

        $result = $dataSource->delete();

        if ($result) {
            LoggerHelper::logBusiness('data_source_deleted', [
                'data_source_id' => $dataSourceId,
            ]);
        }

        return $result;
    }

    /**
     * 获取数据源列表
     *
     * @param array<string, mixed> $filters
     * @return array{list: array, total: int}
     */
    public function getDataSourceList(array $filters = []): array
    {
        try {
            $query = $this->repository->newQuery();

            // 筛选条件
            if (isset($filters['type'])) {
                $query->where('type', $filters['type']);
            }

            if (isset($filters['status'])) {
                $query->where('status', $filters['status']);
            }

            if (isset($filters['name'])) {
                $query->where('name', 'like', '%' . $filters['name'] . '%');
            }

            // 排序
            $query->orderBy('created_at', 'desc');

            // 分页
            $page = (int)($filters['page'] ?? 1);
            $pageSize = (int)($filters['page_size'] ?? 20);

            $total = $query->count();
            $list = $query->skip(($page - 1) * $pageSize)
                ->take($pageSize)
                ->get()
                ->map(function ($item) {
                    // 不返回密码
                    $data = $item->toArray();
                    unset($data['password']);
                    return $data;
                })
                ->toArray();

            return [
                'list' => $list,
                'total' => $total,
            ];
        } catch (\MongoDB\Driver\Exception\Exception $e) {
            // MongoDB 连接错误
            LoggerHelper::logError($e, [
                'component' => 'DataSourceService',
                'action' => 'getDataSourceList',
            ]);
            throw new \RuntimeException('无法连接到 MongoDB 数据库，请检查数据库服务是否正常运行', 500, $e);
        } catch (\Exception $e) {
            LoggerHelper::logError($e, [
                'component' => 'DataSourceService',
                'action' => 'getDataSourceList',
            ]);
            throw $e;
        }
    }

    /**
     * 获取数据源详情（不包含密码）
     *
     * @param string $dataSourceId
     * @return array<string, mixed>|null
     */
    public function getDataSourceDetail(string $dataSourceId): ?array
    {
        $dataSource = $this->repository->find($dataSourceId);

        if (!$dataSource) {
            return null;
        }

        $data = $dataSource->toArray();
        unset($data['password']);

        return $data;
    }

    /**
     * 获取数据源详情（包含密码，用于连接）
     *
     * @param string $dataSourceId
     * @return array<string, mixed>|null
     */
    public function getDataSourceConfig(string $dataSourceId): ?array
    {
        $dataSource = $this->repository->find($dataSourceId);

        if (!$dataSource) {
            return null;
        }

        if ($dataSource->status != 1) {
            throw new \RuntimeException("数据源已禁用: {$dataSourceId}");
        }

        return $dataSource->toConfigArray();
    }

    /**
     * 测试数据源连接
     *
     * @param array<string, mixed> $config
     * @return bool
     */
    public function testConnection(array $config): bool
    {
        try {
            $type = strtolower($config['type'] ?? '');
            
            // MongoDB特殊处理
            if ($type === 'mongodb') {
                // 使用 MongoDBHelper 创建客户端（统一DSN构建逻辑）
                $client = \app\utils\MongoDBHelper::createClient($config, [
                    'connectTimeoutMS' => 3000,
                    'socketTimeoutMS' => 5000,
                ]);
                
                // 尝试列出数据库来测试连接
                $client->listDatabases();
                return true;
            }

            // 其他类型使用适配器
            $adapter = DataSourceAdapterFactory::create($type, $config);
            $connected = $adapter->isConnected();
            $adapter->disconnect();
            return $connected;
        } catch (\Throwable $e) {
            LoggerHelper::logError($e, [
                'component' => 'DataSourceService',
                'action' => 'testConnection',
            ]);
            return false;
        }
    }

    /**
     * 获取所有启用的数据源（用于替代config('data_sources')，从数据库读取）
     *
     * @return array<string, array> 以data_source_id为key的配置数组
     */
    public function getAllEnabledDataSources(): array
    {
        $dataSources = $this->repository->newQuery()
            ->where('status', 1)
            ->get();

        $result = [];
        foreach ($dataSources as $ds) {
            $result[$ds->data_source_id] = $ds->toConfigArray();
        }

        return $result;
    }

    /**
     * 根据数据源ID获取配置（从数据库读取）
     * 
     * 支持两种查询方式：
     * 1. 通过 data_source_id (UUID) 查询
     * 2. 通过 name 字段查询（兼容配置文件中的 key，如 sync_mongodb, tag_mongodb）
     *
     * @param string $dataSourceId 数据源ID或名称
     * @return array<string, mixed>|null 数据源配置，不存在或禁用时返回null
     */
    public function getDataSourceConfigById(string $dataSourceId): ?array
    {
        // \Workerman\Worker::safeEcho("[DataSourceService] 查询数据源配置: data_source_id={$dataSourceId}\n");
        
        // 先尝试通过 data_source_id 查询（UUID 格式）
        $dataSource = $this->repository->newQuery()
            ->where('data_source_id', $dataSourceId)
            ->where('status', 1)
            ->first();

        if ($dataSource) {
            // \Workerman\Worker::safeEcho("[DataSourceService] ✓ 通过 data_source_id 查询成功: name={$dataSource->name}\n");
            return $dataSource->toConfigArray();
        }

        // 如果通过 data_source_id 查不到，尝试通过 name 字段查询（兼容配置文件中的 key）
        // \Workerman\Worker::safeEcho("[DataSourceService] 通过 data_source_id 未找到，尝试通过 name 查询\n");
        
        // 处理配置文件中的常见 key 映射
        // 注意：这些映射需要根据实际数据库中的 name 字段值来调整
        $nameMapping = [
            'sync_mongodb' => '本地大数据库', // 根据实际数据库中的名称调整
            'tag_mongodb' => '主数据库',      // 标签引擎数据库（is_tag_engine=true）
            'kr_mongodb' => '卡若的主机',      // 卡若数据库
        ];
        
        $searchName = $nameMapping[$dataSourceId] ?? null;
        
        if ($searchName) {
            // \Workerman\Worker::safeEcho("[DataSourceService] 使用映射名称查询: {$dataSourceId} -> {$searchName}\n");
            // 使用映射的名称查询
            $dataSource = $this->repository->newQuery()
                ->where('name', $searchName)
                ->where('status', 1)
                ->first();
            
            if ($dataSource) {
                // \Workerman\Worker::safeEcho("[DataSourceService] ✓ 通过映射名称查询成功: name={$dataSource->name}, data_source_id={$dataSource->data_source_id}\n");
                return $dataSource->toConfigArray();
            }
        }
        
        // 如果还是查不到，尝试直接使用 dataSourceId 作为 name 查询
        // \Workerman\Worker::safeEcho("[DataSourceService] 尝试直接使用 dataSourceId 作为 name 查询: {$dataSourceId}\n");
        $dataSource = $this->repository->newQuery()
            ->where('name', $dataSourceId)
            ->where('status', 1)
            ->first();
        
        if ($dataSource) {
            // \Workerman\Worker::safeEcho("[DataSourceService] ✓ 通过 name 直接查询成功: name={$dataSource->name}\n");
            return $dataSource->toConfigArray();
        }
        
        // 如果还是查不到，对于 tag_mongodb，尝试查询 is_tag_engine=true 的数据源
        if ($dataSourceId === 'tag_mongodb') {
            // \Workerman\Worker::safeEcho("[DataSourceService] 对于 tag_mongodb，尝试查询 is_tag_engine=true 的数据源\n");
            $dataSource = $this->repository->newQuery()
                ->where('is_tag_engine', true)
                ->where('status', 1)
                ->first();
            
            if ($dataSource) {
                // \Workerman\Worker::safeEcho("[DataSourceService] ✓ 通过 is_tag_engine 查询成功: name={$dataSource->name}, data_source_id={$dataSource->data_source_id}\n");
                return $dataSource->toConfigArray();
            }
        }

        // \Workerman\Worker::safeEcho("[DataSourceService] ✗ 未找到数据源配置: data_source_id={$dataSourceId}\n");
        return null;
    }

    /**
     * 获取标签引擎数据库配置（is_tag_engine = true的数据源）
     *
     * @return array<string, mixed>|null 标签引擎数据库配置，未找到时返回null
     */
    public function getTagEngineDataSourceConfig(): ?array
    {
        $dataSource = $this->repository->newQuery()
            ->where('is_tag_engine', true)
            ->where('status', 1)
            ->first();

        if (!$dataSource) {
            return null;
        }

        return $dataSource->toConfigArray();
    }

    /**
     * 获取标签引擎数据库的data_source_id
     *
     * @return string|null 标签引擎数据库的data_source_id，未找到时返回null
     */
    public function getTagEngineDataSourceId(): ?string
    {
        $dataSource = $this->repository->newQuery()
            ->where('is_tag_engine', true)
            ->where('status', 1)
            ->first();

        return $dataSource ? $dataSource->data_source_id : null;
    }

    /**
     * 验证标签引擎数据库配置是否存在
     *
     * @return bool 是否存在标签引擎数据库
     */
    public function hasTagEngineDataSource(): bool
    {
        $count = $this->repository->newQuery()
            ->where('is_tag_engine', true)
            ->where('status', 1)
            ->count();

        return $count > 0;
    }

    /**
     * 获取所有标签引擎数据库（理论上应该只有一个，但允许有多个）
     *
     * @return array 标签引擎数据库列表
     */
    public function getAllTagEngineDataSources(): array
    {
        $dataSources = $this->repository->newQuery()
            ->where('is_tag_engine', true)
            ->where('status', 1)
            ->get();

        $result = [];
        foreach ($dataSources as $ds) {
            $data = $ds->toArray();
            unset($data['password']); // 不返回密码
            $result[] = $data;
        }

        return $result;
    }
}

