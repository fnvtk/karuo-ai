<?php

namespace app\chukebao\controller;

use think\Controller;

/**
 * 基础控制器
 */
class BaseController extends Controller
{
    /**
     * 获取用户信息
     *
     * @param string $column
     * @return mixed
     * @throws \Exception
     */
    protected function getUserInfo(?string $column = null)
    {
        $user = $this->request->userInfo;

        if (!$user) {
            throw new \Exception('未授权访问，缺少有效的身份凭证', 401);
        }

        return $column ? $user[$column] : $user;
    }
} 