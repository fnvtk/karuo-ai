<?php

namespace app\controller;

use app\repository\DataSourceRepository;
use app\service\DataSourceService;
use app\utils\ApiResponseHelper;
use support\Request;
use support\Response;

/**
 * 数据源管理控制器
 */
class DataSourceController
{
    /**
     * 获取数据源服务实例
     */
    private function getService(): DataSourceService
    {
        return new DataSourceService(new DataSourceRepository());
    }

    /**
     * 获取数据源列表
     * 
     * GET /api/data-sources
     */
    public function list(Request $request): Response
    {
        try {
            $service = $this->getService();
            $filters = [
                'type' => $request->get('type'),
                'status' => $request->get('status'),
                'name' => $request->get('name'),
                'page' => $request->get('page', 1),
                'page_size' => $request->get('page_size', 20),
            ];

            $result = $service->getDataSourceList($filters);

            return ApiResponseHelper::success([
                'data_sources' => $result['list'],
                'total' => $result['total'],
                'page' => (int)$filters['page'],
                'page_size' => (int)$filters['page_size'],
            ], '查询成功');
        } catch (\Throwable $e) {
            return ApiResponseHelper::exception($e);
        }
    }

    /**
     * 获取数据源详情
     * 
     * GET /api/data-sources/{data_source_id}
     */
    public function detail(Request $request, string $data_source_id): Response
    {
        try {
            $service = $this->getService();
            $dataSource = $service->getDataSourceDetail($data_source_id);

            if (!$dataSource) {
                return ApiResponseHelper::error('数据源不存在', 404);
            }

            return ApiResponseHelper::success($dataSource, '查询成功');
        } catch (\Throwable $e) {
            return ApiResponseHelper::exception($e);
        }
    }

    /**
     * 创建数据源
     * 
     * POST /api/data-sources
     */
    public function create(Request $request): Response
    {
        try {
            $data = $request->post();

            $service = $this->getService();
            $dataSource = $service->createDataSource($data);

            // 不返回密码
            $result = $dataSource->toArray();
            unset($result['password']);

            return ApiResponseHelper::success($result, '创建成功');
        } catch (\Throwable $e) {
            return ApiResponseHelper::exception($e);
        }
    }

    /**
     * 更新数据源
     * 
     * PUT /api/data-sources/{data_source_id}
     */
    public function update(Request $request, string $data_source_id): Response
    {
        try {
            $data = $request->post();

            $service = $this->getService();
            $result = $service->updateDataSource($data_source_id, $data);

            if ($result) {
                return ApiResponseHelper::success(null, '更新成功');
            } else {
                return ApiResponseHelper::error('更新失败', 500);
            }
        } catch (\Throwable $e) {
            return ApiResponseHelper::exception($e);
        }
    }

    /**
     * 删除数据源
     * 
     * DELETE /api/data-sources/{data_source_id}
     */
    public function delete(Request $request, string $data_source_id): Response
    {
        try {
            $service = $this->getService();
            $result = $service->deleteDataSource($data_source_id);

            if ($result) {
                return ApiResponseHelper::success(null, '删除成功');
            } else {
                return ApiResponseHelper::error('删除失败', 500);
            }
        } catch (\Throwable $e) {
            return ApiResponseHelper::exception($e);
        }
    }

    /**
     * 测试数据源连接
     * 
     * POST /api/data-sources/test-connection
     */
    public function testConnection(Request $request): Response
    {
        try {
            $data = $request->post();

            // 验证必填字段
            $requiredFields = ['type', 'host', 'port', 'database'];
            foreach ($requiredFields as $field) {
                if (empty($data[$field])) {
                    return ApiResponseHelper::error("缺少必填字段: {$field}", 400);
                }
            }

            $service = $this->getService();
            $connected = $service->testConnection($data);

            if ($connected) {
                return ApiResponseHelper::success(['connected' => true], '连接成功');
            } else {
                return ApiResponseHelper::error('连接失败，请检查配置', 400);
            }
        } catch (\Throwable $e) {
            return ApiResponseHelper::error('连接测试失败: ' . $e->getMessage(), 400);
        }
    }
}

