<?php

namespace app\cunkebao\controller\plan;

use library\ResponseHelper;
use think\Db;
use app\cunkebao\controller\BaseController;

/**
 * 获取计划任务列表控制器
 */
class GetCreateAddFriendPlanV1Controller extends BaseController
{
    /**
     * 生成唯一API密钥
     * 
     * @return string
     */
    private function generateApiKey()
    {
        // 生成6组随机字符串，每组5个字符
        $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        $apiKey = '';
        
        for ($i = 0; $i < 6; $i++) {
            $segment = '';
            for ($j = 0; $j < 5; $j++) {
                $segment .= $chars[mt_rand(0, strlen($chars) - 1)];
            }
            $apiKey .= ($i > 0 ? '-' : '') . $segment;
        }
        
        // 检查是否已存在
        $exists = Db::name('customer_acquisition_task')
            ->where('apiKey', $apiKey)
            ->find();
            
        if ($exists) {
            // 如果已存在，递归重新生成
            return $this->generateApiKey();
        }
        
        return $apiKey;
    }

    /**
     * 拷贝计划任务
     *
     * @return \think\response\Json
     */
    public function copy()
    {
        try {
            $params = $this->request->param();
            $planId = isset($params['planId']) ? intval($params['planId']) : 0;

            if ($planId <= 0) {
                return ResponseHelper::error('计划ID不能为空', 400);
            }

            $plan = Db::name('customer_acquisition_task')->where('id', $planId)->find();
            if (!$plan) {
                return ResponseHelper::error('计划不存在', 404);
            }

            unset($plan['id']);
            $plan['name'] = $plan['name'] . ' (拷贝)';
            $plan['createTime'] = time();
            $plan['updateTime'] = time();
            $plan['apiKey'] = $this->generateApiKey(); // 生成新的API密钥

            $newPlanId = Db::name('customer_acquisition_task')->insertGetId($plan);
            if (!$newPlanId) {
                return ResponseHelper::error('拷贝计划失败', 500);
            }

            return ResponseHelper::success(['planId' => $newPlanId], '拷贝计划任务成功');
        } catch (\Exception $e) {
            return ResponseHelper::error('系统错误: ' . $e->getMessage(), 500);
        }
    }

    /**
     * 删除计划任务
     *
     * @return \think\response\Json
     */
    public function delete()
    {
        try {
            $params = $this->request->param();
            $planId = isset($params['planId']) ? intval($params['planId']) : 0;

            if ($planId <= 0) {
                return ResponseHelper::error('计划ID不能为空', 400);
            }

            $result = Db::name('customer_acquisition_task')->where('id', $planId)->update(['deleteTime' => time()]);
            if (!$result) {
                return ResponseHelper::error('删除计划失败', 500);
            }

            return ResponseHelper::success([], '删除计划任务成功');
        } catch (\Exception $e) {
            return ResponseHelper::error('系统错误: ' . $e->getMessage(), 500);
        }
    }

    /**
     * 修改计划任务状态
     *
     * @return \think\response\Json
     */
    public function updateStatus()
    {
        try {
            $params = $this->request->param();
            $planId = isset($params['planId']) ? intval($params['planId']) : 0;
            $status = isset($params['status']) ? intval($params['status']) : 0;

            if ($planId <= 0) {
                return ResponseHelper::error('计划ID不能为空', 400);
            }

            $result = Db::name('customer_acquisition_task')->where('id', $planId)->update(['status' => $status, 'updateTime' => time()]);
            if (!$result) {
                return ResponseHelper::error('修改计划状态失败', 500);
            }

            return ResponseHelper::success([], '修改计划任务状态成功');
        } catch (\Exception $e) {
            return ResponseHelper::error('系统错误: ' . $e->getMessage(), 500);
        }
    }
} 