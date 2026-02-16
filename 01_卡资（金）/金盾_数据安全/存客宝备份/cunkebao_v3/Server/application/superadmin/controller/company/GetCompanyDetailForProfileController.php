<?php

namespace app\superadmin\controller\company;

use app\common\model\Company as CompanyModel;
use app\common\model\Device as DeviceModel;
use app\common\model\DeviceWechatLogin as DeviceWechatLoginModel;
use app\common\model\User as UserModel;
use app\common\model\WechatFriendShip as WechatFriendModel;
use app\superadmin\controller\BaseController;
use library\ResponseHelper;

/**
 * 公司控制器
 */
class GetCompanyDetailForProfileController extends BaseController
{
    /**
     * 获取登录设备的所有微信
     *
     * @param int $companyId
     * @return array
     */
    protected function getDeveiceWechats(int $companyId): array
    {
        $wechatIds = DeviceWechatLoginModel::where('companyId', $companyId)->column('wechatId');

        return array_unique($wechatIds);
    }

    /**
     * 统计微信好友数量
     *
     * @param int $companyId
     * @return int
     */
    protected function getFriendCountByCompanyId(int $companyId): int
    {
        $wechatIds = $this->getDeveiceWechats($companyId);

        return WechatFriendModel::whereIn('ownerWechatId', $wechatIds)->count();
    }

    /**
     * 根据 CompanyId 获取设备数量
     *
     * @param int $companyId
     * @return int
     */
    protected function getDeviceCountByCompanyId(int $companyId): int
    {
        return DeviceModel::where('companyId', $companyId)->count();
    }

    /**
     * 根据 CompanyId 获取子账号数量
     *
     * @param int $companyId
     * @return int
     */
    protected function getUsersCountByCompanyId(int $companyId): int
    {
        $where = array_merge(compact('companyId'), array('isAdmin' => UserModel::ADMIN_OTP));

        return UserModel::where($where)->count();
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
                'c.id', 'c.name', 'c.memo', 'c.companyId', 'c.createTime',
                'u.account', 'u.phone'
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

            $userCount = $this->getUsersCountByCompanyId($id);
            $deviceCount = $this->getDeviceCountByCompanyId($id);
            $friendCount = $this->getFriendCountByCompanyId($id);

            return ResponseHelper::success(
                array_merge($data, compact('deviceCount', 'friendCount', 'userCount'))
            );
        } catch (\Exception $e) {
            return ResponseHelper::error($e->getMessage(), $e->getCode());
        }
    }
} 