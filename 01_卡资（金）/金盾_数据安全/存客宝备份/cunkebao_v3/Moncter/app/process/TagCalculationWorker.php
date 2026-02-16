<?php

namespace app\process;

use Workerman\Worker;
use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Channel\AMQPChannel;
use PhpAmqpLib\Message\AMQPMessage;
use app\utils\QueueService;
use app\service\TagService;
use app\repository\TagDefinitionRepository;
use app\repository\UserProfileRepository;
use app\repository\UserTagRepository;
use app\repository\TagHistoryRepository;
use app\service\TagRuleEngine\SimpleRuleEngine;
use app\utils\LoggerHelper;

/**
 * 标签计算 Worker
 * 
 * 职责：
 * - 消费 RabbitMQ 队列中的标签计算消息
 * - 异步触发标签计算
 * - 处理计算失败和重试
 */
class TagCalculationWorker
{
    private ?AMQPStreamConnection $connection = null;
    private ?AMQPChannel $channel = null;
    private array $config = [];

    public function __construct()
    {
        // 构造函数，Workerman 会自动调用
    }

    public function onWorkerStart(Worker $worker): void
    {
        // 设置内存限制（512MB），避免内存溢出
        ini_set('memory_limit', '512M');
        
        $this->config = config('queue.connections.rabbitmq', []);
        
        // 使用 Timer 延迟初始化，避免阻塞 Worker 启动
        \Workerman\Timer::add(0, function () use ($worker) {
            $this->initConnection($worker);
        }, [], false);
    }

    /**
     * 初始化 RabbitMQ 连接
     * 
     * @param Worker $worker Worker 实例
     * @return void
     */
    private function initConnection(Worker $worker): void
    {
        static $retryCount = 0;
        $maxRetries = 10;
        $retryInterval = 5;

        try {
            // 清理之前的连接
            $this->closeConnection();

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
            $queueConfig = $this->config['queues']['tag_calculation'];
            $this->channel->queue_declare(
                $queueConfig['name'],
                false, // passive
                $queueConfig['durable'],
                false, // exclusive
                $queueConfig['auto_delete'],
                false, // nowait
                $queueConfig['arguments'] ?? []
            );

            // 设置 QoS（每次只处理一条消息）
            $consumerConfig = config('queue.consumer.tag_calculation', []);
            $this->channel->basic_qos(
                null, // prefetch_size
                $consumerConfig['prefetch_count'] ?? 1, // prefetch_count
                false // global
            );

            // 开始消费消息
            $this->channel->basic_consume(
                $queueConfig['name'],
                '', // consumer_tag
                false, // no_local
                $consumerConfig['no_ack'] ?? false, // no_ack
                false, // exclusive
                false, // nowait
                [$this, 'processMessage'] // callback
            );

            LoggerHelper::logBusiness('tag_calculation_worker_started', [
                'queue' => $queueConfig['name'],
                'worker_id' => $worker->id,
            ]);

            // 重置重试计数
            $retryCount = 0;

            // 监听消息（使用 Timer 定期检查，避免阻塞）
            \Workerman\Timer::add(0.1, function () use ($worker) {
                if ($this->channel && $this->channel->is_consuming()) {
                    try {
                        // 非阻塞方式检查消息
                        $this->channel->wait(null, false, 0); // timeout 0，非阻塞
                    } catch (\PhpAmqpLib\Exception\AMQPTimeoutException $e) {
                        // 超时是正常的，继续等待
                        return;
                    } catch (\Throwable $e) {
                        LoggerHelper::logError($e, [
                            'component' => 'TagCalculationWorker',
                            'action' => 'channel_wait',
                        ]);
                        // 连接断开，重新初始化（使用当前 Worker）
                        $currentWorker = \Workerman\Worker::getCurrentWorker();
                        if ($currentWorker) {
                            $this->initConnection($currentWorker);
                        }
                    }
                }
            }, [], true); // 持续执行

        } catch (\Throwable $e) {
            LoggerHelper::logError($e, [
                'component' => 'TagCalculationWorker',
                'action' => 'initConnection',
                'retry_count' => $retryCount,
            ]);
            
            // 重试连接（最多重试10次）
            if ($retryCount < $maxRetries) {
                $retryCount++;
                \Workerman\Timer::add($retryInterval, function () use ($worker) {
                    $this->initConnection($worker);
                }, [], false);
            } else {
                LoggerHelper::logError(new \RuntimeException("RabbitMQ 连接失败，已达到最大重试次数"), [
                    'component' => 'TagCalculationWorker',
                    'action' => 'initConnection',
                    'max_retries' => $maxRetries,
                ]);
            }
        }
    }

