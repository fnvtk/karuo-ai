<?php

namespace app\service;

use app\repository\UserProfileRepository;
use app\repository\UserPhoneRelationRepository;
use app\service\UserPhoneService;
use app\utils\EncryptionHelper;
use app\utils\IdCardHelper;
use app\utils\LoggerHelper;
use Ramsey\Uuid\Uuid as UuidGenerator;

/**
 * 身份解析服务
 *
 * 职责：
 * - 根据手机号解析person_id（user_id）
 * - 如果找不到，创建临时人
 * - 支持身份证绑定，将临时人转为正式人
 * - 处理多手机号到同一人的映射
 */
class IdentifierService
{
    public function __construct(
        protected UserProfileRepository $userProfileRepository,
        protected UserPhoneService $userPhoneService
    ) {
    }

    /**
     * 根据手机号解析用户ID（person_id）
     *
     * 流程：
     * 1. 查询手机号关联表，找到指定时间点有效的user_id
     * 2. 如果找不到，创建临时人并建立关联
     *
     * @param string $phoneNumber 手机号
     * @param \DateTimeInterface|null $atTime 查询时间点（默认为当前时间）
     * @return string user_id（person_id）
     */
    public function resolvePersonIdByPhone(string $phoneNumber, ?\DateTimeInterface $atTime = null): string
    {
        // 检查手机号是否为空
        $trimmedPhone = trim($phoneNumber);
        if (empty($trimmedPhone)) {
            // 如果手机号为空，创建一个没有手机号的临时用户
            $userId = $this->createTemporaryPerson(null, $atTime);
            LoggerHelper::logBusiness('temporary_person_created_no_phone', [
                'user_id' => $userId,
                'note' => '手机号为空，创建无手机号的临时用户',
            ]);
            return $userId;
        }
        
        // 1. 先查询手机号关联表（使用指定的时间点）
        $userId = $this->userPhoneService->findUserByPhone($trimmedPhone, $atTime);
        
        if ($userId !== null) {
            LoggerHelper::logBusiness('person_resolved_by_phone', [
                'phone_number' => $trimmedPhone,
                'user_id' => $userId,
                'source' => 'existing_relation',
                'at_time' => $atTime ? $atTime->format('Y-m-d H:i:s') : null,
            ]);
            return $userId;
        }

        // 2. 如果找不到，创建临时人（使用atTime作为生效时间）
        $userId = $this->createTemporaryPerson($trimmedPhone, $atTime);
        
        LoggerHelper::logBusiness('temporary_person_created', [
            'phone_number' => $trimmedPhone,
            'user_id' => $userId,
            'effective_time' => $atTime ? $atTime->format('Y-m-d H:i:s') : null,
        ]);

        return $userId;
    }

    /**
     * 根据身份证解析用户ID（person_id）
     *
     * @param string $idCard 身份证号
     * @return string|null user_id（person_id），如果不存在返回null
     */
    public function resolvePersonIdByIdCard(string $idCard): ?string
    {
        $idCardHash = EncryptionHelper::hash($idCard);
        $user = $this->userProfileRepository->findByIdCardHash($idCardHash);
        
        if ($user) {
            LoggerHelper::logBusiness('person_resolved_by_id_card', [
                'id_card_hash' => $idCardHash,
                'user_id' => $user->user_id,
            ]);
            return $user->user_id;
        }

        return null;
    }

    /**
     * 绑定身份证到用户（将临时人转为正式人，或创建正式人）
     *
     * @param string $userId 用户ID
     * @param string $idCard 身份证号
     * @return bool 是否成功
     * @throws \InvalidArgumentException
     */
    public function bindIdCardToPerson(string $userId, string $idCard): bool
    {
        $idCardHash = EncryptionHelper::hash($idCard);
        $idCardEncrypted = EncryptionHelper::encrypt($idCard);
        
        // 检查该身份证是否已被其他用户使用
        $existingUser = $this->userProfileRepository->findByIdCardHash($idCardHash);
        if ($existingUser && $existingUser->user_id !== $userId) {
            throw new \InvalidArgumentException("身份证号已被其他用户使用，user_id: {$existingUser->user_id}");
        }

        // 更新用户信息
        $user = $this->userProfileRepository->findByUserId($userId);
        if (!$user) {
            throw new \InvalidArgumentException("用户不存在: {$userId}");
        }

        // 如果用户已经是正式人且身份证匹配，无需更新
        if (!$user->is_temporary && $user->id_card_hash === $idCardHash) {
            return true;
        }

        // 更新身份证信息并标记为正式人
        $user->id_card_hash = $idCardHash;
        $user->id_card_encrypted = $idCardEncrypted;
        $user->id_card_type = '身份证';
        $user->is_temporary = false;
        
        // 从身份证号中自动提取基础信息（如果字段为空才更新）
        $idCardInfo = IdCardHelper::extractInfo($idCard);
        if ($idCardInfo['birthday'] !== null && $user->birthday === null) {
            $user->birthday = $idCardInfo['birthday'];
        }
        // 只有当性别解析成功且当前值为 null 时才更新（0 也被认为是未设置）
        if ($idCardInfo['gender'] > 0 && ($user->gender === null || $user->gender === 0)) {
            $user->gender = $idCardInfo['gender'];
        }
        
        $user->update_time = new \DateTimeImmutable('now');
        $user->save();

        LoggerHelper::logBusiness('id_card_bound_to_person', [
            'user_id' => $userId,
            'id_card_hash' => $idCardHash,
            'was_temporary' => $user->is_temporary ?? true,
        ]);

        return true;
    }

