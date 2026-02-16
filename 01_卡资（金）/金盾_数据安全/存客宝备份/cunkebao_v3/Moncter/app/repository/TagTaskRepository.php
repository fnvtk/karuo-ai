<?php

namespace app\repository;

use MongoDB\Laravel\Eloquent\Model;

/**
 * 标签任务仓储
 *
 * 对应集合：tag_tasks
 * 存储标签计算任务配置
 */
class TagTaskRepository extends Model
{
    /**
     * 指定使用的数据库连接
     *
     * @var string
     */
    protected $connection = 'mongodb';

    /**
     * 集合名
     *
     * @var string
     */
    protected $table = 'tag_tasks';

    /**
     * 主键字段
     *
     * @var string
     */
    protected $primaryKey = 'task_id';

    /**
     * 主键非自增
     *
     * @var bool
     */
    public $incrementing = false;

    /**
     * 主键类型
     *
     * @var string
     */
    protected $keyType = 'string';

    /**
     * 允许批量赋值的字段
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'task_id',
        'name',
        'description',
        'task_type', // full: 全量计算, incremental: 增量计算, specific: 指定用户
        'target_tag_ids', // 目标标签ID列表
        'user_scope', // 用户范围配置
        'schedule', // 调度配置
        'config', // 高级配置
        'status', // pending, running, paused, stopped, completed, error
        'progress', // 进度信息
        'statistics', // 统计信息
        'created_by',
        'created_at',
        'updated_at',
    ];

    /**
     * 字段类型转换
     *
     * @var array<string, string>
     */
    protected $casts = [
        'target_tag_ids' => 'array',
        'user_scope' => 'array',
        'schedule' => 'array',
        'config' => 'array',
        'progress' => 'array',
        'statistics' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * 启用 Laravel 默认时间戳
     *
     * @var bool
     */
    public $timestamps = true;
}

