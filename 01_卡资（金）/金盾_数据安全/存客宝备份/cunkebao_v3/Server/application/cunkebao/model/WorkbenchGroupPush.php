<?php

namespace app\cunkebao\model;

use think\Model;

class WorkbenchGroupPush extends Model
{
    protected $table = 'ck_workbench_group_push';
    protected $pk = 'id';
    protected $name  = 'workbench_group_push';

    // 自动写入时间戳
    protected $autoWriteTimestamp = true;
    protected $createTime = 'createTime';
    protected $updateTime = 'updateTime';

    // 定义关联的工作台
    public function workbench()
    {
        return $this->belongsTo('Workbench', 'workbenchId', 'id');
    }
} 