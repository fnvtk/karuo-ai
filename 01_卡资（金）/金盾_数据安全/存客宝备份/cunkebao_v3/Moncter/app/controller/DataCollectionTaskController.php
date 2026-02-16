<?php

namespace app\controller;

use app\service\DataCollectionTaskService;
use app\utils\ApiResponseHelper;
use support\Request;
use support\Response;

/**
 * 数据采集任务管理控制器
 * 
 * 提供任务创建、管理、进度查询等接口
 */
class DataCollectionTaskController
{
    /**
     * 获取任务服务实例
     */
    private function getService(): DataCollectionTaskService
    {
        return new DataCollectionTaskService(
            new \app\repository\DataCollectionTaskRepository()
        );
    }

    /**
     * 创建采集任务
     * 
     * POST /api/data-collection-tasks
     */
    public function create(Request $request): Response
    {
        try {
            $data = $request->post();
            
            // 验证必填字段
            $requiredFields = ['name', 'data_source_id', 'database', 'target_type'];
            foreach ($requiredFields as $field) {
                if (empty($data[$field])) {
                    return ApiResponseHelper::error("缺少必填字段: {$field}", 400);
                }
            }
            
            // 验证目标类型
            if (!in_array($data['target_type'], ['consumption_record', 'generic'])) {
                return ApiResponseHelper::error("目标类型必须是 consumption_record 或 generic", 400);
            }
            
            // 如果是通用Handler，需要目标数据源配置（后端会自动处理consumption_record的配置）
            if ($data['target_type'] === 'generic') {
                $genericRequiredFields = ['target_data_source_id', 'target_database', 'target_collection'];
                foreach ($genericRequiredFields as $field) {
                    if (empty($data[$field])) {
                        return ApiResponseHelper::error("通用Handler缺少必填字段: {$field}", 400);
                    }
                }
            }

            // 验证模式
            if (isset($data['mode']) && !in_array($data['mode'], ['batch', 'realtime'])) {
                return ApiResponseHelper::error("模式必须是 batch 或 realtime", 400);
            }

            // 验证集合配置
            if (empty($data['collection']) && empty($data['collections'])) {
                return ApiResponseHelper::error("必须指定 collection 或 collections", 400);
            }

            $service = $this->getService();
            $task = $service->createTask($data);
            
            return ApiResponseHelper::success($task, '任务创建成功');
        } catch (\Throwable $e) {
            return ApiResponseHelper::exception($e);
        }
    }

    /**
     * 更新任务
     * 
     * PUT /api/data-collection-tasks/{task_id}
     */
    public function update(Request $request): Response
    {
        try {
            // 从请求路径中解析 task_id
            $path = $request->path();
            if (preg_match('#/api/data-collection-tasks/([^/]+)#', $path, $matches)) {
                $taskId = $matches[1];
            } else {
                $taskId = $request->get('task_id');
                if (!$taskId) {
                    throw new \InvalidArgumentException('缺少 task_id 参数');
                }
            }
            
            $data = $request->post();
            
            $service = $this->getService();
            $result = $service->updateTask($taskId, $data);
            
            if ($result) {
                return ApiResponseHelper::success(null, '任务更新成功');
            } else {
                return ApiResponseHelper::error('任务更新失败', 500);
            }
        } catch (\Throwable $e) {
            return ApiResponseHelper::exception($e);
        }
    }

    /**
     * 删除任务
     * 
     * DELETE /api/data-collection-tasks/{task_id}
     */
    public function delete(Request $request): Response
    {
        try {
            // 从请求路径中解析 task_id
            $path = $request->path();
            if (preg_match('#/api/data-collection-tasks/([^/]+)#', $path, $matches)) {
                $taskId = $matches[1];
            } else {
                $taskId = $request->get('task_id');
                if (!$taskId) {
                    throw new \InvalidArgumentException('缺少 task_id 参数');
                }
            }
            
            $service = $this->getService();
            $result = $service->deleteTask($taskId);
            
            if ($result) {
                return ApiResponseHelper::success(null, '任务删除成功');
            } else {
                return ApiResponseHelper::error('任务删除失败', 500);
            }
        } catch (\Throwable $e) {
            return ApiResponseHelper::exception($e);
        }
    }

