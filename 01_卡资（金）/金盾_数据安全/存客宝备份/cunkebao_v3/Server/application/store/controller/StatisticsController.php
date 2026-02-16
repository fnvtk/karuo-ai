<?php

namespace app\store\controller;

use app\store\model\WechatFriendModel;
use app\store\model\WechatMessageModel;
use app\store\model\TrafficOrderModel;
use think\Db;


/**
 * 数据统计控制器
 */
class StatisticsController extends BaseController
{
    /**
     * 获取数据概览
     */
    public function getOverview()
    {
        try {
            $companyId = $this->userInfo['companyId'];
            $userId = $this->userInfo['id'];

            // 构建查询条件
            $deviceIds = Db::name('device_user')->where(['userId' => $userId, 'companyId' => $companyId])->order('id DESC')->column('deviceId');
            if (empty($deviceIds)) {
                return errorJson('设备不存在');
            }
            $ownerWechatIds = [];
            foreach ($deviceIds as $deviceId) {
                $ownerWechatIds[] = Db::name('device_wechat_login')
                    ->where(['deviceId' => $deviceId])
                    ->order('id DESC')
                    ->value('wechatId');
            }

            $wechatAccountIds = Db::table('s2_wechat_account')->whereIn('wechatId', $ownerWechatIds)->column('id');


            // 获取时间范围
            $timeRange = $this->getTimeRange();
            $startTime = $timeRange['start_time'];
            $endTime = $timeRange['end_time'];
            $lastStartTime = $timeRange['last_start_time'];
            $lastEndTime = $timeRange['last_end_time'];


            // 1. 总客户数
            $totalCustomers = WechatFriendModel::whereIn('ownerWechatId', $ownerWechatIds)
                ->where('isDeleted', 0)
                ->whereTime('createTime', '>=', $startTime)
                ->whereTime('createTime', '<', $endTime)
                ->count();

            // 上期总客户数
            $lastTotalCustomers = WechatFriendModel::whereIn('ownerWechatId', $ownerWechatIds)
                ->whereTime('createTime', '>=', $lastStartTime)
                ->whereTime('createTime', '<', $lastEndTime)
                ->count();

            // 2. 新增客户数
            $newCustomers = WechatFriendModel::whereIn('ownerWechatId', $ownerWechatIds)
                ->whereTime('createTime', '>=', $startTime)
                ->whereTime('createTime', '<', $endTime)
                ->count();

            // 上期新增客户数
            $lastNewCustomers = WechatFriendModel::whereIn('ownerWechatId', $ownerWechatIds)
                ->whereTime('createTime', '>=', $lastStartTime)
                ->whereTime('createTime', '<', $lastEndTime)
                ->count();

            //3. 互动次数
            $interactionCount = WechatMessageModel::whereIn('wechatAccountId', $wechatAccountIds)
                ->where('createTime', '>=', $startTime)
                ->where('createTime', '<', $endTime)
                ->count();

            // 上期互动次数
            $lastInteractionCount = WechatMessageModel::whereIn('wechatAccountId', $wechatAccountIds)
                ->where('createTime', '>=', $lastStartTime)
                ->where('createTime', '<', $lastEndTime)
                ->count();

            // 4. RFM 平均值计算（不查询上期数据）
            $rfmStats = WechatFriendModel::whereIn('ownerWechatId', $ownerWechatIds)
                ->where('isDeleted', 0)
                ->field('AVG(`R`) as avgR, AVG(`F`) as avgF, AVG(`M`) as avgM')
                ->find();

            // 处理查询结果，如果字段为null则默认为0
            $avgR = isset($rfmStats['avgR']) && $rfmStats['avgR'] !== null ? round((float)$rfmStats['avgR'], 2) : 0;
            $avgF = isset($rfmStats['avgF']) && $rfmStats['avgF'] !== null ? round((float)$rfmStats['avgF'], 2) : 0;
            $avgM = isset($rfmStats['avgM']) && $rfmStats['avgM'] !== null ? round((float)$rfmStats['avgM'], 2) : 0;

            // 计算三者的平均值
            $avgRFM = ($avgR + $avgF + $avgM) / 3;
            $avgRFM = round($avgRFM, 2);

            // 计算环比增长率
            $customerGrowth = $this->calculateGrowth($totalCustomers, $lastTotalCustomers);
            $newCustomerGrowth = $this->calculateGrowth($newCustomers, $lastNewCustomers);
            $interactionGrowth = $this->calculateGrowth($interactionCount, $lastInteractionCount);
            $data = [
                'total_customers' => [
                    'value' => $totalCustomers,
                    'growth' => $customerGrowth
                ],
                'new_customers' => [
                    'value' => $newCustomers,
                    'growth' => $newCustomerGrowth
                ],
                'interaction_count' => [
                    'value' => $interactionCount,
                    'growth' => $interactionGrowth
                ],
                'conversion_rate' => [
                    'value' => 10,
                    'growth' => 15
                ],
                'account_value' => [
                    'avg_r' => $avgR,
                    'avg_f' => $avgF,
                    'avg_m' => $avgM,
                    'avg_rfm' => $avgRFM
                ]
            ];

            return successJson($data);
        } catch (\Exception $e) {
            return errorJson('获取数据概览失败：' . $e->getMessage());
        }
    }


