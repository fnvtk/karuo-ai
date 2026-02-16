<?php

namespace app\cunkebao\controller;

use app\common\controller\PaymentService;
use app\common\model\Order;
use app\common\model\User;
use app\cunkebao\model\TokensPackage;
use app\chukebao\model\TokensCompany;
use app\chukebao\model\TokensRecord;
use library\ResponseHelper;
use think\Db;
use think\facade\Env;

class TokensController extends BaseController
{
    public function getList()
    {
        $page = $this->request->param('page', 1);
        $limit = $this->request->param('limit', 10);
        $where = [
            ['isDel', '=', 0],
            ['status', '=', 1],
        ];
        $query = TokensPackage::where($where);
        $total = $query->count();
        $list = $query->where($where)->page($page, $limit)->order('sort ASC,id desc')->select();
        foreach ($list as &$item) {
            $item['description'] = json_decode($item['description'], true);
            $item['discount'] = round(((($item['originalPrice'] - $item['price']) / $item['originalPrice']) * 100), 2);
            $item['price'] = round($item['price'], 2);
            $item['unitPrice'] = round($item['price'] / $item['tokens'], 6);
            $item['originalPrice'] = round($item['originalPrice'] / 100, 2);
            $item['tokens'] = number_format($item['tokens']);
        }
        unset($item);
        return ResponseHelper::success(['list' => $list, 'total' => $total]);
    }


    public function pay()
    {
        $id = $this->request->param('id', '');
        $price = $this->request->param('price', '');
        $userId = $this->getUserInfo('id');
        $companyId = $this->getUserInfo('companyId');
        $payType =  $this->request->param('payType', 'qrCode');

        if (!in_array($payType, ['wechat', 'alipay', 'qrCode'])) {
            return ResponseHelper::error('付款类型不正确');
        }


        if (empty($id) && empty($price)) {
            return ResponseHelper::error('套餐和自定义购买金额必须选一个');
        }

        if (!empty($id)) {
            $package = TokensPackage::where(['id' => $id, 'status' => 1, 'isDel' => 0])->find();
            if (empty($package)) {
                return ResponseHelper::error('套餐不存在或者已禁用');
            }

            if ($package['price'] <= 0) {
                return ResponseHelper::error('套餐金额异常');
            }

            $specs = [
                'id' => $package['id'],
                'name' => $package['name'],
                'price' => $package['price'],
                'tokens' => $package['tokens'],
            ];

        } else {
            //获取配置的tokens比例
            $tokens_multiple = Env::get('payment.tokens_multiple', 20);
            $specs = [
                'id' => 0,
                'name' => '自定义购买算力',
                'price' => intval($price * 100),
                'tokens' => intval($price * $tokens_multiple),
            ];
        }


        $orderNo = date('YmdHis') . rand(100000, 999999);
        $order = [
            'companyId' => $companyId,
            'userId' => $userId,
            'orderNo' => $orderNo,
            'goodsId' => $specs['id'],
            'goodsName' => $specs['name'],
            'goodsSpecs' => $specs,
            'orderType' => 1,
            'money' => $specs['price'],
            'service' => $payType
        ];
        $paymentService = new PaymentService();
        $res = $paymentService->createOrder($order);
        $res = json_decode($res, true);
        if ($res['code'] == 200) {
            return ResponseHelper::success(['orderNo' => $orderNo, 'code_url' => $res['data']], '订单创建成功');
        } else {
            return ResponseHelper::error($res['msg']);
        }
    }

    public function queryOrder()
    {
        $orderNo = $this->request->param('orderNo', '');
        $order = Order::where('orderNo', $orderNo)->find();
        if (!$order) {
            return ResponseHelper::error('该订单不存在');
        }
        if ($order->status != 1) {
            $paymentService = new PaymentService();
            $res = $paymentService->queryOrder($orderNo);
            $res = json_decode($res, true);
            if ($res['code'] == 200) {
                return ResponseHelper::success($order, '订单已支付');
            } else {
                $errorMsg = !empty($order['payInfo']) ? $order['payInfo'] : '订单未支付';
                return ResponseHelper::success($order,$errorMsg);
            }
        } else {
            return ResponseHelper::success($order, '订单已支付');
        }
    }



