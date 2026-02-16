<?php
namespace app\superadmin\middleware;

use app\common\model\Administrator;

/**
 * 超级管理员后台登录认证中间件
 */
class AdminAuth
{
    /**
     * 处理请求
     * @param \think\Request $request
     * @param \Closure $next
     * @return mixed
     */
    public function handle($request, \Closure $next)
    {
        // 对OPTIONS请求直接放行，由跨域中间件处理
        if ($request->method(true) == 'OPTIONS') {
            return $next($request);
        }
        
        // 获取Cookie中的管理员信息
        $adminId = cookie('admin_id');
        $adminToken = cookie('admin_token');
        
        // 如果没有登录信息，返回401未授权
        if (empty($adminId) || empty($adminToken)) {
            return json([
                'code' => 401,
                'msg' => '请先登录',
                'data' => null
            ]);
        }
        
        // 获取管理员信息
        $admin = Administrator::where([
            ['id', '=', $adminId],
            ['status', '=', 1]
        ])->find();
        
        // 如果管理员不存在，返回401未授权
        if (!$admin) {
            return json([
                'code' => 401,
                'msg' => '管理员账号不存在或已被禁用',
                'data' => null
            ]);
        }
        
        // 验证Token是否有效
        $expectedToken = $this->createToken($admin);

        if ($adminToken !== $expectedToken) {
            return json([
                'code' => 401,
                'msg' => '登录已过期，请重新登录',
                'data' => null
            ]);
        }
        
        // 将管理员信息绑定到请求对象，方便后续控制器使用
        $request->adminInfo = $admin;
        
        // 继续执行后续操作
        return $next($request);
    }
    
    /**
     * 创建登录令牌
     *
     * @param Administrator $admin
     * @return string
     */
    private function createToken($admin)
    {
        $data = $admin->id . '|' . $admin->account;
        return md5($data . 'cunkebao_admin_secret');
    }
} 