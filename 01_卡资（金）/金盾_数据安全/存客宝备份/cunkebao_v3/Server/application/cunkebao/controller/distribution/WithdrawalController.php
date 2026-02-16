<?php

namespace app\cunkebao\controller\distribution;

use app\cunkebao\controller\BaseController;
use app\cunkebao\model\DistributionWithdrawal;
use library\ResponseHelper;
use think\Db;
use think\Exception;

/**
 * 分销渠道提现申请控制器
 */
class WithdrawalController extends BaseController
{
    /**
     * 获取提现申请列表
     * @return \think\response\Json
     */
    public function index()
    {
        try {
            // 获取参数
            $page = $this->request->param('page', 1);
            $limit = $this->request->param('limit', 20);
            $status = $this->request->param('status', 'all');
            $date = $this->request->param('date', '');
            $keyword = $this->request->param('keyword', '');

            $companyId = $this->getUserInfo('companyId');

            // 参数验证
            $page = max(1, intval($page));
            $limit = max(1, min(100, intval($limit))); // 限制最大100

            // 验证状态参数
            $validStatuses = ['all', DistributionWithdrawal::STATUS_PENDING, DistributionWithdrawal::STATUS_APPROVED, DistributionWithdrawal::STATUS_REJECTED, DistributionWithdrawal::STATUS_PAID];
            if (!in_array($status, $validStatuses)) {
                $status = 'all';
            }

            // 构建查询条件
            $where = [];
            $where[] = ['w.companyId', '=', $companyId];

            // 如果不是管理员，只能查看自己创建的提现申请
            if (!$this->getUserInfo('isAdmin')) {
                $where[] = ['w.userId', '=', $this->getUserInfo('id')];
            }

            // 状态筛选
            if ($status !== 'all') {
                $where[] = ['w.status', '=', $status];
            }

            // 日期筛选（格式：YYYY/MM/DD）
            if (!empty($date)) {
                // 转换日期格式 YYYY/MM/DD 为时间戳范围
                $dateParts = explode('/', $date);
                if (count($dateParts) === 3) {
                    $dateStr = $dateParts[0] . '-' . $dateParts[1] . '-' . $dateParts[2];
                    $dateStart = strtotime($dateStr . ' 00:00:00');
                    $dateEnd = strtotime($dateStr . ' 23:59:59');
                    if ($dateStart && $dateEnd) {
                        $where[] = ['w.applyTime', 'between', [$dateStart, $dateEnd]];
                    }
                }
            }

            // 关键词搜索（模糊匹配渠道名称、渠道编码）
            if (!empty($keyword)) {
                $keyword = trim($keyword);
                // 需要关联渠道表进行搜索
            }

            // 构建查询（关联渠道表获取渠道名称和编码，只关联未删除的渠道）
            $query = Db::name('distribution_withdrawal')
                ->alias('w')
                ->join('distribution_channel c', 'w.channelId = c.id AND c.deleteTime = 0', 'left')
                ->where($where);

            // 关键词搜索（如果有关键词，添加渠道表关联条件）
            if (!empty($keyword)) {
                $query->where(function ($query) use ($keyword) {
                    $query->where('c.name', 'like', '%' . $keyword . '%')
                        ->whereOr('c.code', 'like', '%' . $keyword . '%');
                });
            }

            // 查询总数
            $total = $query->count();

            // 查询列表（按申请时间倒序）
            $list = $query->field([
                'w.id',
                'w.channelId',
                'w.userId',
                'w.amount',
                'w.status',
                'w.payType',
                'w.applyTime',
                'w.reviewTime',
                'w.reviewer',
                'w.remark',
                'c.name as channelName',
                'c.code as channelCode'
            ])
                ->order('w.applyTime DESC')
                ->page($page, $limit)
                ->select();

            // 格式化数据
            $formattedList = [];
            foreach ($list as $item) {
                // 格式化申请日期为 YYYY/MM/DD
                $applyDate = '';
                if (!empty($item['applyTime'])) {
                    $applyDate = date('Y/m/d', $item['applyTime']);
                }

                // 格式化审核日期
                $reviewDate = null;
                if (!empty($item['reviewTime'])) {
                    $reviewDate = date('Y-m-d H:i:s', $item['reviewTime']);
                }

                $formattedItem = [
                    'id' => (string)$item['id'],
                    'channelId' => (string)$item['channelId'],
                    'channelName' => $item['channelName'] ?? '',
                    'channelCode' => $item['channelCode'] ?? '',
                    'userId' => (int)($item['userId'] ?? 0),
                    'amount' => round($item['amount'] / 100, 2), // 分转元，保留2位小数
                    'status' => $item['status'] ?? DistributionWithdrawal::STATUS_PENDING,
                    'payType' => !empty($item['payType']) ? $item['payType'] : null, // 支付类型
                    'applyDate' => $applyDate,
                    'reviewDate' => $reviewDate,
                    'reviewer' => !empty($item['reviewer']) ? $item['reviewer'] : null,
                    'remark' => !empty($item['remark']) ? $item['remark'] : null,
                ];
                $formattedList[] = $formattedItem;
            }

            // 返回结果
            return json([
                'code' => 200,
                'success' => true,
                'msg' => '获取成功',
                'data' => [
                    'list' => $formattedList,
                    'total' => (int)$total
                ]
            ]);

        } catch (Exception $e) {
            return json([
                'code' => $e->getCode() ?: 500,
                'success' => false,
                'msg' => '获取提现申请列表失败：' . $e->getMessage(),
                'data' => null
            ]);
        }
    }