    /**
     * 启动任务
     * 
     * POST /api/data-collection-tasks/{task_id}/start
     */
    public function start(Request $request): Response
    {
        try {
            // 从请求路径中解析 task_id
            $path = $request->path();
            if (preg_match('#/api/data-collection-tasks/([^/]+)/start#', $path, $matches)) {
                $taskId = $matches[1];
            } else {
                $taskId = $request->get('task_id');
                if (!$taskId) {
                    throw new \InvalidArgumentException('缺少 task_id 参数');
                }
            }
            
            $service = $this->getService();
            $result = $service->startTask($taskId);
            
            if ($result) {
                return ApiResponseHelper::success(null, '任务启动成功');
            } else {
                return ApiResponseHelper::error('任务启动失败', 500);
            }
        } catch (\Throwable $e) {
            return ApiResponseHelper::exception($e);
        }
    }

    /**
     * 暂停任务
     * 
     * POST /api/data-collection-tasks/{task_id}/pause
     */
    public function pause(Request $request): Response
    {
        try {
            // 从请求路径中解析 task_id
            $path = $request->path();
            if (preg_match('#/api/data-collection-tasks/([^/]+)/pause#', $path, $matches)) {
                $taskId = $matches[1];
            } else {
                $taskId = $request->get('task_id');
                if (!$taskId) {
                    throw new \InvalidArgumentException('缺少 task_id 参数');
                }
            }
            
            $service = $this->getService();
            $result = $service->pauseTask($taskId);
            
            if ($result) {
                return ApiResponseHelper::success(null, '任务暂停成功');
            } else {
                return ApiResponseHelper::error('任务暂停失败', 500);
            }
        } catch (\Throwable $e) {
            return ApiResponseHelper::exception($e);
        }
    }

    /**
     * 停止任务
     * 
     * POST /api/data-collection-tasks/{task_id}/stop
     */
    public function stop(Request $request): Response
    {
        try {
            // 从请求路径中解析 task_id
            $path = $request->path();
            if (preg_match('#/api/data-collection-tasks/([^/]+)/stop#', $path, $matches)) {
                $taskId = $matches[1];
            } else {
                $taskId = $request->get('task_id');
                if (!$taskId) {
                    throw new \InvalidArgumentException('缺少 task_id 参数');
                }
            }
            
            $service = $this->getService();
            $result = $service->stopTask($taskId);
            
            if ($result) {
                return ApiResponseHelper::success(null, '任务停止成功');
            } else {
                return ApiResponseHelper::error('任务停止失败', 500);
            }
        } catch (\Throwable $e) {
            return ApiResponseHelper::exception($e);
        }
    }

    /**
     * 获取任务列表
     * 
     * GET /api/data-collection-tasks
     */
    public function list(Request $request): Response
    {
        try {
            // 只收集非空的筛选条件
            $filters = [];
            if ($request->get('status') !== null && $request->get('status') !== '') {
                $filters['status'] = $request->get('status');
            }
            if ($request->get('data_source_id') !== null && $request->get('data_source_id') !== '') {
                $filters['data_source_id'] = $request->get('data_source_id');
            }
            if ($request->get('name') !== null && $request->get('name') !== '') {
                $filters['name'] = $request->get('name');
            }
            
            $page = (int)($request->get('page', 1));
            $pageSize = (int)($request->get('page_size', 20));
            
            $service = $this->getService();
            $result = $service->getTaskList($filters, $page, $pageSize);
            
            return ApiResponseHelper::success($result, '查询成功');
        } catch (\Throwable $e) {
            return ApiResponseHelper::exception($e);
        }
    }

