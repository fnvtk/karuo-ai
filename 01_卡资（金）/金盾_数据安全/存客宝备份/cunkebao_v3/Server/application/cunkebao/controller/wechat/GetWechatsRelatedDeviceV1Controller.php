<?php

namespace app\cunkebao\controller\wechat;

use app\common\model\DeviceUser as DeviceUserModel;
use app\common\model\DeviceWechatLogin as DeviceWechatLoginModel;
use app\common\model\User as UserModel;
use app\common\model\WechatAccount as WechatAccountModel;
use app\common\model\WechatFriendShip as WechatFriendShipModel;
use app\cunkebao\controller\BaseController;
use library\ResponseHelper;
use think\model\Collection as ResultCollection;

/**
 * 设备管理控制器
 */
class GetWechatsRelatedDeviceV1Controller extends BaseController
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
     * 查询设备关联的微信ID列表
     *
     * @param int $deviceId
     * @return array
     */
    protected function getDeviceWechatIds(int $deviceId): array
    {
        return DeviceWechatLoginModel::where(
            [
                'deviceId'  => $deviceId,
                'companyId' => $this->getUserInfo('companyId')
            ]
        )
            ->group('wechatId')->column('wechatId');
    }

    /**
     * 通过设备关联的微信号列表获取微信账号
     *
     * @param array $wechatIds
     * @return ResultCollection
     */
    protected function getWechatAccountsByIds(array $wechatIds): ResultCollection
    {
        return WechatAccountModel::alias('w')
            ->field([
                'w.wechatId', 'w.nickname', 'w.avatar', 'w.gender', 'w.createTime',
                'CASE WHEN w.alias IS NULL OR w.alias = "" THEN w.wechatId ELSE w.alias END AS wechatAccount',
            ])
            ->whereIn('w.wechatId', $wechatIds)
            ->select();
    }

    /**
     * TODO 通过微信id获取微信最后活跃时间
     *
     * @param int $time
     * @return string
     */
    protected function getWechatLastActiveTime(string $wechatId): string
    {
        return date('Y-m-d H:i:s', time());
    }

    /**
     * TODO 加友状态
     *
     * @param string $wechatId
     * @return string
     */
    protected function getWechatStatusText(string $wechatId): string
    {
        return 1 ? '可加友' : '已停用';
    }

    /**
     * TODO 账号状态
     *
     * @param string $wechatId
     * @return string
     */
    protected function getWechatAliveText(string $wechatId): string
    {
        return 1 ? '正常' : '异常';
    }

    /**
     * 统计微信好友
     *
     * @param string $ownerWechatId
     * @return int
     */
    protected function getCountFriend(string $ownerWechatId): int
    {
        return WechatFriendShipModel::where(
            [
                'ownerWechatId' => $ownerWechatId,
                'companyId'     => $this->getUserInfo('companyId')
            ]
        )
            ->count();
    }

    /**
     * 获取设备关联的微信账号信息
     *
     * @param int $deviceId
     * @return array
     */
    protected function getDeviceRelatedAccounts(int $deviceId): array
    {
        // 获取设备关联的微信ID列表
        $wechatIds = $this->getDeviceWechatIds($deviceId);

        if (!empty($wechatIds)) {
            $collection = $this->getWechatAccountsByIds($wechatIds);

            foreach ($collection as $account) {
                $account->lastActive = $this->getWechatLastActiveTime($account->wechatId);
                $account->statusText = $this->getWechatStatusText($account->wechatId);
                $account->totalFriend = $this->getCountFriend($account->wechatId);
                $account->wechatAliveText = $this->getWechatAliveText($account->wechatId);
            }

            return $collection->toArray();
        }

        return [];
    }

    /**
     * 获取设备关联的微信账号
     *
     * @return \think\response\Json
     */
    public function index()
    {
        try {
            $deviceId = $this->request->param('id/d');

            if ($this->getUserInfo('isAdmin') != UserModel::ADMIN_STP) {
                $this->checkUserDevicePermission($deviceId);
            }

            // 获取设备关联的微信账号
            $wechatAccounts = $this->getDeviceRelatedAccounts($deviceId);

            return ResponseHelper::success(
                [
                    'deviceId' => $deviceId,
                    'accounts' => $wechatAccounts,
                    'total'    => count($wechatAccounts)
                ]
            );
        } catch (\Exception $e) {
            return ResponseHelper::error($e->getMessage(), $e->getCode());
        }
    }
} 