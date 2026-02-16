<?php

namespace app\cunkebao\controller\device;

use app\common\model\DeviceHandleLog;
use app\common\model\DeviceUser as DeviceUserModel;
use app\common\model\User as UserModel;
use app\cunkebao\controller\BaseController;
use library\ResponseHelper;

/**
 * 设备管理控制器
 */
class GetDeviceHandleLogsV1Controller extends BaseController
{
    /**
     * 检查用户是否有权限操作指定设备
     *
     * @param int $deviceId
     * @return void
     */
    protected function checkUserDevicePermission(int $deviceId): void
    {
        $where = [
            'deviceId'  => $deviceId,
            'userId'    => $this->getUserInfo('id'),
            'companyId' => $this->getUserInfo('companyId')
        ];

        $hasPermission = DeviceUserModel::where($where)->count() > 0;

        if (!$hasPermission) {
            throw new \Exception('您没有权限查看该设备', 403);
        }
    }

    /**
     * 查询设备操作记录，并关联用户表获取操作人信息
     *
     * @param int $deviceId
     * @return \think\Paginator
     */
    protected function getHandleLogs(int $deviceId): \think\Paginator
    {
        return DeviceHandleLog::alias('l')
            ->field([
                'l.id', 'l.content', 'l.createTime',
                'u.username'
            ])
            ->leftJoin('users u', 'l.userId = u.id')
            ->where('l.deviceId', $deviceId)
            ->order('l.createTime desc')
            ->paginate($this->request->param('limit/d', 10), false, ['page' => $this->request->param('page/d', 1)]);
    }

    /**
     * 获取设备操作记录
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

            $logs = $this->getHandleLogs($deviceId);

            return ResponseHelper::success(
                [
                    'total' => $logs->total(),
                    'list'  => $logs->items()
                ]
            );
        } catch (\Exception $e) {
            return ResponseHelper::error($e->getMessage(), $e->getCode());
        }
    }
} 