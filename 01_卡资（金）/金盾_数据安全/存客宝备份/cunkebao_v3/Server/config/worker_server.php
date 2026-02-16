<?php
// +----------------------------------------------------------------------
// | ThinkPHP [ WE CAN DO IT JUST THINK IT ]
// +----------------------------------------------------------------------
// | Copyright (c) 2006-2018 http://thinkphp.cn All rights reserved.
// +----------------------------------------------------------------------
// | Licensed ( http://www.apache.org/licenses/LICENSE-2.0 )
// +----------------------------------------------------------------------
// | Author: liu21st <liu21st@gmail.com>
// +----------------------------------------------------------------------
use think\facade\Env;

// +----------------------------------------------------------------------
// | Workerman设置 仅对 php think worker:server 指令有效
// +----------------------------------------------------------------------
return [
    // 扩展自身需要的配置
    'protocol'       => 'websocket', // 协议 支持 tcp udp unix http websocket text
    'host'           => '0.0.0.0', // 监听地址
    'port'           => 2345, // 监听端口
    'socket'         => '', // 完整监听地址
    'context'        => [], // socket 上下文选项
    'worker_class'   => 'app\common\TaskServer', // 自定义Workerman服务类名 支持数组定义多个服务

    // 支持workerman的所有配置参数
    'name'           => 'thinkphp',
    'count'          => 4,
    'daemonize'      => false,
    'pidFile'    => __DIR__ . '/../runtime/worker.pid',
    'logFile'    => __DIR__ . '/../runtime/workerman.log',
    'stdoutFile' => __DIR__ . '/../runtime/stdout.log',
    'daemonize'  => true, // 你用 -d 时会自动变 true

    // 支持事件回调
    // onWorkerStart
    'onWorkerStart'  => function ($worker) {
        //\app\common\socket\MessageHandler::onWorkerStart($worker);
    },
    // onWorkerReload
    'onWorkerReload' => function ($worker) {
        //\app\common\socket\MessageHandler::onWorkerReload($worker);
    },
    // onConnect
    'onConnect'      => function ($connection) {
        //\app\common\socket\MessageHandler::onConnect($connection);
    },
    // onMessage
    'onMessage'      => function ($connection, $data) {
        //\app\common\socket\MessageHandler::onMessage($connection, $data);
    },
    // onClose
    'onClose'        => function ($connection) {
        //\app\common\socket\MessageHandler::onClose($connection);
    },
    // onError
    'onError'        => function ($connection, $code, $msg) {
        //\app\common\socket\MessageHandler::onError($connection);
    },
];
