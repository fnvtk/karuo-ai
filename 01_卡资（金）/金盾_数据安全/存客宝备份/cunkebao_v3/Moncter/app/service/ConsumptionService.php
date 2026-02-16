<?php

namespace app\service;

use app\repository\ConsumptionRecordRepository;
use app\repository\UserProfileRepository;
use app\service\TagService;
use app\service\IdentifierService;
use app\utils\QueueService;
use app\utils\LoggerHelper;
use Ramsey\Uuid\Uuid as UuidGenerator;

/**
 * 消费记录服务
 *
 * 职责：
 * - 校验基础入参
 * - 根据手机号/身份证解析用户ID（person_id）
 * - 写入消费记录集合
 * - 更新用户在 user_profile 中的基础统计信息
 */
class ConsumptionService
{
    public function __construct(
        protected ConsumptionRecordRepository $consumptionRecordRepository,
        protected UserProfileRepository $userProfileRepository,
        protected IdentifierService $identifierService,
        protected ?TagService $tagService = null
    ) {
    }

    /**
     * 创建一条消费记录并更新用户统计信息
     *
     * 支持两种方式指定用户：
     * 1. 直接提供 user_id
     * 2. 提供 phone_number 或 id_card（或两者），系统自动解析用户ID
     *
     * @param array<string, mixed> $payload
     * @return array<string, mixed>|null 如果手机号和身份证号都为空，返回null（跳过该记录）
     */
    public function createRecord(array $payload): ?array
    {
        // 基础必填字段校验
        foreach (['amount', 'actual_amount', 'store_id', 'consume_time'] as $field) {
            if (!isset($payload[$field]) || $payload[$field] === '') {
                throw new \InvalidArgumentException("缺少必填字段：{$field}");
            }
        }

        $amount      = (float)$payload['amount'];
        $actual      = (float)$payload['actual_amount'];
        $storeId     = (string)$payload['store_id'];
        $consumeTime = new \DateTimeImmutable((string)$payload['consume_time']);

        // 解析用户ID：优先使用user_id，如果没有则通过手机号/身份证解析
        $userId = null;
        if (!empty($payload['user_id'])) {
            $userId = (string)$payload['user_id'];
        } else {
            // 通过手机号或身份证解析用户ID
            $phoneNumber = trim($payload['phone_number'] ?? '');
            $idCard = trim($payload['id_card'] ?? '');
            
            // 如果手机号和身份证号都为空，直接跳过该记录
            if (empty($phoneNumber) && empty($idCard)) {
                LoggerHelper::logBusiness('consumption_record_skipped_no_identifier', [
                    'reason' => 'phone_number and id_card are both empty',
                    'consume_time' => $consumeTime->format('Y-m-d H:i:s'),
                ]);
                return null;
            }
            
            // 传入 consume_time 作为查询时间点
            $userId = $this->identifierService->resolvePersonId($phoneNumber, $idCard, $consumeTime);
            
            // 如果同时提供了手机号和身份证，检查是否需要合并
            if (!empty($phoneNumber) && !empty($idCard)) {
                $userId = $this->handleMergeIfNeeded($phoneNumber, $idCard, $userId, $consumeTime);
            }
        }

        $now      = new \DateTimeImmutable('now');
        $recordId = UuidGenerator::uuid4()->toString();

        // 写入消费记录
        $record = new ConsumptionRecordRepository();
        $record->record_id = $recordId;
        $record->user_id = $userId;
        $record->consume_time = $consumeTime;
        $record->amount = $amount;
        $record->actual_amount = $actual;
        $record->currency = $payload['currency'] ?? 'CNY';
        $record->store_id = $storeId;
        $record->status = 0;
        $record->create_time = $now;
        $record->save();

        // 更新用户统计信息
        $user = $this->userProfileRepository->increaseStats($userId, $actual, $consumeTime);

        // 触发标签计算（异步方式）
        $tags = [];
        $useAsync = getenv('TAG_CALCULATION_ASYNC') !== 'false'; // 默认使用异步，可通过环境变量关闭
        
        if ($useAsync) {
            // 异步方式：推送到消息队列
            try {
                $success = QueueService::pushTagCalculation([
                    'user_id' => $userId,
                    'tag_ids' => null, // null 表示计算所有 real_time 标签
                    'trigger_type' => 'consumption_record',
                    'record_id' => $recordId,
                    'timestamp' => time(),
                ]);

                if ($success) {
                    LoggerHelper::logBusiness('tag_calculation_queued', [
                        'user_id' => $userId,
                        'record_id' => $recordId,
                    ]);
                } else {
                    // 如果推送失败，降级到同步调用
                    LoggerHelper::logBusiness('tag_calculation_queue_failed_fallback', [
                        'user_id' => $userId,
                        'record_id' => $recordId,
                    ]);
                    $useAsync = false;
                }
            } catch (\Throwable $e) {
                // 如果队列服务异常，降级到同步调用
                LoggerHelper::logError($e, [
                    'component' => 'ConsumptionService',
                    'action' => 'pushTagCalculation',
                    'user_id' => $userId,
                ]);
                $useAsync = false;
            }
        }

        // 同步方式（降级方案或配置关闭异步时使用）
        if (!$useAsync && $this->tagService) {
            try {
                $tags = $this->tagService->calculateTags($userId);
            } catch (\Throwable $e) {
                // 标签计算失败不影响消费记录写入，只记录错误
                LoggerHelper::logError($e, [
                    'component' => 'ConsumptionService',
                    'action' => 'calculateTags',
                    'user_id' => $userId,
                ]);
            }
        }

        return [
            'record_id' => $recordId,
            'user_id'   => $userId,
            'user'      => [
                'total_amount'      => $user->total_amount ?? 0,
                'total_count'       => $user->total_count ?? 0,
                'last_consume_time' => $user->last_consume_time,
            ],
            'tags' => $tags, // 异步模式下为空数组，同步模式下包含标签信息
            'tag_calculation_mode' => $useAsync ? 'async' : 'sync',
        ];
    }

