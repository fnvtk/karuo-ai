<?php

namespace app\repository;

use MongoDB\Laravel\Eloquent\Model;

/**
 * 用户标签仓储
 *
 * 对应分片集合：user_tags_shard_{0-15}
 * 第一阶段实现中先固定一个集合，后续可根据 user_id 哈希路由到不同分片。
 */
class UserTagRepository extends Model
{
    /**
     * 指定使用的数据库连接
     *
     * @var string
     */
    protected $connection = 'mongodb';

    /**
     * 默认集合名（MongoDB Laravel 4.8+ 使用 $table）
     *
     * @var string
     */
    protected $table = 'user_tags_shard_0';

    /**
     * 复合主键在 Mongo Eloquent 中由业务自行控制
     *
     * 这里仍然使用默认 _id 作为物理主键，user_id + tag_id 通过唯一索引约束（由运维侧负责）。
     */
    protected $primaryKey = '_id';

    protected $keyType = 'string';

    protected $fillable = [
        'user_id',
        'tag_id',
        'tag_value',
        'tag_value_type',
        'confidence',
        'effective_time',
        'expire_time',
        'create_time',
        'update_time',
    ];

    protected $casts = [
        'tag_value'      => 'string',
        'confidence'     => 'float',
        'effective_time' => 'datetime',
        'expire_time'    => 'datetime',
        'create_time'    => 'datetime',
        'update_time'    => 'datetime',
    ];

    public $timestamps = false;
}


