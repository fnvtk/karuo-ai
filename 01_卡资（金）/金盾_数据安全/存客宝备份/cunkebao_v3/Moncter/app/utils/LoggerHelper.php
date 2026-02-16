<?php

namespace app\utils;

use Monolog\Logger;

/**
 * 日志辅助工具类
 *
 * 提供结构化的日志记录方法
 */
class LoggerHelper
{
    /**
     * 记录请求日志
     *
     * @param string $method HTTP方法
     * @param string $path 请求路径
     * @param array<string, mixed> $params 请求参数
     * @param float|null $duration 请求耗时（秒）
     */
    public static function logRequest(string $method, string $path, array $params = [], ?float $duration = null): void
    {
        $logger = \support\Log::channel('default');
        $context = [
            'type' => 'request',
            'method' => $method,
            'path' => $path,
            'params' => $params,
        ];
        
        if ($duration !== null) {
            $context['duration'] = round($duration * 1000, 2) . 'ms';
        }
        
        $logger->info("请求: {$method} {$path}", $context);
    }

    /**
     * 记录业务日志
     *
     * @param string $action 操作名称
     * @param array<string, mixed> $context 上下文信息
     * @param string $level 日志级别（info/warning/error）
     */
    public static function logBusiness(string $action, array $context = [], string $level = 'info'): void
    {
        $logger = \support\Log::channel('default');
        $context['type'] = 'business';
        $context['action'] = $action;
        
        $logger->$level("业务操作: {$action}", $context);
    }

    /**
     * 记录标签计算日志
     *
     * @param string $userId 用户ID
     * @param string $tagId 标签ID
     * @param array<string, mixed> $result 计算结果
     * @param float|null $duration 计算耗时（秒）
     */
    public static function logTagCalculation(string $userId, string $tagId, array $result, ?float $duration = null): void
    {
        $logger = \support\Log::channel('default');
        $context = [
            'type' => 'tag_calculation',
            'user_id' => $userId,
            'tag_id' => $tagId,
            'result' => $result,
        ];
        
        if ($duration !== null) {
            $context['duration'] = round($duration * 1000, 2) . 'ms';
        }
        
        $logger->info("标签计算: user_id={$userId}, tag_id={$tagId}", $context);
    }

    /**
     * 记录错误日志
     *
     * @param \Throwable $exception 异常对象
     * @param array<string, mixed> $context 额外上下文
     */
    public static function logError(\Throwable $exception, array $context = []): void
    {
        $logger = \support\Log::channel('default');
        $context['type'] = 'error';
        
        // 限制 trace 长度，避免内存溢出
        $trace = $exception->getTraceAsString();
        $originalTraceLength = strlen($trace);
        $maxTraceLength = 5000; // 最大 trace 长度（字符数）
        
        // 限制 trace 行数，只保留前50行
        $traceLines = explode("\n", $trace);
        $originalLineCount = count($traceLines);
        
        if ($originalLineCount > 50) {
            $traceLines = array_slice($traceLines, 0, 50);
            $trace = implode("\n", $traceLines) . "\n... (trace truncated, total lines: {$originalLineCount})";
        }
        
        // 限制 trace 字符长度
        if (strlen($trace) > $maxTraceLength) {
            $trace = substr($trace, 0, $maxTraceLength) . "\n... (trace truncated, total length: {$originalTraceLength} bytes)";
        }
        
        $context['exception'] = [
            'message' => $exception->getMessage(),
            'file' => $exception->getFile(),
            'line' => $exception->getLine(),
            'trace' => $trace,
            'class' => get_class($exception),
        ];
        
        // 如果上下文数据太大，也进行限制
        $contextJson = json_encode($context);
        if (strlen($contextJson) > 10000) {
            // 如果上下文太大，只保留关键信息
            $context = [
                'type' => 'error',
                'exception' => [
                    'message' => $exception->getMessage(),
                    'file' => $exception->getFile(),
                    'line' => $exception->getLine(),
                    'class' => get_class($exception),
                    'trace' => substr($trace, 0, 2000) . '... (truncated)',
                ],
            ];
        }
        
        $logger->error("异常: {$exception->getMessage()}", $context);
    }

    /**
     * 记录性能日志
     *
     * @param string $operation 操作名称
     * @param float $duration 耗时（秒）
     * @param array<string, mixed> $context 上下文信息
     */
    public static function logPerformance(string $operation, float $duration, array $context = []): void
    {
        $logger = \support\Log::channel('default');
        $context['type'] = 'performance';
        $context['operation'] = $operation;
        $context['duration'] = round($duration * 1000, 2) . 'ms';
        
        $level = $duration > 1.0 ? 'warning' : 'info';
        $logger->$level("性能: {$operation} 耗时 {$context['duration']}", $context);
    }
}

