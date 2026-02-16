<?php

namespace app\cunkebao\controller;

use app\common\model\Device;
use app\common\model\DeviceUser;
use app\common\model\User;
use library\ResponseHelper;
use think\Db;

/**
 * 门店端账号管理控制器
 */
class StoreAccountController extends BaseController
{
    /**
     * 创建账号
     * @return \think\response\Json
     */
    public function create()
    {
        try {
            // 获取参数
            $account = $this->request->param('account', '');
            $username = $this->request->param('username', '');
            $phone = $this->request->param('phone', '');
            $password = $this->request->param('password', '');
            $deviceId = $this->request->param('deviceId', 0);

            $companyId = $this->getUserInfo('companyId');

            // 参数验证
            if (empty($account)) {
                return ResponseHelper::error('账号不能为空');
            }
            if (empty($username)) {
                return ResponseHelper::error('昵称不能为空');
            }
            if (empty($phone)) {
                return ResponseHelper::error('手机号不能为空');
            }
            if (!preg_match('/^1[3-9]\d{9}$/', $phone)) {
                return ResponseHelper::error('手机号格式不正确');
            }
            if (empty($password)) {
                return ResponseHelper::error('密码不能为空');
            }
            if (strlen($password) < 6 || strlen($password) > 20) {
                return ResponseHelper::error('密码长度必须在6-20个字符之间');
            }
            if (empty($deviceId)) {
                return ResponseHelper::error('请选择设备');
            }

            // 检查账号是否已存在（同一 typeId 和 companyId 下不能重复）
            $existUser = Db::name('users')->where(['account' => $account, 'companyId' => $companyId, 'typeId' => 2, 'deleteTime' => 0])
                ->find();
            if ($existUser) {
                return ResponseHelper::error('账号已存在');
            }

            // 检查手机号是否已存在（同一 typeId 和 companyId 下不能重复）
            $existPhone = Db::name('users')->where(['phone' => $phone, 'companyId' => $companyId, 'typeId' => 2, 'deleteTime' => 0])
                ->find();
            if ($existPhone) {
                return ResponseHelper::error('手机号已被使用');
            }

            // 检查设备是否存在且属于当前公司
            $device = Device::where('id', $deviceId)
                ->where('companyId', $companyId)
                ->find();
            if (!$device) {
                return ResponseHelper::error('设备不存在或没有权限');
            }

            // 开始事务
            Db::startTrans();
            try {
                // 创建用户
                $userData = [
                    'account' => $account,
                    'username' => $username,
                    'phone' => $phone,
                    'passwordMd5' => md5($password),
                    'passwordLocal' => localEncrypt($password),
                    'avatar' => '',
                    'isAdmin' => 0,
                    'companyId' => $companyId,
                    'typeId' => 2, // 门店端固定为2
                    'status' => 1, // 默认可用
                    'balance' => 0,
                    'tokens' => 0,
                    'createTime' => time(),
                ];

                $userId = Db::name('users')->insertGetId($userData);

                // 绑定设备
                Db::name('device_user')->insert([
                    'companyId' => $companyId,
                    'userId' => $userId,
                    'deviceId' => $deviceId,
                    'deleteTime' => 0,
                ]);

                // 提交事务
                Db::commit();

                return ResponseHelper::success('创建账号成功');
            } catch (\Exception $e) {
                Db::rollback();
                throw $e;
            }
        } catch (\Exception $e) {
            return ResponseHelper::error($e->getMessage(), $e->getCode() ?: 500);
        }
    }

