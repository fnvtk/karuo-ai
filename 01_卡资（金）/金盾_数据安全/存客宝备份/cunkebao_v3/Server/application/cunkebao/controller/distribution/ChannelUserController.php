<?php

namespace app\cunkebao\controller\distribution;

use app\cunkebao\model\DistributionChannel;
use app\cunkebao\model\DistributionWithdrawal;
use app\common\util\JwtUtil;
use think\Controller;
use think\Db;
use think\Exception;

/**
 * 分销渠道用户端控制器
 * 用户通过渠道编码访问，无需JWT认证
 */
class ChannelUserController extends Controller
{
    /**
     * 初始化方法，设置跨域响应头
     */
    protected function initialize()
    {
        parent::initialize();
        
        // 处理OPTIONS预检请求
        if ($this->request->method(true) == 'OPTIONS') {
            $origin = $this->request->header('origin', '*');
            header("Access-Control-Allow-Origin: " . $origin);
            header("Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie");
            header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH');
            header("Access-Control-Allow-Credentials: true");
            header("Access-Control-Max-Age: 86400");
            exit;
        }
    }

    /**
     * 设置跨域响应头
     * @param \think\response\Json $response
     * @return \think\response\Json
     */
    protected function setCorsHeaders($response)
    {
        $origin = $this->request->header('origin', '*');
        $response->header([
            'Access-Control-Allow-Origin' => $origin,
            'Access-Control-Allow-Headers' => 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie',
            'Access-Control-Allow-Methods' => 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
            'Access-Control-Allow-Credentials' => 'true',
            'Access-Control-Max-Age' => '86400',
        ]);
        return $response;
    }

    /**
     * 渠道登录
     * @return \think\response\Json
     */
    public function login()
    {
        try {
            // 获取参数
            $phone = $this->request->param('phone', '');
            $password = $this->request->param('password', '');
            $companyId = $this->request->param('companyId', 0);
            // 参数验证
            if (empty($phone)) {
                return $this->setCorsHeaders(json([
                    'code' => 400,
                    'success' => false,
                    'msg' => '手机号不能为空',
                    'data' => null
                ]));
            }

            if (empty($password)) {
                return $this->setCorsHeaders(json([
                    'code' => 400,
                    'success' => false,
                    'msg' => '密码不能为空',
                    'data' => null
                ]));
            }

            // 查询渠道信息（通过手机号）
            $channel = Db::name('distribution_channel')
                ->where([
                    ['phone', '=', $phone],
                    ['companyId', '=', $companyId],
                    ['deleteTime', '=', 0]
                ])
                ->find();

        
            if (!$channel) {
                return $this->setCorsHeaders(json([
                    'code' => 404,
                    'success' => false,
                    'msg' => '渠道不存在',
                    'data' => null
                ]));
            }

            // 检查渠道状态
            if ($channel['status'] !== DistributionChannel::STATUS_ENABLED) {
                return $this->setCorsHeaders(json([
                    'code' => 403,
                    'success' => false,
                    'msg' => '渠道已被禁用',
                    'data' => null
                ]));
            }

            // 验证密码（MD5加密）
            $passwordMd5 = md5($password);
            if ($channel['password'] !== $passwordMd5) {
                return $this->setCorsHeaders(json([
                    'code' => 401,
                    'success' => false,
                    'msg' => '密码错误',
                    'data' => null
                ]));
            }

            // 准备token载荷（不包含密码）
            $payload = [
                'id' => $channel['id'],
                'channelId' => $channel['id'],
                'channelCode' => $channel['code'],
                'channelName' => $channel['name'],
                'companyId' => $channel['companyId'],
                'type' => 'channel', // 标识这是渠道登录
            ];

            // 生成JWT令牌（30天有效期）
            $expire = 86400 * 30;
            $token = JwtUtil::createToken($payload, $expire);
            $tokenExpired = time() + $expire;

            // 更新最后登录时间（可选）
            Db::name('distribution_channel')
                ->where('id', $channel['id'])
                ->update([
                    'updateTime' => time()
                ]);

            // 返回数据（不包含密码）
            $data = [
                'token' => $token,
                'tokenExpired' => $tokenExpired,
                'channelInfo' => [
                    'id' => (string)$channel['id'],
                    'channelCode' => $channel['code'],
                    'channelName' => $channel['name'],
                    'phone' => $channel['phone'] ?: '',
                    'wechatId' => $channel['wechatId'] ?: '',
                    'companyId' => (int)$channel['companyId'], // 返回companyId，方便小程序自动跳转
                    'status' => $channel['status'],
                    'totalCustomers' => (int)$channel['totalCustomers'],
                    'todayCustomers' => (int)$channel['todayCustomers'],
                    'totalFriends' => (int)$channel['totalFriends'],
                    'todayFriends' => (int)$channel['todayFriends'],
                    'withdrawableAmount' => round(($channel['withdrawableAmount'] ?? 0) / 100, 2), // 分转元
                ]
            ];

            return $this->setCorsHeaders(json([
                'code' => 200,
                'success' => true,
                'msg' => '登录成功',
                'data' => $data
            ]));

        } catch (Exception $e) {
            return $this->setCorsHeaders(json([
                'code' => $e->getCode() ?: 500,
                'success' => false,
                'msg' => '登录失败：' . $e->getMessage(),
                'data' => null
            ]));
        }
    }

