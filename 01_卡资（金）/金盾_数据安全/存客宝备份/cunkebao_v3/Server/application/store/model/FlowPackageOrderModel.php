<?php

namespace app\store\model;

use think\Model;

/**
 * 流量订单模型
 */
class FlowPackageOrderModel extends Model
{
    // 设置表名
    protected $name = 'flow_package_order';
    
    // 自动写入时间戳
    protected $autoWriteTimestamp = true;
    protected $createTime = 'createTime';
    protected $updateTime = 'updateTime';
    
    // 类型转换
    protected $type = [
        'id' => 'integer',
        'userId' => 'integer',
        'packageId' => 'integer',
        'amount' => 'float',
        'duration' => 'integer',
        'createTime' => 'timestamp',
        'updateTime' => 'timestamp',
        'payTime' => 'timestamp',
        'status' => 'integer',
        'payStatus' => 'integer',
        'isDel' => 'integer',
    ];
    
    /**
     * 生成订单号
     * 规则：LL + 年月日时分秒 + 5位随机数
     * 
     * @return string
     */
    public static function generateOrderNo()
    {
        $prefix = 'LL';
        $date = date('YmdHis');
        $random = mt_rand(10000, 99999);
        
        return $prefix . $date . $random;
    }
    
    /**
     * 创建订单
     * 
     * @param int $userId 用户ID
     * @param int $packageId 套餐ID
     * @param string $packageName 套餐名称
     * @param float $amount 订单金额
     * @param int $duration 购买时长(月)
     * @param string $payType 支付类型 (wechat|alipay|nopay)
     * @param string $remark 备注
     * @return array|false
     */
    public static function createOrder($userId, $packageId, $packageName, $amount, $duration, $payType = 'wechat', $remark = '')
    {
        // 生成订单号
        $orderNo = self::generateOrderNo();
        
        // 订单数据
        $data = [
            'userId' => $userId,
            'packageId' => $packageId,
            'packageName' => $packageName,
            'orderNo' => $orderNo,
            'amount' => $amount,
            'duration' => $duration,
            'payType' => $payType,
            'createTime' => time(),
            'status' => 0,  // 0:待支付 1:已完成 2:已取消 3:已退款
            'payStatus' => $payType == 'nopay' ? 10 : 0, // 0:未支付 1:已支付 10:无需支付
            'remark' => $remark,
            'isDel' => 0,
        ];
        
        // 创建订单
        $model = new self();
        $result = $model->save($data);
        
        if ($result) {
            return $model->toArray();
        } else {
            return false;
        }
    }
} 