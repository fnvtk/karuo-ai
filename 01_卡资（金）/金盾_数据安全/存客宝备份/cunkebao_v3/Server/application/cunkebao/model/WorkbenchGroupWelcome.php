<?php

namespace app\cunkebao\model;

use think\Model;

/**
 * 入群欢迎语工作台模型
 */
class WorkbenchGroupWelcome extends Model
{
    protected $table = 'ck_workbench_group_welcome';
    protected $pk = 'id';
    protected $name  = 'workbench_group_welcome';

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

