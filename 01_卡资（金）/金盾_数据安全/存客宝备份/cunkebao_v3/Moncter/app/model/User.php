<?php
// app/model/User.php
namespace app\model;

use MongoDB\Laravel\Eloquent\Model;
use MongoDB\Laravel\Relations\HasMany; // 若需关联查询（可选）

class User extends Model
{
    // 对应 MongoDB 集合名（默认复数，可自定义）
    protected $collection = 'users';

    // 主键（MongoDB 默认 _id，无需修改，自动转为字符串）
    protected $primaryKey = '_id';

    // 主键类型（官方推荐显式声明）
    protected $keyType = 'string';

    // 允许批量赋值的字段（白名单）
    protected $fillable = ['name', 'age', 'email', 'avatar'];

    // 自动转换字段类型（ObjectId 转字符串、日期转 Carbon）
    protected $casts = [
        '_id' => 'string',
        'age' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'tags' => 'array', // 支持数组类型（MongoDB 原生支持数组）
    ];

    // 自动维护时间戳（created_at/updated_at，默认启用）
    // 若不需要可关闭：public $timestamps = false;

    // 自定义时间戳字段名（可选）
    // const CREATED_AT = 'create_time';
    // const UPDATED_AT = 'update_time';
}