    /**
     * 获取渠道首页数据
     * @return \think\response\Json
     */
    public function index()
    {
        try {
            // 获取参数
            $channelCode = $this->request->param('channelCode', '');

            // 参数验证
            if (empty($channelCode)) {
                return $this->setCorsHeaders(json([
                    'code' => 400,
                    'success' => false,
                    'msg' => '渠道编码不能为空',
                    'data' => null
                ]));
            }

            // 查询渠道信息
            $channel = Db::name('distribution_channel')
                ->where([
                    ['code', '=', $channelCode],
                    ['status', '=', DistributionChannel::STATUS_ENABLED],
                    ['deleteTime', '=', 0]
                ])
                ->find();

            if (!$channel) {
                return $this->setCorsHeaders(json([
                    'code' => 404,
                    'success' => false,
                    'msg' => '渠道不存在或已被禁用',
                    'data' => null
                ]));
            }

            $channelId = $channel['id'];
            $companyId = $channel['companyId'];

            // 1. 渠道基本信息
            $channelInfo = [
                'channelName' => $channel['name'] ?? '',
                'channelCode' => $channel['code'] ?? '',
                'phone' => $channel['phone'] ?? '',
                'wechatId' => $channel['wechatId'] ?? '',
                'remark' => $channel['remark'] ?? '',
                'createTime' => !empty($channel['createTime']) ? date('Y-m-d H:i:s', $channel['createTime']) : '',
                'createType' => $channel['createType'] ?? '',
            ];

            // 2. 财务统计
            // 当前可提现金额
            $withdrawableAmount = round(($channel['withdrawableAmount'] ?? 0) / 100, 2); // 分转元

            // 已提现金额（已打款的提现申请）
            $withdrawnAmount = Db::name('distribution_withdrawal')
                ->where([
                    ['companyId', '=', $companyId],
                    ['channelId', '=', $channelId],
                    ['status', '=', DistributionWithdrawal::STATUS_PAID]
                ])
                ->sum('amount');
            $withdrawnAmount = round(($withdrawnAmount ?? 0) / 100, 2); // 分转元

            // 待审核金额（待审核的提现申请）
            $pendingReviewAmount = Db::name('distribution_withdrawal')
                ->where([
                    ['companyId', '=', $companyId],
                    ['channelId', '=', $channelId],
                    ['status', '=', DistributionWithdrawal::STATUS_PENDING]
                ])
                ->sum('amount');
            $pendingReviewAmount = round(($pendingReviewAmount ?? 0) / 100, 2); // 分转元

            // 总收益（所有收益记录的总和）
            $totalRevenue = Db::name('distribution_revenue_record')
                ->where([
                    ['companyId', '=', $companyId],
                    ['channelId', '=', $channelId]
                ])
                ->sum('amount');
            $totalRevenue = round(($totalRevenue ?? 0) / 100, 2); // 分转元

            $financialStats = [
                'withdrawableAmount' => $withdrawableAmount, // 当前可提现金额
                'totalRevenue' => $totalRevenue, // 总收益
                'pendingReview' => $pendingReviewAmount, // 待审核
                'withdrawn' => $withdrawnAmount, // 已提现
            ];

            // 3. 客户和好友统计
            $customerStats = [
                'totalFriends' => (int)($channel['totalFriends'] ?? 0), // 总加好友数
                'todayFriends' => (int)($channel['todayFriends'] ?? 0), // 今日加好友数
                'totalCustomers' => (int)($channel['totalCustomers'] ?? 0), // 总获客数
                'todayCustomers' => (int)($channel['todayCustomers'] ?? 0), // 今日获客数
            ];

            // 返回数据
            $data = [
                'channelInfo' => $channelInfo,
                'financialStats' => $financialStats,
                'customerStats' => $customerStats,
            ];

            return $this->setCorsHeaders(json([
                'code' => 200,
                'success' => true,
                'msg' => '获取成功',
                'data' => $data
            ]));

        } catch (Exception $e) {
            return $this->setCorsHeaders(json([
                'code' => $e->getCode() ?: 500,
                'success' => false,
                'msg' => '获取数据失败：' . $e->getMessage(),
                'data' => null
            ]));
        }
    }

