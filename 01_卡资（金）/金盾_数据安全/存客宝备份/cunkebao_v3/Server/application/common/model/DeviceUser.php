<?php

namespace app\common\model;

use think\Model;
use think\model\concern\SoftDelete;

/**
 * 设备用户关联模型
 * 用于管理设备与操盘手（用户）的关联关系
 */
class DeviceUser extends Model
{
    use SoftDelete;

    /**
     * 数据表名
     * @var string
     */
    protected $name = 'device_user';

    // 自动写入时间戳
    protected $autoWriteTimestamp = true;
    protected $createTime = 'createTime';
    protected $updateTime = 'updateTime';
    protected $deleteTime = 'deleteTime';
    protected $defaultSoftDelete = 0;
} 