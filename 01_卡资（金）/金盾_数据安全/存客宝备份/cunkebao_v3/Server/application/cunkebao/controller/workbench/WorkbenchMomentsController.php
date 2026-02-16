<?php

namespace app\cunkebao\controller\workbench;

use think\Controller;
use think\Db;

/**
 * 工作台 - 朋友圈同步相关功能
 */
class WorkbenchMomentsController extends Controller
{
    /**
     * 获取朋友圈发布记录列表
     * @return \think\response\Json
     */
    public function getMomentsRecords()
    {
        $page = $this->request->param('page', 1);
        $limit = $this->request->param('limit', 10);
        $workbenchId = $this->request->param('workbenchId', 0);

        $where = [
            ['wmsi.workbenchId', '=', $workbenchId]
        ];

        // 查询发布记录
        $list = Db::name('workbench_moments_sync_item')->alias('wmsi')
            ->join('content_item ci', 'ci.id = wmsi.contentId', 'left')
            ->join(['s2_wechat_account' => 'wa'], 'wa.id = wmsi.wechatAccountId', 'left')
            ->field([
                'wmsi.id',
                'wmsi.workbenchId',
                'wmsi.createTime as publishTime',
                'ci.contentType',
                'ci.content',
                'ci.resUrls',
                'ci.urls',
                'wa.nickName as operatorName',
                'wa.avatar as operatorAvatar'
            ])
            ->where($where)
            ->order('wmsi.createTime', 'desc')
            ->page($page, $limit)
            ->select();

        foreach ($list as &$item) {
            $item['resUrls'] = json_decode($item['resUrls'], true);
            $item['urls'] = json_decode($item['urls'], true);
        }


        // 获取总记录数
        $total = Db::name('workbench_moments_sync_item')->alias('wmsi')
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
     * 获取朋友圈发布统计
     * @return \think\response\Json
     */
    public function getMomentsStats()
    {
        $workbenchId = $this->request->param('workbenchId', 0);
        if (empty($workbenchId)) {
            return json(['code' => 400, 'msg' => '参数错误']);
        }

        // 获取今日数据
        $todayStart = strtotime(date('Y-m-d') . ' 00:00:00');
        $todayEnd = strtotime(date('Y-m-d') . ' 23:59:59');

        $todayStats = Db::name('workbench_moments_sync_item')
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
        $totalStats = Db::name('workbench_moments_sync_item')
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
}



