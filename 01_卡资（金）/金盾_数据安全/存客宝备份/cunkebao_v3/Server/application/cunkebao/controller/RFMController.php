<?php

namespace app\cunkebao\controller;

use think\Db;
use app\store\model\TrafficOrderModel;
use app\common\model\TrafficSource;
use app\store\model\WechatFriendModel;

/**
 * RFM 客户价值评分控制器
 * 基于 RFM 客户价值评分体系技术实施文档实现
 */
class RFMController extends BaseController
{
    // 默认配置参数
    const DEFAULT_CYCLE_DAYS = 180;  // 默认统计周期（天）
    const DEFAULT_WEIGHT_R = 0.4;    // R维度权重
    const DEFAULT_WEIGHT_F = 0.3;    // F维度权重
    const DEFAULT_WEIGHT_M = 0.3;    // M维度权重
    const DEFAULT_ABNORMAL_MONEY_RATIO = 3.0;  // 异常金额阈值倍数
    const DEFAULT_SCORE_SCALE = 5;   // 默认5分制

    /**
     * 从 traffic_order 表计算客户 RFM 评分
     * 
     * @param string|null $identifier 流量池用户标识
     * @param string|null $ownerWechatId 微信ID，为空则统计所有数据
     * @param array $config 配置参数
     *   - cycle_days: 统计周期（天），默认180
     *   - weight_R: R维度权重，默认0.4
     *   - weight_F: F维度权重，默认0.3
     *   - weight_M: M维度权重，默认0.3
     *   - abnormal_money_ratio: 异常金额阈值倍数，默认3.0
     *   - score_scale: 评分分制（5或100），默认5
     *   - missing_strategy: 缺失值处理策略（'score_1'或'exclude'），默认'score_1'
     * @return array
     */
    public function calculateRfmFromTrafficOrder($identifier = null, $ownerWechatId = null, $config = [])
    {
        try {
            // 合并配置参数
            $cycleDays = isset($config['cycle_days']) ? (int)$config['cycle_days'] : self::DEFAULT_CYCLE_DAYS;
            $weightR = isset($config['weight_R']) ? (float)$config['weight_R'] : self::DEFAULT_WEIGHT_R;
            $weightF = isset($config['weight_F']) ? (float)$config['weight_F'] : self::DEFAULT_WEIGHT_F;
            $weightM = isset($config['weight_M']) ? (float)$config['weight_M'] : self::DEFAULT_WEIGHT_M;
            $abnormalMoneyRatio = isset($config['abnormal_money_ratio']) ? (float)$config['abnormal_money_ratio'] : self::DEFAULT_ABNORMAL_MONEY_RATIO;
            $scoreScale = isset($config['score_scale']) ? (int)$config['score_scale'] : self::DEFAULT_SCORE_SCALE;
            $missingStrategy = isset($config['missing_strategy']) ? $config['missing_strategy'] : 'score_1';

            // 权重归一化处理
            $weightSum = $weightR + $weightF + $weightM;
            if ($weightSum != 1.0) {
                $weightR = $weightR / $weightSum;
                $weightF = $weightF / $weightSum;
                $weightM = $weightM / $weightSum;
            }

            // 计算时间范围
            $endTime = time(); // 统计截止时间（当前时间）
            $startTime = $endTime - ($cycleDays * 24 * 3600); // 统计起始时间

            // 构建查询条件
            $where = [
                ['isDel', '=', 0],
                ['createTime', '>=', $startTime],
                ['createTime', '<', $endTime],
            ];

            // identifier 条件
            if (!empty($identifier)) {
                $where[] = ['identifier', '=', $identifier];
            }

            // ownerWechatId 条件
            if (!empty($ownerWechatId)) {
                $where[] = ['ownerWechatId', '=', $ownerWechatId];
            }

            // 1. 数据过滤和聚合 - 获取每个客户的R、F、M原始值
            $orderModel = new TrafficOrderModel();
            $customers = $orderModel
                ->where($where)
                ->where(function ($query) {
                    // 只统计有效订单（actualPay大于0）
                    $query->where('actualPay', '>', 0);
                })
                ->field('identifier, MAX(createTime) as lastOrderTime, COUNT(DISTINCT id) as orderCount, SUM(CAST(actualPay AS DECIMAL(18,2))) as totalAmount')
                ->group('identifier')
                ->select();

            if (empty($customers)) {
                return [
                    'code' => 200,
                    'msg' => '暂无数据',
                    'data' => []
                ];
            }

            // 2. 计算每个客户的R值（最近消费天数）
            $customerData = [];
            foreach ($customers as $customer) {
                $recencyDays = floor(($endTime - $customer['lastOrderTime']) / (24 * 3600));
                $customerData[] = [
                    'identifier' => $customer['identifier'],
                    'R' => $recencyDays,
                    'F' => (int)$customer['orderCount'],
                    'M' => (float)$customer['totalAmount'],
                ];
            }

            // 3. 异常值处理 - 剔除大额异常订单
            $mValues = array_column($customerData, 'M');
            if (!empty($mValues)) {
                sort($mValues);
                $m99Percentile = $this->percentile($mValues, 0.99);
                $abnormalThreshold = $m99Percentile * $abnormalMoneyRatio;

                // 标记异常客户（但不删除，仅在计算M维度区间时考虑）
                foreach ($customerData as &$customer) {
                    $customer['isAbnormal'] = $customer['M'] > $abnormalThreshold;
                }
            }

            // 4. 使用五分位法计算各维度的区间阈值
            $rThresholds = $this->calculatePercentiles(array_column($customerData, 'R'), true); // R是反向的
            $fThresholds = $this->calculatePercentiles(array_column($customerData, 'F'), false);
            // M维度排除异常值计算区间
            $mValuesForPercentile = array_filter(array_column($customerData, 'M'), function($m) use ($abnormalThreshold) {
                return isset($abnormalThreshold) ? $m <= $abnormalThreshold : true;
            });
            $mThresholds = $this->calculatePercentiles(array_values($mValuesForPercentile), false);

            // 5. 计算每个客户的RFM分项得分
            $results = [];
            foreach ($customerData as $customer) {
                $rScore = $this->scoreByPercentile($customer['R'], $rThresholds, true); // R是反向的
                $fScore = $this->scoreByPercentile($customer['F'], $fThresholds, false);
                $mScore = $customer['isAbnormal'] ? 5 : $this->scoreByPercentile($customer['M'], $mThresholds, false); // 异常值给最高分

                // 计算RFM总分（加权求和）
                $rfmScore = $rScore * $weightR + $fScore * $weightF + $mScore * $weightM;

                // 可选：标准化为1-100分
                $standardScore = null;
                if ($scoreScale == 100) {
                    $rfmMin = $weightR * 1 + $weightF * 1 + $weightM * 1;
                    $rfmMax = $weightR * 5 + $weightF * 5 + $weightM * 5;
                    $standardScore = (int)round(($rfmScore - $rfmMin) / ($rfmMax - $rfmMin) * 99 + 1);
                }

                $results[] = [
                    'identifier' => $customer['identifier'],
                    'R_raw' => $customer['R'],
                    'R_score' => $rScore,
                    'F_raw' => $customer['F'],
                    'F_score' => $fScore,
                    'M_raw' => round($customer['M'], 2),
                    'M_score' => $mScore,
                    'RFM_score' => round($rfmScore, 2),
                    'RFM_standard_score' => $standardScore,
                    'cycle_start' => date('Y-m-d H:i:s', $startTime),
                    'cycle_end' => date('Y-m-d H:i:s', $endTime),
                    'calculate_time' => date('Y-m-d H:i:s'),
                ];
            }

            // 按RFM总分降序排序
            usort($results, function($a, $b) {
                return $b['RFM_score'] <=> $a['RFM_score'];
            });

            // 6. 更新 ck_traffic_source 和 s2_wechat_friend 表的RFM值
            $this->updateRfmToTables($results, $ownerWechatId);

            return [
                'code' => 200,
                'msg' => '计算成功',
                'data' => [
                    'results' => $results,
                    'config' => [
                        'cycle_days' => $cycleDays,
                        'weight_R' => $weightR,
                        'weight_F' => $weightF,
                        'weight_M' => $weightM,
                        'score_scale' => $scoreScale,
                    ],
                    'statistics' => [
                        'total_customers' => count($results),
                        'avg_rfm_score' => round(array_sum(array_column($results, 'RFM_score')) / count($results), 2),
                    ]
                ]
            ];

        } catch (\Exception $e) {
            return [
                'code' => 500,
                'msg' => '计算失败：' . $e->getMessage(),
                'data' => []
            ];
        }
    }