    /**
     * 获取收益明细列表
     * @return \think\response\Json
     */
    public function revenueRecords()
    {
        try {
            // 获取参数
            $channelCode = $this->request->param('channelCode', '');
            $page = $this->request->param('page', 1);
            $limit = $this->request->param('limit', 10);
            $type = $this->request->param('type', 'all'); // all, customer_acquisition, add_friend, order, poster, phone, other
            $date = $this->request->param('date', ''); // 日期筛选，格式：Y-m-d

            // 参数验证
            if (empty($channelCode)) {
                return $this->setCorsHeaders(json([
                    'code' => 400,
                    'success' => false,
                    'msg' => '渠道编码不能为空',
                    'data' => null
                ]));
            }

            $page = max(1, intval($page));
            $limit = max(1, min(100, intval($limit)));

            // 查询渠道信息
            $channel = Db::name('distribution_channel')
                ->where([
                    ['code', '=', $channelCode],
                    ['status', '=', DistributionChannel::STATUS_ENABLED],
                    ['deleteTime', '=', 0]
                ])
                ->find();

            if (!$channel) {
                return $this->setCorsHeaders(json([
                    'code' => 404,
                    'success' => false,
                    'msg' => '渠道不存在或已被禁用',
                    'data' => null
                ]));
            }

            $channelId = $channel['id'];
            $companyId = $channel['companyId'];

            // 构建查询条件
            $where = [
                ['companyId', '=', $companyId],
                ['channelId', '=', $channelId]
            ];

            // 类型筛选
            if ($type !== 'all') {
                $where[] = ['type', '=', $type];
            }

            // 日期筛选
            if (!empty($date)) {
                $dateStart = strtotime($date . ' 00:00:00');
                $dateEnd = strtotime($date . ' 23:59:59');
                if ($dateStart && $dateEnd) {
                    $where[] = ['createTime', 'between', [$dateStart, $dateEnd]];
                }
            }

            // 查询总数
            $total = Db::name('distribution_revenue_record')
                ->where($where)
                ->count();

            // 查询列表（按创建时间倒序）
            $list = Db::name('distribution_revenue_record')
                ->where($where)
                ->order('createTime DESC')
                ->page($page, $limit)
                ->select();

            // 从活动表（customer_acquisition_task）获取类型标签映射（使用 sourceId 关联活动ID）
            $formattedList = [];
            if (!empty($list)) {
                // 收集本页涉及到的活动ID
                $taskIds = [];
                foreach ($list as $row) {
                    if (!empty($row['sourceId'])) {
                        $taskIds[] = (int)$row['sourceId'];
                    }
                }
                $taskIds = array_values(array_unique($taskIds));

                // 获取活动名称映射：taskId => name
                $taskNameMap = [];
                if (!empty($taskIds)) {
                    $taskNameMap = Db::name('customer_acquisition_task')
                        ->whereIn('id', $taskIds)
                        ->column('name', 'id');
                }

                // 格式化数据
                foreach ($list as $item) {
                    $taskId = !empty($item['sourceId']) ? (int)$item['sourceId'] : 0;
                    $taskName = $taskId && isset($taskNameMap[$taskId]) ? $taskNameMap[$taskId] : null;

                    $formattedItem = [
                        'id' => (string)$item['id'],
                        'sourceType' => $item['sourceType'] ?? '其他',
                        'type' => $item['type'] ?? 'other',
                        // 类型标签优先取活动名称，没有则回退为 sourceType 或 “其他”
                        'typeLabel' => $taskName ?: (!empty($item['sourceType']) ? $item['sourceType'] : '其他'),
                        'amount' => round($item['amount'] / 100, 2), // 分转元
                        'remark' => isset($item['remark']) && $item['remark'] !== '' ? $item['remark'] : null,
                        'createTime' => !empty($item['createTime']) ? date('Y-m-d H:i', $item['createTime']) : '',
                    ];
                    $formattedList[] = $formattedItem;
                }
            }

            return $this->setCorsHeaders(json([
                'code' => 200,
                'success' => true,
                'msg' => '获取成功',
                'data' => [
                    'list' => $formattedList,
                    'total' => (int)$total,
                    'page' => $page,
                    'limit' => $limit
                ]
            ]));

        } catch (Exception $e) {
            return $this->setCorsHeaders(json([
                'code' => $e->getCode() ?: 500,
                'success' => false,
                'msg' => '获取收益明细失败：' . $e->getMessage(),
                'data' => null
            ]));
        }
    }

