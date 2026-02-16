<?php
namespace app\store\model;

use think\Model;

class TrafficPackage extends Model
{
    protected $name = 'traffic_package';
    
    // 自动转换特权文本为数组
    public function getPrivilegesAttr($value)
    {
        return empty($value) ? [] : explode("\n", $value);
    }
    
    // 计算折扣
    public function getDiscountAttr($value, $data)
    {
        if (empty($data['originalPrice']) || $data['originalPrice'] == 0) {
            return '';
        }
        
        // 原价和售价相同时返回原价
        if ($data['originalPrice'] == $data['price']) {
            return '原价';
        }
        
        $discount = round(($data['price'] / $data['originalPrice']) * 100);
        return $discount . '折';
    }
    
    // 计算总流量
    public function getTotalTrafficAttr($value, $data)
    {
        return $data['monthlyTraffic'] * $data['duration'];
    }
}