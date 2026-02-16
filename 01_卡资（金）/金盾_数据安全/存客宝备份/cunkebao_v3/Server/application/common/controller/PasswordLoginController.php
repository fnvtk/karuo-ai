<?php

namespace app\common\controller;

use app\common\model\User as UserModel;
use app\common\util\JwtUtil;
use Exception;
use library\ResponseHelper;
use think\Db;
use think\Validate;

/**
 * 认证控制器
 * 处理用户登录和身份验证
 */
class PasswordLoginController extends BaseController
{
    /**
     * 获取用户基本信息
     *
     * @param string $account
     * @param int $typeId
     * @return UserModel
     */
    protected function getUserProfileWithAccountAndType(string $account, int $typeId)
    {
        $user = UserModel::where(
            function ($query) use ($account) {
                $query->where('phone', $account)->whereOr('account', $account);
            }
        )
            ->where(
                function ($query) use ($typeId) {
                    $query->where('status', 1)->where('typeId', $typeId);
                }
            )->find();

       if(!empty($user)){
           return $user;
       }else{
           return '';
       }
    }

    /**
     * 获取用户信息
     *
     * @param string $account 账号（手机号）
     * @param string $password 密码（可能是加密后的）
     * @param int $typeId 身份信息
     * @return array|null
     */
    protected function getUser(string $account, string $password, int $typeId): array
    {
        $user = $this->getUserProfileWithAccountAndType($account, $typeId);
        if (!$user) {
            throw new \Exception('用户不存在或已禁用', 403);
        }

        $password = md5($password);
        if ($user->passwordMd5 !== $password) {
            throw new \Exception('账号或密码错误', 403);
        }

        return array_merge($user->toArray(), [
            'lastLoginIp' => $this->request->ip(),
            'lastLoginTime' => time()
        ]);
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
            'account' => 'require',
            'password' => 'require|length:6,64',
            'typeId' => 'require|in:1,2',
        ], [
            'account.require' => '账号不能为空',
            'password.require' => '密码不能为空',
            'password.length' => '密码长度必须在6-64个字符之间',
            'typeId.require' => '用户类型不能为空',
            'typeId.in' => '用户类型错误',
        ]);

        if (!$validate->check($params)) {
            throw new \Exception($validate->getError(), 400);
        }

        return $this;
    }

    /**
     * 用户登录
     *
     * @param string $account 账号（手机号）
     * @param string $password 密码（可能是加密后的）
     * @param string $typeId 登录IP
     * @param string $deviceId 本地设备imei
     * @return array
     * @throws \Exception
     */
    protected function doLogin(string $account, string $password, int $typeId, string $deviceId): array
    {
        // 获取用户信息
        $member = $this->getUser($account, $password, $typeId);
        $deviceTotal = Db::name('device')->where(['companyId' => $member['companyId'],'deleteTime' => 0])->count();

        //更新设备imei
        if ($typeId == 2 && !empty($deviceId)){
            $deviceUser = Db::name('device_user')->where(['companyId' => $member['companyId'],'userId' => $member['id'],'deleteTime' => 0])->find();
            if (!empty($deviceUser)){
                $device = Db::name('device')->where(['companyId' => $member['companyId'],'deleteTime' => 0,'id' => $deviceUser['deviceId']])->find();
                if (!empty($device) && empty($device['deviceImei'])){
                    Db::table('s2_device')->where(['id' => $device['id']])->update(['deviceImei' => $deviceId,'updateTime' => time()]);
                    Db::name('device')->where(['id' => $device['id']])->update(['deviceImei' => $deviceId,'updateTime' => time()]);
                }
            }
        }


        // 生成JWT令牌
        $token = JwtUtil::createToken($member, 86400 * 30);
        $token_expired = time() + 86400 * 30;
        return compact('member', 'token', 'token_expired','deviceTotal');
    }

    /**
     * 用户登录
     *
     * @return \think\response\Json
     */
    public function index()
    {
        $params = $this->request->only(['account', 'password', 'typeId','deviceId']);
        try {
            $deviceId = isset($params['deviceId']) ? $params['deviceId'] : '';
            $userData = $this->dataValidate($params)->doLogin(
                $params['account'],
                $params['password'],
                $params['typeId'],
                $deviceId
            );


            return ResponseHelper::success($userData, '登录成功');
        } catch (Exception $e) {
            return ResponseHelper::error($e->getMessage(), $e->getCode());
        }
    }
} 