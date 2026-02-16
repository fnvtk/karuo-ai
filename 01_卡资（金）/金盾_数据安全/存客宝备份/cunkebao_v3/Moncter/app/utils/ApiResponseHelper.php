<?php

namespace app\utils;

/**
 * API 响应辅助工具类
 *
 * 提供统一的 API 响应格式
 */
class ApiResponseHelper
{
    /**
     * 判断是否为开发环境
     *
     * @return bool
     */
    protected static function isDevelopment(): bool
    {
        return config('app.debug', false) || env('APP_ENV', 'production') === 'development';
    }

    /**
     * 成功响应
     *
     * @param mixed $data 响应数据
     * @param string $message 响应消息
     * @param int $httpCode HTTP状态码
     * @return \support\Response
     */
    public static function success($data = null, string $message = 'ok', int $httpCode = 200): \support\Response
    {
        $response = [
            'code' => 0,
            'msg' => $message,
        ];

        if ($data !== null) {
            $response['data'] = $data;
        }

        return json($response, $httpCode);
    }

    /**
     * 错误响应
     *
     * @param string $message 错误消息
     * @param int $code 错误码（业务错误码，非HTTP状态码）
     * @param int $httpCode HTTP状态码
     * @param array<string, mixed> $extra 额外信息
     * @return \support\Response
     */
    public static function error(
        string $message,
        int $code = 400,
        int $httpCode = 400,
        array $extra = []
    ): \support\Response {
        $response = [
            'code' => $code,
            'msg' => $message,
        ];

        // 开发环境可以返回更多调试信息
        if (self::isDevelopment() && !empty($extra)) {
            $response = array_merge($response, $extra);
        }

        return json($response, $httpCode);
    }

    /**
     * 异常响应
     *
     * @param \Throwable $exception 异常对象
     * @param int $httpCode HTTP状态码
     * @return \support\Response
     */
    public static function exception(\Throwable $exception, int $httpCode = 500): \support\Response
    {
        // 记录错误日志
        LoggerHelper::logError($exception);

        $code = 500;
        $message = '内部服务器错误';

        // 根据异常类型设置错误码和消息
        if ($exception instanceof \InvalidArgumentException) {
            $code = 400;
            $message = $exception->getMessage();
        } elseif ($exception instanceof \RuntimeException) {
            $code = 500;
            $message = $exception->getMessage();
        }

        $response = [
            'code' => $code,
            'msg' => $message,
        ];

        // 开发环境返回详细错误信息
        if (self::isDevelopment()) {
            $response['debug'] = [
                'message' => $exception->getMessage(),
                'file' => $exception->getFile(),
                'line' => $exception->getLine(),
                'trace' => $exception->getTraceAsString(),
            ];
        }

        return json($response, $httpCode);
    }

    /**
     * 验证错误响应
     *
     * @param array<string, string> $errors 验证错误列表
     * @return \support\Response
     */
    public static function validationError(array $errors): \support\Response
    {
        $message = '参数验证失败';
        if (!empty($errors)) {
            $firstError = reset($errors);
            $message = is_array($firstError) ? $firstError[0] : $firstError;
        }

        $response = [
            'code' => 400,
            'msg' => $message,
            'errors' => $errors,
        ];

        return json($response, 400);
    }
}

