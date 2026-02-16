<?php

namespace app\service;

use app\repository\UserProfileRepository;
use app\utils\EncryptionHelper;
use app\utils\IdCardHelper;
use app\utils\LoggerHelper;
use Ramsey\Uuid\Uuid as UuidGenerator;

/**
 * 用户服务
 *
 * 职责：
 * - 创建用户（包含身份证加密）
 * - 查询用户信息（支持解密身份证）
 * - 根据身份证哈希匹配用户
 */
class UserService
{
    public function __construct(
        protected UserProfileRepository $userProfileRepository
    ) {
    }

    /**
     * 创建用户
     *
     * @param array<string, mixed> $data 用户数据
     * @return array<string, mixed> 创建的用户信息
     * @throws \InvalidArgumentException
     */
    public function createUser(array $data): array
    {
        // 验证必填字段
        if (empty($data['id_card'])) {
            throw new \InvalidArgumentException('身份证号不能为空');
        }

        $idCard = trim($data['id_card']);
        $idCardType = $data['id_card_type'] ?? '身份证';

        // 验证身份证格式（简单验证）
        if ($idCardType === '身份证' && !$this->validateIdCard($idCard)) {
            throw new \InvalidArgumentException('身份证号格式不正确');
        }

        // 检查是否已存在（通过身份证哈希）
        $idCardHash = EncryptionHelper::hash($idCard);
        $existingUser = $this->userProfileRepository->newQuery()
            ->where('id_card_hash', $idCardHash)
            ->first();

        if ($existingUser) {
            throw new \InvalidArgumentException('该身份证号已存在，user_id: ' . $existingUser->user_id);
        }

        // 加密身份证
        $idCardEncrypted = EncryptionHelper::encrypt($idCard);

        // 生成用户ID
        $userId = $data['user_id'] ?? UuidGenerator::uuid4()->toString();

        $now = new \DateTimeImmutable('now');

        // 从身份证号中自动提取基础信息（如果未提供）
        $idCardInfo = IdCardHelper::extractInfo($idCard);
        $gender = isset($data['gender']) ? (int)$data['gender'] : ($idCardInfo['gender'] > 0 ? $idCardInfo['gender'] : null);
        $birthday = isset($data['birthday']) ? new \DateTimeImmutable($data['birthday']) : $idCardInfo['birthday'];
        
        // 创建用户记录
        $user = new UserProfileRepository();
        $user->user_id = $userId;
        $user->id_card_hash = $idCardHash;
        $user->id_card_encrypted = $idCardEncrypted;
        $user->id_card_type = $idCardType;
        $user->name = $data['name'] ?? null;
        $user->phone = $data['phone'] ?? null;
        $user->address = $data['address'] ?? null;
        $user->email = $data['email'] ?? null;
        $user->gender = $gender;
        $user->birthday = $birthday;
        $user->total_amount = isset($data['total_amount']) ? (float)$data['total_amount'] : 0;
        $user->total_count = isset($data['total_count']) ? (int)$data['total_count'] : 0;
        $user->last_consume_time = isset($data['last_consume_time']) ? new \DateTimeImmutable($data['last_consume_time']) : null;
        $user->status = isset($data['status']) ? (int)$data['status'] : 0;
        $user->create_time = $now;
        $user->update_time = $now;

        $user->save();

        LoggerHelper::logBusiness('user_created', [
            'user_id' => $userId,
            'name' => $user->name,
            'id_card_type' => $idCardType,
        ]);

        return [
            'user_id' => $userId,
            'name' => $user->name,
            'phone' => $user->phone,
            'id_card_type' => $idCardType,
            'create_time' => $user->create_time,
        ];
    }

