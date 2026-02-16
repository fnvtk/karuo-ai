<?php

namespace app\common\model;

use think\Model;
use think\model\concern\SoftDelete;

/**
 * 设备模型类
 */
class Device extends Model
{
    use SoftDelete;

    // 设置表名
    protected $name = 'device';

    // 自动写入时间戳
    protected $autoWriteTimestamp = true;
    protected $createTime = 'createTime';
    protected $updateTime = 'updateTime';
    protected $deleteTime = 'deleteTime';
    protected $defaultSoftDelete = 0;
} 