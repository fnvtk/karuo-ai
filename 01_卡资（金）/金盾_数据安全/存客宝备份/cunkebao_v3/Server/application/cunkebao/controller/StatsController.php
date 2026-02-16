<?php

namespace app\cunkebao\controller;

use think\Db;
use think\Controller;

class StatsController extends Controller
{


    const WEEK = [
        0 => '周日',
        1 => '周一',
        2 => '周二',
        3 => '周三',
        4 => '周四',
        5 => '周五',
        6 => '周六',
    ];

    /**
     * 基础信息
     * @return \think\response\Json
     */
    public function baseInfoStats()
    {

        $where = [
            ['departmentId','=',$this->request->userInfo['companyId']]
        ];
        if (empty($this->request->userInfo['isAdmin'])){
            $where[] = ['id','=',$this->request->userInfo['s2_accountId']];
        }
        $accounts = Db::table('s2_company_account')->where($where)->column('id');

        $deviceNum = Db::table('s2_device')->whereIn('currentAccountId',$accounts)->where(['isDeleted' => 0])->count();
        $wechatNum = Db::table('s2_wechat_account')->whereIn('deviceAccountId',$accounts)->count();
        $aliveWechatNum =  Db::table('s2_wechat_account')->whereIn('deviceAccountId',$accounts)->where(['wechatAlive' => 1])->count();
        $data = [
            'deviceNum' => $deviceNum,
            'wechatNum' => $wechatNum,
            'aliveWechatNum' => $aliveWechatNum,
        ];
        return successJson($data, '获取成功');
    }

    /**
     * 场景获客统计
     * @return \think\response\Json
     * @throws \think\db\exception\DataNotFoundException
     * @throws \think\db\exception\ModelNotFoundException
     * @throws \think\exception\DbException
     */
    public function planStats()
    {

        $num = $this->request->param('num', 4);
        $planScene = Db::name('plan_scene')
            ->field('id,name,image')
            ->where(['status' => 1])
            ->order('sort DESC')
            ->page(1, $num)
            ->select();

        if (empty($planScene)) {
            return successJson([], '获取成功');
        }

        $sceneIds = array_column($planScene, 'id');
        $companyId = $this->request->userInfo['companyId'];

        $stats = Db::name('customer_acquisition_task')->alias('ac')
            ->join('task_customer tc', 'tc.task_id = ac.id')
            ->where([
                ['ac.companyId', '=', $companyId],
                ['ac.deleteTime', '=', 0],
                ['ac.sceneId', 'in', $sceneIds],
            ])
            ->field([
                'ac.sceneId',
                Db::raw('COUNT(1) as allNum'),
                Db::raw("SUM(CASE WHEN tc.status IN (1,2,3,4) THEN 1 ELSE 0 END) as addNum"),
                Db::raw("SUM(CASE WHEN tc.status = 4 THEN 1 ELSE 0 END) as passNum"),
            ])
            ->group('ac.sceneId')
            ->select();

        $statsMap = [];
        foreach ($stats as $row) {
            $sceneId = is_array($row) ? ($row['sceneId'] ?? 0) : ($row->sceneId ?? 0);
            if (!$sceneId) {
                continue;
            }
            $statsMap[$sceneId] = [
                'allNum' => (int)(is_array($row) ? ($row['allNum'] ?? 0) : ($row->allNum ?? 0)),
                'addNum' => (int)(is_array($row) ? ($row['addNum'] ?? 0) : ($row->addNum ?? 0)),
                'passNum' => (int)(is_array($row) ? ($row['passNum'] ?? 0) : ($row->passNum ?? 0)),
            ];
        }

        foreach ($planScene as &$item) {
            $sceneStats = $statsMap[$item['id']] ?? ['allNum' => 0, 'addNum' => 0, 'passNum' => 0];
            $item['allNum'] = $sceneStats['allNum'];
            $item['addNum'] = $sceneStats['addNum'];
            $item['passNum'] = $sceneStats['passNum'];
        }
        unset($item);

        return successJson($planScene, '获取成功');
    }


