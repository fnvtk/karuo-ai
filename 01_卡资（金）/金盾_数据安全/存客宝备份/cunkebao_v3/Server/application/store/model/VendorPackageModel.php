<?php

namespace app\store\model;

use think\Model;

/**
 * 套餐模型
 */
class VendorPackageModel extends Model
{
    // 设置表名
    protected $table = 'ck_vendor_package';
    
    // 主键
    protected $pk = 'id';
    
    // 自动写入时间戳
    protected $autoWriteTimestamp = true;
    protected $createTime = 'createTime';
    protected $updateTime = 'updateTime';
    
    // 隐藏字段
    protected $hidden = ['isDel'];
    
    /**
     * 与项目的关联
     */
    public function projects()
    {
        return $this->hasMany('VendorProjectModel', 'packageId', 'id')
            ->where('isDel', 0);
    }
    
    /**
     * 标签获取器
     */
    public function getTagsAttr($value)
    {
        return $value ? explode(',', $value) : [];
    }
    
    /**
     * 标签修改器
     */
    public function setTagsAttr($value)
    {
        return is_array($value) ? implode(',', $value) : $value;
    }
}