<?php

namespace app\repository;

use MongoDB\Laravel\Eloquent\Model;

/**
 * 数据采集任务仓储
 *
 * 对应集合：data_collection_tasks
 * 存储所有通过前端配置创建的采集任务
 */
class DataCollectionTaskRepository extends Model
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
    protected $table = 'data_collection_tasks';

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
        'data_source_id', // 源数据源ID
        'database', // 源数据库
        'collection', // 源集合（单集合模式）
        'collections', // 源集合列表（多集合模式）
        'target_data_source_id', // 目标数据源ID
        'target_database', // 目标数据库
        'target_collection', // 目标集合
        'target_type', // 目标类型：consumption_record（消费记录）、generic（通用集合）等
        'mode', // batch: 批量采集, realtime: 实时监听
        'field_mappings', // 字段映射配置（单集合模式）
        'collection_field_mappings', // 字段映射配置（多集合模式）
        'lookups', // 连表查询配置（单集合模式）
        'collection_lookups', // 连表查询配置（多集合模式）
        'filter_conditions', // 过滤条件
        'schedule', // 调度配置
        'status', // pending: 待启动, running: 运行中, paused: 已暂停, stopped: 已停止, error: 错误
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
     * 
     * 注意：MongoDB 原生支持数组类型，不需要对数组字段进行 cast
     * 如果进行 cast，当数据已经是数组时，Laravel 可能会尝试使用 Json cast 导致错误
     */
    protected $casts = [
        // 数组字段不进行 cast，让 MongoDB 直接处理
        // 'field_mappings' => 'array',
        // 'collection_field_mappings' => 'array',
        // 'lookups' => 'array',
        // 'collection_lookups' => 'array',
        // 'filter_conditions' => 'array',
        // 'schedule' => 'array',
        // 'progress' => 'array',
        // 'statistics' => 'array',
        // 'collections' => 'array',
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

