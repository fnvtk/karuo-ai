<?php

namespace app\service;

use app\repository\TagDefinitionRepository;
use app\repository\UserProfileRepository;
use app\repository\UserTagRepository;
use app\repository\TagHistoryRepository;
use app\service\TagRuleEngine\SimpleRuleEngine;
use app\utils\LoggerHelper;
use Ramsey\Uuid\Uuid as UuidGenerator;

/**
 * 标签服务
 *
 * 职责：
 * - 根据用户数据计算标签值
 * - 更新用户标签
 * - 记录标签变更历史
 */
class TagService
{
    public function __construct(
        protected TagDefinitionRepository $tagDefinitionRepository,
        protected UserProfileRepository $userProfileRepository,
        protected UserTagRepository $userTagRepository,
        protected TagHistoryRepository $tagHistoryRepository,
        protected SimpleRuleEngine $ruleEngine
    ) {
    }

    /**
     * 为指定用户计算并更新标签
     *
     * @param string $userId 用户ID
     * @param array<string>|null $tagIds 要计算的标签ID列表（null 表示计算所有启用且更新频率为 real_time 的标签）
     * @return array<string, mixed> 返回更新的标签信息
     */
    public function calculateTags(string $userId, ?array $tagIds = null): array
    {
        // 获取用户数据
        $user = $this->userProfileRepository->findByUserId($userId);
        if (!$user) {
            throw new \InvalidArgumentException("用户不存在: {$userId}");
        }

        // 准备用户数据（用于规则引擎计算）
        $userData = [
            'total_amount' => (float)($user->total_amount ?? 0),
            'total_count' => (int)($user->total_count ?? 0),
            'last_consume_time' => $user->last_consume_time ? $user->last_consume_time->getTimestamp() : 0,
        ];

        // 获取要计算的标签定义
        $tagDefinitions = $this->getTagDefinitions($tagIds);

        $updatedTags = [];
        $now = new \DateTimeImmutable('now');

        foreach ($tagDefinitions as $tagDef) {
            try {
                // 解析规则配置
                $ruleConfig = is_string($tagDef->rule_config) 
                    ? json_decode($tagDef->rule_config, true) 
                    : $tagDef->rule_config;

                if (!$ruleConfig) {
                    continue;
                }

                // 根据规则类型选择计算引擎
                if ($ruleConfig['rule_type'] === 'simple') {
                    $result = $this->ruleEngine->calculate($ruleConfig, $userData);
                } else {
                    // 其他规则类型（pipeline/custom）暂不支持
                    continue;
                }

                // 获取旧标签值（用于历史记录）
                $oldTag = $this->userTagRepository->newQuery()
                    ->where('user_id', $userId)
                    ->where('tag_id', $tagDef->tag_id)
                    ->first();

                $oldValue = $oldTag ? $oldTag->tag_value : null;

                // 更新或创建标签
                if ($oldTag) {
                    $oldTag->tag_value = $this->formatTagValue($result['value']);
                    $oldTag->tag_value_type = $this->getTagValueType($result['value']);
                    $oldTag->confidence = $result['confidence'];
                    $oldTag->update_time = $now;
                    $oldTag->save();
                    $userTag = $oldTag;
                } else {
                    $userTag = new UserTagRepository();
                    $userTag->user_id = $userId;
                    $userTag->tag_id = $tagDef->tag_id;
                    $userTag->tag_value = $this->formatTagValue($result['value']);
                    $userTag->tag_value_type = $this->getTagValueType($result['value']);
                    $userTag->confidence = $result['confidence'];
                    $userTag->effective_time = $now;
                    $userTag->create_time = $now;
                    $userTag->update_time = $now;
                    $userTag->save();
                }

                // 记录标签变更历史（仅当值发生变化时）
                if ($oldValue !== $userTag->tag_value) {
                    $this->recordTagHistory($userId, $tagDef->tag_id, $oldValue, $userTag->tag_value, $now);
                }

                $updatedTags[] = [
                    'tag_id' => $tagDef->tag_id,
                    'tag_code' => $tagDef->tag_code,
                    'tag_name' => $tagDef->tag_name,
                    'value' => $userTag->tag_value,
                    'confidence' => $userTag->confidence,
                ];

                // 记录标签计算日志
                LoggerHelper::logTagCalculation($userId, $tagDef->tag_id, [
                    'tag_code' => $tagDef->tag_code,
                    'value' => $userTag->tag_value,
                    'confidence' => $userTag->confidence,
                ]);
            } catch (\Throwable $e) {
                // 记录错误但继续处理其他标签
                LoggerHelper::logError($e, [
                    'user_id' => $userId,
                    'tag_id' => $tagDef->tag_id ?? null,
                    'tag_code' => $tagDef->tag_code ?? null,
                ]);
            }
        }

        // 更新用户的标签更新时间
        $user->tags_update_time = $now;
        $user->save();

        return $updatedTags;
    }

