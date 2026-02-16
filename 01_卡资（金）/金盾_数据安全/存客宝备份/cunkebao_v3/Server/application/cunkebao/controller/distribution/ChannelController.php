<?php

namespace app\cunkebao\controller\distribution;

use app\cunkebao\controller\BaseController;
use app\cunkebao\model\DistributionChannel;
use app\cunkebao\model\DistributionWithdrawal;
use library\ResponseHelper;
use think\Db;
use think\Exception;
use think\facade\Env;
use think\facade\Cache;
use Endroid\QrCode\QrCode;
use Endroid\QrCode\ErrorCorrectionLevel;
use EasyWeChat\Factory;
use EasyWeChat\Kernel\Http\StreamResponse;

/**
 * 分销渠道控制器
 */
class ChannelController extends BaseController
{
    /**
     * 添加渠道
     * @return \think\response\Json
     */
    public function create()
    {
        try {
            // 获取参数
            $name = $this->request->param('name', '');
            $phone = $this->request->param('phone', '');
            $wechatId = $this->request->param('wechatId', '');
            $remarks = $this->request->param('remarks', '');
            $createType = $this->request->param('createType', DistributionChannel::CREATE_TYPE_MANUAL); // 默认为手动创建

            $companyId = $this->getUserInfo('companyId');
            $userId = $this->getUserInfo('id');

            // 参数验证
            if (empty($name)) {
                return ResponseHelper::error('渠道名称不能为空', 400);
            }

            // 验证渠道名称长度
            if (mb_strlen($name) > 50) {
                return ResponseHelper::error('渠道名称长度不能超过50个字符', 400);
            }

            // 验证手机号格式（如果提供）
            if (!empty($phone)) {
                if (!preg_match('/^1[3-9]\d{9}$/', $phone)) {
                    return ResponseHelper::error('手机号格式不正确，请输入11位数字且以1开头', 400);
                }
                
                // 检查手机号是否已存在（排除已删除的渠道）
                $existChannel = Db::name('distribution_channel')
                    ->where([
                        ['companyId', '=', $companyId],
                        ['phone', '=', $phone],
                        ['deleteTime', '=', 0]
                    ])
                    ->find();
                
                if ($existChannel) {
                    return ResponseHelper::error('手机号已被使用', 400);
                }
            }

            // 验证微信号长度（如果提供）
            if (!empty($wechatId) && mb_strlen($wechatId) > 50) {
                return ResponseHelper::error('微信号长度不能超过50个字符', 400);
            }

            // 验证备注长度（如果提供）
            if (!empty($remarks) && mb_strlen($remarks) > 200) {
                return ResponseHelper::error('备注信息长度不能超过200个字符', 400);
            }

            // 验证创建类型
            if (!in_array($createType, [DistributionChannel::CREATE_TYPE_MANUAL, DistributionChannel::CREATE_TYPE_AUTO])) {
                $createType = DistributionChannel::CREATE_TYPE_MANUAL;
            }

            // 生成渠道编码
            $code = DistributionChannel::generateChannelCode();

            // 准备插入数据
            $data = [
                'companyId' => $companyId,
                'userId' => $userId,
                'name' => $name,
                'code' => $code,
                'phone' => $phone ?: '',
                'password' => md5('123456'), // 默认密码123456，MD5加密
                'wechatId' => $wechatId ?: '',
                'remarks' => $remarks ?: '',
                'createType' => $createType,
                'status' => DistributionChannel::STATUS_ENABLED,
                'totalCustomers' => 0,
                'todayCustomers' => 0,
                'totalFriends' => 0,
                'todayFriends' => 0,
                'withdrawableAmount' => 0, // 以分为单位存储
                'createTime' => time(),
                'updateTime' => time(),
            ];

            // 插入数据库
            $channelId = Db::name('distribution_channel')->insertGetId($data);

            if (!$channelId) {
                return ResponseHelper::error('创建渠道失败', 500);
            }

            // 获取创建的数据
            $channel = Db::name('distribution_channel')->where('id', $channelId)->find();

            // 格式化返回数据
            $result = [
                'id' => $channel['id'],
                'name' => $channel['name'],
                'code' => $channel['code'],
                'phone' => $channel['phone'] ?: '',
                'wechatId' => $channel['wechatId'] ?: '',
                'companyId' => (int)$companyId, // 返回companyId，方便小程序自动跳转
                'userId' => (int)($channel['userId'] ?? 0),
                'createType' => $channel['createType'],
                'status' => $channel['status'],
                'totalCustomers' => (int)$channel['totalCustomers'],
                'todayCustomers' => (int)$channel['todayCustomers'],
                'totalFriends' => (int)$channel['totalFriends'],
                'todayFriends' => (int)$channel['todayFriends'],
                'withdrawableAmount' => round(($channel['withdrawableAmount'] ?? 0) / 100, 2), // 分转元，保留2位小数
                'createTime' => !empty($channel['createTime']) ? date('Y-m-d H:i:s', $channel['createTime']) : date('Y-m-d H:i:s'),
            ];

            // 返回符合需求的格式（包含success字段）
            return json([
                'code' => 200,
                'success' => true,
                'msg' => '创建成功',
                'data' => $result
            ]);

        } catch (Exception $e) {
            return ResponseHelper::error('创建渠道失败：' . $e->getMessage(), $e->getCode() ?: 500);
        }
    }

