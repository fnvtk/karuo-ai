<?php

namespace app\service;

use app\repository\UserPhoneRelationRepository;
use app\utils\EncryptionHelper;
use app\utils\LoggerHelper;
use Ramsey\Uuid\Uuid as UuidGenerator;

/**
 * 用户手机号服务
 *
 * 职责：
 * - 管理用户与手机号的关联关系
 * - 处理手机号的历史记录（支持手机号回收后重新分配）
 * - 根据手机号查找当前用户
 * - 获取用户的所有手机号
 */
class UserPhoneService
{
    public function __construct(
        protected UserPhoneRelationRepository $phoneRelationRepository
    ) {
    }

    /**
     * 为用户添加手机号
     *
     * @param string $userId 用户ID
     * @param string $phoneNumber 手机号
     * @param array<string, mixed> $options 可选参数
     *   - type: 手机号类型（personal/work/backup/other）
     *   - is_verified: 是否已验证
     *   - effective_time: 生效时间（默认当前时间）
     *   - expire_time: 失效时间（默认null，表示当前有效）
     *   - source: 来源（registration/update/manual/import）
     * @return string 关联ID
     * @throws \InvalidArgumentException
     */
    public function addPhoneToUser(string $userId, string $phoneNumber, array $options = []): string
    {
        \Workerman\Worker::safeEcho("\n");
        \Workerman\Worker::safeEcho("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
        \Workerman\Worker::safeEcho("[UserPhoneService::addPhoneToUser] 【断点1-方法入口】开始执行\n");
        \Workerman\Worker::safeEcho("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
        \Workerman\Worker::safeEcho("【断点1】原始传入参数:\n");
        \Workerman\Worker::safeEcho("  - userId: {$userId}\n");
        \Workerman\Worker::safeEcho("  - phoneNumber: {$phoneNumber}\n");
        \Workerman\Worker::safeEcho("  - options: " . json_encode($options, JSON_UNESCAPED_UNICODE) . "\n");
        
        \Workerman\Worker::safeEcho("\n【断点2-参数处理】开始处理参数\n");
        $phoneNumber = trim($phoneNumber);
        \Workerman\Worker::safeEcho("  - trim后phoneNumber: {$phoneNumber}\n");
        
        // 检查手机号是否为空
        if (empty($phoneNumber)) {
            \Workerman\Worker::safeEcho("【断点2】❌ 手机号为空，抛出异常\n");
            throw new \InvalidArgumentException('手机号不能为空');
        }
        
        // 过滤非数字字符
        $originalPhone = $phoneNumber;
        \Workerman\Worker::safeEcho("\n【断点3-过滤处理】开始过滤非数字字符\n");
        $phoneNumber = $this->filterPhoneNumber($phoneNumber);
        \Workerman\Worker::safeEcho("  - 原始手机号: {$originalPhone}\n");
        \Workerman\Worker::safeEcho("  - 过滤后手机号: {$phoneNumber}\n");
        \Workerman\Worker::safeEcho("  - 过滤后长度: " . strlen($phoneNumber) . "\n");
        
        // 检查过滤后是否为空
        if (empty($phoneNumber)) {
            \Workerman\Worker::safeEcho("【断点3】❌ 手机号过滤后为空，抛出异常\n");
            throw new \InvalidArgumentException("手机号过滤后为空: {$originalPhone}");
        }
        
        \Workerman\Worker::safeEcho("\n【断点4-格式验证】开始验证手机号格式\n");
        // 验证手机号格式（过滤后的手机号）
        $isValid = $this->validatePhoneNumber($phoneNumber);
        \Workerman\Worker::safeEcho("  - 验证结果: " . ($isValid ? '通过 ✓' : '失败 ✗') . "\n");
        if (!$isValid) {
            \Workerman\Worker::safeEcho("【断点4】❌ 手机号格式验证失败，抛出异常\n");
            \Workerman\Worker::safeEcho("  - 验证规则: /^1[3-9]\\d{9}$/\n");
            \Workerman\Worker::safeEcho("  - 实际值: {$phoneNumber}\n");
            \Workerman\Worker::safeEcho("  - 长度: " . strlen($phoneNumber) . "\n");
            throw new \InvalidArgumentException("手机号格式不正确: {$originalPhone} -> {$phoneNumber} (长度: " . strlen($phoneNumber) . ")");
        }
        \Workerman\Worker::safeEcho("【断点4】✓ 格式验证通过\n");

        \Workerman\Worker::safeEcho("\n【断点5-哈希计算】开始计算手机号哈希\n");
        $phoneHash = EncryptionHelper::hash($phoneNumber);
        $now = new \DateTimeImmutable('now');
        $effectiveTime = $options['effective_time'] ?? $now;
        \Workerman\Worker::safeEcho("  - phoneHash: {$phoneHash}\n");
        \Workerman\Worker::safeEcho("  - effectiveTime: " . $effectiveTime->format('Y-m-d H:i:s') . "\n");
        
        \Workerman\Worker::safeEcho("\n【断点6-冲突检查】检查是否存在冲突关联\n");
        // 检查该手机号在effectiveTime是否已有有效关联
        // 使用effectiveTime作为查询时间点，查找是否有冲突的关联
        $existingActive = $this->phoneRelationRepository->findActiveByPhoneHash($phoneHash, $effectiveTime);
        \Workerman\Worker::safeEcho("  - 查询结果: " . ($existingActive ? "找到冲突关联 (user_id: {$existingActive->user_id})" : "无冲突") . "\n");
        
        if ($existingActive && $existingActive->user_id !== $userId) {
            \Workerman\Worker::safeEcho("【断点6】⚠️  发现冲突，需要失效旧关联\n");
            // 如果手机号在effectiveTime已被其他用户使用，需要先失效旧关联
            // 过期时间设置为新关联的effectiveTime（保证时间连续，避免间隙）
            $existingActive->expire_time = $effectiveTime;
            $existingActive->is_active = false;
            $existingActive->update_time = $now;
            $existingActive->save();
            \Workerman\Worker::safeEcho("  - 旧关联已失效，expire_time: " . $effectiveTime->format('Y-m-d H:i:s') . "\n");
            
            LoggerHelper::logBusiness('phone_relation_expired_due_to_conflict', [
                'phone_number' => $phoneNumber,
                'old_user_id' => $existingActive->user_id,
                'new_user_id' => $userId,
                'expire_time' => $effectiveTime->format('Y-m-d H:i:s'),
                'effective_time' => $effectiveTime->format('Y-m-d H:i:s'),
            ]);
        } else {
            \Workerman\Worker::safeEcho("【断点6】✓ 无冲突，继续创建新关联\n");
        }
        
        \Workerman\Worker::safeEcho("\n【断点7-数据准备】开始准备要保存的数据\n");
        
        try {
            \Workerman\Worker::safeEcho("  [7.1] 创建 UserPhoneRelationRepository 对象...\n");
            // 创建新关联
            $relation = new UserPhoneRelationRepository();
            \Workerman\Worker::safeEcho("  [7.1] ✓ 对象创建成功\n");
            
            \Workerman\Worker::safeEcho("  [7.2] 设置 relation_id...\n");
            $relation->relation_id = UuidGenerator::uuid4()->toString();
            \Workerman\Worker::safeEcho("  [7.2] ✓ relation_id = {$relation->relation_id}\n");
            
            \Workerman\Worker::safeEcho("  [7.3] 设置 phone_number...\n");
            $relation->phone_number = $phoneNumber;
            \Workerman\Worker::safeEcho("  [7.3] ✓ phone_number = {$relation->phone_number}\n");
            
            \Workerman\Worker::safeEcho("  [7.4] 设置 phone_hash...\n");
            $relation->phone_hash = $phoneHash;
            \Workerman\Worker::safeEcho("  [7.4] ✓ phone_hash = {$relation->phone_hash}\n");
            
            \Workerman\Worker::safeEcho("  [7.5] 设置 user_id...\n");
            $relation->user_id = $userId;
            \Workerman\Worker::safeEcho("  [7.5] ✓ user_id = {$relation->user_id}\n");
            
            \Workerman\Worker::safeEcho("  [7.6] 设置 effective_time...\n");
            \Workerman\Worker::safeEcho("    - effectiveTime类型: " . get_class($effectiveTime) . "\n");
            \Workerman\Worker::safeEcho("    - effectiveTime值: " . $effectiveTime->format('Y-m-d H:i:s') . "\n");
            $relation->effective_time = $effectiveTime;
            \Workerman\Worker::safeEcho("  [7.6] ✓ effective_time 设置完成\n");
            
            \Workerman\Worker::safeEcho("  [7.7] 设置 expire_time...\n");
            $expireTimeValue = $options['expire_time'] ?? null;
            \Workerman\Worker::safeEcho("    - expireTime值: " . ($expireTimeValue ? (is_object($expireTimeValue) ? $expireTimeValue->format('Y-m-d H:i:s') : $expireTimeValue) : 'null') . "\n");
            $relation->expire_time = $expireTimeValue;
            \Workerman\Worker::safeEcho("  [7.7] ✓ expire_time 设置完成\n");
            
            \Workerman\Worker::safeEcho("  [7.8] 设置 is_active...\n");
            // 如果 expire_time 为 null 或不存在，则 is_active 为 true
            $isActiveValue = ($options['expire_time'] ?? null) === null;
            \Workerman\Worker::safeEcho("    - isActive值: " . ($isActiveValue ? 'true' : 'false') . "\n");
            $relation->is_active = $isActiveValue;
            \Workerman\Worker::safeEcho("  [7.8] ✓ is_active 设置完成\n");
            
            \Workerman\Worker::safeEcho("  [7.9] 设置 type...\n");
            $typeValue = $options['type'] ?? 'personal';
            \Workerman\Worker::safeEcho("    - type值: {$typeValue}\n");
            $relation->type = $typeValue;
            \Workerman\Worker::safeEcho("  [7.9] ✓ type 设置完成\n");
            
            \Workerman\Worker::safeEcho("  [7.10] 设置 is_verified...\n");
            $isVerifiedValue = $options['is_verified'] ?? false;
            \Workerman\Worker::safeEcho("    - isVerified值: " . ($isVerifiedValue ? 'true' : 'false') . "\n");
            $relation->is_verified = $isVerifiedValue;
            \Workerman\Worker::safeEcho("  [7.10] ✓ is_verified 设置完成\n");
            
            \Workerman\Worker::safeEcho("  [7.11] 设置 source...\n");
            $sourceValue = $options['source'] ?? 'manual';
            \Workerman\Worker::safeEcho("    - source值: {$sourceValue}\n");
            $relation->source = $sourceValue;
            \Workerman\Worker::safeEcho("  [7.11] ✓ source 设置完成\n");
            
            \Workerman\Worker::safeEcho("  [7.12] 设置 create_time...\n");
            \Workerman\Worker::safeEcho("    - now类型: " . get_class($now) . "\n");
            \Workerman\Worker::safeEcho("    - now值: " . $now->format('Y-m-d H:i:s') . "\n");
            $relation->create_time = $now;
            \Workerman\Worker::safeEcho("  [7.12] ✓ create_time 设置完成\n");
            
            \Workerman\Worker::safeEcho("  [7.13] 设置 update_time...\n");
            $relation->update_time = $now;
            \Workerman\Worker::safeEcho("  [7.13] ✓ update_time 设置完成\n");
            
            \Workerman\Worker::safeEcho("  [7.14] ✓ 所有属性设置完成，准备打印数据详情\n");
            
        } catch (\Throwable $e) {
            \Workerman\Worker::safeEcho("\n【断点7】❌ 数据准备过程中发生异常！\n");
            \Workerman\Worker::safeEcho("  - 错误信息: " . $e->getMessage() . "\n");
            \Workerman\Worker::safeEcho("  - 错误类型: " . get_class($e) . "\n");
            \Workerman\Worker::safeEcho("  - 文件: " . $e->getFile() . ":" . $e->getLine() . "\n");
            \Workerman\Worker::safeEcho("  - 堆栈跟踪:\n");
            $trace = $e->getTraceAsString();
            $traceLines = explode("\n", $trace);
            foreach (array_slice($traceLines, 0, 10) as $line) {
                \Workerman\Worker::safeEcho("    " . $line . "\n");
            }
            throw $e;
        }
        
        \Workerman\Worker::safeEcho("【断点7】准备保存的数据详情:\n");
        \Workerman\Worker::safeEcho("  - relation_id: {$relation->relation_id}\n");
        \Workerman\Worker::safeEcho("  - phone_number: {$relation->phone_number}\n");
        \Workerman\Worker::safeEcho("  - phone_hash: {$relation->phone_hash}\n");
        \Workerman\Worker::safeEcho("  - user_id: {$relation->user_id}\n");
        \Workerman\Worker::safeEcho("  - effective_time: " . ($relation->effective_time ? $relation->effective_time->format('Y-m-d H:i:s') : 'null') . "\n");
        \Workerman\Worker::safeEcho("  - expire_time: " . ($relation->expire_time ? $relation->expire_time->format('Y-m-d H:i:s') : 'null') . "\n");
        \Workerman\Worker::safeEcho("  - is_active: " . ($relation->is_active ? 'true' : 'false') . "\n");
        \Workerman\Worker::safeEcho("  - type: {$relation->type}\n");
        \Workerman\Worker::safeEcho("  - is_verified: " . ($relation->is_verified ? 'true' : 'false') . "\n");
        \Workerman\Worker::safeEcho("  - source: {$relation->source}\n");
        \Workerman\Worker::safeEcho("  - create_time: " . ($relation->create_time ? $relation->create_time->format('Y-m-d H:i:s') : 'null') . "\n");
        \Workerman\Worker::safeEcho("  - update_time: " . ($relation->update_time ? $relation->update_time->format('Y-m-d H:i:s') : 'null') . "\n");
        
        \Workerman\Worker::safeEcho("\n【断点8-数据库配置检查】检查数据库配置\n");
        \Workerman\Worker::safeEcho("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
        
        try {
            // 获取表名
            $tableName = $relation->getTable();
            \Workerman\Worker::safeEcho("  ✓ 目标表名: {$tableName}\n");
            
            // 获取连接名
            $connectionName = $relation->getConnectionName();
            \Workerman\Worker::safeEcho("  ✓ 数据库连接名: {$connectionName}\n");
            
            // 获取连接对象
            $connection = $relation->getConnection();
            \Workerman\Worker::safeEcho("  ✓ 连接对象获取成功\n");
            
            // 获取数据库名
            $databaseName = $connection->getDatabaseName();
            \Workerman\Worker::safeEcho("  ✓ 数据库名: {$databaseName}\n");
            
            // 获取配置信息
            $config = config('database.connections.' . $connectionName, []);
            \Workerman\Worker::safeEcho("\n  数据库配置详情:\n");
            \Workerman\Worker::safeEcho("    - driver: " . ($config['driver'] ?? 'unknown') . "\n");
            \Workerman\Worker::safeEcho("    - dsn: " . ($config['dsn'] ?? 'unknown') . "\n");
            \Workerman\Worker::safeEcho("    - database: " . ($config['database'] ?? 'unknown') . "\n");
            \Workerman\Worker::safeEcho("    - username: " . (isset($config['username']) ? $config['username'] : 'null') . "\n");
            \Workerman\Worker::safeEcho("    - has_password: " . (isset($config['password']) ? 'yes' : 'no') . "\n");
            
            // 尝试获取MongoDB客户端信息
            try {
                $mongoClient = $connection->getMongoClient();
                if ($mongoClient) {
                    \Workerman\Worker::safeEcho("    - MongoDB客户端: 已获取 ✓\n");
                }
            } catch (\Throwable $e) {
                \Workerman\Worker::safeEcho("    - MongoDB客户端获取失败: " . $e->getMessage() . "\n");
            }
            
            // 测试连接
            try {
                $testCollection = $connection->getCollection($tableName);
                \Workerman\Worker::safeEcho("    - 集合对象获取: 成功 ✓\n");
                \Workerman\Worker::safeEcho("    - 集合名: {$tableName}\n");
            } catch (\Throwable $e) {
                \Workerman\Worker::safeEcho("    - 集合对象获取失败: " . $e->getMessage() . "\n");
            }
            
            \Workerman\Worker::safeEcho("\n  最终写入目标:\n");
            \Workerman\Worker::safeEcho("    - 数据库: {$databaseName}\n");
            \Workerman\Worker::safeEcho("    - 集合: {$tableName}\n");
            \Workerman\Worker::safeEcho("    - 连接: {$connectionName}\n");
            \Workerman\Worker::safeEcho("    - 连接状态: 已连接 ✓\n");
            
        } catch (\Throwable $e) {
            \Workerman\Worker::safeEcho("  ❌ 数据库配置检查失败！\n");
            \Workerman\Worker::safeEcho("    - 错误信息: " . $e->getMessage() . "\n");
            \Workerman\Worker::safeEcho("    - 错误类型: " . get_class($e) . "\n");
            \Workerman\Worker::safeEcho("    - 文件: " . $e->getFile() . ":" . $e->getLine() . "\n");
            \Workerman\Worker::safeEcho("    - 堆栈: " . $e->getTraceAsString() . "\n");
        }
        
        \Workerman\Worker::safeEcho("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
        
        \Workerman\Worker::safeEcho("\n【断点9-执行保存】开始执行 save() 操作\n");
        \Workerman\Worker::safeEcho("  - 调用: \$relation->save()\n");
        
        // 执行保存
        try {
            $saveResult = $relation->save();
            \Workerman\Worker::safeEcho("【断点9】save() 执行完成\n");
            \Workerman\Worker::safeEcho("  - save() 返回值: " . ($saveResult ? 'true ✓' : 'false ✗') . "\n");
            
            if (!$saveResult) {
                \Workerman\Worker::safeEcho("  - ❌ 警告：save() 返回 false，数据可能未保存\n");
            }
            
            \Workerman\Worker::safeEcho("\n【断点10-保存后验证】验证数据是否真的写入数据库\n");
            \Workerman\Worker::safeEcho("  - 查询条件: relation_id = {$relation->relation_id}\n");
            
            // 验证是否真的保存成功（尝试查询）
            $savedRelation = $this->phoneRelationRepository->findByRelationId($relation->relation_id);
            if ($savedRelation) {
                \Workerman\Worker::safeEcho("  - ✅ 验证成功：查询到保存的数据\n");
                \Workerman\Worker::safeEcho("  - 查询到的 relation_id: {$savedRelation->relation_id}\n");
                \Workerman\Worker::safeEcho("  - 查询到的 user_id: {$savedRelation->user_id}\n");
                \Workerman\Worker::safeEcho("  - 查询到的 phone_number: {$savedRelation->phone_number}\n");
            } else {
                \Workerman\Worker::safeEcho("  - ❌ 验证失败：save()返回true但查询不到数据\n");
                \Workerman\Worker::safeEcho("  - 可能原因:\n");
                \Workerman\Worker::safeEcho("    1. MongoDB写入确认问题（w=0模式）\n");
                \Workerman\Worker::safeEcho("    2. 数据库连接问题\n");
                \Workerman\Worker::safeEcho("    3. 事务未提交\n");
                \Workerman\Worker::safeEcho("    4. 写入延迟\n");
            }
        } catch (\Throwable $e) {
            \Workerman\Worker::safeEcho("\n【断点9】❌ 保存过程中发生异常！\n");
            \Workerman\Worker::safeEcho("  - 错误信息: " . $e->getMessage() . "\n");
            \Workerman\Worker::safeEcho("  - 错误类型: " . get_class($e) . "\n");
            \Workerman\Worker::safeEcho("  - 文件: " . $e->getFile() . ":" . $e->getLine() . "\n");
            \Workerman\Worker::safeEcho("  - 堆栈跟踪:\n");
            $trace = $e->getTraceAsString();
            $traceLines = explode("\n", $trace);
            foreach (array_slice($traceLines, 0, 5) as $line) {
                \Workerman\Worker::safeEcho("    " . $line . "\n");
            }
            throw $e;
        }
        
        \Workerman\Worker::safeEcho("\n【断点11-日志记录】记录业务日志\n");
        
        LoggerHelper::logBusiness('phone_relation_created', [
            'relation_id' => $relation->relation_id,
            'user_id' => $userId,
            'phone_number' => $phoneNumber,
            'type' => $relation->type,
            'effective_time' => $effectiveTime->format('Y-m-d H:i:s'),
        ]);
        \Workerman\Worker::safeEcho("【断点11】✓ 业务日志已记录\n");
        
        \Workerman\Worker::safeEcho("\n【断点12-方法返回】准备返回结果\n");
        \Workerman\Worker::safeEcho("  - 返回 relation_id: {$relation->relation_id}\n");
        \Workerman\Worker::safeEcho("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
        \Workerman\Worker::safeEcho("[UserPhoneService::addPhoneToUser] ✅ 方法执行完成\n");
        \Workerman\Worker::safeEcho("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n");
        
        return $relation->relation_id;
    }

    /**
     * 移除用户的手机号（失效关联）
     *
     * @param string $userId 用户ID
     * @param string $phoneNumber 手机号
     * @param \DateTimeInterface|null $expireTime 过期时间（默认当前时间）
     * @return bool 是否成功
     */
    public function removePhoneFromUser(string $userId, string $phoneNumber, ?\DateTimeInterface $expireTime = null): bool
    {
        // 过滤非数字字符
        $phoneNumber = $this->filterPhoneNumber(trim($phoneNumber));
        if (empty($phoneNumber)) {
            return false;
        }
        
        $phoneHash = EncryptionHelper::hash($phoneNumber);
        $expireTime = $expireTime ?? new \DateTimeImmutable('now');
        
        $relations = $this->phoneRelationRepository->newQuery()
            ->where('phone_hash', $phoneHash)
            ->where('user_id', $userId)
            ->where('is_active', true)
            ->where(function($q) use ($expireTime) {
                $q->whereNull('expire_time')
                  ->orWhere('expire_time', '>', $expireTime);
            })
            ->get();
        
        if ($relations->isEmpty()) {
            return false;
        }
        
        foreach ($relations as $relation) {
            $relation->expire_time = $expireTime;
            $relation->is_active = false;
            $relation->update_time = new \DateTimeImmutable('now');
            $relation->save();
        }
        
        LoggerHelper::logBusiness('phone_relation_removed', [
            'user_id' => $userId,
            'phone_number' => $phoneNumber,
            'expire_time' => $expireTime->format('Y-m-d H:i:s'),
        ]);
        
        return true;
    }

    /**
     * 根据手机号查找当前用户
     *
     * @param string $phoneNumber 手机号
     * @param \DateTimeInterface|null $atTime 查询时间点（默认为当前时间）
     * @return string|null 用户ID
     */
    public function findUserByPhone(string $phoneNumber, ?\DateTimeInterface $atTime = null): ?string
    {
        // 过滤非数字字符
        $phoneNumber = $this->filterPhoneNumber(trim($phoneNumber));
        if (empty($phoneNumber)) {
            return null;
        }
        
        $phoneHash = EncryptionHelper::hash($phoneNumber);
        $relation = $this->phoneRelationRepository->findActiveByPhoneHash($phoneHash, $atTime);
        
        return $relation ? $relation->user_id : null;
    }

    /**
     * 获取用户的所有手机号
     *
     * @param string $userId 用户ID
     * @param bool $includeHistory 是否包含历史记录
     * @return array<array<string, mixed>> 手机号列表
     */
    public function getUserPhones(string $userId, bool $includeHistory = false): array
    {
        $relations = $this->phoneRelationRepository->findByUserId($userId, $includeHistory);
        
        return array_map(function($relation) {
            return [
                'phone_number' => $relation->phone_number,
                'type' => $relation->type,
                'is_verified' => $relation->is_verified,
                'effective_time' => $relation->effective_time,
                'expire_time' => $relation->expire_time,
                'is_active' => $relation->is_active,
                'source' => $relation->source,
            ];
        }, $relations);
    }

    /**
     * 获取用户的所有手机号号码（仅号码列表）
     *
     * @param string $userId 用户ID
     * @param bool $includeHistory 是否包含历史记录
     * @return array<string> 手机号列表
     */
    public function getUserPhoneNumbers(string $userId, bool $includeHistory = false): array
    {
        $relations = $this->phoneRelationRepository->findByUserId($userId, $includeHistory);
        
        return array_map(function($relation) {
            return $relation->phone_number;
        }, $relations);
    }

    /**
     * 获取手机号的历史关联记录
     *
     * @param string $phoneNumber 手机号
     * @return array<array<string, mixed>> 历史关联记录
     */
    public function getPhoneHistory(string $phoneNumber): array
    {
        // 过滤非数字字符
        $phoneNumber = $this->filterPhoneNumber(trim($phoneNumber));
        if (empty($phoneNumber)) {
            return [];
        }
        
        $phoneHash = EncryptionHelper::hash($phoneNumber);
        $relations = $this->phoneRelationRepository->findHistoryByPhoneHash($phoneHash);
        
        return array_map(function($relation) {
            return [
                'relation_id' => $relation->relation_id,
                'user_id' => $relation->user_id,
                'effective_time' => $relation->effective_time,
                'expire_time' => $relation->expire_time,
                'is_active' => $relation->is_active,
                'type' => $relation->type,
                'is_verified' => $relation->is_verified,
                'source' => $relation->source,
            ];
        }, $relations);
    }

    /**
     * 检查手机号是否已被使用（当前有效）
     *
     * @param string $phoneNumber 手机号
     * @return bool
     */
    public function isPhoneInUse(string $phoneNumber): bool
    {
        // 过滤非数字字符
        $phoneNumber = $this->filterPhoneNumber(trim($phoneNumber));
        if (empty($phoneNumber)) {
            return false;
        }
        
        $phoneHash = EncryptionHelper::hash($phoneNumber);
        $relation = $this->phoneRelationRepository->findActiveByPhoneHash($phoneHash);
        
        return $relation !== null;
    }

    /**
     * 过滤手机号中的非数字字符
     *
     * @param string $phoneNumber 原始手机号
     * @return string 过滤后的手机号（只包含数字）
     */
    protected function filterPhoneNumber(string $phoneNumber): string
    {
        // 移除所有非数字字符
        return preg_replace('/\D/', '', $phoneNumber);
    }

    /**
     * 验证手机号格式（内部使用，假设已经过滤过非数字字符）
     *
     * @param string $phoneNumber 已过滤的手机号（只包含数字）
     * @return bool
     */
    protected function validatePhoneNumber(string $phoneNumber): bool
    {
        // 中国大陆手机号：11位数字，以1开头
        return preg_match('/^1[3-9]\d{9}$/', $phoneNumber) === 1;
    }
}