    /**
     * 获取提现明细列表
     * @return \think\response\Json
     */
    public function withdrawalRecords()
    {
        try {
            // 获取参数
            $channelCode = $this->request->param('channelCode', '');
            $page = $this->request->param('page', 1);
            $limit = $this->request->param('limit', 10);
            $status = $this->request->param('status', 'all'); // all, pending, approved, rejected, paid
            $payType = $this->request->param('payType', 'all'); // all, wechat, alipay, bankcard
            $date = $this->request->param('date', ''); // 日期筛选，格式：Y-m-d

            // 参数验证
            if (empty($channelCode)) {
                return $this->setCorsHeaders(json([
                    'code' => 400,
                    'success' => false,
                    'msg' => '渠道编码不能为空',
                    'data' => null
                ]));
            }

            $page = max(1, intval($page));
            $limit = max(1, min(100, intval($limit)));

            // 校验到账方式参数
            $validPayTypes = ['all', 'wechat', 'alipay', 'bankcard'];
            if (!in_array($payType, $validPayTypes)) {
                $payType = 'all';
            }

            // 查询渠道信息
            $channel = Db::name('distribution_channel')
                ->where([
                    ['code', '=', $channelCode],
                    ['status', '=', DistributionChannel::STATUS_ENABLED],
                    ['deleteTime', '=', 0]
                ])
                ->find();

            if (!$channel) {
                return $this->setCorsHeaders(json([
                    'code' => 404,
                    'success' => false,
                    'msg' => '渠道不存在或已被禁用',
                    'data' => null
                ]));
            }

            $channelId = $channel['id'];
            $companyId = $channel['companyId'];

            // 构建查询条件
            $where = [
                ['companyId', '=', $companyId],
                ['channelId', '=', $channelId]
            ];

            // 状态筛选
            if ($status !== 'all') {
                $where[] = ['status', '=', $status];
            }

            // 到账方式筛选
            if ($payType !== 'all') {
                $where[] = ['payType', '=', $payType];
            }

            // 日期筛选
            if (!empty($date)) {
                $dateStart = strtotime($date . ' 00:00:00');
                $dateEnd = strtotime($date . ' 23:59:59');
                if ($dateStart && $dateEnd) {
                    $where[] = ['applyTime', 'between', [$dateStart, $dateEnd]];
                }
            }

            // 查询总数
            $total = Db::name('distribution_withdrawal')
                ->where($where)
                ->count();

            // 查询列表（按申请时间倒序）
            $list = Db::name('distribution_withdrawal')
                ->where($where)
                ->order('applyTime DESC')
                ->page($page, $limit)
                ->select();

            // 格式化数据
            $formattedList = [];
            foreach ($list as $item) {
                // 状态标签映射
                $statusLabels = [
                    'pending' => '待审核',
                    'approved' => '已通过',
                    'rejected' => '已拒绝',
                    'paid' => '已打款'
                ];

                // 支付类型标签映射
                $payTypeLabels = [
                    'wechat' => '微信',
                    'alipay' => '支付宝',
                    'bankcard' => '银行卡'
                ];

                $payType = !empty($item['payType']) ? $item['payType'] : null;

                $formattedItem = [
                    'id' => (string)$item['id'],
                    'amount' => round($item['amount'] / 100, 2), // 分转元
                    'status' => $item['status'] ?? 'pending',
                    'statusLabel' => $statusLabels[$item['status'] ?? 'pending'] ?? '待审核',
                    'payType' => $payType,
                    'payTypeLabel' => $payType && isset($payTypeLabels[$payType]) ? $payTypeLabels[$payType] : null,
                    'applyTime' => !empty($item['applyTime']) ? date('Y-m-d H:i', $item['applyTime']) : '',
                    'reviewTime' => !empty($item['reviewTime']) ? date('Y-m-d H:i', $item['reviewTime']) : null,
                    'reviewer' => !empty($item['reviewer']) ? $item['reviewer'] : null,
                    'remark' => !empty($item['remark']) ? $item['remark'] : null,
                ];
                $formattedList[] = $formattedItem;
            }

            return $this->setCorsHeaders(json([
                'code' => 200,
                'success' => true,
                'msg' => '获取成功',
                'data' => [
                    'list' => $formattedList,
                    'total' => (int)$total,
                    'page' => $page,
                    'limit' => $limit
                ]
            ]));

        } catch (Exception $e) {
            return $this->setCorsHeaders(json([
                'code' => $e->getCode() ?: 500,
                'success' => false,
                'msg' => '获取提现明细失败：' . $e->getMessage(),
                'data' => null
            ]));
        }
    }

