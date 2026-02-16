<?php

namespace app\controller;

use app\repository\TagDefinitionRepository;
use app\repository\UserProfileRepository;
use app\repository\UserTagRepository;
use app\repository\TagHistoryRepository;
use app\service\TagService;
use app\service\TagRuleEngine\SimpleRuleEngine;
use app\utils\ApiResponseHelper;
use app\utils\DataMaskingHelper;
use app\utils\LoggerHelper;
use support\Request;
use support\Response;

class TagController
{
    /**
     * 查询用户的标签列表
     *
     * GET /api/users/{user_id}/tags
     */
    public function listByUser(Request $request): Response
    {
        try {
            // 从请求路径中解析 user_id
            $path = $request->path();
            if (preg_match('#/api/users/([^/]+)/tags#', $path, $matches)) {
                $userId = $matches[1];
            } else {
                // 如果路径解析失败，尝试从查询参数获取
                $userId = $request->get('user_id');
                if (!$userId) {
                    throw new \InvalidArgumentException('缺少 user_id 参数');
                }
            }

            LoggerHelper::logRequest('GET', $path, ['user_id' => $userId]);

            $userTagRepo = new UserTagRepository();
            $tagDefRepo = new TagDefinitionRepository();

            // 查询用户的所有标签
            $userTags = $userTagRepo->newQuery()
                ->where('user_id', $userId)
                ->get();

            // 关联标签定义信息
            $result = [];
            foreach ($userTags as $userTag) {
                $tagDef = $tagDefRepo->newQuery()
                    ->where('tag_id', $userTag->tag_id)
                    ->first();

                $result[] = [
                    'tag_id' => $userTag->tag_id,
                    'tag_code' => $tagDef ? $tagDef->tag_code : null,
                    'tag_name' => $tagDef ? $tagDef->tag_name : null,
                    'category' => $tagDef ? $tagDef->category : null,
                    'tag_value' => $userTag->tag_value,
                    'tag_value_type' => $userTag->tag_value_type,
                    'confidence' => $userTag->confidence,
                    'effective_time' => $userTag->effective_time,
                    'expire_time' => $userTag->expire_time,
                    'update_time' => $userTag->update_time,
                ];
            }

            LoggerHelper::logBusiness('get_user_tags', [
                'user_id' => $userId,
                'tag_count' => count($result),
            ]);

            return ApiResponseHelper::success([
                'user_id' => $userId,
                'tags' => $result,
                'count' => count($result),
            ]);
        } catch (\InvalidArgumentException $e) {
            return ApiResponseHelper::error($e->getMessage(), 400);
        } catch (\Throwable $e) {
            return ApiResponseHelper::exception($e);
        }
    }

    /**
     * 更新/计算用户标签
     *
     * PUT /api/users/{user_id}/tags
     */
    public function calculate(Request $request): Response
    {
        $startTime = microtime(true);
        
        try {
            // 从请求路径中解析 user_id
            $path = $request->path();
            if (preg_match('#/api/users/([^/]+)/tags#', $path, $matches)) {
                $userId = $matches[1];
            } else {
                // 如果路径解析失败，尝试从查询参数获取
                $userId = $request->get('user_id');
                if (!$userId) {
                    throw new \InvalidArgumentException('缺少 user_id 参数');
                }
            }

            LoggerHelper::logRequest('PUT', $path, ['user_id' => $userId]);

            $tagService = new TagService(
                new TagDefinitionRepository(),
                new UserProfileRepository(),
                new UserTagRepository(),
                new TagHistoryRepository(),
                new SimpleRuleEngine()
            );

            $tags = $tagService->calculateTags($userId);

            $duration = microtime(true) - $startTime;
            LoggerHelper::logBusiness('calculate_tags', [
                'user_id' => $userId,
                'updated_count' => count($tags),
            ], 'info');
            LoggerHelper::logPerformance('tag_calculation', $duration, [
                'user_id' => $userId,
                'tag_count' => count($tags),
            ]);

            return ApiResponseHelper::success([
                'user_id' => $userId,
                'updated_tags' => $tags,
                'count' => count($tags),
            ]);
        } catch (\InvalidArgumentException $e) {
            return ApiResponseHelper::error($e->getMessage(), 400);
        } catch (\Throwable $e) {
            return ApiResponseHelper::exception($e);
        }
    }

