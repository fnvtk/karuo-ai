<?php
/**
 * This file is part of webman.
 *
 * Licensed under The MIT License
 * For full copyright and license information, please see the MIT-LICENSE.txt
 * Redistributions of files must retain the above copyright notice.
 *
 * @author    walkor<walkor@workerman.net>
 * @copyright walkor<walkor@workerman.net>
 * @link      http://www.workerman.net/
 * @license   http://www.opensource.org/licenses/mit-license.php MIT License
 */

use support\Log;
use support\Request;
use app\process\Http;

global $argv;

return [
    'webman' => [
        'handler' => Http::class,
        'listen' => 'http://0.0.0.0:8787',
        'count' => cpu_count() * 4,
        'user' => '',
        'group' => '',
        'reusePort' => false,
        'eventLoop' => '',
        'context' => [],
        'constructor' => [
            'requestClass' => Request::class,
            'logger' => Log::channel('default'),
            'appPath' => app_path(),
            'publicPath' => public_path()
        ]
    ],
    // File update detection and automatic reload
    'monitor' => [
        'handler' => app\process\Monitor::class,
        'reloadable' => false,
        'constructor' => [
            // Monitor these directories
            'monitorDir' => array_merge([
                app_path(),
                config_path(),
                base_path() . '/process',
                base_path() . '/support',
                base_path() . '/resource',
                base_path() . '/.env',
            ], glob(base_path() . '/plugin/*/app'), glob(base_path() . '/plugin/*/config'), glob(base_path() . '/plugin/*/api')),
            // Files with these suffixes will be monitored
            'monitorExtensions' => [
                'php', 'html', 'htm', 'env'
            ],
            'options' => [
                'enable_file_monitor' => !in_array('-d', $argv) && DIRECTORY_SEPARATOR === '/',
                'enable_memory_monitor' => DIRECTORY_SEPARATOR === '/',
            ]
        ]
    ],
    // 数据采集任务调度器（从 config/data_collection_tasks.php 读取所有采集任务配置）
    'data_sync_scheduler' => [
        'handler' => app\process\DataSyncScheduler::class,
        'count' => 10, // Worker 进程数量（可根据任务数量调整）
        'reloadable' => false,
    ],
    // 数据同步 Worker（消费 RabbitMQ 消息队列）
    // 处理从采集任务推送过来的数据，写入目标数据库
    'data_sync_worker' => [
        'handler' => app\process\DataSyncWorker::class,
        'count' => 20, // Worker 进程数量（可根据消息量调整）
        'reloadable' => false,
    ],
    // 标签计算 Worker（消费 RabbitMQ 消息队列）
    // 根据用户数据计算标签值
    'tag_calculation_worker' => [
        'handler' => app\process\TagCalculationWorker::class,
        'count' => 2, // Worker 进程数量（可根据消息量调整）
        'reloadable' => false,
    ],
   
];