    /**
     * 当手机号和身份证号同时出现时，检查是否需要合并用户
     *
     * @param string $phoneNumber 手机号
     * @param string $idCard 身份证号
     * @param string $currentUserId 当前解析出的用户ID
     * @param \DateTimeInterface $consumeTime 消费时间
     * @return string 最终使用的用户ID
     */
    private function handleMergeIfNeeded(
        string $phoneNumber,
        string $idCard,
        string $currentUserId,
        \DateTimeInterface $consumeTime
    ): string {
        // 通过身份证查找用户
        $userIdByIdCard = $this->identifierService->resolvePersonIdByIdCard($idCard);
        
        // 在消费时间点查询手机号关联（使用反射或公共方法）
        $userPhoneService = new \app\service\UserPhoneService(
            new \app\repository\UserPhoneRelationRepository()
        );
        $userIdByPhone = $userPhoneService->findUserByPhone($phoneNumber, $consumeTime);
        
        // 如果身份证找到用户A，手机号关联到用户B，且A≠B
        if ($userIdByIdCard && $userIdByPhone && $userIdByIdCard !== $userIdByPhone) {
            // 检查用户B是否为临时用户
            $userB = $this->userProfileRepository->findByUserId($userIdByPhone);
            $userA = $this->userProfileRepository->findByUserId($userIdByIdCard);
            
            if ($userB && $userB->is_temporary) {
                // 情况1：用户B是临时用户 → 合并到正式用户A
                // 需要合并服务，动态创建
                $tagService = $this->tagService ?? new TagService(
                    new \app\repository\TagDefinitionRepository(),
                    $this->userProfileRepository,
                    new \app\repository\UserTagRepository(),
                    new \app\repository\TagHistoryRepository(),
                    new \app\service\TagRuleEngine\SimpleRuleEngine()
                );
                
                $mergeService = new PersonMergeService(
                    $this->userProfileRepository,
                    new \app\repository\UserTagRepository(),
                    $userPhoneService,
                    $tagService
                );
                
                // 合并临时用户B到正式用户A
                $mergeService->mergeUsers($userIdByPhone, $userIdByIdCard);
                
                // 将旧的手机关联标记为过期（使用消费时间作为过期时间）
                $userPhoneService->removePhoneFromUser($userIdByPhone, $phoneNumber, $consumeTime);
                
                // 建立新的手机关联到用户A（使用消费时间作为生效时间）
                $userPhoneService->addPhoneToUser($userIdByIdCard, $phoneNumber, [
                    'source' => 'merge_after_id_card_binding',
                    'effective_time' => $consumeTime,
                    'type' => 'personal',
                ]);
                
                LoggerHelper::logBusiness('auto_merge_triggered', [
                    'phone_number' => $phoneNumber,
                    'source_user_id' => $userIdByPhone,
                    'target_user_id' => $userIdByIdCard,
                    'consume_time' => $consumeTime->format('Y-m-d H:i:s'),
                    'reason' => 'temporary_user_merge',
                ]);
                
                return $userIdByIdCard;
            } elseif ($userA && !$userA->is_temporary && $userB && !$userB->is_temporary) {
                // 情况2：两者都是正式用户（如酒店预订代订场景）
                // 策略：以身份证为准，消费记录归属到身份证用户，但手机号关联保持不变
                // 原因：手机号和身份证同时出现时，身份证更可信；但手机号可能是代订，不应自动转移
                
                // 检查手机号在消费时间点是否已经关联到用户A（可能之前已经转移过）
                $phoneRelationAtTime = $userPhoneService->findUserByPhone($phoneNumber, $consumeTime);
                
                if ($phoneRelationAtTime !== $userIdByIdCard) {
                    // 手机号在消费时间点还未关联到身份证用户
                    // 记录异常情况，但不强制转移手机号（可能是代订场景）
                    LoggerHelper::logBusiness('phone_id_card_mismatch_formal_users', [
                        'phone_number' => $phoneNumber,
                        'phone_user_id' => $userIdByPhone,
                        'id_card_user_id' => $userIdByIdCard,
                        'consume_time' => $consumeTime->format('Y-m-d H:i:s'),
                        'decision' => 'use_id_card_user',
                        'note' => '正式用户冲突，以身份证为准（可能是代订场景）',
                    ]);
                }
                
                // 以身份证用户为准，返回身份证用户ID
                return $userIdByIdCard;
            } else {
                // 其他情况（理论上不应该发生），记录日志并返回身份证用户
                LoggerHelper::logBusiness('phone_id_card_mismatch_unknown', [
                    'phone_number' => $phoneNumber,
                    'phone_user_id' => $userIdByPhone,
                    'id_card_user_id' => $userIdByIdCard,
                    'phone_user_is_temporary' => $userB ? $userB->is_temporary : 'unknown',
                    'id_card_user_is_temporary' => $userA ? $userA->is_temporary : 'unknown',
                    'consume_time' => $consumeTime->format('Y-m-d H:i:s'),
                ]);
                
                // 默认返回身份证用户（更可信）
                return $userIdByIdCard;
            }
        }
        
        return $currentUserId;
    }

}


