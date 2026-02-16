<?php

namespace app\common\model;

use think\Model;

/**
 * 微信好友模型类
 */
class WechatTag extends Model
{
    // 设置表名
    protected $name = 'ck_wechat_tag';

    // 自动写入时间戳
    protected $autoWriteTimestamp = true;
    protected $createTime = 'createTime';
    protected $updateTime = 'updateTime';
    protected $defaultSoftDelete = 0;
} 