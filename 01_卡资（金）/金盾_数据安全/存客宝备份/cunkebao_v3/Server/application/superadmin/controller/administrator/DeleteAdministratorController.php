<?php

namespace app\superadmin\controller\administrator;

use app\superadmin\controller\BaseController;
use app\common\model\Administrator as AdministratorModel;
use app\common\model\AdministratorPermissions as AdministratorPermissionsModel;
use library\ResponseHelper;
use think\Controller;
use think\Db;
use think\Validate;

/**
 * 管理员控制器
 */
class DeleteAdministratorController extends BaseController
{
    /**
     * 删除管理员
     *
     * @param int $adminId
     * @return void
     * @throws \Exception
     */
    protected function deleteAdmin(int $adminId): void
    {
        $admin = AdministratorModel::where('id', $adminId)->find();

        if (!$admin) {
            throw new \Exception('管理员不存在', 404);
        }

        if (!$admin->delete()) {
            throw new \Exception('管理员删除失败', 400);
        }
    }

    /**
     * 删除管理员权限
     *
     * @param int $adminId
     * @return void
     * @throws \Exception
     */
    protected function deletePermission(int $adminId): void
    {
        $permission = AdministratorPermissionsModel::where('adminId', $adminId)->find();

        if (!$permission->delete()) {
            throw new \Exception('管理员权限移除失败', 400);
        }
    }

    /**
     * 删除账号的限制条件
     *
     * @param int $adminId
     * @return void
     * @throws \Exception
     */
    protected function canNotDeleteSelf(int $adminId)
    {
        // 不能删除自己的账号
        if ($this->getAdminInfo('id') == $adminId) {
            throw new \Exception('不能删除自己的账号', 403);
        }

        // 只有超级管理员(ID为1)可以删除管理员
        if ($this->getAdminInfo('id') != AdministratorModel::MASTER_ID) {
            throw new \Exception('您没有权限删除管理员', 403);
        }

        // 不能删除超级管理员账号
        if ($adminId == AdministratorModel::MASTER_ID) {
            throw new \Exception('不能删除超级管理员账号', 403);
        }
    }

    /**
     * 数据验证
     *
     * @param array $params
     * @return $this
     * @throws \Exception
     */
    protected function dataValidate(array $params): self
    {
        $validate = Validate::make([
            'id' => 'require|regex:/^[1-9]\d*$/',
        ], [
            'id.regex'   => '非法请求',
            'id.require' => '非法请求',
        ]);

        if (!$validate->check($params)) {
            throw new \Exception($validate->getError(), 400);
        }

        return $this;
    }

    /**
     * 删除管理员
     *
     * @return \think\response\Json
     */
    public function index()
    {
        try {
            $params = $this->request->only('id');
            $adminId = $params['id'];

            $this->dataValidate($params)->canNotDeleteSelf($adminId);

            Db::startTrans();

            $this->deleteAdmin($adminId);
            $this->deletePermission($adminId);

            Db::commit();

            return ResponseHelper::success();
        } catch (\Exception $e) {
            Db::rollback();
            return ResponseHelper::error($e->getMessage(), $e->getCode());
        }
    }
} 