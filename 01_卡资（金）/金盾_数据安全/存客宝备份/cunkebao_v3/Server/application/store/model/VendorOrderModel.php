<?php

namespace app\store\model;

use think\Model;

/**
 * 订单模型
 */
class VendorOrderModel extends Model
{
    // 设置表名
    protected $table = 'ck_vendor_order';
    
    // 主键
    protected $pk = 'id';
    
    // 自动写入时间戳
    protected $autoWriteTimestamp = true;
    protected $createTime = 'createTime';
    protected $updateTime = 'updateTime';
    
    // 状态常量
    const STATUS_UNPAID = 0;   // 待支付
    const STATUS_PAID = 1;     // 已支付
    const STATUS_COMPLETED = 2; // 已完成
    const STATUS_CANCELED = 3;  // 已取消
    
    /**
     * 与套餐的关联
     */
    public function package()
    {
        return $this->belongsTo('VendorPackageModel', 'packageId', 'id');
    }
    
    /**
     * 生成唯一订单号
     * @return string
     */
    public static function generateOrderNo()
    {
        return date('YmdHis') . rand(1000, 9999);
    }
}