    /**
     * 删除用户的指定标签
     *
     * DELETE /api/users/{user_id}/tags/{tag_id}
     */
    public function destroy(Request $request): Response
    {
        try {
            // 从请求路径中解析 user_id 和 tag_id
            $path = $request->path();
            if (preg_match('#/api/users/([^/]+)/tags/([^/]+)#', $path, $matches)) {
                $userId = $matches[1];
                $tagId = $matches[2];
            } else {
                throw new \InvalidArgumentException('缺少 user_id 或 tag_id 参数');
            }

            LoggerHelper::logRequest('DELETE', $path, ['user_id' => $userId, 'tag_id' => $tagId]);

            $tagService = new TagService(
                new TagDefinitionRepository(),
                new UserProfileRepository(),
                new UserTagRepository(),
                new TagHistoryRepository(),
                new SimpleRuleEngine()
            );

            $deleted = $tagService->deleteUserTag($userId, $tagId);

            if (!$deleted) {
                return ApiResponseHelper::error('标签不存在', 404, 404);
            }

            LoggerHelper::logBusiness('tag_deleted', [
                'user_id' => $userId,
                'tag_id' => $tagId,
            ]);

            return ApiResponseHelper::success(null, '标签删除成功');
        } catch (\InvalidArgumentException $e) {
            return ApiResponseHelper::error($e->getMessage(), 400);
        } catch (\Throwable $e) {
            return ApiResponseHelper::exception($e);
        }
    }

