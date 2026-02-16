<?php

namespace app\store\controller;

use app\common\controller\Api;
use app\store\model\FlowPackageModel;
use app\store\model\UserFlowPackageModel;
use app\store\model\FlowPackageOrderModel;
use think\facade\Config;

/**
 * 流量套餐控制器
 */
class FlowPackageController extends Api
{
    protected $noNeedLogin = [];
    protected $noNeedRight = ['*'];
    
    /**
     * 获取流量套餐列表
     * 
     * @return \think\Response
     */
    public function getList()
    {
        $params = $this->request->param();
        
        // 查询条件
        $where = [];
        
        // 只获取未删除的数据
        $where[] = ['isDel', '=', 0];
        
        // 套餐模型
        $model = new FlowPackageModel();
        
        // 查询数据
        $list = $model->where($where)
            ->field('id, name, tag, originalPrice, price, monthlyFlow, duration, privileges')
            ->order('sort', 'asc')
            ->select();
        
        // 格式化返回数据，添加计算字段
        $result = [];
        foreach ($list as $item) {
            $result[] = [
                'id' => $item['id'],
                'name' => $item['name'],
                'tag' => $item['tag'],
                'originalPrice' => $item['originalPrice'],
                'price' => $item['price'],
                'monthlyFlow' => $item['monthlyFlow'],
                'duration' => $item['duration'],
                'discount' => $item->discount,
                'totalFlow' => $item->totalFlow,
                'privileges' => $item['privileges'],
            ];
        }
        
        return successJson($result, '获取成功');
    }
    
    /**
     * 获取流量套餐详情
     * 
     * @param int $id 套餐ID
     * @return \think\Response
     */
    public function detail($id)
    {
        if (empty($id)) {
            return errorJson('参数错误');
        }
        
        // 套餐模型
        $model = new FlowPackageModel();
        
        // 查询数据
        $info = $model->where('id', $id)->where('isDel', 0)->find();
        
        if (empty($info)) {
            return errorJson('套餐不存在');
        }
        
        // 格式化返回数据，添加计算字段
        $result = [
            'id' => $info['id'],
            'name' => $info['name'],
            'tag' => $info['tag'],
            'originalPrice' => $info['originalPrice'],
            'price' => $info['price'],
            'monthlyFlow' => $info['monthlyFlow'],
            'duration' => $info['duration'],
            'discount' => $info->discount,
            'totalFlow' => $info->totalFlow,
            'privileges' => $info['privileges'],
        ];
        
        return successJson($result, '获取成功');
    }
    
    /**
     * 展示用户流量套餐使用情况
     * 
     * @return \think\Response
     */
    public function remainingFlow()
    {
        $params = $this->request->param();
        
        $userInfo = request()->userInfo;
        // 获取用户ID，通常应该从会话或令牌中获取
         $userId = $userInfo['id'];
   
        if (empty($userId)) {
            return errorJson('请先登录');
        }
        
        // 获取用户当前有效的流量套餐
        $userPackage = UserFlowPackageModel::getUserActivePackage($userId);
            
        if (empty($userPackage)) {
            return errorJson('您没有有效的流量套餐');
        }
        
        // 获取套餐详情
        $packageId = $userPackage['packageId'];
        $flowPackage = FlowPackageModel::where('id', $packageId)->where('isDel', 0)->find();
        
        if (empty($flowPackage)) {
            return errorJson('套餐信息不存在');
        }
        
        // 计算剩余流量
        $totalFlow = $userPackage['totalFlow'] ?? $flowPackage->totalFlow;  // 总流量
        $usedFlow = $userPackage['usedFlow'] ?? 0;  // 已使用流量
        $remainingFlow = $totalFlow - $usedFlow;  // 剩余流量
        $remainingFlow = $remainingFlow > 0 ? $remainingFlow : 0;  // 确保不为负数
        
        // 计算剩余天数
        $now = time();
        $expireTime = $userPackage['expireTime'];
        $remainingDays = ceil(($expireTime - $now) / 86400);  // 向上取整，剩余天数
        $remainingDays = $remainingDays > 0 ? $remainingDays : 0;  // 确保不为负数
        
        // 剩余百分比
        $flowPercentage = $totalFlow > 0 ? round(($remainingFlow / $totalFlow) * 100, 1) : 0;
        $timePercentage = $userPackage['duration'] > 0 ? 
            round(($remainingDays / ($userPackage['duration'] * 30)) * 100, 1) : 0;
        
        // 返回数据
        $result = [
            'packageName' => $flowPackage['name'],  // 套餐名称
            'remainingFlow' => $remainingFlow,  // 剩余流量(人)
            'totalFlow' => $totalFlow,  // 总流量(人)
            'flowPercentage' => $flowPercentage,  // 剩余流量百分比
            'remainingDays' => $remainingDays,  // 剩余天数
            'totalDays' => $userPackage['duration'] * 30,  // 总天数(按30天/月计算)
            'timePercentage' => $timePercentage,  // 剩余时间百分比
            'expireTime' => date('Y-m-d', $expireTime),  // 到期日期
            'startTime' => date('Y-m-d', $userPackage['startTime']),  // 开始日期
        ];
        
        return successJson($result, '获取成功');
    }
    
