<?php

namespace app\common\model;

use think\Model;
use think\model\concern\SoftDelete;

/**
 * 获客场景模型类
 */
class PlanScene extends Model
{
    use SoftDelete;

    const STATUS_ACTIVE = 1;  // 活动状态

    // 设置表名
    protected $name = 'plan_scene';

    // 自动写入时间戳
    protected $autoWriteTimestamp = true;
    protected $createTime = 'createTime';
    protected $updateTime = 'updateTime';
    protected $deleteTime = 'deleteTime';
    protected $defaultSoftDelete = 0;
} 