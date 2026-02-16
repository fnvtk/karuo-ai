<?php

namespace app\superadmin\controller\Menu;

use app\common\model\Administrator as AdministratorModel;
use app\common\model\Menu as MenuModel;
use app\common\model\AdministratorPermissions as AdministratorPermissionsModel;
use app\superadmin\controller\BaseController;
use library\ResponseHelper;
use think\facade\Cache;

/**
 * 菜单控制器
 */
class GetMenuTreeController extends BaseController
{
    /**
     * 组织成树状结构
     *
     * @param array $menus
     * @param int $parentId
     * @return array
     */
    private function buildMenuTree(array $menus, int $parentId = 0): array
    {
        $tree = [];

        foreach ($menus as $menu) {
            if ($menu['parentId'] == $parentId) {
                $children = $this->buildMenuTree($menus, $menu['id']);

                if (!empty($children)) {
                    $menu['children'] = $children;
                }

                $tree[] = $menu;
            }
        }

        return $tree;
    }

    /**
     * 获取管理员权限
     *
     * @return array
     */
    protected function getPermissions(): array
    {
        $record = AdministratorPermissionsModel::where('adminId', $this->getAdminInfo('id'))->find();

        if (!$record || empty($record->permissions)) {
            return [];
        }

        $permissions = $record->permissions ? json_decode($record->permissions, true) : [];

        if (isset($permissions['ids']) && !empty($permissions['ids'])) {
            return is_string($permissions['ids']) ? explode(',', $permissions['ids']) : $permissions['ids'];
        }

        return [];
    }

    /**
     * 获取所有菜单，并组织成树状结构
     *
     * @return array
     */
    protected function getMenuTree(): array
    {
        // 获取所有菜单
        $allMenus = MenuModel::where('status', MenuModel::STATUS_ACTIVE)->order('sort', 'asc')->select()->toArray();

        // 组织成树状结构
        return $allMenus ? $this->buildMenuTree($allMenus) : [];
    }

    /**
     * 获取所有一级菜单（用户拥有权限的）
     *
     * @param array $permissionIds
     * @return array
     */
    protected function getTopMenusInPermissionIds(array $permissionIds): array
    {
        $where = [
            'parentId' => MenuModel::TOP_LEVEL,
            'status'   => MenuModel::STATUS_ACTIVE,
        ];

        return MenuModel::where($where)->whereIn('id', $permissionIds)->order('sort', 'asc')->select()->toArray();
    }

    /**
     * 获取所有子菜单.
     *
     * @param array $topMenuIds
     * @return array
     */
    protected function getAllChildrenInPermissionIds(array $topMenuIds): array
    {
        return MenuModel::where('status', MenuModel::STATUS_ACTIVE)->whereIn('parentId', $topMenuIds)->order('sort', 'asc')->select()->toArray();
    }

    /**
     * 获取用户菜单
     *
     * @param array $permissionIds
     * @return array
     */
    protected function getUserMenus(array $permissionIds): array
    {
        $topMenus = $this->getTopMenusInPermissionIds($permissionIds);

        // 菜单ID集合，用于获取子菜单
        $childMenus = $this->getAllChildrenInPermissionIds(
            array_column($topMenus, 'id')
        );

        return $this->_makeMenuTree($topMenus, $childMenus);
    }

    /**
     * 构建菜单树.
     *
     * @param array $topMenus
     * @param array $childMenus
     * @return array
     */
    protected function _makeMenuTree(array $topMenus, array $childMenus): array
    {
        // 将子菜单按照父ID进行分组
        $childMenusGroup = [];

        foreach ($childMenus as $menu) {
            $childMenusGroup[$menu['parentId']][] = $menu;
        }

        foreach ($topMenus as $topMenu) {
            if (isset($childMenusGroup[$topMenu['id']])) {
                $topMenu['children'] = $childMenusGroup[$topMenu['id']];
            }

            $menuTree[] = $topMenu;
        }

        return $menuTree ?? [];
    }

    /**
     * 根据权限ID获取相应的菜单树
     *
     * @param array $permissionIds 权限ID数组
     * @return array
     */
    protected function getMenuTreeByPermissions(array $permissionIds): array
    {
        // 如果没有权限，返回空数组
        return $permissionIds ? $this->getUserMenus($permissionIds) : [];
    }

    /**
     * 获取菜单列表（树状结构）
     * @return \think\response\Json
     */
    public function index()
    {
        if ($this->getAdminInfo('id') == AdministratorModel::MASTER_ID) {
            $menuTree = $this->getMenuTree();
        } else {
            $menuTree = $this->getMenuTreeByPermissions(
                $this->getPermissions()
            );
        }

        return ResponseHelper::success($menuTree);
    }
} 