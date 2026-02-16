<?php

namespace app\common\model;

use think\Model;
use think\model\concern\SoftDelete;

/**
 * 设备任务配置模型类
 */
class DeviceTaskconf extends Model
{
    use SoftDelete;

    // 设置表名
    protected $name = 'device_taskconf';

    // 自动写入时间戳
    protected $autoWriteTimestamp = true;
    protected $createTime = 'createTime';
    protected $updateTime = 'updateTime';
    protected $deleteTime = 'deleteTime';
    protected $defaultSoftDelete = 0;
} 