    /**
     * 获取订单列表
     * @return \think\response\Json
     */
    public function getOrderList()
    {
        try {
            $page = $this->request->param('page', 1);
            $limit = $this->request->param('limit', 10);
            $status = $this->request->param('status', ''); // 订单状态筛选
            $keyword = $this->request->param('keyword', ''); // 关键词搜索（订单号）
            $orderType = $this->request->param('orderType', ''); // 订单类型筛选
            $payType = $this->request->param('payType', ''); // 支付类型筛选
            $startTime = $this->request->param('startTime', ''); // 开始时间
            $endTime = $this->request->param('endTime', ''); // 结束时间

            $userId = $this->getUserInfo('id');
            $companyId = $this->getUserInfo('companyId');

            // 构建查询条件
            $where = [
                ['userId', '=', $userId],
                ['companyId', '=', $companyId]
            ];

            // 关键词搜索（订单号、商品名称）
            if (!empty($keyword)) {
                $where[] = ['orderNo|goodsName', 'like', '%' . $keyword . '%'];
            }

            // 状态筛选 (0-待支付 1-已付款 2-已退款 3-付款失败)
            if ($status !== '') {
                $where[] = ['status', '=', $status];
            }

            // 订单类型筛选
            if ($orderType !== '') {
                $where[] = ['orderType', '=', $orderType];
            }

            // 支付类型筛选
            if($payType !== '') {
                $where[] = ['payType', '=', $payType];
            }

            // 时间范围筛选
            if (!empty($startTime)) {
                $where[] = ['createTime', '>=', strtotime($startTime)];
            }
            if (!empty($endTime)) {
                $where[] = ['createTime', '<=', strtotime($endTime . ' 23:59:59')];
            }

            // 分页查询
            $query = Order::where($where)
                ->where(function ($query) {
                    $query->whereNull('deleteTime')->whereOr('deleteTime', 0);
                });
            $total = $query->count();

            $list = $query->field('id,orderNo,goodsId,goodsName,goodsSpecs,orderType,money,status,payType,payTime,createTime')
                ->order('id desc')
                ->page($page, $limit)
                ->select();

            // 格式化数据
            foreach ($list as &$item) {
                // 金额转换（分转元）
                $item['money'] = round($item['money'] / 100, 2);

                // 解析商品规格
                if (!empty($item['goodsSpecs'])) {
                    $specs = is_string($item['goodsSpecs']) ? json_decode($item['goodsSpecs'], true) : $item['goodsSpecs'];
                    $item['goodsSpecs'] = $specs;

                    // 添加算力数量
                    if (isset($specs['tokens'])) {
                        $item['tokens'] = number_format($specs['tokens']);
                    }
                }

                // 状态文本
                $statusText = [
                    0 => '待支付',
                    1 => '已付款',
                    2 => '已退款',
                    3 => '付款失败'
                ];
                $item['statusText'] = $statusText[$item['status']] ?? '未知';

                // 订单类型文本
                $orderTypeText = [
                    1 => '购买算力'
                ];
                $item['orderTypeText'] = $orderTypeText[$item['orderType']] ?? '其他';

                // 支付类型文本
                $payTypeText = [
                    1 => '微信支付',
                    2 => '支付宝'
                ];
                $item['payTypeText'] = !empty($item['payType']) ? ($payTypeText[$item['payType']] ?? '未知') : '';

                // 格式化时间
                $item['createTime'] = $item['createTime'] ? date('Y-m-d H:i:s', $item['createTime']) : '';
                $item['payTime'] = $item['payTime'] ? date('Y-m-d H:i:s', $item['payTime']) : '';
            }
            unset($item);

            return ResponseHelper::success([
                'list' => $list,
                'total' => $total,
                'page' => $page,
                'limit' => $limit
            ]);

        } catch (\Exception $e) {
            return ResponseHelper::error('获取订单列表失败：' . $e->getMessage());
        }
    }

