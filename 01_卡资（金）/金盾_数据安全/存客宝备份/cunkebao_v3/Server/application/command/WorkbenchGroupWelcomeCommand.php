<?php
namespace app\command;

use app\job\WorkbenchGroupWelcomeJob;
use think\console\Command;
use think\console\Input;
use think\console\Output;
use think\facade\Log;

class WorkbenchGroupWelcomeCommand extends Command
{
    protected function configure()
    {
        $this->setName('workbench:groupWelcome')
            ->setDescription('工作台入群欢迎语任务队列');
    }

    protected function execute(Input $input, Output $output)
    {
        $output->writeln('开始处理工作台入群欢迎语任务...');
        
        try {
            $job = new WorkbenchGroupWelcomeJob();
            $result = $job->processWelcomeMessage([], 0);
            
            if ($result) {
                $output->writeln('入群欢迎语任务处理完成');
            } else {
                $output->writeln('入群欢迎语任务处理失败');
            }
            
            return $result;
        } catch (\Exception $e) {
            $errorMsg = '工作台入群欢迎语任务执行失败：' . $e->getMessage();
            Log::error($errorMsg);
            $output->writeln($errorMsg);
            return false;
        }
    }
}


