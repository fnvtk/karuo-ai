<?php

namespace app\api\model;

use think\Model;

class DeviceGroupModel extends Model {
    // 设置表名
    protected $table = 's2_device_group';
    
    // 设置主键
    protected $pk = 'id';
    
    // 自动写入时间戳
    protected $autoWriteTimestamp = true;
    
    // 定义时间戳字段名
    protected $createTime = 'createTime';
    protected $updateTime = 'updateTime';
    
    // 设置字段类型
    protected $type = [
        'id' => 'integer',
        'tenantId' => 'integer',
        'count' => 'integer',
        'createTime' => 'integer',
        'updateTime' => 'integer'
    ];
}