    /**
     * 获取标签定义列表
     *
     * @param array<string>|null $tagIds
     * @return \Illuminate\Database\Eloquent\Collection
     */
    private function getTagDefinitions(?array $tagIds = null)
    {
        $query = $this->tagDefinitionRepository->newQuery()
            ->where('status', 0); // 只获取启用的标签

        if ($tagIds !== null) {
            $query->whereIn('tag_id', $tagIds);
        } else {
            // 默认只计算实时更新的标签
            $query->where('update_frequency', 'real_time');
        }

        return $query->get();
    }

    /**
     * 格式化标签值
     *
     * @param mixed $value
     * @return string
     */
    private function formatTagValue($value): string
    {
        if (is_bool($value)) {
            return $value ? 'true' : 'false';
        }
        if (is_array($value) || is_object($value)) {
            return json_encode($value);
        }
        return (string)$value;
    }

    /**
     * 获取标签值类型
     *
     * @param mixed $value
     * @return string
     */
    private function getTagValueType($value): string
    {
        if (is_bool($value)) {
            return 'boolean';
        }
        if (is_int($value) || is_float($value)) {
            return 'number';
        }
        if (is_array($value) || is_object($value)) {
            return 'json';
        }
        return 'string';
    }

    /**
     * 记录标签变更历史
     *
     * @param string $userId
     * @param string $tagId
     * @param mixed $oldValue
     * @param string $newValue
     * @param \DateTimeInterface $changeTime
     */
    private function recordTagHistory(string $userId, string $tagId, $oldValue, string $newValue, \DateTimeInterface $changeTime): void
    {
        $history = new TagHistoryRepository();
        $history->history_id = UuidGenerator::uuid4()->toString();
        $history->user_id = $userId;
        $history->tag_id = $tagId;
        $history->old_value = $oldValue !== null ? (string)$oldValue : null;
        $history->new_value = $newValue;
        $history->change_reason = 'auto_calculate';
        $history->change_time = $changeTime;
        $history->operator = 'system';
        $history->save();
    }

