<?php

namespace app\common\socket;

use app\common\Logger;
use app\common\model\DeviceModel;
use \GatewayWorker\Lib\Gateway;
use Workerman\Worker;

/**
 * Worker 命令行服务类
 */
class Events {

    const LOGGER = 'WS';

    /**
     * onConnect 事件回调
     * 当客户端连接上gateway进程时(TCP三次握手完毕时)触发
     *
     * @access public
     * @param int $client_id
     * @return void
     */
    public static function onConnect($client_id) {
        //echo '---------';
    }

    /**
     * onWebSocketConnect 事件回调
     * 当客户端连接上gateway完成websocket握手时触发
     *
     * @param integer $client_id 断开连接的客户端client_id
     * @param mixed $data
     * @return void
     */
    public static function onWebSocketConnect($clientId, $data) {
        try {
            // 清除原会话数据
            Gateway::setSession($clientId, []);

            // 设置会话数据
            //Gateway::setSession($clientId, $client);

            Logger::_(static::LOGGER)->info('连接成功: {id}', [
                'id' => $clientId,
            ]);
        } catch (\Exception $ex) {
            Gateway::closeClient($clientId);

            Logger::_(static::LOGGER)->info('连接错误: {id}|{error}', [
                'id'    => $clientId,
                'error' => $ex->getMessage() . '<' . $ex->getCode() . '>',
            ]);
        }
    }

    /**
     * onMessage 事件回调
     * 当客户端发来数据(Gateway进程收到数据)后触发
     *
     * @access public
     * @param int $client_id
     * @param mixed $data
     * @return void
     */
    public static function onMessage($clientId, $data) {
        $json = @json_decode($data, TRUE);
        if (!empty($json)
                AND !empty($json['type'])
                AND is_array($json['data'])) {
            $session = Gateway::getSession($clientId);
            if (empty($session)) {
                throw new \Exception('获取SESSION失败: ' . $clientId);
            }

        } else {
            Gateway::closeClient($clientId);

            Logger::_(static::LOGGER)->error('消息错误: {id}|{data}', [
                'id'    => $clientId,
                'data'  => $data,
            ]);
        }
    }

    /**
     * onClose 事件回调 当用户断开连接时触发的方法
     *
     * @param integer $clientId 断开连接的客户端client_id
     * @return void
     */
    public static function onClose($clientId) {
        Gateway::setSession($clientId, []);
        Logger::_(static::LOGGER)->info('连接关闭: {id}', [
            'id' => $clientId,
        ]);
    }

    /**
     * onWorkerStart 事件回调
     * 当businessWorker进程启动时触发。每个进程生命周期内都只会触发一次
     *
     * @access public
     * @param \Workerman\Worker $businessWorker
     * @return void
     */
    public static function onWorkerStart(Worker $businessWorker) {
        Logger::_(static::LOGGER)->info('进程启动: {id}', [
            'id' => $businessWorker->id,
        ]);
    }

    /**
     * onWorkerStop 事件回调
     * 当businessWorker进程退出时触发。每个进程生命周期内都只会触发一次。
     *
     * @param \Workerman\Worker $businessWorker
     * @return void
     */
    public static function onWorkerStop(Worker $businessWorker) {
        Logger::_(static::LOGGER)->info('进程关闭: {id}', [
            'id' => $businessWorker->id,
        ]);
    }
}