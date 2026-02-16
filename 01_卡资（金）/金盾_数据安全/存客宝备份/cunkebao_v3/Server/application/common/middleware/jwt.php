<?php
namespace app\common\middleware;

use app\common\util\JwtUtil;
use think\facade\Log;

/**
 * JWT认证中间件
 */
class jwt
{
    /**
     * 处理请求
     * @param \think\Request $request
     * @param \Closure $next
     * @return mixed
     */
    public function handle($request, \Closure $next)
    {
        // 获取Token
        $token = JwtUtil::getRequestToken();
        
        // 验证Token
        if (!$token) {
            return json([
                'code' => 401,
                'msg'  => '未授权访问，缺少有效的身份凭证',
                'data' => null
            ])->header(['Content-Type' => 'application/json; charset=utf-8']);
        }
        
        $payload = JwtUtil::verifyToken($token);
        if (!$payload) {
            return json([
                'code' => 401,
                'msg'  => '授权已过期或无效',
                'data' => null
            ])->header(['Content-Type' => 'application/json; charset=utf-8']);
        }
        
        // 将用户信息附加到请求中
        $request->userInfo = $payload;
        
        // 写入日志
        Log::info('JWT认证通过', ['user_id' => $payload['id'] ?? 0, 'username' => $payload['username'] ?? '']);
        
        return $next($request);
    }
} 