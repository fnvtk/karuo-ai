<?php

namespace app\repository;

use MongoDB\Laravel\Eloquent\Model;

/**
 * 标签历史仓储
 *
 * 对应集合：tag_history
 */
class TagHistoryRepository extends Model
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
    protected $table = 'tag_history';

    protected $primaryKey = 'history_id';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'history_id',
        'user_id',
        'tag_id',
        'old_value',
        'new_value',
        'change_reason',
        'change_time',
        'operator',
    ];

    protected $casts = [
        'change_time' => 'datetime',
    ];

    public $timestamps = false;
}


