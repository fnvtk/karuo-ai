<?php

namespace library;

use think\response\Json as JsonResponse;

class ResponseHelper
{
    /**
     * 成功响应
     *
     * @param mixed $data
     * @param string $msg
     * @param int $code
     * @return JsonResponse
     */
    public static function success($data = null, string $msg = 'success', int $code = 200): JsonResponse
    {
        return json([
            'code' => $code,
            'msg'  => $msg,
            'data' => $data
        ]);
    }

    /**
     * 错误响应
     *
     * @param string $msg
     * @param int $code
     * @param mixed $data
     * @return JsonResponse
     */
    public static function error(string $msg = 'fail', int $code = 400, $data = []): JsonResponse
    {
        return json([
            'code' => $code,
            'msg'  => $msg,
            'data' => $data
        ]);
    }

    /**
     * 未授权响应
     *
     * @param string $msg 错误消息
     * @return JsonResponse
     */
    public static function unauthorized(string $msg = 'unauthorized access'): JsonResponse
    {
        return static::error($msg, 401);
    }

    /**
     * 禁止访问响应
     *
     * @param string $msg 错误消息
     * @return JsonResponse
     */
    public static function forbidden(string $msg = 'access denied'): JsonResponse
    {
        return static::error($msg, 403);
    }
} 