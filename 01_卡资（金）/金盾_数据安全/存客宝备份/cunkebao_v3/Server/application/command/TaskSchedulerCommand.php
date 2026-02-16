<?php

namespace app\command;

use think\console\Command;
use think\console\Input;
use think\console\Output;
use think\facade\Config;
use think\facade\Log;
use think\facade\Cache;

/**
 * 统一任务调度器
 * 支持多进程并发执行任务
 * 
 * 使用方法：
 * php think scheduler:run
 * 
 * 在 crontab 中配置：
 * * * * * * cd /path/to/project && php think scheduler:run >> /path/to/log/scheduler.log 2>&1
 */
class TaskSchedulerCommand extends Command
{
    /**
     * 任务配置
     */
    protected $tasks = [];
    
    /**
     * 最大并发进程数
     */
    protected $maxConcurrent = 20;
    
    /**
     * 当前运行的进程数
     */
    protected $runningProcesses = [];
    
    /**
     * 日志目录
     */
    protected $logDir = '';
    
    /**
     * 锁文件目录
     */
    protected $lockDir = '';

    protected function configure()
    {
        $this->setName('scheduler:run')
            ->setDescription('统一任务调度器，支持多进程并发执行所有定时任务')
            ->addOption('task', 't', \think\console\input\Option::VALUE_OPTIONAL, '指定要执行的任务ID（测试模式，忽略Cron表达式）', '')
            ->addOption('force', 'f', \think\console\input\Option::VALUE_NONE, '强制执行所有启用的任务（忽略Cron表达式）');
    }

