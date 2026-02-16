<?php
return [
    // 默认数据库连接（可选改为 mongodb）
    'default' => 'mysql', // 若需全局用 MongoDB，改为 'mongodb'

    'connections' => [
        // ... 其他连接（如 mysql）保持不变

        // MongoDB 官方连接配置
        'mongodb' => [
            'driver' => 'mongodb',
            'dsn' => 'mongodb://192.168.1.106:27017', // 集群可写：mongodb://node1:27017,node2:27017
            'database' => 'ckb', // 目标数据库名
            'username' => 'ckb', // 无认证则省略
            'password' => '123456', // 无认证则省略
            'options' => [
                // 'replicaSet' => '', // 副本集名称（如果使用副本集，取消注释并填写名称）
                'ssl' => false, // 是否启用 SSL
                'connectTimeoutMS' => 3000, // 连接超时
                'socketTimeoutMS' => 5000, // 读写超时
                // 认证相关（若 MongoDB 启用认证）
                'authSource' => 'ckb', // 认证数据库（默认 admin）
                'authMechanism' => 'SCRAM-SHA-256', // 认证机制（默认推荐）
            ],
        ],
    ],
];