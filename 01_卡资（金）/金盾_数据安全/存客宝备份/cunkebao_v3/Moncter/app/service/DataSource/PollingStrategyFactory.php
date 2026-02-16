<?php

namespace app\service\DataSource;

use app\service\DataSource\Strategy\DefaultConsumptionStrategy;
use app\utils\LoggerHelper;

/**
 * 轮询策略工厂
 * 
 * 职责：
 * - 根据配置创建对应的轮询策略实例
 * - 支持自定义策略类
 */
class PollingStrategyFactory
{
    /**
     * 创建轮询策略
     * 
     * @param string|array<string, mixed> $strategyConfig 策略配置（字符串为策略类名，数组包含 class 和 config）
     * @return PollingStrategyInterface 策略实例
     * @throws \InvalidArgumentException 无效的策略配置
     */
    public static function create(string|array $strategyConfig): PollingStrategyInterface
    {
        // 如果配置是字符串，则作为策略类名
        if (is_string($strategyConfig)) {
            $className = $strategyConfig;
            $strategyConfig = ['class' => $className];
        }

        // 获取策略类名
        $className = $strategyConfig['class'] ?? null;
        if (!$className) {
            // 如果没有指定策略，使用默认策略
            $className = DefaultConsumptionStrategy::class;
        }

        // 验证类是否存在
        if (!class_exists($className)) {
            throw new \InvalidArgumentException("策略类不存在: {$className}");
        }

        // 验证类是否实现了接口
        if (!is_subclass_of($className, PollingStrategyInterface::class)) {
            throw new \InvalidArgumentException("策略类必须实现 PollingStrategyInterface: {$className}");
        }

        // 创建策略实例
        try {
            $strategy = new $className();
            
            LoggerHelper::logBusiness('polling_strategy_created', [
                'class' => $className,
            ]);

            return $strategy;
        } catch (\Throwable $e) {
            LoggerHelper::logError($e, [
                'component' => 'PollingStrategyFactory',
                'action' => 'create',
                'class' => $className,
            ]);
            throw new \RuntimeException("无法创建策略实例: {$className}", 0, $e);
        }
    }
}