    /**
     * 根据 user_id 获取用户信息
     *
     * @param string $userId 用户ID
     * @param bool $decryptIdCard 是否解密身份证（需要权限控制）
     * @return array<string, mixed>|null 用户信息
     */
    public function getUserById(string $userId, bool $decryptIdCard = false): ?array
    {
        $user = $this->userProfileRepository->findByUserId($userId);

        if (!$user) {
            return null;
        }

        $result = [
            'user_id' => $user->user_id,
            'name' => $user->name,
            'phone' => $user->phone,
            'address' => $user->address,
            'email' => $user->email,
            'gender' => $user->gender,
            'birthday' => $user->birthday,
            'id_card_type' => $user->id_card_type,
            'total_amount' => $user->total_amount,
            'total_count' => $user->total_count,
            'last_consume_time' => $user->last_consume_time,
            'tags_update_time' => $user->tags_update_time,
            'status' => $user->status,
            'create_time' => $user->create_time,
            'update_time' => $user->update_time,
        ];

        // 如果需要解密身份证（需要权限控制）
        if ($decryptIdCard) {
            try {
                $result['id_card'] = EncryptionHelper::decrypt($user->id_card_encrypted);
            } catch (\Throwable $e) {
                LoggerHelper::logError($e, ['user_id' => $userId, 'action' => 'decrypt_id_card']);
                $result['id_card'] = null;
                $result['decrypt_error'] = '解密失败';
            }
        } else {
            // 返回脱敏的身份证
            $result['id_card_encrypted'] = $user->id_card_encrypted;
        }

        return $result;
    }

    /**
     * 根据身份证号查找用户（通过哈希匹配）
     *
     * @param string $idCard 身份证号
     * @return array<string, mixed>|null 用户信息
     */
    public function findUserByIdCard(string $idCard): ?array
    {
        $idCardHash = EncryptionHelper::hash($idCard);
        $user = $this->userProfileRepository->newQuery()
            ->where('id_card_hash', $idCardHash)
            ->first();

        if (!$user) {
            return null;
        }

        return $this->getUserById($user->user_id, false);
    }

    /**
     * 更新用户信息
     *
     * @param string $userId 用户ID
     * @param array<string, mixed> $data 要更新的用户数据
     * @return array<string, mixed> 更新后的用户信息
     * @throws \InvalidArgumentException
     */
    public function updateUser(string $userId, array $data): array
    {
        $user = $this->userProfileRepository->findByUserId($userId);
        
        if (!$user) {
            throw new \InvalidArgumentException("用户不存在: {$userId}");
        }

        $now = new \DateTimeImmutable('now');

        // 更新允许修改的字段
        if (isset($data['name'])) {
            $user->name = $data['name'];
        }
        if (isset($data['phone'])) {
            $user->phone = $data['phone'];
        }
        if (isset($data['email'])) {
            $user->email = $data['email'];
        }
        if (isset($data['address'])) {
            $user->address = $data['address'];
        }
        if (isset($data['gender'])) {
            $user->gender = (int)$data['gender'];
        }
        if (isset($data['birthday'])) {
            $user->birthday = new \DateTimeImmutable($data['birthday']);
        }
        if (isset($data['status'])) {
            $user->status = (int)$data['status'];
        }

        $user->update_time = $now;
        $user->save();

        LoggerHelper::logBusiness('user_updated', [
            'user_id' => $userId,
            'updated_fields' => array_keys($data),
        ]);

        return $this->getUserById($userId, false);
    }

    /**
     * 删除用户（软删除，设置状态为禁用）
     *
     * @param string $userId 用户ID
     * @return bool 是否删除成功
     * @throws \InvalidArgumentException
     */
    public function deleteUser(string $userId): bool
    {
        $user = $this->userProfileRepository->findByUserId($userId);
        
        if (!$user) {
            throw new \InvalidArgumentException("用户不存在: {$userId}");
        }

        // 软删除：设置状态为禁用
        $user->status = 1; // 1 表示禁用
        $user->update_time = new \DateTimeImmutable('now');
        $user->save();

        LoggerHelper::logBusiness('user_deleted', [
            'user_id' => $userId,
        ]);

        return true;
    }

