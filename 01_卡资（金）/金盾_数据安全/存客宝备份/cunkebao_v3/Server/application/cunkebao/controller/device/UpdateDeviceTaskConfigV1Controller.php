<?php

namespace app\cunkebao\controller\device;

use app\common\model\Device as DeviceModel;
use app\common\model\DeviceHandleLog as DeviceHandleLogModel;
use app\common\model\DeviceTaskconf;
use app\common\model\DeviceUser as DeviceUserModel;
use app\common\model\User as UserModel;
use app\cunkebao\controller\BaseController;
use library\ResponseHelper;
use think\Db;

/**
 * 设备管理控制器
 */
class UpdateDeviceTaskConfigV1Controller extends BaseController
{
    /**
     * 先获取设备信息，确认设备存在且未删除
     *
     * @param int $deviceId
     * @return void
     * @throws \Exception
     */
    protected function checkDeviceExists(int $deviceId)
    {
        $where = [
            'deviceId'   => $deviceId,
            'companyId'  => $this->getUserInfo('companyId'),
        ];

        $device = DeviceModel::find($where);

        if (!$device) {
            throw new  \Exception('设备不存在或已删除', 404);
        }
    }

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
            throw new \Exception('您没有权限操作该设备', 403);
        }
    }

    /**
     * 添加设备操作日志
     *
     * @param int $deviceId
     * @return void
     * @throws \Exception
     */
    protected function addHandleLog(int $deviceId): void
    {
        $data = $this->request->post();
        $content = null;

        if (isset($data['autoAddFriend']))/**/ $content = $data['autoAddFriend'] ? '开启自动添加好友' : '关闭自动添加好友';
        if (isset($data['autoReply']))/*    */ $content = $data['autoReply']     ? '开启自动回复'    : '关闭自动回复';
        if (isset($data['momentsSync']))/*  */ $content = $data['momentsSync']   ? '开启朋友圈同步'  : '关闭朋友圈同步';
        if (isset($data['aiChat']))/*       */ $content = $data['aiChat']        ? '开启AI会话'     : '关闭AI会话';

        if (empty($content)) {
            throw new \Exception('参数错误', 400);
        }

        DeviceHandleLogModel::addLog(
            [
                'deviceId'  => $deviceId,
                'content'   => $content,
                'userId'    => $this->getUserInfo('id'),
                'companyId' => $this->getUserInfo('companyId'),
            ]
        );
    }

    /**
     * 更新设备taskConfig字段
     *
     * @param int $deviceId
     * @return void
     */
    protected function setTaskconf(int $deviceId): void
    {
        $data = $this->request->post();
        $conf = DeviceTaskconf::where('deviceId', $deviceId)->find();

        if ($conf) {
            DeviceTaskconf::where('deviceId', $deviceId)->update($data);
        } else {
            DeviceTaskconf::create(array_merge($data, [
                'companyId' => $this->getUserInfo('companyId'),
            ]));
        }
    }

    /**
     * 更新设备任务配置
     * @return \think\response\Json
     */
    public function index()
    {
        $id = $this->request->param('deviceId/d');

        $this->checkDeviceExists($id);

        if ($this->getUserInfo('isAdmin') != UserModel::ADMIN_STP) {
            $this->checkUserDevicePermission($id);
        }

        try {
            Db::startTrans();

            $this->addHandleLog($id);
            $this->setTaskconf($id);

            Db::commit();

            return ResponseHelper::success();
        } catch (\Exception $e) {
            Db::rollback();
            return ResponseHelper::error($e->getMessage(), $e->getCode());
        }
    }
} 