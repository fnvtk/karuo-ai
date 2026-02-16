<?php

namespace app\store\model;

use think\Model;

class UserFlowPackageModel extends Model
{
    protected $name = 'user_flow_package';
    /**
     * 获取用户当前有效的流量套餐
     *
     * @param int $userId 用户ID
     * @return array|null 用户套餐信息
     */
    public static function getUserActivePackage($userId)
    {
        if (empty($userId)) {
            return null;
        }
        
        return self::where('userId', $userId)
            ->where('status', 1)  // 1表示有效
            ->where('expireTime', '>', time())  // 未过期
            ->order('expireTime', 'asc')  // 按到期时间排序，最先到期的排在前面
            ->find();
    }
    
    /**
     * 创建用户套餐订阅记录
     *
     * @param int $userId 用户ID
     * @param int $packageId 套餐ID
     * @param int $duration 套餐时长(月)
     * @return bool 是否创建成功
     */
    public static function createSubscription($userId, $packageId, $duration = 0)
    {
        if (empty($userId) || empty($packageId)) {
            return false;
        }
        
        // 获取套餐信息
        $package = FlowPackageModel::where('id', $packageId)->where('isDel', 0)->find();
        if (empty($package)) {
            return false;
        }
        
        // 如果未指定时长，则使用套餐默认时长
        if (empty($duration)) {
            $duration = $package['duration'];
        }
        
        // 计算开始时间和到期时间
        $now = time();
        $startTime = $now;
        $expireTime = strtotime("+{$duration} month", $now);
        
        // 创建新订阅
        $data = [
            'userId' => $userId,
            'packageId' => $packageId,
            'duration' => $duration,
            'totalFlow' => $package->totalFlow,
            'usedFlow' => 0,
            'status' => 1,  // 1表示有效
            'startTime' => $startTime,
            'expireTime' => $expireTime,
            'createTime' => $now,
            'updateTime' => $now
        ];
        
        return self::create($data) ? true : false;
    }
    
    /**
     * 更新用户已使用流量
     *
     * @param int $id 用户套餐ID
     * @param int $usedFlow 已使用流量
     * @return bool 是否更新成功
     */
    public static function updateUsedFlow($id, $usedFlow)
    {
        if (empty($id)) {
            return false;
        }
        
        $userPackage = self::where('id', $id)->find();
        if (empty($userPackage)) {
            return false;
        }
        
        // 确保使用量不超过总量
        $maxFlow = $userPackage['totalFlow'];
        $usedFlow = $usedFlow > $maxFlow ? $maxFlow : $usedFlow;
        
        return self::where('id', $id)->update([
            'usedFlow' => $usedFlow,
            'updateTime' => time()
        ]) ? true : false;
    }
} 