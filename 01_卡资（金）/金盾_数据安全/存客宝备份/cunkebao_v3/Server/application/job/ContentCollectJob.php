<?php

namespace app\job;

use think\queue\Job;
use think\facade\Log;
use think\Queue;
use think\facade\Config;
use app\cunkebao\controller\ContentLibraryController;

class ContentCollectJob
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
            // 如果任务执行成功后删除任务
            if ($this->processContentCollect($data, $job->attempts())) {
                $job->delete();
                // 去除成功日志，减少日志空间消耗
            } else {
                if ($job->attempts() > 3) {
                    // 超过重试次数，删除任务
                    Log::error('内容采集任务执行失败，已超过重试次数，内容库ID：' . $data['libraryId']);
                    $job->delete();
                } else {
                    // 任务失败，重新放回队列
                    Log::warning('内容采集任务执行失败，重试次数：' . $job->attempts() . '，内容库ID：' . $data['libraryId']);
                    $job->release(Config::get('queue.failed_delay', 10));
                }
            }
        } catch (\Exception $e) {
            // 出现异常，记录日志
            Log::error('内容采集任务异常：' . $e->getMessage());
            if ($job->attempts() > 3) {
                $job->delete();
            } else {
                $job->release(Config::get('queue.failed_delay', 10));
            }
        }
    }
    
    /**
     * 处理内容采集
     * @param array $data 任务数据
     * @param int $attempts 重试次数
     * @return bool
     */
    protected function processContentCollect($data, $attempts)
    {
        try {
            $controller = new ContentLibraryController();
            $result = $controller->collectMoments();
            $response = json_decode($result, true);
            
            if ($response['code'] == 200) {
                // 记录详细的采集结果
                if (!empty($response['data'])) {
                    foreach ($response['data'] as $result) {
                        if ($result['status'] == 'success') {
                            Log::info(sprintf(
                                '内容库[%s]采集成功: %s',
                                $result['library_name'],
                                $result['message']
                            ));
                        } else {
                            Log::warning(sprintf(
                                '内容库[%s]采集失败: %s',
                                $result['library_name'],
                                $result['message']
                            ));
                        }
                    }
                }
                return true;
            } else {
                Log::error('内容采集失败：' . ($response['msg'] ?? '未知错误'));
                return false;
            }
        } catch (\Exception $e) {
            Log::error('内容采集处理异常：' . $e->getMessage());
            return false;
        }
    }
} 