    /**
     * 获取任务详情
     * 
     * GET /api/data-collection-tasks/{task_id}
     */
    public function detail(Request $request): Response
    {
        try {
            // 从请求路径中解析 task_id
            $path = $request->path();
            if (preg_match('#/api/data-collection-tasks/([^/]+)$#', $path, $matches)) {
                $taskId = $matches[1];
            } else {
                $taskId = $request->get('task_id');
                if (!$taskId) {
                    throw new \InvalidArgumentException('缺少 task_id 参数');
                }
            }
            
            $service = $this->getService();
            $task = $service->getTask($taskId);
            
            if ($task === null) {
                return ApiResponseHelper::error('任务不存在', 404);
            }
            
            return ApiResponseHelper::success($task, '查询成功');
        } catch (\Throwable $e) {
            return ApiResponseHelper::exception($e);
        }
    }

    /**
     * 获取任务进度
     * 
     * GET /api/data-collection-tasks/{task_id}/progress
     */
    public function progress(Request $request): Response
    {
        try {
            // 从请求路径中解析 task_id
            $path = $request->path();
            if (preg_match('#/api/data-collection-tasks/([^/]+)/progress#', $path, $matches)) {
                $taskId = $matches[1];
            } else {
                $taskId = $request->get('task_id');
                if (!$taskId) {
                    throw new \InvalidArgumentException('缺少 task_id 参数');
                }
            }
            
            $service = $this->getService();
            $task = $service->getTask($taskId);
            
            if ($task === null) {
                return ApiResponseHelper::error('任务不存在', 404);
            }
            
            $progress = $task['progress'] ?? [];
            
            return ApiResponseHelper::success($progress, '查询成功');
        } catch (\Throwable $e) {
            return ApiResponseHelper::exception($e);
        }
    }

    /**
     * 获取数据源列表
     * 
     * GET /api/data-collection-tasks/data-sources
     */
    public function getDataSources(Request $request): Response
    {
        try {
            // 优先使用数据库中的数据源，如果没有则使用配置文件
            $service = new \app\service\DataSourceService(new \app\repository\DataSourceRepository());
            $result = $service->getDataSourceList(['status' => 1]);
            
            if (!empty($result['list'])) {
                // 使用数据库中的数据源
                $list = array_map(function ($ds) {
                    return [
                        'id' => $ds['data_source_id'],
                        'name' => $ds['name'] ?? $ds['data_source_id'], // 添加名称字段
                        'type' => $ds['type'] ?? 'unknown',
                        'host' => $ds['host'] ?? '',
                        'port' => $ds['port'] ?? 0,
                        'database' => $ds['database'] ?? '',
                    ];
                }, $result['list']);
            }
            // 注意：现在数据源配置统一从数据库读取，不再使用config('data_sources')
            
            // 如果数据库中没有数据源，返回空列表
            if (!isset($list)) {
                $list = [];
            }
            
            return ApiResponseHelper::success($list, '查询成功');
        } catch (\MongoDB\Driver\Exception\Exception $e) {
            // MongoDB 连接错误，返回友好提示
            $errorMessage = '无法连接到 MongoDB 数据库，请检查数据库服务是否正常运行。错误详情：' . $e->getMessage();
            return ApiResponseHelper::error($errorMessage, 500);
        } catch (\Throwable $e) {
            return ApiResponseHelper::exception($e);
        }
    }

    /**
     * 获取数据源的数据库列表
     * 
     * GET /api/data-collection-tasks/data-sources/{data_source_id}/databases
     */
    public function getDatabases(Request $request, string $data_source_id): Response
    {
        try {
            // 从数据库获取数据源配置
            $service = new \app\service\DataSourceService(new \app\repository\DataSourceRepository());
            $dataSourceConfig = $service->getDataSourceConfig($data_source_id);
            
            if (!$dataSourceConfig) {
                return ApiResponseHelper::error('数据源不存在', 404);
            }
            
            $dataSource = $dataSourceConfig;

            // 如果是MongoDB，连接并获取数据库列表
            if ($dataSource['type'] === 'mongodb') {
                $client = $this->getMongoClient($dataSource);
                $databases = $client->listDatabases();
                
                $list = [];
                foreach ($databases as $database) {
                    $dbName = $database->getName();
                    // 同时返回原始名称和base64编码的ID（URL友好）
                    $list[] = [
                        'name' => $dbName,
                        'id' => base64_encode($dbName), // URL友好的标识符
                    ];
                }
                
                return ApiResponseHelper::success($list, '查询成功');
            }
            
            return ApiResponseHelper::error('不支持的数据源类型', 400);
        } catch (\Throwable $e) {
            return ApiResponseHelper::exception($e);
        }
    }

