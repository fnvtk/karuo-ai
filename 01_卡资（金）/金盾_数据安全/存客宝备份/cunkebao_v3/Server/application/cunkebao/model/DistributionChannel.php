<?php

namespace app\cunkebao\model;

use app\cunkebao\model\BaseModel;
use think\Model;

/**
 * 分销渠道模型
 */
class DistributionChannel extends BaseModel
{
    // 设置表名
    protected $name = 'distribution_channel';

    // 自动写入时间戳
    protected $autoWriteTimestamp = true;
    protected $createTime = 'createTime';
    protected $updateTime = 'updateTime';
    protected $deleteTime = 'deleteTime';
    protected $defaultSoftDelete = 0;

    // 类型转换
    protected $type = [
        'id' => 'integer',
        'companyId' => 'integer',
        'totalCustomers' => 'integer',
        'todayCustomers' => 'integer',
        'totalFriends' => 'integer',
        'todayFriends' => 'integer',
        'withdrawableAmount' => 'integer',
        'createTime' => 'timestamp',
        'updateTime' => 'timestamp',
        'deleteTime' => 'timestamp',
    ];

    /**
     * 生成渠道编码
     * 格式：QD + 时间戳 + 9位随机字符串
     * 
     * @return string
     */
    public static function generateChannelCode()
    {
        $prefix = 'QD';
        $timestamp = time();
        $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        $randomStr = '';
        
        // 生成9位随机字符串
        for ($i = 0; $i < 9; $i++) {
            $randomStr .= $chars[mt_rand(0, strlen($chars) - 1)];
        }
        
        $code = $prefix . $timestamp . $randomStr;
        
        // 检查是否已存在
        $exists = self::where('code', $code)->find();
        if ($exists) {
            // 如果已存在，递归重新生成
            return self::generateChannelCode();
        }
        
        return $code;
    }

    /**
     * 创建类型：manual（手动创建）
     */
    const CREATE_TYPE_MANUAL = 'manual';

    /**
     * 创建类型：auto（扫码创建）
     */
    const CREATE_TYPE_AUTO = 'auto';

    /**
     * 状态：enabled（启用）
     */
    const STATUS_ENABLED = 'enabled';

    /**
     * 状态：disabled（禁用）
     */
    const STATUS_DISABLED = 'disabled';
}

