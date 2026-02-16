<?php

namespace app\service;

use app\repository\ConsumptionRecordRepository;
use app\repository\UserProfileRepository;
use app\utils\QueueService;
use app\utils\LoggerHelper;
use Ramsey\Uuid\Uuid;

/**
 * 数据同步服务
 * 
 * 职责：
 * - 消费消息队列中的数据同步消息
 * - 批量写入 MongoDB（consumption_records）
 * - 更新用户统计（user_profile）
 * - 触发标签计算（推送消息到标签计算队列）
 */
class DataSyncService
{
    public function __construct(
        protected ConsumptionRecordRepository $consumptionRecordRepository,
        protected UserProfileRepository $userProfileRepository
    ) {
    }

    /**
     * 同步数据到 MongoDB
     * 
     * @param array<string, mixed> $messageData 消息数据（包含 source_id、data 等）
     * @return array<string, mixed> 同步结果
     */
    public function syncData(array $messageData): array
    {
        $sourceId = $messageData['source_id'] ?? 'unknown';
        $data = $messageData['data'] ?? [];
        $count = count($data);

        if (empty($data)) {
            LoggerHelper::logBusiness('data_sync_empty', [
                'source_id' => $sourceId,
            ]);
            return [
                'success' => true,
                'synced_count' => 0,
                'skipped_count' => 0,
            ];
        }

        LoggerHelper::logBusiness('data_sync_service_started', [
            'source_id' => $sourceId,
            'data_count' => $count,
        ]);

        $syncedCount = 0;
        $skippedCount = 0;
        $userIds = [];

        // 批量写入消费记录
        foreach ($data as $record) {
            try {
                // 数据验证
                if (!$this->validateRecord($record)) {
                    $skippedCount++;
                    continue;
                }

                // 确保有 record_id
                if (empty($record['record_id'])) {
                    $record['record_id'] = (string)Uuid::uuid4();
                }

                // 写入消费记录（使用 Eloquent Model 方式）
                $consumptionRecord = new ConsumptionRecordRepository();
                $consumptionRecord->record_id = $record['record_id'] ?? (string)Uuid::uuid4();
                $consumptionRecord->user_id = $record['user_id'];
                $consumptionRecord->consume_time = new \DateTimeImmutable($record['consume_time']);
                $consumptionRecord->amount = (float)($record['amount'] ?? 0);
                $consumptionRecord->actual_amount = (float)($record['actual_amount'] ?? $record['amount'] ?? 0);
                $consumptionRecord->currency = $record['currency'] ?? 'CNY';
                $consumptionRecord->store_id = $record['store_id'] ?? '';
                $consumptionRecord->status = $record['status'] ?? 0;
                $consumptionRecord->create_time = new \DateTimeImmutable('now');
                $consumptionRecord->save();
                $syncedCount++;

                // 收集用户ID（用于后续批量更新统计）
                $userId = $record['user_id'] ?? null;
                if ($userId) {
                    $userIds[] = $userId;
                }
            } catch (\Throwable $e) {
                LoggerHelper::logError($e, [
                    'component' => 'DataSyncService',
                    'action' => 'syncData',
                    'source_id' => $sourceId,
                    'record' => $record,
                ]);
                $skippedCount++;
            }
        }

        // 批量更新用户统计（去重）
        $uniqueUserIds = array_unique($userIds);
        foreach ($uniqueUserIds as $userId) {
            try {
                $this->updateUserStatistics($userId);
            } catch (\Throwable $e) {
                LoggerHelper::logError($e, [
                    'component' => 'DataSyncService',
                    'action' => 'updateUserStatistics',
                    'user_id' => $userId,
                ]);
            }
        }

        // 触发标签计算（为每个用户推送消息）
        $tagCalculationCount = 0;
        foreach ($uniqueUserIds as $userId) {
            try {
                $message = [
                    'user_id' => $userId,
                    'tag_ids' => null, // null 表示计算所有 real_time 标签
                    'trigger_type' => 'data_sync',
                    'source_id' => $sourceId,
                    'timestamp' => time(),
                ];

                if (QueueService::pushTagCalculation($message)) {
                    $tagCalculationCount++;
                }
            } catch (\Throwable $e) {
                LoggerHelper::logError($e, [
                    'component' => 'DataSyncService',
                    'action' => 'triggerTagCalculation',
                    'user_id' => $userId,
                ]);
            }
        }

        $result = [
            'success' => true,
            'synced_count' => $syncedCount,
            'skipped_count' => $skippedCount,
            'user_count' => count($uniqueUserIds),
            'tag_calculation_triggered' => $tagCalculationCount,
        ];

        LoggerHelper::logBusiness('data_sync_service_completed', array_merge([
            'source_id' => $sourceId,
        ], $result));

        return $result;
    }

    /**
     * 验证记录
     * 
     * @param array<string, mixed> $record 记录数据
     * @return bool 是否通过验证
     */
    private function validateRecord(array $record): bool
    {
        // 必填字段验证
        $requiredFields = ['user_id', 'amount', 'consume_time'];
        foreach ($requiredFields as $field) {
            if (!isset($record[$field]) || $record[$field] === null || $record[$field] === '') {
                return false;
            }
        }

        // 金额验证
        $amount = (float)($record['amount'] ?? 0);
        if ($amount <= 0) {
            return false;
        }

        // 时间格式验证
        $consumeTime = $record['consume_time'] ?? '';
        if (strtotime($consumeTime) === false) {
            return false;
        }

        return true;
    }

    /**
     * 更新用户统计
     * 
     * @param string $userId 用户ID
     * @return void
     */
    private function updateUserStatistics(string $userId): void
    {
        // 获取用户的所有消费记录（用于重新计算统计）
        // 这里简化处理，只更新最近的数据
        // 实际场景中，可以增量更新或全量重新计算

        // 查询用户最近的消费记录（使用 Eloquent 查询）
        $records = ConsumptionRecordRepository::where('user_id', $userId)
            ->orderBy('consume_time', 'desc')
            ->limit(1000)
            ->get()
            ->toArray();

        if (empty($records)) {
            return;
        }

        // 计算统计值
        $totalAmount = 0;
        $totalCount = count($records);
        $lastConsumeTime = null;

        foreach ($records as $record) {
            $amount = (float)($record['amount'] ?? 0);
            $totalAmount += $amount;

            $consumeTime = $record['consume_time'] ?? null;
            if ($consumeTime) {
                $time = strtotime($consumeTime);
                if ($time && ($lastConsumeTime === null || $time > $lastConsumeTime)) {
                    $lastConsumeTime = $time;
                }
            }
        }

        // 更新用户档案（使用 increaseStats 方法，但这里需要全量更新）
        // 简化处理：直接更新统计字段
        $user = $this->userProfileRepository->findByUserId($userId);
        if ($user) {
            $user->total_amount = $totalAmount;
            $user->total_count = $totalCount;
            if ($lastConsumeTime) {
                $user->last_consume_time = new \DateTimeImmutable('@' . $lastConsumeTime);
            }
            $user->save();
        }
    }
}

