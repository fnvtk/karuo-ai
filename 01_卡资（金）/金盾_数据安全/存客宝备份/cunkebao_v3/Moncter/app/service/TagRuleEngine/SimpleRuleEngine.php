<?php

namespace app\service\TagRuleEngine;

/**
 * 简单标签规则引擎
 *
 * 支持基础条件判断，用于计算简单标签（如：总消费金额等级、消费频次等级等）
 */
class SimpleRuleEngine
{
    /**
     * 计算标签值
     *
     * @param array<string, mixed> $ruleConfig 规则配置（从 tag_definitions.rule_config 解析）
     * @param array<string, mixed> $userData 用户数据（从 user_profile 获取）
     * @return array{value: mixed, confidence: float} 返回标签值和置信度
     */
    public function calculate(array $ruleConfig, array $userData): array
    {
        if (!isset($ruleConfig['rule_type']) || $ruleConfig['rule_type'] !== 'simple') {
            throw new \InvalidArgumentException('规则类型必须是 simple');
        }

        if (!isset($ruleConfig['conditions']) || !is_array($ruleConfig['conditions'])) {
            throw new \InvalidArgumentException('规则配置中缺少 conditions');
        }

        // 执行所有条件判断
        $allMatch = true;
        foreach ($ruleConfig['conditions'] as $condition) {
            if (!$this->evaluateCondition($condition, $userData)) {
                $allMatch = false;
                break;
            }
        }

        // 如果所有条件都满足，返回标签值
        if ($allMatch) {
            // 简单标签：如果满足条件，标签值为 true 或指定的值
            $tagValue = $ruleConfig['tag_value'] ?? true;
            $confidence = $ruleConfig['confidence'] ?? 1.0;
            
            return [
                'value' => $tagValue,
                'confidence' => (float)$confidence,
            ];
        }

        // 条件不满足，返回 false
        return [
            'value' => false,
            'confidence' => 0.0,
        ];
    }

    /**
     * 评估单个条件
     *
     * @param array<string, mixed> $condition 条件配置：{field, operator, value}
     * @param array<string, mixed> $userData 用户数据
     * @return bool
     */
    private function evaluateCondition(array $condition, array $userData): bool
    {
        if (!isset($condition['field']) || !isset($condition['operator']) || !isset($condition['value'])) {
            throw new \InvalidArgumentException('条件配置不完整：需要 field, operator, value');
        }

        $field = $condition['field'];
        $operator = $condition['operator'];
        $expectedValue = $condition['value'];

        // 从用户数据中获取字段值
        if (!isset($userData[$field])) {
            // 字段不存在，根据运算符判断（例如 > 0 时，不存在视为 0）
            $actualValue = 0;
        } else {
            $actualValue = $userData[$field];
        }

        // 根据运算符进行比较
        return match ($operator) {
            '>' => $actualValue > $expectedValue,
            '>=' => $actualValue >= $expectedValue,
            '<' => $actualValue < $expectedValue,
            '<=' => $actualValue <= $expectedValue,
            '=' => $actualValue == $expectedValue,
            '!=' => $actualValue != $expectedValue,
            'in' => in_array($actualValue, (array)$expectedValue),
            'not_in' => !in_array($actualValue, (array)$expectedValue),
            default => throw new \InvalidArgumentException("不支持的运算符: {$operator}"),
        };
    }
}