    /**
     * 关闭连接
     * 
     * @return void
     */
    private function closeConnection(): void
    {
        try {
            if ($this->channel !== null) {
                $this->channel->close();
                $this->channel = null;
            }
            if ($this->connection !== null && $this->connection->isConnected()) {
                $this->connection->close();
                $this->connection = null;
            }
        } catch (\Throwable $e) {
            LoggerHelper::logError($e, [
                'component' => 'TagCalculationWorker',
                'action' => 'closeConnection',
            ]);
        }
    }

    /**
     * 处理消息
     * 
     * @param AMQPMessage $message
     */
    public function processMessage(AMQPMessage $message): void
    {
        $startTime = microtime(true);
        $deliveryTag = $message->getDeliveryTag();
        
        try {
            // 解析消息
            $body = $message->getBody();
            $data = json_decode($body, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new \InvalidArgumentException('消息格式错误: ' . json_last_error_msg());
            }

            // 验证必要字段
            if (empty($data['user_id'])) {
                throw new \InvalidArgumentException('消息缺少 user_id 字段');
            }

            $userId = (string)$data['user_id'];
            $tagIds = $data['tag_ids'] ?? null;
            $triggerType = $data['trigger_type'] ?? 'consumption_record';
            $recordId = $data['record_id'] ?? null;

            LoggerHelper::logBusiness('tag_calculation_message_received', [
                'user_id' => $userId,
                'tag_ids' => $tagIds,
                'trigger_type' => $triggerType,
                'record_id' => $recordId,
            ]);

            // 创建 TagService 实例
            $tagService = new TagService(
                new TagDefinitionRepository(),
                new UserProfileRepository(),
                new UserTagRepository(),
                new TagHistoryRepository(),
                new SimpleRuleEngine()
            );

            // 执行标签计算
            $tags = $tagService->calculateTags($userId, $tagIds);

            $duration = microtime(true) - $startTime;
            LoggerHelper::logBusiness('tag_calculation_completed', [
                'user_id' => $userId,
                'updated_count' => count($tags),
                'duration' => $duration,
            ]);
            LoggerHelper::logPerformance('tag_calculation_async', $duration, [
                'user_id' => $userId,
                'tag_count' => count($tags),
            ]);

            // 确认消息（只有在 no_ack = false 时才需要）
            $consumerConfig = config('queue.consumer.tag_calculation', []);
            if (!($consumerConfig['no_ack'] ?? false)) {
                $message->ack();
            }
        } catch (\Throwable $e) {
            $duration = microtime(true) - $startTime;
            
            LoggerHelper::logError($e, [
                'component' => 'TagCalculationWorker',
                'action' => 'processMessage',
                'delivery_tag' => $deliveryTag,
                'duration' => $duration,
            ]);

            // 根据错误类型决定是否重试
            // 如果是业务逻辑错误（如用户不存在），直接确认消息，不重试
            // 如果是系统错误（如数据库连接失败），可以重试
            if ($e instanceof \InvalidArgumentException) {
                // 业务逻辑错误，确认消息，不重试
                $consumerConfig = config('queue.consumer.tag_calculation', []);
                if (!($consumerConfig['no_ack'] ?? false)) {
                    $message->ack();
                }
            } else {
                // 系统错误，拒绝消息并重新入队（重试）
                $message->nack(false, true); // requeue = true
            }
        }
    }

    public function onWorkerStop(Worker $worker): void
    {
        $this->closeConnection();

        LoggerHelper::logBusiness('tag_calculation_worker_stopped', [
            'worker_id' => $worker->id,
        ]);
    }
}

