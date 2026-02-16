<?php

namespace app\superadmin\controller\Menu;

use app\common\model\Menu as MenuModel;
use app\superadmin\controller\BaseController;
use library\ResponseHelper;

/**
 * 菜单控制器
 */
class GetTopLevelForPermissionController extends BaseController
{
    /**
     * 获取所有启用的一级菜单
     *
     * @return \think\response\Json
     */
    protected function getTopLevelMenus(): array
    {
        $where = [
            'parentId' => MenuModel::TOP_LEVEL,
            'status'   => MenuModel::STATUS_NORMAL
        ];

        return MenuModel::where($where)->field('id, title')->order('sort', 'asc')->select()->toArray();
    }

    /**
     * 获取一级菜单（供权限设置使用）
     *
     * @return \think\response\Json
     */
    public function index()
    {
        $menus = $this->getTopLevelMenus();

        return ResponseHelper::success($menus);
    }
} 