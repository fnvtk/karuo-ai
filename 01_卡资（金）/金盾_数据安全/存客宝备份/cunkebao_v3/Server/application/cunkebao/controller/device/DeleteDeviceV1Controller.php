<?php

namespace app\cunkebao\controller\device;

use app\common\model\Device as DeviceModel;
use app\common\model\DeviceTaskconf as DeviceTaskconfModel;
use app\common\model\DeviceUser as DeviceUserModel;
use app\common\model\User as UserModel;
use app\cunkebao\controller\BaseController;
use library\ResponseHelper;
use think\Db;
use app\api\controller\DeviceController as apiDevice;

/**
 * 设备管理控制器
 */
class DeleteDeviceV1Controller extends BaseController
{
    /**
     * 删除设备关联用户信息
     *
     * @param int $deviceId
     * @return void
     */
    protected function deleteDeviceUser(int $deviceId): void
    {
        $companyId = $this->getUserInfo('companyId');
        $deviceUser = DeviceUserModel::where(compact('companyId', 'deviceId'))->find();

        // 有关联数据则删除
        if ($deviceUser) {
            if (!$deviceUser->delete()) {
                throw new \Exception('设备用户关联数据删除失败', 402);
            }
        }
    }

    /**
     * 删除设备任务配置记录
     *
     * @param int $deviceId
     * @return void
     * @throws \Exception
     */
    protected function deleteDeviceConf(int $deviceId): void
    {
        $companyId = $this->getUserInfo('companyId');
        $deviceConf = DeviceTaskconfModel::where(compact('companyId', 'deviceId'))->find();

        // 有配置信息则删除
        if ($deviceConf) {
            if (!$deviceConf->delete()) {
                throw new \Exception('设备设置信息删除失败', 402);
            }
        }
    }

    /**
     * 删除主设备信息
     *
     * @param int $id
     * @return DeviceModel
     * @throws \Exception
     */
    protected function deleteDevice(int $id): void
    {
        $device = DeviceModel::where('companyId', $this->getUserInfo('companyId'))->find($id);

        if (!$device) {
            throw new \Exception('设备不存在或无权限操作', 404);
        }

        if (!$device->delete()) {
            throw new \Exception('设备删除失败', 402);
        }
    }

    /**
     * 删除存客宝设备数据
     *
     * @param int $id
     * @return $this
     * @throws \Exception
     */
    protected function deleteCkbAbout(int $id): self
    {
        $apiDevice = new ApiDevice();
        $res = $apiDevice->delDevice($id);
        $res = json_decode($res, true);
        if ($res['code'] == 200){
            $this->deleteDevice($id);
            $this->deleteDeviceConf($id);
            $this->deleteDeviceUser($id);
            return $this;
        }else{
            return false;
        }
    }

    /**
     * TODO 删除存客宝设备数据
     *
     * @return self
     */
    protected function deleteS2About(): self
    {
        return $this;
    }

    /**
     * 检查用户权限，只有操盘手可以删除设备
     *
     * @return $this
     */
    protected function checkPermission(): self
    {
        if ($this->getUserInfo('typeId') != UserModel::MASTER_USER) {
            throw new \Exception('您没有权限删除设备', 403);
        }

        return $this;
    }

    /**
     * 删除设备
     *
     * @return \think\response\Json
     */
    public function index()
    {
        try {
            $id = $this->request->param('id/d');

            Db::startTrans();
            $this->checkPermission();
            $this->deleteCkbAbout($id)->deleteS2About($id);
            Db::commit();

            return ResponseHelper::success();
        } catch (\Exception $e) {
            Db::rollback();
            return ResponseHelper::error($e->getMessage(), $e->getCode());
        }
    }
} 