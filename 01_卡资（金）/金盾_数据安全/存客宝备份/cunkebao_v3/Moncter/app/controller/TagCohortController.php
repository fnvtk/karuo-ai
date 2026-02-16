<?php

namespace app\controller;

use app\repository\TagCohortRepository;
use app\repository\UserTagRepository;
use app\service\TagService;
use app\repository\TagDefinitionRepository;
use app\repository\UserProfileRepository;
use app\repository\TagHistoryRepository;
use app\service\TagRuleEngine\SimpleRuleEngine;
use app\utils\ApiResponseHelper;
use app\utils\LoggerHelper;
use Ramsey\Uuid\Uuid;
use support\Request;
use support\Response;

class TagCohortController
{
    /**
     * 获取人群快照列表
     *
     * GET /api/tag-cohorts
     */
    public function list(Request $request): Response
    {
        try {
            LoggerHelper::logRequest('GET', '/api/tag-cohorts');

            $page = (int)($request->get('page') ?? 1);
            $pageSize = (int)($request->get('page_size') ?? 20);

            if ($page < 1) {
                $page = 1;
            }
            if ($pageSize < 1 || $pageSize > 100) {
                $pageSize = 20;
            }

            $cohortRepo = new TagCohortRepository();

            $total = $cohortRepo->newQuery()->count();

            $cohorts = $cohortRepo->newQuery()
                ->orderBy('created_at', 'desc')
                ->skip(($page - 1) * $pageSize)
                ->take($pageSize)
                ->get();

            $result = [];
            foreach ($cohorts as $cohort) {
                $result[] = [
                    'cohort_id' => $cohort->cohort_id,
                    'name' => $cohort->name,
                    'user_count' => $cohort->user_count ?? 0,
                    'created_at' => $cohort->created_at ? $cohort->created_at->format('Y-m-d H:i:s') : null,
                ];
            }

            LoggerHelper::logBusiness('get_tag_cohort_list', [
                'total' => $total,
                'page' => $page,
            ]);

            return ApiResponseHelper::success([
                'cohorts' => $result,
                'total' => $total,
                'page' => $page,
                'page_size' => $pageSize,
            ]);
        } catch (\Throwable $e) {
            return ApiResponseHelper::exception($e);
        }
    }

    /**
     * 获取人群快照详情
     *
     * GET /api/tag-cohorts/{cohort_id}
     */
    public function detail(Request $request, string $cohortId): Response
    {
        try {
            LoggerHelper::logRequest('GET', "/api/tag-cohorts/{$cohortId}");

            $cohortRepo = new TagCohortRepository();
            $cohort = $cohortRepo->newQuery()->where('cohort_id', $cohortId)->first();

            if (!$cohort) {
                return ApiResponseHelper::error('人群快照不存在', 404, 404);
            }

            $result = [
                'cohort_id' => $cohort->cohort_id,
                'name' => $cohort->name,
                'description' => $cohort->description ?? '',
                'conditions' => $cohort->conditions ?? [],
                'logic' => $cohort->logic ?? 'AND',
                'user_ids' => $cohort->user_ids ?? [],
                'user_count' => $cohort->user_count ?? 0,
                'created_at' => $cohort->created_at ? $cohort->created_at->format('Y-m-d H:i:s') : null,
            ];

            LoggerHelper::logBusiness('get_tag_cohort_detail', [
                'cohort_id' => $cohortId,
            ]);

            return ApiResponseHelper::success($result);
        } catch (\Throwable $e) {
            return ApiResponseHelper::exception($e);
        }
    }

