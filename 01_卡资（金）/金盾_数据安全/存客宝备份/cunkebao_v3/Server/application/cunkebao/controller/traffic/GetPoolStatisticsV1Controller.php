<?php

namespace app\cunkebao\controller\traffic;

use app\common\model\TrafficSource as TrafficSourceModel;
use app\cunkebao\controller\BaseController;
use library\ResponseHelper;

/**
 * 流量池控制器
 */
class GetPoolStatisticsV1Controller extends BaseController
{
    /**
     * 获取今日转化数量
     *
     * @return int
     */
    protected function getTodayAddedCount(): int
    {
        return TrafficSourceModel::where(
            [
                'companyId' => $this->getUserInfo('companyId'),
                'status'    => TrafficSourceModel::STATUS_PASSED,
            ]
        )
            ->whereBetween('updateTime',
                [
                    strtotime(date('Y-m-d 00:00:00')),
                    strtotime(date('Y-m-d 23:59:59'))
                ]
            )
            ->count('*');
    }

    /**
     * 获取流量池总数
     *
     * @return int
     * @throws \Exception
     */
    protected function getTotalCount(): int
    {
        return TrafficSourceModel::where(
            [
                'companyId' => $this->getUserInfo('companyId')
            ]
        )
            ->count('*');
    }

    /**
     * 获取流量池数据统计
     *
     * @return \think\response\Json
     */
    public function index()
    {
        try {
            return ResponseHelper::success(
                [
                    'totalCount'    => $this->getTotalCount(),
                    'todayAddCount' => $this->getTodayAddedCount(),
                ]
            );
        } catch (\Exception $e) {
            return ResponseHelper::error($e->getMessage(), $e->getCode());
        }
    }
} 