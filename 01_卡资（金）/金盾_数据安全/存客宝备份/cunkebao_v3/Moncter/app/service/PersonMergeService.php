<?php

namespace app\service;

use app\repository\UserProfileRepository;
use app\repository\UserTagRepository;
use app\repository\UserPhoneRelationRepository;
use app\repository\ConsumptionRecordRepository;
use app\service\TagService;
use app\service\UserPhoneService;
use app\utils\QueueService;
use app\utils\LoggerHelper;

/**
 * 身份合并服务
 *
 * 职责：
 * - 合并临时人到正式人
 * - 合并多个用户到同一人（基于身份证）
 * - 合并标签、统计数据、手机号关联等
 */
class PersonMergeService
{
    public function __construct(
        protected UserProfileRepository $userProfileRepository,
        protected UserTagRepository $userTagRepository,
        protected UserPhoneService $userPhoneService,
        protected TagService $tagService
    ) {
    }

    /**
     * 合并临时人到正式人
     *
     * 场景：手机号发现了对应的身份证号
     *
     * @param string $tempUserId 临时人user_id
     * @param string $idCard 身份证号
     * @return string 正式人的user_id
     * @throws \InvalidArgumentException
     */
    public function mergeTemporaryToFormal(string $tempUserId, string $idCard): string
    {
        $tempUser = $this->userProfileRepository->findByUserId($tempUserId);
        if (!$tempUser) {
            throw new \InvalidArgumentException("临时人不存在: {$tempUserId}");
        }

        if (!$tempUser->is_temporary) {
            throw new \InvalidArgumentException("用户不是临时人: {$tempUserId}");
        }

        $idCardHash = \app\utils\EncryptionHelper::hash($idCard);
        
        // 查找该身份证是否已有正式人
        $formalUser = $this->userProfileRepository->findByIdCardHash($idCardHash);
        
        if ($formalUser) {
            // 情况1：身份证已存在，合并临时人到正式人
            if ($formalUser->user_id === $tempUserId) {
                // 已经是同一个人，只需标记为正式人（传入原始身份证号以提取信息）
                $this->userProfileRepository->markAsFormal($tempUserId, $idCardHash, \app\utils\EncryptionHelper::encrypt($idCard), $idCard);
                return $tempUserId;
            }
            
            // 合并到已存在的正式人
            $this->mergeUsers($tempUserId, $formalUser->user_id);
            return $formalUser->user_id;
        } else {
            // 情况2：身份证不存在，将临时人转为正式人（传入原始身份证号以提取信息）
            $this->userProfileRepository->markAsFormal($tempUserId, $idCardHash, \app\utils\EncryptionHelper::encrypt($idCard), $idCard);
            
            $tempUser->id_card_type = '身份证';
            $tempUser->save();
            
            LoggerHelper::logBusiness('temporary_person_converted_to_formal', [
                'user_id' => $tempUserId,
                'id_card_hash' => $idCardHash,
            ]);
            
            // 重新计算标签
            $this->recalculateTags($tempUserId);
            
            return $tempUserId;
        }
    }

    /**
     * 合并两个用户（将sourceUserId合并到targetUserId）
     *
     * @param string $sourceUserId 源用户ID（将被合并的用户）
     * @param string $targetUserId 目标用户ID（保留的用户）
     * @return bool 是否成功
     */
    public function mergeUsers(string $sourceUserId, string $targetUserId): bool
    {
        if ($sourceUserId === $targetUserId) {
            return true;
        }

        $sourceUser = $this->userProfileRepository->findByUserId($sourceUserId);
        $targetUser = $this->userProfileRepository->findByUserId($targetUserId);
        
        if (!$sourceUser || !$targetUser) {
            throw new \InvalidArgumentException("用户不存在: source={$sourceUserId}, target={$targetUserId}");
        }

        LoggerHelper::logBusiness('person_merge_started', [
            'source_user_id' => $sourceUserId,
            'target_user_id' => $targetUserId,
        ]);

        try {
            // 1. 合并统计数据
            $this->mergeStatistics($sourceUser, $targetUser);
            
            // 2. 合并手机号关联
            $this->mergePhoneRelations($sourceUserId, $targetUserId);
            
            // 3. 合并标签
            $this->mergeTags($sourceUserId, $targetUserId);
            
            // 4. 合并消费记录（更新user_id）
            $this->mergeConsumptionRecords($sourceUserId, $targetUserId);
            
            // 5. 记录合并历史
            $this->recordMergeHistory($sourceUserId, $targetUserId);
            
            // 6. 标记源用户为已合并
            $sourceUser->status = 1; // 标记为已删除/已合并
            $sourceUser->merged_from_user_id = $targetUserId; // 记录合并到的目标用户ID
            $sourceUser->update_time = new \DateTimeImmutable('now');
            $sourceUser->save();
            
            // 7. 更新目标用户的标签更新时间
            $targetUser->tags_update_time = new \DateTimeImmutable('now');
            $targetUser->update_time = new \DateTimeImmutable('now');
            $targetUser->save();
            
            LoggerHelper::logBusiness('person_merge_completed', [
                'source_user_id' => $sourceUserId,
                'target_user_id' => $targetUserId,
            ]);
            
            // 8. 重新计算目标用户的标签
            $this->recalculateTags($targetUserId);
            
            return true;
        } catch (\Throwable $e) {
            LoggerHelper::logError($e, [
                'component' => 'PersonMergeService',
                'action' => 'mergeUsers',
                'source_user_id' => $sourceUserId,
                'target_user_id' => $targetUserId,
            ]);
            throw $e;
        }
    }

