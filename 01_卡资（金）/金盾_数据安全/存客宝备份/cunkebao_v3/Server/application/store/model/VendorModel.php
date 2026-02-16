<?php

namespace app\store\model;

use think\Model;

/**
 * 供应商模型
 */
class VendorModel extends Model
{
    // 设置表名
    protected $table = 's2_vendor';
    
    // 主键
    protected $pk = 'id';
    
    // 自动写入时间戳
    protected $autoWriteTimestamp = true;
    protected $createTime = 'createTime';
    protected $updateTime = 'updateTime';
    
    // 隐藏字段
    protected $hidden = ['isDel'];
    
    /**
     * 与套餐的关联
     */
    public function packages()
    {
        return $this->hasMany('VendorPackageModel', 'vendorId', 'id')
            ->where('isDel', 0);
    }
}