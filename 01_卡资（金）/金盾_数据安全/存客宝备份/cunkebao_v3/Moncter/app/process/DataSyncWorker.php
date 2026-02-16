<?php

namespace app\process;

use Workerman\Worker;
use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Channel\AMQPChannel;
use PhpAmqpLib\Message\AMQPMessage;
use app\service\DataSyncService;
use app\repository\ConsumptionRecordRepository;
use app\repository\UserProfileRepository;
use app\utils\LoggerHelper;

/**
 * 数据同步 Worker
 * 
 * 职责：
 * - 消费 RabbitMQ 队列中的数据同步消息
 * - 调用 DataSyncService 同步数据到 MongoDB
 * - 处理同步失败和重试
 */
class DataSyncWorker
{
    private ?AMQPStreamConnection $connection = null;
    private ?AMQPChannel $channel = null;
    private array $config = [];
    private ?DataSyncService $dataSyncService = null;

    public function onWorkerStart(Worker $worker): void
    {
        $this->config = config('queue.connections.rabbitmq', []);

        // 初始化 DataSyncService
        $this->dataSyncService = new DataSyncService(
            new ConsumptionRecordRepository(),
            new UserProfileRepository()
        );

        try {
            // 建立 RabbitMQ 连接
            $this->connection = new AMQPStreamConnection(
                $this->config['host'],
                $this->config['port'],
                $this->config['user'],
                $this->config['password'],
                $this->config['vhost'],
                false, // insist
                'AMQPLAIN', // login_method
                null, // login_response
                'en_US', // locale
                $this->config['timeout'] ?? 10.0, // connection_timeout
                $this->config['timeout'] ?? 10.0, // read_write_timeout
                null, // context
                false, // keepalive
                $this->config['heartbeat'] ?? 0 // heartbeat
            );

            $this->channel = $this->connection->channel();

            // 声明队列（确保队列存在）
            $queueConfig = $this->config['queues']['data_sync'];
            $this->channel->queue_declare(
                $queueConfig['name'],
                false, // passive
                $queueConfig['durable'],
                false, // exclusive
                $queueConfig['auto_delete'],
                false, // nowait
                $queueConfig['arguments'] ?? []
            );

            // 设置 QoS（批量处理）
            $consumerConfig = config('queue.consumer.data_sync', []);
            $this->channel->basic_qos(
                null, // prefetch_size
                $consumerConfig['prefetch_count'] ?? 10, // prefetch_count（每次处理10条消息）
                false // global
            );

            // 注册消费者回调
            $this->channel->basic_consume(
                $queueConfig['name'],
                '', // consumer_tag
                false, // no_local
                false, // no_ack - 设为 false，手动确认
                false, // exclusive
                false, // nowait
                [$this, 'processMessage']
            );

            LoggerHelper::logBusiness('data_sync_worker_started', [
                'worker_id' => $worker->id,
            ]);

            // 循环消费消息
            while ($this->channel->is_consuming()) {
                $this->channel->wait();
            }
        } catch (\Throwable $e) {
            LoggerHelper::logError($e, [
                'component' => 'DataSyncWorker',
                'action' => 'onWorkerStart',
                'worker_id' => $worker->id,
            ]);
            $this->closeConnection();
        }
    }

    /**
     * 处理 RabbitMQ 消息
     * 
     * @param AMQPMessage $msg 消息对象
     * @return void
     */
    public function processMessage(AMQPMessage $msg): void
    {
        $payload = json_decode($msg->getBody(), true);
        $sourceId = $payload['source_id'] ?? 'unknown';
        $dataCount = count($payload['data'] ?? []);

        if (empty($payload['data'])) {
            LoggerHelper::logBusiness('data_sync_message_empty', [
                'source_id' => $sourceId,
            ]);
            $msg->ack(); // 确认消息，不再重试
            return;
        }

        LoggerHelper::logBusiness('processing_data_sync_message', [
            'source_id' => $sourceId,
            'data_count' => $dataCount,
            'worker_id' => Worker::getCurrentWorker()->id,
        ]);

        try {
            // 调用数据同步服务
            $result = $this->dataSyncService->syncData($payload);

            if ($result['success']) {
                $msg->ack(); // 成功处理，发送 ACK
                LoggerHelper::logBusiness('data_sync_message_processed', [
                    'source_id' => $sourceId,
                    'synced_count' => $result['synced_count'],
                    'skipped_count' => $result['skipped_count'],
                ]);
            } else {
                // 处理失败，但不重试（避免重复数据）
                $msg->ack();
                LoggerHelper::logError(new \RuntimeException("数据同步失败"), [
                    'component' => 'DataSyncWorker',
                    'action' => 'processMessage',
                    'source_id' => $sourceId,
                    'result' => $result,
                ]);
            }
        } catch (\Throwable $e) {
            LoggerHelper::logError($e, [
                'component' => 'DataSyncWorker',
                'action' => 'processMessage',
                'source_id' => $sourceId,
                'payload' => $payload,
                'worker_id' => Worker::getCurrentWorker()->id,
            ]);

            // 业务错误不重试，直接 ACK（避免重复数据）
            // 系统错误（如数据库连接断开）可以考虑重试，这里简化处理为直接 ACK
            $msg->ack();
            // 如果需要重试，可以 basic_reject($msg->delivery_info['delivery_tag'], true);
            // 或者推送到死信队列
        }
    }

    /**
     * Worker 停止时关闭连接
     * 
     * @param Worker $worker Worker 实例
     * @return void
     */
    public function onWorkerStop(Worker $worker): void
    {
        LoggerHelper::logBusiness('data_sync_worker_stopping', [
            'worker_id' => $worker->id,
        ]);
        $this->closeConnection();
    }

    /**
     * 关闭 RabbitMQ 连接和通道
     * 
     * @return void
     */
    private function closeConnection(): void
    {
        try {
            if ($this->channel) {
                $this->channel->close();
            }
            if ($this->connection && $this->connection->isConnected()) {
                $this->connection->close();
            }
        } catch (\Throwable $e) {
            LoggerHelper::logError($e, [
                'component' => 'DataSyncWorker',
                'action' => 'closeConnection',
            ]);
        } finally {
            $this->channel = null;
            $this->connection = null;
        }
    }
}