    /**
     * 获取渠道列表
     * @return \think\response\Json
     */
    public function index()
    {
        try {
            // 获取参数
            $page = $this->request->param('page', 1);
            $limit = $this->request->param('limit', 20);
            $keyword = $this->request->param('keyword', '');
            $status = $this->request->param('status', 'all'); // all、enabled、disabled

            $companyId = $this->getUserInfo('companyId');

            // 参数验证
            $page = max(1, intval($page));
            $limit = max(1, min(100, intval($limit))); // 限制最大100

            // 验证状态参数
            $validStatuses = ['all', DistributionChannel::STATUS_ENABLED, DistributionChannel::STATUS_DISABLED];
            if (!in_array($status, $validStatuses)) {
                $status = 'all';
            }

            // 构建查询条件
            $where = [];
            $where[] = ['companyId', '=', $companyId];
            $where[] = ['deleteTime', '=', 0];

            // 如果不是管理员，只能查看自己创建的数据
            if (!$this->getUserInfo('isAdmin')) {
                $where[] = ['userId', '=', $this->getUserInfo('id')];
            }

            // 状态筛选
            if ($status !== 'all') {
                $where[] = ['status', '=', $status];
            }

            // 关键词搜索（模糊匹配 name、code、phone、wechatId）
            if (!empty($keyword)) {
                $keyword = trim($keyword);
                // 使用 | 分隔字段表示OR关系（ThinkPHP语法）
                $where[] = ['name|code|phone|wechatId', 'like', '%' . $keyword . '%'];
            }

            // 查询总数
            $total = Db::name('distribution_channel')
                ->where($where)
                ->count();

            // 查询列表（按创建时间倒序）
            $list = Db::name('distribution_channel')
                ->where($where)
                ->order('createTime DESC')
                ->page($page, $limit)
                ->select();

            // 格式化数据
            $formattedList = [];
            foreach ($list as $item) {
                $formattedItem = [
                    'id' => (int)$item['id'],
                    'name' => $item['name'] ?? '',
                    'code' => $item['code'] ?? '',
                    'phone' => !empty($item['phone']) ? $item['phone'] : null,
                    'wechatId' => !empty($item['wechatId']) ? $item['wechatId'] : null,
                    'companyId' => (int)($item['companyId'] ?? 0),
                    'userId' => (int)($item['userId'] ?? 0),
                    'createType' => $item['createType'] ?? 'manual',
                    'status' => $item['status'] ?? 'enabled',
                    'totalCustomers' => (int)($item['totalCustomers'] ?? 0),
                    'todayCustomers' => (int)($item['todayCustomers'] ?? 0),
                    'totalFriends' => (int)($item['totalFriends'] ?? 0),
                    'todayFriends' => (int)($item['todayFriends'] ?? 0),
                    'withdrawableAmount' => round(($item['withdrawableAmount'] ?? 0) / 100, 2), // 分转元，保留2位小数
                    'createTime' => !empty($item['createTime']) ? date('Y-m-d H:i:s', $item['createTime']) : date('Y-m-d H:i:s'),
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
                'msg' => '获取渠道列表失败：' . $e->getMessage(),
                'data' => null
            ]);
        }
    }

    /**
     * 编辑渠道
     * @return \think\response\Json
     */
    public function update()
    {
        try {
            // 获取参数
            $id = $this->request->param('id', 0);
            $name = $this->request->param('name', '');
            $phone = $this->request->param('phone', '');
            $wechatId = $this->request->param('wechatId', '');
            $remarks = $this->request->param('remarks', '');

            $companyId = $this->getUserInfo('companyId');

            // 参数验证
            if (empty($id)) {
                return json([
                    'code' => 400,
                    'success' => false,
                    'msg' => '渠道ID不能为空',
                    'data' => null
                ]);
            }

            // 检查渠道是否存在且属于当前公司
            $channel = Db::name('distribution_channel')
                ->where(['id' => $id, 'companyId' => $companyId, 'deleteTime' => 0])
                ->find();

            if (!$channel) {
                return json([
                    'code' => 404,
                    'success' => false,
                    'msg' => '渠道不存在或没有权限',
                    'data' => null
                ]);
            }

            // 准备更新数据
            $updateData = [];
            $updateData['updateTime'] = time();

            // 更新渠道名称
            if (!empty($name)) {
                if (mb_strlen($name) > 50) {
                    return json([
                        'code' => 400,
                        'success' => false,
                        'msg' => '渠道名称长度不能超过50个字符',
                        'data' => null
                    ]);
                }
                $updateData['name'] = $name;
            }

            // 更新手机号
            if (isset($phone)) { // 允许设置为空
                if (!empty($phone)) {
                    if (!preg_match('/^1[3-9]\d{9}$/', $phone)) {
                        return json([
                            'code' => 400,
                            'success' => false,
                            'msg' => '手机号格式不正确，请输入11位数字且以1开头',
                            'data' => null
                        ]);
                    }
                    
                    // 检查手机号是否已被其他渠道使用（排除当前渠道和已删除的渠道）
                    $existChannel = Db::name('distribution_channel')
                        ->where([
                            ['companyId', '=', $companyId],
                            ['phone', '=', $phone],
                            ['id', '<>', $id],
                            ['deleteTime', '=', 0]
                        ])
                        ->find();
                    
                    if ($existChannel) {
                        return json([
                            'code' => 400,
                            'success' => false,
                            'msg' => '手机号已被其他渠道使用',
                            'data' => null
                        ]);
                    }
                }
                $updateData['phone'] = $phone ?: '';
            }

            // 更新微信号
            if (isset($wechatId)) { // 允许设置为空
                if (!empty($wechatId) && mb_strlen($wechatId) > 50) {
                    return json([
                        'code' => 400,
                        'success' => false,
                        'msg' => '微信号长度不能超过50个字符',
                        'data' => null
                    ]);
                }
                $updateData['wechatId'] = $wechatId ?: '';
            }

            // 更新备注
            if (isset($remarks)) { // 允许设置为空
                if (!empty($remarks) && mb_strlen($remarks) > 200) {
                    return json([
                        'code' => 400,
                        'success' => false,
                        'msg' => '备注信息长度不能超过200个字符',
                        'data' => null
                    ]);
                }
                $updateData['remarks'] = $remarks ?: '';
            }

            // 如果没有要更新的数据
            if (count($updateData) <= 1) { // 只有updateTime
                return json([
                    'code' => 400,
                    'success' => false,
                    'msg' => '没有要更新的数据',
                    'data' => null
                ]);
            }

            // 更新数据库
            $result = Db::name('distribution_channel')
                ->where(['id' => $id, 'companyId' => $companyId])
                ->update($updateData);

            if ($result === false) {
                return json([
                    'code' => 500,
                    'success' => false,
                    'msg' => '更新渠道失败',
                    'data' => null
                ]);
            }

            // 获取更新后的数据
            $updatedChannel = Db::name('distribution_channel')
                ->where('id', $id)
                ->find();

            // 格式化返回数据
            $resultData = [
                'id' => (int)$updatedChannel['id'],
                'name' => $updatedChannel['name'],
                'code' => $updatedChannel['code'],
                'phone' => !empty($updatedChannel['phone']) ? $updatedChannel['phone'] : null,
                'wechatId' => !empty($updatedChannel['wechatId']) ? $updatedChannel['wechatId'] : null,
                'companyId' => (int)($updatedChannel['companyId'] ?? 0),
                'userId' => (int)($updatedChannel['userId'] ?? 0),
                'createType' => $updatedChannel['createType'],
                'status' => $updatedChannel['status'],
                'totalCustomers' => (int)$updatedChannel['totalCustomers'],
                'todayCustomers' => (int)$updatedChannel['todayCustomers'],
                'totalFriends' => (int)$updatedChannel['totalFriends'],
                'todayFriends' => (int)$updatedChannel['todayFriends'],
                'withdrawableAmount' => round(($updatedChannel['withdrawableAmount'] ?? 0) / 100, 2), // 分转元，保留2位小数
                'createTime' => !empty($updatedChannel['createTime']) ? date('Y-m-d H:i:s', $updatedChannel['createTime']) : date('Y-m-d H:i:s'),
            ];

            return json([
                'code' => 200,
                'success' => true,
                'msg' => '更新成功',
                'data' => $resultData
            ]);

        } catch (Exception $e) {
            return json([
                'code' => $e->getCode() ?: 500,
                'success' => false,
                'msg' => '更新渠道失败：' . $e->getMessage(),
                'data' => null
            ]);
        }
    }

