<?php

namespace app\common\model;

use think\Model;

/**
 * 微信账号评分记录模型类
 */
class WechatAccountScore extends Model
{
    // 设置表名
    protected $name = 'wechat_account_score';
    protected $table = 's2_wechat_account_score';
    
    // 自动写入时间戳
    protected $autoWriteTimestamp = false;
    
    // 定义字段类型
    protected $type = [
        'accountId' => 'integer',
        'baseScore' => 'integer',
        'baseScoreCalculated' => 'integer',
        'baseInfoScore' => 'integer',
        'friendCountScore' => 'integer',
        'friendCount' => 'integer',
        'dynamicScore' => 'integer',
        'frequentCount' => 'integer',
        'frequentPenalty' => 'integer',
        'consecutiveNoFrequentDays' => 'integer',
        'noFrequentBonus' => 'integer',
        'banPenalty' => 'integer',
        'healthScore' => 'integer',
        'maxAddFriendPerDay' => 'integer',
        'isModifiedAlias' => 'integer',
        'isBanned' => 'integer',
        'lastFrequentTime' => 'integer',
        'lastNoFrequentTime' => 'integer',
        'baseScoreCalcTime' => 'integer',
        'createTime' => 'integer',
        'updateTime' => 'integer',
    ];
}

