<?php

namespace app\superadmin\controller\company;

use app\api\controller\DeviceController;
use app\common\model\Company as CompanyModel;
use app\common\model\User as UsersModel;
use app\superadmin\controller\BaseController;
use Eison\Utils\Helper\ArrHelper;
use Exception;
use library\ResponseHelper;
use library\s2\CurlHandle;
use think\Db;
use think\facade\Env;
use think\response\Json;
use think\Validate;

/**
 * 公司控制器
 */
class CreateCompanyController extends BaseController
{
    /**
     * S2 创建用户。
     *
     * @param array $params
     * @return mixed|null
     * @throws Exception
     */
    protected function s2CreateUser(array $params): ?array
    {
        $params = ArrHelper::getValue('account=userName,password,username=realName,username=nickname,companyId=departmentId', $params);

        // 创建账号
        $response = CurlHandle::getInstant()
            ->setBaseUrl(Env::get('rpc.API_BASE_URL'))
            ->setMethod('post')
            ->send('/v1/api/account/create', $params);

        $result = json_decode($response, true);

        if ($result['code'] != 200) {
            throw new Exception($result['msg'], 210 . $result['code']);
        }

        return $result['data'] ?: null;
    }

    /**
     * S2 创建部门并返回id
     *
     * @param array $params
     * @return array
     */
    protected function s2CreateDepartmentAndUser(array $params): ?array
    {
        $params = ArrHelper::getValue('name=departmentName,memo=departmentMemo,account=accountName,password=accountPassword,username=accountRealName,username=accountNickname,accountMemo', $params);

        // 创建公司部门
        $response = CurlHandle::getInstant()
            ->setBaseUrl(Env::get('rpc.API_BASE_URL'))
            ->setMethod('post')
            ->send('/v1/api/account/createNewAccount', $params);

        $result = json_decode($response, true);

        if ($result['code'] != 200) {
            throw new Exception($result['msg'], 210 . $result['code']);
        }

        return $result['data'] ?: null;
    }

    /**
     * 数据验证
     *
     * @param array $params
     * @return $this
     * @throws Exception
     */
    protected function dataValidate(array $params): self
    {
        $validate = Validate::make([
            'name'     => 'require|max:50|/\S+/',
            'account'  => 'require|regex:^[a-zA-Z0-9]+$|max:20|/\S+/',
            'username' => 'require|max:20|/\S+/',
            'phone'    => 'require|regex:/^1[3-9]\d{9}$/',
            'status'   => 'require|in:0,1',
            'password' => 'require|/\S+/',
            'memo'     => '/\S+/',
        ], [
            'name.require'     => '请输入项目名称',
            'account.require'  => '请输入账号',
            'account.max'      => '账号长度受限',
            'account.regex'    => '账号只能用数字或者字母或者数字字母组合',
            'username.require' => '请输入用户昵称',
            'phone.require'    => '请输入手机号',
            'phone.regex'      => '手机号格式错误',
            'status.require'   => '缺少重要参数',
            'status.in'        => '非法参数',
            'password.require' => '请输入密码',
        ]);

        if (!$validate->check($params)) {
            throw new Exception($validate->getError(), 400);
        }

        return $this;
    }

    /**
     * 设备创建分组
     *
     * @param array $params
     * @return void
     * @throws Exception
     */
    protected function s2CreateDeviceGroup(array $params): void
    {
        $respon = (new DeviceController())->createGroup($params, true);
        $respon = json_decode($respon, true);

        if ($respon['code'] != 200) {
            throw new Exception('设备分组添加错误', 210 . $respon['code']);
        }
    }

    /**
     * S2 部分
     *
     * @param array $params
     * @return array
     * @throws Exception
     */
    protected function creatS2About(array $params): array
    {
        $department = $this->s2CreateDepartmentAndUser($params);

        if (!$department || !isset($department['id']) || !isset($department['departmentId'])) {
            throw new Exception('S2返参异常', 210402);
        }

        // 设备创建分组
        $this->s2CreateDeviceGroup(['groupName' => $params['name']]);

        return array_merge($params, [
            'companyId'    => $department['departmentId'],
            's2_accountId' => $department['id'],
        ]);
    }

    /**
     * 存客宝创建项目
     *
     * @param array $params
     * @return void
     * @throws Exception
     */
    protected function ckbCreateCompany(array $params): void
    {
        $params = ArrHelper::getValue('companyId=id,companyId,name,memo,status', $params);
        $result = CompanyModel::create($params);

        if (!$result) {
            throw new Exception('创建公司记录失败', 402);
        }
    }

