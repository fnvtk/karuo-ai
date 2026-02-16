<?php

namespace app\superadmin\controller\company;

use app\common\model\Company as CompanyModel;
use app\common\model\User as UsersModel;
use app\superadmin\controller\BaseController;
use Eison\Utils\Helper\ArrHelper;
use library\ResponseHelper;
use think\Db;
use think\Validate;

/**
 * 公司控制器
 */
class UpdateCompanyController extends BaseController
{
    /**
     * 通过id获取项目详情
     *
     * @return CompanyModel
     * @throws \Exception
     */
    protected function getCompanyDetailById(): CompanyModel
    {
        $company = CompanyModel::find(
            $this->request->post('id/d', 0)
        );

        if (!$company) {
            throw new \Exception('项目不存在', 404);
        }

        // 外部使用
        $this->companyId = $company->id;

        return $company;
    }

    /**
     * 通过账号获取用户信息
     *
     * @return UsersModel
     * @throws \Exception
     */
    protected function getUserDetailByCompanyId(): ?UsersModel
    {
        $where = [
            'isAdmin'   => UsersModel::MASTER_USER,   // 必须保证 isAdmin 有且只有一个
            'companyId' => $this->companyId,
        ];

        $user = UsersModel::where($where)->find();

        if (!$user) {
            throw new \Exception('用户不存在', 404);
        }

        return $user;
    }

    /**
     * 更新项目信息
     *
     * @param array $params
     * @return void
     * @throws \Exception
     */
    protected function updateCompany(array $params): void
    {
        $params = ArrHelper::getValue('name,status,memo', $params);
        $params = ArrHelper::rmValue($params);

        $company = $this->getCompanyDetailById();
        if (!$company->save($params)) {
            throw new \Exception('项目更新失败', 403);
        }
    }

    /**
     * 更新账号信息
     *
     * @param array $params
     * @return void
     */
    protected function updateUserAccount(array $params): void
    {
        $params = ArrHelper::getValue('username,account,password,phone,status', $params);
        $params = ArrHelper::rmValue($params);

        if (isset($params['password'])) {
            $params['passwordMd5'] = md5($params['password']);
            $params['passwordLocal'] = localEncrypt($params['password']);
        }

        $user = $this->getUserDetailByCompanyId();
        if (!$user->save($params)) {
            throw new \Exception('用户账号更新失败', 403);
        }
    }

    /**
     * 更新存客宝端数据
     *
     * @param array $params
     * @return self
     * @throws \Exception
     */
    protected function updateCkbAbout(array $params): self
    {
        // 1. 更新项目信息
        $this->updateCompany($params);

        // 2. 更新账号信息
        $this->updateUserAccount($params);

        return $this;
    }

    /**
     * 更新触客宝端数据
     *
     * @param array $params
     * @return self
     * @throws \Exception
     */
    protected function updateS2About(array $params): self
    {
        // 1. 更新项目信息
        $this->updateCompany($params);

        // 2. 更新账号信息
        $this->updateUserAccount($params);

        return $this;
    }

    /**
     * 检查项目名称是否已存在（排除自身）
     *
     * @param array $where
     * @return void
     * @throws \Exception
     */
    protected function checkCompanyNameOrAccountOrPhoneExists(array $where): void
    {
        extract($where);

        // 项目名称尽量不重名
        $exists = CompanyModel::where(compact('name'))->where('id', '<>', $id)->count() > 0;
        if ($exists) {
            throw new \Exception('项目名称已存在', 403);
        }

        // TODO（数据迁移时，存客宝，主账号先查询出id，通过id查询出S2的最新信息，然后更新。）
        $exists = UsersModel::where(compact('account'))->where('companyId', '<>', $id)->count() > 0;
        if ($exists) {
            throw new \Exception('用户账号已存在', 403);
        }

        // 手机号不重复
        $exists = UsersModel::where(compact('phone'))->where('companyId', '<>', $id)->count() > 0;
        if ($exists) {
            throw new \Exception('手机号已存在', 403);
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
            'id'       => 'require',
            'name'     => 'require|max:50|/\S+/',
            'username' => 'require|max:20|/\S+/',
            'account'  => 'require|regex:^[a-zA-Z0-9]+$|max:20|/\S+/',
            'phone'    => 'require|regex:/^1[3-9]\d{9}$/',
            'status'   => 'require|in:0,1'
        ], [
            'id.require'       => '非法请求',
            'name.require'     => '请输入项目名称',
            'username.require' => '请输入用户昵称',
            'account.require'  => '请输入账号',
            'account.regex'    => '账号只能用数字或者字母或者数字字母组合',
            'account.max'      => '账号长度受限',
            'phone.require'    => '请输入手机号',
            'phone.regex'      => '手机号格式错误',
            'status.require'   => '缺少重要参数',
            'status.in'        => '非法参数',
        ]);

        if (!$validate->check($params)) {
            throw new \Exception($validate->getError(), 400);
        }

        return $this;
    }

    /**
     * 更新项目信息
     *
     * @return \think\response\Json
     */
    public function index()
    {
        try {
            $params = $this->request->only(['id', 'name', 'status', 'username', 'account', 'password', 'phone', 'memo']);

            // 数据验证
            $this->dataValidate($params);
            $this->checkCompanyNameOrAccountOrPhoneExists(ArrHelper::getValue('id,name,account,phone', $params));

            Db::startTrans();
            $this->updateCkbAbout($params)->updateS2About($params);
            Db::commit();

            return ResponseHelper::success();
        } catch (\Exception $e) {
            Db::rollback();
            return ResponseHelper::error($e->getMessage(), $e->getCode());
        }
    }
} 