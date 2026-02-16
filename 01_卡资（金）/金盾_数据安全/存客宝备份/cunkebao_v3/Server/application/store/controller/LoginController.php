<?php

namespace app\store\controller;

use app\common\util\JwtUtil;
use think\Db;
use think\Controller;

class LoginController extends Controller
{
    public function index()
    {
        $deviceId = $this->request->param('deviceId', '');
        if (empty($deviceId)) {
            return errorJson('缺少必要参数');
        }

        $user = Db::name('users')->alias('u')
            ->field('u.*')
            ->join('device_user du', 'u.id = du.userId and u.companyId = du.companyId')
            ->join('device d', 'du.deviceId = d.id and u.companyId = du.companyId')
            ->where(['d.deviceImei' => $deviceId, 'u.deleteTime' => 0, 'du.deleteTime' => 0, 'd.deleteTime' => 0])
            ->find();
        if (empty($user)) {
            return errorJson('用户不存在');
        }
        $member = array_merge($user, [
            'lastLoginIp' => $this->request->ip(),
            'lastLoginTime' => time()
        ]);

        // 生成JWT令牌
        $token = JwtUtil::createToken($user, 86400 * 30);
        $token_expired = time() + 86400 * 30;

        $data = [
            'member' => $member,
            'token' => $token,
            'token_expired' => $token_expired
        ];
        return successJson($data, '登录成功');
    }
}