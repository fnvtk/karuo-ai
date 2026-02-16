<?php
/**
 * 数据源连接配置
 * 
 * 说明：
 * - 所有数据库连接的配置集合
 * - 只包含连接信息，不包含业务逻辑
 * - 可以被其他配置引用（如任务采集配置）
 */
return [
    // 卡若的数据库（爬虫抓取的业务数据库）
    'kr_mongodb' => [
        'type' => 'mongodb',
        'host' => getenv('KR_MONGODB_HOST'),
        'port' => (int)getenv('KR_MONGODB_PORT'),
        'database' => getenv('KR_MONGODB_DATABASE'),
        'username' => getenv('KR_MONGODB_USER'),
        'password' => getenv('KR_MONGODB_PASSWORD'),
        'auth_source' => getenv('KR_MONGODB_AUTH_SOURCE'),
        'options' => [
            'ssl' => false,
            'connectTimeoutMS' => 3000,
            'socketTimeoutMS' => 5000,
            'authMechanism' => 'SCRAM-SHA-256',
        ],
    ],

    // 标签数据库（主机标签数据库）
    'tag_mongodb' => [
        'type' => 'mongodb',
        'host' => getenv('TAG_MONGODB_HOST') ?: '192.168.1.106',
        'port' => (int)(getenv('TAG_MONGODB_PORT') ?: 27017),
        'database' => getenv('TAG_MONGODB_DATABASE') ?: 'ckb',
        'username' => getenv('TAG_MONGODB_USER') ?: 'ckb',
        'password' => getenv('TAG_MONGODB_PASSWORD') ?: '123456',
        'auth_source' => getenv('TAG_MONGODB_AUTH') ?: 'ckb',
        'options' => [
            'ssl' => false,
            'connectTimeoutMS' => 3000,
            'socketTimeoutMS' => 5000,
            'authMechanism' => 'SCRAM-SHA-256',
        ],
    ],

    // 同步目标数据库（主机同步KR数据库）
    'sync_mongodb' => [
        'type' => 'mongodb',
        'host' => getenv('SYNC_MONGODB_HOST'),
        'port' => (int)getenv('SYNC_MONGODB_PORT'),
        'database' => getenv('SYNC_MONGODB_DATABASE') ?: 'KR',
        'username' => getenv('SYNC_MONGODB_USER'),
        'password' => getenv('SYNC_MONGODB_PASS'),
        'auth_source' => getenv('SYNC_MONGODB_AUTH'),
        'options' => [
            'ssl' => false,
            'connectTimeoutMS' => 3000,
            'socketTimeoutMS' => 5000,
            'authMechanism' => 'SCRAM-SHA-256',
        ],
    ],

 
];