    /**
     * 合并统计数据
     *
     * @param UserProfileRepository $sourceUser
     * @param UserProfileRepository $targetUser
     */
    private function mergeStatistics(UserProfileRepository $sourceUser, UserProfileRepository $targetUser): void
    {
        // 合并总金额和总次数
        $targetUser->total_amount = (float)($targetUser->total_amount ?? 0) + (float)($sourceUser->total_amount ?? 0);
        $targetUser->total_count = (int)($targetUser->total_count ?? 0) + (int)($sourceUser->total_count ?? 0);
        
        // 取更晚的最后消费时间
        if ($sourceUser->last_consume_time && 
            (!$targetUser->last_consume_time || $sourceUser->last_consume_time > $targetUser->last_consume_time)) {
            $targetUser->last_consume_time = $sourceUser->last_consume_time;
        }
        
        $targetUser->save();
    }

    /**
     * 合并手机号关联
     *
     * @param string $sourceUserId
     * @param string $targetUserId
     */
    private function mergePhoneRelations(string $sourceUserId, string $targetUserId): void
    {
        // 获取源用户的所有手机号
        $sourcePhones = $this->userPhoneService->getUserPhoneNumbers($sourceUserId, false);
        
        foreach ($sourcePhones as $phoneNumber) {
            try {
                // 将手机号关联到目标用户
                $this->userPhoneService->addPhoneToUser($targetUserId, $phoneNumber, [
                    'source' => 'person_merge',
                    'type' => 'personal',
                ]);
                
                // 失效源用户的手机号关联
                $this->userPhoneService->removePhoneFromUser($sourceUserId, $phoneNumber);
            } catch (\Throwable $e) {
                LoggerHelper::logError($e, [
                    'component' => 'PersonMergeService',
                    'action' => 'mergePhoneRelations',
                    'source_user_id' => $sourceUserId,
                    'target_user_id' => $targetUserId,
                    'phone_number' => $phoneNumber,
                ]);
            }
        }
    }

    /**
     * 合并标签
     *
     * 智能合并策略：
     * 1. 如果目标用户没有该标签，直接复制源用户的标签
     * 2. 如果目标用户已有该标签，根据标签类型和定义决定合并策略：
     *    - 数值型标签（number）：根据标签定义的聚合方式（sum/max/min/avg）合并
     *    - 布尔型标签（boolean）：取 OR（任一为true则为true）
     *    - 字符串型标签（string）：保留目标用户的值（不覆盖）
     *    - 枚举型标签：保留目标用户的值（不覆盖）
     * 3. 置信度取两者中的较高值
     *
     * @param string $sourceUserId
     * @param string $targetUserId
     */
    private function mergeTags(string $sourceUserId, string $targetUserId): void
    {
        $sourceTags = $this->userTagRepository->newQuery()
            ->where('user_id', $sourceUserId)
            ->get();
        
        // 获取标签定义，用于判断合并策略
        $tagDefinitionRepo = new \app\repository\TagDefinitionRepository();
        
        foreach ($sourceTags as $sourceTag) {
            // 检查目标用户是否已有该标签
            $targetTag = $this->userTagRepository->newQuery()
                ->where('user_id', $targetUserId)
                ->where('tag_id', $sourceTag->tag_id)
                ->first();
            
            if (!$targetTag) {
                // 目标用户没有该标签，复制源用户的标签
                $newTag = new UserTagRepository();
                $newTag->user_id = $targetUserId;
                $newTag->tag_id = $sourceTag->tag_id;
                $newTag->tag_value = $sourceTag->tag_value;
                $newTag->tag_value_type = $sourceTag->tag_value_type;
                $newTag->confidence = $sourceTag->confidence;
                $newTag->effective_time = $sourceTag->effective_time;
                $newTag->expire_time = $sourceTag->expire_time;
                $newTag->create_time = new \DateTimeImmutable('now');
                $newTag->update_time = new \DateTimeImmutable('now');
                $newTag->save();
            } else {
                // 目标用户已有标签，根据类型智能合并
                $mergedValue = $this->mergeTagValue(
                    $sourceTag,
                    $targetTag,
                    $tagDefinitionRepo->newQuery()->where('tag_id', $sourceTag->tag_id)->first()
                );
                
                if ($mergedValue !== null) {
                    $targetTag->tag_value = $mergedValue;
                    $targetTag->confidence = max((float)$sourceTag->confidence, (float)$targetTag->confidence);
                    $targetTag->update_time = new \DateTimeImmutable('now');
                    $targetTag->save();
                }
            }
        }
        
        // 删除源用户的标签
        $this->userTagRepository->newQuery()
            ->where('user_id', $sourceUserId)
            ->delete();
    }