    public function todayStats()
    {
        $date = date('Y-m-d',time());
        $start = strtotime($date . ' 00:00:00');
        $end = strtotime($date . ' 23:59:59');
        $companyId = $this->request->userInfo['companyId'];


        $momentsNum = Db::name('workbench')->alias('w')
            ->join('workbench_moments_sync_item wi', 'w.id = wi.workbenchId')
            ->where(['w.companyId' => $companyId])
            ->where('wi.createTime', 'between', [$start, $end])
            ->count();

        $groupPushNum = Db::name('workbench')->alias('w')
            ->join('workbench_group_push_item wi', 'w.id = wi.workbenchId')
            ->where(['w.companyId' => $companyId])
            ->where('wi.createTime', 'between', [$start, $end])
            ->count();


        $addNum = Db::name('customer_acquisition_task')->alias('ac')
            ->join('task_customer tc', 'tc.task_id = ac.id')
            ->where(['ac.companyId' => $companyId, 'ac.deleteTime' => 0])
            ->where('tc.updateTime', 'between', [$start, $end])
            ->whereIn('tc.status', [1, 2, 3, 4])
            ->count();

        // 通过量
        $passNum = Db::name('customer_acquisition_task')->alias('ac')
            ->join('task_customer tc', 'tc.task_id = ac.id')
            ->where(['ac.companyId' => $companyId, 'ac.deleteTime' => 0])
            ->where('tc.updateTime', 'between', [$start, $end])
            ->whereIn('tc.status', [4])
            ->count();

        if (!empty($passNum)){
            $passRate = number_format(($addNum / $passNum) * 100,2) ;
        }else{
            $passRate = '0%';
        }

        $sysActive = '90%';
        $data = [
            'momentsNum' => $momentsNum,
            'groupPushNum' => $groupPushNum,
            'addNum' => $addNum,
            'passNum' => $passNum,
            'passRate' => $passRate,
            'sysActive' => $sysActive,
        ];
        return successJson($data, '获取成功');
    }



    /**
     * 近7天获客统计
     * @return \think\response\Json
     */
    public function customerAcquisitionStats7Days()
    {
        $companyId = $this->request->userInfo['companyId'];
        $days = 7;

        $endTime = strtotime(date('Y-m-d 23:59:59'));
        $startTime = strtotime(date('Y-m-d 00:00:00', strtotime('-' . ($days - 1) . ' day')));

        $dateMap = [];
        $dateLabels = [];
        for ($i = 0; $i < $days; $i++) {
            $currentDate = date('Y-m-d', strtotime("-" . ($days - 1 - $i) . " day"));
            $weekIndex = date("w", strtotime($currentDate));
            $dateMap[$currentDate] = self::WEEK[$weekIndex];
            $dateLabels[] = self::WEEK[$weekIndex];
        }

        $baseWhere = [
            ['ac.companyId', '=', $companyId],
            ['ac.deleteTime', '=', 0],
        ];

        $fetchCounts = function (string $timeField, array $status = []) use ($baseWhere, $startTime, $endTime) {
            $query = Db::name('customer_acquisition_task')->alias('ac')
                ->join('task_customer tc', 'tc.task_id = ac.id')
                ->where($baseWhere)
                ->whereBetween('tc.' . $timeField, [$startTime, $endTime]);
            if (!empty($status)) {
                $query->whereIn('tc.status', $status);
            }
            $rows = $query->field([
                "FROM_UNIXTIME(tc.{$timeField}, '%Y-%m-%d')" => 'day',
                'COUNT(1)' => 'total'
            ])->group('day')->select();

            $result = [];
            foreach ($rows as $row) {
                $day = is_array($row) ? ($row['day'] ?? '') : ($row->day ?? '');
                $total = (int)(is_array($row) ? ($row['total'] ?? 0) : ($row->total ?? 0));
                if ($day) {
                    $result[$day] = $total;
                }
            }
            return $result;
        };

        $allNumDict = $fetchCounts('createTime');
        $addNumDict = $fetchCounts('updateTime', [1, 2, 3, 4]);
        $passNumDict = $fetchCounts('updateTime', [4]);

        $allNum = [];
        $addNum = [];
        $passNum = [];
        foreach (array_keys($dateMap) as $dateKey) {
            $allNum[] = $allNumDict[$dateKey] ?? 0;
            $addNum[] = $addNumDict[$dateKey] ?? 0;
            $passNum[] = $passNumDict[$dateKey] ?? 0;
        }

        $data = [
            'date' => $dateLabels,
            'allNum' => $allNum,
            'addNum' => $addNum,
            'passNum' => $passNum,
        ];

        return successJson($data, '获取成功');
    }


