<?php

namespace app\common\model;

use think\Model;

/**
 * 微信风险受限记录
 */
class WechatRestricts extends Model
{
    const LEVEL_WARNING = 2;
    const LEVEL_ERROR = 3;

    // 设置数据表名
    protected $name = 'wechat_restricts';
}