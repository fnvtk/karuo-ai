<?php

namespace app\common\model;

use think\Model;
use think\model\concern\SoftDelete;

class User extends Model
{
    use SoftDelete;

    const ADMIN_STP = 1;     // 操盘手账号
    const ADMIN_OTP = 0;
    const NOT_USER = -1;      // 非登录用户用于任务操作的（S2系统专属）
    const MASTER_USER = 1;    // 操盘手
    const CUSTOMER_USER = 2;  // 门店接待
    const STATUS_STOP = 0;    // 禁用状态
    const STATUS_ACTIVE = 1;  // 活动状态

    /**
     * 数据表名
     * @var string
     */
    protected $name = 'users';

    // 自动写入时间戳
    protected $autoWriteTimestamp = true;
    protected $createTime = 'createTime';
    protected $updateTime = 'updateTime';
    protected $deleteTime = 'deleteTime';
    protected $defaultSoftDelete = 0;

    /**
     * 隐藏属性
     * @var array
     */
    protected $hidden = ['passwordMd5', 'deleteTime'];
} 