    /**
     * 获取数据库的集合列表
     * 
     * GET /api/data-collection-tasks/data-sources/{data_source_id}/databases/{database}/collections
     */
    public function getCollections(Request $request, string $data_source_id, string $database): Response
    {
        try {
            // 解码数据库名称（支持base64编码和URL编码）
            $database = $this->decodeName($database);
            
            // 从数据库获取数据源配置
            $service = new \app\service\DataSourceService(new \app\repository\DataSourceRepository());
            $dataSourceConfig = $service->getDataSourceConfig($data_source_id);
            
            if (!$dataSourceConfig) {
                return ApiResponseHelper::error('数据源不存在', 404);
            }
            
            $dataSource = $dataSourceConfig;

            // 如果是MongoDB，连接并获取集合列表
            if ($dataSource['type'] === 'mongodb') {
                $client = $this->getMongoClient($dataSource);
                $db = $client->selectDatabase($database);
                $collections = $db->listCollections();
                
                $list = [];
                foreach ($collections as $collection) {
                    $collName = $collection->getName();
                    // 同时返回原始名称和base64编码的ID（URL友好）
                    $list[] = [
                        'name' => $collName,
                        'id' => base64_encode($collName), // URL友好的标识符
                    ];
                }
                
                return ApiResponseHelper::success($list, '查询成功');
            }
            
            return ApiResponseHelper::error('不支持的数据源类型', 400);
        } catch (\Throwable $e) {
            return ApiResponseHelper::exception($e);
        }
    }

