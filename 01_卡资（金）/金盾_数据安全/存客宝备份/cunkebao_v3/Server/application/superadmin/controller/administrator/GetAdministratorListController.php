<?php

namespace app\superadmin\controller\administrator;

use app\common\model\Administrator as AdministratorModel;
use app\common\model\AdministratorPermissions as AdministratorPermissionsModel;
use app\common\model\Menu as MenuModel;
use library\ResponseHelper;
use think\Controller;

/**
 * 管理员控制器
 */
class GetAdministratorListController extends Controller
{
    /**
     * 构建查询条件
     *
     * @param array $params
     * @return array
     */
    protected function makeWhere(array $params = []): array
    {
        $where = [];

        // 如果有搜索关键词
        if (!empty($keyword = $this->request->param('keyword/s', ''))) {
            $where[] = ['account|username', 'like', "%{$keyword}%"];
        }

        return array_merge($params, $where);
    }

    /**
     * 获取管理员列表
     *
     * @param array $where 查询条件
     * @return \think\Paginator 分页对象
     */
    protected function getAdministratorList(array $where): \think\Paginator
    {
        $query = AdministratorModel::alias('a')
            ->field([
                'a.id', 'a.account', 'a.username', 'a.status', 'a.authId', 'a.createTime createdAt', 'a.lastLoginTime', 'a.lastLoginIp'
            ]);

        foreach ($where as $key => $value) {
            if (is_numeric($key) && is_array($value) && isset($value[0]) && $value[0] === 'exp') {
                $query->whereExp('', $value[1]);
                continue;
            }

            $query->where($key, $value);
        }

        return $query->paginate($this->request->param('limit/d', 10), false, ['page' => $this->request->param('page/d', 1)]);
    }

    /**
     * 根据权限ID获取角色名称
     *
     * @param int $authId 权限ID
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
     * 获取管理员权限
     *
     * @param int $adminId
     * @return array
     */
    protected function _getPermissions(int $adminId): array
    {
        $record = AdministratorPermissionsModel::where('adminId', $adminId)->find();

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
     * 通过菜单的id获取菜单的名字
     *
     * @param array $ids
     * @return array
     */
    protected function getMenusNameByIds(array $ids): array
    {
        return MenuModel::whereIn('id', $ids)->column('title');
    }

    /**
     * 根据权限ID获取权限列表
     *
     * @param int $authId 权限ID
     * @return array
     */
    protected function getPermissions(int $authId): array
    {
        $ids = $this->_getPermissions($authId);

        if ($ids) {
            return $this->getMenusNameByIds($ids);
        }

        return [];
    }

    /**
     * 构建返回数据
     *
     * @param \think\Paginator $list
     * @return array
     */
    protected function makeReturnedResult(\think\Paginator $list): array
    {
        $result = [];

        foreach ($list->items() as $item) {
            $section = [
                'id'          => $item->id,
                'account'     => $item->account,
                'username'    => $item->username,
                'status'      => $item->status,
                'createdAt'   => date('Y-m-d H:i:s', $item->createdAt),
                'lastLogin'   => !empty($item->lastLoginTime) ? date('Y-m-d H:i:s', $item->lastLoginTime) : '从未登录',
                'role'        => $this->getRoleName($item->authId),
                'permissions' => $this->getPermissions($item->id),
            ];

            array_push($result, $section);
        }

        return $result;
    }

    /**
     * 获取管理员列表
     *
     * @return \think\response\Json
     */
    public function index()
    {
        $where = $this->makeWhere();
        $result = $this->getAdministratorList($where);

        return ResponseHelper::success(
            [
                'list'  => $this->makeReturnedResult($result),
                'total' => $result->total(),
            ]
        );
    }
} 