    /**
     * 合并标签值
     *
     * @param UserTagRepository $sourceTag 源标签
     * @param UserTagRepository $targetTag 目标标签
     * @param \app\repository\TagDefinitionRepository|null $tagDef 标签定义（可选）
     * @return string|null 合并后的标签值，如果不需要更新返回null
     */
    private function mergeTagValue(
        UserTagRepository $sourceTag,
        UserTagRepository $targetTag,
        ?\app\repository\TagDefinitionRepository $tagDef = null
    ): ?string {
        $sourceValue = $sourceTag->tag_value;
        $targetValue = $targetTag->tag_value;
        $sourceType = $sourceTag->tag_value_type;
        $targetType = $targetTag->tag_value_type;
        
        // 如果类型不一致，保留目标值
        if ($sourceType !== $targetType) {
            return null;
        }
        
        // 根据类型合并
        switch ($targetType) {
            case 'number':
                // 数值型：根据标签定义的聚合方式合并
                $aggregation = null;
                if ($tagDef && isset($tagDef->rule_config)) {
                    $ruleConfig = is_string($tagDef->rule_config) 
                        ? json_decode($tagDef->rule_config, true) 
                        : $tagDef->rule_config;
                    $aggregation = $ruleConfig['aggregation'] ?? 'sum';
                } else {
                    $aggregation = 'sum'; // 默认累加
                }
                
                $sourceNum = (float)$sourceValue;
                $targetNum = (float)$targetValue;
                
                return match($aggregation) {
                    'sum' => (string)($sourceNum + $targetNum),
                    'max' => (string)max($sourceNum, $targetNum),
                    'min' => (string)min($sourceNum, $targetNum),
                    'avg' => (string)(($sourceNum + $targetNum) / 2),
                    default => (string)($sourceNum + $targetNum), // 默认累加
                };
                
            case 'boolean':
                // 布尔型：取 OR（任一为true则为true）
                $sourceBool = $sourceValue === 'true' || $sourceValue === '1';
                $targetBool = $targetValue === 'true' || $targetValue === '1';
                return ($sourceBool || $targetBool) ? 'true' : 'false';
                
            case 'string':
            case 'json':
            default:
                // 字符串型、JSON型等：保留目标值（不覆盖）
                return null;
        }
    }

    /**
     * 合并消费记录
     *
     * @param string $sourceUserId
     * @param string $targetUserId
     */
    private function mergeConsumptionRecords(string $sourceUserId, string $targetUserId): void
    {
        // 更新消费记录的user_id
        ConsumptionRecordRepository::where('user_id', $sourceUserId)
            ->update(['user_id' => $targetUserId]);
    }

    /**
     * 重新计算用户标签
     *
     * @param string $userId
     */
    private function recalculateTags(string $userId): void
    {
        try {
            // 异步触发标签计算
            QueueService::pushTagCalculation([
                'user_id' => $userId,
                'tag_ids' => null, // 计算所有标签
                'trigger_type' => 'person_merge',
                'timestamp' => time(),
            ]);
        } catch (\Throwable $e) {
            LoggerHelper::logError($e, [
                'component' => 'PersonMergeService',
                'action' => 'recalculateTags',
                'user_id' => $userId,
            ]);
        }
    }

