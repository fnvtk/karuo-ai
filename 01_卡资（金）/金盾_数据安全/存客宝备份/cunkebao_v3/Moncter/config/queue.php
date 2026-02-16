<?php
/**
 * RabbitMQ 消息队列配置
 * 
 * 用于标签系统的异步消息处理
 */

return [
    'default' => 'rabbitmq',
    
    'connections' => [
        'rabbitmq' => [
            'driver' => 'rabbitmq',
            'host' => getenv('RABBITMQ_HOST') ?: '127.0.0.1',
            'port' => (int)(getenv('RABBITMQ_PORT') ?: 5672),
            'user' => getenv('RABBITMQ_USER') ?: 'guest',
            'password' => getenv('RABBITMQ_PASSWORD') ?: 'guest',
            'vhost' => getenv('RABBITMQ_VHOST') ?: '/',
            'timeout' => 10, // 连接超时时间（秒）
            
            // 队列配置
            'queues' => [
                // 数据同步队列：外部数据源轮询后推送的数据
                'data_sync' => [
                    'name' => 'data_sync_queue',
                    'durable' => true, // 队列持久化
                    'auto_delete' => false,
                    'arguments' => [],
                ],
                // 标签计算队列：消费记录写入后触发标签计算
                'tag_calculation' => [
                    'name' => 'tag_calculation_queue',
                    'durable' => true, // 队列持久化
                    'auto_delete' => false,
                    'arguments' => [],
                ],
            ],
            
            // 交换机配置
            'exchanges' => [
                'data_sync' => [
                    'name' => 'data_sync_exchange',
                    'type' => 'direct',
                    'durable' => true,
                    'auto_delete' => false,
                ],
                'tag_calculation' => [
                    'name' => 'tag_calculation_exchange',
                    'type' => 'direct',
                    'durable' => true,
                    'auto_delete' => false,
                ],
            ],
            
            // 路由键配置
            'routing_keys' => [
                'data_sync' => 'data.sync',
                'tag_calculation' => 'tag.calculation',
            ],
        ],
    ],
    
    // 消息配置
    'message' => [
        'delivery_mode' => 2, // 消息持久化（2 = 持久化）
        'content_type' => 'application/json',
    ],
    
    // 消费者配置
    'consumer' => [
        'data_sync' => [
            'prefetch_count' => 10, // 每次处理10条消息（批量处理）
            'no_ack' => false, // 需要确认消息
        ],
        'tag_calculation' => [
            'prefetch_count' => 1, // 每次只处理一条消息
            'no_ack' => false, // 需要确认消息
        ],
    ],
];

