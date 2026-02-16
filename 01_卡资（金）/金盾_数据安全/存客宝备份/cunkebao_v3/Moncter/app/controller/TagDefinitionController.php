<?php

namespace app\controller;

use app\repository\TagDefinitionRepository;
use app\utils\ApiResponseHelper;
use support\Request;
use support\Response;

/**
 * 标签定义管理控制器
 */
class TagDefinitionController
{
    /**
     * 获取标签定义列表
     * 
     * GET /api/tag-definitions
     */
    public function list(Request $request): Response
    {
        try {
            $repo = new TagDefinitionRepository();
            $query = $repo->query();

            // 筛选条件
            if ($request->get('category')) {
                $query->where('category', $request->get('category'));
            }
            if ($request->get('status')) {
                $query->where('status', $request->get('status'));
            }
            if ($request->get('name')) {
                $query->where('tag_name', 'like', '%' . $request->get('name') . '%');
            }

            $page = (int)($request->get('page', 1));
            $pageSize = (int)($request->get('page_size', 20));

            $total = $query->count();
            $definitions = $query->orderBy('created_at', 'desc')
                ->skip(($page - 1) * $pageSize)
                ->take($pageSize)
                ->get()
                ->toArray();

            return ApiResponseHelper::success([
                'definitions' => $definitions,
                'total' => $total,
                'page' => $page,
                'page_size' => $pageSize,
                'total_pages' => ceil($total / $pageSize),
            ], '查询成功');
        } catch (\Throwable $e) {
            return ApiResponseHelper::exception($e);
        }
    }

    /**
     * 获取标签定义详情
     * 
     * GET /api/tag-definitions/{tag_id}
     */
    public function detail(Request $request, string $tagId): Response
    {
        try {
            $repo = new TagDefinitionRepository();
            $definition = $repo->find($tagId);
            
            if (!$definition) {
                return ApiResponseHelper::error('标签定义不存在', 404);
            }
            
            return ApiResponseHelper::success($definition->toArray(), '查询成功');
        } catch (\Throwable $e) {
            return ApiResponseHelper::exception($e);
        }
    }

    /**
     * 创建标签定义
     * 
     * POST /api/tag-definitions
     */
    public function create(Request $request): Response
    {
        try {
            $data = $request->post();
            
            $requiredFields = ['tag_code', 'tag_name', 'category'];
            foreach ($requiredFields as $field) {
                if (empty($data[$field])) {
                    return ApiResponseHelper::error("缺少必填字段: {$field}", 400);
                }
            }

            $repo = new TagDefinitionRepository();
            $definition = $repo->create($data);
            
            return ApiResponseHelper::success($definition->toArray(), '创建成功');
        } catch (\Throwable $e) {
            return ApiResponseHelper::exception($e);
        }
    }

    /**
     * 更新标签定义
     * 
     * PUT /api/tag-definitions/{tag_id}
     */
    public function update(Request $request, string $tagId): Response
    {
        try {
            $data = $request->post();
            
            $repo = new TagDefinitionRepository();
            $definition = $repo->find($tagId);
            
            if (!$definition) {
                return ApiResponseHelper::error('标签定义不存在', 404);
            }

            $definition->fill($data);
            $definition->save();
            
            return ApiResponseHelper::success($definition->toArray(), '更新成功');
        } catch (\Throwable $e) {
            return ApiResponseHelper::exception($e);
        }
    }

    /**
     * 删除标签定义
     * 
     * DELETE /api/tag-definitions/{tag_id}
     */
    public function delete(Request $request, string $tagId): Response
    {
        try {
            $repo = new TagDefinitionRepository();
            $definition = $repo->find($tagId);
            
            if (!$definition) {
                return ApiResponseHelper::error('标签定义不存在', 404);
            }

            $definition->delete();
            
            return ApiResponseHelper::success(null, '删除成功');
        } catch (\Throwable $e) {
            return ApiResponseHelper::exception($e);
        }
    }
}

