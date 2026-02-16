<?php

namespace app\superadmin\controller\dashboard;

use app\common\model\Administrator as AdministratorModel;
use app\common\model\Company as CompanyModel;
use app\common\model\Device as DeviceModel;
use library\ResponseHelper;
use think\Controller;

/**
 * 仪表盘控制器
 */
class GetBasestatisticsController extends Controller
{
    /**
     * 项目总数
     *
     * @return CompanyModel
     */
    protected function getCompanyCount(): int
    {
        return CompanyModel::count('*');
    }

    /**
     * 管理员数量
     *
     * @return int
     */
    protected function getAdminCount(): int
    {
        return AdministratorModel::count('*');
    }

    /**
     * 设备总数
     *
     * @return int
     */
    protected function getDeviceCount(): int
    {
        return DeviceModel::count('*');
    }

    /**
     * 获取基础统计信息
     *
     * @return \think\response\Json
     */
    public function index()
    {
        return ResponseHelper::success(
            [
                'companyCount'  => $this->getCompanyCount(),
                'adminCount'    => $this->getAdminCount(),
                'customerCount' => $this->getDeviceCount(),
            ]
        );
    }
}