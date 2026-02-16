<?php

namespace app\repository;

use MongoDB\Laravel\Eloquent\Model;

/**
 * 标签定义仓储
 *
 * 对应集合：tag_definitions
 */
class TagDefinitionRepository extends Model
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
    protected $table = 'tag_definitions';

    protected $primaryKey = 'tag_id';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'tag_id',
        'tag_code',
        'tag_name',
        'category',
        'rule_type',
        'rule_config',
        'update_frequency',
        'priority',
        'dependencies',
        'description',
        'status',
        'version',
        'create_time',
        'update_time',
    ];

    protected $casts = [
        'rule_config'  => 'array',
        'dependencies' => 'array',
        'priority'     => 'int',
        'status'       => 'int',
        'version'      => 'int',
        'create_time'  => 'datetime',
        'update_time'  => 'datetime',
    ];

    public $timestamps = false;
}


