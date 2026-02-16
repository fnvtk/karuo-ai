<?php
namespace app\store\model;

use think\Model;

class TrafficUsageLog extends Model
{
    
    // 自动转换时间为时间戳
    protected $type = [
        'createTime' => 'timestamp',
        'updateTime' => 'timestamp',
    ];
}