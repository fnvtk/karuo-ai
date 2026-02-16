<?php

namespace app\controller;

use app\service\TagTaskService;
use app\repository\TagTaskRepository;
use app\repository\TagTaskExecutionRepository;
use app\repository\UserProfileRepository;
use app\service\TagService;
use app\repository\TagDefinitionRepository;
use app\repository\UserTagRepository;
use app\repository\TagHistoryRepository;
use app\service\TagRuleEngine\SimpleRuleEngine;
use app\utils\ApiResponseHelper;
use support\Request;
use support\Response;

/**
 * 标签任务管理控制器
 */
class TagTaskController
{
    public function __construct()
    {
        // 初始化服务（使用依赖注入或直接创建）
    }

    /**
     * 创建标签任务
     * 
     * POST /api/tag-tasks
     */
    public function create(Request $request): Response
    {
        try {
            $data = $request->post();
            
            $requiredFields = ['name', 'task_type'];
            foreach ($requiredFields as $field) {
                if (empty($data[$field])) {
                    return ApiResponseHelper::error("缺少必填字段: {$field}", 400);
                }
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
     * PUT /api/tag-tasks/{task_id}
     */
    public function update(Request $request, string $taskId): Response
    {
        try {
            $data = $request->post();
            
            $service = $this->getService();
            $result = $service->updateTask($taskId, $data);
            
            return ApiResponseHelper::success(null, '任务更新成功');
        } catch (\Throwable $e) {
            return ApiResponseHelper::exception($e);
        }
    }

    /**
     * 删除任务
     * 
     * DELETE /api/tag-tasks/{task_id}
     */
    public function delete(Request $request, string $taskId): Response
    {
        try {
            $service = $this->getService();
            $result = $service->deleteTask($taskId);
            
            return ApiResponseHelper::success(null, '任务删除成功');
        } catch (\Throwable $e) {
            return ApiResponseHelper::exception($e);
        }
    }

    /**
     * 启动任务
     * 
     * POST /api/tag-tasks/{task_id}/start
     */
    public function start(Request $request, string $taskId): Response
    {
        try {
            $service = $this->getService();
            $result = $service->startTask($taskId);
            
            return ApiResponseHelper::success(null, '任务启动成功');
        } catch (\Throwable $e) {
            return ApiResponseHelper::exception($e);
        }
    }

    /**
     * 暂停任务
     * 
     * POST /api/tag-tasks/{task_id}/pause
     */
    public function pause(Request $request, string $taskId): Response
    {
        try {
            $service = $this->getService();
            $result = $service->pauseTask($taskId);
            
            return ApiResponseHelper::success(null, '任务暂停成功');
        } catch (\Throwable $e) {
            return ApiResponseHelper::exception($e);
        }
    }

    /**
     * 停止任务
     * 
     * POST /api/tag-tasks/{task_id}/stop
     */
    public function stop(Request $request, string $taskId): Response
    {
        try {
            $service = $this->getService();
            $result = $service->stopTask($taskId);
            
            return ApiResponseHelper::success(null, '任务停止成功');
        } catch (\Throwable $e) {
            return ApiResponseHelper::exception($e);
        }
    }

    /**
     * 获取任务列表
     * 
     * GET /api/tag-tasks
     */
    public function list(Request $request): Response
    {
        try {
            $filters = [
                'status' => $request->get('status'),
                'task_type' => $request->get('task_type'),
                'name' => $request->get('name'),
            ];
            
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
     * GET /api/tag-tasks/{task_id}
     */
    public function detail(Request $request, string $taskId): Response
    {
        try {
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
     * 获取任务执行记录
     * 
     * GET /api/tag-tasks/{task_id}/executions
     */
    public function executions(Request $request, string $taskId): Response
    {
        try {
            $page = (int)($request->get('page', 1));
            $pageSize = (int)($request->get('page_size', 20));
            
            $service = $this->getService();
            $result = $service->getExecutions($taskId, $page, $pageSize);
            
            return ApiResponseHelper::success($result, '查询成功');
        } catch (\Throwable $e) {
            return ApiResponseHelper::exception($e);
        }
    }

    /**
     * 获取服务实例
     */
    private function getService(): TagTaskService
    {
        return new TagTaskService(
            new TagTaskRepository(),
            new TagTaskExecutionRepository(),
            new UserProfileRepository(),
            new TagService(
                new TagDefinitionRepository(),
                new UserProfileRepository(),
                new UserTagRepository(),
                new TagHistoryRepository(),
                new SimpleRuleEngine()
            )
        );
    }
}