    /**
     * 场景获客数据统计
     * @return \think\response\Json
     * @throws \think\db\exception\DataNotFoundException
     * @throws \think\db\exception\ModelNotFoundException
     * @throws \think\exception\DbException
     */
    public function getFriendRequestTaskStats()
    {
        $companyId = $this->request->userInfo['companyId'];
        $taskId = $this->request->param('taskId', '');
        if(empty($taskId)){
            return errorJson('任务id不能为空');
        }

        $task = Db::name('customer_acquisition_task')->where(['id' => $taskId, 'companyId' => $companyId,'deleteTime' => 0])->find();
        if(empty($task)){
            return errorJson('任务不存在或已删除');
        }


        // 1. 获取startTime和endTime，格式是日期
        $startTime = $this->request->param('startTime', '');
        $endTime = $this->request->param('endTime', '');
        
        // 如果获取不到则默认为7天的跨度
        if (empty($startTime)) {
            $startTime = date('Y-m-d', time() - 86400 * 6);
        }
        if (empty($endTime)) {
            $endTime = date('Y-m-d', time());
        }
        
        // 转换成时间戳格式
        $startTimestamp = strtotime($startTime . ' 00:00:00');
        $endTimestamp = strtotime($endTime . ' 23:59:59');
        
        // 同时生成日期数组和时间戳二维数组
        $dateArray = [];
        $timestampArray = [];
        $currentTimestamp = $startTimestamp;
        
        while ($currentTimestamp <= $endTimestamp) {
            // 生成日期格式数组
            $dateArray[] = date('m-d', $currentTimestamp);
            
            // 生成时间戳二维数组
            $dayStart = $currentTimestamp;
            $dayEnd = strtotime('+1 day', $currentTimestamp) - 1; // 23:59:59
            $timestampArray[] = [$dayStart, $dayEnd];
            
            $currentTimestamp = strtotime('+1 day', $currentTimestamp);
        }


        // 使用分组聚合统计，减少 SQL 次数
        $allRows = Db::name('task_customer')
            ->field("FROM_UNIXTIME(createTime, '%m-%d') AS d, COUNT(*) AS c")
            ->where(['task_id' => $taskId])
            ->where('createTime', 'between', [$startTimestamp, $endTimestamp])
            ->group('d')
            ->select();

        $successRows = Db::name('task_customer')
            ->field("FROM_UNIXTIME(addTime, '%m-%d') AS d, COUNT(*) AS c")
            ->where(['task_id' => $taskId])
            ->where('addTime', 'between', [$startTimestamp, $endTimestamp])
            ->whereIn('status', [1, 2, 4, 5])
            ->group('d')
            ->select();

        $passRows = Db::name('task_customer')
            ->field("FROM_UNIXTIME(passTime, '%m-%d') AS d, COUNT(*) AS c")
            ->where(['task_id' => $taskId])
            ->where('passTime', 'between', [$startTimestamp, $endTimestamp])
            ->group('d')
            ->select();

        $errorRows = Db::name('task_customer')
            ->field("FROM_UNIXTIME(updateTime, '%m-%d') AS d, COUNT(*) AS c")
            ->where(['task_id' => $taskId, 'status' => 3])
            ->where('updateTime', 'between', [$startTimestamp, $endTimestamp])
            ->group('d')
            ->select();

        // 将分组结果映射到连续日期数组
        $mapToSeries = function(array $rows) use ($dateArray) {
            $dict = [];
            foreach ($rows as $row) {
                // 兼容对象/数组两种返回
                $d = is_array($row) ? ($row['d'] ?? '') : ($row->d ?? '');
                $c = (int)(is_array($row) ? ($row['c'] ?? 0) : ($row->c ?? 0));
                if ($d !== '') {
                    $dict[$d] = $c;
                }
            }
            $series = [];
            foreach ($dateArray as $d) {
                $series[] = $dict[$d] ?? 0;
            }
            return $series;
        };

        $allNumArray  = $mapToSeries($allRows);
        $successNumArray  = $mapToSeries($successRows);
        $passNumArray = $mapToSeries($passRows);
        $errorNumArray = $mapToSeries($errorRows);

        // 计算通过率和成功率
        $passRateArray = [];
        $successRateArray = [];
        
        for ($i = 0; $i < count($dateArray); $i++) {
            // 通过率 = 通过数 / 总数
            $passRate = ($allNumArray[$i] > 0) ? round(($passNumArray[$i] / $allNumArray[$i]) * 100, 2) : 0;
            $passRateArray[] = $passRate;
            
            // 成功率 = 成功数 / 总数
            $successRate = ($allNumArray[$i] > 0) ? round(($successNumArray[$i] / $allNumArray[$i]) * 100, 2) : 0;
            $successRateArray[] = $successRate;
        }

        // 计算总体统计
        $totalAll = array_sum($allNumArray);
        $totalSuccess = array_sum($successNumArray);
        $totalPass = array_sum($passNumArray);
        $totalError = array_sum($errorNumArray);
        
        $totalPassRate = ($totalAll > 0) ? round(($totalPass / $totalAll) * 100, 2) : 0;
        $totalSuccessRate = ($totalAll > 0) ? round(($totalSuccess / $totalAll) * 100, 2) : 0;

        // 返回结果
        $result = [
            'startTime' => $startTime,
            'endTime' => $endTime,
            'dateArray' => $dateArray,
            'allNumArray' => $allNumArray,
            'successNumArray' => $successNumArray,
            'passNumArray' => $passNumArray,
            'errorNumArray' => $errorNumArray,
            'passRateArray' => $passRateArray,
            'successRateArray' => $successRateArray,
            'totalStats' => [
                'totalAll' => $totalAll,
                'totalSuccess' => $totalSuccess,
                'totalPass' => $totalPass,
                'totalError' => $totalError,
                'totalPassRate' => $totalPassRate,
                'totalSuccessRate' => $totalSuccessRate
            ]
        ];
        
        return successJson($result, '获取成功');
    }