    /**
     * 创建提现申请
     * @return \think\response\Json
     */
    public function create()
    {
        try {
            // 获取参数（接口接收的金额单位为元）
            // 原先使用 channelId，现在改为使用渠道编码 channelCode
            $channelCode = $this->request->param('channelCode', '');
            $amount = $this->request->param('amount', 0); // 金额单位：元

            $companyId = $this->getUserInfo('companyId');

            // 参数验证
            if (empty($channelCode)) {
                return json([
                    'code' => 400,
                    'success' => false,
                    'msg' => '渠道编码不能为空',
                    'data' => null
                ]);
            }

            // 验证金额（转换为浮点数进行验证）
            $amount = floatval($amount);
            if (empty($amount) || $amount <= 0) {
                return json([
                    'code' => 400,
                    'success' => false,
                    'msg' => '提现金额必须大于0',
                    'data' => null
                ]);
            }

            // 验证金额格式（最多2位小数）
            if (!preg_match('/^\d+(\.\d{1,2})?$/', (string)$amount)) {
                return json([
                    'code' => 400,
                    'success' => false,
                    'msg' => '提现金额格式不正确，最多保留2位小数',
                    'data' => null
                ]);
            }

            // 检查渠道是否存在且属于当前公司（通过渠道编码查询）
            $channel = Db::name('distribution_channel')
                ->where([
                    ['code', '=', $channelCode],
                    ['companyId', '=', $companyId],
                    ['deleteTime', '=', 0]
                ])
                ->find();

            if (!$channel) {
                return json([
                    'code' => 404,
                    'success' => false,
                    'msg' => '渠道不存在或没有权限',
                    'data' => null
                ]);
            }

            // 统一使用渠道ID变量，后续逻辑仍然基于 channelId
            $channelId = $channel['id'];
            // 从渠道获取创建者的userId，而不是当前登录用户的userId
            $userId = intval($channel['userId'] ?? 0);

            // 检查渠道状态
            if ($channel['status'] !== 'enabled') {
                return json([
                    'code' => 400,
                    'success' => false,
                    'msg' => '渠道已禁用，无法申请提现',
                    'data' => null
                ]);
            }

            // 检查可提现金额
            // 数据库存储的是分，接口接收的是元，需要统一单位进行比较
            $withdrawableAmountInFen = intval($channel['withdrawableAmount'] ?? 0); // 数据库中的分
            $withdrawableAmountInYuan = round($withdrawableAmountInFen / 100, 2); // 转换为元用于提示
            $amountInFen = intval(round($amount * 100)); // 将接口接收的元转换为分
            
            if ($amountInFen > $withdrawableAmountInFen) {
                return json([
                    'code' => 400,
                    'success' => false,
                    'msg' => '提现金额不能超过可提现金额（' . number_format($withdrawableAmountInYuan, 2) . '元）',
                    'data' => null
                ]);
            }

            // 检查是否有待审核的申请
            $pendingWithdrawal = Db::name('distribution_withdrawal')
                ->where([
                    ['channelId', '=', $channelId],
                    ['companyId', '=', $companyId],
                    ['status', '=', DistributionWithdrawal::STATUS_PENDING]
                ])
                ->find();

            if ($pendingWithdrawal) {
                return json([
                    'code' => 400,
                    'success' => false,
                    'msg' => '该渠道已有待审核的提现申请，请等待审核完成后再申请',
                    'data' => null
                ]);
            }

            // 开始事务
            Db::startTrans();
            try {
                // 创建提现申请（金额以分存储）
                $withdrawalData = [
                    'companyId' => $companyId,
                    'channelId' => $channelId,
                    'userId' => $userId,
                    'amount' => $amountInFen, // 存储为分
                    'status' => DistributionWithdrawal::STATUS_PENDING,
                    'applyTime' => time(),
                    'createTime' => time(),
                    'updateTime' => time(),
                ];

                $withdrawalId = Db::name('distribution_withdrawal')->insertGetId($withdrawalData);

                if (!$withdrawalId) {
                    throw new Exception('创建提现申请失败');
                }

                // 扣除渠道可提现金额（以分为单位）
                Db::name('distribution_channel')
                    ->where('id', $channelId)
                    ->setDec('withdrawableAmount', $amountInFen);

                // 提交事务
                Db::commit();

                // 获取创建的申请数据
                $withdrawal = Db::name('distribution_withdrawal')
                    ->alias('w')
                    ->join('distribution_channel c', 'w.channelId = c.id', 'left')
                    ->where('w.id', $withdrawalId)
                    ->field([
                        'w.id',
                        'w.channelId',
                        'w.userId',
                        'w.amount',
                        'w.status',
                        'w.payType',
                        'w.applyTime',
                        'c.name as channelName',
                        'c.code as channelCode'
                    ])
                    ->find();

                // 格式化返回数据（分转元）
                $result = [
                    'id' => (string)$withdrawal['id'],
                    'channelId' => (string)$withdrawal['channelId'],
                    'channelName' => $withdrawal['channelName'] ?? '',
                    'channelCode' => $withdrawal['channelCode'] ?? '',
                    'userId' => (int)($withdrawal['userId'] ?? 0),
                    'amount' => round($withdrawal['amount'] / 100, 2), // 分转元，保留2位小数
                    'status' => $withdrawal['status'],
                    'payType' => !empty($withdrawal['payType']) ? $withdrawal['payType'] : null, // 支付类型：wechat、alipay、bankcard（创建时为null）
                    'applyDate' => !empty($withdrawal['applyTime']) ? date('Y/m/d', $withdrawal['applyTime']) : '',
                    'reviewDate' => null,
                    'reviewer' => null,
                    'remark' => null,
                ];

                return json([
                    'code' => 200,
                    'success' => true,
                    'msg' => '提现申请提交成功',
                    'data' => $result
                ]);

            } catch (Exception $e) {
                Db::rollback();
                throw $e;
            }

        } catch (Exception $e) {
            return json([
                'code' => $e->getCode() ?: 500,
                'success' => false,
                'msg' => '提交提现申请失败：' . $e->getMessage(),
                'data' => null
            ]);
        }
    }

