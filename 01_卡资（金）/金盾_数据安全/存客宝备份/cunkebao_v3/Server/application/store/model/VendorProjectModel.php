<?php

namespace app\store\model;

use think\Model;

/**
 * 套餐项目模型
 */
class VendorProjectModel extends Model
{
    // 设置表名
    protected $table = 'ck_vendor_project';
    
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
    public function package()
    {
        return $this->belongsTo('VendorPackageModel', 'packageId', 'id');
    }
}