    /**
     * 创建临时人
     *
     * @param string|null $phoneNumber 手机号（可选，用于建立关联）
     * @param \DateTimeInterface|null $effectiveTime 生效时间（用于手机关联，默认当前时间）
     * @return string user_id
     */
    private function createTemporaryPerson(?string $phoneNumber = null, ?\DateTimeInterface $effectiveTime = null): string
    {
        $now = new \DateTimeImmutable('now');
        $userId = UuidGenerator::uuid4()->toString();

        // 创建临时人记录
        $user = new UserProfileRepository();
        $user->user_id = $userId;
        $user->is_temporary = true;
        $user->status = 0;
        $user->total_amount = 0;
        $user->total_count = 0;
        $user->create_time = $now;
        $user->update_time = $now;
        $user->save();

        // 如果有手机号，建立关联（使用effectiveTime作为生效时间）
        // 检查手机号不为空（null 或空字符串都跳过）
        if ($phoneNumber !== null && trim($phoneNumber) !== '') {
            try {
                $trimmedPhone = trim($phoneNumber);
                $this->userPhoneService->addPhoneToUser($userId, $trimmedPhone, [
                    'source' => 'auto_created',
                    'type' => 'personal',
                    'effective_time' => $effectiveTime ?? $now,
                ]);
                
                LoggerHelper::logBusiness('phone_relation_created_success', [
                    'user_id' => $userId,
                    'phone_number' => $trimmedPhone,
                    'effective_time' => ($effectiveTime ?? $now)->format('Y-m-d H:i:s'),
                ]);
            } catch (\Throwable $e) {
                // 手机号关联失败不影响用户创建，只记录详细的错误日志
                LoggerHelper::logError($e, [
                    'component' => 'IdentifierService',
                    'action' => 'createTemporaryPerson',
                    'user_id' => $userId,
                    'phone_number' => $phoneNumber,
                    'phone_number_length' => strlen($phoneNumber),
                    'error_message' => $e->getMessage(),
                    'error_type' => get_class($e),
                ]);
                
                // 同时记录业务日志，便于排查
                LoggerHelper::logBusiness('phone_relation_create_failed', [
                    'user_id' => $userId,
                    'phone_number' => $phoneNumber,
                    'error_message' => $e->getMessage(),
                    'note' => '用户已创建，但手机关联失败',
                ]);
            }
        } elseif ($phoneNumber !== null && trim($phoneNumber) === '') {
            // 手机号是空字符串，记录日志
            LoggerHelper::logBusiness('phone_relation_skipped_empty', [
                'user_id' => $userId,
                'note' => '手机号为空字符串，跳过关联创建',
            ]);
        }

        return $userId;
    }

    /**
     * 根据手机号或身份证解析用户ID
     *
     * 优先级：身份证 > 手机号
     *
     * @param string|null $phoneNumber 手机号
     * @param string|null $idCard 身份证号
     * @param \DateTimeInterface|null $atTime 查询时间点（用于手机号查询，默认为当前时间）
     * @return string user_id
     */
    public function resolvePersonId(?string $phoneNumber = null, ?string $idCard = null, ?\DateTimeInterface $atTime = null): string
    {
        $atTime = $atTime ?? new \DateTimeImmutable('now');
        
        // 优先使用身份证
        if ($idCard !== null && !empty($idCard)) {
            $userId = $this->resolvePersonIdByIdCard($idCard);
            if ($userId !== null) {
                // 如果身份证存在，但提供了手机号，确保手机号关联到该用户
                if ($phoneNumber !== null && !empty($phoneNumber)) {
                    // 在atTime时间点查询手机号关联
                    $existingUserId = $this->userPhoneService->findUserByPhone($phoneNumber, $atTime);
                    if ($existingUserId === null) {
                        // 手机号未关联，建立关联（使用atTime作为生效时间）
                        $this->userPhoneService->addPhoneToUser($userId, $phoneNumber, [
                            'source' => 'id_card_resolved',
                            'type' => 'personal',
                            'effective_time' => $atTime,
                        ]);
                    } elseif ($existingUserId !== $userId) {
                        // 手机号已关联到其他用户，需要合并（由PersonMergeService处理）
                        LoggerHelper::logBusiness('phone_bound_to_different_person', [
                            'phone_number' => $phoneNumber,
                            'existing_user_id' => $existingUserId,
                            'id_card_user_id' => $userId,
                            'at_time' => $atTime->format('Y-m-d H:i:s'),
                        ]);
                    }
                }
                return $userId;
            } else {
                // 身份证不存在，但有身份证信息，创建一个临时用户并绑定身份证（使其成为正式用户）
                $userId = $this->createTemporaryPerson($phoneNumber, $atTime);
                try {
                    $this->bindIdCardToPerson($userId, $idCard);
                } catch (\Throwable $e) {
                    // 绑定失败不影响返回user_id
                    LoggerHelper::logError($e, [
                        'component' => 'IdentifierService',
                        'action' => 'resolvePersonId',
                        'user_id' => $userId,
                    ]);
                }
                return $userId;
            }
        }

        // 使用手机号（传入atTime）
        if ($phoneNumber !== null && !empty($phoneNumber)) {
            $userId = $this->resolvePersonIdByPhone($phoneNumber, $atTime);
            
            // 如果同时提供了身份证，绑定身份证
            if ($idCard !== null && !empty($idCard)) {
                try {
                    $this->bindIdCardToPerson($userId, $idCard);
                } catch (\Throwable $e) {
                    // 绑定失败不影响返回user_id
                    LoggerHelper::logError($e, [
                        'component' => 'IdentifierService',
                        'action' => 'resolvePersonId',
                        'user_id' => $userId,
                    ]);
                }
            }
            
            return $userId;
        }

        // 都没有提供，创建临时人
        return $this->createTemporaryPerson(null, $atTime);
    }
}