    /**
     * 审核提现申请（通过/拒绝）
     * @return \think\response\Json
     */
    public function review()
    {
        try {
            // 获取参数
            $id = $this->request->param('id', 0);
            $action = $this->request->param('action', ''); // approve 或 reject
            $remark = $this->request->param('remark', '');

            $companyId = $this->getUserInfo('companyId');
            $reviewer = $this->getUserInfo('username') ?: $this->getUserInfo('account') ?: '系统管理员';

            // 参数验证
            if (empty($id)) {
                return json([
                    'code' => 400,
                    'success' => false,
                    'msg' => '申请ID不能为空',
                    'data' => null
                ]);
            }

            if (!in_array($action, ['approve', 'reject'])) {
                return json([
                    'code' => 400,
                    'success' => false,
                    'msg' => '审核操作参数错误，必须为 approve 或 reject',
                    'data' => null
                ]);
            }

            // 如果是拒绝，备注必填
            if ($action === 'reject' && empty($remark)) {
                return json([
                    'code' => 400,
                    'success' => false,
                    'msg' => '拒绝申请时，拒绝理由不能为空',
                    'data' => null
                ]);
            }

            // 检查申请是否存在且属于当前公司
            $withdrawal = Db::name('distribution_withdrawal')
                ->where([
                    ['id', '=', $id],
                    ['companyId', '=', $companyId]
                ])
                ->find();

            if (!$withdrawal) {
                return json([
                    'code' => 404,
                    'success' => false,
                    'msg' => '提现申请不存在或没有权限',
                    'data' => null
                ]);
            }

            // 检查申请状态
            if ($withdrawal['status'] !== DistributionWithdrawal::STATUS_PENDING) {
                return json([
                    'code' => 400,
                    'success' => false,
                    'msg' => '该申请已审核，无法重复审核',
                    'data' => null
                ]);
            }

            // 开始事务
            Db::startTrans();
            try {
                $updateData = [
                    'reviewTime' => time(),
                    'reviewer' => $reviewer,
                    'remark' => $remark ?: '',
                    'updateTime' => time(),
                ];

                if ($action === 'approve') {
                    // 审核通过
                    $updateData['status'] = DistributionWithdrawal::STATUS_APPROVED;
                } else {
                    // 审核拒绝，退回可提现金额（金额以分存储）
                    $updateData['status'] = DistributionWithdrawal::STATUS_REJECTED;
                    
                    // 退回渠道可提现金额（以分为单位）
                    Db::name('distribution_channel')
                        ->where('id', $withdrawal['channelId'])
                        ->setInc('withdrawableAmount', intval($withdrawal['amount']));
                }

                // 更新申请状态
                Db::name('distribution_withdrawal')
                    ->where('id', $id)
                    ->update($updateData);

                // 提交事务
                Db::commit();

                $msg = $action === 'approve' ? '审核通过成功' : '审核拒绝成功';

                return json([
                    'code' => 200,
                    'success' => true,
                    'msg' => $msg,
                    'data' => [
                        'id' => (string)$id,
                        'status' => $updateData['status']
                    ]
                ]);

            } catch (Exception $e) {
                Db::rollback();
                throw $e;
            }

        } catch (Exception $e) {
            return json([
                'code' => $e->getCode() ?: 500,
                'success' => false,
                'msg' => '审核失败：' . $e->getMessage(),
                'data' => null
            ]);
        }
    }

