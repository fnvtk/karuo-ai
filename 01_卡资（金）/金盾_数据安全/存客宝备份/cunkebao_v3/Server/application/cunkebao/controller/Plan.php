<?php

namespace app\cunkebao\controller;

use think\Controller;
use think\Db;
use think\facade\Request;
use library\ResponseHelper;

/**
 * 获客场景控制器
 */
class Plan extends Controller
{
    /**
     * 添加计划任务
     *
     * @return \think\response\Json
     */
    public function index()
    {
        try {
            // 获取表单数据
            $data = [
                'name' => Request::post('name', ''),
                'sceneId' => Request::post('sceneId', 0),
                'status' => Request::post('status', 0),
                'reqConf' => Request::post('reqConf', ''),
                'msgConf' => Request::post('msgConf', ''),
                'tagConf' => Request::post('tagConf', ''),
                'createTime' => time(),
                'updateTime' => time()
            ];

            // 验证必填字段
            if (empty($data['name'])) {
                return ResponseHelper::error('计划名称不能为空', 400);
            }

            if (empty($data['sceneId'])) {
                return ResponseHelper::error('场景ID不能为空', 400);
            }

            // 验证数据格式
            if (!$this->validateJson($data['reqConf'])) {
                return ResponseHelper::error('好友申请设置格式不正确', 400);
            }

            if (!$this->validateJson($data['msgConf'])) {
                return ResponseHelper::error('消息设置格式不正确', 400);
            }

            if (!$this->validateJson($data['tagConf'])) {
                return ResponseHelper::error('标签设置格式不正确', 400);
            }

            // 插入数据库
            $result = Db::name('friend_plan')->insert($data);

            if ($result) {
                return ResponseHelper::success([], '添加计划任务成功');
            } else {
                return ResponseHelper::error('添加计划任务失败', 500);
            }
        } catch (\Exception $e) {
            return ResponseHelper::error('系统错误: ' . $e->getMessage(), 500);
        }
    }

    /**
     * 获取计划任务列表
     *
     * @return \think\response\Json
     */
    public function getList()
    {
        try {
            // 获取分页参数
            $id = Request::param('id', 1);
            $page = Request::param('page', 1);
            $pageSize = Request::param('pageSize', 10);

            // 构建查询条件
            $where = [];

            // 过滤已删除的记录
            $where[] = ['deleteTime', 'null'];

            // 查询总数
            $total = Db::name('friend_plan')->where('sceneId', $id)->count();

            // 查询列表数据
            $list = Db::name('friend_plan')
                ->where('sceneId', $id)
                ->field('id, name, status, createTime, updateTime, sceneId')
                ->order('createTime desc')
                ->page($page, $pageSize)
                ->select();
            // 遍历列表，获取每个计划的统计信息
            foreach ($list as &$item) {
                // 获取计划的统计信息
                $stats = $this->getPlanStats($item['id']);
                
                // 合并统计信息到结果中
                $item = array_merge($item, $stats);
                
                // 格式化状态为文字描述
                $item['statusText'] = $item['status'] == 1 ? '进行中' : '已暂停';
                
                // 格式化时间
                $item['createTimeFormat'] = date('Y-m-d H:i', $item['createTime']);
                
                // 获取最近一次执行时间
                $lastExecution = $this->getLastExecution($item['id']);
                $item['lastExecutionTime'] = $lastExecution['lastTime'] ?? '';
                $item['nextExecutionTime'] = $lastExecution['nextTime'] ?? '';
            }
            
            // 返回结果
            $result = [
                'total' => $total,
                'list' => $list,
                'page' => $page,
                'pageSize' => $pageSize
            ];
            
            return ResponseHelper::success($result);
        } catch (\Exception $e) {
            return ResponseHelper::error('获取数据失败: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * 获取计划的统计信息
     *
     * @param int $planId 计划ID
     * @return array
     */
    private function getPlanStats($planId)
    {
        try {
            // 获取设备数
            $deviceCount = $this->getDeviceCount($planId);
            
            // 获取已获客数
            $customerCount = $this->getCustomerCount($planId);
            
            // 获取已添加数
            $addedCount = 1; //$this->getAddedCount($planId);
            
            // 计算通过率
            $passRate = $customerCount > 0 ? round(($addedCount / $customerCount) * 100) : 0;
            
            return [
                'deviceCount' => $deviceCount,
                'customerCount' => $customerCount,
                'addedCount' => $addedCount,
                'passRate' => $passRate
            ];
        } catch (\Exception $e) {
            return [
                'deviceCount' => 0,
                'customerCount' => 0,
                'addedCount' => 0,
                'passRate' => 0
            ];
        }
    }
    
    /**
     * 获取计划使用的设备数
     *
     * @param int $planId 计划ID
     * @return int
     */
    private function getDeviceCount($planId)
    {
        try {
            // 获取计划
            $plan = Db::name('friend_plan')->where('id', $planId)->find();
            if (!$plan) {
                return 0;
            }
            
            // 解析reqConf
            $reqConf = json_decode($plan['reqConf'], true);
            
            // 返回设备数量
            return isset($reqConf['selectedDevices']) ? count($reqConf['selectedDevices']) : 0;
        } catch (\Exception $e) {
            return 0;
        }
    }
    
    /**
     * 获取计划的已获客数
     *
     * @param int $planId 计划ID
     * @return int
     */
    private function getCustomerCount($planId)
    {
        // 模拟数据，实际应从相关表获取
        return rand(10, 50);
    }
    
    /**
     * 获取计划的已添加数
     *
     * @param int $planId 计划ID
     * @return int
     */
    private function getAddedCount($planId)
    {
        // 模拟数据，实际应从相关表获取
        $customerCount = $this->getCustomerCount($planId);
        return rand(5, $customerCount);
    }
    
    /**
     * 获取计划的最近一次执行时间
     *
     * @param int $planId 计划ID
     * @return array
     */
    private function getLastExecution($planId)
    {
        // 模拟数据，实际应从执行记录表获取
        $now = time();
        $lastTime = $now - rand(3600, 86400);
        $nextTime = $now + rand(3600, 86400);
        
        return [
            'lastTime' => date('Y-m-d H:i', $lastTime),
            'nextTime' => date('Y-m-d H:i:s', $nextTime)
        ];
    }

    /**
     * 验证JSON格式是否正确
     *
     * @param string $string
     * @return bool
     */
    private function validateJson($string)
    {
        if (empty($string)) {
            return true;
        }
        
        json_decode($string);
        return (json_last_error() == JSON_ERROR_NONE);
    }
} 