    /**
     * 计算 RFM 评分（兼容旧方法，使用固定阈值）
     * @param int|null $recencyDays 最近购买天数
     * @param int $frequency 购买次数
     * @param float $monetary 购买金额
     * @return array{R:int,F:int,M:int}
     */
    public static function calcRfmScores($recencyDays = 30, $frequency, $monetary)
    {
        $recencyDays = is_numeric($recencyDays) ? (int)$recencyDays : 9999;
        $frequency = max(0, (int)$frequency);
        $monetary = max(0, (float)$monetary);
        return [
            'R' => self::scoreR_Default($recencyDays),
            'F' => self::scoreF_Default($frequency),
            'M' => self::scoreM_Default($monetary),
        ];
    }

    /**
     * 使用固定阈值计算R得分（保留兼容性）
     */
    protected static function scoreR_Default(int $days): int
    {
        if ($days <= 30) return 5;
        if ($days <= 60) return 4;
        if ($days <= 90) return 3;
        if ($days <= 120) return 2;
        return 1;
    }

    /**
     * 使用固定阈值计算F得分（保留兼容性）
     */
    protected static function scoreF_Default(int $times): int
    {
        if ($times >= 10) return 5;
        if ($times >= 6) return 4;
        if ($times >= 3) return 3;
        if ($times >= 2) return 2;
        if ($times >= 1) return 1;
        return 0;
    }

