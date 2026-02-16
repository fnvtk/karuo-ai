<?php

namespace app\controller;

use app\service\DatabaseSyncService;
use app\utils\ApiResponseHelper;
use support\Request;
use support\Response;

/**
 * 数据库同步控制器
 * 
 * 提供同步进度查询接口
 */
class DatabaseSyncController
{
    /**
     * 获取同步进度看板页面
     * 
     * GET /database-sync/dashboard
     */
    public function dashboard(Request $request): Response
    {
        $htmlPath = __DIR__ . '/../../public/database-sync-dashboard.html';
        if (!file_exists($htmlPath)) {
            return response('<h1>404 Not Found</h1><p>看板页面不存在</p>', 404)
                ->withHeader('Content-Type', 'text/html; charset=utf-8');
        }
        
        $html = file_get_contents($htmlPath);
        return response($html)->withHeader('Content-Type', 'text/html; charset=utf-8');
    }

    /**
     * 获取同步进度
     * 
     * GET /api/database-sync/progress
     */
    public function progress(Request $request): Response
    {
        try {
            // 创建 DatabaseSyncService 实例（传递最小配置，仅用于读取进度）
            // 注意：数据库同步功能已迁移到 data_collection_tasks.php，这里仅用于查询进度
            $minimalConfig = [
                'source' => ['host' => '', 'port' => 27017], // 占位符，不会实际连接
                'target' => ['host' => '', 'port' => 27017], // 占位符，不会实际连接
                'sync' => [],
                'monitoring' => [],
            ];
            $syncService = new DatabaseSyncService($minimalConfig);
            // 加载最新进度
            $syncService->loadProgress();
            $progress = $syncService->getProgress();
            
            // 获取多进程状态信息
            $workerStatus = $this->getWorkerStatus();
            $progress['worker_status'] = $workerStatus;
            
            // 获取数据库连接状态
            $connectionStatus = $this->getConnectionStatus();
            $progress['connection_status'] = $connectionStatus;
            
            // 获取数据库列表信息（已完成和待同步）
            $databaseList = $this->getDatabaseList($syncService);
            $progress['database_list'] = $databaseList;
            
            // 检查进度文件最后修改时间
            $runtimePath = function_exists('runtime_path') ? runtime_path() : (config('app.runtime_path', base_path() . DIRECTORY_SEPARATOR . 'runtime'));
            $progressFile = $runtimePath . DIRECTORY_SEPARATOR . 'database_sync_progress.json';
            if (file_exists($progressFile)) {
                $fileTime = filemtime($progressFile);
                $progress['progress_file_last_modified'] = date('Y-m-d H:i:s', $fileTime);
                $progress['progress_file_age_seconds'] = time() - $fileTime;
            } else {
                $progress['progress_file_last_modified'] = null;
                $progress['progress_file_age_seconds'] = null;
            }
            
            // 如果状态是idle且没有开始时间，尝试检查是否真的在运行
            if ($progress['status'] === 'idle' && $progress['time']['start_time'] === null) {
                if (!file_exists($progressFile)) {
                    $progress['hint'] = '请执行: php start.php status 查看 data_sync_scheduler 进程是否运行（数据库同步任务由 data_sync_scheduler 管理）';
                }
            }
            
            return ApiResponseHelper::success($progress, '同步进度查询成功');
        } catch (\Throwable $e) {
            return ApiResponseHelper::exception($e);
        }
    }
    