    /**
     * 打款（标记为已打款）
     * @return \think\response\Json
     */
    public function markPaid()
    {
        try {
            // 获取参数
            $id = $this->request->param('id', 0);
            $payType = $this->request->param('payType', ''); // 支付类型：wechat、alipay、bankcard
            $remark = $this->request->param('remark', '');

            $companyId = $this->getUserInfo('companyId');

            // 参数验证
            if (empty($id)) {
                return json([
                    'code' => 400,
                    'success' => false,
                    'msg' => '申请ID不能为空',
                    'data' => null
                ]);
            }

            // 验证支付类型
            $validPayTypes = [
                DistributionWithdrawal::PAY_TYPE_WECHAT,
                DistributionWithdrawal::PAY_TYPE_ALIPAY,
                DistributionWithdrawal::PAY_TYPE_BANKCARD
            ];
            if (empty($payType) || !in_array($payType, $validPayTypes)) {
                return json([
                    'code' => 400,
                    'success' => false,
                    'msg' => '支付类型不能为空，必须为：wechat（微信）、alipay（支付宝）、bankcard（银行卡）',
                    'data' => null
                ]);
            }

            // 检查申请是否存在且属于当前公司
            $withdrawal = Db::name('distribution_withdrawal')
                ->where([
                    ['id', '=', $id],
                    ['companyId', '=', $companyId]
                ])
                ->find();

            if (!$withdrawal) {
                return json([
                    'code' => 404,
                    'success' => false,
                    'msg' => '提现申请不存在或没有权限',
                    'data' => null
                ]);
            }

            // 检查申请状态（只有已通过的申请才能打款）
            if ($withdrawal['status'] !== DistributionWithdrawal::STATUS_APPROVED) {
                return json([
                    'code' => 400,
                    'success' => false,
                    'msg' => '只有已通过的申请才能标记为已打款',
                    'data' => null
                ]);
            }

            // 更新状态为已打款
            $result = Db::name('distribution_withdrawal')
                ->where('id', $id)
                ->update([
                    'status' => DistributionWithdrawal::STATUS_PAID,
                    'payType' => $payType,
                    'remark' => !empty($remark) ? $remark : $withdrawal['remark'],
                    'updateTime' => time()
                ]);

            if ($result === false) {
                return json([
                    'code' => 500,
                    'success' => false,
                    'msg' => '标记打款失败',
                    'data' => null
                ]);
            }

            return json([
                'code' => 200,
                'success' => true,
                'msg' => '标记打款成功',
                'data' => [
                    'id' => (string)$id,
                    'status' => DistributionWithdrawal::STATUS_PAID,
                    'payType' => $payType
                ]
            ]);

        } catch (Exception $e) {
            return json([
                'code' => $e->getCode() ?: 500,
                'success' => false,
                'msg' => '标记打款失败：' . $e->getMessage(),
                'data' => null
            ]);
        }
    }

