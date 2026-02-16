<?php

namespace app\cunkebao\controller\device;

use app\common\model\Device as DeviceModel;
use app\common\model\DeviceTaskconf as DeviceTaskconfModel;
use app\common\model\DeviceUser as DeviceUserModel;
use app\common\model\DeviceWechatLogin as DeviceWechatLoginModel;
use app\common\model\User as UserModel;
use app\common\model\WechatCustomer as WechatCustomerModel;
use app\common\model\WechatFriendShip as WechatFriendShipModel;
use app\cunkebao\controller\BaseController;
use Eison\Utils\Helper\ArrHelper;
use library\ResponseHelper;

/**
 * 设备管理控制器
 */
class GetDeviceDetailV1Controller extends BaseController
{
    /**
     * 检查用户是否有权限操作指定设备
     *
     * @param int $deviceId
     * @return void
     */
    protected function checkUserDevicePermission(int $deviceId): void
    {
        $hasPermission = DeviceUserModel::where(
                [
                    'deviceId'  => $deviceId,
                    'userId'    => $this->getUserInfo('id'),
                    'companyId' => $this->getUserInfo('companyId')
                ]
            )
                ->count() > 0;

        if (!$hasPermission) {
            throw new \Exception('您没有权限查看该设备', 403);
        }
    }

    /**
     * 解析设备额外信息
     *
     * @param string $extra
     * @return int
     */
    protected function parseExtraForBattery(string $extra): int
    {
        if (!empty($extra)) {
            $extra = json_decode($extra);

            if ($extra && isset($extra->battery)) {
                return intval($extra->battery);
            }
        }

        return 0;
    }

    /**
     * 获取设备最新登录微信的 wechatId
     *
     * @param int $deviceId
     * @return string|null
     * @throws \Exception
     */
    protected function getDeviceLatestWechatLogin(int $deviceId): ?string
    {
        return DeviceWechatLoginModel::where(
            [
                'companyId' => $this->getUserInfo('companyId'),
                'deviceId'  => $deviceId,
                'alive'     => DeviceWechatLoginModel::ALIVE_WECHAT_ACTIVE
            ]
        )
            ->value('wechatId');
    }

    /**
     * 获取设备绑定的客服信息
     *
     * @param int $deviceId
     * @return array
     * @throws \Exception
     */
    protected function getWechatCustomerInfo(int $deviceId): array
    {
        $curstomer = WechatCustomerModel::field('activity,friendShip')
            ->where(
            [
                'companyId' => $this->getUserInfo('companyId'),
                'wechatId'  => $this->getDeviceLatestWechatLogin($deviceId)
            ]
        )
            ->find();

        return $curstomer ? [
            'lastUpdateTime'    => $curstomer->activity->lastActivityTime ?? '',
            'thirtyDayMsgCount' => $curstomer->activity->totalMsgCount    ?? 0,
            'totalFriend'       => $curstomer->friendShip->totalFriend    ?? 0,
        ] : [
            'lastUpdateTime'    => '',
            'thirtyDayMsgCount' => 0,
            'totalFriend'       => 0,
        ];
    }

    /**
     * 获取设备详情
     *
     * @param int $id
     * @return array
     */
    protected function getDeviceInfo(int $id): array
    {
        // 查询设备基础信息与关联的微信账号信息
        $device = DeviceModel::alias('d')
            ->field([
                'd.id', 'd.imei', 'd.memo', 'd.alive', 'd.extra'
            ])
            ->find($id);

        if (empty($device)) {
            throw new \Exception('设备不存在', 404);
        }

        $device->battery = $this->parseExtraForBattery($device->extra);

        // 删除冗余字段
        unset($device->extra);

        return $device->toArray();
    }

    /**
     * 获取设备详情
     *
     * @return \think\response\Json
     */
    public function index()
    {
        try {
            $id = $this->request->param('id/d');

            if ($this->getUserInfo('isAdmin') != UserModel::ADMIN_STP) {
                $this->checkUserDevicePermission($id);
            }

            return ResponseHelper::success(
                $this->getDeviceInfo($id) + $this->getWechatCustomerInfo($id)
            );
        } catch (\Exception $e) {
            return ResponseHelper::error($e->getMessage(), $e->getCode());
        }
    }


    public function isUpdataWechat()
    {
        $id = $this->request->param('id/d');
        $companyId = $this->getUserInfo('companyId');
        $newWechat = DeviceWechatLoginModel::alias('a')
            ->field('b.*')
            ->join('wechat_account b', 'a.wechatId = b.wechatId')
            ->where(['a.deviceId' => $id,'a.isTips' => 0,'a.companyId' => $companyId])
            ->order('a.id', 'desc')
            ->find();
        if (empty($newWechat)){
            return ResponseHelper::success('','该设备绑定的微信无需迁移',201);
        }

        $oldWechat = DeviceWechatLoginModel::alias('a')
            ->field('b.*')
            ->join('wechat_account b', 'a.wechatId = b.wechatId')
            ->where(['a.companyId' => $companyId])
            ->where('a.deviceId' ,'<>', $id)
            ->order('a.id', 'desc')
            ->find();
        if (empty($oldWechat)){
            return ResponseHelper::success('','该设备绑定的微信无需迁移',201);
        }else{
            DeviceWechatLoginModel::where(['deviceId' => $id,'isTips' => 0,'companyId' => $companyId])->update(['isTips' => 1]);;
            return ResponseHelper::success(['newWechat' => $newWechat,'oldWechat' => $oldWechat]);
        }
    }
}