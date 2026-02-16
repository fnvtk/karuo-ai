<?php

namespace app\cunkebao\controller;

use app\api\controller\AccountController;
use app\api\controller\UserController;
use app\common\service\ClassTableService;
use library\ResponseHelper;
use think\Controller;
use think\Db;

/**
 * 设备管理控制器
 */
class BaseController extends Controller
{
    /**
     * 用户信息
     * @var object
     */
    protected $user;

    /**
     * @var ClassTableService
     */
    protected $classTable;

    /**
     * @inheritDoc
     */
    public function __construct(ClassTableService $classTable)
    {
        $this->classTable = $classTable;

        parent::__construct();
    }

    /**
     * 初始化
     */
    protected function initialize()
    {
        parent::initialize();

        date_default_timezone_set('Asia/Shanghai');
    }

    /**
     * 获取用户信息
     *
     * @param string $column
     * @return mixed
     * @throws \Exception
     */
    protected function getUserInfo(?string $column = null)
    {
        $user = $this->request->userInfo;

        if (!$user) {
            throw new \Exception('未授权访问，缺少有效的身份凭证', 401);
        }

        return $column ? $user[$column] : $user;
    }


    public function editUserInfo()
    {
        $userId = $this->request->param('userId', '');
        $nickname = $this->request->param('nickname', '');
        $avatar = $this->request->param('avatar', '');
        $phone = $this->request->param('phone', '');
        $companyId = $this->getUserInfo('companyId');
        if (empty($userId)) {
            return ResponseHelper::error('用户id不能为空');
        }

        if (empty($nickname) && empty($avatar) && empty($phone)) {
            return ResponseHelper::error('修改的用户信息不能为空');
        }

        $user = Db::name('users')->where(['id' => $userId, 'companyId' => $companyId])->find();
        if (empty($user)) {
            return ResponseHelper::error('用户不存在');
        }

        $user2 = Db::name('users')->where(['phone' => $phone])->find();
        if (!empty($user2) && $user2['id'] != $userId) {
            return ResponseHelper::error('修改的手机号已存在');
        }

        $data = [
            'id' => $user['s2_accountId'],
        ];

        if (!empty($nickname)) {
            $data['nickname'] = $nickname;
        }
        if (!empty($avatar)) {
            $data['avatar'] = $avatar;
        }
        if (!empty($phone)) {
            $data['phone'] = $phone;
        }

        $AccountControllel = new AccountController();
        $res = $AccountControllel->accountModify($data);
        $res = json_decode($res, true);
        if ($res['code'] == 200) {
            unset($data['id']);
            if (!empty($nickname)) {
                $data['username'] = $nickname;
                unset($data['nickname']);
            }
            Db::name('users')->where(['id' => $userId, 'companyId' => $companyId])->update($data);
            return ResponseHelper::success('更新成功');
        } else {
            return ResponseHelper::error($res['msg']);
        }
    }


    public function editPassWord()
    {
        $userId = $this->request->param('userId', '');
        $passWord = $this->request->param('passWord', '');
        $companyId = $this->getUserInfo('companyId');
        if (empty($userId)) {
            return ResponseHelper::error('用户id不能为空');
        }

        if (empty($passWord)) {
            return ResponseHelper::error('密码不能为空');
        }

        $user = Db::name('users')->where(['id' => $userId, 'companyId' => $companyId])->find();
        if (empty($user)) {
            return ResponseHelper::error('用户不存在');
        }
        if ($user['passwordMd5'] == md5($passWord)) {
            return ResponseHelper::error('新密码与旧密码一致');
        }

        $data = [
            'passwordMd5' => md5($passWord),
            'passwordLocal' => localEncrypt($passWord),
            'updateTime' => time()
        ];

        $res = Db::name('users')->where(['id' => $userId, 'companyId' => $companyId])->update($data);
        if (!empty($res)) {
            if ($user['typeId'] == 1 && !empty($user['s2_accountId'])) {
                $UserController = new UserController();
                $UserController->modifyPwd(['id' => $user['s2_accountId'],'pwd' => $passWord]);
            }


            return ResponseHelper::success('密码修改成功');
        } else {
            return ResponseHelper::error('密码修改失败');
        }
    }
} 