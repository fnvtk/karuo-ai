<?php

namespace app\common\model;

use think\Model;
use think\model\concern\SoftDelete;

/**
 * 超级管理员模型类
 */
class Administrator extends Model
{
    use SoftDelete;

    const MASTER_ID = 1;

    // 设置数据表名
    protected $name = 'administrators';

    // 自动写入时间戳
    protected $autoWriteTimestamp = true;
    protected $createTime = 'createTime';
    protected $updateTime = 'updateTime';
    protected $deleteTime = 'deleteTime';
    protected $defaultSoftDelete = 0;

    // 隐藏字段
    protected $hidden = [
        'password'
    ];
} 