    /**
     * 删除渠道（软删除）
     * @return \think\response\Json
     */
    public function delete()
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
                    'msg' => '渠道ID不能为空',
                    'data' => null
                ]);
            }

            // 检查渠道是否存在且属于当前公司
            $channel = Db::name('distribution_channel')
                ->where(['id' => $id, 'companyId' => $companyId, 'deleteTime' => 0])
                ->find();

            if (!$channel) {
                return json([
                    'code' => 404,
                    'success' => false,
                    'msg' => '渠道不存在或没有权限',
                    'data' => null
                ]);
            }

            // 软删除
            $result = Db::name('distribution_channel')
                ->where(['id' => $id, 'companyId' => $companyId])
                ->update([
                    'deleteTime' => time(),
                    'updateTime' => time()
                ]);

            if ($result === false) {
                return json([
                    'code' => 500,
                    'success' => false,
                    'msg' => '删除渠道失败',
                    'data' => null
                ]);
            }

            return json([
                'code' => 200,
                'success' => true,
                'msg' => '删除成功',
                'data' => null
            ]);

        } catch (Exception $e) {
            return json([
                'code' => $e->getCode() ?: 500,
                'success' => false,
                'msg' => '删除渠道失败：' . $e->getMessage(),
                'data' => null
            ]);
        }
    }

    /**
     * 禁用/启用渠道
     * @return \think\response\Json
     */
    public function toggleStatus()
    {
        try {
            // 获取参数
            $id = $this->request->param('id', 0);
            $status = $this->request->param('status', ''); // enabled 或 disabled

            $companyId = $this->getUserInfo('companyId');

            // 参数验证
            if (empty($id)) {
                return json([
                    'code' => 400,
                    'success' => false,
                    'msg' => '渠道ID不能为空',
                    'data' => null
                ]);
            }

            if (!in_array($status, [DistributionChannel::STATUS_ENABLED, DistributionChannel::STATUS_DISABLED])) {
                return json([
                    'code' => 400,
                    'success' => false,
                    'msg' => '状态参数错误，必须为 enabled 或 disabled',
                    'data' => null
                ]);
            }

            // 检查渠道是否存在且属于当前公司
            $channel = Db::name('distribution_channel')
                ->where(['id' => $id, 'companyId' => $companyId, 'deleteTime' => 0])
                ->find();

            if (!$channel) {
                return json([
                    'code' => 404,
                    'success' => false,
                    'msg' => '渠道不存在或没有权限',
                    'data' => null
                ]);
            }

            // 如果状态相同，直接返回成功
            if ($channel['status'] === $status) {
                $msg = $status === DistributionChannel::STATUS_ENABLED ? '渠道已启用' : '渠道已禁用';
                return json([
                    'code' => 200,
                    'success' => true,
                    'msg' => $msg,
                    'data' => null
                ]);
            }

            // 更新状态
            $result = Db::name('distribution_channel')
                ->where(['id' => $id, 'companyId' => $companyId])
                ->update([
                    'status' => $status,
                    'updateTime' => time()
                ]);

            if ($result === false) {
                return json([
                    'code' => 500,
                    'success' => false,
                    'msg' => '更新状态失败',
                    'data' => null
                ]);
            }

            $msg = $status === DistributionChannel::STATUS_ENABLED ? '启用成功' : '禁用成功';

            return json([
                'code' => 200,
                'success' => true,
                'msg' => $msg,
                'data' => [
                    'id' => (int)$id,
                    'status' => $status
                ]
            ]);

        } catch (Exception $e) {
            return json([
                'code' => $e->getCode() ?: 500,
                'success' => false,
                'msg' => '更新状态失败：' . $e->getMessage(),
                'data' => null
            ]);
        }
    }

    /**
     * 获取渠道统计数据
     * @return \think\response\Json
     */
    public function statistics()
    {
        try {
            $companyId = $this->getUserInfo('companyId');

            // 获取今日开始和结束时间戳
            $todayStart = strtotime(date('Y-m-d 00:00:00'));
            $todayEnd = strtotime(date('Y-m-d 23:59:59'));

            // 构建基础查询条件
            $baseWhere = [
                ['companyId', '=', $companyId],
                ['deleteTime', '=', 0]
            ];

            // 如果不是管理员，只能查看自己创建的数据
            if (!$this->getUserInfo('isAdmin')) {
                $baseWhere[] = ['userId', '=', $this->getUserInfo('id')];
            }

            // 1. 总渠道数
            $totalChannels = Db::name('distribution_channel')
                ->where($baseWhere)
                ->count();

            // 2. 今日新增渠道数
            $todayChannels = Db::name('distribution_channel')
                ->where($baseWhere)
                ->where('createTime', 'between', [$todayStart, $todayEnd])
                ->count();

            // 3. 统计所有渠道的获客数和加好友数（使用聚合函数）
            $statistics = Db::name('distribution_channel')
                ->where($baseWhere)
                ->field([
                    'SUM(totalCustomers) as totalCustomers',
                    'SUM(todayCustomers) as todayCustomers',
                    'SUM(totalFriends) as totalFriends',
                    'SUM(todayFriends) as todayFriends'
                ])
                ->find();

            // 格式化统计数据
            $data = [
                'totalChannels' => (int)$totalChannels,
                'todayChannels' => (int)$todayChannels,
                'totalCustomers' => (int)($statistics['totalCustomers'] ?? 0),
                'todayCustomers' => (int)($statistics['todayCustomers'] ?? 0),
                'totalFriends' => (int)($statistics['totalFriends'] ?? 0),
                'todayFriends' => (int)($statistics['todayFriends'] ?? 0),
            ];

            return json([
                'code' => 200,
                'msg' => '获取成功',
                'data' => $data
            ]);

        } catch (Exception $e) {
            return json([
                'code' => $e->getCode() ?: 500,
                'msg' => '获取统计数据失败：' . $e->getMessage(),
                'data' => null
            ]);
        }
    }

    /**
     * 获取渠道收益统计（全局统计）
     * @return \think\response\Json
     */
    public function revenueStatistics()
    {
        try {
            $companyId = $this->getUserInfo('companyId');

            // 构建基础查询条件
            $baseWhere = [
                ['companyId', '=', $companyId]
            ];

            // 如果不是管理员，只能查看自己创建的提现申请
            if (!$this->getUserInfo('isAdmin')) {
                $baseWhere[] = ['userId', '=', $this->getUserInfo('id')];
            }

            // 1. 总支出：所有已打款的提现申请金额总和（状态为paid）
            $totalExpenditure = Db::name('distribution_withdrawal')
                ->where($baseWhere)
                ->where('status', DistributionWithdrawal::STATUS_PAID)
                ->sum('amount');
            $totalExpenditure = intval($totalExpenditure ?? 0);

            // 2. 已提现：所有已打款的提现申请金额总和（状态为paid）
            $withdrawn = $totalExpenditure; // 已提现 = 总支出

            // 3. 待审核：所有待审核的提现申请金额总和（状态为pending）
            $pendingReview = Db::name('distribution_withdrawal')
                ->where($baseWhere)
                ->where('status', DistributionWithdrawal::STATUS_PENDING)
                ->sum('amount');
            $pendingReview = intval($pendingReview ?? 0);

            // 格式化返回数据（分转元）
            $data = [
                'totalExpenditure' => round($totalExpenditure / 100, 2), // 总支出（元）
                'withdrawn' => round($withdrawn / 100, 2), // 已提现（元）
                'pendingReview' => round($pendingReview / 100, 2), // 待审核（元）
            ];

            return json([
                'code' => 200,
                'success' => true,
                'msg' => '获取成功',
                'data' => $data
            ]);

        } catch (Exception $e) {
            return json([
                'code' => $e->getCode() ?: 500,
                'success' => false,
                'msg' => '获取收益统计失败：' . $e->getMessage(),
                'data' => null
            ]);
        }
    }

    /**
     * 获取渠道收益明细列表（多个渠道的统计）
     * @return \think\response\Json
     */
    public function revenueDetail()
    {
        try {
            // 获取参数
            $page = $this->request->param('page', 1);
            $limit = $this->request->param('limit', 20);
            $keyword = $this->request->param('keyword', '');

            $companyId = $this->getUserInfo('companyId');

            // 参数验证
            $page = max(1, intval($page));
            $limit = max(1, min(100, intval($limit))); // 限制最大100

            // 构建查询条件
            $where = [];
            $where[] = ['companyId', '=', $companyId];
            $where[] = ['deleteTime', '=', 0];

            // 如果不是管理员，只能查看自己创建的数据
            if (!$this->getUserInfo('isAdmin')) {
                $where[] = ['userId', '=', $this->getUserInfo('id')];
            }

            // 关键词搜索（模糊匹配 name、code）
            if (!empty($keyword)) {
                $keyword = trim($keyword);
                $where[] = ['name|code', 'like', '%' . $keyword . '%'];
            }

            // 查询总数
            $total = Db::name('distribution_channel')
                ->where($where)
                ->count();

            // 查询渠道列表（按创建时间倒序）
            $channels = Db::name('distribution_channel')
                ->where($where)
                ->order('createTime DESC')
                ->page($page, $limit)
                ->select();

            // 批量获取所有渠道的提现统计数据（提高性能）
            $channelIds = array_column($channels, 'id');
            $withdrawalStats = [];
            if (!empty($channelIds)) {
                // 构建提现查询条件
                $withdrawalWhere = [
                        ['companyId', '=', $companyId],
                        ['channelId', 'in', $channelIds]
                ];
                
                // 如果不是管理员，只能查看自己创建的提现申请
                if (!$this->getUserInfo('isAdmin')) {
                    $withdrawalWhere[] = ['userId', '=', $this->getUserInfo('id')];
                }
                
                // 按渠道ID和状态分组统计提现金额
                $stats = Db::name('distribution_withdrawal')
                    ->where($withdrawalWhere)
                    ->field([
                        'channelId',
                        'status',
                        'SUM(amount) as totalAmount'
                    ])
                    ->group('channelId, status')
                    ->select();

                // 组织统计数据
                foreach ($stats as $stat) {
                    $cid = $stat['channelId'];
                    if (!isset($withdrawalStats[$cid])) {
                        $withdrawalStats[$cid] = [
                            'totalRevenue' => 0,      // 总收益（不包括驳回的）
                            'withdrawn' => 0,        // 已打款（paid）
                            'pendingReview' => 0      // 待审核（pending）
                        ];
                    }
                    $amount = intval($stat['totalAmount'] ?? 0);
                    $status = $stat['status'];
                    
                    // totalRevenue 不包括驳回（rejected）状态的金额
                    if ($status !== DistributionWithdrawal::STATUS_REJECTED) {
                    $withdrawalStats[$cid]['totalRevenue'] += $amount;
                    }
                    
                    if ($status === DistributionWithdrawal::STATUS_PAID) {
                        $withdrawalStats[$cid]['withdrawn'] += $amount;
                    } elseif ($status === DistributionWithdrawal::STATUS_PENDING) {
                        $withdrawalStats[$cid]['pendingReview'] += $amount;
                    }
                }
            }

            // 格式化数据
            $formattedList = [];
            foreach ($channels as $channel) {
                $channelId = $channel['id'];
                $stats = $withdrawalStats[$channelId] ?? [
                    'totalRevenue' => 0,
                    'withdrawn' => 0,
                    'pendingReview' => 0
                ];

                // 可提现金额：渠道的withdrawableAmount
                $withdrawableAmount = intval($channel['withdrawableAmount'] ?? 0);

                $formattedItem = [
                    'channelId' => (string)$channelId,
                    'channelName' => $channel['name'] ?? '',
                    'channelCode' => $channel['code'] ?? '',
                    'totalRevenue' => round($stats['totalRevenue'] / 100, 2), // 总收益（元）
                    'withdrawable' => round($withdrawableAmount / 100, 2), // 可提现（元）
                    'withdrawn' => round($stats['withdrawn'] / 100, 2), // 已提现（元）
                    'pendingReview' => round($stats['pendingReview'] / 100, 2), // 待审核（元）
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
                'msg' => '获取收益明细失败：' . $e->getMessage(),
                'data' => null
            ]);
        }
    }

    /**
     * 生成渠道二维码（H5或小程序码）
     * @return \think\response\Json
     */
    public function generateQrCode()
    {
        try {
            // 获取参数
            $type = $this->request->param('type', 'h5'); // h5 或 miniprogram

            $companyId = $this->getUserInfo('companyId');
            $userId = $this->getUserInfo('id');

            // 参数验证
            if (!in_array($type, ['h5', 'miniprogram'])) {
                return json([
                    'code' => 400,
                    'success' => false,
                    'msg' => '类型参数错误，必须为 h5 或 miniprogram',
                    'data' => null
                ]);
            }

            // 生成临时token（包含公司ID和用户ID，有效期24小时）
            // 用户扫码后需要自己填写所有信息
            $tokenData = [
                'companyId' => $companyId,
                'userId' => $userId,
                'expireTime' => time() + 86400 // 24小时后过期
            ];
            $token = base64_encode(json_encode($tokenData));
            
            // 如果是小程序码，提前计算scene并存储映射关系到数据库
            if ($type === 'miniprogram') {
                $scene = substr(md5($token), 0, 32);
                
                // 使用数据库存储映射关系（更可靠）
                try {
                    Db::name('distribution_channel_scene_token')->insert([
                        'scene' => $scene,
                        'token' => $token,
                        'companyId' => $companyId,
                        'expireTime' => time() + 86400,
                        'createTime' => time()
                    ]);
                } catch (\Exception $e) {
                    // 如果表不存在，尝试创建表
                    $this->createSceneTokenTable();
                    // 重试一次
                    try {
                        Db::name('distribution_channel_scene_token')->insert([
                            'scene' => $scene,
                            'token' => $token,
                            'companyId' => $companyId,
                            'expireTime' => time() + 86400,
                            'createTime' => time()
                        ]);
                    } catch (\Exception $e2) {
                        // 静默失败，不影响主流程
                    }
                }
                
                // 同时存储到缓存（双重保险）
                $sceneCacheKey = 'channel_register_scene_' . $scene;
                Cache::set($sceneCacheKey, $token, 86400);
            }

            if ($type === 'h5') {
                // 生成H5二维码
                // 获取H5页面URL（需要根据实际项目配置）
                $h5BaseUrl = Env::get('rpc.H5_FORM_URL', 'https://h5.ckb.quwanzhi.com/#');
                // 确保URL格式正确（去除末尾斜杠）
                $h5BaseUrl = rtrim($h5BaseUrl, '/');
                $h5Url = $h5BaseUrl . '/pages/channel/add?token=' . urlencode($token);

                // 生成二维码
                $qrCode = new QrCode($h5Url);
                $qrCode->setSize(300);
                $qrCode->setMargin(10);
                $qrCode->setWriterByName('png');
                $qrCode->setEncoding('UTF-8');
                $qrCode->setErrorCorrectionLevel(ErrorCorrectionLevel::HIGH);

                // 转换为base64
                $qrCodeBase64 = 'data:image/png;base64,' . base64_encode($qrCode->writeString());

                return json([
                    'code' => 200,
                    'success' => true,
                    'msg' => '生成H5二维码成功',
                    'data' => [
                        'type' => 'h5',
                        'qrCode' => $qrCodeBase64,
                        'url' => $h5Url
                    ]
                ]);

            } else {
                // 生成小程序码
                try {
                    // 从环境变量获取小程序配置
                    $miniProgramConfig = [
                        'app_id' => Env::get('weChat.appidMiniApp', 'wx789850448e26c91d'),
                        'secret' => Env::get('weChat.secretMiniApp', 'd18f75b3a3623cb40da05648b08365a1'),
                        'response_type' => 'array'
                    ];

                    $app = Factory::miniProgram($miniProgramConfig);

                    // scene参数长度限制为32位，使用token的MD5值
                    $scene = substr(md5($token), 0, 32);
                    
                    // 再次确保映射关系已存储到数据库和缓存（双重保险）
                    $sceneCacheKey = 'channel_register_scene_' . $scene;
                    Cache::set($sceneCacheKey, $token, 86400);
                    

                    // 调用接口生成小程序码
                    // 注意：page 必须是小程序里已经存在且发布过的页面路径
                    // 根据你的前端约定，改为和 H5 一致的添加渠道页面
                    $response = $app->app_code->getUnlimit($scene, [
                        'page'  => 'pages/channel/add',  // 请确保小程序里存在该页面
                        'width' => 430,                  // 二维码的宽度
                    ]);

                    // 成功时返回的是 StreamResponse，失败时通常返回数组（包含 errcode/errmsg）
                    if ($response instanceof \EasyWeChat\Kernel\Http\StreamResponse) {
                        $img = $response->getBody()->getContents();
                        $imgBase64 = 'data:image/png;base64,' . base64_encode($img);

                        return json([
                            'code' => 200,
                            'success' => true,
                            'msg' => '生成小程序码成功',
                            'data' => [
                                'type' => 'miniprogram',
                                'qrCode' => $imgBase64,
                                'scene' => $scene, // 返回scene供小程序端使用
                                'token' => $token  // 返回token，小程序端可以通过scene查询
                            ]
                        ]);
                    }

                    // 如果不是流响应，而是数组（错误信息），则解析错误返回
                    if (is_array($response) && isset($response['errcode']) && $response['errcode'] != 0) {
                        $errMsg = isset($response['errmsg']) ? $response['errmsg'] : '微信接口返回错误';
                        return json([
                            'code' => 500,
                            'success' => false,
                            'msg' => '生成小程序码失败：' . $errMsg,
                            'data' => $response
                        ]);
                    }

                    // 其他未知格式
                    return json([
                        'code' => 500,
                        'success' => false,
                        'msg' => '生成小程序码失败：响应格式错误',
                        'data' => $response
                    ]);
                } catch (\Exception $e) {
                    return json([
                        'code' => 500,
                        'success' => false,
                        'msg' => '生成小程序码失败：' . $e->getMessage(),
                        'data' => null
                    ]);
                }
            }

        } catch (Exception $e) {
            return json([
                'code' => $e->getCode() ?: 500,
                'success' => false,
                'msg' => '生成二维码失败：' . $e->getMessage(),
                'data' => null
            ]);
        }
    }

    /**
     * 生成渠道登录二维码（H5或小程序码）
     * 通用登录二维码，不绑定特定渠道，用户扫码后输入手机号和密码登录
     * @return \think\response\Json
     */
    public function generateLoginQrCode()
    {
        try {
            // 获取参数
            $type = $this->request->param('type', 'h5'); // h5 或 miniprogram

            $companyId = $this->getUserInfo('companyId');

            // 参数验证
            if (!in_array($type, ['h5', 'miniprogram'])) {
                return json([
                    'code' => 400,
                    'success' => false,
                    'msg' => '类型参数错误，必须为 h5 或 miniprogram',
                    'data' => null
                ]);
            }

            if ($type === 'h5') {
                // 生成H5登录二维码
                $h5BaseUrl = Env::get('rpc.H5_FORM_URL', 'https://h5.ckb.quwanzhi.com/#');
                $h5BaseUrl = rtrim($h5BaseUrl, '/');
                // H5登录页面路径，需要根据实际项目调整
                // 登录入口只需要携带 companyId 参数
                $h5Url = $h5BaseUrl . '/pages/channel/login?companyId=' . urlencode($companyId);

                // 生成二维码
                $qrCode = new QrCode($h5Url);
                $qrCode->setSize(300);
                $qrCode->setMargin(10);
                $qrCode->setWriterByName('png');
                $qrCode->setEncoding('UTF-8');
                $qrCode->setErrorCorrectionLevel(ErrorCorrectionLevel::HIGH);

                // 转换为base64
                $qrCodeBase64 = 'data:image/png;base64,' . base64_encode($qrCode->writeString());

                return json([
                    'code' => 200,
                    'success' => true,
                    'msg' => '生成H5登录二维码成功',
                    'data' => [
                        'type' => 'h5',
                        'qrCode' => $qrCodeBase64,
                        'url' => $h5Url
                    ]
                ]);

            } else {
                // 生成小程序登录码
                try {
                    // 从环境变量获取小程序配置
                    $miniProgramConfig = [
                        'app_id' => Env::get('weChat.appidMiniApp', 'wx789850448e26c91d'),
                        'secret' => Env::get('weChat.secretMiniApp', 'd18f75b3a3623cb40da05648b08365a1'),
                        'response_type' => 'array'
                    ];

                    $app = Factory::miniProgram($miniProgramConfig);

                    // scene 参数直接使用 companyId（字符串），并确保长度不超过32
                    $scene = (string)$companyId;
                    if (strlen($scene) > 32) {
                        $scene = substr($scene, 0, 32);
                    }

                    // 调用接口生成小程序码
                    // 小程序登录页面路径，需要根据实际项目调整
                    $response = $app->app_code->getUnlimit($scene, [
                        'page' => 'pages/channel/login',  // 请确保小程序里存在该页面
                        'width' => 430,
                    ]);

                    // 成功时返回的是 StreamResponse
                    if ($response instanceof \EasyWeChat\Kernel\Http\StreamResponse) {
                        $img = $response->getBody()->getContents();
                        $imgBase64 = 'data:image/png;base64,' . base64_encode($img);

                        return json([
                            'code' => 200,
                            'success' => true,
                            'msg' => '生成小程序登录码成功',
                            'data' => [
                                'type' => 'miniprogram',
                                'qrCode' => $imgBase64,
                                'scene' => $scene
                            ]
                        ]);
                    }

                    // 如果不是流响应，而是数组（错误信息），则解析错误返回
                    if (is_array($response) && isset($response['errcode']) && $response['errcode'] != 0) {
                        $errMsg = isset($response['errmsg']) ? $response['errmsg'] : '微信接口返回错误';
                        return json([
                            'code' => 500,
                            'success' => false,
                            'msg' => '生成小程序登录码失败：' . $errMsg,
                            'data' => $response
                        ]);
                    }

                    // 其他未知格式
                    return json([
                        'code' => 500,
                        'success' => false,
                        'msg' => '生成小程序登录码失败：响应格式错误',
                        'data' => $response
                    ]);
                } catch (\Exception $e) {
                    return json([
                        'code' => 500,
                        'success' => false,
                        'msg' => '生成小程序登录码失败：' . $e->getMessage(),
                        'data' => null
                    ]);
                }
            }

        } catch (Exception $e) {
            return json([
                'code' => $e->getCode() ?: 500,
                'success' => false,
                'msg' => '生成登录二维码失败：' . $e->getMessage(),
                'data' => null
            ]);
        }
    }

    /**
     * 扫码提交渠道信息（H5和小程序共用）
     * GET请求：返回预填信息
     * POST请求：提交渠道信息
     * @return \think\response\Json
     */
    public function registerByQrCode()
    {
        try {
            // 获取参数
            $token = $this->request->param('token', '');

            // 参数验证
            if (empty($token)) {
                return json([
                    'code' => 400,
                    'success' => false,
                    'msg' => 'token不能为空',
                    'data' => null
                ]);
            }

            // 判断传入的是scene（32位MD5）还是token（base64编码）
            // 如果是32位MD5字符串，则从数据库或缓存中查找对应的token
            if (strlen($token) == 32 && preg_match('/^[a-f0-9]{32}$/i', $token)) {
                // 这是scene，先从数据库查找对应的token
                $sceneData = Db::name('distribution_channel_scene_token')
                    ->where('scene', $token)
                    ->where('expireTime', '>', time())
                    ->find();
                
                if ($sceneData && !empty($sceneData['token'])) {
                    $realToken = $sceneData['token'];
                } else {
                    // 如果数据库中没有，尝试从缓存获取
                    $sceneCacheKey = 'channel_register_scene_' . $token;
                    $realToken = Cache::get($sceneCacheKey);
                    
                    if (empty($realToken)) {
                        return json([
                            'code' => 400,
                            'success' => false,
                            'msg' => '二维码已过期，请重新生成',
                            'data' => null
                        ]);
                    }
                }
                
                $token = $realToken;
            }

            // 解析token
            $tokenData = json_decode(base64_decode($token), true);
            if (!$tokenData || !isset($tokenData['companyId'])) {
                return json([
                    'code' => 400,
                    'success' => false,
                    'msg' => 'token无效',
                    'data' => null
                ]);
            }

            // 检查token是否过期
            if (isset($tokenData['expireTime']) && $tokenData['expireTime'] < time()) {
                return json([
                    'code' => 400,
                    'success' => false,
                    'msg' => '二维码已过期，请重新生成',
                    'data' => null
                ]);
            }

            $companyId = $tokenData['companyId'];
            $userId = isset($tokenData['userId']) ? $tokenData['userId'] : 0; // 兼容旧token，如果没有userId则默认为0

            // GET请求：返回token验证成功信息（前端可以显示表单）
            if ($this->request->isGet()) {
                return json([
                    'code' => 200,
                    'success' => true,
                    'msg' => 'token验证成功',
                    'data' => [
                        'valid' => true
                    ]
                ]);
            }

            // POST请求：提交渠道信息（所有信息都需要用户填写）
            $name = $this->request->param('name', '');
            $phone = $this->request->param('phone', '');
            $wechatId = $this->request->param('wechatId', '');
            $remarks = $this->request->param('remarks', '');

            // 参数验证
            if (empty($name)) {
                return json([
                    'code' => 400,
                    'success' => false,
                    'msg' => '渠道名称不能为空',
                    'data' => null
                ]);
            }

            // 验证渠道名称长度
            if (mb_strlen($name) > 50) {
                return json([
                    'code' => 400,
                    'success' => false,
                    'msg' => '渠道名称长度不能超过50个字符',
                    'data' => null
                ]);
            }

            // 验证手机号格式（如果提供）
            if (!empty($phone)) {
                if (!preg_match('/^1[3-9]\d{9}$/', $phone)) {
                    return json([
                        'code' => 400,
                        'success' => false,
                        'msg' => '手机号格式不正确，请输入11位数字且以1开头',
                        'data' => null
                    ]);
                }

                // 检查手机号是否已存在（排除已删除的渠道）
                $existChannel = Db::name('distribution_channel')
                    ->where([
                        ['companyId', '=', $companyId],
                        ['phone', '=', $phone],
                        ['deleteTime', '=', 0]
                    ])
                    ->find();

                if ($existChannel) {
                    return json([
                        'code' => 400,
                        'success' => false,
                        'msg' => '手机号已被使用',
                        'data' => null
                    ]);
                }
            }

            // 验证微信号长度（如果提供）
            if (!empty($wechatId) && mb_strlen($wechatId) > 50) {
                return json([
                    'code' => 400,
                    'success' => false,
                    'msg' => '微信号长度不能超过50个字符',
                    'data' => null
                ]);
            }

            // 验证备注长度（如果提供）
            if (!empty($remarks) && mb_strlen($remarks) > 200) {
                return json([
                    'code' => 400,
                    'success' => false,
                    'msg' => '备注信息长度不能超过200个字符',
                    'data' => null
                ]);
            }

            // 生成渠道编码
            $code = DistributionChannel::generateChannelCode();

            // 准备插入数据（从token中获取userId，记录是哪个用户生成的二维码）
            $data = [
                'companyId' => $companyId,
                'userId' => $userId, // 从token中获取userId，记录生成二维码的用户
                'name' => $name,
                'code' => $code,
                'phone' => $phone ?: '',
                'password' => md5('123456'), // 默认密码123456，MD5加密
                'wechatId' => $wechatId ?: '',
                'remarks' => $remarks ?: '',
                'createType' => DistributionChannel::CREATE_TYPE_AUTO, // 扫码创建
                'status' => DistributionChannel::STATUS_ENABLED,
                'totalCustomers' => 0,
                'todayCustomers' => 0,
                'totalFriends' => 0,
                'todayFriends' => 0,
                'withdrawableAmount' => 0, // 以分为单位存储
                'createTime' => time(),
                'updateTime' => time(),
            ];

            // 插入数据库
            $channelId = Db::name('distribution_channel')->insertGetId($data);

            if (!$channelId) {
                return json([
                    'code' => 500,
                    'success' => false,
                    'msg' => '创建渠道失败',
                    'data' => null
                ]);
            }

            // 获取创建的数据
            $channel = Db::name('distribution_channel')->where('id', $channelId)->find();

            // 格式化返回数据
            $result = [
                'id' => (string)$channel['id'],
                'name' => $channel['name'],
                'code' => $channel['code'],
                'phone' => $channel['phone'] ?: '',
                'wechatId' => $channel['wechatId'] ?: '',
                'companyId' => (int)$companyId, // 返回companyId，方便小程序自动跳转
                'userId' => (int)($channel['userId'] ?? 0),
                'createType' => $channel['createType'],
                'status' => $channel['status'],
                'totalCustomers' => (int)$channel['totalCustomers'],
                'todayCustomers' => (int)$channel['todayCustomers'],
                'totalFriends' => (int)$channel['totalFriends'],
                'todayFriends' => (int)$channel['todayFriends'],
                'withdrawableAmount' => round(($channel['withdrawableAmount'] ?? 0) / 100, 2), // 分转元，保留2位小数
                'createTime' => !empty($channel['createTime']) ? date('Y-m-d H:i:s', $channel['createTime']) : date('Y-m-d H:i:s'),
            ];

            return json([
                'code' => 200,
                'success' => true,
                'msg' => '渠道注册成功',
                'data' => $result
            ]);

        } catch (Exception $e) {
            return json([
                'code' => $e->getCode() ?: 500,
                'success' => false,
                'msg' => '渠道注册失败：' . $e->getMessage(),
                'data' => null
            ]);
        }
    }

    /**
     * 创建scene和token映射表（如果不存在）
     */
    protected function createSceneTokenTable()
    {
        try {
            $sql = "CREATE TABLE IF NOT EXISTS `ck_distribution_channel_scene_token` (
                `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
                `scene` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT '' COMMENT '小程序scene参数（MD5值）',
                `token` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '原始token（base64编码）',
                `companyId` int(11) UNSIGNED NOT NULL DEFAULT 0 COMMENT '公司ID',
                `expireTime` int(11) UNSIGNED NOT NULL DEFAULT 0 COMMENT '过期时间戳',
                `createTime` int(11) UNSIGNED NOT NULL DEFAULT 0 COMMENT '创建时间',
                PRIMARY KEY (`id`) USING BTREE,
                UNIQUE KEY `uk_scene` (`scene`) USING BTREE,
                INDEX `idx_companyId` (`companyId`) USING BTREE,
                INDEX `idx_expireTime` (`expireTime`) USING BTREE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='分销渠道小程序码scene和token映射表';";
            
            Db::execute($sql);
        } catch (\Exception $e) {
            // 静默失败
        }
    }
}