    /**
     * 搜索用户（支持多种条件组合）
     *
     * @param array<string, mixed> $conditions 搜索条件
     *   - name: 姓名（模糊搜索）
     *   - phone: 手机号（精确或模糊）
     *   - email: 邮箱（精确或模糊）
     *   - id_card: 身份证号（精确匹配）
     *   - gender: 性别（0-未知，1-男，2-女）
     *   - status: 状态（0-正常，1-禁用）
     *   - min_total_amount: 最小总消费金额
     *   - max_total_amount: 最大总消费金额
     *   - min_total_count: 最小消费次数
     *   - max_total_count: 最大消费次数
     * @param int $page 页码（从1开始）
     * @param int $pageSize 每页数量
     * @return array<string, mixed> 返回用户列表和分页信息
     */
    public function searchUsers(array $conditions, int $page = 1, int $pageSize = 20): array
    {
        $query = $this->userProfileRepository->newQuery();

        // 姓名模糊搜索（MongoDB 使用正则表达式）
        if (!empty($conditions['name'])) {
            $namePattern = preg_quote($conditions['name'], '/');
            $query->where('name', 'regex', "/{$namePattern}/i");
        }

        // 手机号搜索（支持精确和模糊）
        if (!empty($conditions['phone'])) {
            if (isset($conditions['phone_exact']) && $conditions['phone_exact']) {
                // 精确匹配
                $query->where('phone', $conditions['phone']);
            } else {
                // 模糊匹配（MongoDB 使用正则表达式）
                $phonePattern = preg_quote($conditions['phone'], '/');
                $query->where('phone', 'regex', "/{$phonePattern}/i");
            }
        }

        // 邮箱搜索（支持精确和模糊）
        if (!empty($conditions['email'])) {
            if (isset($conditions['email_exact']) && $conditions['email_exact']) {
                // 精确匹配
                $query->where('email', $conditions['email']);
            } else {
                // 模糊匹配（MongoDB 使用正则表达式）
                $emailPattern = preg_quote($conditions['email'], '/');
                $query->where('email', 'regex', "/{$emailPattern}/i");
            }
        }

        // 如果指定了 user_ids，限制搜索范围
        if (!empty($conditions['user_ids']) && is_array($conditions['user_ids'])) {
            $query->whereIn('user_id', $conditions['user_ids']);
        }

        // 身份证号精确匹配（通过哈希）
        if (!empty($conditions['id_card'])) {
            $idCardHash = EncryptionHelper::hash($conditions['id_card']);
            $query->where('id_card_hash', $idCardHash);
        }

        // 性别筛选
        if (isset($conditions['gender']) && $conditions['gender'] !== '') {
            $query->where('gender', (int)$conditions['gender']);
        }

        // 状态筛选
        if (isset($conditions['status']) && $conditions['status'] !== '') {
            $query->where('status', (int)$conditions['status']);
        }

        // 总消费金额范围
        if (isset($conditions['min_total_amount'])) {
            $query->where('total_amount', '>=', (float)$conditions['min_total_amount']);
        }
        if (isset($conditions['max_total_amount'])) {
            $query->where('total_amount', '<=', (float)$conditions['max_total_amount']);
        }

        // 消费次数范围
        if (isset($conditions['min_total_count'])) {
            $query->where('total_count', '>=', (int)$conditions['min_total_count']);
        }
        if (isset($conditions['max_total_count'])) {
            $query->where('total_count', '<=', (int)$conditions['max_total_count']);
        }

        // 分页
        $total = $query->count();
        $users = $query->skip(($page - 1) * $pageSize)
            ->take($pageSize)
            ->orderBy('create_time', 'desc')
            ->get();

        // 转换为数组格式
        $result = [];
        foreach ($users as $user) {
            $result[] = [
                'user_id' => $user->user_id,
                'name' => $user->name,
                'phone' => $user->phone,
                'email' => $user->email,
                'address' => $user->address,
                'gender' => $user->gender,
                'birthday' => $user->birthday,
                'id_card_type' => $user->id_card_type,
                'total_amount' => $user->total_amount,
                'total_count' => $user->total_count,
                'last_consume_time' => $user->last_consume_time,
                'tags_update_time' => $user->tags_update_time,
                'status' => $user->status,
                'create_time' => $user->create_time,
                'update_time' => $user->update_time,
            ];
        }

        return [
            'users' => $result,
            'total' => $total,
            'page' => $page,
            'page_size' => $pageSize,
            'total_pages' => (int)ceil($total / $pageSize),
        ];
    }

    /**
     * 验证身份证号格式（简单验证）
     *
     * @param string $idCard 身份证号
     * @return bool
     */
    protected function validateIdCard(string $idCard): bool
    {
        // 15位或18位数字，最后一位可能是X
        return preg_match('/^(\d{15}|\d{17}[\dXx])$/', $idCard) === 1;
    }
}

