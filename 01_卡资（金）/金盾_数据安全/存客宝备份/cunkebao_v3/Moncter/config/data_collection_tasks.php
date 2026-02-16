<?php
/**
 * 数据采集任务配置
 * 
 * 说明：
 * - 此配置文件仅保留数据库同步任务等系统级任务
 * - 其他数据采集任务通过数据库 data_collection_tasks 表进行管理和配置
 * - 数据库中的任务支持启动、暂停、删除等操作，由前端界面进行管理
 * - 每个任务配置：数据源引用、业务处理类、调度规则、分片配置
 * - 数据处理逻辑在业务代码中实现
 */
return [
    // 全局配置
    'global' => [
        // 分布式锁配置
        'distributed_lock' => [
            'driver' => 'redis',
            'ttl' => 300,
            'retry_times' => 3,
            'retry_delay' => 1000,
        ],
        // 错误处理配置
        'error_handling' => [
            'max_retries' => 3,
            'retry_delay' => 5,
            'circuit_breaker' => [
                'enabled' => true,
                'failure_threshold' => 10,
                'recovery_timeout' => 60,
            ],
        ],
    ],

    // 采集任务列表（配置文件中的任务）
    'tasks' => [
        // 数据库同步任务（实时同步源数据库到目标数据库）
        // 注意：这是一个系统级任务，通过配置文件管理，不从数据库加载
        'database_sync' => [
            'name' => '数据库实时同步',
            'enabled' => false,
            
            // 源数据库（从 data_sources.php 引用）
            'source_data_source' => 'kr_mongodb',
            
            // 目标数据库（从 data_sources.php 引用）
            'target_data_source' => 'sync_mongodb',
            
            // 业务处理类
            'handler_class' => \app\service\DataCollection\Handler\DatabaseSyncHandler::class,
            
            // 调度配置（数据库同步是持续运行的，不需要定时调度）
            'schedule' => [
                'cron' => null, // 不需要 Cron，启动后持续运行
                'enabled' => false, // 禁用定时调度，启动后持续运行
            ],
            
            // 分片配置（每个 Worker 可以监听不同的数据库）
            'sharding' => [
                'strategy' => 'by_database', // 按数据库分片
                'shard_count' => 1,
            ],
            
            // 同步状态存储配置
            'sync_state' => [
                'storage' => 'file', // 使用文件存储进度（DatabaseSyncService 使用文件）
                'key_prefix' => 'database_sync:',
            ],
            
            // 注意：业务逻辑相关配置（数据库列表、排除规则、性能配置等）
            // 已移到 DatabaseSyncHandler 类中，使用默认值或从独立配置读取
        ],
    ],
];

