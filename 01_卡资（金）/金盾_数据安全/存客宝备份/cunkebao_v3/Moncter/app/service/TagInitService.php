<?php

namespace app\service;

use app\repository\TagDefinitionRepository;
use Ramsey\Uuid\Uuid as UuidGenerator;

/**
 * 标签初始化服务
 *
 * 用于预置初始标签定义
 */
class TagInitService
{
    public function __construct(
        protected TagDefinitionRepository $tagDefinitionRepository
    ) {
    }

    /**
     * 初始化基础标签定义
     *
     * 创建几个简单的标签示例，用于测试标签计算引擎
     */
    public function initBasicTags(): void
    {
        $now = new \DateTimeImmutable('now');

        // 标签1：高消费用户（总消费金额 >= 5000）
        $this->createTagIfNotExists([
            'tag_id' => UuidGenerator::uuid4()->toString(),
            'tag_code' => 'high_consumer',
            'tag_name' => '高消费用户',
            'category' => '消费能力',
            'rule_type' => 'simple',
            'rule_config' => [
                'rule_type' => 'simple',
                'conditions' => [
                    [
                        'field' => 'total_amount',
                        'operator' => '>=',
                        'value' => 5000,
                    ],
                ],
                'tag_value' => 'high',
                'confidence' => 1.0,
            ],
            'update_frequency' => 'real_time',
            'priority' => 1,
            'description' => '总消费金额大于等于5000的用户',
            'status' => 0,
            'version' => 1,
            'create_time' => $now,
            'update_time' => $now,
        ]);

        // 标签2：活跃用户（消费次数 >= 10）
        $this->createTagIfNotExists([
            'tag_id' => UuidGenerator::uuid4()->toString(),
            'tag_code' => 'active_user',
            'tag_name' => '活跃用户',
            'category' => '活跃度',
            'rule_type' => 'simple',
            'rule_config' => [
                'rule_type' => 'simple',
                'conditions' => [
                    [
                        'field' => 'total_count',
                        'operator' => '>=',
                        'value' => 10,
                    ],
                ],
                'tag_value' => 'active',
                'confidence' => 1.0,
            ],
            'update_frequency' => 'real_time',
            'priority' => 2,
            'description' => '消费次数大于等于10次的用户',
            'status' => 0,
            'version' => 1,
            'create_time' => $now,
            'update_time' => $now,
        ]);

        // 标签3：中消费用户（总消费金额 >= 1000 且 < 5000）
        $this->createTagIfNotExists([
            'tag_id' => UuidGenerator::uuid4()->toString(),
            'tag_code' => 'medium_consumer',
            'tag_name' => '中消费用户',
            'category' => '消费能力',
            'rule_type' => 'simple',
            'rule_config' => [
                'rule_type' => 'simple',
                'conditions' => [
                    [
                        'field' => 'total_amount',
                        'operator' => '>=',
                        'value' => 1000,
                    ],
                    [
                        'field' => 'total_amount',
                        'operator' => '<',
                        'value' => 5000,
                    ],
                ],
                'tag_value' => 'medium',
                'confidence' => 1.0,
            ],
            'update_frequency' => 'real_time',
            'priority' => 3,
            'description' => '总消费金额在1000-5000之间的用户',
            'status' => 0,
            'version' => 1,
            'create_time' => $now,
            'update_time' => $now,
        ]);

        // 标签4：低消费用户（总消费金额 < 1000）
        $this->createTagIfNotExists([
            'tag_id' => UuidGenerator::uuid4()->toString(),
            'tag_code' => 'low_consumer',
            'tag_name' => '低消费用户',
            'category' => '消费能力',
            'rule_type' => 'simple',
            'rule_config' => [
                'rule_type' => 'simple',
                'conditions' => [
                    [
                        'field' => 'total_amount',
                        'operator' => '<',
                        'value' => 1000,
                    ],
                ],
                'tag_value' => 'low',
                'confidence' => 1.0,
            ],
            'update_frequency' => 'real_time',
            'priority' => 4,
            'description' => '总消费金额小于1000的用户',
            'status' => 0,
            'version' => 1,
            'create_time' => $now,
            'update_time' => $now,
        ]);

        // 标签5：新用户（消费次数 < 3）
        $this->createTagIfNotExists([
            'tag_id' => UuidGenerator::uuid4()->toString(),
            'tag_code' => 'new_user',
            'tag_name' => '新用户',
            'category' => '活跃度',
            'rule_type' => 'simple',
            'rule_config' => [
                'rule_type' => 'simple',
                'conditions' => [
                    [
                        'field' => 'total_count',
                        'operator' => '<',
                        'value' => 3,
                    ],
                ],
                'tag_value' => 'new',
                'confidence' => 1.0,
            ],
            'update_frequency' => 'real_time',
            'priority' => 5,
            'description' => '消费次数小于3次的用户',
            'status' => 0,
            'version' => 1,
            'create_time' => $now,
            'update_time' => $now,
        ]);

        // 标签6：沉睡用户（最后消费时间超过90天）
        $this->createTagIfNotExists([
            'tag_id' => UuidGenerator::uuid4()->toString(),
            'tag_code' => 'dormant_user',
            'tag_name' => '沉睡用户',
            'category' => '活跃度',
            'rule_type' => 'simple',
            'rule_config' => [
                'rule_type' => 'simple',
                'conditions' => [
                    [
                        'field' => 'last_consume_time',
                        'operator' => '<',
                        'value' => time() - 90 * 24 * 3600, // 90天前的时间戳
                    ],
                ],
                'tag_value' => 'dormant',
                'confidence' => 1.0,
            ],
            'update_frequency' => 'real_time',
            'priority' => 6,
            'description' => '最后消费时间超过90天的用户',
            'status' => 0,
            'version' => 1,
            'create_time' => $now,
            'update_time' => $now,
        ]);
    }

    /**
     * 如果标签不存在则创建
     *
     * @param array<string, mixed> $tagData
     */
    private function createTagIfNotExists(array $tagData): void
    {
        $existing = $this->tagDefinitionRepository->newQuery()
            ->where('tag_code', $tagData['tag_code'])
            ->first();

        if (!$existing) {
            $tag = new TagDefinitionRepository();
            foreach ($tagData as $key => $value) {
                $tag->$key = $value;
            }
            $tag->save();
            echo "已创建标签: {$tagData['tag_name']} ({$tagData['tag_code']})\n";
        } else {
            echo "标签已存在: {$tagData['tag_name']} ({$tagData['tag_code']})\n";
        }
    }
}

