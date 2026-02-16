<?php

namespace app\superadmin\controller\administrator;

use app\common\model\Administrator as AdministratorModel;
use app\common\model\AdministratorPermissions as AdministratorPermissionsModel;
use app\superadmin\controller\BaseController;
use library\ResponseHelper;
use think\Controller;
use think\Db;
use think\Validate;

/**
 * 管理员控制器
 */
class AddAdministratorController extends BaseController
{
    /**
     * 检查账号是否已存在
     *
     * @param string $account
     * @return void
     * @throws \Exception
     */
    protected function chekAdminIsExist(string $account)
    {
        $exists = AdministratorModel::where('account', $account)->count() > 0;

        if ($exists) {
            throw new \Exception('账号已存在', 400);
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
            'account'       => 'require|regex:^[a-zA-Z0-9]+$|/\S+/',
            'username'      => 'require|/\S+/',
            'password'      => 'require|/\S+/',
            'permissionIds' => 'require|array',
        ], [
            'account.require'       => '账号不能为空',
            'account.regex'         => '账号只能用数字或者字母或者数字字母组合',
            'username.require'      => '用户名不能为空',
            'password.require'      => '密码不能为空',
            'permissionIds.require' => '请至少分配一种权限',
        ]);

        if (!$validate->check($params)) {
            throw new \Exception($validate->getError(), 400);
        }

        return $this;
    }

    /**
     * 判断是否有权限修改
     *
     * @return $this
     */
    protected function checkPermission(): self
    {
        if ($this->getAdminInfo('id') != AdministratorModel::MASTER_ID) {
            throw new \Exception('您没有权限添加管理员', 403);
        }

        return $this;
    }

    /**
     * 保存管理员权限
     *
     * @param int $adminId 管理员ID
     * @param array $permissionIds 权限ID数组
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
     * 添加管理员信息
     *
     * @param array $params
     * @return AdministratorModel
     * @throws \Exception
     */
    protected function addAdministrator(array $params): AdministratorModel
    {
        $result = AdministratorModel::create(array_merge($params, ['password' => md5($params['password'])]));

        if (!$result) {
            throw new \Exception('添加管理员失败', 401);
        }

        return $result;
    }

    /**
     * 添加管理员
     *
     * @return \think\response\Json
     */
    public function index()
    {
        try {
            $params = $this->request->only(['account', 'username', 'password', 'permissionIds']);

            $this->dataValidate($params);
            $this->checkPermission()->chekAdminIsExist($params['account']);

            Db::startTrans();
            $admin = $this->addAdministrator($params);

            // 保存权限
            if (!empty($params['permissionIds'])) {
                $this->savePermissions($admin->id, $params['permissionIds']);
            }

            Db::commit();
            return ResponseHelper::success();
        } catch (\Exception $e) {
            Db::rollback();
            return ResponseHelper::error($e->getMessage(), $e->getCode());
        }
    }
} 