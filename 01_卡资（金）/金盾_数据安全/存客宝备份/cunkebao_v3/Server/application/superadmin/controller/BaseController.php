<?php

namespace app\superadmin\controller;

use think\Controller;

/**
 * 设备管理控制器
 */
class BaseController extends Controller
{
    /**
     * 管理员信息
     *
     * @var object
     */
    protected $admin;

    /**
     * 初始化
     */
    protected function initialize()
    {
        parent::initialize();

        date_default_timezone_set('Asia/Shanghai');
    }

    /**
     * 获取管理员信息
     *
     * @param string $column
     * @return mixed
     * @throws \Exception
     */
    protected function getAdminInfo(string $column = '')
    {
        $admin = $this->request->adminInfo;

        if (!$admin) {
            throw new \Exception('未授权访问，缺少有效的身份凭证', 401);
        }

        return $column ? $admin[$column] : $admin;
    }
} 