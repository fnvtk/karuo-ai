<?php

namespace app\cunkebao\controller\workbench;

use think\Controller;
use think\Db;

/**
 * 工作台 - 流量分发相关功能
 */
class WorkbenchTrafficController extends Controller
{
    /**
     * 获取流量分发记录列表
     * @return \think\response\Json
     */
    public function getTrafficDistributionRecords()
    {
        $page = $this->request->param('page', 1);
        $limit = $this->request->param('limit', 10);
        $workbenchId = $this->request->param('workbenchId', 0);

        $where = [
            ['wtdi.workbenchId', '=', $workbenchId]
        ];

        // 查询分发记录
        $list = Db::name('workbench_traffic_distribution_item')->alias('wtdi')
            ->join(['s2_wechat_account' => 'wa'], 'wa.id = wtdi.wechatAccountId', 'left')
            ->join(['s2_wechat_friend' => 'wf'], 'wf.id = wtdi.wechatFriendId', 'left')
            ->field([
                'wtdi.id',
                'wtdi.workbenchId',
                'wtdi.wechatAccountId',
                'wtdi.wechatFriendId',
                'wtdi.createTime as distributeTime',
                'wtdi.status',
                'wtdi.errorMsg',
                'wa.nickName as operatorName',
                'wa.avatar as operatorAvatar',
                'wf.nickName as friendName',
                'wf.avatar as friendAvatar',
                'wf.gender',
                'wf.province',
                'wf.city'
            ])
            ->where($where)
            ->order('wtdi.createTime', 'desc')
            ->page($page, $limit)
            ->select();

        // 处理数据
        foreach ($list as &$item) {
            // 处理时间格式
            $item['distributeTime'] = date('Y-m-d H:i:s', $item['distributeTime']);

            // 处理性别
            $genderMap = [
                0 => '未知',
                1 => '男',
                2 => '女'
            ];
            $item['genderText'] = $genderMap[$item['gender']] ?? '未知';

            // 处理状态文字
            $statusMap = [
                0 => '待分发',
                1 => '分发成功',
                2 => '分发失败'
            ];
            $item['statusText'] = $statusMap[$item['status']] ?? '未知状态';
        }

        // 获取总记录数
        $total = Db::name('workbench_traffic_distribution_item')->alias('wtdi')
            ->where($where)
            ->count();

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
    }

    /**
     * 获取流量分发统计
     * @return \think\response\Json
     */
    public function getTrafficDistributionStats()
    {
        $workbenchId = $this->request->param('workbenchId', 0);
        if (empty($workbenchId)) {
            return json(['code' => 400, 'msg' => '参数错误']);
        }

        // 获取今日数据
        $todayStart = strtotime(date('Y-m-d') . ' 00:00:00');
        $todayEnd = strtotime(date('Y-m-d') . ' 23:59:59');

        $todayStats = Db::name('workbench_traffic_distribution_item')
            ->where([
                ['workbenchId', '=', $workbenchId],
                ['createTime', 'between', [$todayStart, $todayEnd]]
            ])
            ->field([
                'COUNT(*) as total',
                'SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as success',
                'SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) as failed'
            ])
            ->find();

        // 获取总数据
        $totalStats = Db::name('workbench_traffic_distribution_item')
            ->where('workbenchId', $workbenchId)
            ->field([
                'COUNT(*) as total',
                'SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as success',
                'SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) as failed'
            ])
            ->find();

        return json([
            'code' => 200,
            'msg' => '获取成功',
            'data' => [
                'today' => [
                    'total' => intval($todayStats['total']),
                    'success' => intval($todayStats['success']),
                    'failed' => intval($todayStats['failed'])
                ],
                'total' => [
                    'total' => intval($totalStats['total']),
                    'success' => intval($totalStats['success']),
                    'failed' => intval($totalStats['failed'])
                ]
            ]
        ]);
    }