    protected function execute(Input $input, Output $output)
    {
        $output->writeln('==========================================');
        $output->writeln('任务调度器启动');
        $output->writeln('时间: ' . date('Y-m-d H:i:s'));
        $output->writeln('==========================================');
        
        // 检查是否支持 pcntl 扩展
        if (!function_exists('pcntl_fork')) {
            $output->writeln('<error>错误：系统不支持 pcntl 扩展，无法使用多进程功能</error>');
            $output->writeln('<info>提示：将使用单进程顺序执行任务</info>');
            $this->maxConcurrent = 1;
        }
        
        // 获取项目根目录（使用 __DIR__ 更可靠）
        // TaskSchedulerCommand.php 位于 application/command/，向上两级到项目根目录
        $rootPath = dirname(__DIR__, 2);
        
        // 加载任务配置
        // 方法1：尝试通过框架配置加载
        $this->tasks = Config::get('task_scheduler', []);
        
        // 方法2：如果框架配置没有，直接加载配置文件
        if (empty($this->tasks)) {
            $configFile = $rootPath . DIRECTORY_SEPARATOR . 'config' . DIRECTORY_SEPARATOR . 'task_scheduler.php';
            
            if (is_file($configFile)) {
                $output->writeln("<info>找到配置文件：{$configFile}</info>");
                $config = include $configFile;
                if (is_array($config) && !empty($config)) {
                    $this->tasks = $config;
                } else {
                    $output->writeln("<error>配置文件返回的不是数组或为空：{$configFile}</error>");
                }
            }
        }

        if (empty($this->tasks)) {
            $output->writeln('<error>错误：未找到任务配置（task_scheduler）</error>');
            $output->writeln('<error>请检查以下位置：</error>');
            $output->writeln('<error>1. config/task_scheduler.php 文件是否存在</error>');
            $output->writeln('<error>2. 文件是否返回有效的数组</error>');
            $output->writeln('<error>3. 文件权限是否正确</error>');
            $output->writeln('<error>项目根目录：' . $rootPath . '</error>');
            $output->writeln('<error>期望配置文件：' . $rootPath . DIRECTORY_SEPARATOR . 'config' . DIRECTORY_SEPARATOR . 'task_scheduler.php</error>');
            return false;
        }
        
        // 设置日志目录和锁文件目录（使用 __DIR__ 获取的根目录）
        $this->logDir = $rootPath . DIRECTORY_SEPARATOR . 'runtime' . DIRECTORY_SEPARATOR . 'log' . DIRECTORY_SEPARATOR;
        $this->lockDir = $rootPath . DIRECTORY_SEPARATOR . 'runtime' . DIRECTORY_SEPARATOR . 'lock' . DIRECTORY_SEPARATOR;
        
        if (!is_dir($this->logDir)) {
            mkdir($this->logDir, 0755, true);
        }
        if (!is_dir($this->lockDir)) {
            mkdir($this->lockDir, 0755, true);
        }
        
        // 获取当前时间
        $currentTime = time();
        $currentMinute = date('i', $currentTime);
        $currentHour = date('H', $currentTime);
        $currentDay = date('d', $currentTime);
        $currentMonth = date('m', $currentTime);
        $currentWeekday = date('w', $currentTime); // 0=Sunday, 6=Saturday
        
        // 获取命令行参数
        $testTaskId = $input->getOption('task');
        $force = $input->getOption('force');
        
        $output->writeln("当前时间: {$currentHour}:{$currentMinute}");
        $output->writeln("已加载 " . count($this->tasks) . " 个任务配置");
        
        // 测试模式：只执行指定的任务
        if (!empty($testTaskId)) {
            if (!isset($this->tasks[$testTaskId])) {
                $output->writeln("<error>错误：任务 {$testTaskId} 不存在</error>");
                $output->writeln("<info>可用任务列表：</info>");
                foreach ($this->tasks as $id => $task) {
                    $taskName = $task['name'] ?? $id;
                    $enabled = isset($task['enabled']) && $task['enabled'] ? '✓' : '✗';
                    $output->writeln("  {$enabled} {$taskName} ({$id})");
                }
                return false;
            }
            
            $task = $this->tasks[$testTaskId];
            if (!isset($task['enabled']) || !$task['enabled']) {
                $output->writeln("<error>错误：任务 {$testTaskId} 已禁用</error>");
                return false;
            }
            
            $taskName = $task['name'] ?? $testTaskId;
            $output->writeln("<info>测试模式：执行任务 {$taskName} ({$testTaskId})</info>");
            $output->writeln("<comment>注意：测试模式会忽略 Cron 表达式，直接执行任务</comment>");
            
            $tasksToRun = [$testTaskId => $task];
        } else {
            // 正常模式：筛选需要执行的任务
            $tasksToRun = [];
            $enabledCount = 0;
            $disabledCount = 0;
            
            foreach ($this->tasks as $taskId => $task) {
                if (!isset($task['enabled']) || !$task['enabled']) {
                    $disabledCount++;
                    continue;
                }
                $enabledCount++;
                
                // 强制模式：忽略 Cron 表达式，执行所有启用的任务
                if ($force) {
                    $tasksToRun[$taskId] = $task;
                    $taskName = $task['name'] ?? $taskId;
                    $output->writeln("<info>强制模式：任务 {$taskName} ({$taskId}) 将被执行</info>");
                } elseif ($this->shouldRun($task['schedule'], $currentMinute, $currentHour, $currentDay, $currentMonth, $currentWeekday)) {
                    $tasksToRun[$taskId] = $task;
                    $taskName = $task['name'] ?? $taskId;
                    $output->writeln("<info>任务 {$taskName} ({$taskId}) 符合执行条件（schedule: {$task['schedule']}）</info>");
                }
            }
            
            $output->writeln("已启用任务数: {$enabledCount}，已禁用任务数: {$disabledCount}");
            
            if (empty($tasksToRun)) {
                $output->writeln('<info>当前时间没有需要执行的任务</info>');
                if (!$force) {
                    $output->writeln('<info>提示：使用 --force 参数可以强制执行所有启用的任务</info>');
                }
                return true;
            }
            
            $output->writeln("找到 " . count($tasksToRun) . " 个需要执行的任务");
        }
        
        // 执行任务
        if ($this->maxConcurrent > 1 && function_exists('pcntl_fork')) {
            $this->executeConcurrent($tasksToRun, $output);
        } else {
            $this->executeSequential($tasksToRun, $output);
        }
        
        // 清理僵尸进程
        $this->cleanupZombieProcesses();
        
        $output->writeln('==========================================');
        $output->writeln('任务调度器执行完成');
        $output->writeln('==========================================');
        
        return true;
    }
    
