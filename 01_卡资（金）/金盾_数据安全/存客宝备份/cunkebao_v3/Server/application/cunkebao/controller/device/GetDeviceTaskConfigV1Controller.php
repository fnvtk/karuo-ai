<?php

namespace app\cunkebao\controller\device;

use app\common\model\DeviceTaskconf as DeviceTaskconfModel;
use app\common\model\DeviceUser as DeviceUserModel;
use app\common\model\User as UserModel;
use app\cunkebao\controller\BaseController;
use Eison\Utils\Helper\ArrHelper;
use library\ResponseHelper;

/**
 * 设备管理控制器
 */
class GetDeviceTaskConfigV1Controller extends BaseController
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
     * 解析taskConfig字段获取功能开关
     *
     * @param int $deviceId
     * @return int[]
     * @throws \Exception
     */
    protected function getTaskConfig(int $deviceId): array
    {
        $conf = DeviceTaskconfModel::alias('c')
            ->field([
                'c.autoAddFriend', 'c.autoReply', 'c.momentsSync', 'c.aiChat'
            ])
            ->where(
                [
                    'companyId' => $this->getUserInfo('companyId'),
                    'deviceId'  => $deviceId
                ]
            )
            ->find();

        // 未配置时赋予默认关闭的状态
        return !is_null($conf) ? $conf->toArray() : ArrHelper::getValue('autoAddFriend,autoReply,momentsSync,aiChat', [], 0);
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
                $this->getTaskConfig($id)
            );
        } catch (\Exception $e) {
            return ResponseHelper::error($e->getMessage(), $e->getCode());
        }
    }
} 