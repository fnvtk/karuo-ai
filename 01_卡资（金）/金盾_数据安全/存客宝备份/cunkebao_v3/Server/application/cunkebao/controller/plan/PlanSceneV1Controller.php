<?php

namespace app\cunkebao\controller\plan;

use library\ResponseHelper;
use think\Db;
use app\cunkebao\controller\BaseController;
use app\cunkebao\controller\plan\PosterWeChatMiniProgram;

/**
 * 获取计划任务列表控制器
 */
class PlanSceneV1Controller extends BaseController
{
    /**
     * 获取计划任务列表
     *
     * @return \think\response\Json
     */
    public function index()
    {
        try {
            $params = $this->request->param();
            $page = isset($params['page']) ? intval($params['page']) : 1;
            $limit = isset($params['limit']) ? intval($params['limit']) : 10;
            $keyword = isset($params['keyword']) ? trim($params['keyword']) : '';
            $sceneId = $this->request->param('sceneId','');
            $where = [
                'deleteTime' => 0,
                'companyId' => $this->getUserInfo('companyId'),
            ];
    
            if(!$this->getUserInfo('isAdmin')){
                $where['userId'] = $this->getUserInfo('id');
            }

            if(!empty($sceneId)){
                $where['sceneId'] = $sceneId;
            }

            if(!empty($keyword)){
                $where[] = ['name', 'like', '%' . $keyword . '%'];
            }


            $total = Db::name('customer_acquisition_task')->where($where)->count();
            $list = Db::name('customer_acquisition_task')
                ->where($where)
                ->order('createTime', 'desc')
                ->page($page, $limit)
                ->select();

            if (!empty($list)) {
                $taskIds = array_column($list, 'id');
                $statsMap = $this->buildTaskStats($taskIds);

                foreach($list as &$val){
                    $val['createTime'] = !empty($val['createTime']) ? date('Y-m-d H:i:s', $val['createTime']) : '';
                    $val['updateTime'] = !empty($val['updateTime']) ? date('Y-m-d H:i:s', $val['updateTime']) : '';
                    $val['sceneConf'] = json_decode($val['sceneConf'],true) ?: [];
                    $val['reqConf'] = json_decode($val['reqConf'],true) ?: [];
                    $val['msgConf'] = json_decode($val['msgConf'],true) ?: [];
                    $val['tagConf'] = json_decode($val['tagConf'],true) ?: [];
                    
                    // 确保 planType 有默认值（0=全局，1=独立，默认1）
                    if (!isset($val['planType'])) {
                        $val['planType'] = 1;
                    } else {
                        $val['planType'] = intval($val['planType']);
                    }

                    $stats = $statsMap[$val['id']] ?? [
                        'acquiredCount' => 0,
                        'addedCount' => 0,
                        'passCount' => 0,
                        'lastUpdated' => 0
                    ];

                    $val['acquiredCount'] = $stats['acquiredCount'];
                    $val['addedCount'] = $stats['addedCount'];
                    $val['passCount'] = $stats['passCount'];
                    $val['passRate'] = ($stats['addedCount'] > 0 && $stats['passCount'] > 0)
                        ? number_format(($stats['passCount'] / $stats['addedCount']) * 100, 2)
                        : 0;
                    $val['lastUpdated'] = !empty($stats['lastUpdated']) ? date('Y-m-d H:i', $stats['lastUpdated']) : '--';
                }
                unset($val);
            }
            return ResponseHelper::success([
                'total' => $total,
                'list' => $list
            ], '获取计划任务列表成功');
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

    /**
     * 获取获客计划设备列表
     *
     * @return \think\response\Json
     */
    public function getPlanDevices()
    {
        try {
            $params = $this->request->param();
            $planId = isset($params['planId']) ? intval($params['planId']) : 0;
            $page = isset($params['page']) ? intval($params['page']) : 1;
            $limit = isset($params['limit']) ? intval($params['limit']) : 10;
            $deviceStatus = isset($params['deviceStatus']) ? $params['deviceStatus'] : '';
            $searchKeyword = isset($params['searchKeyword']) ? trim($params['searchKeyword']) : '';

            // 验证计划ID
            if ($planId <= 0) {
                return ResponseHelper::error('计划ID不能为空', 400);
            }

            // 验证计划是否存在且用户有权限
            $plan = Db::name('customer_acquisition_task')
                ->where([
                    'id' => $planId,
                    'deleteTime' => 0,
                    'companyId' => $this->getUserInfo('companyId')
                ])
                ->find();

            if (!$plan) {
                return ResponseHelper::error('计划不存在或无权限访问', 404);
            }

            // 如果是管理员，需要验证用户权限
            if (!$this->getUserInfo('isAdmin')) {
                $userPlan = Db::name('customer_acquisition_task')
                    ->where([
                        'id' => $planId,
                        'userId' => $this->getUserInfo('id')
                    ])
                    ->find();
                
                if (!$userPlan) {
                    return ResponseHelper::error('您没有权限访问该计划', 403);
                }
            }

            // 构建查询条件
            $where = [
                'pt.plan_id' => $planId,
                'd.deleteTime' => 0,
                'd.companyId' => $this->getUserInfo('companyId')
            ];

            // 设备状态筛选
            if (!empty($deviceStatus)) {
                $where['d.alive'] = $deviceStatus;
            }

            // 搜索关键词
            $searchWhere = [];
            if (!empty($searchKeyword)) {
                $searchWhere[] = ['d.imei', 'like', "%{$searchKeyword}%"];
                $searchWhere[] = ['d.memo', 'like', "%{$searchKeyword}%"];
            }

            // 查询设备总数
            $totalQuery = Db::name('plan_task_device')->alias('pt')
                ->join('device d', 'pt.device_id = d.id')
                ->where($where);

            if (!empty($searchWhere)) {
                $totalQuery->where(function ($query) use ($searchWhere) {
                    foreach ($searchWhere as $condition) {
                        $query->whereOr($condition[0], $condition[1], $condition[2]);
                    }
                });
            }

            $total = $totalQuery->count();

            // 查询设备列表
            $listQuery = Db::name('plan_task_device')->alias('pt')
                ->join('device d', 'pt.device_id = d.id')
                ->field([
                    'd.id',
                    'd.imei',
                    'd.memo',
                    'd.alive',
                    'd.extra',
                    'd.createTime',
                    'd.updateTime',
                    'pt.status as plan_device_status',
                    'pt.createTime as assign_time'
                ])
                ->where($where)
                ->order('pt.createTime', 'desc');

            if (!empty($searchWhere)) {
                $listQuery->where(function ($query) use ($searchWhere) {
                    foreach ($searchWhere as $condition) {
                        $query->whereOr($condition[0], $condition[1], $condition[2]);
                    }
                });
            }

            $list = $listQuery->page($page, $limit)->select();

            // 处理设备数据
            foreach ($list as &$device) {
                // 格式化时间
                $device['createTime'] = date('Y-m-d H:i:s', $device['createTime']);
                $device['updateTime'] = date('Y-m-d H:i:s', $device['updateTime']);
                $device['assign_time'] = date('Y-m-d H:i:s', $device['assign_time']);

                // 解析设备额外信息
                if (!empty($device['extra'])) {
                    $extra = json_decode($device['extra'], true);
                    $device['battery'] = isset($extra['battery']) ? intval($extra['battery']) : 0;
                    $device['device_info'] = $extra;
                } else {
                    $device['battery'] = 0;
                    $device['device_info'] = [];
                }

                // 设备状态文本
                $device['alive_text'] = $this->getDeviceStatusText($device['alive']);
                $device['plan_device_status_text'] = $this->getPlanDeviceStatusText($device['plan_device_status']);

                // 获取设备当前微信登录信息
                $wechatLogin = Db::name('device_wechat_login')
                    ->where([
                        'deviceId' => $device['id'],
                        'companyId' => $this->getUserInfo('companyId'),
                        'alive' => 1
                    ])
                    ->order('createTime', 'desc')
                    ->find();

                $device['current_wechat'] = $wechatLogin ? [
                    'wechatId' => $wechatLogin['wechatId'],
                    'nickname' => $wechatLogin['nickname'] ?? '',
                    'loginTime' => date('Y-m-d H:i:s', $wechatLogin['createTime'])
                ] : null;

                // 获取设备在该计划中的任务统计
                $device['task_stats'] = $this->getDeviceTaskStats($device['id'], $planId);

                // 移除原始extra字段
                unset($device['extra']);
            }
            unset($device);

            return ResponseHelper::success([
                'total' => $total,
                'list' => $list,
                'plan_info' => [
                    'id' => $plan['id'],
                    'name' => $plan['name'],
                    'status' => $plan['status']
                ]
            ], '获取计划设备列表成功');

        } catch (\Exception $e) {
            return ResponseHelper::error('系统错误: ' . $e->getMessage(), 500);
        }
    }

    /**
     * 获取设备状态文本
     *
     * @param int $status
     * @return string
     */
    private function getDeviceStatusText($status)
    {
        $statusMap = [
            0 => '离线',
            1 => '在线',
            2 => '忙碌',
            3 => '故障'
        ];
        return isset($statusMap[$status]) ? $statusMap[$status] : '未知';
    }

    /**
     * 获取计划设备状态文本
     *
     * @param int $status
     * @return string
     */
    private function getPlanDeviceStatusText($status)
    {
        $statusMap = [
            0 => '待分配',
            1 => '已分配',
            2 => '执行中',
            3 => '已完成',
            4 => '已暂停',
            5 => '已取消'
        ];
        return isset($statusMap[$status]) ? $statusMap[$status] : '未知';
    }

    /**
     * 获取设备在指定计划中的任务统计
     *
     * @param int $deviceId
     * @param int $planId
     * @return array
     */
    private function getDeviceTaskStats($deviceId, $planId)
    {
        // 获取该设备在计划中的任务总数
        $totalTasks = Db::name('task_customer')
            ->where([
                'task_id' => $planId,
                'device_id' => $deviceId
            ])
            ->count();

        // 获取已完成的任务数
        $completedTasks = Db::name('task_customer')
            ->where([
                'task_id' => $planId,
                'device_id' => $deviceId,
                'status' => 4
            ])
            ->count();

        // 获取进行中的任务数
        $processingTasks = Db::name('task_customer')
            ->where([
                'task_id' => $planId,
                'device_id' => $deviceId,
                'status' => ['in', [1, 2, 3]]
            ])
            ->count();

        return [
            'total_tasks' => $totalTasks,
            'completed_tasks' => $completedTasks,
            'processing_tasks' => $processingTasks,
            'completion_rate' => $totalTasks > 0 ? round(($completedTasks / $totalTasks) * 100, 2) : 0
        ];
    }

    /**
     * 构建任务统计
     * @param array $taskIds
     * @return array
     */
    private function buildTaskStats(array $taskIds): array
    {
        if (empty($taskIds)) {
            return [];
        }

        $rows = Db::name('task_customer')
            ->whereIn('task_id', $taskIds)
            ->field([
                'task_id as taskId',
                'COUNT(1) as acquiredCount',
                "SUM(CASE WHEN status IN (1,2,3,4,5) THEN 1 ELSE 0 END) as addedCount",
                "SUM(CASE WHEN status IN (4,5) THEN 1 ELSE 0 END) as passCount",
                'MAX(updateTime) as lastUpdated'
            ])
            ->group('task_id')
            ->select();

        $stats = [];
        foreach ($rows as $row) {
            $taskId = is_array($row) ? ($row['taskId'] ?? 0) : ($row->taskId ?? 0);
            if (!$taskId) {
                continue;
            }
            $stats[$taskId] = [
                'acquiredCount' => (int)(is_array($row) ? ($row['acquiredCount'] ?? 0) : ($row->acquiredCount ?? 0)),
                'addedCount' => (int)(is_array($row) ? ($row['addedCount'] ?? 0) : ($row->addedCount ?? 0)),
                'passCount' => (int)(is_array($row) ? ($row['passCount'] ?? 0) : ($row->passCount ?? 0)),
                'lastUpdated' => (int)(is_array($row) ? ($row['lastUpdated'] ?? 0) : ($row->lastUpdated ?? 0)),
            ];
        }

        return $stats;
    }


    /**
     * 获取微信小程序码
     * @return \think\response\Json
     * @throws \think\db\exception\DataNotFoundException
     * @throws \think\db\exception\ModelNotFoundException
     * @throws \think\exception\DbException
     */
    public function getWxMinAppCode()
    {
        $params = $this->request->param();
        $taskId = isset($params['taskId']) ? intval($params['taskId']) : 0;
        $channelId = isset($params['channelId']) ? intval($params['channelId']) : 0;

        if($taskId <= 0) {
            return ResponseHelper::error('任务ID或场景ID不能为空', 400);
        }
        
        $task = Db::name('customer_acquisition_task')->where(['id' => $taskId, 'deleteTime' => 0])->find();
        if(!$task) {
            return ResponseHelper::error('任务不存在', 400);
        }

        // 如果提供了channelId，验证渠道是否存在且有效
        if ($channelId > 0) {
            $channel = Db::name('distribution_channel')
                ->where([
                    ['id', '=', $channelId],
                    ['companyId', '=', $task['companyId']],
                    ['status', '=', 'enabled'],
                    ['deleteTime', '=', 0]
                ])
                ->find();
            
            if (!$channel) {
                return ResponseHelper::error('分销渠道不存在或已被禁用', 400);
            }
        }

        $posterWeChatMiniProgram = new PosterWeChatMiniProgram();
        $result = $posterWeChatMiniProgram->generateMiniProgramCodeWithScene($taskId, $channelId);
        $result = json_decode($result, true);
        if ($result['code'] == 200){
            return ResponseHelper::success($result['data'], '获取小程序码成功');
        }else{
            return ResponseHelper::error('获取小程序失败：' . $result['msg']);
        }

    }


    /**
     * 获取已获客/已添加用户
     * @return \think\response\Json
     * @throws \think\db\exception\DataNotFoundException
     * @throws \think\db\exception\ModelNotFoundException
     * @throws \think\exception\DbException
     */
    public function getUserList(){
        $type = $this->request->param('type',1);
        $planId = $this->request->param('planId','');
        $page = $this->request->param('page',1);
        $pageSize = $this->request->param('pageSize',10);
        $keyword = $this->request->param('keyword','');

        if (!in_array($type, [1, 2])) {
            return ResponseHelper::error('类型错误');
        }

        if (empty($planId)){
            return ResponseHelper::error('获客场景id不能为空');
        }

       $task = Db::name('customer_acquisition_task')
           ->where(['id' => $planId, 'deleteTime' => 0,'companyId' => $this->getUserInfo('companyId')])
           ->find();
        if(empty($task)) {
            return ResponseHelper::error('活动不存在');
        }
        $query = Db::name('task_customer')->where(['task_id' => $task['id']]);

        if ($type == 2){
            $query = $query->whereIn('status',[4,5]);
        }

        if (!empty($keyword)) {
            $query = $query->where('name|phone|tags|siteTags', 'like', '%' . $keyword . '%');
        }

        $total = $query->count();
        $list  = $query->page($page, $pageSize)->order('id', 'desc')->select();
        foreach ($list as &$item) {
            unset($item['processed_wechat_ids'],$item['task_id']);
            $userinfo = Db::table('s2_wechat_friend')
                ->field('alias,wechatId,nickname,avatar')
                ->where('alias|wechatId|phone|conRemark','like','%'.$item['phone'].'%')
                ->order('id DESC')
                ->find();

            if (!empty($userinfo)) {
                $item['userinfo'] = $userinfo;
            }else{
                $item['userinfo'] = [];
            }

            $item['tags'] = json_decode($item['tags'], true);
            $item['siteTags'] = json_decode($item['siteTags'], true);
            $item['createTime'] = !empty($item['createTime']) ? date('Y-m-d H:i:s', $item['createTime']) : '';
            $item['updateTime'] = !empty($item['updateTime']) ? date('Y-m-d H:i:s', $item['updateTime']) : '';
        }



        $data = [
            'total' => $total,
            'list' => $list,
        ];
        return ResponseHelper::success($data,'获取成功');
    }



} 