<?php

namespace app\repository;

use MongoDB\Laravel\Eloquent\Model;

/**
 * 人群快照仓储
 *
 * 对应集合：tag_cohorts
 */
class TagCohortRepository extends Model
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
    protected $table = 'tag_cohorts';

    protected $primaryKey = 'cohort_id';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'cohort_id',
        'name',
        'description',
        'conditions',
        'logic',
        'user_ids',
        'user_count',
        'created_by',
        'created_at',
        'updated_at',
    ];

    protected $casts = [
        'conditions' => 'array',
        'user_ids' => 'array',
        'user_count' => 'int',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public $timestamps = false;
}