    /**
     * 获取综合分析数据
     */
    public function getComprehensiveAnalysis()
    {
        try {
            $companyId = $this->userInfo['companyId'];
            $userId = $this->userInfo['id'];

            // 构建查询条件
            $deviceIds = Db::name('device_user')->where(['userId' => $userId, 'companyId' => $companyId])->order('id DESC')->column('deviceId');
            if (empty($deviceIds)) {
                return errorJson('设备不存在');
            }
            $ownerWechatIds = [];
            foreach ($deviceIds as $deviceId) {
                $ownerWechatIds[] = Db::name('device_wechat_login')
                    ->where(['deviceId' => $deviceId])
                    ->order('id DESC')
                    ->value('wechatId');
            }
            $wechatAccountIds = Db::table('s2_wechat_account')->whereIn('wechatId', $ownerWechatIds)->column('id');

            // 获取时间范围
            $timeRange = $this->getTimeRange();
            $startTime = $timeRange['start_time'];
            $endTime = $timeRange['end_time'];
            $lastStartTime = $timeRange['last_start_time'];
            $lastEndTime = $timeRange['last_end_time'];

            // ========== 1. 客户平均转化金额 ==========
            // 获取有订单的客户数（去重）
            $convertedCustomers = TrafficOrderModel::whereIn('ownerWechatId', $ownerWechatIds)
                ->where('createTime', '>=', $startTime)
                ->where('createTime', '<', $endTime)
                ->group('identifier')
                ->column('identifier');
            $convertedCustomerCount = count($convertedCustomers);
            
            // 总销售额
            $totalSales = TrafficOrderModel::whereIn('ownerWechatId', $ownerWechatIds)
                ->where('createTime', '>=', $startTime)
                ->where('createTime', '<', $endTime)
                ->sum('actualPay');
            $totalSales = $totalSales ?: 0;
            
            // 客户平均转化金额
            $avgConversionAmount = $convertedCustomerCount > 0 ? round($totalSales / $convertedCustomerCount, 2) : 0;

            // ========== 2. 价值指标 ==========
            // 销售总额（已计算）
            
            // 平均订单金额（总订单数）
            $totalOrderCount = TrafficOrderModel::whereIn('ownerWechatId', $ownerWechatIds)
                ->where('createTime', '>=', $startTime)
                ->where('createTime', '<', $endTime)
                ->count();
            $avgOrderAmount = $totalOrderCount > 0 ? round($totalSales / $totalOrderCount, 2) : 0;
            
            // 高价值客户（消费超过平均订单金额的客户）
            // 先获取每个客户的消费总额
            $customerTotalSpend = TrafficOrderModel::whereIn('ownerWechatId', $ownerWechatIds)
                ->where('createTime', '>=', $startTime)
                ->where('createTime', '<', $endTime)
                ->field('identifier, SUM(actualPay) as totalSpend')
                ->group('identifier')
                ->select();
            
            $highValueCustomerCount = 0;
            $avgCustomerSpend = $convertedCustomerCount > 0 ? ($totalSales / $convertedCustomerCount) : 0;
            foreach ($customerTotalSpend as $customer) {
                if ($customer['totalSpend'] > $avgCustomerSpend) {
                    $highValueCustomerCount++;
                }
            }
            
            // 高价值客户百分比
            $totalCustomersForCalc = WechatFriendModel::whereIn('ownerWechatId', $ownerWechatIds)
                ->where('isDeleted', 0)
                ->count();
            $highValueCustomerPercent = $totalCustomersForCalc > 0 ? round(($highValueCustomerCount / $totalCustomersForCalc) * 100, 1) : 0;

            // ========== 3. 增长趋势 ==========
            // 上期销售额
            $lastTotalSales = TrafficOrderModel::whereIn('ownerWechatId', $ownerWechatIds)
                ->where('createTime', '>=', $lastStartTime)
                ->where('createTime', '<', $lastEndTime)
                ->sum('actualPay');
            $lastTotalSales = $lastTotalSales ?: 0;
            
            // 周收益增长（金额差值）
            $weeklyRevenueGrowth = round($totalSales - $lastTotalSales, 2);
            
            // 新客转化（新客户中有订单的人数）
            $newCustomers = WechatFriendModel::whereIn('ownerWechatId', $ownerWechatIds)
                ->where('createTime', '>=', $startTime)
                ->where('createTime', '<', $endTime)
                ->column('wechatId');
            
            // 获取新客户中有订单的（identifier 对应 wechatId）
            $newConvertedCustomers = 0;
            if (!empty($newCustomers)) {
                $newConvertedCustomers = TrafficOrderModel::whereIn('ownerWechatId', $ownerWechatIds)
                    ->where('createTime', '>=', $startTime)
                    ->where('createTime', '<', $endTime)
                    ->whereIn('identifier', $newCustomers)
                    ->group('identifier')
                    ->count();
            }
            
            // 活跃客户增长（有互动的客户）
            $activeCustomers = WechatMessageModel::whereIn('wechatAccountId', $wechatAccountIds)
                ->where('createTime', '>=', $startTime)
                ->where('createTime', '<', $endTime)
                ->group('wechatFriendId')
                ->count();
            
            $lastActiveCustomers = WechatMessageModel::whereIn('wechatAccountId', $wechatAccountIds)
                ->where('createTime', '>=', $lastStartTime)
                ->where('createTime', '<', $lastEndTime)
                ->group('wechatFriendId')
                ->count();
            
            // 活跃客户增长（人数差值）
            $activeCustomerGrowth = $activeCustomers - $lastActiveCustomers;

            // ========== 4. 客户活跃度 ==========
            // 按天统计每个客户的互动次数，然后分类
            // 高频互动用户数（平均每天3次以上）
            $days = max(1, ($endTime - $startTime) / 86400); // 计算天数
            $highFrequencyThreshold = $days * 3; // 高频阈值
            
            $highFrequencyUsers = WechatMessageModel::whereIn('wechatAccountId', $wechatAccountIds)
                ->where('createTime', '>=', $startTime)
                ->where('createTime', '<', $endTime)
                ->field('wechatFriendId, COUNT(*) as count')
                ->group('wechatFriendId')
                ->having('count > ' . $highFrequencyThreshold)
                ->count();

            // 中频互动用户数（平均每天1-3次）
            $midFrequencyThreshold = $days * 1;
            $midFrequencyUsers = WechatMessageModel::whereIn('wechatAccountId', $wechatAccountIds)
                ->where('createTime', '>=', $startTime)
                ->where('createTime', '<', $endTime)
                ->field('wechatFriendId, COUNT(*) as count')
                ->group('wechatFriendId')
                ->having('count >= ' . $midFrequencyThreshold . ' AND count <= ' . $highFrequencyThreshold)
                ->count();

            // 低频互动用户数（少于平均每天1次）
            $lowFrequencyUsers = WechatMessageModel::whereIn('wechatAccountId', $wechatAccountIds)
                ->where('createTime', '>=', $startTime)
                ->where('createTime', '<', $endTime)
                ->field('wechatFriendId, COUNT(*) as count')
                ->group('wechatFriendId')
                ->having('count < ' . $midFrequencyThreshold)
                ->count();

            $frequency_analysis = [
                ['name' => '高频', 'value' => $highFrequencyUsers],
                ['name' => '中频', 'value' => $midFrequencyUsers],
                ['name' => '低频', 'value' => $lowFrequencyUsers]
            ];

            // ========== 5. 转化客户来源 ==========
            // 只统计有订单的客户来源（identifier 对应 wechatId）
            $convertedFriendIds = TrafficOrderModel::whereIn('ownerWechatId', $ownerWechatIds)
                ->where('createTime', '>=', $startTime)
                ->where('createTime', '<', $endTime)
                ->group('identifier')
                ->column('identifier');
            
            $friendRecommend = 0;
            $wechatSearch = 0;
            $wechatGroup = 0;
            
            if (!empty($convertedFriendIds)) {
                // 朋友推荐（有订单的）
                $friendRecommend = WechatFriendModel::whereIn('ownerWechatId', $ownerWechatIds)
                    ->whereIn('wechatId', $convertedFriendIds)
                    ->whereIn('addFrom', [17, 1000017])
                    ->count();

                // 微信搜索（有订单的）
                $wechatSearch = WechatFriendModel::whereIn('ownerWechatId', $ownerWechatIds)
                    ->whereIn('wechatId', $convertedFriendIds)
                    ->whereIn('addFrom', [3, 15, 1000003, 1000015])
                    ->count();

                // 微信群（有订单的）
                $wechatGroup = WechatFriendModel::whereIn('ownerWechatId', $ownerWechatIds)
                    ->whereIn('wechatId', $convertedFriendIds)
                    ->whereIn('addFrom', [14, 1000014])
                    ->count();
            }

            $totalConvertedCustomers = $convertedCustomerCount;
            $otherSource = max(0, $totalConvertedCustomers - $friendRecommend - $wechatSearch - $wechatGroup);

            // 计算百分比
            $calculatePercentage = function ($value) use ($totalConvertedCustomers) {
                if ($totalConvertedCustomers <= 0) return 0;
                return round(($value / $totalConvertedCustomers) * 100, 2);
            };

            $sourceDistribution = [
                [
                    'name' => '朋友推荐',
                    'value' => $calculatePercentage($friendRecommend) . '%',
                    'count' => $friendRecommend
                ],
                [
                    'name' => '微信搜索',
                    'value' => $calculatePercentage($wechatSearch) . '%',
                    'count' => $wechatSearch
                ],
                [
                    'name' => '微信群',
                    'value' => $calculatePercentage($wechatGroup) . '%',
                    'count' => $wechatGroup
                ]
            ];

            // 构建返回数据
            $data = [
                'avg_conversion_amount' => $avgConversionAmount, // 客户平均转化金额
                'value_indicators' => [
                    'total_sales' => round($totalSales, 2), // 销售总额
                    'avg_order_amount' => $avgOrderAmount, // 平均订单金额
                    'high_value_customers' => $highValueCustomerPercent . '%' // 高价值客户
                ],
                'growth_trend' => [
                    'weekly_revenue_growth' => $weeklyRevenueGrowth, // 周收益增长（金额）
                    'new_customer_conversion' => $newConvertedCustomers, // 新客转化（人数）
                    'active_customer_growth' => $activeCustomerGrowth // 活跃客户增长（人数差值）
                ],
                'frequency_analysis' => $frequency_analysis, // 客户活跃度
                'source_distribution' => $sourceDistribution // 转化客户来源
            ];

            return successJson($data);
        } catch (\Exception $e) {
            return errorJson('获取互动分析数据失败：' . $e->getMessage());
        }
    }

