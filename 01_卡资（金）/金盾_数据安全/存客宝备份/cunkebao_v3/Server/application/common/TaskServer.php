<?php

namespace app\common;

use think\Db;
use think\facade\Log;
use Workerman\Lib\Timer;
use think\worker\Server;
use WeChatDeviceApi\Adapters\ChuKeBao\Adapter as ChuKeBaoAdapter;

class TaskServer extends Server
{

    const PROCESS_COUNT = 5;

    protected $socket = 'text://0.0.0.0:2980';

    protected $option = [
        'count' => self::PROCESS_COUNT,
        'name' => 'ckb_task_server'
    ];

    /**
     * 当客户端的连接上发生错误时触发
     * @param $connection
     * @param $code
     * @param $msg
     */
    public function onError($connection, $code, $msg)
    {
        Log::record("error $code $msg");
    }

    public function onMessage($connection, $data)
    {
    }

    public function onClose($connection)
    {
    }

    public function onConnect($connection)
    {
    }

    public function onWorkerStart($worker)
    {

        $current_worker_id = $worker->id;

        $process_count_for_status_0 = self::PROCESS_COUNT - 1;

        $adapter = new ChuKeBaoAdapter();


        Log::info('Workerman进程：' . $current_worker_id);


        // 在一个进程里处理获客任务新是数据
        if ($current_worker_id == 4) {
            Timer::add(60, function () use ($adapter) {
                $adapter->handleCustomerTaskNewUser();
            });
        }


        // 在一个进程里处理获客任务添加后的相关逻辑
        if ($current_worker_id == 3) {
            Timer::add(60, function () use ($adapter) {
                $adapter->handleCustomerTaskWithStatusIsCreated();
            });
        }

        // 进程处理获客新任务
        if ($current_worker_id  == 2) {
            Timer::add(1, function () use ($current_worker_id, $process_count_for_status_0, $adapter) {
                $adapter->handleCustomerTaskWithStatusIsNew($current_worker_id, $process_count_for_status_0);
            });
        }

        // 在一个进程里处理自动问候任务
        if ($current_worker_id == 1) {
            // 每60秒检查一次自动问候规则
            Timer::add(60, function () use ($adapter) {
                //$adapter->handleAutoGreetings();
            });
        }

        // 更多其他后台任务
        // ......

    }
}
