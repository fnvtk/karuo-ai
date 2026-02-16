<?php

namespace app\store\controller;

use app\store\model\VendorPackageModel;
use app\store\model\VendorProjectModel;
use app\store\model\VendorOrderModel;
use think\facade\Log;
use think\Db;

/**
 * 订单控制器
 */
class VendorOrderController extends BaseController
{
    /**
     * 获取订单列表
     *
     * @return \think\response\Json
     */
    public function getList()
    {
        try {
            $page = $this->request->param('page', 1);
            $limit = $this->request->param('limit', 10);
            $status = $this->request->param('status', '');
            $keyword = $this->request->param('keyword', '');
            
            // 获取当前用户信息
            $userId = $this->request->userInfo['id'];
            
            $where = [
                ['userId', '=', $userId]
            ];
            
            // 关键词搜索
            if (!empty($keyword)) {
                $where[] = ['orderNo|packageName', 'like', "%{$keyword}%"];
            }
            
            // 状态筛选
            if ($status !== '') {
                $where[] = ['status', '=', $status];
            }
            
            $list = VendorOrderModel::with(['package'])
                ->where($where)
                ->order('id', 'desc')
                ->page($page, $limit)
                ->select();
                
            $total = VendorOrderModel::where($where)->count();
            
            return json([
                'code' => 200, 
                'msg' => '获取成功',
                'data' => [
                    'list' => $list,
                    'total' => $total,
                    'page' => $page,
                    'limit' => $limit
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('获取订单列表失败：' . $e->getMessage());
            return json(['code' => 500, 'msg' => '获取失败：' . $e->getMessage()]);
        }
    }
    
    /**
     * 获取订单详情
     *
     * @return \think\response\Json
     */
    public function detail()
    {
        try {
            $id = $this->request->param('id', 0);
            
            if (empty($id)) {
                return json(['code' => 400, 'msg' => '参数错误']);
            }
            
            // 获取当前用户信息
            $userId = $this->request->userInfo['id'];
            
            // 查询订单
            $order = VendorOrderModel::with(['package'])
                ->where([
                    ['id', '=', $id],
                    ['userId', '=', $userId]
                ])->find();
            
            if (empty($order)) {
                return json(['code' => 404, 'msg' => '订单不存在']);
            }
            
            // 查询套餐项目
            if (!empty($order['package'])) {
                $projects = VendorProjectModel::where([
                    ['packageId', '=', $order['packageId']],
                    ['isDel', '=', 0]
                ])->select();
                
                $order['package']['projects'] = $projects;
            }
            
            return json(['code' => 200, 'msg' => '获取成功', 'data' => $order]);
        } catch (\Exception $e) {
            Log::error('获取订单详情失败：' . $e->getMessage());
            return json(['code' => 500, 'msg' => '获取失败：' . $e->getMessage()]);
        }
    }
    
    /**
     * 更新订单状态
     *
     * @return \think\response\Json
     */
    public function updateStatus()
    {
        try {
            if (!$this->request->isPost()) {
                return json(['code' => 400, 'msg' => '请求方式错误']);
            }
            
            $param = $this->request->post();
            
            // 参数验证
            if (empty($param['id'])) {
                return json(['code' => 400, 'msg' => '订单ID不能为空']);
            }
            
            if (!isset($param['status'])) {
                return json(['code' => 400, 'msg' => '订单状态不能为空']);
            }
            
            // 检查订单是否存在
            $order = VendorOrderModel::where('id', $param['id'])->find();
            
            if (!$order) {
                return json(['code' => 404, 'msg' => '订单不存在']);
            }
            
            // 检查状态是否有效
            $validStatus = [
                VendorOrderModel::STATUS_UNPAID,
                VendorOrderModel::STATUS_PAID,
                VendorOrderModel::STATUS_COMPLETED,
                VendorOrderModel::STATUS_CANCELED
            ];
            
            if (!in_array($param['status'], $validStatus)) {
                return json(['code' => 400, 'msg' => '无效的订单状态']);
            }
            
            // 更新订单状态
            $updateData = [
                'status' => $param['status'],
                'updateTime' => time()
            ];
            
            // 如果订单状态为已支付，记录支付时间
            if ($param['status'] == VendorOrderModel::STATUS_PAID) {
                $updateData['payTime'] = time();
            }
            
            try {
                $order->save($updateData);
                return json(['code' => 200, 'msg' => '更新成功']);
            } catch (\Exception $e) {
                Log::error('更新订单状态失败：' . $e->getMessage());
                return json(['code' => 500, 'msg' => '更新失败：' . $e->getMessage()]);
            }
        } catch (\Exception $e) {
            Log::error('更新订单状态异常：' . $e->getMessage());
            return json(['code' => 500, 'msg' => '更新异常：' . $e->getMessage()]);
        }
    }
    
    /**
     * 取消订单
     *
     * @return \think\response\Json
     */
    public function cancel()
    {
        try {
            if (!$this->request->isPost()) {
                return json(['code' => 400, 'msg' => '请求方式错误']);
            }
            
            $id = $this->request->param('id', 0);
            
            if (empty($id)) {
                return json(['code' => 400, 'msg' => '参数错误']);
            }
            
            // 获取当前用户信息
            $userId = $this->request->userInfo['id'];
            
            // 检查订单是否存在
            $order = VendorOrderModel::where([
                ['id', '=', $id],
                ['userId', '=', $userId],
                ['status', '=', VendorOrderModel::STATUS_UNPAID]
            ])->find();
            
            if (!$order) {
                return json(['code' => 404, 'msg' => '订单不存在或状态不允许取消']);
            }
            
            try {
                // 更新订单状态为已取消
                $order->status = VendorOrderModel::STATUS_CANCELED;
                $order->updateTime = time();
                $order->save();
                
                return json(['code' => 200, 'msg' => '取消成功']);
            } catch (\Exception $e) {
                Log::error('取消订单失败：' . $e->getMessage());
                return json(['code' => 500, 'msg' => '取消失败：' . $e->getMessage()]);
            }
        } catch (\Exception $e) {
            Log::error('取消订单异常：' . $e->getMessage());
            return json(['code' => 500, 'msg' => '取消异常：' . $e->getMessage()]);
        }
    }
}