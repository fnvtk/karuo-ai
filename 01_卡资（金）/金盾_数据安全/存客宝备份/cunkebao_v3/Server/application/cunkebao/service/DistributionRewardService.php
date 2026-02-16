<?php

namespace app\cunkebao\service;

use think\Db;
use think\Exception;

/**
 * 分销奖励服务类
 * 处理获客和添加好友时的分销收益记录
 */
class DistributionRewardService
{
    /**
     * 记录获客奖励
     *
     * @param int $taskId 获客计划ID
     * @param int $customerId 客户ID（task_customer表的id）
     * @param string $phone 客户手机号
     * @param int|null $channelId 渠道ID（分销渠道ID，对应distribution_channel.id）。为空时按配置的所有渠道分配
     * @return bool
     */
    public static function recordCustomerReward($taskId, $customerId, $phone, $channelId = null)
    {
        try {
            // 获取获客计划信息
            $task = Db::name('customer_acquisition_task')
                ->where('id', $taskId)
                ->find();

            if (!$task) {
                return false;
            }

            // 解析分销配置
            $sceneConf = json_decode($task['sceneConf'], true) ?: [];
            $distributionConfig = $sceneConf['distribution'] ?? null;

            // 检查是否开启分销
            if (empty($distributionConfig) || empty($distributionConfig['enabled'])) {
                return false;
            }

            // 检查是否有获客奖励
            $rewardAmount = intval($distributionConfig['customerRewardAmount'] ?? 0);
            if ($rewardAmount <= 0) {
                return false;
            }

            // 获取渠道列表（从分销配置中获取允许分佣的渠道）
            $channelIds = $distributionConfig['channels'] ?? [];
            if (empty($channelIds) || !is_array($channelIds)) {
                return false;
            }

            $companyId = $task['companyId'];
            $sceneId = $task['sceneId'];

            // 获取场景名称（用于展示来源类型）
            $scene = Db::name('plan_scene')
                ->where('id', $sceneId)
                ->field('name')
                ->find();
            $sceneName = $scene['name'] ?? '未知场景';

            // 如果指定了 channelId（cid），仅允许该渠道获得分佣
            if (!empty($channelId)) {
                // 必须在配置的渠道列表中，且是有效ID
                if (!in_array($channelId, $channelIds)) {
                    // 该渠道不在本计划允许分佣的渠道列表中，直接返回
                    return false;
                }
                $channelIds = [$channelId];
            }

            // 开始事务
            Db::startTrans();
            try {
                // 为每个渠道记录收益并更新可提现金额
                foreach ($channelIds as $channelId) {
                    // 验证渠道是否存在
                    $channel = Db::name('distribution_channel')
                        ->where([
                            ['id', '=', $channelId],
                            ['companyId', '=', $companyId],
                            ['status', '=', 'enabled'],
                            ['deleteTime', '=', 0]
                        ])
                        ->find();

                    if (!$channel) {
                        continue; // 跳过不存在的渠道
                    }

                    // 记录收益明细
                    Db::name('distribution_revenue_record')->insert([
                        'companyId' => $companyId,
                        'channelId' => $channelId,
                        'channelCode' => $channel['code'],
                        'type' => 'customer_acquisition', // 获客类型
                        'sourceType' => $sceneName,
                        'sourceId' => $taskId, // 活动ID（获客任务ID）
                        'amount' => $rewardAmount, // 金额（分）
                        'remark' => '获客奖励：' . $phone,
                        'createTime' => time(),
                        'updateTime' => time(),
                    ]);

                    // 更新渠道可提现金额
                    Db::name('distribution_channel')
                        ->where('id', $channelId)
                        ->setInc('withdrawableAmount', $rewardAmount);

                    // 更新渠道获客统计
                    Db::name('distribution_channel')
                        ->where('id', $channelId)
                        ->setInc('totalCustomers', 1);

                    // 更新今日获客统计（如果是今天）
                    $todayStart = strtotime(date('Y-m-d 00:00:00'));
                    $todayEnd = strtotime(date('Y-m-d 23:59:59'));
                    $createTime = time();
                    if ($createTime >= $todayStart && $createTime <= $todayEnd) {
                        Db::name('distribution_channel')
                            ->where('id', $channelId)
                            ->setInc('todayCustomers', 1);
                    }
                }

                Db::commit();
                return true;

            } catch (Exception $e) {
                Db::rollback();
                throw $e;
            }

        } catch (Exception $e) {
            // 记录错误日志，但不影响主流程
            \think\Log::error('记录获客奖励失败：' . $e->getMessage());
            return false;
        }
    }