    /**
     * 获取公司算力统计信息
     * 包括：总算力、今日使用、本月使用、剩余算力
     *
     * @return \think\response\Json
     */
    public function getTokensStatistics()
    {
        try {
            $userId = $this->getUserInfo('id');
            $companyId = $this->getUserInfo('companyId');
            if (empty($companyId)) {
                return ResponseHelper::error('公司信息获取失败');
            }

            // 获取公司算力余额
            $tokensCompany = TokensCompany::where(['companyId' => $companyId,'userId' => $userId])->find();
            $remainingTokens = $tokensCompany ? intval($tokensCompany->tokens) : 0;

            // 获取今日开始和结束时间戳
            $todayStart = strtotime(date('Y-m-d 00:00:00'));
            $todayEnd = strtotime(date('Y-m-d 23:59:59'));

            // 获取本月开始和结束时间戳
            $monthStart = strtotime(date('Y-m-01 00:00:00'));
            $monthEnd = strtotime(date('Y-m-t 23:59:59'));

            // 统计今日消费（type=0表示消费）
            $todayUsed = TokensRecord::where([
                ['userId', '=', $userId],
                ['companyId', '=', $companyId],
                ['type', '=', 0], // 0为减少（消费）
                ['createTime', '>=', $todayStart],
                ['createTime', '<=', $todayEnd]
            ])->sum('tokens');
            $todayUsed = intval($todayUsed);

            // 统计本月消费
            $monthUsed = TokensRecord::where([
                ['userId', '=', $userId],
                ['companyId', '=', $companyId],
                ['type', '=', 0], // 0为减少（消费）
                ['createTime', '>=', $monthStart],
                ['createTime', '<=', $monthEnd]
            ])->sum('tokens');
            $monthUsed = intval($monthUsed);

            // 计算总算力（当前剩余 + 历史总消费）
            $totalConsumed = TokensRecord::where([
                ['userId', '=', $userId],
                ['companyId', '=', $companyId],
                ['type', '=', 0]
            ])->sum('tokens');
            $totalConsumed = intval($totalConsumed);

            // 总充值算力
            $totalRecharged = TokensRecord::where([
                ['userId', '=', $userId],
                ['companyId', '=', $companyId],
                ['type', '=', 1] // 1为增加（充值）
            ])->sum('tokens');
            $totalRecharged = intval($totalRecharged);

            // 计算预计可用天数（基于过去一个月的平均消耗）
            $estimatedDays = $this->calculateEstimatedDays($userId,$companyId, $remainingTokens);

            return ResponseHelper::success([
                'totalTokens' => $totalRecharged, // 总算力（累计充值）
                'todayUsed' => $todayUsed, // 今日使用
                'monthUsed' => $monthUsed, // 本月使用
                'remainingTokens' => $remainingTokens, // 剩余算力
                'totalConsumed' => $totalConsumed, // 累计消费
                'estimatedDays' => $estimatedDays, // 预计可用天数
            ], '获取成功');

        } catch (\Exception $e) {
            return ResponseHelper::error('获取算力统计失败：' . $e->getMessage());
        }
    }

    /**
     * 计算预计可用天数（基于过去一个月的平均消耗）
     * @param int $userId 用户ID
     * @param int $companyId 公司ID
     * @param int $remainingTokens 当前剩余算力
     * @return int 预计可用天数，-1表示无法计算（无消耗记录或余额为0）
     */
    private function calculateEstimatedDays($userId,$companyId, $remainingTokens)
    {
        // 如果余额为0或负数，无法计算
        if ($remainingTokens <= 0) {
            return -1;
        }

        // 计算过去30天的消耗总量（只统计减少的记录，type=0）
        $oneMonthAgo = time() - (30 * 24 * 60 * 60); // 30天前的时间戳
        
        $totalConsumed = TokensRecord::where([
            ['userId', '=', $userId],
            ['companyId', '=', $companyId],
            ['type', '=', 0],  // 只统计减少的记录
            ['createTime', '>=', $oneMonthAgo]
        ])->sum('tokens');

        $totalConsumed = intval($totalConsumed);

        // 如果过去30天没有消耗记录，无法计算
        if ($totalConsumed <= 0) {
            return -1;
        }

        // 计算平均每天消耗量
        $avgDailyConsumption = $totalConsumed / 30;

        // 如果平均每天消耗为0，无法计算
        if ($avgDailyConsumption <= 0) {
            return -1;
        }

        // 计算预计可用天数 = 当前余额 / 平均每天消耗量
        $estimatedDays = floor($remainingTokens / $avgDailyConsumption);

        return $estimatedDays;
    }