    /**
     * 根据标签筛选用户
     *
     * POST /api/tags/filter
     */
    public function filter(Request $request): Response
    {
        try {
            LoggerHelper::logRequest('POST', '/api/tags/filter');

            $rawBody = $request->rawBody();
            
            if (empty($rawBody)) {
                return ApiResponseHelper::error('请求体为空，请确保 Content-Type 为 application/json 并发送有效的 JSON 数据', 400);
            }

            $body = json_decode($rawBody, true);
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                return ApiResponseHelper::error('JSON 格式错误: ' . json_last_error_msg(), 400);
            }

            // 验证必填字段
            if (empty($body['tag_conditions']) || !is_array($body['tag_conditions'])) {
                throw new \InvalidArgumentException('缺少必填字段：tag_conditions（必须为数组）');
            }

            // 验证条件格式
            foreach ($body['tag_conditions'] as $condition) {
                if (!isset($condition['tag_code']) || !isset($condition['operator']) || !isset($condition['value'])) {
                    throw new \InvalidArgumentException('每个条件必须包含 tag_code、operator 和 value 字段');
                }
            }

            $tagService = new TagService(
                new TagDefinitionRepository(),
                new UserProfileRepository(),
                new UserTagRepository(),
                new TagHistoryRepository(),
                new SimpleRuleEngine()
            );

            $conditions = $body['tag_conditions'];
            $logic = $body['logic'] ?? 'AND';
            $page = (int)($body['page'] ?? 1);
            $pageSize = (int)($body['page_size'] ?? 20);
            $includeUserInfo = (bool)($body['include_user_info'] ?? false);

            if ($page < 1) {
                $page = 1;
            }
            if ($pageSize < 1 || $pageSize > 100) {
                $pageSize = 20;
            }

            $result = $tagService->filterUsersByTags(
                $conditions,
                $logic,
                $page,
                $pageSize,
                $includeUserInfo
            );

            // 对返回的用户信息进行脱敏处理
            if ($includeUserInfo && isset($result['users']) && is_array($result['users'])) {
                foreach ($result['users'] as &$user) {
                    $user = DataMaskingHelper::maskArray($user, ['phone', 'email']);
                }
                unset($user);
            }

            LoggerHelper::logBusiness('filter_users_by_tags', [
                'conditions_count' => count($conditions),
                'logic' => $logic,
                'result_count' => $result['total'] ?? 0,
            ]);

            return ApiResponseHelper::success($result);
        } catch (\InvalidArgumentException $e) {
            return ApiResponseHelper::error($e->getMessage(), 400);
        } catch (\Throwable $e) {
            return ApiResponseHelper::exception($e);
        }
    }

    /**
     * 批量初始化标签定义
     *
     * POST /api/tag-definitions/batch
     */
    public function init(Request $request): Response
    {
        try {
            LoggerHelper::logRequest('POST', '/api/tag-definitions/batch');

            $initService = new \app\service\TagInitService(
                new TagDefinitionRepository()
            );

            $initService->initBasicTags();

            LoggerHelper::logBusiness('init_tags', []);

            return ApiResponseHelper::success([
                'message' => '标签初始化完成',
            ]);
        } catch (\Throwable $e) {
            return ApiResponseHelper::exception($e);
        }
    }

    /**
     * 获取标签统计信息
     *
     * GET /api/tags/statistics
     */
    public function statistics(Request $request): Response
    {
        try {
            LoggerHelper::logRequest('GET', '/api/tags/statistics');

            $tagId = $request->get('tag_id');
            $startDate = $request->get('start_date');
            $endDate = $request->get('end_date');

            $userTagRepo = new UserTagRepository();
            $tagDefRepo = new TagDefinitionRepository();

            $result = [
                'value_distribution' => [],
                'trend_data' => [],
                'coverage_stats' => [],
            ];

            // 如果指定了 tag_id，统计该标签的值分布
            if ($tagId) {
                $tagDef = $tagDefRepo->newQuery()->where('tag_id', $tagId)->first();
                if ($tagDef) {
                    // 统计标签值分布
                    $userTags = $userTagRepo->newQuery()
                        ->where('tag_id', $tagId)
                        ->get(['tag_value']);

                    $valueCounts = [];
                    foreach ($userTags as $userTag) {
                        $value = (string)$userTag->tag_value;
                        if (!isset($valueCounts[$value])) {
                            $valueCounts[$value] = 0;
                        }
                        $valueCounts[$value]++;
                    }

                    // 按数量排序
                    arsort($valueCounts);
                    $valueCounts = array_slice($valueCounts, 0, 20, true);

                    foreach ($valueCounts as $value => $count) {
                        $result['value_distribution'][] = [
                            'value' => $value,
                            'count' => $count
                        ];
                    }

                    // 统计标签覆盖度
                    $totalUsers = $userTagRepo->newQuery()
                        ->distinct('user_id')
                        ->count();

                    $taggedUsers = $userTagRepo->newQuery()
                        ->where('tag_id', $tagId)
                        ->distinct('user_id')
                        ->count();

                    $result['coverage_stats'][] = [
                        'tag_id' => $tagId,
                        'tag_name' => $tagDef->tag_name ?? '',
                        'total_users' => $totalUsers,
                        'tagged_users' => $taggedUsers,
                        'coverage_rate' => $totalUsers > 0 ? round($taggedUsers / $totalUsers * 100, 2) : 0
                    ];
                }
            } else {
                // 统计所有标签的覆盖度
                $tagDefs = $tagDefRepo->newQuery()->where('status', 1)->get();
                $totalUsers = $userTagRepo->newQuery()->distinct('user_id')->count();

                foreach ($tagDefs as $tagDef) {
                    $taggedUsers = $userTagRepo->newQuery()
                        ->where('tag_id', $tagDef->tag_id)
                        ->distinct('user_id')
                        ->count();

                    $result['coverage_stats'][] = [
                        'tag_id' => $tagDef->tag_id,
                        'tag_name' => $tagDef->tag_name ?? '',
                        'total_users' => $totalUsers,
                        'tagged_users' => $taggedUsers,
                        'coverage_rate' => $totalUsers > 0 ? round($taggedUsers / $totalUsers * 100, 2) : 0
                    ];
                }
            }

            // 趋势数据（如果有时间范围）
            if ($startDate && $endDate) {
                $historyRepo = new TagHistoryRepository();
                $start = new \DateTime($startDate);
                $end = new \DateTime($endDate);

                // 按日期统计标签变更次数
                $trendData = [];
                $current = clone $start;
                while ($current <= $end) {
                    $dateStr = $current->format('Y-m-d');
                    $nextDay = clone $current;
                    $nextDay->modify('+1 day');

                    $count = $historyRepo->newQuery()
                        ->where('change_time', '>=', $current)
                        ->where('change_time', '<', $nextDay)
                        ->count();

                    $trendData[] = [
                        'date' => $dateStr,
                        'count' => $count
                    ];

                    $current->modify('+1 day');
                }

                $result['trend_data'] = $trendData;
            }

            LoggerHelper::logBusiness('get_tag_statistics', [
                'tag_id' => $tagId,
                'start_date' => $startDate,
                'end_date' => $endDate,
            ]);

            return ApiResponseHelper::success($result);
        } catch (\Throwable $e) {
            return ApiResponseHelper::exception($e);
        }
    }

    /**
     * 获取标签历史记录
     *
     * GET /api/tags/history
     */
    public function history(Request $request): Response
    {
        try {
            LoggerHelper::logRequest('GET', '/api/tags/history');

            $userId = $request->get('user_id');
            $tagId = $request->get('tag_id');
            $startDate = $request->get('start_date');
            $endDate = $request->get('end_date');
            $page = (int)($request->get('page') ?? 1);
            $pageSize = (int)($request->get('page_size') ?? 20);

            if ($page < 1) {
                $page = 1;
            }
            if ($pageSize < 1 || $pageSize > 100) {
                $pageSize = 20;
            }

            $historyRepo = new TagHistoryRepository();
            $tagDefRepo = new TagDefinitionRepository();

            $query = $historyRepo->newQuery();

            if ($userId) {
                $query->where('user_id', $userId);
            }

            if ($tagId) {
                $query->where('tag_id', $tagId);
            }

            if ($startDate) {
                $query->where('change_time', '>=', new \DateTime($startDate));
            }

            if ($endDate) {
                $endDateTime = new \DateTime($endDate);
                $endDateTime->modify('+1 day');
                $query->where('change_time', '<', $endDateTime);
            }

            $total = $query->count();

            $histories = $query->orderBy('change_time', 'desc')
                ->skip(($page - 1) * $pageSize)
                ->take($pageSize)
                ->get();

            $items = [];
            foreach ($histories as $history) {
                $tagDef = $tagDefRepo->newQuery()->where('tag_id', $history->tag_id)->first();

                $items[] = [
                    'user_id' => $history->user_id,
                    'tag_id' => $history->tag_id,
                    'tag_name' => $tagDef ? $tagDef->tag_name : null,
                    'old_value' => $history->old_value,
                    'new_value' => $history->new_value,
                    'change_reason' => $history->change_reason,
                    'change_time' => $history->change_time ? $history->change_time->format('Y-m-d H:i:s') : null,
                    'operator' => $history->operator,
                ];
            }

            LoggerHelper::logBusiness('get_tag_history', [
                'user_id' => $userId,
                'tag_id' => $tagId,
                'total' => $total,
            ]);

            return ApiResponseHelper::success([
                'items' => $items,
                'total' => $total,
                'page' => $page,
                'page_size' => $pageSize,
            ]);
        } catch (\Throwable $e) {
            return ApiResponseHelper::exception($e);
        }
    }

}

