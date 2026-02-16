<?php

namespace app\job;

use think\queue\Job;
use think\facade\Log;
use think\Queue;
use think\facade\Config;
use app\api\controller\AllotRuleController;

class AllotRuleListJob
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
            if ($this->processAllotRuleList($data, $job->attempts())) {
                $job->delete();
                Log::info('分配规则列表任务执行成功');
            } else {
                if ($job->attempts() > 3) {
                    // 超过重试次数，删除任务
                    Log::error('分配规则列表任务执行失败，已超过重试次数');
                    $job->delete();
                } else {
                    // 任务失败，重新放回队列
                    Log::warning('分配规则列表任务执行失败，重试次数：' . $job->attempts());
                    $job->release(Config::get('queue.failed_delay', 10));
                }
            }
        } catch (\Exception $e) {
            // 出现异常，记录日志
            Log::error('分配规则列表任务异常：' . $e->getMessage());
            if ($job->attempts() > 3) {
                $job->delete();
            } else {
                $job->release(Config::get('queue.failed_delay', 10));
            }
        }
    }
    
    /**
     * 处理分配规则列表获取
     * @param array $data 任务数据
     * @param int $attempts 重试次数
     * @return bool
     */
    protected function processAllotRuleList($data, $attempts)
    {
        Log::info('开始获取分配规则列表');
        
        // 实例化控制器
        $allotRuleController = new AllotRuleController();
        
        // 调用分配规则列表获取方法
        $result = $allotRuleController->getAllRules([], true);
        $response = json_decode($result, true);
        
        // 判断是否成功
        if ($response['code'] == 200) {
            Log::info('获取分配规则列表成功，共获取 ' . (isset($response['data']) ? count($response['data']) : 0) . ' 条记录');
            return true;
        } else {
            $errorMsg = isset($response['msg']) ? $response['msg'] : '未知错误';
            Log::error('获取分配规则列表失败：' . $errorMsg);
            return false;
        }
    }
} 