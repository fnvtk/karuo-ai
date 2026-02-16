<?php

namespace app\controller;

use app\repository\UserProfileRepository;
use app\service\UserService;
use app\utils\ApiResponseHelper;
use app\utils\DataMaskingHelper;
use app\utils\LoggerHelper;
use support\Request;
use support\Response;

class UserController
{
    /**
     * 创建用户
     *
     * POST /api/users
     *
     * 请求体示例：
     * {
     *   "id_card": "110101199001011234",
     *   "id_card_type": "身份证",
     *   "name": "张三",
     *   "phone": "13800138000",
     *   "email": "zhangsan@example.com",
     *   "gender": 1,
     *   "birthday": "1990-01-01",
     *   "address": "北京市朝阳区"
     * }
     */
    public function store(Request $request): Response
    {
        try {
            LoggerHelper::logRequest('POST', '/api/users');

            $rawBody = $request->rawBody();
            
            // 调试：记录原始请求体
            if (empty($rawBody)) {
                return ApiResponseHelper::error('请求体为空，请确保 Content-Type 为 application/json 并发送有效的 JSON 数据', 400);
            }

            $body = json_decode($rawBody, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                $errorMsg = '请求体必须是有效的 JSON 格式';
                $jsonError = json_last_error_msg();
                if ($jsonError) {
                    $errorMsg .= ': ' . $jsonError;
                }
                // 开发环境输出更多调试信息
                if (getenv('APP_DEBUG') === 'true') {
                    $errorMsg .= ' (原始请求体: ' . substr($rawBody, 0, 200) . ')';
                }
                return ApiResponseHelper::error($errorMsg, 400);
            }

            $userService = new UserService(new UserProfileRepository());
            $result = $userService->createUser($body);

            return ApiResponseHelper::success($result, '用户创建成功');
        } catch (\InvalidArgumentException $e) {
            return ApiResponseHelper::error($e->getMessage(), 400);
        } catch (\Throwable $e) {
            return ApiResponseHelper::exception($e);
        }
    }

    /**
     * 查询用户信息
     *
     * GET /api/users/{user_id}?decrypt_id_card=1
     *
     * @param Request $request
     * @return Response
     */
    public function show(Request $request): Response
    {
        try {
            // 从请求路径中解析 user_id
            $path = $request->path();
            if (preg_match('#/api/users/([^/]+)#', $path, $matches)) {
                $userId = $matches[1];
            } else {
                $userId = $request->get('user_id');
                if (!$userId) {
                    throw new \InvalidArgumentException('缺少 user_id 参数');
                }
            }

            LoggerHelper::logRequest('GET', $path, ['user_id' => $userId]);

            // 检查是否需要解密身份证（需要权限控制，这里简单用参数控制）
            $decryptIdCard = (bool)$request->get('decrypt_id_card', false);

            $userService = new UserService(new UserProfileRepository());
            $user = $userService->getUserById($userId, $decryptIdCard);

            if (!$user) {
                return ApiResponseHelper::error('用户不存在', 404, 404);
            }

            // 如果不需要解密身份证，对敏感字段进行脱敏
            if (!$decryptIdCard) {
                $user = DataMaskingHelper::maskArray($user, ['phone', 'email']);
            }

            LoggerHelper::logBusiness('get_user_info', [
                'user_id' => $userId,
                'decrypt_id_card' => $decryptIdCard,
            ]);

            return ApiResponseHelper::success($user);
        } catch (\InvalidArgumentException $e) {
            return ApiResponseHelper::error($e->getMessage(), 400);
        } catch (\Throwable $e) {
            return ApiResponseHelper::exception($e);
        }
    }

