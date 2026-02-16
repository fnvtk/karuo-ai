<?php

namespace app\cunkebao\model;

use think\Model;

/**
 * 自动点赞工作台模型
 */
class WorkbenchImportContact extends Model
{
    protected $pk = 'id';
    protected $name  = 'workbench_import_contact';

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