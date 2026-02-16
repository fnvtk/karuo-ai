<?php

namespace app\superadmin\controller\administrator;

use app\common\model\Administrator as AdministratorModel;
use app\superadmin\controller\BaseController;
use library\ResponseHelper;
use think\Db;

/**
 * 管理员控制器
 */
class GetAdministratorDetailController extends BaseController
{
    /**
     * 查询管理员信息，关联权限表
     *
     * @param int $adminId
     * @return AdministratorModel
     * @throws \Exception
     */
    protected function getAdministrator(int $adminId): AdministratorModel
    {
        $admin = AdministratorModel::alias('a')
            ->field([
                'a.id', 'a.account', 'a.username', 'a.status', 'a.authId', 'a.createTime createdAt', 'a.lastLoginTime lastLogin',
                'p.permissions'
            ])
            ->leftJoin('administrator_permissions p', 'a.id = p.adminId')
            ->where('a.id', $adminId)
            ->find();

        if (!$admin) {
            throw new \Exception('管理员不存在', 404);
        }

        return $admin;
    }

    /**
     * 解析权限数据
     *
     * @param string|null $permission
     * @return array
     */
    protected function parsePermissions(?string $permission): array
    {
        $permissionIds = [];

        if (!empty($permission)) {
            $permissions = json_decode($permission, true);
            $permissions = is_array($permissions) ? $permissions : json_decode($permissions, true);

            if (isset($permissions['ids'])) {
                $permissionIds = is_string($permissions['ids']) ? explode(',', $permissions['ids']) : $permissions['ids'];
                $permissionIds = array_map('intval', $permissionIds);
            }
        }

        return $permissionIds;
    }

    /**
     * 根据权限ID获取角色名称
     *
     * @param int $authId
     * @return string
     */
    protected function getRoleName($authId): string
    {
        switch ($authId) {
            case 1:
                return '超级管理员';
            case 2:
                return '项目管理员';
            case 3:
                return '客户管理员';
            default:
                return '普通管理员';
        }
    }

    /**
     * 获取详细信息
     *
     * @param int $id 管理员ID
     * @return \think\response\Json
     */
    public function index($id)
    {
        try {
            $admin = $this->getAdministrator($id);
            $roleName = $this->getRoleName($admin->authId);
            $permissionIds = $this->parsePermissions($admin->permissions);

            return ResponseHelper::success(
                array_merge($admin->toArray(), [
                    'roleName'    => $roleName,
                    'permissions' => $permissionIds,
                    'lastLogin'   => $admin->lastLogin ? date('Y-m-d H:i', $admin->lastLogin) : '从未登录',
                    'createdAt'   => date('Y-m-d H:i', $admin->createdAt),
                ])
            );
        } catch (\Exception $e) {
            return ResponseHelper::error($e->getMessage(), $e->getCode());
        }
    }
}