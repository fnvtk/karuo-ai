<?php

namespace app\utils;

use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;
use PhpAmqpLib\Channel\AMQPChannel;
use app\utils\LoggerHelper;

/**
 * 队列服务封装
 * 
 * 职责：
 * - 封装 RabbitMQ 连接和消息推送
 * - 提供统一的队列操作接口
 */
class QueueService
{
    private static ?AMQPStreamConnection $connection = null;
    private static ?AMQPChannel $channel = null;
    private static array $config = [];

    /**
     * 初始化连接（单例模式）
     */
    private static function initConnection(): void
    {
        if (self::$connection !== null && self::$connection->isConnected()) {
            return;
        }

        $config = config('queue.connections.rabbitmq');
        self::$config = $config;

        try {
            self::$connection = new AMQPStreamConnection(
                $config['host'],
                $config['port'],
                $config['user'],
                $config['password'],
                $config['vhost'],
                false, // insist
                'AMQPLAIN', // login_method
                null, // login_response
                'en_US', // locale
                $config['timeout'] ?? 10.0, // connection_timeout
                $config['timeout'] ?? 10.0, // read_write_timeout
                null, // context
                false, // keepalive
                $config['heartbeat'] ?? 0 // heartbeat
            );

            self::$channel = self::$connection->channel();

            // 声明数据同步交换机
            if (isset($config['exchanges']['data_sync'])) {
                $exchangeConfig = $config['exchanges']['data_sync'];
                self::$channel->exchange_declare(
                    $exchangeConfig['name'],
                    $exchangeConfig['type'],
                    false, // passive
                    $exchangeConfig['durable'],
                    $exchangeConfig['auto_delete']
                );
            }

            // 声明标签计算交换机
            if (isset($config['exchanges']['tag_calculation'])) {
                $exchangeConfig = $config['exchanges']['tag_calculation'];
                self::$channel->exchange_declare(
                    $exchangeConfig['name'],
                    $exchangeConfig['type'],
                    false, // passive
                    $exchangeConfig['durable'],
                    $exchangeConfig['auto_delete']
                );
            }

            // 声明队列
            if (isset($config['queues']['tag_calculation'])) {
                $queueConfig = $config['queues']['tag_calculation'];
                self::$channel->queue_declare(
                    $queueConfig['name'],
                    false, // passive
                    $queueConfig['durable'],
                    false, // exclusive
                    $queueConfig['auto_delete'],
                    false, // nowait
                    $queueConfig['arguments'] ?? []
                );

                // 绑定队列到交换机
                if (isset($config['routing_keys']['tag_calculation'])) {
                    self::$channel->queue_bind(
                        $queueConfig['name'],
                        $config['exchanges']['tag_calculation']['name'],
                        $config['routing_keys']['tag_calculation']
                    );
                }
            }

            LoggerHelper::logBusiness('queue_connection_established', [
                'host' => $config['host'],
                'port' => $config['port'],
            ]);
        } catch (\Throwable $e) {
            LoggerHelper::logError($e, [
                'component' => 'QueueService',
                'action' => 'initConnection',
            ]);
            throw $e;
        }
    }

    /**
     * 推送消息到数据同步队列
     * 
     * @param array<string, mixed> $data 消息数据（包含数据源ID、数据记录等）
     * @return bool 是否推送成功
     */
    public static function pushDataSync(array $data): bool
    {
        try {
            self::initConnection();

            $config = self::$config;
            $messageConfig = config('queue.message', []);
            
            $messageBody = json_encode($data, JSON_UNESCAPED_UNICODE);
            $message = new AMQPMessage(
                $messageBody,
                [
                    'delivery_mode' => $messageConfig['delivery_mode'] ?? AMQPMessage::DELIVERY_MODE_PERSISTENT,
                    'content_type' => $messageConfig['content_type'] ?? 'application/json',
                ]
            );

            $exchangeName = $config['exchanges']['data_sync']['name'];
            $routingKey = $config['routing_keys']['data_sync'];

            self::$channel->basic_publish($message, $exchangeName, $routingKey);

            LoggerHelper::logBusiness('queue_message_pushed', [
                'queue' => 'data_sync',
                'data' => $data,
            ]);

            return true;
        } catch (\Throwable $e) {
            LoggerHelper::logError($e, [
                'component' => 'QueueService',
                'action' => 'pushDataSync',
                'data' => $data,
            ]);
            return false;
        }
    }

    /**
     * 推送消息到标签计算队列
     * 
     * @param array<string, mixed> $data 消息数据
     * @return bool 是否推送成功
     */
    public static function pushTagCalculation(array $data): bool
    {
        try {
            self::initConnection();

            $config = self::$config;
            $messageConfig = config('queue.message', []);
            
            $messageBody = json_encode($data, JSON_UNESCAPED_UNICODE);
            $message = new AMQPMessage(
                $messageBody,
                [
                    'delivery_mode' => $messageConfig['delivery_mode'] ?? AMQPMessage::DELIVERY_MODE_PERSISTENT,
                    'content_type' => $messageConfig['content_type'] ?? 'application/json',
                ]
            );

            $exchangeName = $config['exchanges']['tag_calculation']['name'];
            $routingKey = $config['routing_keys']['tag_calculation'];

            self::$channel->basic_publish($message, $exchangeName, $routingKey);

            LoggerHelper::logBusiness('queue_message_pushed', [
                'queue' => 'tag_calculation',
                'data' => $data,
            ]);

            return true;
        } catch (\Throwable $e) {
            LoggerHelper::logError($e, [
                'component' => 'QueueService',
                'action' => 'pushTagCalculation',
                'data' => $data,
            ]);
            return false;
        }
    }

    /**
     * 关闭连接
     */
    public static function closeConnection(): void
    {
        try {
            if (self::$channel !== null) {
                self::$channel->close();
                self::$channel = null;
            }
            if (self::$connection !== null && self::$connection->isConnected()) {
                self::$connection->close();
                self::$connection = null;
            }
        } catch (\Throwable $e) {
            LoggerHelper::logError($e, [
                'component' => 'QueueService',
                'action' => 'closeConnection',
            ]);
        }
    }

    /**
     * 获取通道（用于消费者）
     * 
     * @return AMQPChannel
     */
    public static function getChannel(): AMQPChannel
    {
        self::initConnection();
        return self::$channel;
    }

    /**
     * 获取连接（用于消费者）
     * 
     * @return AMQPStreamConnection
     */
    public static function getConnection(): AMQPStreamConnection
    {
        self::initConnection();
        return self::$connection;
    }
}