    /**
     * 编辑账号
     * @return \think\response\Json
     */
    public function update()
    {
        try {
            $userId = $this->request->param('userId', 0);
            $account = $this->request->param('account', '');
            $username = $this->request->param('username', '');
            $phone = $this->request->param('phone', '');
            $password = $this->request->param('password', '');
            $deviceId = $this->request->param('deviceId', 0);

            $companyId = $this->getUserInfo('companyId');

            // 参数验证
            if (empty($userId)) {
                return ResponseHelper::error('用户ID不能为空');
            }

            // 检查用户是否存在且属于当前公司
            $user = Db::name('users')->where(['id' => $userId, 'companyId' => $companyId, 'typeId' => 2])->find();
            if (!$user) {
                return ResponseHelper::error('用户不存在或没有权限');
            }

            $updateData = [];

            // 更新账号
            if (!empty($account)) {
                // 检查账号是否已被其他用户使用（同一 typeId 下）
                $existUser = Db::name('users')->where(['account' => $account, 'companyId' => $companyId, 'typeId' => 2, 'deleteTime' => 0])
                    ->where('id', '<>', $userId)
                    ->find();
                if ($existUser) {
                    return ResponseHelper::error('账号已被使用');
                }
                $updateData['account'] = $account;
            }

            // 更新昵称
            if (!empty($username)) {
                $updateData['username'] = $username;
            }

            // 更新手机号
            if (!empty($phone)) {
                if (!preg_match('/^1[3-9]\d{9}$/', $phone)) {
                    return ResponseHelper::error('手机号格式不正确');
                }
                // 检查手机号是否已被其他用户使用（同一 typeId 下）
                $existPhone = Db::name('users')->where(['phone' => $phone, 'companyId' => $companyId, 'typeId' => 2, 'deleteTime' => 0])
                    ->where('id', '<>', $userId)
                    ->find();
                if ($existPhone) {
                    return ResponseHelper::error('手机号已被使用');
                }
                $updateData['phone'] = $phone;
            }

            // 更新密码
            if (!empty($password)) {
                if (strlen($password) < 6 || strlen($password) > 20) {
                    return ResponseHelper::error('密码长度必须在6-20个字符之间');
                }
                $updateData['passwordMd5'] = md5($password);
                $updateData['passwordLocal'] = localEncrypt($password);
            }

            // 更新设备绑定
            if (!empty($deviceId)) {
                // 检查设备是否存在且属于当前公司
                $device = Device::where('id', $deviceId)
                    ->where('companyId', $companyId)
                    ->find();
                if (!$device) {
                    return ResponseHelper::error('设备不存在或没有权限');
                }
            }

            // 开始事务
            Db::startTrans();
            try {
                // 更新用户信息
                if (!empty($updateData)) {
                    $updateData['updateTime'] = time();
                    Db::name('users')->where(['id' => $userId])->update($updateData);
                }

                // 更新设备绑定
                if (!empty($deviceId)) {
                    // 删除旧的设备绑定
                    Db::name('device_user')->where(['userId' => $userId, 'companyId' => $companyId])->delete();

                    // 添加新的设备绑定
                    Db::name('device_user')->insert([
                        'companyId' => $companyId,
                        'userId' => $userId,
                        'deviceId' => $deviceId,
                        'deleteTime' => 0,
                    ]);
                }

                // 提交事务
                Db::commit();

                return ResponseHelper::success('更新账号成功');
            } catch (\Exception $e) {
                Db::rollback();
                throw $e;
            }
        } catch (\Exception $e) {
            return ResponseHelper::error($e->getMessage(), $e->getCode() ?: 500);
        }
    }

    /**
     * 删除账号
     * @return \think\response\Json
     */
    public function delete()
    {
        try {
            $userId = $this->request->param('userId', 0);
            $companyId = $this->getUserInfo('companyId');

            if (empty($userId)) {
                return ResponseHelper::error('用户ID不能为空');
            }

            // 检查用户是否存在且属于当前公司
            $user = Db::name('users')->where(['id' => $userId, 'companyId' => $companyId, 'typeId' => 2])->find();
            if (!$user) {
                return ResponseHelper::error('用户不存在或没有权限');
            }

            // 检查是否是管理账号
            if ($user['isAdmin'] == 1) {
                return ResponseHelper::error('管理账号无法删除');
            }

            // 软删除用户
            Db::name('users')->where(['id' => $userId])->update([
                'deleteTime' => time(),
                'updateTime' => time()
            ]);

            // 软删除设备绑定关系
            Db::name('device_user')->where(['userId' => $userId, 'companyId' => $companyId])->update([
                'deleteTime' => time()
            ]);

            return ResponseHelper::success('删除账号成功');
        } catch (\Exception $e) {
            return ResponseHelper::error($e->getMessage(), $e->getCode() ?: 500);
        }
    }

