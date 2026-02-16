<?php

namespace app\common\model;

use think\Model;

/**
 * 微信客服信息模型类
 */
class WechatCustomer extends Model
{
    // 设置表名
    protected $name = 'wechat_customer';

    // 自动进行 json_encode/json_decode
    protected $json = ['basic', 'weight', 'activity', 'friendShip'];

    // 自动写入时间戳
    protected $autoWriteTimestamp = true;
    protected $updateTime = 'updateTime';
} 