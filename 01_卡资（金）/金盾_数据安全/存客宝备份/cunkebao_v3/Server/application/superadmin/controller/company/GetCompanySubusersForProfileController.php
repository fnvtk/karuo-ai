<?php

namespace app\superadmin\controller\company;

use app\common\model\User as UserModel;
use library\ResponseHelper;
use think\Controller;

/**
 * 设备管理控制器
 */
class GetCompanySubusersForProfileController extends Controller
{
    /**
     * 获取项目下的所有子账号
     *
     * @return CompanyModel
     * @throws \Exception
     */
    protected function getSubusers(): array
    {
        $where = [
            'companyId' => $this->request->param('companyId/d', 0),
            'isAdmin'   => UserModel::ADMIN_OTP
        ];

        return UserModel::alias('u')
            ->field([
                'u.id', 'u.account', 'u.phone', 'u.username', 'u.avatar', 'u.status', 'u.createTime', 'u.typeId'
            ])
            ->where($where)
            ->select()
            ->toArray();
    }

    /**
     * 获取公司关联的设备列表
     *
     * @return \think\response\Json
     */
    public function index()
    {
        $users = $this->getSubusers();

        foreach ($users as &$user) {
            $user['createTime'] = date('Y-m-d H:i:s', $user['createTime']);
        }

        return ResponseHelper::success($users);
    }
} 