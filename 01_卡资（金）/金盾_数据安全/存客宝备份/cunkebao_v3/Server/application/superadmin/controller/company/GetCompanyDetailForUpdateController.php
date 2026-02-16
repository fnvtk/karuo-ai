<?php

namespace app\superadmin\controller\company;

use app\common\model\Company as CompanyModel;
use app\common\model\Device as DeviceModel;
use app\common\model\User as UserModel;
use app\superadmin\controller\BaseController;
use library\ResponseHelper;

/**
 * 公司控制器
 */
class GetCompanyDetailForUpdateController extends BaseController
{
    /**
     * 根据 CompanyId 获取设备列表
     *
     * @param int $companyId
     * @return array
     */
    protected function getDevicesByCompanyId(int $companyId): array
    {
        return DeviceModel::alias('d')
            ->field([
                'd.id', 'd.memo', 'd.model', 'd.brand', 'd.phone', 'd.imei', 'd.createTime', 'd.alive',
            ])
            ->where('companyId', $companyId)
            ->select()
            ->toArray() ?: [];
    }

    /**
     * 获取项目详情
     *
     * @param int $id
     * @return CompanyModel
     * @throws \Exception
     */
    protected function getCompanyDetail(int $id): array
    {
        $detail = CompanyModel::alias('c')
            ->field([
                'c.id', 'c.name', 'c.status', 'c.memo', 'c.companyId',
                'u.account', 'u.username', 'u.phone', 'u.s2_accountId'
            ])
            ->leftJoin('users u', 'c.companyId = u.companyId and u.isAdmin = ' . UserModel::ADMIN_STP)
            ->find($id);

        if (!$detail) {
            throw new \Exception('项目不存在', 404);
        }

        return $detail->toArray();
    }

    /**
     * 获取项目详情
     *
     * @param int $id
     * @return \think\response\Json
     */
    public function index($id)
    {
        try {
            $data = $this->getCompanyDetail($id);
            $devices = $this->getDevicesByCompanyId($data['companyId']);

            return ResponseHelper::success(
                array_merge($data, compact('devices'))
            );
        } catch (\Exception $e) {
            return ResponseHelper::error($e->getMessage(), $e->getCode());
        }
    }
} 