    /**
     * 修改渠道分销员密码
     * @return \think\response\Json
     */
    public function changePassword()
    {
        try {
            // 获取参数并去除首尾空格
            $channelCode = trim($this->request->param('channelCode', ''));
            $oldPassword = trim($this->request->param('oldPassword', ''));
            $newPassword = trim($this->request->param('newPassword', ''));

            // 参数验证
            if (empty($channelCode)) {
                return $this->setCorsHeaders(json([
                    'code' => 400,
                    'success' => false,
                    'msg' => '渠道编码不能为空',
                    'data' => null
                ]));
            }

            if (empty($oldPassword)) {
                return $this->setCorsHeaders(json([
                    'code' => 400,
                    'success' => false,
                    'msg' => '原密码不能为空',
                    'data' => null
                ]));
            }

            if (empty($newPassword)) {
                return $this->setCorsHeaders(json([
                    'code' => 400,
                    'success' => false,
                    'msg' => '新密码不能为空',
                    'data' => null
                ]));
            }

            // 验证新密码长度（至少6位）
            if (mb_strlen($newPassword) < 6) {
                return $this->setCorsHeaders(json([
                    'code' => 400,
                    'success' => false,
                    'msg' => '新密码长度至少为6位',
                    'data' => null
                ]));
            }

            // 查询渠道信息
            $channel = Db::name('distribution_channel')
                ->where([
                    ['code', '=', $channelCode],
                    ['status', '=', DistributionChannel::STATUS_ENABLED],
                    ['deleteTime', '=', 0]
                ])
                ->find();

            if (!$channel) {
                return $this->setCorsHeaders(json([
                    'code' => 404,
                    'success' => false,
                    'msg' => '渠道不存在或已被禁用',
                    'data' => null
                ]));
            }

            // 验证原密码（MD5加密）
            $oldPasswordMd5 = md5($oldPassword);
            if ($channel['password'] !== $oldPasswordMd5) {
                return $this->setCorsHeaders(json([
                    'code' => 401,
                    'success' => false,
                    'msg' => '原密码错误',
                    'data' => null
                ]));
            }

            // 检查新密码是否与原密码相同
            $newPasswordMd5 = md5($newPassword);
            if ($channel['password'] === $newPasswordMd5) {
                return $this->setCorsHeaders(json([
                    'code' => 400,
                    'success' => false,
                    'msg' => '新密码不能与原密码相同',
                    'data' => null
                ]));
            }

            // 更新密码
            $updateResult = Db::name('distribution_channel')
                ->where('id', $channel['id'])
                ->update([
                    'password' => $newPasswordMd5,
                    'updateTime' => time()
                ]);

            if ($updateResult === false) {
                return $this->setCorsHeaders(json([
                    'code' => 500,
                    'success' => false,
                    'msg' => '密码修改失败，请稍后重试',
                    'data' => null
                ]));
            }

            return $this->setCorsHeaders(json([
                'code' => 200,
                'success' => true,
                'msg' => '密码修改成功',
                'data' => null
            ]));

        } catch (Exception $e) {
            return $this->setCorsHeaders(json([
                'code' => $e->getCode() ?: 500,
                'success' => false,
                'msg' => '密码修改失败：' . $e->getMessage(),
                'data' => null
            ]));
        }
    }
}