    /**
     * 获取 Worker 进程状态信息
     * 
     * @return array<string, mixed> Worker 状态信息
     */
    private function getWorkerStatus(): array
    {
        $status = [
            'total_workers' => 0,
            'active_workers' => 0,
            'workers' => [],
        ];
        
        try {
            // 从配置中获取 Worker 数量
            $processConfig = config('process.data_sync_scheduler', []);
            $totalWorkers = (int)($processConfig['count'] ?? 10);
            $status['total_workers'] = $totalWorkers;
            
            // 检查进度文件中的 checkpoints，推断每个 Worker 处理的数据库
            $runtimePath = function_exists('runtime_path') ? runtime_path() : (config('app.runtime_path', base_path() . DIRECTORY_SEPARATOR . 'runtime'));
            $progressFile = $runtimePath . DIRECTORY_SEPARATOR . 'database_sync_progress.json';
            
            if (file_exists($progressFile)) {
                // 使用文件锁读取，避免并发问题
                $fp = fopen($progressFile, 'r');
                if ($fp && flock($fp, LOCK_SH)) {
                    try {
                        $content = stream_get_contents($fp);
                        $progressData = json_decode($content, true);
                        
                        if ($progressData && isset($progressData['checkpoints'])) {
                            $checkpoints = $progressData['checkpoints'];
                            $databases = array_keys($checkpoints);
                            
                            // 根据数据库分配推断每个 Worker 的状态（使用取模分配）
                            foreach ($databases as $index => $database) {
                                $workerId = $index % $totalWorkers;
                                if (!isset($status['workers'][$workerId])) {
                                    $status['workers'][$workerId] = [
                                        'worker_id' => $workerId,
                                        'databases' => [],
                                        'collections' => 0,
                                        'documents_processed' => 0,
                                        'status' => 'active',
                                    ];
                                }
                                
                                $status['workers'][$workerId]['databases'][] = $database;
                                
                                // 统计该 Worker 处理的集合和文档数
                                if (isset($checkpoints[$database]) && is_array($checkpoints[$database])) {
                                    foreach ($checkpoints[$database] as $collection => $checkpoint) {
                                        $status['workers'][$workerId]['collections']++;
                                        if (isset($checkpoint['processed'])) {
                                            $status['workers'][$workerId]['documents_processed'] += (int)$checkpoint['processed'];
                                        }
                                    }
                                }
                            }
                            
                            $status['active_workers'] = count($status['workers']);
                            
                            // 将 workers 数组转换为索引数组（便于前端遍历）
                            $status['workers'] = array_values($status['workers']);
                        }
                    } finally {
                        flock($fp, LOCK_UN);
                        fclose($fp);
                    }
                } else {
                    if ($fp) {
                        fclose($fp);
                    }
                }
            }
            
            // 如果没有活动的 Worker，但配置了 Worker 数量，显示所有 Worker（等待状态）
            if ($status['active_workers'] === 0 && $status['total_workers'] > 0) {
                // 创建所有 Worker 的占位信息
                for ($i = 0; $i < $totalWorkers; $i++) {
                    $status['workers'][] = [
                        'worker_id' => $i,
                        'databases' => [],
                        'collections' => 0,
                        'documents_processed' => 0,
                        'status' => 'waiting', // 等待状态
                    ];
                }
                $status['message'] = '所有 Worker 处于等待状态，同步尚未开始或进度文件为空';
            } elseif ($status['total_workers'] === 0) {
                $status['message'] = '未配置 Worker 数量，请检查 config/process.php';
            }
            
        } catch (\Throwable $e) {
            $status['error'] = '获取 Worker 状态失败: ' . $e->getMessage();
        }
        
        return $status;
    }

    /**
     * 获取同步统计信息
     * 
     * GET /api/database-sync/stats
     */
    public function stats(Request $request): Response
    {
        try {
            // 创建 DatabaseSyncService 实例（传递最小配置，仅用于读取统计）
            $minimalConfig = [
                'source' => ['host' => '', 'port' => 27017],
                'target' => ['host' => '', 'port' => 27017],
            ];
            $syncService = new DatabaseSyncService($minimalConfig);
            $stats = $syncService->getStats();
            
            return ApiResponseHelper::success($stats, '统计信息查询成功');
        } catch (\Throwable $e) {
            return ApiResponseHelper::exception($e);
        }
    }