    /**
     * 根据标签筛选用户
     *
     * @param array<string, mixed> $conditions 查询条件数组，每个条件包含：
     *   - tag_code: 标签编码（必填）
     *   - operator: 操作符（=, !=, >, >=, <, <=, in, not_in）（必填）
     *   - value: 标签值（必填）
     * @param string $logic 多个条件之间的逻辑关系：AND 或 OR（默认 AND）
     * @param int $page 页码（从1开始）
     * @param int $pageSize 每页数量
     * @param bool $includeUserInfo 是否包含用户基本信息
     * @return array<string, mixed> 返回符合条件的用户列表
     */
    public function filterUsersByTags(
        array $conditions,
        string $logic = 'AND',
        int $page = 1,
        int $pageSize = 20,
        bool $includeUserInfo = false
    ): array {
        if (empty($conditions)) {
            return [
                'users' => [],
                'total' => 0,
                'page' => $page,
                'page_size' => $pageSize,
            ];
        }

        // 1. 根据 tag_code 获取 tag_id 列表
        $tagCodes = array_column($conditions, 'tag_code');
        $tagDefinitions = $this->tagDefinitionRepository->newQuery()
            ->whereIn('tag_code', $tagCodes)
            ->get()
            ->keyBy('tag_code');

        $tagIdMap = [];
        foreach ($tagDefinitions as $tagDef) {
            $tagIdMap[$tagDef->tag_code] = $tagDef->tag_id;
        }

        // 验证所有 tag_code 都存在
        $missingTags = array_diff($tagCodes, array_keys($tagIdMap));
        if (!empty($missingTags)) {
            throw new \InvalidArgumentException('标签编码不存在: ' . implode(', ', $missingTags));
        }

        // 2. 根据逻辑类型处理查询
        if (strtoupper($logic) === 'OR') {
            // OR 逻辑：使用 orWhere，查询满足任一条件的用户
            $query = $this->userTagRepository->newQuery();
            $query->where(function ($q) use ($conditions, $tagIdMap) {
                $first = true;
                foreach ($conditions as $condition) {
                    $tagId = $tagIdMap[$condition['tag_code']];
                    $operator = $condition['operator'] ?? '=';
                    $value = $condition['value'];
                    $formattedValue = $this->formatTagValue($value);

                    if ($first) {
                        $this->applyTagCondition($q, $tagId, $operator, $formattedValue, $value);
                        $first = false;
                    } else {
                        $q->orWhere(function ($subQ) use ($tagId, $operator, $formattedValue, $value) {
                            $this->applyTagCondition($subQ, $tagId, $operator, $formattedValue, $value);
                        });
                    }
                }
            });

            // 分页查询
            $total = $query->count();
            $userTags = $query->skip(($page - 1) * $pageSize)
                ->take($pageSize)
                ->get();

            // 提取 user_id 列表
            $userIds = $userTags->pluck('user_id')->unique()->toArray();
        } else {
            // AND 逻辑：所有条件都必须满足
            // 由于每个标签是独立的记录，需要分别查询每个条件，然后取交集
            $userIdsSets = [];
            foreach ($conditions as $condition) {
                $tagId = $tagIdMap[$condition['tag_code']];
                $tagDef = $tagDefinitions->get($condition['tag_code']);
                $operator = $condition['operator'] ?? '=';
                $value = $condition['value'];
                $formattedValue = $this->formatTagValue($value);

                // 为每个条件单独查询满足条件的 user_id（先从标签表查询）
                $subQuery = $this->userTagRepository->newQuery();
                $this->applyTagCondition($subQuery, $tagId, $operator, $formattedValue, $value);
                $tagUserIds = $subQuery->pluck('user_id')->unique()->toArray();

                // 如果标签表中没有符合条件的记录，且标签定义中有规则，则基于规则从用户档案表筛选
                // 这样可以处理用户还没有计算标签的情况
                if ($tagDef && $tagDef->rule_type === 'simple') {
                    $ruleConfig = is_string($tagDef->rule_config) 
                        ? json_decode($tagDef->rule_config, true) 
                        : $tagDef->rule_config;
                    
                    if ($ruleConfig && isset($ruleConfig['tag_value']) && $ruleConfig['tag_value'] === $value) {
                        // 基于规则从用户档案表筛选
                        $profileQuery = $this->userProfileRepository->newQuery();
                        $this->applyRuleToProfileQuery($profileQuery, $ruleConfig);
                        $profileUserIds = $profileQuery->pluck('user_id')->unique()->toArray();
                        
                        // 合并标签表和用户档案表的查询结果（去重）
                        $tagUserIds = array_unique(array_merge($tagUserIds, $profileUserIds));
                    }
                }

                $userIdsSets[] = $tagUserIds;
            }

            // 取交集：所有条件都满足的用户ID
            if (empty($userIdsSets)) {
                $userIds = [];
            } else {
                $userIds = $userIdsSets[0];
                for ($i = 1; $i < count($userIdsSets); $i++) {
                    $userIds = array_intersect($userIds, $userIdsSets[$i]);
                }
            }

            // 如果没有满足所有条件的用户，直接返回空结果
            if (empty($userIds)) {
                return [
                    'users' => [],
                    'total' => 0,
                    'page' => $page,
                    'page_size' => $pageSize,
                    'total_pages' => 0,
                ];
            }

            // 分页处理
            $total = count($userIds);
            $offset = ($page - 1) * $pageSize;
            $userIds = array_slice($userIds, $offset, $pageSize);
        }

        // 5. 如果需要用户信息，则关联查询
        $users = [];
        if ($includeUserInfo && !empty($userIds)) {
            $userProfiles = $this->userProfileRepository->newQuery()
                ->whereIn('user_id', $userIds)
                ->get()
                ->keyBy('user_id');

            foreach ($userIds as $userId) {
                $userProfile = $userProfiles->get($userId);
                if ($userProfile) {
                    $users[] = [
                        'user_id' => $userId,
                        'name' => $userProfile->name ?? null,
                        'phone' => $userProfile->phone ?? null,
                        'total_amount' => $userProfile->total_amount ?? 0,
                        'total_count' => $userProfile->total_count ?? 0,
                        'last_consume_time' => $userProfile->last_consume_time ?? null,
                    ];
                } else {
                    $users[] = [
                        'user_id' => $userId,
                    ];
                }
            }
        } else {
            foreach ($userIds as $userId) {
                $users[] = ['user_id' => $userId];
            }
        }

        return [
            'users' => $users,
            'total' => $total,
            'page' => $page,
            'page_size' => $pageSize,
            'total_pages' => (int)ceil($total / $pageSize),
        ];
    }

