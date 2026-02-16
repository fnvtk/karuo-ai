<?php

namespace app\controller;

use support\Request;

class IndexController
{
    public function index(Request $request)
    {
        return "我是数据中心，有何贵干？";
    }

    public function view(Request $request)
    {
        return view('index/view', ['name' => 'webman']);
    }

    public function json(Request $request)
    {
        return json(['code' => 0, 'msg' => 'ok']);
    }

    /**
     * 测试 MongoDB 数据库连接
     * GET /api/test/db
     */
    public function testDb(Request $request)
    {
        $result = [
            'code' => 0,
            'msg' => 'ok',
            'data' => [
                'config' => [],
                'connection' => [],
                'test_query' => [],
            ],
        ];

        try {
            // 读取数据库配置
            $dbConfig = config('database', []);
            $mongoConfig = $dbConfig['connections']['mongodb'] ?? null;

            if (!$mongoConfig) {
                throw new \Exception('MongoDB 配置不存在');
            }

            $result['data']['config'] = [
                'driver' => $mongoConfig['driver'] ?? 'unknown',
                'database' => $mongoConfig['database'] ?? 'unknown',
                'dsn' => $mongoConfig['dsn'] ?? 'unknown',
                'has_username' => !empty($mongoConfig['username']),
                'has_password' => !empty($mongoConfig['password']),
            ];

            // 尝试使用 MongoDB 客户端直接连接
            try {
                // 构建包含认证信息的 DSN（如果配置了用户名和密码）
                $dsn = $mongoConfig['dsn'];
                if (!empty($mongoConfig['username']) && !empty($mongoConfig['password'])) {
                    // 如果 DSN 中不包含认证信息，则添加
                    if (strpos($dsn, '@') === false) {
                        // 从 mongodb://host:port 格式转换为 mongodb://username:password@host:port/database
                        $dsn = str_replace(
                            'mongodb://',
                            'mongodb://' . urlencode($mongoConfig['username']) . ':' . urlencode($mongoConfig['password']) . '@',
                            $dsn
                        );
                        // 添加数据库名和认证源
                        $dsn .= '/' . $mongoConfig['database'];
                        if (!empty($mongoConfig['options']['authSource'])) {
                            $dsn .= '?authSource=' . urlencode($mongoConfig['options']['authSource']);
                        }
                    }
                }

                // 过滤掉空字符串的选项（MongoDB 客户端不允许空字符串）
                $options = array_filter($mongoConfig['options'] ?? [], function ($value) {
                    return $value !== '';
                });

                $client = new \MongoDB\Client(
                    $dsn,
                    $options
                );

                // 尝试执行 ping 命令
                $adminDb = $client->selectDatabase('admin');
                $pingResult = $adminDb->command(['ping' => 1])->toArray();
                
                $result['data']['connection'] = [
                    'status' => 'connected',
                    'ping' => 'ok',
                    'server_info' => $client->getManager()->getServers(),
                ];

                // 尝试选择目标数据库并列出集合
                $targetDb = $client->selectDatabase($mongoConfig['database']);
                $collections = $targetDb->listCollections();
                $collectionNames = [];
                foreach ($collections as $collection) {
                    $collectionNames[] = $collection->getName();
                }

                $result['data']['test_query'] = [
                    'database' => $mongoConfig['database'],
                    'collections_count' => count($collectionNames),
                    'collections' => $collectionNames,
                ];

            } catch (\MongoDB\Driver\Exception\Exception $e) {
                $result['data']['connection'] = [
                    'status' => 'failed',
                    'error' => $e->getMessage(),
                    'code' => $e->getCode(),
                ];
                $result['code'] = 500;
                $result['msg'] = 'MongoDB 连接失败';
            }

            // 尝试使用 Repository 查询（如果连接成功）
            if ($result['data']['connection']['status'] === 'connected') {
                try {
                    $userRepo = new \app\repository\UserProfileRepository();
                    $count = $userRepo->newQuery()->count();
                    $result['data']['repository_test'] = [
                        'status' => 'ok',
                        'user_profile_count' => $count,
                    ];
                } catch (\Throwable $e) {
                    $result['data']['repository_test'] = [
                        'status' => 'failed',
                        'error' => $e->getMessage(),
                    ];
                }
            }

        } catch (\Throwable $e) {
            $result = [
                'code' => 500,
                'msg' => '测试失败: ' . $e->getMessage(),
                'data' => [
                    'error' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                ],
            ];
        }

        return json($result);
    }

}