    /**
     * 禁用/启用账号
     * @return \think\response\Json
     */
    public function disable()
    {
        try {
            $userId = $this->request->param('userId', 0);
            $status = $this->request->param('status', -1); // 0-禁用 1-启用
            $companyId = $this->getUserInfo('companyId');

            if (empty($userId)) {
                return ResponseHelper::error('用户ID不能为空');
            }

            if ($status != 0 && $status != 1) {
                return ResponseHelper::error('状态参数错误');
            }

            // 检查用户是否存在且属于当前公司
            $user = Db::name('users')->where(['id' => $userId, 'companyId' => $companyId, 'typeId' => 2])->find();
            if (!$user) {
                return ResponseHelper::error('用户不存在或没有权限');
            }

            // 检查是否是管理账号
            if ($user['isAdmin'] == 1 && $status == 0) {
                return ResponseHelper::error('管理账号无法禁用');
            }

            // 更新状态
            Db::name('users')->where(['id' => $userId])->update([
                'status' => $status,
                'updateTime' => time()
            ]);

            $message = $status == 0 ? '禁用账号成功' : '启用账号成功';
            return ResponseHelper::success($message);
        } catch (\Exception $e) {
            return ResponseHelper::error($e->getMessage(), $e->getCode() ?: 500);
        }
    }

    /**
     * 获取账号列表
     * @return \think\response\Json
     */
    public function index()
    {
        try {
            $keyword = $this->request->param('keyword', '');
            $status = $this->request->param('status', '');
            $page = $this->request->param('page/d', 1);
            $limit = $this->request->param('limit/d', 10);

            $companyId = $this->getUserInfo('companyId');

            // 构建查询条件
            $where = [
                ['companyId', '=', $companyId],
                ['typeId', '=', 2], // 只查询门店端账号
                ['deleteTime', '=', 0]
            ];

            // 关键词搜索（账号、昵称、手机号）
            if (!empty($keyword)) {
                $where[] = ['account|username|phone', "LIKE", '%'.$keyword.'%'];
            }

            // 状态筛选
            if ($status !== '') {
                $where[] = ['status', '=', $status];
            }

            // 分页查询
            $query = Db::name('users')->where($where);
            $total = $query->count();

            $list = $query->field('id,account,username,phone,avatar,isAdmin,status,balance,tokens,createTime')
                ->order('id desc')
                ->page($page, $limit)
                ->select();


            // 获取每个账号绑定的设备（单个设备）
            if (!empty($list)) {
                $userIds = array_column($list, 'id');
                $deviceBindings = Db::name('device_user')
                    ->alias('du')
                    ->join('device d', 'd.id = du.deviceId', 'left')
                    ->where([
                        ['du.userId', 'in', $userIds],
                        ['du.companyId', '=', $companyId],
                        ['du.deleteTime', '=', 0]
                    ])
                    ->field('du.userId,du.deviceId,d.imei,d.memo')
                    ->order('du.id desc')
                    ->select();

                // 组织设备数据（单个设备对象）
                $deviceMap = [];
                foreach ($deviceBindings as $binding) {
                    $deviceMap[$binding['userId']] = [
                        'deviceId' => $binding['deviceId'],
                        'imei' => $binding['imei'],
                        'memo' => $binding['memo']
                    ];
                }

                // 将设备信息添加到用户数据中
                foreach ($list as &$item) {
                    $item['device'] = $deviceMap[$item['id']] ?? null;
                }
            }

            return ResponseHelper::success([
                'list' => $list,
                'total' => $total,
                'page' => $page,
                'limit' => $limit
            ]);
        } catch (\Exception $e) {
            return ResponseHelper::error($e->getMessage(), $e->getCode() ?: 500);
        }
    }
}