    /**
     * 创建功能账号，不可登录，也非管理员，用户也不可见.
     *
     * @param array $params
     * @return void
     * @throws Exception
     */
    protected function createFuncUsers(array $params): void
    {
        $seedCols = [
            ['account' => $params['account'] . '_01', 'username' => $params['username'] . '_子账号01', 'status' => UsersModel::ADMIN_STP, 'isAdmin' => UsersModel::ADMIN_OTP, 'typeId' => UsersModel::MASTER_USER],
            ['account' => $params['account'] . '_02', 'username' => $params['username'] . '_子账号02', 'status' => UsersModel::ADMIN_STP, 'isAdmin' => UsersModel::ADMIN_OTP, 'typeId' => UsersModel::MASTER_USER],
            ['account' => $params['account'] . '_03', 'username' => $params['username'] . '_子账号03', 'status' => UsersModel::ADMIN_STP, 'isAdmin' => UsersModel::ADMIN_OTP, 'typeId' => UsersModel::MASTER_USER],
            ['account' => $params['account'] . '_offline', 'username' => $params['username'] . '_处理离线专用', 'status' => UsersModel::STATUS_STOP, 'isAdmin' => UsersModel::ADMIN_OTP, 'typeId' => UsersModel::NOT_USER],
            ['account' => $params['account'] . '_delete', 'username'  => $params['username'] . '_处理删除专用', 'status' => UsersModel::STATUS_STOP, 'isAdmin' => UsersModel::ADMIN_OTP, 'typeId' => UsersModel::NOT_USER],
        ];

        foreach ($seedCols as $seeds) {
            $this->s2CreateUser(array_merge($params, ArrHelper::getValue('account,username', $seeds)));
            $this->ckbCreateUser(array_merge($params, $seeds));
        }
    }

    /**
     * 存客宝创建账号
     *
     * @param array $params
     * @return void
     * @throws Exception
     */
    protected function ckbCreateUser(array $params): void
    {
        $params = ArrHelper::getValue('username,account,password,companyId,s2_accountId,status,phone,isAdmin,typeId', $params);

        $params = array_merge($params, [
            'passwordLocal' => localEncrypt($params['password']),
            'passwordMd5'   => md5($params['password']),
        ]);

        if (!UsersModel::create($params)) {
            throw new Exception('创建用户记录失败', 402);
        }
    }

    /**
     * @param array $params
     * @return void
     * @throws Exception
     */
    protected function createCkbAbout(array $params)
    {
        // 1. 存客宝创建项目
        $this->ckbCreateCompany($params);

        // 2. 存客宝创建操盘手总账号
        $this->ckbCreateUser(array_merge($params, [
            'isAdmin' => UsersModel::ADMIN_STP,     // 主要账号默认1
            'typeId'  => UsersModel::MASTER_USER,   // 类型：运营后台/操盘手传1、 门店传2
        ]));
    }

    /**
     * 检查项目名称是否已存在
     *
     * @param array $where
     * @return void
     * @throws Exception
     */
    protected function checkCompanyNameOrAccountOrPhoneExists(array $where): void
    {
        extract($where);

        // 项目名称尽量不重名
        $exists = CompanyModel::where(compact('name'))->count() > 0;
        if ($exists) {
            throw new Exception('项目名称已存在', 403);
        }

        // 账号不重名
        $exists = UsersModel::where(compact('account'))->count() > 0;
        if ($exists) {
            throw new Exception('用户账号已存在', 403);
        }

        // 手机号不重名
        $exists = UsersModel::where(compact('phone'))->count() > 0;
        if ($exists) {
            throw new Exception('手机号已存在', 403);
        }
    }



    /**
     * 创建新项目
     *
     * @return Json
     */
    public function index()
    {
        try {
            $params = $this->request->only(['name', 'status', 'username', 'account', 'password', 'phone', 'memo']);
            $params = $this->dataValidate($params)->creatS2About($params);

            Db::startTrans();

            $this->checkCompanyNameOrAccountOrPhoneExists(ArrHelper::getValue('name,account,phone', $params));
            $this->createCkbAbout($params);

            // 创建功能账号，不可登录，也非管理员，用户也不可见
            $this->createFuncUsers($params);
            Db::commit();

            return ResponseHelper::success();
        } catch (Exception $e) {
            Db::rollback();
            return ResponseHelper::error($e->getMessage(), $e->getCode());
        }
    }
} 