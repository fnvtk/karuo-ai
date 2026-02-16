<?php
namespace app\common\middleware;

/**
 * 跨域请求中间件
 */
class AllowCrossDomain
{
    /**
     * 处理跨域请求
     * @param \think\Request $request
     * @param \Closure $next
     * @return mixed
     */
    public function handle($request, \Closure $next)
    {
//        // 获取当前请求的域名
//        $origin = $request->header('origin');
//
//        // 当请求使用 credentials 模式时，不能使用通配符
//        // 必须指定具体的域名或提取请求中的 Origin
//        $allowOrigin = '*';
//        if ($origin) {
//            // 如果需要限制特定域名，可以在这里判断
//            // 以下是允许的域名列表，如果请求来自这些域名之一，则允许跨域
//            $allowDomains = [ /*  */ ];
//
//            // 如果请求来源在允许列表中，直接使用该源
//            if (in_array($origin, $allowDomains)) {
//                $allowOrigin = $origin;
//            }
//        }
//
//        // 设置允许的请求头信息
//        $allowHeaders = [
//            'Authorization', 'Content-Type', 'If-Match', 'If-Modified-Since',
//            'If-None-Match', 'If-Unmodified-Since', 'X-Requested-With',
//            'X-Token', 'X-Api-Token', 'Accept', 'Origin'
//        ];
//
//        $response = $next($request);
//
//        // 添加跨域响应头
//        $response->header([
//            'Access-Control-Allow-Origin' => $allowOrigin,
//            'Access-Control-Allow-Headers' => implode(', ', $allowHeaders),
//            'Access-Control-Allow-Methods' => 'GET, POST, PUT, DELETE, OPTIONS',
//            'Access-Control-Allow-Credentials' => 'true',
//            'Access-Control-Max-Age' => '86400',
//        ]);
//
//        // 对于预检请求，直接返回成功响应
//        if ($request->method(true) == 'OPTIONS') {
//            return response()->code(200);
//        }
//
//        return $response;
    }
} 