    public function userInfoStats()
    {
        $companyId = $this->request->userInfo['companyId'];
        $userId = $this->request->userInfo['id'];
        $isAdmin = $this->request->userInfo['isAdmin'];


        $where = [
            ['departmentId','=',$companyId]
        ];
        if (empty($this->request->userInfo['isAdmin'])){
            $where[] = ['id','=',$this->request->userInfo['s2_accountId']];
        }
        $accounts = Db::table('s2_company_account')->where($where)->column('id');
       

        $userNum = Db::table('s2_wechat_friend')->whereIn('accountId',$accounts)->where(['isDeleted' => 0])->count();
        $deviceNum = Db::table('s2_device')->whereIn('currentAccountId',$accounts)->where(['isDeleted' => 0])->count();
        $wechatNum = Db::table('s2_wechat_account')->whereIn('deviceAccountId',$accounts)->count();


        $contentLibrary = Db::name('content_library')->where(['companyId' => $companyId,'isDel' => 0]);
        if(empty($isAdmin)){
            $contentLibrary = $contentLibrary->where(['userId' => $userId]);
        }
        $contentLibraryNum = $contentLibrary->count();


        $data = [
          'deviceNum' => $deviceNum,
          'wechatNum' => $wechatNum,
          'contentLibraryNum' => $contentLibraryNum,
          'userNum' => $userNum,
        ];
        return successJson($data, '获取成功');
    }


}