    /**
     * 重置同步进度
     * 
     * POST /api/database-sync/reset
     */
    public function reset(Request $request): Response
    {
        try {
            // 创建 DatabaseSyncService 实例（传递最小配置，仅用于重置进度）
            $minimalConfig = [
                'source' => ['host' => '', 'port' => 27017],
                'target' => ['host' => '', 'port' => 27017],
            ];
            $syncService = new DatabaseSyncService($minimalConfig);
            $syncService->resetProgress();
            
            return ApiResponseHelper::success(null, '同步进度已重置');
        } catch (\Throwable $e) {
            return ApiResponseHelper::exception($e);
        }
    }

    /**
     * 跳过错误数据库，继续同步
     * 
     * POST /api/database-sync/skip-error
     */
    public function skipError(Request $request): Response
    {
        try {
            // 创建 DatabaseSyncService 实例（传递最小配置，仅用于跳过错误）
            $minimalConfig = [
                'source' => ['host' => '', 'port' => 27017],
                'target' => ['host' => '', 'port' => 27017],
            ];
            $syncService = new DatabaseSyncService($minimalConfig);
            $syncService->loadProgress();
            
            $skipped = $syncService->skipErrorDatabase();
            
            if ($skipped) {
                return ApiResponseHelper::success(null, '已跳过错误数据库，将继续同步下一个数据库');
            } else {
                return ApiResponseHelper::error('当前没有错误数据库需要跳过', 400);
            }
        } catch (\Throwable $e) {
            return ApiResponseHelper::exception($e);
        }
    }
    
    /**
     * 获取数据库连接状态
     * 
     * @return array<string, mixed> 连接状态信息
     */
    private function getConnectionStatus(): array
    {
        $status = [
            'source' => [
                'connected' => false,
                'host' => '',
                'port' => 0,
                'error' => null,
            ],
            'target' => [
                'connected' => false,
                'host' => '',
                'port' => 0,
                'error' => null,
            ],
        ];
        
        try {
            // 从数据库获取数据源配置
            $dataSourceService = new \app\service\DataSourceService(new \app\repository\DataSourceRepository());
            
            // 检查源数据库连接
            $sourceDataSourceId = 'kr_mongodb'; // 默认源数据库ID，可以从任务配置中获取
            $sourceConfig = $dataSourceService->getDataSourceConfigById($sourceDataSourceId);
            
            if ($sourceConfig) {
                $status['source']['host'] = $sourceConfig['host'] ?? '';
                $status['source']['port'] = (int)($sourceConfig['port'] ?? 27017);
                
                // 尝试连接源数据库
                try {
                    $sourceDsn = $this->buildDsn($sourceConfig);
                    $sourceClient = new \MongoDB\Client($sourceDsn, $sourceConfig['options'] ?? []);
                    // 执行一个简单的命令来测试连接
                    $sourceClient->selectDatabase('admin')->command(['ping' => 1]);
                    $status['source']['connected'] = true;
                } catch (\Throwable $e) {
                    $status['source']['connected'] = false;
                    $status['source']['error'] = $e->getMessage();
                }
            } else {
                $status['source']['error'] = '源数据库配置不存在';
            }
            
            // 检查目标数据库连接
            $targetDataSourceId = 'sync_mongodb'; // 默认目标数据库ID，可以从任务配置中获取
            $targetConfig = $dataSourceService->getDataSourceConfigById($targetDataSourceId);
            
            if ($targetConfig) {
                $status['target']['host'] = $targetConfig['host'] ?? '';
                $status['target']['port'] = (int)($targetConfig['port'] ?? 27017);
                
                // 尝试连接目标数据库
                try {
                    $targetDsn = $this->buildDsn($targetConfig);
                    $targetClient = new \MongoDB\Client($targetDsn, $targetConfig['options'] ?? []);
                    // 执行一个简单的命令来测试连接
                    $targetClient->selectDatabase('admin')->command(['ping' => 1]);
                    $status['target']['connected'] = true;
                } catch (\Throwable $e) {
                    $status['target']['connected'] = false;
                    $status['target']['error'] = $e->getMessage();
                }
            } else {
                $status['target']['error'] = '目标数据库配置不存在';
            }
            
        } catch (\Throwable $e) {
            $status['error'] = '检查连接状态失败: ' . $e->getMessage();
        }
        
        return $status;
    }
    
