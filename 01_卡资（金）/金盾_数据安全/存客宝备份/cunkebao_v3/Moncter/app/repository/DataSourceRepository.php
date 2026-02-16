<?php

namespace app\repository;

use MongoDB\Laravel\Eloquent\Model;

/**
 * 数据源仓储
 *
 * 对应集合：data_sources
 */
class DataSourceRepository extends Model
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
    protected $table = 'data_sources';

    protected $primaryKey = 'data_source_id';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'data_source_id',
        'name',
        'type',
        'host',
        'port',
        'database',
        'username',
        'password',
        'auth_source',
        'options',
        'description',
        'status',
        'is_tag_engine', // 是否为标签引擎数据库（ckb数据库）
        'created_at',
        'updated_at',
    ];

    protected $casts = [
        'port' => 'int',
        'options' => 'array',
        'status' => 'int',
        'is_tag_engine' => 'bool',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public $timestamps = true;

    const CREATED_AT = 'created_at';
    const UPDATED_AT = 'updated_at';

    /**
     * 转换为配置格式（兼容原有的config格式）
     *
     * @return array<string, mixed>
     */
    public function toConfigArray(): array
    {
        $config = [
            'type' => $this->type,
            'host' => $this->host,
            'port' => $this->port,
            'database' => $this->database,
        ];

        if ($this->username) {
            $config['username'] = $this->username;
        }

        if ($this->password) {
            $config['password'] = $this->password;
        }

        if ($this->auth_source) {
            $config['auth_source'] = $this->auth_source;
        }

        if ($this->options) {
            $config['options'] = $this->options;
        }

        return $config;
    }
}