    /**
     * 创建人群快照
     *
     * POST /api/tag-cohorts
     */
    public function create(Request $request): Response
    {
        try {
            LoggerHelper::logRequest('POST', '/api/tag-cohorts');

            $rawBody = $request->rawBody();
            
            if (empty($rawBody)) {
                return ApiResponseHelper::error('请求体为空，请确保 Content-Type 为 application/json 并发送有效的 JSON 数据', 400);
            }

            $body = json_decode($rawBody, true);
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                return ApiResponseHelper::error('JSON 格式错误: ' . json_last_error_msg(), 400);
            }

            // 验证必填字段
            if (empty($body['name'])) {
                throw new \InvalidArgumentException('缺少必填字段：name');
            }

            if (empty($body['conditions']) || !is_array($body['conditions'])) {
                throw new \InvalidArgumentException('缺少必填字段：conditions（必须为数组）');
            }

            if (empty($body['user_ids']) || !is_array($body['user_ids'])) {
                throw new \InvalidArgumentException('缺少必填字段：user_ids（必须为数组）');
            }

            // 使用标签筛选服务获取用户列表
            $tagService = new TagService(
                new TagDefinitionRepository(),
                new UserProfileRepository(),
                new UserTagRepository(),
                new TagHistoryRepository(),
                new SimpleRuleEngine()
            );

            $conditions = $body['conditions'];
            $logic = $body['logic'] ?? 'AND';

            // 筛选用户（获取所有用户，不包含用户信息）
            $filterResult = $tagService->filterUsersByTags(
                $conditions,
                $logic,
                1,
                10000, // 最多获取10000个用户
                false
            );

            // 从返回结果中提取用户ID
            $userIds = [];
            if (isset($filterResult['users']) && is_array($filterResult['users'])) {
                foreach ($filterResult['users'] as $user) {
                    if (isset($user['user_id'])) {
                        $userIds[] = $user['user_id'];
                    } elseif (is_string($user)) {
                        // 如果直接返回的是用户ID字符串
                        $userIds[] = $user;
                    }
                }
            }

            // 如果用户提供了 user_ids，使用提供的列表（优先级更高）
            if (!empty($body['user_ids']) && is_array($body['user_ids'])) {
                $userIds = $body['user_ids'];
            }

            // 创建人群快照
            $cohortRepo = new TagCohortRepository();
            $cohort = new TagCohortRepository();
            $cohort->cohort_id = Uuid::uuid4()->toString();
            $cohort->name = $body['name'];
            $cohort->description = $body['description'] ?? '';
            $cohort->conditions = $conditions;
            $cohort->logic = $logic;
            $cohort->user_ids = $userIds;
            $cohort->user_count = count($userIds);
            $cohort->created_by = $body['created_by'] ?? 'system';
            $cohort->created_at = new \DateTime();
            $cohort->updated_at = new \DateTime();
            $cohort->save();

            LoggerHelper::logBusiness('create_tag_cohort', [
                'cohort_id' => $cohort->cohort_id,
                'name' => $cohort->name,
                'user_count' => $cohort->user_count,
            ]);

            return ApiResponseHelper::success([
                'cohort_id' => $cohort->cohort_id,
                'name' => $cohort->name,
                'user_count' => $cohort->user_count,
            ], '人群快照创建成功');
        } catch (\InvalidArgumentException $e) {
            return ApiResponseHelper::error($e->getMessage(), 400);
        } catch (\Throwable $e) {
            return ApiResponseHelper::exception($e);
        }
    }

    /**
     * 删除人群快照
     *
     * DELETE /api/tag-cohorts/{cohort_id}
     */
    public function delete(Request $request, string $cohortId): Response
    {
        try {
            LoggerHelper::logRequest('DELETE', "/api/tag-cohorts/{$cohortId}");

            $cohortRepo = new TagCohortRepository();
            $cohort = $cohortRepo->newQuery()->where('cohort_id', $cohortId)->first();

            if (!$cohort) {
                return ApiResponseHelper::error('人群快照不存在', 404, 404);
            }

            $cohort->delete();

            LoggerHelper::logBusiness('delete_tag_cohort', [
                'cohort_id' => $cohortId,
            ]);

            return ApiResponseHelper::success(null, '人群快照删除成功');
        } catch (\Throwable $e) {
            return ApiResponseHelper::exception($e);
        }
    }

    /**
     * 导出人群快照
     *
     * POST /api/tag-cohorts/{cohort_id}/export
     */
    public function export(Request $request, string $cohortId): Response
    {
        try {
            LoggerHelper::logRequest('POST', "/api/tag-cohorts/{$cohortId}/export");

            $cohortRepo = new TagCohortRepository();
            $cohort = $cohortRepo->newQuery()->where('cohort_id', $cohortId)->first();

            if (!$cohort) {
                return ApiResponseHelper::error('人群快照不存在', 404, 404);
            }

            $userIds = $cohort->user_ids ?? [];
            $userProfileRepo = new UserProfileRepository();

            // 获取用户信息
            $users = [];
            foreach ($userIds as $userId) {
                $user = $userProfileRepo->findByUserId($userId);
                if ($user) {
                    $users[] = [
                        'user_id' => $user->user_id,
                        'phone' => $user->phone ?? '',
                        'name' => $user->name ?? '',
                    ];
                }
            }

            // 生成 CSV 内容
            $csvContent = "用户ID,手机号,姓名\n";
            foreach ($users as $user) {
                $csvContent .= sprintf(
                    "%s,%s,%s\n",
                    $user['user_id'],
                    $user['phone'],
                    $user['name']
                );
            }

            LoggerHelper::logBusiness('export_tag_cohort', [
                'cohort_id' => $cohortId,
                'user_count' => count($users),
            ]);

            // 返回 CSV 文件
            return response($csvContent)
                ->header('Content-Type', 'text/csv; charset=utf-8')
                ->header('Content-Disposition', "attachment; filename=\"cohort_{$cohortId}.csv\"");
        } catch (\Throwable $e) {
            return ApiResponseHelper::exception($e);
        }
    }
}

