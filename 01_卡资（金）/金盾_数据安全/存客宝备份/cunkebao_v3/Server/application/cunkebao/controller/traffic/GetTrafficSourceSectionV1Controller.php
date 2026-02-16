<?php

namespace app\cunkebao\controller\traffic;

use app\common\model\TrafficSource as TrafficSourceModel;
use app\cunkebao\controller\BaseController;
use library\ResponseHelper;

/**
 * 流量池控制器
 */
class GetTrafficSourceSectionV1Controller extends BaseController
{
    /**
     * 动态获取流量来源的selection 选择器列表数据
     *
     * @return array
     * @throws \Exception
     */
    protected function getSourceSectionCols(): array
    {
        return (array)TrafficSourceModel::where(
            [
                'companyId' => $this->getUserInfo('companyId')
            ]
        )
            ->field('fromd name,id')->group('fromd')->select()->toArray();
    }

    /**
     * 获取流量来源筛选列表
     *
     * @return \think\response\Json
     */
    public function index()
    {
        try {
            return ResponseHelper::success(
                $this->getSourceSectionCols()
            );
        } catch (\Exception $e) {
            return ResponseHelper::error($e->getMessage(), $e->getCode());
        }
    }
} 