    /**
     * 应用标签查询条件到查询构建器
     *
     * @param \Illuminate\Database\Eloquent\Builder $query 查询构建器
     * @param string $tagId 标签ID
     * @param string $operator 操作符
     * @param string $formattedValue 格式化后的标签值
     * @param mixed $originalValue 原始标签值（用于 in/not_in）
     */
    private function applyTagCondition($query, string $tagId, string $operator, string $formattedValue, $originalValue): void
    {
        $query->where('tag_id', $tagId);

        switch ($operator) {
            case '=':
            case '==':
                $query->where('tag_value', $formattedValue);
                break;
            case '!=':
            case '<>':
                $query->where('tag_value', '!=', $formattedValue);
                break;
            case '>':
                $query->where('tag_value', '>', $formattedValue);
                break;
            case '>=':
                $query->where('tag_value', '>=', $formattedValue);
                break;
            case '<':
                $query->where('tag_value', '<', $formattedValue);
                break;
            case '<=':
                $query->where('tag_value', '<=', $formattedValue);
                break;
            case 'in':
                if (!is_array($originalValue)) {
                    throw new \InvalidArgumentException('in 操作符的值必须是数组');
                }
                $query->whereIn('tag_value', array_map([$this, 'formatTagValue'], $originalValue));
                break;
            case 'not_in':
                if (!is_array($originalValue)) {
                    throw new \InvalidArgumentException('not_in 操作符的值必须是数组');
                }
                $query->whereNotIn('tag_value', array_map([$this, 'formatTagValue'], $originalValue));
                break;
            default:
                throw new \InvalidArgumentException("不支持的操作符: {$operator}");
        }
    }

    /**
     * 将标签规则应用到用户档案查询
     *
     * @param \Illuminate\Database\Eloquent\Builder $query 查询构建器
     * @param array<string, mixed> $ruleConfig 规则配置
     */
    private function applyRuleToProfileQuery($query, array $ruleConfig): void
    {
        if (!isset($ruleConfig['conditions']) || !is_array($ruleConfig['conditions'])) {
            return;
        }

        foreach ($ruleConfig['conditions'] as $condition) {
            if (!isset($condition['field']) || !isset($condition['operator']) || !isset($condition['value'])) {
                continue;
            }

            $field = $condition['field'];
            $operator = $condition['operator'];
            $value = $condition['value'];

            // 将规则条件转换为用户档案表的查询条件
            switch ($operator) {
                case '>':
                    $query->where($field, '>', $value);
                    break;
                case '>=':
                    $query->where($field, '>=', $value);
                    break;
                case '<':
                    $query->where($field, '<', $value);
                    break;
                case '<=':
                    $query->where($field, '<=', $value);
                    break;
                case '=':
                case '==':
                    $query->where($field, $value);
                    break;
                case '!=':
                case '<>':
                    $query->where($field, '!=', $value);
                    break;
                case 'in':
                    if (is_array($value)) {
                        $query->whereIn($field, $value);
                    }
                    break;
                case 'not_in':
                    if (is_array($value)) {
                        $query->whereNotIn($field, $value);
                    }
                    break;
            }
        }

        // 只查询未删除的用户
        $query->where('status', 0);
    }

    /**
     * 获取指定用户的标签列表
     *
     * @param string $userId
     * @return array<int, array<string, mixed>>
     */
    public function getUserTags(string $userId): array
    {
        $userTags = $this->userTagRepository->newQuery()
            ->where('user_id', $userId)
            ->get();

        $result = [];
        foreach ($userTags as $userTag) {
            $tagDef = $this->tagDefinitionRepository->newQuery()
                ->where('tag_id', $userTag->tag_id)
                ->first();

            $result[] = [
                'tag_id'           => $userTag->tag_id,
                'tag_code'         => $tagDef ? $tagDef->tag_code : null,
                'tag_name'         => $tagDef ? $tagDef->tag_name : null,
                'category'         => $tagDef ? $tagDef->category : null,
                'tag_value'        => $userTag->tag_value,
                'tag_value_type'   => $userTag->tag_value_type,
                'confidence'       => $userTag->confidence,
                'effective_time'   => $userTag->effective_time,
                'expire_time'      => $userTag->expire_time,
                'update_time'      => $userTag->update_time,
            ];
        }
        return $result;
    }

    /**
     * 删除用户的指定标签
     *
     * @param string $userId 用户ID
     * @param string $tagId 标签ID
     * @return bool 是否删除成功
     */
    public function deleteUserTag(string $userId, string $tagId): bool
    {
        $userTag = $this->userTagRepository->newQuery()
            ->where('user_id', $userId)
            ->where('tag_id', $tagId)
            ->first();

        if (!$userTag) {
            return false;
        }

        $oldValue = $userTag->tag_value;
        
        // 删除标签
        $userTag->delete();

        // 记录历史
        $now = new \DateTimeImmutable('now');
        $this->recordTagHistory($userId, $tagId, $oldValue, null, $now, 'tag_deleted');

        LoggerHelper::logBusiness('tag_deleted', [
            'user_id' => $userId,
            'tag_id' => $tagId,
        ]);

        return true;
    }
}

