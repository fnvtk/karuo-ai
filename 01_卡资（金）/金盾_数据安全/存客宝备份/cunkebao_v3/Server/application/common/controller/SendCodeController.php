<?php

namespace app\common\controller;

use library\ResponseHelper;
use think\facade\Request;

/**
 * 认证控制器
 * 处理用户登录和身份验证
 */
class SendCodeController extends BaseController
{
    /**
     * 发送验证码
     * @return \think\response\Json
     */
    public function index()
    {
        $params = $this->request->only(['account', 'type']);

        // 参数验证
        $validate = validate('common/Auth');
        if (!$validate->scene('send_code')->check($params)) {
            return ResponseHelper::error($validate->getError());
        }

        try {
            // 调用发送验证码服务
            $result = $this->authService->sendLoginCode(
                $params['account'],
                $params['type']
            );
            return ResponseHelper::success($result, '验证码发送成功');
        } catch (\Exception $e) {
            return ResponseHelper::error($e->getMessage());
        }
    }
} 