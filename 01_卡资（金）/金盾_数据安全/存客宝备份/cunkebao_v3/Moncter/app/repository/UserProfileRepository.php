<?php

namespace app\repository;

use MongoDB\Laravel\Eloquent\Model;
use MongoDB\Laravel\Eloquent\Builder;
use MongoDB\Client;

/**
 * 用户主信息仓储
 *
 * 对应集合：user_profile
 * 字段定义参考：`提示词/数据库字段.md` 中 user_profile 段落。
 */
class UserProfileRepository extends Model
{
    /**
     * 指定使用的数据库连接
     *
     * @var string
     */
    protected $connection = 'mongodb';

    /**
     * 对应的 MongoDB 集合名（MongoDB Laravel 4.8+ 使用 $table）
     *
     * @var string
     */
    protected $table = 'user_profile';

    /**
     * 主键字段
     *
     * @var string
     */
    protected $primaryKey = 'user_id';

    /**
     * 主键类型
     *
     * @var string
     */
    protected $keyType = 'string';

    /**
     * 是否自增主键
     *
     * @var bool
     */
    public $incrementing = false;

    /**
     * 允许批量赋值的字段
     *
     * 仅保留与标签系统直接相关的字段，其他字段按需补充。
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'id_card_hash',
        'id_card_encrypted',
        'id_card_type',
        'name',
        'phone',
        'address',
        'email',
        'gender',
        'birthday',
        'total_amount',
        'total_count',
        'last_consume_time',
        'tags_update_time',
        'is_temporary',      // 是否为临时人（true=临时人，false=正式人）
        'merged_from_user_id', // 如果是从临时人合并而来，记录原user_id
        'status',
        'create_time',
        'update_time',
    ];

    /**
     * 字段类型转换
     *
     * @var array<string, string>
     */
    protected $casts = [
        'total_amount'      => 'float',
        'total_count'       => 'int',
        'last_consume_time' => 'datetime',
        'tags_update_time'  => 'datetime',
        'birthday'          => 'datetime',
        'is_temporary'      => 'bool',
        'status'            => 'int',
        'create_time'       => 'datetime',
        'update_time'       => 'datetime',
    ];

    /**
     * 禁用 Laravel 默认的 created_at/updated_at
     *
     * 我们使用 create_time / update_time 字段。
     *
     * @var bool
     */
    public $timestamps = false;

    /**
     * 根据 user_id 获取用户记录（不存在时返回 null）
     */
    public function findByUserId(string $userId): ?self
    {
        /** @var Builder $query */
        $query = static::query();
        return $query->where('user_id', $userId)->first();
    }

    /**
     * 创建或更新用户的基础统计信息
     *
     * 仅用于标签系统第一阶段：更新总金额、总次数、最后消费时间。
     *
     * @param string $userId
     * @param float $amount 本次消费金额
     * @param \DateTimeInterface $consumeTime 消费时间
     */
    public function increaseStats(string $userId, float $amount, \DateTimeInterface $consumeTime): self
    {
        $now = new \DateTimeImmutable('now');

        /** @var self|null $user */
        $user = $this->findByUserId($userId);

        if (!$user) {
            $user = new self([
                'user_id'          => $userId,
                'total_amount'     => $amount,
                'total_count'      => 1,
                'last_consume_time'=> $consumeTime,
                'is_temporary'     => true, // 默认创建为临时人
                'status'           => 0,
                'create_time'      => $now,
                'update_time'      => $now,
            ]);
        } else {
            $user->total_amount = (float)$user->total_amount + $amount;
            $user->total_count  = (int)$user->total_count + 1;
            // 只在消费时间更晚时更新
            if (!$user->last_consume_time || $consumeTime > $user->last_consume_time) {
                $user->last_consume_time = $consumeTime;
            }
            $user->update_time = $now;
        }

        $user->save();

        return $user;
    }

    /**
     * 根据身份证哈希查找用户
     *
     * @param string $idCardHash 身份证哈希值
     * @return self|null
     */
    public function findByIdCardHash(string $idCardHash): ?self
    {
        return $this->newQuery()
            ->where('id_card_hash', $idCardHash)
            ->where('status', 0)
            ->first();
    }

    /**
     * 查找所有临时人
     *
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public function findTemporaryUsers()
    {
        return $this->newQuery()
            ->where('is_temporary', true)
            ->where('status', 0)
            ->get();
    }

    /**
     * 标记用户为正式人
     *
     * @param string $userId
     * @param string|null $idCardHash 身份证哈希
     * @param string|null $idCardEncrypted 加密的身份证
     * @param string|null $idCard 原始身份证号（用于提取基础信息，可选）
     * @return bool
     */
    public function markAsFormal(string $userId, ?string $idCardHash = null, ?string $idCardEncrypted = null, ?string $idCard = null): bool
    {
        $user = $this->findByUserId($userId);
        if (!$user) {
            return false;
        }

        $user->is_temporary = false;
        if ($idCardHash !== null) {
            $user->id_card_hash = $idCardHash;
        }
        if ($idCardEncrypted !== null) {
            $user->id_card_encrypted = $idCardEncrypted;
        }
        
        // 如果有原始身份证号，自动提取基础信息（如果字段为空才更新）
        if ($idCard !== null && !empty($idCard)) {
            $idCardInfo = \app\utils\IdCardHelper::extractInfo($idCard);
            if ($idCardInfo['birthday'] !== null && $user->birthday === null) {
                $user->birthday = $idCardInfo['birthday'];
            }
            // 只有当性别解析成功且当前值为 null 时才更新（0 也被认为是未设置）
            if ($idCardInfo['gender'] > 0 && ($user->gender === null || $user->gender === 0)) {
                $user->gender = $idCardInfo['gender'];
            }
        }
        
        $user->update_time = new \DateTimeImmutable('now');
        return $user->save();
    }
}


