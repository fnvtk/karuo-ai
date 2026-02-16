<?php

namespace app\common\model;

use think\Model;

/**
 * 微信账号模型类
 */
class WechatAccount extends Model
{
    // 设置表名
    protected $name = 'wechat_account';

    // 自动写入时间戳
    protected $autoWriteTimestamp = true;
    protected $createTime = 'createTime';
    protected $updateTime = 'updateTime';
} 