    /**
     * 创建流量采购订单
     * 
     * @return \think\Response
     */
    public function createOrder()
    {
        $params = $this->request->param();
        
        $userInfo = request()->userInfo;
        // 获取用户ID，通常应该从会话或令牌中获取
        $userId = $userInfo['id'];
        
        if (empty($userId)) {
            return errorJson('请先登录');
        }
        
        // 获取套餐ID
        $packageId = isset($params['packageId']) ? intval($params['packageId']) : 0;
        
        if (empty($packageId)) {
            return errorJson('请选择套餐');
        }
        
        // 查询套餐信息
        $flowPackage = FlowPackageModel::where('id', $packageId)->where('isDel', 0)->find();
        
        if (empty($flowPackage)) {
            return errorJson('套餐不存在');
        }
        
        // 获取支付方式（可选）
        $payType = isset($params['payType']) ? $params['payType'] : 'wechat';
        
        // 套餐价格和信息
        $amount = floatval($flowPackage['price']);
        $packageName = $flowPackage['name'];
        $duration = intval($flowPackage['duration']);
        $remark = isset($params['remark']) ? $params['remark'] : '';
        
        // 处理金额为0的特殊情况
        if ($amount <= 0) {
            // 金额为0，无需支付，直接创建订单并设置为已支付
            $order = FlowPackageOrderModel::createOrder(
                $userId, 
                $packageId, 
                $packageName, 
                0, 
                $duration, 
                'nopay', 
                $remark
            );
            
            if (!$order) {
                return errorJson('订单创建失败');
            }
            
            // 创建用户流量套餐记录
            $this->createUserFlowPackage($userId, $packageId, $order['id']);
            
            // 返回成功信息
            return successJson(['orderNo' => $order['orderNo'],'status' => 'success'], '购买成功');
        } else {
            // 创建正常需要支付的订单
            $order = FlowPackageOrderModel::createOrder(
                $userId, 
                $packageId, 
                $packageName, 
                $amount, 
                $duration, 
                $payType, 
                $remark
            );
            
            if (!$order) {
                return errorJson('订单创建失败');
            }
            
            // 返回订单信息，前端需要跳转到支付页面
            return successJson([
                'orderNo' => $order['orderNo'],
                'amount' => $amount,
                'payType' => $payType,
                'status' => 'pending'
            ], '订单创建成功');
        }
    }
    
    /**
     * 创建用户流量套餐记录
     * 
     * @param int $userId 用户ID
     * @param int $packageId 套餐ID
     * @param int $orderId 订单ID
     * @return bool
     */
    private function createUserFlowPackage($userId, $packageId, $orderId)
    {
        // 获取套餐信息
        $flowPackage = FlowPackageModel::where('id', $packageId)->where('isDel', 0)->find();
        
        if (empty($flowPackage)) {
            return false;
        }
        
        // 计算到期时间（当前时间 + 套餐时长(月) * 30天）
        $now = time();
        $expireTime = $now + (intval($flowPackage['duration']) * 30 * 86400);
        
        // 用户流量套餐数据
        $data = [
            'userId' => $userId,
            'packageId' => $packageId,
            'orderId' => $orderId,
            'packageName' => $flowPackage['name'],
            'monthlyFlow' => $flowPackage['monthlyFlow'],
            'duration' => $flowPackage['duration'],
            'totalFlow' => $flowPackage->totalFlow, // 使用计算属性获取总流量
            'usedFlow' => 0,
            'startTime' => $now,
            'expireTime' => $expireTime,
            'status' => 1, // 1:有效 0:无效
            'isDel' => 0
        ];
        
        // 创建用户流量套餐记录
        return UserFlowPackageModel::create($data) ? true : false;
    }
}
