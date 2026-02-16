<?php

namespace app\command;

use app\job\WorkbenchImportContactJob;
use think\console\Command;
use think\console\Input;
use think\console\Output;
use think\facade\Log;
use think\facade\Cache;
use think\Queue;

/**
 * 工作台通讯录导入命令
 * Class WorkbenchImportContactCommand
 * @package app\command
 */
class WorkbenchImportContactCommand extends Command
{
    /**
     * 配置命令
     */
    protected function configure()
    {
        $this->setName('workbench:import-contact')
            ->setDescription('执行工作台通讯录导入任务');
    }

    /**
     * 执行命令
     * @param Input $input
     * @param Output $output
     * @return int
     */
    protected function execute(Input $input, Output $output)
    {
        $output->writeln('开始执行工作台通讯录导入任务...');
        
        try {
            // 检查是否有任务正在执行
            $lockKey = 'workbench_import_contact_lock';
            if (Cache::has($lockKey)) {
                $output->writeln('通讯录导入任务正在执行中，跳过本次执行');
                return 0;
            }

            // 设置执行锁，防止重复执行
            Cache::set($lockKey, time(), 3600); // 1小时锁定时间

            // 生成任务ID
            $jobId = 'workbench_import_contact_' . date('YmdHis') . '_' . mt_rand(1000, 9999);
            
            // 准备任务数据
            $jobData = [
                'jobId' => $jobId,
                'queueLockKey' => $lockKey,
                'executeTime' => time()
            ];
            // 判断是否使用队列
            if ($this->shouldUseQueue()) {
                // 推送到队列
                Queue::push(WorkbenchImportContactJob::class, $jobData, 'workbench_import_contact');
                $output->writeln("通讯录导入任务已推送到队列，任务ID: {$jobId}");
            } else {
                // 直接执行
                $job = new WorkbenchImportContactJob();
                $result = $job->execute();
                
                // 释放锁
                Cache::rm($lockKey);
                
                if ($result !== false) {
                    $output->writeln('通讯录导入任务执行成功');
                } else {
                    $output->writeln('通讯录导入任务执行失败');
                    return 1;
                }
            }
            
        } catch (\Exception $e) {
            // 释放锁
            Cache::rm($lockKey ?? '');
            
            $errorMsg = '通讯录导入任务执行异常: ' . $e->getMessage();
            $output->writeln($errorMsg);
            Log::error($errorMsg);
            return 1;
        }

        return 0;
    }

    /**
     * 判断是否应该使用队列
     * @return bool
     */
    protected function shouldUseQueue()
    {
        // 检查队列配置是否启用
        $queueConfig = config('queue');
        if (empty($queueConfig) || !isset($queueConfig['default'])) {
            return false;
        }

        // 检查队列连接是否可用
        try {
            $connection = $queueConfig['connections'][$queueConfig['default']] ?? [];
            if (empty($connection)) {
                return false;
            }
            
            // 如果是数据库队列，检查表是否存在
            if ($connection['type'] === 'database') {
                $tableName = $connection['table'] ?? 'jobs';
                $exists = \think\Db::query("SHOW TABLES LIKE '{$tableName}'");
                return !empty($exists);
            }
            
            return true;
        } catch (\Exception $e) {
            Log::warning('队列检查失败，将使用同步执行: ' . $e->getMessage());
            return false;
        }
    }
}