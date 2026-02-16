<?php

namespace app\service\DataCollection\Handler;

use app\repository\DataSourceRepository;
use app\service\DataSourceService;
use app\utils\LoggerHelper;
use app\utils\MongoDBHelper;
use MongoDB\Client;

/**
 * 数据采集 Handler 基类
 * 
 * 提供通用的数据采集功能：
 * - MongoDB 客户端创建
 * - 数据源配置获取
 * - 目标数据源连接
 * - 公共服务实例（IdentifierService、ConsumptionService、StoreService）
 */
abstract class BaseCollectionHandler
{
    use Trait\DataCollectionHelperTrait;
    
    protected DataSourceService $dataSourceService;
    protected \app\service\IdentifierService $identifierService;
    protected \app\service\ConsumptionService $consumptionService;
    protected \app\service\StoreService $storeService;

    public function __construct()
    {
        $this->dataSourceService = new DataSourceService(
            new DataSourceRepository()
        );
        
        // 初始化公共服务（避免在子类中重复实例化）
        $this->identifierService = new \app\service\IdentifierService(
            new \app\repository\UserProfileRepository(),
            new \app\service\UserPhoneService(
                new \app\repository\UserPhoneRelationRepository()
            )
        );
        
        $this->consumptionService = new \app\service\ConsumptionService(
            new \app\repository\ConsumptionRecordRepository(),
            new \app\repository\UserProfileRepository(),
            $this->identifierService
        );
        
        $this->storeService = new \app\service\StoreService(
            new \app\repository\StoreRepository()
        );
    }

    /**
     * 获取 MongoDB 客户端
     * 
     * @param array<string, mixed> $taskConfig 任务配置
     * @return Client MongoDB 客户端实例
     * @throws \InvalidArgumentException 如果数据源配置不存在
     */
    protected function getMongoClient(array $taskConfig): Client
    {
        $dataSourceId = $taskConfig['data_source_id'] 
            ?? $taskConfig['data_source'] 
            ?? 'sync_mongodb';
            
        $dataSourceConfig = $this->dataSourceService->getDataSourceConfigById($dataSourceId);

        if (empty($dataSourceConfig)) {
            throw new \InvalidArgumentException("数据源配置不存在: {$dataSourceId}");
        }

        return MongoDBHelper::createClient($dataSourceConfig);
    }

    /**
     * 连接到目标数据源
     * 
     * @param string $targetDataSourceId 目标数据源ID
     * @param string|null $targetDatabase 目标数据库名（可选，默认使用数据源配置中的数据库）
     * @return array{client: Client, database: \MongoDB\Database, dbName: string, config: array} 连接信息
     * @throws \InvalidArgumentException 如果目标数据源配置不存在
     */
    protected function connectToTargetDataSource(
        string $targetDataSourceId,
        ?string $targetDatabase = null
    ): array {
        $targetDataSourceConfig = $this->dataSourceService->getDataSourceConfigById($targetDataSourceId);
        
        if (empty($targetDataSourceConfig)) {
            throw new \InvalidArgumentException("目标数据源配置不存在: {$targetDataSourceId}");
        }
        
        $client = MongoDBHelper::createClient($targetDataSourceConfig);
        $dbName = $targetDatabase ?? $targetDataSourceConfig['database'] ?? 'ckb';
        $database = $client->selectDatabase($dbName);
        
        return [
            'client' => $client,
            'database' => $database,
            'dbName' => $dbName,
            'config' => $targetDataSourceConfig,
        ];
    }

    /**
     * 采集数据（抽象方法，由子类实现）
     * 
     * @param mixed $adapter 数据源适配器
     * @param array<string, mixed> $taskConfig 任务配置
     * @return void
     */
    abstract public function collect($adapter, array $taskConfig): void;
}