    /**
     * 更新用户信息
     *
     * PUT /api/users/{user_id}
     *
     * 请求体示例：
     * {
     *   "name": "张三",
     *   "phone": "13800138000",
     *   "email": "zhangsan@example.com",
     *   "gender": 1,
     *   "birthday": "1990-01-01",
     *   "address": "北京市朝阳区",
     *   "status": 0
     * }
     */
    public function update(Request $request): Response
    {
        try {
            // 从请求路径中解析 user_id
            $path = $request->path();
            if (preg_match('#/api/users/([^/]+)#', $path, $matches)) {
                $userId = $matches[1];
            } else {
                $userId = $request->get('user_id');
                if (!$userId) {
                    throw new \InvalidArgumentException('缺少 user_id 参数');
                }
            }

            LoggerHelper::logRequest('PUT', $path, ['user_id' => $userId]);

            $rawBody = $request->rawBody();
            
            // 调试：记录原始请求体
            if (empty($rawBody)) {
                return ApiResponseHelper::error('请求体为空，请确保 Content-Type 为 application/json 并发送有效的 JSON 数据', 400);
            }

            $body = json_decode($rawBody, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                $errorMsg = '请求体必须是有效的 JSON 格式';
                $jsonError = json_last_error_msg();
                if ($jsonError) {
                    $errorMsg .= ': ' . $jsonError;
                }
                // 开发环境输出更多调试信息
                if (getenv('APP_DEBUG') === 'true') {
                    $errorMsg .= ' (原始请求体: ' . substr($rawBody, 0, 200) . ')';
                }
                return ApiResponseHelper::error($errorMsg, 400);
            }

            if (empty($body)) {
                return ApiResponseHelper::error('请求体不能为空', 400);
            }

            $userService = new UserService(new UserProfileRepository());
            $result = $userService->updateUser($userId, $body);

            // 脱敏处理
            $result = DataMaskingHelper::maskArray($result, ['phone', 'email']);

            return ApiResponseHelper::success($result, '用户更新成功');
        } catch (\InvalidArgumentException $e) {
            return ApiResponseHelper::error($e->getMessage(), 400);
        } catch (\Throwable $e) {
            return ApiResponseHelper::exception($e);
        }
    }

    /**
     * 解密身份证号
     *
     * GET /api/users/{user_id}/decrypt-id-card
     */
    public function decryptIdCard(Request $request): Response
    {
        try {
            // 从请求路径中解析 user_id
            $path = $request->path();
            if (preg_match('#/api/users/([^/]+)/decrypt-id-card#', $path, $matches)) {
                $userId = $matches[1];
            } else {
                $userId = $request->get('user_id');
                if (!$userId) {
                    throw new \InvalidArgumentException('缺少 user_id 参数');
                }
            }

            LoggerHelper::logRequest('GET', $path, ['user_id' => $userId]);

            $userService = new UserService(new UserProfileRepository());
            $user = $userService->getUserById($userId, true); // 强制解密

            if (!$user) {
                return ApiResponseHelper::error('用户不存在', 404, 404);
            }

            LoggerHelper::logBusiness('decrypt_id_card', [
                'user_id' => $userId,
            ]);

            return ApiResponseHelper::success([
                'user_id' => $user['user_id'],
                'id_card' => $user['id_card'] ?? ''
            ]);
        } catch (\InvalidArgumentException $e) {
            return ApiResponseHelper::error($e->getMessage(), 400);
        } catch (\Throwable $e) {
            return ApiResponseHelper::exception($e);
        }
    }

    /**
     * 删除用户（软删除）
     *
     * DELETE /api/users/{user_id}
     */
    public function destroy(Request $request): Response
    {
        try {
            // 从请求路径中解析 user_id
            $path = $request->path();
            if (preg_match('#/api/users/([^/]+)#', $path, $matches)) {
                $userId = $matches[1];
            } else {
                $userId = $request->get('user_id');
                if (!$userId) {
                    throw new \InvalidArgumentException('缺少 user_id 参数');
                }
            }

            LoggerHelper::logRequest('DELETE', $path, ['user_id' => $userId]);

            $userService = new UserService(new UserProfileRepository());
            $userService->deleteUser($userId);

            return ApiResponseHelper::success(null, '用户删除成功');
        } catch (\InvalidArgumentException $e) {
            return ApiResponseHelper::error($e->getMessage(), 400);
        } catch (\Throwable $e) {
            return ApiResponseHelper::exception($e);
        }
    }

