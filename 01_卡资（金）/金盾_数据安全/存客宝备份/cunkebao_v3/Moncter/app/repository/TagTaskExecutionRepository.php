<?php

namespace app\repository;

use MongoDB\Laravel\Eloquent\Model;

/**
 * 标签任务执行记录仓储
 *
 * 对应集合：tag_task_executions
 * 存储标签任务每次执行的记录
 */
class TagTaskExecutionRepository extends Model
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
    protected $table = 'tag_task_executions';

    /**
     * 主键字段
     *
     * @var string
     */
    protected $primaryKey = 'execution_id';

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
        'execution_id',
        'task_id',
        'started_at',
        'finished_at',
        'status', // running, completed, failed, cancelled
        'processed_users',
        'success_count',
        'error_count',
        'error_message',
        'created_at',
    ];

    /**
     * 字段类型转换
     *
     * @var array<string, string>
     */
    protected $casts = [
        'started_at' => 'datetime',
        'finished_at' => 'datetime',
        'created_at' => 'datetime',
    ];

    /**
     * 启用 Laravel 默认时间戳
     *
     * @var bool
     */
    public $timestamps = true;
}

