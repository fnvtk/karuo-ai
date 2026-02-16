<?php

namespace app\common\model;

use think\Model;

/**
 * 流量池模型类
 */
class TrafficSource extends Model
{
    const STATUS_PENDING = 1;   // 待处理
    const STATUS_WORKING = 2;   // 处理中
    const STATUS_PASSED = 3;    // 已通过
    const STATUS_REFUSED = 4;   // 已拒绝
    const STATUS_EXPIRED = 5;   // 已过期
    const STATUS_CANCELED = 6;  // 已取消


    // 设置数据表名
    protected $name = 'traffic_source';

    // 自动写入时间戳
    protected $autoWriteTimestamp = true;
    protected $createTime = 'createTime';
    protected $updateTime = 'updateTime';
} 