<?php

namespace support\bootstrap;

use Webman\Bootstrap;
use Workerman\Worker;
use MongoDB\Laravel\Connection;
use Illuminate\Database\Capsule\Manager as Capsule;
use Illuminate\Database\ConnectionResolverInterface;

/**
 * MongoDB 连接初始化 Bootstrap
 * 
 * 用于初始化 MongoDB Laravel 包的数据库连接管理器
 */
class MongoDB implements Bootstrap
{
    public static function start(?Worker $worker): void
    {
        $dbConfig = config('database', []);
        
        if (isset($dbConfig['connections']['mongodb'])) {
            $mongoConfig = $dbConfig['connections']['mongodb'];
            
            // 构建包含认证信息的 DSN
            $dsn = $mongoConfig['dsn'];
            if (!empty($mongoConfig['username']) && !empty($mongoConfig['password'])) {
                if (strpos($dsn, '@') === false) {
                    $dsn = str_replace(
                        'mongodb://',
                        'mongodb://' . urlencode($mongoConfig['username']) . ':' . urlencode($mongoConfig['password']) . '@',
                        $dsn
                    );
                    $dsn .= '/' . $mongoConfig['database'];
                    if (!empty($mongoConfig['options']['authSource'])) {
                        $dsn .= '?authSource=' . urlencode($mongoConfig['options']['authSource']);
                    }
                }
            }
            
            // 过滤掉空字符串的选项
            $options = array_filter($mongoConfig['options'] ?? [], function ($value) {
                return $value !== '';
            });
            
            // 初始化 MongoDB Laravel 连接管理器
            // 创建 Capsule 实例
            $capsule = new Capsule();
            
            // 注册 MongoDB 连接工厂
            // MongoDB Laravel 包使用 'mongodb' 驱动，需要注册连接解析器
            $capsule->getDatabaseManager()->extend('mongodb', function ($config, $name) {
                $config['name'] = $name;
                return new Connection($config);
            });
            
            // 添加 MongoDB 连接
            $capsule->addConnection([
                'driver' => 'mongodb',
                'dsn' => $dsn,
                'database' => $mongoConfig['database'],
                'options' => $options,
            ], 'mongodb');
            
            // 设置为全局连接管理器
            $capsule->setAsGlobal();
            
            // 启动 Eloquent ORM
            $capsule->bootEloquent();
        }
    }
}