    /**
     * 获取提现申请详情
     * @return \think\response\Json
     */
    public function detail()
    {
        try {
            // 获取参数
            $id = $this->request->param('id', 0);

            $companyId = $this->getUserInfo('companyId');

            // 参数验证
            if (empty($id)) {
                return json([
                    'code' => 400,
                    'success' => false,
                    'msg' => '申请ID不能为空',
                    'data' => null
                ]);
            }

            // 构建查询条件
            $where = [
                ['w.id', '=', $id],
                ['w.companyId', '=', $companyId]
            ];

            // 如果不是管理员，只能查看自己创建的提现申请
            if (!$this->getUserInfo('isAdmin')) {
                $where[] = ['w.userId', '=', $this->getUserInfo('id')];
            }

            // 查询申请详情（关联渠道表）
            $withdrawal = Db::name('distribution_withdrawal')
                ->alias('w')
                ->join('distribution_channel c', 'w.channelId = c.id AND c.deleteTime = 0', 'left')
                ->where($where)
                ->field([
                    'w.id',
                    'w.channelId',
                    'w.userId',
                    'w.amount',
                    'w.status',
                    'w.payType',
                    'w.applyTime',
                    'w.reviewTime',
                    'w.reviewer',
                    'w.remark',
                    'c.name as channelName',
                    'c.code as channelCode'
                ])
                ->find();

            if (!$withdrawal) {
                return json([
                    'code' => 404,
                    'success' => false,
                    'msg' => '提现申请不存在或没有权限',
                    'data' => null
                ]);
            }

            // 格式化返回数据（分转元）
            $result = [
                'id' => (string)$withdrawal['id'],
                'channelId' => (string)$withdrawal['channelId'],
                'channelName' => $withdrawal['channelName'] ?? '',
                'channelCode' => $withdrawal['channelCode'] ?? '',
                'userId' => (int)($withdrawal['userId'] ?? 0),
                'amount' => round($withdrawal['amount'] / 100, 2), // 分转元，保留2位小数
                'status' => $withdrawal['status'],
                'payType' => !empty($withdrawal['payType']) ? $withdrawal['payType'] : null, // 支付类型：wechat、alipay、bankcard
                'applyDate' => !empty($withdrawal['applyTime']) ? date('Y/m/d', $withdrawal['applyTime']) : '',
                'reviewDate' => !empty($withdrawal['reviewTime']) ? date('Y-m-d H:i:s', $withdrawal['reviewTime']) : null,
                'reviewer' => !empty($withdrawal['reviewer']) ? $withdrawal['reviewer'] : null,
                'remark' => !empty($withdrawal['remark']) ? $withdrawal['remark'] : null,
            ];

            return json([
                'code' => 200,
                'success' => true,
                'msg' => '获取成功',
                'data' => $result
            ]);

        } catch (Exception $e) {
            return json([
                'code' => $e->getCode() ?: 500,
                'success' => false,
                'msg' => '获取详情失败：' . $e->getMessage(),
                'data' => null
            ]);
        }
    }
}

