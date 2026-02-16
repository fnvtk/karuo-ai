<?php

namespace app\job;

use think\queue\Job;
use think\facade\Log;
use think\Queue;
use think\facade\Config;
use app\api\controller\AccountController;

class DepartmentListJob
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
            if ($this->processDepartmentList($data, $job->attempts())) {
                $job->delete();
                Log::info('部门列表任务执行成功，页码：' . $data['pageIndex']);
            } else {
                if ($job->attempts() > 3) {
                    // 超过重试次数，删除任务
                    Log::error('部门列表任务执行失败，已超过重试次数，页码：' . $data['pageIndex']);
                    $job->delete();
                } else {
                    // 任务失败，重新放回队列
                    Log::warning('部门列表任务执行失败，重试次数：' . $job->attempts() . '，页码：' . $data['pageIndex']);
                    $job->release(Config::get('queue.failed_delay', 10));
                }
            }
        } catch (\Exception $e) {
            // 出现异常，记录日志
            Log::error('部门列表任务异常：' . $e->getMessage());
            if ($job->attempts() > 3) {
                $job->delete();
            } else {
                $job->release(Config::get('queue.failed_delay', 10));
            }
        }
    }
    
    /**
     * 处理部门列表获取
     * @param array $data 任务数据
     * @param int $attempts 重试次数
     * @return bool
     */
    protected function processDepartmentList($data, $attempts)
    {
        // 获取参数
        $pageIndex = isset($data['pageIndex']) ? $data['pageIndex'] : 0;
        $pageSize = isset($data['pageSize']) ? $data['pageSize'] : 100;
        
        Log::info('开始获取部门列表，页码：' . $pageIndex . '，页大小：' . $pageSize);
        
        // 实例化控制器
        $accountController = new AccountController();
        
        // 构建请求参数
        $params = [
            'pageIndex' => $pageIndex,
            'pageSize' => $pageSize
        ];
        
        // 设置请求信息
        $request = request();
        $request->withGet($params);
        
        // 调用公司账号列表获取方法
        $result = $accountController->getDepartmentList(true);
        $response = json_decode($result,true);

        
        // 判断是否成功
        if ($response['code'] == 200) {
            $data = $response['data'];
            
            // 判断是否有下一页
            if (!empty($data) && count($data['results']) > 0) {
                // 有下一页，将下一页任务添加到队列
                $nextPageIndex = $pageIndex + 1;
                $this->addNextPageToQueue($nextPageIndex, $pageSize);
                Log::info('添加下一页任务到队列，页码：' . $nextPageIndex);
            }
            
            return true;
        } else {
            $errorMsg = isset($response['msg']) ? $response['msg'] : '未知错误';
            Log::error('获取部门列表失败：' . $errorMsg);
            return false;
        }
    }
    
    /**
     * 添加下一页任务到队列
     * @param int $pageIndex 页码
     * @param int $pageSize 每页大小
     */
    protected function addNextPageToQueue($pageIndex, $pageSize)
    {
        $data = [
            'pageIndex' => $pageIndex,
            'pageSize' => $pageSize
        ];
                
        // 添加到队列，设置任务名为 account_list
        Queue::push(self::class, $data, 'department_list');
    }
} 