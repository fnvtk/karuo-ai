<?php

namespace app\utils;

use Predis\Client;
use app\utils\LoggerHelper;

/**
 * Redis 工具类
 * 
 * 职责：
 * - 封装 Redis 连接和基础操作
 * - 提供分布式锁功能
 */
class RedisHelper
{
    private static ?Client $client = null;
    private static array $config = [];

    /**
     * 获取 Redis 客户端（单例模式）
     * 
     * @return Client Redis 客户端
     */
    public static function getClient(): Client
    {
        if (self::$client !== null) {
            return self::$client;
        }

        // 从 session 配置中读取 Redis 配置（临时方案，后续可创建独立的 cache.php）
        $sessionConfig = config('session.config.redis', []);
        
        self::$config = [
            'host' => $sessionConfig['host'] ?? getenv('REDIS_HOST') ?: '127.0.0.1',
            'port' => (int)($sessionConfig['port'] ?? getenv('REDIS_PORT') ?: 6379),
            'password' => $sessionConfig['auth'] ?? getenv('REDIS_PASSWORD') ?: null,
            'database' => (int)($sessionConfig['database'] ?? getenv('REDIS_DATABASE') ?: 0),
            'timeout' => $sessionConfig['timeout'] ?? 2.0,
        ];

        $parameters = [
            'host' => self::$config['host'],
            'port' => self::$config['port'],
        ];

        if (!empty(self::$config['password'])) {
            $parameters['password'] = self::$config['password'];
        }

        if (self::$config['database'] > 0) {
            $parameters['database'] = self::$config['database'];
        }

        $options = [
            'timeout' => self::$config['timeout'],
        ];

        self::$client = new Client($parameters, $options);

        // 测试连接
        try {
            self::$client->ping();
            LoggerHelper::logBusiness('redis_connected', [
                'host' => self::$config['host'],
                'port' => self::$config['port'],
            ]);
        } catch (\Throwable $e) {
            LoggerHelper::logError($e, [
                'component' => 'RedisHelper',
                'action' => 'getClient',
            ]);
            throw $e;
        }

        return self::$client;
    }

    /**
     * 获取分布式锁
     * 
     * @param string $key 锁的键
     * @param int $ttl 锁的过期时间（秒）
     * @param int $retryTimes 重试次数
     * @param int $retryDelay 重试延迟（毫秒）
     * @return bool 是否获取成功
     */
    public static function acquireLock(string $key, int $ttl = 300, int $retryTimes = 3, int $retryDelay = 1000): bool
    {
        $client = self::getClient();
        $lockKey = "lock:{$key}";
        $lockValue = uniqid(gethostname() . '_', true); // 唯一值，用于安全释放锁

        for ($i = 0; $i <= $retryTimes; $i++) {
            // 尝试获取锁（SET key value NX EX ttl）
            $result = $client->set($lockKey, $lockValue, 'EX', $ttl, 'NX');

            if ($result) {
                LoggerHelper::logBusiness('redis_lock_acquired', [
                    'key' => $key,
                    'ttl' => $ttl,
                ]);
                return true;
            }

            // 如果还有重试机会，等待后重试
            if ($i < $retryTimes) {
                usleep($retryDelay * 1000); // 转换为微秒
            }
        }

        LoggerHelper::logBusiness('redis_lock_failed', [
            'key' => $key,
            'retry_times' => $retryTimes,
        ]);

        return false;
    }

    /**
     * 释放分布式锁
     * 
     * @param string $key 锁的键
     * @return bool 是否释放成功
     */
    public static function releaseLock(string $key): bool
    {
        $client = self::getClient();
        $lockKey = "lock:{$key}";

        try {
            $result = $client->del([$lockKey]);
            
            if ($result > 0) {
                LoggerHelper::logBusiness('redis_lock_released', [
                    'key' => $key,
                ]);
                return true;
            }

            return false;
        } catch (\Throwable $e) {
            LoggerHelper::logError($e, [
                'component' => 'RedisHelper',
                'action' => 'releaseLock',
                'key' => $key,
            ]);
            return false;
        }
    }

    /**
     * 设置键值对
     * 
     * @param string $key 键
     * @param mixed $value 值
     * @param int|null $ttl 过期时间（秒），null 表示不过期
     * @return bool 是否设置成功
     */
    public static function set(string $key, $value, ?int $ttl = null): bool
    {
        try {
            $client = self::getClient();
            $serialized = is_string($value) ? $value : json_encode($value, JSON_UNESCAPED_UNICODE);

            if ($ttl !== null) {
                $client->setex($key, $ttl, $serialized);
            } else {
                $client->set($key, $serialized);
            }

            return true;
        } catch (\Throwable $e) {
            LoggerHelper::logError($e, [
                'component' => 'RedisHelper',
                'action' => 'set',
                'key' => $key,
            ]);
            return false;
        }
    }

    /**
     * 获取键值
     * 
     * @param string $key 键
     * @return mixed 值，不存在返回 null
     */
    public static function get(string $key)
    {
        try {
            $client = self::getClient();
            $value = $client->get($key);

            if ($value === null) {
                return null;
            }

            // 尝试 JSON 解码
            $decoded = json_decode($value, true);
            return $decoded !== null ? $decoded : $value;
        } catch (\Throwable $e) {
            LoggerHelper::logError($e, [
                'component' => 'RedisHelper',
                'action' => 'get',
                'key' => $key,
            ]);
            return null;
        }
    }

    /**
     * 删除键
     * 
     * @param string $key 键
     * @return bool 是否删除成功
     */
    public static function delete(string $key): bool
    {
        try {
            $client = self::getClient();
            $result = $client->del([$key]);
            return $result > 0;
        } catch (\Throwable $e) {
            LoggerHelper::logError($e, [
                'component' => 'RedisHelper',
                'action' => 'delete',
                'key' => $key,
            ]);
            return false;
        }
    }

    /**
     * 检查键是否存在
     * 
     * @param string $key 键
     * @return bool 是否存在
     */
    public static function exists(string $key): bool
    {
        try {
            $client = self::getClient();
            $result = $client->exists($key);
            return $result > 0;
        } catch (\Throwable $e) {
            LoggerHelper::logError($e, [
                'component' => 'RedisHelper',
                'action' => 'exists',
                'key' => $key,
            ]);
            return false;
        }
    }

    /**
     * 删除键（别名，兼容del方法）
     * 
     * @param string $key 键
     * @return bool 是否删除成功
     */
    public static function del(string $key): bool
    {
        return self::delete($key);
    }
}

