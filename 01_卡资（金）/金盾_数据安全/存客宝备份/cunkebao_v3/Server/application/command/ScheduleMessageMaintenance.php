<?php
namespace app\command;

use think\console\Command;
use think\console\Input;
use think\console\Output;
use think\console\input\Option;

class ScheduleMessageMaintenance extends Command
{
    protected function configure()
    {
        $this->setName('schedule:message_maintenance')
            ->setDescription('Schedule and run message maintenance tasks')
            ->addOption('optimize-indexes', null, Option::VALUE_NONE, 'Run index optimization')
            ->addOption('clean-messages', null, Option::VALUE_NONE, 'Clean expired messages')
            ->addOption('days', 'd', Option::VALUE_OPTIONAL, 'Number of days to keep messages (default: 90)', 90)
            ->addOption('batch-size', 'b', Option::VALUE_OPTIONAL, 'Batch size for deletion (default: 1000)', 1000)
            ->addOption('dry-run', null, Option::VALUE_NONE, 'Perform a dry run without deleting any data');
    }

    protected function execute(Input $input, Output $output)
    {
        $optimizeIndexes = $input->getOption('optimize-indexes');
        $cleanMessages = $input->getOption('clean-messages');
        $days = (int)$input->getOption('days');
        $batchSize = (int)$input->getOption('batch-size');
        $dryRun = $input->getOption('dry-run');

        // 如果没有指定任何选项，则运行所有维护任务
        if (!$optimizeIndexes && !$cleanMessages) {
            $optimizeIndexes = true;
            $cleanMessages = true;
        }

        $output->writeln("<info>Starting scheduled message maintenance tasks...</info>");
        $startTime = microtime(true);

        // 运行索引优化
        if ($optimizeIndexes) {
            $this->runCommand($output, 'optimize:message_indexes');
        }

        // 清理过期消息
        if ($cleanMessages) {
            $options = [];
            
            if ($days !== 90) {
                $options[] = "--days={$days}";
            }
            
            if ($batchSize !== 1000) {
                $options[] = "--batch-size={$batchSize}";
            }
            
            if ($dryRun) {
                $options[] = "--dry-run";
            }
            
            $this->runCommand($output, 'clean:expired_messages', $options);
            $this->runCommand($output, 'clean:expired_group_messages', $options);
        }

        $endTime = microtime(true);
        $executionTime = round($endTime - $startTime, 2);
        $output->writeln("<info>All maintenance tasks completed in {$executionTime} seconds.</info>");
    }

    protected function runCommand(Output $output, $command, array $options = [])
    {
        $output->writeln("\n<comment>Running command: {$command}</comment>");
        
        $optionsStr = implode(' ', $options);
        $fullCommand = "php think {$command} {$optionsStr}";
        
        $output->writeln("Executing: {$fullCommand}");
        $output->writeln("\n<info>Command output:</info>");
        
        // 执行命令并实时输出结果
        $descriptorSpec = [
            0 => ["pipe", "r"],  // stdin
            1 => ["pipe", "w"],  // stdout
            2 => ["pipe", "w"]   // stderr
        ];
        
        $process = proc_open($fullCommand, $descriptorSpec, $pipes);
        
        if (is_resource($process)) {
            // 关闭标准输入
            fclose($pipes[0]);
            
            // 读取标准输出
            while (!feof($pipes[1])) {
                $line = fgets($pipes[1]);
                if ($line !== false) {
                    $output->write($line);
                }
            }
            fclose($pipes[1]);
            
            // 读取标准错误
            $errorOutput = stream_get_contents($pipes[2]);
            fclose($pipes[2]);
            
            // 获取命令执行结果
            $exitCode = proc_close($process);
            
            if ($exitCode !== 0) {
                $output->writeln("\n<error>Command failed with exit code {$exitCode}</error>");
                if (!empty($errorOutput)) {
                    $output->writeln("<error>Error output:</error>");
                    $output->writeln($errorOutput);
                }
            } else {
                $output->writeln("\n<info>Command completed successfully.</info>");
            }
        } else {
            $output->writeln("<error>Failed to execute command.</error>");
        }
    }
}