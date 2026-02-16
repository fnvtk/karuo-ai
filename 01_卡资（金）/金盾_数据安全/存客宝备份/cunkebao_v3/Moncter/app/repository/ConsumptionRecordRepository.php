<?php

namespace app\repository;

use MongoDB\Laravel\Eloquent\Model;

/**
 * 消费记录仓储
 *
 * 对应集合：consumption_records_YYYYMM
 * 第一阶段实现中，可先固定写入当前月份集合，例如：consumption_records_202512。
 */
class ConsumptionRecordRepository extends Model
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
     * 注意：实际使用时建议根据消费时间动态切换集合名。
     *
     * @var string
     */
    protected $table = 'consumption_records_202512';

    /**
     * 主键字段
     *
     * @var string
     */
    protected $primaryKey = 'record_id';

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
     * 允许批量赋值的字段（按数据库字段文档筛选与当前闭环相关的部分）
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'record_id',
        'user_id',
        'consume_time',
        'amount',
        'actual_amount',
        'currency',
        'store_id',
        'status',
        'create_time',
    ];

    /**
     * 字段类型转换
     *
     * @var array<string, string>
     */
    protected $casts = [
        'amount'       => 'float',
        'actual_amount'=> 'float',
        'consume_time' => 'datetime',
        'create_time'  => 'datetime',
        'status'       => 'int',
    ];

    /**
     * 禁用 Laravel 默认时间戳
     *
     * @var bool
     */
    public $timestamps = false;
}


