<?php

namespace app\repository;

use MongoDB\Laravel\Eloquent\Model;

/**
 * 门店信息仓储
 *
 * 对应集合：stores
 * 字段定义参考：`提示词/202511/数据库字段.md` 中 stores 段落。
 */
class StoreRepository extends Model
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
    protected $table = 'stores';

    /**
     * 主键字段
     *
     * @var string
     */
    protected $primaryKey = 'store_id';

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
        'store_id',
        'store_code',
        'store_name',
        'store_type',
        'store_level',
        'industry_id',
        'industry_detail_id',
        'store_address',
        'store_province',
        'store_city',
        'store_district',
        'store_business_area',
        'store_longitude',
        'store_latitude',
        'store_phone',
        'status',
        'create_time',
        'update_time',
    ];

    /**
     * 字段类型转换
     *
     * @var array<string, string>
     */
    protected $casts = [
        'store_longitude' => 'float',
        'store_latitude' => 'float',
        'status' => 'int',
        'create_time' => 'datetime',
        'update_time' => 'datetime',
    ];

    /**
     * 禁用 Laravel 默认时间戳
     *
     * @var bool
     */
    public $timestamps = false;

    /**
     * 根据门店名称查找门店
     *
     * @param string $storeName 门店名称
     * @return StoreRepository|null
     */
    public function findByStoreName(string $storeName): ?StoreRepository
    {
        return $this->newQuery()
            ->where('store_name', $storeName)
            ->where('status', 0) // 只查询正常状态的门店
            ->first();
    }

    /**
     * 根据门店编码查找门店
     *
     * @param string $storeCode 门店编码
     * @return StoreRepository|null
     */
    public function findByStoreCode(string $storeCode): ?StoreRepository
    {
        return $this->newQuery()
            ->where('store_code', $storeCode)
            ->first();
    }
}