    /**
     * 获取时间范围
     *
     * @param bool $toTimestamp 是否将日期转为时间戳，默认为true
     * @return array 时间范围数组
     */
    private function getTimeRange($toTimestamp = true)
    {
        // 可选：today, yesterday, this_week, last_week, this_month, this_quarter, this_year
        $timeType = input('time_type', 'this_week');

        switch ($timeType) {
            case 'today': // 今日
                $startTime = date('Y-m-d');
                $endTime = date('Y-m-d', strtotime('+1 day'));
                $lastStartTime = date('Y-m-d', strtotime('-1 day')); // 昨日
                $lastEndTime = $startTime;
                break;

            case 'yesterday': // 昨日
                $startTime = date('Y-m-d', strtotime('-1 day'));
                $endTime = date('Y-m-d');
                $lastStartTime = date('Y-m-d', strtotime('-2 day')); // 前日
                $lastEndTime = $startTime;
                break;

            case 'this_week': // 本周
                $startTime = date('Y-m-d', strtotime('monday this week'));
                $endTime = date('Y-m-d', strtotime('monday next week'));
                $lastStartTime = date('Y-m-d', strtotime('monday last week')); // 上周一
                $lastEndTime = $startTime;
                break;

            case 'last_week': // 上周
                $startTime = date('Y-m-d', strtotime('monday last week'));
                $endTime = date('Y-m-d', strtotime('monday this week'));
                $lastStartTime = date('Y-m-d', strtotime('monday last week', strtotime('last week'))); // 上上周一
                $lastEndTime = $startTime;
                break;

            case 'this_month': // 本月
                $startTime = date('Y-m-01');
                $endTime = date('Y-m-d', strtotime(date('Y-m-01') . ' +1 month'));
                $lastStartTime = date('Y-m-01', strtotime('-1 month')); // 上月初
                $lastEndTime = $startTime;
                break;

            case 'this_quarter': // 本季度
                $month = date('n');
                $quarter = ceil($month / 3);
                $startMonth = ($quarter - 1) * 3 + 1;
                $startTime = date('Y-') . str_pad($startMonth, 2, '0', STR_PAD_LEFT) . '-01';
                $endTime = date('Y-m-d', strtotime($startTime . ' +3 month'));
                // 上季度
                $lastStartTime = date('Y-m-d', strtotime($startTime . ' -3 month'));
                $lastEndTime = $startTime;
                break;

            case 'this_year': // 本年度
                $startTime = date('Y-01-01');
                $endTime = (date('Y') + 1) . '-01-01';
                $lastStartTime = (date('Y') - 1) . '-01-01'; // 去年初
                $lastEndTime = $startTime;
                break;

            default:
                $startTime = date('Y-m-d', strtotime('monday this week'));
                $endTime = date('Y-m-d', strtotime('monday next week'));
                $lastStartTime = date('Y-m-d', strtotime('monday last week'));
                $lastEndTime = $startTime;
        }

        // 如果需要转换为时间戳
        if ($toTimestamp) {
            $startTime = strtotime($startTime);
            $endTime = strtotime($endTime);
            $lastStartTime = strtotime($lastStartTime);
            $lastEndTime = strtotime($lastEndTime);
        }

        return [
            'start_time' => $startTime,
            'end_time' => $endTime,
            'last_start_time' => $lastStartTime,
            'last_end_time' => $lastEndTime
        ];
    }

    /**
     * 计算环比增长率
     */
    private function calculateGrowth($current, $last)
    {
        if ($last == 0) {
            return $current > 0 ? 100 : 0;
        }
        return round((($current - $last) / $last) * 100, 1);
    }
} 