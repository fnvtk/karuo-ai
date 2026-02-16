<?php

namespace app\superadmin\controller\administrator;

use app\common\model\Administrator as AdministratorModel;
use app\common\model\AdministratorPermissions as AdministratorPermissionsModel;
use app\superadmin\controller\BaseController;
use library\ResponseHelper;
use think\Db;
use think\Validate;

/**
 * 管理员控制器
 */
class UpdateAdministratorController extends BaseController
{
    /**
     * 更新管理员信息
     *
     * @param array $params
     * @return void
     * @throws \Exception
     */
    protected function udpateAdministrator(array $params): void
    {
        $admin = AdministratorModel::find($params['id']);

        if (!$admin) {
            throw new \Exception('管理员不存在', 404);
        }

        if (!empty($params['password'])) {
            $params['password'] = md5($params['password']);
        }

        if (!$admin->save($params)) {
            throw new \Exception('记录更新失败', 402);
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
            'id'            => 'require|regex:/^[1-9]\d*$/',
            'account'       => 'require|regex:^[a-zA-Z0-9]+$|/\S+/',
            'username'      => 'require|/\S+/',
            'password'      => '/\S+/',
            'permissionIds' => 'array',
        ], [
            'id.require'          => '缺少必要参数',
            'account.require'     => '账号不能为空',
            'account.regex'       => '账号只能用数字或者字母或者数字字母组合',
            'username.require'    => '用户名不能为空',
            'permissionIds.array' => '请至少分配一种权限',
        ]);

        if (!$validate->check($params)) {
            throw new \Exception($validate->getError(), 400);
        }

        return $this;
    }

    /**
     * 判断是否有权限修改
     *
     * @param int $adminId
     * @param array $params
     * @return $this
     */
    protected function checkPermission(int $adminId, array $params): self
    {
        $currentAdminId = $this->getAdminInfo('id');

        if ($currentAdminId != AdministratorModel::MASTER_ID && $currentAdminId != $adminId) {
            throw new \Exception('您没有权限修改其他管理员', 403);
        }

        if ($params['id'] != AdministratorModel::MASTER_ID && empty($params['permissionIds'])) {
            throw new \Exception('请至少分配一种权限', 403);
        }

        return $this;
    }

    /**
     * 保存管理员权限
     *
     * @param int $adminId
     * @param array $permissionIds
     * @return bool
     */
    protected function savePermissions(int $adminId, array $permissionIds)
    {
        $record = AdministratorPermissionsModel::where('adminId', $adminId)->find();

        $permissionData = [
            'ids' => is_array($permissionIds) ? implode(',', $permissionIds) : $permissionIds
        ];

        if ($record) {
            return $record->save([
                'permissions' => json_encode($permissionData),
            ]);
        } else {
            return AdministratorPermissionsModel::create([
                'adminId'     => $adminId,
                'permissions' => json_encode($permissionData),
            ]);
        }
    }

    /**
     * 更新管理员信息
     *
     * @return \think\response\Json
     */
    public function index()
    {
        try {
            $params = $this->request->only(['id', 'account', 'username', 'password', 'permissionIds']);

            // 被修改的管理员id
            $adminId = $params['id'] ?? 0;

            $this->dataValidate($params)->checkPermission($adminId, $params);

            Db::startTrans();

            $this->udpateAdministrator($params);

            // 如果当前是超级管理员(ID为1)，并且修改的不是自己，则更新权限
            if ($this->getAdminInfo('id') == AdministratorModel::MASTER_ID
                && $this->getAdminInfo('id') != $adminId
                && !empty($params['permissionIds'])
            ) {
                $this->savePermissions($adminId, $params['permissionIds']);
            }

            Db::commit();
            return ResponseHelper::success();
        } catch (\Exception $e) {
            Db::rollback();
            return ResponseHelper::error($e->getMessage(), $e->getCode());
        }
    }
} 