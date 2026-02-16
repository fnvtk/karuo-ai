<?php

namespace app\store\model;

use think\Model;

class FlowPackageModel extends Model
{
    protected $name = 'flow_package';

    // 定义字段自动转换
    protected $type = [
        // 将特权字段从多行文本转换为数组
        'privileges' => 'array',
    ];
    
    /**
     * 特权字段获取器 - 将多行文本转换为数组
     * @param $value
     * @return array
     */
    public function getPrivilegesAttr($value)
    {
        if (empty($value)) {
            return [];
        }
        
        // 如果已经是数组则直接返回
        if (is_array($value)) {
            return $value;
        }
        
        // 按行分割文本
        return array_filter(explode("\n", $value));
    }
    
    /**
     * 折扣获取器 - 根据原价和售价计算折扣
     * @param $value
     * @param $data
     * @return string
     */
    public function getDiscountAttr($value, $data)
    {
        if (empty($data['originalPrice']) || $data['originalPrice'] <= 0) {
            return '原价';
        }
        
        $discount = round(($data['price'] / $data['originalPrice']) * 10, 1);
        return $discount . '折';
    }
    
    /**
     * 总流量获取器 - 计算套餐总流量
     * @param $value
     * @param $data
     * @return int
     */
    public function getTotalFlowAttr($value, $data)
    {
        return isset($data['monthlyFlow']) && isset($data['duration']) ? 
            intval($data['monthlyFlow']) * intval($data['duration']) : 0;
    }
} 