    /**
     * 获取Handler的目标字段列表
     * 
     * GET /api/data-collection-tasks/handlers/{handler_type}/target-fields
     */
    public function getHandlerTargetFields(Request $request, string $handler_type): Response
    {
        try {
            $fields = [];
            
            switch ($handler_type) {
                case 'consumption_record':
                    // 消费记录Handler的目标字段列表
                    // 包含原始输入字段（推荐）和转换后字段（可选）
                    // Handler会自动进行转换：phone_number/id_card -> user_id, store_name -> store_id
                    $fields = [
                        // 用户标识字段（原始输入，推荐使用）
                        ['name' => 'phone_number', 'label' => '手机号', 'type' => 'string', 'required' => false, 'description' => '手机号，Handler会自动解析为user_id', 'is_original' => true],
                        ['name' => 'id_card', 'label' => '身份证', 'type' => 'string', 'required' => false, 'description' => '身份证号，Handler会自动解析为user_id', 'is_original' => true],
                        // 用户ID（转换后字段，由Handler自动生成，不需要映射）
                        ['name' => 'user_id', 'label' => '用户ID', 'type' => 'string', 'required' => false, 'description' => '用户ID，由Handler通过phone_number/id_card自动解析生成，无需映射', 'is_original' => false, 'no_mapping' => true],
                        
                        // 门店标识字段（原始输入，推荐使用）
                        ['name' => 'store_name', 'label' => '门店名称', 'type' => 'string', 'required' => false, 'description' => '门店名称，Handler会自动转换为store_id', 'is_original' => true],
                        // 门店ID（转换后字段，由Handler自动生成，不需要映射）
                        ['name' => 'store_id', 'label' => '门店ID', 'type' => 'string', 'required' => false, 'description' => '门店ID，由Handler通过store_name自动转换生成，无需映射', 'is_original' => false, 'no_mapping' => true],
                        
                        // 订单标识字段（用于去重）
                        ['name' => 'source_order_id', 'label' => '原始订单ID', 'type' => 'string', 'required' => false, 'description' => '原始订单ID，配合店铺名称做去重唯一标识（建议配置）', 'is_original' => true],
                        // 注意：order_no 由系统自动生成（自动递增），不需要映射
                        
                        // 金额和时间字段（直接字段）
                        ['name' => 'amount', 'label' => '消费金额', 'type' => 'float', 'required' => true, 'description' => '消费金额（必填）', 'is_original' => true],
                        ['name' => 'actual_amount', 'label' => '实际金额', 'type' => 'float', 'required' => true, 'description' => '实际支付金额（必填）', 'is_original' => true],
                        ['name' => 'consume_time', 'label' => '消费时间', 'type' => 'datetime', 'required' => true, 'description' => '消费时间，用于时间分片存储（必填）', 'is_original' => true],
                        
                        // 其他可选字段
                        ['name' => 'currency', 'label' => '币种', 'type' => 'string', 'required' => false, 'description' => '币种，默认CNY（人民币）', 'is_original' => true, 'fixed_options' => true, 'options' => [['value' => 'CNY', 'label' => '人民币(CNY)'], ['value' => 'USD', 'label' => '美元(USD)']], 'default_value' => 'CNY'],
                        ['name' => 'status', 'label' => '记录状态', 'type' => 'int', 'required' => false, 'description' => '记录状态：0-正常，1-异常，2-已删除。默认0。需要配置源状态值到标准状态值的映射', 'is_original' => true, 'value_mapping' => true, 'target_values' => [['value' => 0, 'label' => '正常(0)'], ['value' => 1, 'label' => '异常(1)'], ['value' => 2, 'label' => '已删除(2)']], 'default_value' => 0],
                    ];
                    break;
                    
                case 'generic':
                    // 通用Handler - 没有固定的字段列表，由用户自定义
                    $fields = [];
                    break;
                    
                default:
                    return ApiResponseHelper::error("未知的Handler类型: {$handler_type}", 400);
            }
            
            return ApiResponseHelper::success($fields, '查询成功');
        } catch (\Throwable $e) {
            return ApiResponseHelper::exception($e);
        }
    }

    /**
     * 获取集合的字段列表（采样）
     * 
     * GET /api/data-collection-tasks/data-sources/{data_source_id}/databases/{database}/collections/{collection}/fields
     */
    public function getFields(Request $request, string $data_source_id, string $database, string $collection): Response
    {
        try {
            // 解码数据库名称和集合名称（支持base64编码和URL编码）
            $database = $this->decodeName($database);
            $collection = $this->decodeName($collection);
            
            // 从数据库获取数据源配置
            $service = new \app\service\DataSourceService(new \app\repository\DataSourceRepository());
            $dataSourceConfig = $service->getDataSourceConfig($data_source_id);
            
            if (!$dataSourceConfig) {
                return ApiResponseHelper::error('数据源不存在', 404);
            }
            
            $dataSource = $dataSourceConfig;

            // 如果是MongoDB，采样获取字段
            if ($dataSource['type'] === 'mongodb') {
                $client = $this->getMongoClient($dataSource);
                $db = $client->selectDatabase($database);
                $coll = $db->selectCollection($collection);
                
                // 采样一条数据
                $sample = $coll->findOne([]);
                
                if ($sample) {
                    $fields = [];
                    $this->extractFields($sample, '', $fields);
                    
                    return ApiResponseHelper::success($fields, '查询成功');
                } else {
                    return ApiResponseHelper::success([], '集合为空，无法获取字段');
                }
            }
            
            return ApiResponseHelper::error('不支持的数据源类型', 400);
        } catch (\Throwable $e) {
            return ApiResponseHelper::exception($e);
        }
    }