    /**
     * 记录添加好友奖励
     *
     * @param int $taskId 获客计划ID
     * @param int $customerId 客户ID（task_customer表的id）
     * @param string $phone 客户手机号
     * @param int|null $channelId 渠道ID（分销渠道ID，对应distribution_channel.id）。为空时按配置的所有渠道分配
     * @return bool
     */
    public static function recordAddFriendReward($taskId, $customerId, $phone, $channelId = null)
    {
        try {
            // 获取获客计划信息
            $task = Db::name('customer_acquisition_task')
                ->where('id', $taskId)
                ->find();

            if (!$task) {
                return false;
            }

            // 解析分销配置
            $sceneConf = json_decode($task['sceneConf'], true) ?: [];
            $distributionConfig = $sceneConf['distribution'] ?? null;

            // 检查是否开启分销
            if (empty($distributionConfig) || empty($distributionConfig['enabled'])) {
                return false;
            }

            // 检查是否有添加奖励
            $rewardAmount = intval($distributionConfig['addFriendRewardAmount'] ?? 0);
            if ($rewardAmount <= 0) {
                return false;
            }

            // 获取渠道列表（从分销配置中获取允许分佣的渠道）
            $channelIds = $distributionConfig['channels'] ?? [];
            if (empty($channelIds) || !is_array($channelIds)) {
                return false;
            }

            $companyId = $task['companyId'];
            $sceneId = $task['sceneId'];

            // 获取场景名称（用于展示来源类型）
            $scene = Db::name('plan_scene')
                ->where('id', $sceneId)
                ->field('name')
                ->find();
            $sceneName = $scene['name'] ?? '未知场景';

            // 如果指定了 channelId（cid），仅允许该渠道获得分佣
            if (!empty($channelId)) {
                // 必须在配置的渠道列表中，且是有效ID
                if (!in_array($channelId, $channelIds)) {
                    // 该渠道不在本计划允许分佣的渠道列表中，直接返回
                    return false;
                }
                $channelIds = [$channelId];
            }

            // 开始事务
            Db::startTrans();
            try {
                // 为每个渠道记录收益并更新可提现金额
                foreach ($channelIds as $channelId) {
                    // 验证渠道是否存在
                    $channel = Db::name('distribution_channel')
                        ->where([
                            ['id', '=', $channelId],
                            ['companyId', '=', $companyId],
                            ['status', '=', 'enabled'],
                            ['deleteTime', '=', 0]
                        ])
                        ->find();

                    if (!$channel) {
                        continue; // 跳过不存在的渠道
                    }

                    // 记录收益明细
                    Db::name('distribution_revenue_record')->insert([
                        'companyId' => $companyId,
                        'channelId' => $channelId,
                        'channelCode' => $channel['code'],
                        'type' => 'add_friend', // 添加好友类型
                        'sourceType' => $sceneName,
                        'sourceId' => $taskId, // 活动ID（获客任务ID）
                        'amount' => $rewardAmount, // 金额（分）
                        'remark' => '添加好友奖励：' . $phone,
                        'createTime' => time(),
                        'updateTime' => time(),
                    ]);

                    // 更新渠道可提现金额
                    Db::name('distribution_channel')
                        ->where('id', $channelId)
                        ->setInc('withdrawableAmount', $rewardAmount);

                    // 更新渠道好友统计
                    Db::name('distribution_channel')
                        ->where('id', $channelId)
                        ->setInc('totalFriends', 1);

                    // 更新今日好友统计（如果是今天）
                    $todayStart = strtotime(date('Y-m-d 00:00:00'));
                    $todayEnd = strtotime(date('Y-m-d 23:59:59'));
                    $createTime = time();
                    if ($createTime >= $todayStart && $createTime <= $todayEnd) {
                        Db::name('distribution_channel')
                            ->where('id', $channelId)
                            ->setInc('todayFriends', 1);
                    }
                }

                Db::commit();
                return true;

            } catch (Exception $e) {
                Db::rollback();
                throw $e;
            }

        } catch (Exception $e) {
            // 记录错误日志，但不影响主流程
            \think\Log::error('记录添加好友奖励失败：' . $e->getMessage());
            return false;
        }
    }
}

