<?php
namespace app\store\controller;

use app\store\model\TrafficPackage as TrafficPackageModel;
use think\Controller;

class TrafficPackage extends Controller
{
    /**
     * 获取流量套餐列表
     */
    public function getList()
    {
        $model = new TrafficPackageModel;
        
        // 获取列表数据
        $list = $model->field([
            'id',
            'name',
            'tags',
            'originalPrice',
            'price',
            'monthlyTraffic',
            'duration',
            'privileges',
            'createTime'
        ])->select();
        
        // 处理数据
        $list = collection($list)->each(function($item) {
            // 添加计算字段
            $item['discount'] = $item->discount;           // 折扣
            $item['totalTraffic'] = $item->totalTraffic; // 总流量
             // 确保特权是数组格式
             $item['privileges'] = $item->privileges;       // 使用模型的获取器处理特权
             // 格式化时间
             $item['createTime'] = date('Y-m-d H:i:s', strtotime($item['createTime']));
            return $item;
        });
        return successJson($list,'获取成功');
    }


    /**
     * 获取当前套餐使用情况
     * @return \think\response\Json
     */
    public function getUsage()
    {
        // 获取用户ID，可以从session或token中获取
        $userId = input('userId', 0, 'intval');
        if (empty($userId)) {
            return errorJson('请先登录');
        }

        // 获取用户当前生效的套餐订单
        $order = model('TrafficPackageOrder')
            ->where('userId', $userId)
            ->where('status', 1) // 1表示生效中
            ->where('expireTime', '>', time()) // 未过期
            ->order('expireTime', 'desc') // 取最晚过期的
            ->find();

        if (empty($order)) {
            return errorJson('未找到有效的套餐');
        }

        // 获取套餐详情
        $package = TrafficPackageModel::get($order['packageId']);
        if (empty($package)) {
            return errorJson('套餐信息不存在');
        }

        // 计算套餐使用情况
        $totalUsers = $package['monthlyTraffic'] * $package['duration']; // 总人数
        $usedUsers = model('TrafficUsageLog')
            ->where('orderId', $order['id'])
            ->count(); // 已使用人数

        // 计算剩余有效期（天数）
        $remainDays = ceil(($order['expireTime'] - time()) / (60 * 60 * 24));
        $remainDays = max(0, $remainDays); // 确保不会出现负数

        $data = [
            'packageName' => $package['name'], // 套餐名称
            'totalUsers' => $totalUsers, // 总人数
            'usedUsers' => $usedUsers, // 已使用人数
            'remainUsers' => $totalUsers - $usedUsers, // 剩余可用人数
            'remainDays' => $remainDays, // 剩余有效期（天）
            'expireTime' => date('Y-m-d', $order['expireTime']), // 过期时间
            'usagePercent' => $totalUsers > 0 ? round(($usedUsers / $totalUsers) * 100, 1) : 0, // 使用百分比
        ];

        return successJson($data, '获取成功');
    }

}