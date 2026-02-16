<?php

namespace app\utils;

use MongoDB\Client;

/**
 * MongoDB 连接辅助工具类
 * 
 * 统一 MongoDB DSN 构建和客户端创建逻辑
 */
class MongoDBHelper
{
    /**
     * 构建 MongoDB DSN 连接字符串
     * 
     * @param array<string, mixed> $config 数据库配置
     * @return string DSN 字符串
     */
    public static function buildDsn(array $config): string
    {
        $host = $config['host'] ?? '192.168.1.106';
        $port = $config['port'] ?? 27017;
        $username = $config['username'] ?? '';
        $password = $config['password'] ?? '';
        $authSource = $config['auth_source'] ?? 'admin';
        
        if (!empty($username) && !empty($password)) {
            return "mongodb://{$username}:{$password}@{$host}:{$port}/{$authSource}";
        }
        
        return "mongodb://{$host}:{$port}";
    }
    
    /**
     * 创建 MongoDB 客户端
     * 
     * @param array<string, mixed> $config 数据库配置
     * @param array<string, mixed> $options 额外选项（可选）
     * @return Client MongoDB 客户端实例
     */
    public static function createClient(array $config, array $options = []): Client
    {
        $defaultOptions = [
            'connectTimeoutMS' => 5000,
            'socketTimeoutMS' => 5000,
        ];
        
        return new Client(
            self::buildDsn($config),
            array_merge($defaultOptions, $options)
        );
    }
}

