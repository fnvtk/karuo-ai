<?php

namespace app\repository;

use MongoDB\Laravel\Eloquent\Model;
use MongoDB\Laravel\Eloquent\Builder;

/**
 * 用户手机号关联仓储
 *
 * 对应集合：user_phone_relations
 * 字段定义参考：`提示词/数据库字段.md` 中 user_phone_relations 段落。
 */
class UserPhoneRelationRepository extends Model
{
    /**
     * 指定使用的数据库连接
     *
     * @var string
     */
    protected $connection = 'mongodb';

    /**
     * 对应的 MongoDB 集合名
     *
     * @var string
     */
    protected $table = 'user_phone_relations';

    /**
     * 主键字段
     *
     * @var string
     */
    protected $primaryKey = 'relation_id';

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
     * @var array<int, string>
     */
    protected $fillable = [
        'relation_id',
        'phone_number',
        'phone_hash',
        'user_id',
        'effective_time',
        'expire_time',
        'is_active',
        'type',
        'is_verified',
        'source',
        'create_time',
        'update_time',
    ];

    /**
     * 字段类型转换
     *
     * @var array<string, string>
     */
    protected $casts = [
        'effective_time' => 'datetime',
        'expire_time' => 'datetime',
        'is_active' => 'boolean',
        'is_verified' => 'boolean',
        'create_time' => 'datetime',
        'update_time' => 'datetime',
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
     * 根据 relation_id 获取关联记录
     *
     * @param string $relationId
     * @return self|null
     */
    public function findByRelationId(string $relationId): ?self
    {
        /** @var Builder $query */
        $query = static::query();
        return $query->where('relation_id', $relationId)->first();
    }

    /**
     * 根据手机号哈希查找当前有效的关联
     *
     * @param string $phoneHash
     * @param \DateTimeInterface|null $atTime 查询时间点（默认为当前时间）
     * @return self|null
     */
    public function findActiveByPhoneHash(string $phoneHash, ?\DateTimeInterface $atTime = null): ?self
    {
        $queryTime = $atTime ?? new \DateTimeImmutable('now');
        
        /** @var Builder $query */
        $query = static::query();
        return $query->where('phone_hash', $phoneHash)
            ->where('effective_time', '<=', $queryTime)
            ->where(function($q) use ($queryTime) {
                $q->whereNull('expire_time')
                  ->orWhere('expire_time', '>=', $queryTime);
            })
            ->where('is_active', true)
            ->orderBy('effective_time', 'desc')
            ->first();
    }

    /**
     * 根据用户ID查找所有手机号关联（当前有效）
     *
     * @param string $userId
     * @param bool $includeHistory 是否包含历史记录
     * @return array<self>
     */
    public function findByUserId(string $userId, bool $includeHistory = false): array
    {
        /** @var Builder $query */
        $query = static::query();
        $query->where('user_id', $userId);
        
        if (!$includeHistory) {
            $query->where('is_active', true)
                  ->whereNull('expire_time');
        }
        
        return $query->orderBy('effective_time', 'desc')->get()->all();
    }

    /**
     * 根据手机号哈希查找所有历史关联记录
     *
     * @param string $phoneHash
     * @return array<self>
     */
    public function findHistoryByPhoneHash(string $phoneHash): array
    {
        /** @var Builder $query */
        $query = static::query();
        return $query->where('phone_hash', $phoneHash)
            ->orderBy('effective_time', 'desc')
            ->get()
            ->all();
    }
}