    /**
     * 递归提取字段
     */
    private function extractFields($data, string $prefix, array &$fields): void
    {
        if (is_array($data) || is_object($data)) {
            foreach ($data as $key => $value) {
                $fieldName = $prefix ? "{$prefix}.{$key}" : $key;
                
                if (is_array($value) || is_object($value)) {
                    if (empty($value)) {
                        $fields[] = [
                            'name' => $fieldName,
                            'type' => 'array',
                        ];
                    } else {
                        $this->extractFields($value, $fieldName, $fields);
                    }
                } else {
                    $fields[] = [
                        'name' => $fieldName,
                        'type' => gettype($value),
                    ];
                }
            }
        }
    }

    /**
     * 预览查询结果（包含lookup）
     * 
     * POST /api/data-collection-tasks/preview-query
     */
    public function previewQuery(Request $request): Response
    {
        try {
            $data = $request->post();
            
            $dataSourceId = $data['data_source_id'] ?? '';
            $database = $data['database'] ?? '';
            $collection = $data['collection'] ?? '';
            $lookups = $data['lookups'] ?? [];
            $filterConditions = $data['filter_conditions'] ?? [];
            $limit = (int)($data['limit'] ?? 5); // 默认预览5条
            
            if (empty($dataSourceId) || empty($database) || empty($collection)) {
                return ApiResponseHelper::error('缺少必要参数：data_source_id, database, collection', 400);
            }
            
            // 获取数据源配置
            $service = new \app\service\DataSourceService(new \app\repository\DataSourceRepository());
            $dataSourceConfig = $service->getDataSourceConfig($dataSourceId);
            
            if (!$dataSourceConfig) {
                return ApiResponseHelper::error('数据源不存在', 404);
            }
            
            if ($dataSourceConfig['type'] !== 'mongodb') {
                return ApiResponseHelper::error('目前只支持MongoDB数据源预览', 400);
            }
            
            // 连接MongoDB
            $client = $this->getMongoClient($dataSourceConfig);
            $db = $client->selectDatabase($database);
            $coll = $db->selectCollection($collection);
            
            // 构建聚合管道
            $pipeline = [];
            
            // 1. 添加过滤条件（$match）- 必须在最前面
            $filter = $this->buildFilterForPreview($filterConditions);
            if (!empty($filter)) {
                $pipeline[] = ['$match' => $filter];
            }
            
            // 2. 添加lookup查询
            foreach ($lookups as $lookup) {
                if (empty($lookup['from']) || empty($lookup['local_field']) || empty($lookup['foreign_field'])) {
                    continue;
                }
                
                $lookupStage = [
                    '$lookup' => [
                        'from' => $lookup['from'],
                        'localField' => $lookup['local_field'],
                        'foreignField' => $lookup['foreign_field'],
                        'as' => $lookup['as'] ?? 'joined'
                    ]
                ];
                
                $pipeline[] = $lookupStage;
                
                // 如果配置了解构
                if (!empty($lookup['unwrap'])) {
                    $pipeline[] = [
                        '$unwind' => [
                            'path' => '$' . ($lookup['as'] ?? 'joined'),
                            'preserveNullAndEmptyArrays' => !empty($lookup['preserve_null'])
                        ]
                    ];
                }
            }
            
            // 3. 限制返回数量
            $pipeline[] = ['$limit' => $limit];
            
            // 执行聚合查询
            $cursor = $coll->aggregate($pipeline);
            $results = [];
            $fields = [];
            
            foreach ($cursor as $doc) {
                $docArray = $this->convertMongoDocumentToArray($doc);
                $results[] = $docArray;
                
                // 提取字段
                $this->extractFields($docArray, '', $fields);
            }
            
            // 去重字段
            $uniqueFields = [];
            $fieldMap = [];
            foreach ($fields as $field) {
                if (!isset($fieldMap[$field['name']])) {
                    $fieldMap[$field['name']] = true;
                    $uniqueFields[] = $field;
                }
            }
            
            return ApiResponseHelper::success([
                'fields' => $uniqueFields,
                'data' => $results,
                'count' => count($results)
            ], '预览成功');
            
        } catch (\Throwable $e) {
            return ApiResponseHelper::exception($e);
        }
    }

