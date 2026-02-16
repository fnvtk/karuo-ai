<?php

namespace app\api\model;

use think\Model;

class WechatFriendModel extends Model
{
    // 设置表名
    protected $table = 's2_wechat_friend';
    protected $pk = 'id';

    /*protected $pk = [
        'uk_owner_wechat_account' => ['ownerWechatId', 'wechatId','wechatAccountId'] // uk_owner_wechat_account 是数据库中组合唯一键的名称
    ];*/
} 