    /**
     * 判断任务是否应该执行（参考 schedule.php 的实现）
     * 
     * @param string $schedule cron表达式，格式：分钟 小时 日 月 星期
     * @param int $minute 当前分钟
     * @param int $hour 当前小时
     * @param int $day 当前日期
     * @param int $month 当前月份
     * @param int $weekday 当前星期
     * @return bool
     */
    protected function shouldRun($schedule, $minute, $hour, $day, $month, $weekday)
    {
        $parts = preg_split('/\s+/', trim($schedule));
        if (count($parts) !== 5) {
            return false;
        }
        
        list($scheduleMinute, $scheduleHour, $scheduleDay, $scheduleMonth, $scheduleWeekday) = $parts;
        
        // 解析分钟
        if (!$this->matchCronPart($scheduleMinute, $minute)) {
            return false;
        }
        
        // 解析小时
        if (!$this->matchCronPart($scheduleHour, $hour)) {
            return false;
        }
        
        // 解析日期
        if (!$this->matchCronPart($scheduleDay, $day)) {
            return false;
        }
        
        // 解析月份
        if (!$this->matchCronPart($scheduleMonth, $month)) {
            return false;
        }
        
        // 解析星期（注意：cron中0和7都表示星期日，PHP的wday中0=Sunday）
        if ($scheduleWeekday !== '*') {
            $scheduleWeekday = str_replace('7', '0', $scheduleWeekday);
            if (!$this->matchCronPart($scheduleWeekday, $weekday)) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * 匹配Cron表达式的单个部分（参考 schedule.php 的实现）
     * 
     * @param string $pattern cron字段表达式
     * @param int $value 当前值
     * @return bool
     */
    protected function matchCronPart($pattern, $value)
    {
        // * 表示匹配所有
        if ($pattern === '*') {
            return true;
        }
        
        // 数字，精确匹配
        if (is_numeric($pattern)) {
            return (int)$pattern === $value;
        }
        
        // */n 表示每n个单位
        if (preg_match('/^\*\/(\d+)$/', $pattern, $matches)) {
            $interval = (int)$matches[1];
            return $value % $interval === 0;
        }
        
        // n-m 表示范围
        if (preg_match('/^(\d+)-(\d+)$/', $pattern, $matches)) {
            $min = (int)$matches[1];
            $max = (int)$matches[2];
            return $value >= $min && $value <= $max;
        }
        
        // n,m 表示多个值
        if (strpos($pattern, ',') !== false) {
            $values = explode(',', $pattern);
            foreach ($values as $v) {
                if ((int)trim($v) === $value) {
                    return true;
                }
            }
            return false;
        }
        
        return false;
    }
    
    /**
     * 并发执行任务（多进程）
     * 
     * @param array $tasks 任务列表
     * @param Output $output 输出对象
     */
    protected function executeConcurrent($tasks, Output $output)
    {
        $output->writeln('<info>使用多进程并发执行任务（最大并发数：' . $this->maxConcurrent . '）</info>');
        
        foreach ($tasks as $taskId => $task) {
            // 等待可用进程槽
            while (count($this->runningProcesses) >= $this->maxConcurrent) {
                $this->waitForProcesses();
                usleep(100000); // 等待100ms
            }
            
            // 检查任务是否已经在运行（使用文件锁，更可靠）
            if ($this->isTaskRunning($taskId)) {
                $taskName = $task['name'] ?? $taskId;
                $output->writeln("<comment>任务 {$taskName} ({$taskId}) 正在运行中，跳过</comment>");
                continue;
            }
            
            // 创建子进程
            $pid = pcntl_fork();
            
            if ($pid == -1) {
                // 创建进程失败
                $taskName = $task['name'] ?? $taskId;
                $output->writeln("<error>创建子进程失败：{$taskName} ({$taskId})</error>");
                Log::error("任务调度器：创建子进程失败", ['task' => $taskId, 'name' => $taskName]);
                continue;
            } elseif ($pid == 0) {
                // 子进程：执行任务
                $this->runTask($taskId, $task);
                exit(0);
            } else {
                // 父进程：记录子进程PID
                $this->runningProcesses[$pid] = [
                    'task_id' => $taskId,
                    'start_time' => time(),
                ];
                $taskName = $task['name'] ?? $taskId;
                $output->writeln("<info>启动任务：{$taskName} ({$taskId}) (PID: {$pid})</info>");
                
                // 创建任务锁文件
                $this->createLock($taskId, $pid);
            }
        }
        
        // 等待所有子进程完成
        while (!empty($this->runningProcesses)) {
            $this->waitForProcesses();
            usleep(500000); // 等待500ms
        }
    }
    
    /**
     * 顺序执行任务（单进程）
     * 
     * @param array $tasks 任务列表
     * @param Output $output 输出对象
     */
    protected function executeSequential($tasks, Output $output)
    {
        $output->writeln('<info>使用单进程顺序执行任务</info>');
        
        foreach ($tasks as $taskId => $task) {
            $taskName = $task['name'] ?? $taskId;
            $output->writeln("<info>执行任务：{$taskName} ({$taskId})</info>");
            $this->runTask($taskId, $task);
        }
    }
    
    /**
     * 执行单个任务（参考 schedule.php 的实现，改进超时和错误处理）
     * 
     * @param string $taskId 任务ID
     * @param array $task 任务配置
     */
    protected function runTask($taskId, $task)
    {
        $startTime = microtime(true);
        $logFile = $this->logDir . ($task['log_file'] ?? "scheduler_{$taskId}.log");
        
        // 确保日志目录存在
        $logDir = dirname($logFile);
        if (!is_dir($logDir)) {
            mkdir($logDir, 0755, true);
        }
        
        // 获取项目根目录（使用 __DIR__ 动态获取）
        // TaskSchedulerCommand.php 位于 application/command/，向上两级到项目根目录
        $executionPath = dirname(__DIR__, 2);
        
        // 获取 PHP 可执行文件路径
        $phpPath = PHP_BINARY ?: 'php';
        
        // 获取 think 脚本路径（使用项目根目录）
        $thinkPath = $executionPath . DIRECTORY_SEPARATOR . 'think';
        
        // 检查 think 文件是否存在
        if (!is_file($thinkPath)) {
            $errorMsg = "错误：think 文件不存在：{$thinkPath}";
            Log::error($errorMsg);
            file_put_contents($logFile, $errorMsg . "\n", FILE_APPEND);
            $this->removeLock($taskId); // 删除锁文件
            return;
        }
        
        // 构建命令（使用绝对路径，确保在 Linux 上能正确执行）
        $command = escapeshellarg($phpPath) . ' ' . escapeshellarg($thinkPath) . ' ' . escapeshellarg($task['command']);
        if (!empty($task['options'])) {
            foreach ($task['options'] as $option) {
                $command .= ' ' . escapeshellarg($option);
            }
        }
        
        // 获取任务名称
        $taskName = $task['name'] ?? $taskId;
        
        // 记录任务开始
        $logMessage = "\n" . str_repeat('=', 60) . "\n";
        $logMessage .= "任务开始执行: {$taskName} ({$taskId})\n";
        $logMessage .= "执行时间: " . date('Y-m-d H:i:s') . "\n";
        $logMessage .= "执行目录: {$executionPath}\n";
        $logMessage .= "命令: {$command}\n";
        $logMessage .= "[DEBUG] 任务配置: " . json_encode($task, JSON_UNESCAPED_UNICODE) . "\n";
        $logMessage .= "[DEBUG] 当前工作目录: " . getcwd() . "\n";
        $logMessage .= "[DEBUG] PHP版本: " . PHP_VERSION . "\n";
        $logMessage .= "[DEBUG] 操作系统: " . PHP_OS . "\n";
        $logMessage .= str_repeat('=', 60) . "\n";
        file_put_contents($logFile, $logMessage, FILE_APPEND);
        
        // 设置超时时间
        $timeout = $task['timeout'] ?? 3600;
        
        // 执行命令（参考 schedule.php 的实现）
        $descriptorspec = [
            0 => ['pipe', 'r'], // stdin
            1 => ['pipe', 'w'], // stdout
            2 => ['pipe', 'w'], // stderr
        ];
        
        // [DEBUG] 记录进程启动前信息
        $debugLog = "[DEBUG] 准备启动进程\n";
        $debugLog .= "[DEBUG] PHP路径: {$phpPath}\n";
        $debugLog .= "[DEBUG] Think路径: {$thinkPath}\n";
        $debugLog .= "[DEBUG] 执行目录: {$executionPath}\n";
        $debugLog .= "[DEBUG] 完整命令: {$command}\n";
        $debugLog .= "[DEBUG] 超时设置: {$timeout}秒\n";
        file_put_contents($logFile, $debugLog, FILE_APPEND);
        
        $process = @proc_open($command, $descriptorspec, $pipes, $executionPath);
        
        if (!is_resource($process)) {
            $errorMsg = "任务执行失败: 无法启动进程";
            $errorMsg .= "\n[DEBUG] proc_open 返回: " . var_export($process, true);
            $errorMsg .= "\n[DEBUG] 错误信息: " . error_get_last()['message'] ?? '无错误信息';
            Log::error($errorMsg, ['task' => $taskId]);
            file_put_contents($logFile, $errorMsg . "\n", FILE_APPEND);
            $this->removeLock($taskId); // 删除锁文件
            return;
        }
        
        // [DEBUG] 记录进程启动成功
        file_put_contents($logFile, "[DEBUG] 进程启动成功，进程资源类型: " . get_resource_type($process) . "\n", FILE_APPEND);
        
        // 设置非阻塞模式
        stream_set_blocking($pipes[1], false);
        stream_set_blocking($pipes[2], false);
        
        $startWaitTime = time();
        $output = '';
        $error = '';
        $loopCount = 0;
        $lastStatusCheck = 0;
        $finalExitCode = null; // 保存进程结束时的退出码
        
        // 等待进程完成或超时
        while (true) {
            $loopCount++;
            $status = proc_get_status($process);
            
            // [DEBUG] 每10次循环记录一次状态（减少日志量）
            if ($loopCount % 10 == 0 || time() - $lastStatusCheck > 5) {
                $elapsed = time() - $startWaitTime;
                $debugStatus = "[DEBUG] 循环 #{$loopCount}, 已运行 {$elapsed}秒\n";
                $debugStatus .= "[DEBUG] 进程状态: running=" . ($status['running'] ? 'true' : 'false');
                if (isset($status['exitcode'])) {
                    $debugStatus .= ", exitcode=" . $status['exitcode'];
                }
                if (isset($status['signaled'])) {
                    $debugStatus .= ", signaled=" . ($status['signaled'] ? 'true' : 'false');
                }
                if (isset($status['termsig'])) {
                    $debugStatus .= ", termsig=" . $status['termsig'];
                }
                $debugStatus .= "\n";
                file_put_contents($logFile, $debugStatus, FILE_APPEND);
                $lastStatusCheck = time();
            }
            
            // 读取输出
            $outputChunk = stream_get_contents($pipes[1]);
            $errorChunk = stream_get_contents($pipes[2]);
            
            if (!empty($outputChunk)) {
                $output .= $outputChunk;
                file_put_contents($logFile, "[DEBUG] 标准输出片段: " . substr($outputChunk, 0, 200) . "\n", FILE_APPEND);
            }
            
            if (!empty($errorChunk)) {
                $error .= $errorChunk;
                file_put_contents($logFile, "[DEBUG] 错误输出片段: " . substr($errorChunk, 0, 200) . "\n", FILE_APPEND);
            }
            
            // 检查是否完成
            if (!$status['running']) {
                // [DEBUG] 记录进程结束时的详细状态
                $debugEnd = "[DEBUG] 进程已结束\n";
                $debugEnd .= "[DEBUG] 最终状态: " . json_encode($status, JSON_UNESCAPED_UNICODE) . "\n";
                if (isset($status['exitcode'])) {
                    $finalExitCode = $status['exitcode']; // 立即保存退出码
                    $debugEnd .= "[DEBUG] proc_get_status 返回的退出码: " . $status['exitcode'] . " (已保存)\n";
                }
                file_put_contents($logFile, $debugEnd, FILE_APPEND);
                break;
            }
            
            // 检查超时
            if ((time() - $startWaitTime) > $timeout) {
                $timeoutMsg = "任务执行超时（{$timeout}秒），终止进程\n";
                $timeoutMsg .= "[DEBUG] 当前循环次数: {$loopCount}\n";
                $timeoutMsg .= "[DEBUG] 已运行时间: " . (time() - $startWaitTime) . "秒\n";
                Log::warning("任务执行超时（{$timeout}秒），终止进程", ['task' => $taskId]);
                file_put_contents($logFile, $timeoutMsg, FILE_APPEND);
                
                if (function_exists('proc_terminate')) {
                    $terminateResult = proc_terminate($process);
                    file_put_contents($logFile, "[DEBUG] proc_terminate 返回: " . var_export($terminateResult, true) . "\n", FILE_APPEND);
                } else {
                    file_put_contents($logFile, "[DEBUG] proc_terminate 函数不可用\n", FILE_APPEND);
                }
                
                // 关闭管道
                @fclose($pipes[0]);
                @fclose($pipes[1]);
                @fclose($pipes[2]);
                $closeResult = proc_close($process);
                file_put_contents($logFile, "[DEBUG] 超时后 proc_close 返回: {$closeResult}\n", FILE_APPEND);
                
                $this->removeLock($taskId); // 删除锁文件
                return;
            }
            
            // 等待100ms
            usleep(100000);
        }
        
        // 读取剩余输出
        $remainingOutput = stream_get_contents($pipes[1]);
        $remainingError = stream_get_contents($pipes[2]);
        
        if (!empty($remainingOutput)) {
            $output .= $remainingOutput;
            file_put_contents($logFile, "[DEBUG] 剩余标准输出: " . substr($remainingOutput, 0, 500) . "\n", FILE_APPEND);
        }
        
        if (!empty($remainingError)) {
            $error .= $remainingError;
            file_put_contents($logFile, "[DEBUG] 剩余错误输出: " . substr($remainingError, 0, 500) . "\n", FILE_APPEND);
        }
        
        // [DEBUG] 记录关闭管道前的状态
        file_put_contents($logFile, "[DEBUG] 准备关闭管道，输出长度: " . strlen($output) . ", 错误长度: " . strlen($error) . "\n", FILE_APPEND);
        file_put_contents($logFile, "[DEBUG] 已保存的退出码: " . ($finalExitCode !== null ? $finalExitCode : 'null') . "\n", FILE_APPEND);
        
        // 关闭管道
        $closeResults = [];
        $closeResults['stdin'] = @fclose($pipes[0]);
        $closeResults['stdout'] = @fclose($pipes[1]);
        $closeResults['stderr'] = @fclose($pipes[2]);
        file_put_contents($logFile, "[DEBUG] 管道关闭结果: " . json_encode($closeResults, JSON_UNESCAPED_UNICODE) . "\n", FILE_APPEND);
        
        // 获取退出码
        $exitCodeFromClose = proc_close($process);
        
        // [DEBUG] 记录退出码获取结果
        file_put_contents($logFile, "[DEBUG] proc_close 返回的退出码: {$exitCodeFromClose}\n", FILE_APPEND);
        file_put_contents($logFile, "[DEBUG] 退出码类型: " . gettype($exitCodeFromClose) . "\n", FILE_APPEND);
        
        // 优先使用进程刚结束时保存的退出码（proc_get_status 在进程刚结束时的返回值）
        // 因为关闭管道后，proc_get_status 可能会返回 -1，这是 PHP 的已知行为
        if ($finalExitCode !== null) {
            $exitCode = $finalExitCode;
            file_put_contents($logFile, "[DEBUG] ✅ 使用进程结束时保存的退出码: {$exitCode}\n", FILE_APPEND);
            if ($exitCodeFromClose === -1 && $exitCode === 0) {
                file_put_contents($logFile, "[DEBUG] ℹ️ 注意: proc_close 返回 -1，但进程结束时的退出码为 0，这是 PHP 的已知行为，任务实际执行成功\n", FILE_APPEND);
            } elseif ($exitCodeFromClose !== -1 && $exitCodeFromClose !== $exitCode) {
                file_put_contents($logFile, "[DEBUG] ⚠️ 警告: proc_close 返回 {$exitCodeFromClose}，但进程结束时的退出码为 {$exitCode}，使用进程结束时的退出码\n", FILE_APPEND);
            }
        } else {
            // 如果没有保存的退出码，使用 proc_close 的返回值
            $exitCode = $exitCodeFromClose;
            file_put_contents($logFile, "[DEBUG] 使用 proc_close 的退出码: {$exitCode}\n", FILE_APPEND);
            if ($exitCode === -1) {
                file_put_contents($logFile, "[DEBUG] ⚠️ 退出码为 -1，可能原因:\n", FILE_APPEND);
                file_put_contents($logFile, "[DEBUG] 1. 进程被信号终止\n", FILE_APPEND);
                file_put_contents($logFile, "[DEBUG] 2. 进程异常终止\n", FILE_APPEND);
                file_put_contents($logFile, "[DEBUG] 3. 无法获取进程退出状态\n", FILE_APPEND);
                file_put_contents($logFile, "[DEBUG] 4. Windows系统上的特殊返回值\n", FILE_APPEND);
            }
        }
        
        // 记录输出
        if (!empty($output)) {
            file_put_contents($logFile, "任务输出:\n{$output}\n", FILE_APPEND);
        }
        
        if (!empty($error)) {
            file_put_contents($logFile, "任务错误:\n{$error}\n", FILE_APPEND);
            Log::error("任务执行错误", ['task' => $taskId, 'error' => $error]);
        }
        
        $endTime = microtime(true);
        $duration = round($endTime - $startTime, 2);
        
        // 获取任务名称
        $taskName = $task['name'] ?? $taskId;
        
        // 解释退出码含义
        $exitCodeMeaning = $this->getExitCodeMeaning($exitCode);
        
        // 记录任务完成
        $logMessage = "\n" . str_repeat('=', 60) . "\n";
        $logMessage .= "任务执行完成: {$taskName} ({$taskId})\n";
        $logMessage .= "完成时间: " . date('Y-m-d H:i:s') . "\n";
        $logMessage .= "执行时长: {$duration} 秒\n";
        $logMessage .= "退出码: {$exitCode} ({$exitCodeMeaning})\n";
        $logMessage .= "[DEBUG] 输出总长度: " . strlen($output) . " 字节\n";
        $logMessage .= "[DEBUG] 错误总长度: " . strlen($error) . " 字节\n";
        if ($exitCode === -1) {
            $logMessage .= "[DEBUG] ⚠️ 退出码 -1 详细分析:\n";
            $logMessage .= "[DEBUG] - 是否有错误输出: " . (!empty($error) ? '是' : '否') . "\n";
            $logMessage .= "[DEBUG] - 是否有标准输出: " . (!empty($output) ? '是' : '否') . "\n";
            $logMessage .= "[DEBUG] - 执行时长: {$duration} 秒\n";
            if ($duration < 1) {
                $logMessage .= "[DEBUG] - ⚠️ 执行时长过短，可能是进程启动失败\n";
            }
            if ($duration > $timeout * 0.9) {
                $logMessage .= "[DEBUG] - ⚠️ 执行时长接近超时时间\n";
            }
        }
        $logMessage .= str_repeat('=', 60) . "\n";
        file_put_contents($logFile, $logMessage, FILE_APPEND);
        
        if ($exitCode === 0) {
            Log::info("任务执行成功", [
                'task' => $taskId,
                'name' => $taskName,
                'duration' => $duration,
            ]);
        } else {
            Log::error("任务执行失败", [
                'task' => $taskId,
                'name' => $taskName,
                'duration' => $duration,
                'exit_code' => $exitCode,
                'exit_code_meaning' => $exitCodeMeaning,
            ]);
        }
        
        // 删除锁文件（任务完成）
        $this->removeLock($taskId);
    }
    
    /**
     * 等待进程完成
     */
    protected function waitForProcesses()
    {
        foreach ($this->runningProcesses as $pid => $info) {
            $status = 0;
            $result = pcntl_waitpid($pid, $status, WNOHANG);
            
            if ($result == $pid || $result == -1) {
                // 进程已结束
                $taskId = $info['task_id'];
                unset($this->runningProcesses[$pid]);
                
                // 删除任务锁文件
                $this->removeLock($taskId);
                
                $duration = time() - $info['start_time'];
                Log::info("子进程执行完成", [
                    'pid' => $pid,
                    'task' => $taskId,
                    'duration' => $duration,
                ]);
            }
        }
    }
    
    /**
     * 获取退出码的含义说明
     * @param int $exitCode 退出码
     * @return string 退出码含义
     */
    protected function getExitCodeMeaning($exitCode)
    {
        switch ($exitCode) {
            case 0:
                return '成功';
            case -1:
                return '进程被信号终止或异常终止（可能是被强制终止、超时终止或发生致命错误）';
            case 1:
            case 2:
            case 3:
            case 4:
            case 5:
            case 6:
            case 7:
            case 8:
            case 9:
            case 10:
                return '一般性错误';
            case 126:
                return '命令不可执行';
            case 127:
                return '命令未找到';
            case 128:
                return '无效的退出参数';
            case 130:
                return '进程被 Ctrl+C 终止 (SIGINT)';
            case 137:
                return '进程被 SIGKILL 信号强制终止';
            case 143:
                return '进程被 SIGTERM 信号终止';
            default:
                if ($exitCode > 128 && $exitCode < 256) {
                    $signal = $exitCode - 128;
                    return "进程被信号 {$signal} 终止";
                }
                return '未知错误';
        }
    }
    
    /**
     * 清理僵尸进程
     */
    protected function cleanupZombieProcesses()
    {
        if (!function_exists('pcntl_waitpid')) {
            return;
        }
        
        $status = 0;
        while (($pid = pcntl_waitpid(-1, $status, WNOHANG)) > 0) {
            // 清理僵尸进程
        }
    }
    
    /**
     * 检查任务是否正在运行（通过锁文件，参考 schedule.php）
     * 
     * @param string $taskId 任务ID
     * @return bool
     */
    protected function isTaskRunning($taskId)
    {
        $lockFile = $this->lockDir . 'schedule_' . md5($taskId) . '.lock';
        
        if (!file_exists($lockFile)) {
            return false;
        }
        
        // 检查锁文件是否过期（超过1小时认为过期）
        $lockTime = filemtime($lockFile);
        if (time() - $lockTime > 3600) {
            @unlink($lockFile);
            return false;
        }
        
        // 读取锁文件中的PID
        $lockContent = @file_get_contents($lockFile);
        if ($lockContent !== false) {
            $lockData = json_decode($lockContent, true);
            if (isset($lockData['pid']) && function_exists('posix_kill')) {
                // 检查进程是否真的在运行
                if (@posix_kill($lockData['pid'], 0)) {
                    return true;
                } else {
                    // 进程不存在，删除锁文件
                    @unlink($lockFile);
                    return false;
                }
            }
        }
        
        // 如果没有PID或无法检查，使用时间判断（2分钟内认为在运行）
        if (time() - $lockTime < 120) {
            return true;
        }
        
        return false;
    }
    
    /**
     * 创建任务锁文件（参考 schedule.php）
     * 
     * @param string $taskId 任务ID
     * @param int $pid 进程ID
     */
    protected function createLock($taskId, $pid = null)
    {
        $lockFile = $this->lockDir . 'schedule_' . md5($taskId) . '.lock';
        $lockData = [
            'task_id' => $taskId,
            'pid' => $pid ?: getmypid(),
            'time' => time(),
        ];
        file_put_contents($lockFile, json_encode($lockData));
    }
    
    /**
     * 删除任务锁文件（参考 schedule.php）
     * 
     * @param string $taskId 任务ID
     */
    protected function removeLock($taskId)
    {
        $lockFile = $this->lockDir . 'schedule_' . md5($taskId) . '.lock';
        if (file_exists($lockFile)) {
            @unlink($lockFile);
        }
    }
}