    /**
     * 将MongoDB文档转换为数组
     */
    private function convertMongoDocumentToArray($document): array
    {
        if (is_array($document)) {
            return $document;
        }
        
        if (is_object($document)) {
            $array = [];
            foreach ($document as $key => $value) {
                if ($value instanceof \MongoDB\BSON\UTCDateTime) {
                    $array[$key] = $value->toDateTime()->format('Y-m-d H:i:s');
                } elseif (is_object($value) && method_exists($value, '__toString')) {
                    $array[$key] = (string)$value;
                } elseif (is_array($value) || is_object($value)) {
                    $array[$key] = $this->convertMongoDocumentToArray($value);
                } else {
                    $array[$key] = $value;
                }
            }
            return $array;
        }
        
        return [];
    }

    /**
     * 构建过滤条件（用于预览查询）
     * 
     * @param array $filterConditions 过滤条件列表
     * @return array MongoDB查询过滤器
     */
    private function buildFilterForPreview(array $filterConditions): array
    {
        $filter = [];

        foreach ($filterConditions as $condition) {
            $field = $condition['field'] ?? '';
            $operator = $condition['operator'] ?? 'eq';
            $value = $condition['value'] ?? null;

            if (empty($field)) {
                continue;
            }

            // 处理值的类型转换
            if ($value !== null && $value !== '') {
                // 尝试转换为数字（如果是数字字符串）
                if (is_numeric($value)) {
                    // 判断是整数还是浮点数
                    if (strpos($value, '.') !== false) {
                        $value = (float)$value;
                    } else {
                        $value = (int)$value;
                    }
                }
            }

            switch ($operator) {
                case 'eq':
                    $filter[$field] = $value;
                    break;
                case 'ne':
                    $filter[$field] = ['$ne' => $value];
                    break;
                case 'gt':
                    $filter[$field] = ['$gt' => $value];
                    break;
                case 'gte':
                    $filter[$field] = ['$gte' => $value];
                    break;
                case 'lt':
                    $filter[$field] = ['$lt' => $value];
                    break;
                case 'lte':
                    $filter[$field] = ['$lte' => $value];
                    break;
                case 'in':
                    // in操作符的值应该是数组
                    $valueArray = is_array($value) ? $value : explode(',', (string)$value);
                    $filter[$field] = ['$in' => $valueArray];
                    break;
                case 'nin':
                    // nin操作符的值应该是数组
                    $valueArray = is_array($value) ? $value : explode(',', (string)$value);
                    $filter[$field] = ['$nin' => $valueArray];
                    break;
            }
        }

        return $filter;
    }

    /**
     * 解码数据库或集合名称（支持base64编码和URL编码）
     * 
     * @param string $name 编码后的名称
     * @return string 解码后的名称
     */
    private function decodeName(string $name): string
    {
        // 尝试base64解码（如果前端使用的是编码后的ID）
        // 检查是否可能是base64编码（只包含base64字符且长度合理）
        if (preg_match('/^[A-Za-z0-9+\/]*={0,2}$/', $name) && strlen($name) > 0) {
            $decoded = @base64_decode($name, true);
            if ($decoded !== false && $decoded !== '') {
                // 解码成功，使用解码后的值
                return $decoded;
            }
        }
        
        // 不是base64格式或解码失败，使用URL解码（处理中文等特殊字符）
        return rawurldecode($name);
    }

    /**
     * 获取MongoDB客户端
     */
    private function getMongoClient(array $config): \MongoDB\Client
    {
        $host = $config['host'] ?? '';
        $port = (int)($config['port'] ?? 27017);
        $username = $config['username'] ?? '';
        $password = $config['password'] ?? '';
        $authSource = $config['auth_source'] ?? 'admin';

        if (!empty($username) && !empty($password)) {
            $dsn = "mongodb://{$username}:{$password}@{$host}:{$port}/{$authSource}";
        } else {
            $dsn = "mongodb://{$host}:{$port}";
        }

        return new \MongoDB\Client($dsn, $config['options'] ?? []);
    }
}

