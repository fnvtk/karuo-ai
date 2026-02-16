<?php

namespace app\job;

use app\command\DeviceListCommand;
use think\queue\Job;
use think\facade\Log;
use think\Queue;
use think\facade\Config;
use think\facade\Cache;
use app\api\controller\DeviceController;

class DeviceListJob
{
    /**
     * 队列任务处理
     * @param Job $job 队列任务
     * @param array $data 任务数据
     * @return void
     */
    public function fire(Job $job, $data)
    {
        try {
            // 获取数据
            $pageIndex = $data['pageIndex'];
            $pageSize = $data['pageSize'];
            $isDel = $data['isDel'];
            $jobId = isset($data['jobId']) ? $data['jobId'] : '';
            $cacheKey = isset($data['cacheKey']) ? $data['cacheKey'] : '';
            $queueLockKey = isset($data['queueLockKey']) ? $data['queueLockKey'] : '';
            
            // 记录日志
            Log::info('开始处理设备列表任务: ' . json_encode([
                'pageIndex' => $pageIndex,
                'pageSize' => $pageSize,
                'isDel' => $isDel,
                'jobId' => $jobId,
                'cacheKey' => $cacheKey,
                'queueLockKey' => $queueLockKey
            ]));
            
            // 如果没有提供缓存键，根据删除状态和任务ID生成一个
            if (empty($cacheKey)) {
                $cacheKeyPrefix = "devicePage:" . ($jobId ?: date('YmdHis') . rand(1000, 9999));
                $cacheKeySuffix = $isDel === '' ? '' : ":{$isDel}";
                $cacheKey = $cacheKeyPrefix . $cacheKeySuffix;
            }
            
            // 如果没有提供队列锁键，生成一个
            if (empty($queueLockKey)) {
                $queueLockKey = "queue_lock:device_list:{$isDel}";
            }
            
            // 实例化控制器
            $deviceController = new DeviceController();
            
            // 设置请求信息
            $request = request();
            $request->withGet([
                'pageIndex' => $pageIndex,
                'pageSize' => $pageSize
            ]);
            
            // 调用设备列表获取方法，传入isDel参数
            $result = $deviceController->getlist(['pageIndex' => $pageIndex, 'pageSize' => $pageSize], true, $isDel);
            $response = json_decode($result, true);
            
            if ($response['code'] == 200) {
                $data = $response['data'];
                $dataCount = count($data['results']);
                $totalCount = $data['total'];
                
                Log::info("设备列表获取成功，当前页:{$pageIndex}，获取数量:{$dataCount}，总数量:{$totalCount}");
                
                // 计算是否还有下一页
                $hasNextPage = ($pageIndex + 1) * $pageSize < $totalCount;
                
                if ($hasNextPage) {
                    // 缓存页码信息，设置有效期1天
                    $nextPageIndex = $pageIndex + 1;
                    Cache::set($cacheKey, $nextPageIndex, 600);
                    Log::info("更新缓存页码: {$nextPageIndex}, 缓存键: {$cacheKey}");
                    
                    // 添加下一页任务到队列
                    $command = new DeviceListCommand();
                    $command->addToQueue($nextPageIndex, $pageSize, $isDel, $jobId, $cacheKey, $queueLockKey);
                    Log::info("已添加下一页任务到队列: 页码 {$nextPageIndex}");
                } else {
                    // 处理完所有页面，重置页码并释放队列锁
                    Cache::set($cacheKey, 0, 600);
                    Cache::rm($queueLockKey);
                    Log::info("所有设备列表页面处理完毕，重置页码为0，释放队列锁: {$queueLockKey}");
                }
                
                $job->delete();
                return true;
            } else {
                // API调用出错，记录错误并释放队列锁
                $errorMsg = isset($response['msg']) ? $response['msg'] : '未知错误';
                Log::error("设备列表获取失败: " . $errorMsg);
                
                if ($job->attempts() > 3) {
                    // 超过重试次数，删除任务并释放队列锁
                    Cache::rm($queueLockKey);
                    Log::info("由于错误释放队列锁: {$queueLockKey}");
                    $job->delete();
                } else {
                    // 任务失败，重新放回队列
                    Log::warning('设备列表任务执行失败，重试次数：' . $job->attempts() . '，页码：' . $pageIndex);
                    $job->release(Config::get('queue.failed_delay', 10));
                }
                
                return false;
            }
        } catch (\Exception $e) {
            // 出现异常，记录错误并释放队列锁
            Log::error('设备列表任务处理异常: ' . $e->getMessage());
            
            if (!empty($queueLockKey)) {
                Cache::rm($queueLockKey);
                Log::info("由于异常释放队列锁: {$queueLockKey}");
            }
            
            if ($job->attempts() > 3) {
                $job->delete();
            } else {
                $job->release(Config::get('queue.failed_delay', 10));
            }
            
            return false;
        }
    }
    
    /**
     * 获取删除状态的文本描述
     * @param string $isDel 删除状态
     * @return string 删除状态文本
     */
    protected function getDeleteTypeText($isDel)
    {
        switch ($isDel) {
            case '0':
            case 0:
                return '未删除(unDeleted)';
            case '1':
            case 1:
                return '已删除(deleted)';
            case '2':
            case 2:
                return '已停用(deletedAndStop)';
            default:
                return '全部';
        }
    }
} 