    /**
     * 分配token（仅管理员可用）
     * @return \think\response\Json
     */
    public function allocateTokens()
    {
        try {
            $userId = $this->getUserInfo('id');
            $companyId = $this->getUserInfo('companyId');
            $targetUserId = (int)$this->request->param('targetUserId', 0);
            $tokens = (int)$this->request->param('tokens', 0);
            $remarks = $this->request->param('remarks', '');

            // 验证参数
            if (empty($targetUserId)) {
                return ResponseHelper::error('目标用户ID不能为空');
            }

            if ($tokens <= 0) {
                return ResponseHelper::error('分配的token数量必须大于0');
            }

            if (empty($companyId)) {
                return ResponseHelper::error('公司信息获取失败');
            }

            // 验证当前用户是否为管理员
            $currentUser = User::where([
                'id' => $userId,
                'companyId' => $companyId
            ])->find();

            if (empty($currentUser)) {
                return ResponseHelper::error('用户信息不存在');
            }

            if (empty($currentUser->isAdmin) || $currentUser->isAdmin != 1) {
                return ResponseHelper::error('只有管理员才能分配token');
            }

            // 验证目标用户是否存在且属于同一公司
            $targetUser = User::where([
                'id' => $targetUserId,
                'companyId' => $companyId
            ])->find();

            if (empty($targetUser)) {
                return ResponseHelper::error('目标用户不存在或不属于同一公司');
            }

            // 检查分配者的token余额
            $allocatorTokens = TokensCompany::where([
                'companyId' => $companyId,
                'userId' => $userId
            ])->find();

            $allocatorBalance = $allocatorTokens ? intval($allocatorTokens->tokens) : 0;

            if ($allocatorBalance < $tokens) {
                return ResponseHelper::error('token余额不足，当前余额：' . $allocatorBalance);
            }

            // 开始事务
            Db::startTrans();

            try {
                // 1. 减少分配者的token
                if (!empty($allocatorTokens)) {
                    $allocatorTokens->tokens = $allocatorBalance - $tokens;
                    $allocatorTokens->updateTime = time();
                    $allocatorTokens->save();
                    $allocatorNewBalance = $allocatorTokens->tokens;
                } else {
                    // 如果分配者没有记录，创建一条（余额为0）
                    $allocatorTokens = new TokensCompany();
                    $allocatorTokens->userId = $userId;
                    $allocatorTokens->companyId = $companyId;
                    $allocatorTokens->tokens = 0;
                    $allocatorTokens->isAdmin = 1;
                    $allocatorTokens->createTime = time();
                    $allocatorTokens->updateTime = time();
                    $allocatorTokens->save();
                    $allocatorNewBalance = 0;
                }

            // 2. 记录分配者的减少记录
            $targetUserAccount = $targetUser->account ?? $targetUser->phone ?? '用户ID[' . $targetUserId . ']';
            $allocatorRecord = new TokensRecord();
            $allocatorRecord->companyId = $companyId;
            $allocatorRecord->userId = $userId;
            $allocatorRecord->type = 0; // 0为减少
            $allocatorRecord->form = 1001; // 1001表示分配
            $allocatorRecord->wechatAccountId = 0;
            $allocatorRecord->friendIdOrGroupId = $targetUserId;
            $allocatorRecord->remarks = !empty($remarks) ? $remarks : '分配给' . $targetUserAccount;
            $allocatorRecord->tokens = $tokens;
            $allocatorRecord->balanceTokens = $allocatorNewBalance;
            $allocatorRecord->createTime = time();
            $allocatorRecord->save();

                // 3. 增加接收者的token
                $receiverTokens = TokensCompany::where([
                    'companyId' => $companyId,
                    'userId' => $targetUserId
                ])->find();

                if (!empty($receiverTokens)) {
                    $receiverTokens->tokens = intval($receiverTokens->tokens) + $tokens;
                    $receiverTokens->updateTime = time();
                    $receiverTokens->save();
                    $receiverNewBalance = $receiverTokens->tokens;
                } else {
                    // 如果接收者没有记录，创建一条
                    $receiverTokens = new TokensCompany();
                    $receiverTokens->userId = $targetUserId;
                    $receiverTokens->companyId = $companyId;
                    $receiverTokens->tokens = $tokens;
                    $receiverTokens->isAdmin = (!empty($targetUser->isAdmin) && $targetUser->isAdmin == 1) ? 1 : 0;
                    $receiverTokens->createTime = time();
                    $receiverTokens->updateTime = time();
                    $receiverTokens->save();
                    $receiverNewBalance = $tokens;
                }

            // 4. 记录接收者的增加记录
            $adminAccount = $currentUser->account ?? $currentUser->phone ?? '管理员';
            $receiverRecord = new TokensRecord();
            $receiverRecord->companyId = $companyId;
            $receiverRecord->userId = $targetUserId;
            $receiverRecord->type = 1; // 1为增加
            $receiverRecord->form = 1001; // 1001表示分配
            $receiverRecord->wechatAccountId = 0;
            $receiverRecord->friendIdOrGroupId = $userId;
            $receiverRecord->remarks = !empty($remarks) ? '管理员分配：' . $remarks : '管理员分配';
            $receiverRecord->tokens = $tokens;
            $receiverRecord->balanceTokens = $receiverNewBalance;
            $receiverRecord->createTime = time();
            $receiverRecord->save();

                Db::commit();

                return ResponseHelper::success([
                    'allocatorBalance' => $allocatorNewBalance,
                    'receiverBalance' => $receiverNewBalance,
                    'allocatedTokens' => $tokens
                ], '分配成功');

            } catch (\Exception $e) {
                Db::rollback();
                return ResponseHelper::error('分配失败：' . $e->getMessage());
            }

        } catch (\Exception $e) {
            return ResponseHelper::error('分配失败：' . $e->getMessage());
        }
    }
}