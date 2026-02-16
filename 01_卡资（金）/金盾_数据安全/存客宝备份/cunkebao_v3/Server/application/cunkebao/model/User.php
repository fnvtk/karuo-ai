<?php

namespace app\cunkebao\model;

use think\Model;

/**
 * 用户模型
 */
class User extends Model
{
    protected $pk = 'id';
    protected $name  = 'users';

    // 自动写入时间戳
    protected $autoWriteTimestamp = true;
    protected $createTime = 'createTime';
    protected $updateTime = 'updateTime';

    // 定义关联的工作台
    public function workbench()
    {
        return $this->belongsTo('Workbench', 'id', 'userId');
    }
} 