    /**
     * 构建 MongoDB DSN
     * 
     * @param array<string, mixed> $config 数据库配置
     * @return string DSN 字符串
     */
    private function buildDsn(array $config): string
    {
        $host = $config['host'] ?? '';
        $port = (int)($config['port'] ?? 27017);
        
        $dsn = 'mongodb://';
        if (!empty($config['username']) && !empty($config['password'])) {
            $dsn .= urlencode($config['username']) . ':' . urlencode($config['password']) . '@';
        }
        $dsn .= $host . ':' . $port;
        if (!empty($config['auth_source'])) {
            $dsn .= '/?authSource=' . urlencode($config['auth_source']);
        }
        return $dsn;
    }
    
    /**
     * 获取数据库列表信息（已完成和待同步）
     * 
     * @param DatabaseSyncService $syncService 同步服务实例
     * @return array<string, mixed> 数据库列表信息
     */
    private function getDatabaseList(DatabaseSyncService $syncService): array
    {
        $list = [
            'completed' => [],
            'pending' => [],
            'processing' => [],
        ];
        
        try {
            $runtimePath = function_exists('runtime_path') ? runtime_path() : (config('app.runtime_path', base_path() . DIRECTORY_SEPARATOR . 'runtime'));
            $progressFile = $runtimePath . DIRECTORY_SEPARATOR . 'database_sync_progress.json';
            
            if (file_exists($progressFile)) {
                $fp = fopen($progressFile, 'r');
                if ($fp && flock($fp, LOCK_SH)) {
                    try {
                        $content = stream_get_contents($fp);
                        $progressData = json_decode($content, true);
                        
                        if ($progressData) {
                            $checkpoints = $progressData['checkpoints'] ?? [];
                            $collectionsSnapshot = $progressData['collections_snapshot'] ?? [];
                            $currentDatabase = $progressData['current_database'] ?? null;
                            
                            // 获取所有数据库名称
                            $allDatabases = array_keys($collectionsSnapshot);
                            
                            foreach ($allDatabases as $database) {
                                $dbCheckpoints = $checkpoints[$database] ?? [];
                                
                                // 检查该数据库的所有集合是否都已完成
                                $collections = $collectionsSnapshot[$database] ?? [];
                                $allCompleted = true;
                                $hasData = false;
                                
                                foreach ($collections as $collection) {
                                    $checkpoint = $dbCheckpoints[$collection] ?? null;
                                    if ($checkpoint) {
                                        $hasData = true;
                                        if (!($checkpoint['completed'] ?? false)) {
                                            $allCompleted = false;
                                            break;
                                        }
                                    } else {
                                        $allCompleted = false;
                                    }
                                }
                                
                                if ($database === $currentDatabase) {
                                    $list['processing'][] = [
                                        'name' => $database,
                                        'collections' => count($collections),
                                        'collections_completed' => count(array_filter($dbCheckpoints, fn($cp) => $cp['completed'] ?? false)),
                                    ];
                                } elseif ($allCompleted && $hasData) {
                                    $list['completed'][] = [
                                        'name' => $database,
                                        'collections' => count($collections),
                                    ];
                                } else {
                                    $list['pending'][] = [
                                        'name' => $database,
                                        'collections' => count($collections),
                                    ];
                                }
                            }
                        }
                    } finally {
                        flock($fp, LOCK_UN);
                        fclose($fp);
                    }
                } else {
                    if ($fp) {
                        fclose($fp);
                    }
                }
            }
        } catch (\Throwable $e) {
            // 忽略错误，返回空列表
        }
        
        return $list;
    }
}