    /**
     * 根据手机号发现身份证后，合并相关用户
     *
     * 这是场景4的实现：如果某个手机号发现了对应的身份证号，
     * 查询该身份下是否有标签，如果有就会将对应的这个身份证号的所有标签重新计算同步。
     *
     * @param string $phoneNumber 手机号
     * @param string $idCard 身份证号
     * @return string 正式人的user_id
     */
    public function mergePhoneToIdCard(string $phoneNumber, string $idCard): string
    {
        // 1. 查找手机号对应的用户
        $phoneUserId = $this->userPhoneService->findUserByPhone($phoneNumber);
        
        // 2. 查找身份证对应的用户
        $idCardHash = \app\utils\EncryptionHelper::hash($idCard);
        $idCardUser = $this->userProfileRepository->findByIdCardHash($idCardHash);
        
        if ($idCardUser && $phoneUserId && $idCardUser->user_id === $phoneUserId) {
            // 已经是同一个人，只需确保是正式人（传入原始身份证号以提取信息）
            if ($idCardUser->is_temporary) {
                $this->userProfileRepository->markAsFormal($phoneUserId, $idCardHash, \app\utils\EncryptionHelper::encrypt($idCard), $idCard);
            }
            $this->recalculateTags($phoneUserId);
            return $phoneUserId;
        }
        
        if ($idCardUser && $phoneUserId && $idCardUser->user_id !== $phoneUserId) {
            // 身份证和手机号对应不同用户，需要合并
            $this->mergeUsers($phoneUserId, $idCardUser->user_id);
            $this->recalculateTags($idCardUser->user_id);
            return $idCardUser->user_id;
        }
        
        if ($idCardUser && !$phoneUserId) {
            // 身份证存在，但手机号未关联，建立关联
            $this->userPhoneService->addPhoneToUser($idCardUser->user_id, $phoneNumber, [
                'source' => 'id_card_discovered',
                'type' => 'personal',
            ]);
            $this->recalculateTags($idCardUser->user_id);
            return $idCardUser->user_id;
        }
        
        if (!$idCardUser && $phoneUserId) {
            // 手机号存在，但身份证不存在，将临时人转为正式人
            return $this->mergeTemporaryToFormal($phoneUserId, $idCard);
        }
        
        // 都不存在，创建正式人
        $userId = \Ramsey\Uuid\Uuid::uuid4()->toString();
        $now = new \DateTimeImmutable('now');
        
        // 从身份证号中自动提取基础信息
        $idCardInfo = \app\utils\IdCardHelper::extractInfo($idCard);
        
        $user = new UserProfileRepository();
        $user->user_id = $userId;
        $user->id_card_hash = $idCardHash;
        $user->id_card_encrypted = \app\utils\EncryptionHelper::encrypt($idCard);
        $user->id_card_type = '身份证';
        $user->is_temporary = false;
        $user->status = 0;
        $user->total_amount = 0;
        $user->total_count = 0;
        $user->birthday = $idCardInfo['birthday']; // 可能为 null
        $user->gender = $idCardInfo['gender'] > 0 ? $idCardInfo['gender'] : null; // 解析失败则为 null
        $user->create_time = $now;
        $user->update_time = $now;
        $user->save();
        
        $this->userPhoneService->addPhoneToUser($userId, $phoneNumber, [
            'source' => 'new_created',
            'type' => 'personal',
        ]);
        
        return $userId;
    }

    /**
     * 记录合并历史
     *
     * @param string $sourceUserId 源用户ID
     * @param string $targetUserId 目标用户ID
     */
    private function recordMergeHistory(string $sourceUserId, string $targetUserId): void
    {
        try {
            $sourceUser = $this->userProfileRepository->findByUserId($sourceUserId);
            $targetUser = $this->userProfileRepository->findByUserId($targetUserId);
            
            if (!$sourceUser || !$targetUser) {
                return;
            }
            
            // 记录合并信息到日志（可以扩展为独立的合并历史表）
            LoggerHelper::logBusiness('person_merge_history', [
                'source_user_id' => $sourceUserId,
                'target_user_id' => $targetUserId,
                'source_is_temporary' => $sourceUser->is_temporary ?? true,
                'target_is_temporary' => $targetUser->is_temporary ?? false,
                'source_id_card_hash' => $sourceUser->id_card_hash ?? null,
                'target_id_card_hash' => $targetUser->id_card_hash ?? null,
                'merge_time' => date('Y-m-d H:i:s'),
            ]);
        } catch (\Throwable $e) {
            // 记录历史失败不影响合并流程
            LoggerHelper::logError($e, [
                'component' => 'PersonMergeService',
                'action' => 'recordMergeHistory',
                'source_user_id' => $sourceUserId,
                'target_user_id' => $targetUserId,
            ]);
        }
    }
}