    /**
     * 使用固定阈值计算M得分（保留兼容性）
     */
    protected static function scoreM_Default(float $amount): int
    {
        if ($amount >= 2000) return 5;
        if ($amount >= 1000) return 4;
        if ($amount >= 500) return 3;
        if ($amount >= 200) return 2;
        if ($amount > 0) return 1;
        return 0;
    }

    /**
     * 计算百分位数（五分位法）
     * @param array $values 数值数组
     * @param bool $reverse 是否反向（R维度需要反向，值越小得分越高）
     * @return array 返回[0.2, 0.4, 0.6, 0.8]分位数的阈值数组
     */
    private function calculatePercentiles($values, $reverse = false)
    {
        if (empty($values)) {
            return [0, 0, 0, 0];
        }

        // 去重并排序
        $uniqueValues = array_unique($values);
        sort($uniqueValues);

        // 如果所有值相同，强制均分5个区间
        if (count($uniqueValues) == 1) {
            $singleValue = $uniqueValues[0];
            if ($reverse) {
                return [$singleValue, $singleValue, $singleValue, $singleValue];
            } else {
                return [$singleValue, $singleValue, $singleValue, $singleValue];
            }
        }

        $percentiles = [0.2, 0.4, 0.6, 0.8];
        $thresholds = [];

        foreach ($percentiles as $p) {
            $thresholds[] = $this->percentile($uniqueValues, $p);
        }

        return $thresholds;
    }

    /**
     * 计算百分位数
     * @param array $sortedArray 已排序的数组
     * @param float $percentile 百分位数（0-1之间）
     * @return float
     */
    private function percentile($sortedArray, $percentile)
    {
        if (empty($sortedArray)) {
            return 0;
        }

        $count = count($sortedArray);
        $index = ($count - 1) * $percentile;
        $floor = floor($index);
        $ceil = ceil($index);

        if ($floor == $ceil) {
            return $sortedArray[(int)$index];
        }

        $weight = $index - $floor;
        return $sortedArray[(int)$floor] * (1 - $weight) + $sortedArray[(int)$ceil] * $weight;
    }

    /**
     * 根据五分位法阈值计算得分
     * @param float $value 当前值
     * @param array $thresholds 阈值数组[T1, T2, T3, T4]
     * @param bool $reverse 是否反向（R维度反向：值越小得分越高）
     * @return int 得分1-5
     */
    private function scoreByPercentile($value, $thresholds, $reverse = false)
    {
        if (empty($thresholds) || count($thresholds) < 4) {
            return 1;
        }

        list($t1, $t2, $t3, $t4) = $thresholds;

        if ($reverse) {
            // R维度：值越小得分越高
            if ($value <= $t1) return 5;
            if ($value <= $t2) return 4;
            if ($value <= $t3) return 3;
            if ($value <= $t4) return 2;
            return 1;
        } else {
            // F和M维度：值越大得分越高
            if ($value >= $t4) return 5;
            if ($value >= $t3) return 4;
            if ($value >= $t2) return 3;
            if ($value >= $t1) return 2;
            return 1;
        }
    }

    /**
     * 更新RFM值到 ck_traffic_source 和 s2_wechat_friend 表
     * 
     * @param array $results RFM计算结果数组
     * @param string|null $ownerWechatId 微信ID，用于过滤更新范围
     */
    private function updateRfmToTables($results, $ownerWechatId = null)
    {
        try {
            foreach ($results as $result) {
                $identifier = $result['identifier'];
                $rScore = (string)$result['R_score'];
                $fScore = (string)$result['F_score'];
                $mScore = (string)$result['M_score'];

                // 更新 ck_traffic_source 表
                // 根据 identifier 更新所有匹配的记录
                $trafficSourceUpdate = [
                    'R' => $rScore,
                    'F' => $fScore,
                    'M' => $mScore,
                    'updateTime' => time()
                ];
                TrafficSource::where('identifier', $identifier)->update($trafficSourceUpdate);

                // 更新 s2_wechat_friend 表
                // wechatId 对应 identifier
                $wechatFriendUpdate = [
                    'R' => $rScore,
                    'F' => $fScore,
                    'M' => $mScore,
                    'updateTime' => time()
                ];
                $wechatFriendWhere = ['wechatId' => $identifier];
                if (!empty($ownerWechatId)) {
                    $wechatFriendWhere['ownerWechatId'] = $ownerWechatId;
                }
                WechatFriendModel::where($wechatFriendWhere)->update($wechatFriendUpdate);
            }

        } catch (\Exception $e) {
            // 记录错误但不影响主流程
            \think\Log::error('更新RFM值失败：' . $e->getMessage());
        }
    }
}