    /**
     * 搜索用户（支持多种搜索条件组合）
     *
     * POST /api/users/search
     *
     * 支持以下搜索方式：
     * 1. 基础字段搜索：姓名、手机号、邮箱、身份证号等
     * 2. 标签筛选：根据用户标签筛选
     * 3. 组合搜索：基础字段 + 标签筛选
     *
     * 请求体示例1（姓名模糊搜索）：
     * {
     *   "name": "张三",
     *   "page": 1,
     *   "page_size": 20
     * }
     *
     * 请求体示例2（组合搜索：姓名 + 手机号）：
     * {
     *   "name": "张",
     *   "phone": "138",
     *   "page": 1,
     *   "page_size": 20
     * }
     *
     * 请求体示例3（根据标签筛选）：
     * {
     *   "tag_conditions": [
     *     {
     *       "tag_code": "high_consumer",
     *       "operator": "=",
     *       "value": "high"
     *     }
     *   ],
     *   "logic": "AND",
     *   "page": 1,
     *   "page_size": 20
     * }
     *
     * 请求体示例4（组合搜索：基础字段 + 标签）：
     * {
     *   "name": "张",
     *   "min_total_amount": 1000,
     *   "tag_conditions": [
     *     {
     *       "tag_code": "active_user",
     *       "operator": "=",
     *       "value": "active"
     *     }
     *   ],
     *   "page": 1,
     *   "page_size": 20
     * }
     */
    public function search(Request $request): Response
    {
        try {
            LoggerHelper::logRequest('POST', '/api/users/search');

            $rawBody = $request->rawBody();
            
            // 调试：记录原始请求体
            if (empty($rawBody)) {
                return ApiResponseHelper::error('请求体为空，请确保 Content-Type 为 application/json 并发送有效的 JSON 数据', 400);
            }

            $body = json_decode($rawBody, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                $errorMsg = '请求体必须是有效的 JSON 格式';
                $jsonError = json_last_error_msg();
                if ($jsonError) {
                    $errorMsg .= ': ' . $jsonError;
                }
                // 开发环境输出更多调试信息
                if (getenv('APP_DEBUG') === 'true') {
                    $errorMsg .= ' (原始请求体: ' . substr($rawBody, 0, 200) . ')';
                }
                return ApiResponseHelper::error($errorMsg, 400);
            }

            $page = (int)($body['page'] ?? 1);
            $pageSize = (int)($body['page_size'] ?? 20);

            if ($page < 1) {
                $page = 1;
            }
            if ($pageSize < 1 || $pageSize > 100) {
                $pageSize = 20;
            }

            $userService = new UserService(new UserProfileRepository());

            // 情况1：仅根据身份证号查找（返回单个用户，不分页）
            if (!empty($body['id_card']) && empty($body['tag_conditions']) && empty($body['name']) && empty($body['phone']) && empty($body['email'])) {
                $user = $userService->findUserByIdCard($body['id_card']);
                
                if (!$user) {
                    return ApiResponseHelper::error('未找到该身份证号对应的用户', 404, 404);
                }

                // 脱敏处理
                $user = DataMaskingHelper::maskArray($user, ['phone', 'email']);

                LoggerHelper::logBusiness('search_user_by_id_card', [
                    'found' => true,
                ]);

                return ApiResponseHelper::success($user);
            }

            // 情况2：根据标签筛选用户（可能结合基础字段搜索）
            if (!empty($body['tag_conditions'])) {
                $tagService = new \app\service\TagService(
                    new \app\repository\TagDefinitionRepository(),
                    new UserProfileRepository(),
                    new \app\repository\UserTagRepository(),
                    new \app\repository\TagHistoryRepository(),
                    new \app\service\TagRuleEngine\SimpleRuleEngine()
                );

                $conditions = $body['tag_conditions'];
                $logic = $body['logic'] ?? 'AND';
                $includeUserInfo = true; // 标签筛选需要用户信息

                // 验证条件格式
                foreach ($conditions as $condition) {
                    if (!isset($condition['tag_code']) || !isset($condition['operator']) || !isset($condition['value'])) {
                        throw new \InvalidArgumentException('每个条件必须包含 tag_code、operator 和 value 字段');
                    }
                }

                // 先根据标签筛选用户
                $tagResult = $tagService->filterUsersByTags(
                    $conditions,
                    $logic,
                    1, // 先获取所有符合条件的用户ID
                    10000, // 临时设置大值，获取所有用户ID
                    true
                );

                $userIds = array_column($tagResult['users'], 'user_id');

                if (empty($userIds)) {
                    return ApiResponseHelper::success([
                        'users' => [],
                        'total' => 0,
                        'page' => $page,
                        'page_size' => $pageSize,
                        'total_pages' => 0,
                    ]);
                }

                // 如果有基础字段搜索条件，进一步筛选
                $baseConditions = [];
                if (!empty($body['name'])) {
                    $baseConditions['name'] = $body['name'];
                }
                if (!empty($body['phone'])) {
                    $baseConditions['phone'] = $body['phone'];
                    $baseConditions['phone_exact'] = $body['phone_exact'] ?? false;
                }
                if (!empty($body['email'])) {
                    $baseConditions['email'] = $body['email'];
                    $baseConditions['email_exact'] = $body['email_exact'] ?? false;
                }
                if (isset($body['gender']) && $body['gender'] !== '') {
                    $baseConditions['gender'] = $body['gender'];
                }
                if (isset($body['status']) && $body['status'] !== '') {
                    $baseConditions['status'] = $body['status'];
                }
                if (isset($body['min_total_amount'])) {
                    $baseConditions['min_total_amount'] = $body['min_total_amount'];
                }
                if (isset($body['max_total_amount'])) {
                    $baseConditions['max_total_amount'] = $body['max_total_amount'];
                }
                if (isset($body['min_total_count'])) {
                    $baseConditions['min_total_count'] = $body['min_total_count'];
                }
                if (isset($body['max_total_count'])) {
                    $baseConditions['max_total_count'] = $body['max_total_count'];
                }

                // 如果有基础字段条件，需要进一步筛选
                if (!empty($baseConditions)) {
                    $baseConditions['user_ids'] = $userIds; // 限制在标签筛选的用户范围内
                    $result = $userService->searchUsers($baseConditions, $page, $pageSize);
                } else {
                    // 没有基础字段条件，直接使用标签筛选结果并分页
                    $total = count($userIds);
                    $offset = ($page - 1) * $pageSize;
                    $pagedUserIds = array_slice($userIds, $offset, $pageSize);

                    // 获取用户详细信息
                    $users = [];
                    foreach ($pagedUserIds as $userId) {
                        $user = $userService->getUserById($userId, false);
                        if ($user) {
                            $users[] = $user;
                        }
                    }

                    $result = [
                        'users' => $users,
                        'total' => $total,
                        'page' => $page,
                        'page_size' => $pageSize,
                        'total_pages' => (int)ceil($total / $pageSize),
                    ];
                }

                // 对返回的用户信息进行脱敏处理
                if (isset($result['users']) && is_array($result['users'])) {
                    foreach ($result['users'] as &$user) {
                        $user = DataMaskingHelper::maskArray($user, ['phone', 'email']);
                    }
                    unset($user);
                }

                LoggerHelper::logBusiness('search_users_by_tags', [
                    'conditions_count' => count($conditions),
                    'base_conditions' => !empty($baseConditions),
                    'result_count' => $result['total'] ?? 0,
                ]);

                return ApiResponseHelper::success($result);
            }

            // 情况3：仅基础字段搜索（无标签条件）
            $baseConditions = [];
            if (!empty($body['name'])) {
                $baseConditions['name'] = $body['name'];
            }
            if (!empty($body['phone'])) {
                $baseConditions['phone'] = $body['phone'];
                $baseConditions['phone_exact'] = $body['phone_exact'] ?? false;
            }
            if (!empty($body['email'])) {
                $baseConditions['email'] = $body['email'];
                $baseConditions['email_exact'] = $body['email_exact'] ?? false;
            }
            if (!empty($body['id_card'])) {
                $baseConditions['id_card'] = $body['id_card'];
            }
            if (isset($body['gender']) && $body['gender'] !== '') {
                $baseConditions['gender'] = $body['gender'];
            }
            if (isset($body['status']) && $body['status'] !== '') {
                $baseConditions['status'] = $body['status'];
            }
            if (isset($body['min_total_amount'])) {
                $baseConditions['min_total_amount'] = $body['min_total_amount'];
            }
            if (isset($body['max_total_amount'])) {
                $baseConditions['max_total_amount'] = $body['max_total_amount'];
            }
            if (isset($body['min_total_count'])) {
                $baseConditions['min_total_count'] = $body['min_total_count'];
            }
            if (isset($body['max_total_count'])) {
                $baseConditions['max_total_count'] = $body['max_total_count'];
            }

            if (empty($baseConditions)) {
                return ApiResponseHelper::error('请提供至少一个搜索条件', 400);
            }

            $result = $userService->searchUsers($baseConditions, $page, $pageSize);

            // 对返回的用户信息进行脱敏处理
            if (isset($result['users']) && is_array($result['users'])) {
                foreach ($result['users'] as &$user) {
                    $user = DataMaskingHelper::maskArray($user, ['phone', 'email']);
                }
                unset($user);
            }

            LoggerHelper::logBusiness('search_users_by_base_fields', [
                'conditions' => array_keys($baseConditions),
                'result_count' => $result['total'] ?? 0,
            ]);

            return ApiResponseHelper::success($result);
        } catch (\InvalidArgumentException $e) {
            return ApiResponseHelper::error($e->getMessage(), 400);
        } catch (\Throwable $e) {
            return ApiResponseHelper::exception($e);
        }
    }
}
