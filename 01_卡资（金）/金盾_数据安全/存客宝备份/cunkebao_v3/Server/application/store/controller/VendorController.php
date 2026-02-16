<?php

namespace app\store\controller;

use app\store\model\VendorPackageModel;
use app\store\model\VendorProjectModel;
use app\store\model\VendorOrderModel;
use think\facade\Log;
use think\Db;

/**
 * 套餐控制器
 */
class VendorController extends BaseController
{
    /**
     * 获取套餐列表
     *
     * @return \think\response\Json
     */
    public function getList()
    {
        try {
            $page = $this->request->param('page', 1);
            $limit = $this->request->param('limit', 10);
            $keyword = $this->request->param('keyword', '');
            $status = $this->request->param('status', '');
            
            $where = [
                ['isDel', '=', 0]
            ];
            
            // 关键词搜索
            if (!empty($keyword)) {
                $where[] = ['name', 'like', "%{$keyword}%"];
            }
            
            // 状态筛选
            if ($status !== '') {
                $where[] = ['status', '=', $status];
            }
            
            $list = VendorPackageModel::where($where)
                ->order('id', 'desc')
                ->page($page, $limit)
                ->select();
                
            $total = VendorPackageModel::where($where)->count();
            
            return json([
                'code' => 200, 
                'msg' => '获取成功',
                'data' => [
                    'list' => $list,
                    'total' => $total,
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('获取套餐列表失败：' . $e->getMessage());
            return json(['code' => 500, 'msg' => '获取失败：' . $e->getMessage()]);
        }
    }
    
    /**
     * 获取套餐详情
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
            
            // 查询套餐基本信息
            $package = VendorPackageModel::where([
                ['id', '=', $id],
                ['isDel', '=', 0]
            ])->find();
            
            if (empty($package)) {
                return json(['code' => 404, 'msg' => '套餐不存在']);
            }
            
            // 查询项目列表
            $projects = VendorProjectModel::where([
                ['packageId', '=', $id],
                ['isDel', '=', 0]
            ])->select();
            
            $package['projects'] = $projects;
            
            return json(['code' => 200, 'msg' => '获取成功', 'data' => $package]);
        } catch (\Exception $e) {
            Log::error('获取套餐详情失败：' . $e->getMessage());
            return json(['code' => 500, 'msg' => '获取失败：' . $e->getMessage()]);
        }
    }
    
    /**
     * 添加套餐
     *
     * @return \think\response\Json
     */
    public function add()
    {
        try {
            if (!$this->request->isPost()) {
                return json(['code' => 400, 'msg' => '请求方式错误']);
            }
            
            $param = $this->request->post();
            
            // 参数验证
            if (empty($param['name'])) {
                return json(['code' => 400, 'msg' => '套餐名称不能为空']);
            }
            
            // 检查名称是否已存在
            $exists = VendorPackageModel::where([
                ['name', '=', $param['name']],
                ['isDel', '=', 0]
            ])->find();
            
            if ($exists) {
                return json(['code' => 400, 'msg' => '该套餐名称已存在']);
            }
            
            Db::startTrans();
            try {
                // 创建套餐
                $package = new VendorPackageModel;
                $package->name = $param['name'];
                $package->originalPrice = $param['originalPrice'] ?? 0;
                $package->price = $param['price'] ?? 0;
                $package->discount = $param['discount'] ?? 0;
                $package->advancePayment = $param['advancePayment'] ?? 0;
                $package->tags = $param['tags'] ?? '';
                $package->description = $param['description'] ?? '';
                $package->cover = $param['cover'] ?? '';
                $package->status = $param['status'] ?? 1;
                $package->createTime = time();
                $package->updateTime = time();
                $package->save();
                
                // 处理项目信息
                if (!empty($param['projects']) && is_array($param['projects'])) {
                    foreach ($param['projects'] as $projectData) {
                        if (empty($projectData['name'])) {
                            continue;
                        }
                        
                        // 创建项目
                        $project = new VendorProjectModel;
                        $project->packageId = $package->id;
                        $project->name = $projectData['name'];
                        $project->originalPrice = $projectData['originalPrice'] ?? 0;
                        $project->price = $projectData['price'] ?? 0;
                        $project->duration = $projectData['duration'] ?? 0;
                        $project->image = $projectData['image'] ?? '';
                        $project->detail = $projectData['detail'] ?? '';
                        $project->createTime = time();
                        $project->updateTime = time();
                        $project->save();
                    }
                }
                
                Db::commit();
                return json(['code' => 200, 'msg' => '添加成功', 'data' => ['id' => $package->id]]);
            } catch (\Exception $e) {
                Db::rollback();
                Log::error('添加套餐失败：' . $e->getMessage());
                return json(['code' => 500, 'msg' => '添加失败：' . $e->getMessage()]);
            }
        } catch (\Exception $e) {
            Log::error('添加套餐异常：' . $e->getMessage());
            return json(['code' => 500, 'msg' => '添加异常：' . $e->getMessage()]);
        }
    }
    
    /**
     * 编辑套餐
     *
     * @return \think\response\Json
     */
    public function edit()
    {
        try {
            if (!$this->request->isPost()) {
                return json(['code' => 400, 'msg' => '请求方式错误']);
            }
            
            $param = $this->request->post();
            
            // 参数验证
            if (empty($param['id'])) {
                return json(['code' => 400, 'msg' => '参数错误']);
            }
            
            if (empty($param['name'])) {
                return json(['code' => 400, 'msg' => '套餐名称不能为空']);
            }
            
            // 检查套餐是否存在
            $package = VendorPackageModel::where([
                ['id', '=', $param['id']],
                ['isDel', '=', 0]
            ])->find();
            
            if (!$package) {
                return json(['code' => 404, 'msg' => '套餐不存在']);
            }
            
            // 检查名称是否已存在
            $exists = VendorPackageModel::where([
                ['name', '=', $param['name']],
                ['id', '<>', $param['id']],
                ['isDel', '=', 0]
            ])->find();
            
            if ($exists) {
                return json(['code' => 400, 'msg' => '该套餐名称已存在']);
            }
            
            Db::startTrans();
            try {
                // 更新套餐
                $package->name = $param['name'];
                $package->originalPrice = $param['originalPrice'] ?? $package->originalPrice;
                $package->price = $param['price'] ?? $package->price;
                $package->discount = $param['discount'] ?? $package->discount;
                $package->advancePayment = $param['advancePayment'] ?? $package->advancePayment;
                $package->tags = $param['tags'] ?? $package->tags;
                $package->description = $param['description'] ?? $package->description;
                $package->cover = $param['cover'] ?? $package->cover;
                $package->status = $param['status'] ?? $package->status;
                $package->updateTime = time();
                $package->save();
                
                Db::commit();
                return json(['code' => 200, 'msg' => '更新成功']);
            } catch (\Exception $e) {
                Db::rollback();
                Log::error('更新套餐失败：' . $e->getMessage());
                return json(['code' => 500, 'msg' => '更新失败：' . $e->getMessage()]);
            }
        } catch (\Exception $e) {
            Log::error('编辑套餐异常：' . $e->getMessage());
            return json(['code' => 500, 'msg' => '编辑异常：' . $e->getMessage()]);
        }
    }
    
    /**
     * 删除套餐
     *
     * @return \think\response\Json
     */
    public function delete()
    {
        try {
            $id = $this->request->param('id', 0);
            
            if (empty($id)) {
                return json(['code' => 400, 'msg' => '参数错误']);
            }
            
            // 检查套餐是否存在
            $package = VendorPackageModel::where([
                ['id', '=', $id],
                ['isDel', '=', 0]
            ])->find();
            
            if (!$package) {
                return json(['code' => 404, 'msg' => '套餐不存在']);
            }
            
            Db::startTrans();
            try {
                // 软删除套餐
                $package->isDel = 1;
                $package->updateTime = time();
                $package->save();
                
                // 软删除关联的项目
                VendorProjectModel::where('packageId', $id)
                    ->update([
                        'isDel' => 1,
                        'updateTime' => time()
                    ]);
                
                Db::commit();
                return json(['code' => 200, 'msg' => '删除成功']);
            } catch (\Exception $e) {
                Db::rollback();
                Log::error('删除套餐失败：' . $e->getMessage());
                return json(['code' => 500, 'msg' => '删除失败：' . $e->getMessage()]);
            }
        } catch (\Exception $e) {
            Log::error('删除套餐异常：' . $e->getMessage());
            return json(['code' => 500, 'msg' => '删除异常：' . $e->getMessage()]);
        }
    }
    
    /**
     * 添加项目
     *
     * @return \think\response\Json
     */
    public function addProject()
    {
        try {
            if (!$this->request->isPost()) {
                return json(['code' => 400, 'msg' => '请求方式错误']);
            }
            
            $param = $this->request->post();
            
            // 参数验证
            if (empty($param['packageId'])) {
                return json(['code' => 400, 'msg' => '套餐ID不能为空']);
            }
            
            if (empty($param['name'])) {
                return json(['code' => 400, 'msg' => '项目名称不能为空']);
            }
            
            // 检查套餐是否存在
            $package = VendorPackageModel::where([
                ['id', '=', $param['packageId']],
                ['isDel', '=', 0]
            ])->find();
            
            if (!$package) {
                return json(['code' => 404, 'msg' => '套餐不存在']);
            }
            
            try {
                // 创建项目
                $project = new VendorProjectModel;
                $project->packageId = $param['packageId'];
                $project->name = $param['name'];
                $project->originalPrice = $param['originalPrice'] ?? 0;
                $project->price = $param['price'] ?? 0;
                $project->duration = $param['duration'] ?? 0;
                $project->image = $param['image'] ?? '';
                $project->detail = $param['detail'] ?? '';
                $project->createTime = time();
                $project->updateTime = time();
                $project->save();
                
                return json(['code' => 200, 'msg' => '添加成功', 'data' => ['id' => $project->id]]);
            } catch (\Exception $e) {
                Log::error('添加项目失败：' . $e->getMessage());
                return json(['code' => 500, 'msg' => '添加失败：' . $e->getMessage()]);
            }
        } catch (\Exception $e) {
            Log::error('添加项目异常：' . $e->getMessage());
            return json(['code' => 500, 'msg' => '添加异常：' . $e->getMessage()]);
        }
    }
    
    /**
     * 编辑项目
     *
     * @return \think\response\Json
     */
    public function editProject()
    {
        try {
            if (!$this->request->isPost()) {
                return json(['code' => 400, 'msg' => '请求方式错误']);
            }
            
            $param = $this->request->post();
            
            // 参数验证
            if (empty($param['id'])) {
                return json(['code' => 400, 'msg' => '项目ID不能为空']);
            }
            
            if (empty($param['name'])) {
                return json(['code' => 400, 'msg' => '项目名称不能为空']);
            }
            
            // 检查项目是否存在
            $project = VendorProjectModel::where([
                ['id', '=', $param['id']],
                ['isDel', '=', 0]
            ])->find();
            
            if (!$project) {
                return json(['code' => 404, 'msg' => '项目不存在']);
            }
            
            try {
                // 更新项目
                $project->name = $param['name'];
                $project->originalPrice = $param['originalPrice'] ?? $project->originalPrice;
                $project->price = $param['price'] ?? $project->price;
                $project->duration = $param['duration'] ?? $project->duration;
                $project->image = $param['image'] ?? $project->image;
                $project->detail = $param['detail'] ?? $project->detail;
                $project->updateTime = time();
                $project->save();
                
                return json(['code' => 200, 'msg' => '更新成功']);
            } catch (\Exception $e) {
                Log::error('更新项目失败：' . $e->getMessage());
                return json(['code' => 500, 'msg' => '更新失败：' . $e->getMessage()]);
            }
        } catch (\Exception $e) {
            Log::error('编辑项目异常：' . $e->getMessage());
            return json(['code' => 500, 'msg' => '编辑异常：' . $e->getMessage()]);
        }
    }
    
    /**
     * 删除项目
     *
     * @return \think\response\Json
     */
    public function deleteProject()
    {
        try {
            $id = $this->request->param('id', 0);
            
            if (empty($id)) {
                return json(['code' => 400, 'msg' => '参数错误']);
            }
            
            // 检查项目是否存在
            $project = VendorProjectModel::where([
                ['id', '=', $id],
                ['isDel', '=', 0]
            ])->find();
            
            if (!$project) {
                return json(['code' => 404, 'msg' => '项目不存在']);
            }
            
            try {
                // 软删除项目
                $project->isDel = 1;
                $project->updateTime = time();
                $project->save();
                
                return json(['code' => 200, 'msg' => '删除成功']);
            } catch (\Exception $e) {
                Log::error('删除项目失败：' . $e->getMessage());
                return json(['code' => 500, 'msg' => '删除失败：' . $e->getMessage()]);
            }
        } catch (\Exception $e) {
            Log::error('删除项目异常：' . $e->getMessage());
            return json(['code' => 500, 'msg' => '删除异常：' . $e->getMessage()]);
        }
    }
    
    /**
     * 创建订单
     *
     * @return \think\response\Json
     */
    public function createOrder()
    {
        try {
            if (!$this->request->isPost()) {
                return json(['code' => 400, 'msg' => '请求方式错误']);
            }
            
            $param = $this->request->post();
            
            // 参数验证
            if (empty($param['packageId'])) {
                return json(['code' => 400, 'msg' => '套餐ID不能为空']);
            }
            
            // 检查套餐是否存在
            $package = VendorPackageModel::where([
                ['id', '=', $param['packageId']],
                ['isDel', '=', 0],
                ['status', '=', 1]
            ])->find();
            
            if (!$package) {
                return json(['code' => 404, 'msg' => '套餐不存在或已下架']);
            }
            
            // 获取当前用户信息
            $userId = $this->request->userInfo['id'];
            
            if (empty($userId)) {
                return json(['code' => 401, 'msg' => '请先登录']);
            }
            
            Db::startTrans();
            try {
                // 生成订单
                $order = new VendorOrderModel;
                $order->orderNo = VendorOrderModel::generateOrderNo();
                $order->userId = $userId;
                $order->packageId = $package->id;
                $order->packageName = $package->name;
                $order->totalAmount = $package->price;
                $order->payAmount = $package->price;
                $order->advancePayment = $package->advancePayment;
                $order->status = VendorOrderModel::STATUS_UNPAID;
                $order->remark = $param['remark'] ?? '';
                $order->createTime = time();
                $order->updateTime = time();
                $order->save();
                
                Db::commit();
                return json([
                    'code' => 200, 
                    'msg' => '订单创建成功', 
                    'data' => [
                        'orderId' => $order->id,
                        'orderNo' => $order->orderNo
                    ]
                ]);
            } catch (\Exception $e) {
                Db::rollback();
                Log::error('创建订单失败：' . $e->getMessage());
                return json(['code' => 500, 'msg' => '创建订单失败：' . $e->getMessage()]);
            }
        } catch (\Exception $e) {
            Log::error('创建订单异常：' . $e->getMessage());
            return json(['code' => 500, 'msg' => '创建订单异常：' . $e->getMessage()]);
        }
    }
}