    /**
     * 获取流量分发详情
     * @return \think\response\Json
     */
    public function getTrafficDistributionDetail()
    {
        $id = $this->request->param('id', 0);
        if (empty($id)) {
            return json(['code' => 400, 'msg' => '参数错误']);
        }

        $detail = Db::name('workbench_traffic_distribution_item')->alias('wtdi')
            ->join(['s2_wechat_account' => 'wa'], 'wa.id = wtdi.wechatAccountId', 'left')
            ->join(['s2_wechat_friend' => 'wf'], 'wf.id = wtdi.wechatFriendId', 'left')
            ->field([
                'wtdi.id',
                'wtdi.workbenchId',
                'wtdi.wechatAccountId',
                'wtdi.wechatFriendId',
                'wtdi.createTime as distributeTime',
                'wtdi.status',
                'wtdi.errorMsg',
                'wa.nickName as operatorName',
                'wa.avatar as operatorAvatar',
                'wf.nickName as friendName',
                'wf.avatar as friendAvatar',
                'wf.gender',
                'wf.province',
                'wf.city',
                'wf.signature',
                'wf.remark'
            ])
            ->where('wtdi.id', $id)
            ->find();

        if (empty($detail)) {
            return json(['code' => 404, 'msg' => '记录不存在']);
        }

        // 处理数据
        $detail['distributeTime'] = date('Y-m-d H:i:s', $detail['distributeTime']);

        // 处理性别
        $genderMap = [
            0 => '未知',
            1 => '男',
            2 => '女'
        ];
        $detail['genderText'] = $genderMap[$detail['gender']] ?? '未知';

        // 处理状态文字
        $statusMap = [
            0 => '待分发',
            1 => '分发成功',
            2 => '分发失败'
        ];
        $detail['statusText'] = $statusMap[$detail['status']] ?? '未知状态';

        return json([
            'code' => 200,
            'msg' => '获取成功',
            'data' => $detail
        ]);
    }

    /**
     * 创建流量分发计划
     * @return \think\response\Json
     */
    public function createTrafficPlan()
    {
        $param = $this->request->post();
        Db::startTrans();
        try {
            // 1. 创建主表
            $planId = Db::name('ck_workbench')->insertGetId([
                'name' => $param['name'],
                'type' => 5, // TYPE_TRAFFIC_DISTRIBUTION
                'status' => 1,
                'autoStart' => $param['autoStart'] ?? 0,
                'userId' => $this->request->userInfo['id'],
                'companyId' => $this->request->userInfo['companyId'],
                'createTime' => time(),
                'updateTime' => time()
            ]);
            // 2. 创建扩展表
            Db::name('ck_workbench_traffic_config')->insert([
                'workbenchId' => $planId,
                'distributeType' => $param['distributeType'],
                'maxPerDay' => $param['maxPerDay'],
                'timeType' => $param['timeType'],
                'startTime' => $param['startTime'],
                'endTime' => $param['endTime'],
                'targets' => json_encode($param['targets'], JSON_UNESCAPED_UNICODE),
                'pools' => json_encode($param['poolGroups'], JSON_UNESCAPED_UNICODE),
                'createTime' => time(),
                'updateTime' => time()
            ]);
            Db::commit();
            return json(['code' => 200, 'msg' => '创建成功']);
        } catch (\Exception $e) {
            Db::rollback();
            return json(['code' => 500, 'msg' => '创建失败:' . $e->getMessage()]);
        }
    }

    /**
     * 获取流量列表
     * @return \think\response\Json
     */
    public function getTrafficList()
    {
        $companyId = $this->request->userInfo['companyId'];
        $page = $this->request->param('page', 1);
        $limit = $this->request->param('limit', 10);
        $keyword = $this->request->param('keyword', '');
        $workbenchId = $this->request->param('workbenchId', '');
        $isRecycle = $this->request->param('isRecycle', '');
        if (empty($workbenchId)) {
            return json(['code' => 400, 'msg' => '参数错误']);
        }

        $workbench = Db::name('workbench')->where(['id' => $workbenchId, 'isDel' => 0, 'companyId' => $companyId, 'type' => 5])->find();

        if (empty($workbench)) {
            return json(['code' => 400, 'msg' => '该任务不存在或已删除']);
        }
        $query = Db::name('workbench_traffic_config_item')->alias('wtc')
            ->join(['s2_wechat_friend' => 'wf'], 'wtc.wechatFriendId = wf.id')
            ->join('users u', 'wtc.wechatAccountId = u.s2_accountId', 'left')
            ->field([
                'wtc.id', 'wtc.isRecycle', 'wtc.isRecycle', 'wtc.createTime','wtc.recycleTime',
                'wf.wechatId', 'wf.alias', 'wf.nickname', 'wf.avatar', 'wf.gender', 'wf.phone',
                'u.account', 'u.username'
            ])
            ->where(['wtc.workbenchId' => $workbenchId])
            ->order('wtc.id DESC');

        if (!empty($keyword)) {
            $query->where('wf.wechatId|wf.alias|wf.nickname|wf.phone|u.account|u.username', 'like', '%' . $keyword . '%');
        }

        if ($isRecycle != '' || $isRecycle != null) {
            $query->where('isRecycle',$isRecycle);
        }

        $total = $query->count();
        $list = $query->page($page, $limit)->select();

        foreach ($list as &$item) {
            $item['createTime'] = date('Y-m-d H:i:s', $item['createTime']);
            $item['recycleTime'] = date('Y-m-d H:i:s', $item['recycleTime']);
        }
        unset($item);

        $data = [
            'total' => $total,
            'list' => $list,
        ];

        return json(['code' => 200, 'msg' => '获取成功', 'data' => $data]);
    }
}



