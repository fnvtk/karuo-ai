<?php
namespace app\command;

use think\console\Command;
use think\console\Input;
use think\console\Output;
use think\Db;
use think\facade\Config;

class InitDatabase extends Command
{
    protected function configure()
    {
        $this->setName('init:database')
            ->setDescription('初始化数据库，创建必要的表结构');
    }

    protected function execute(Input $input, Output $output)
    {
        $output->writeln('开始初始化数据库...');
        
        try {
            // 读取SQL文件
            $sqlFile = app()->getAppPath() . 'common/database/tk_users.sql';
            
            if (!file_exists($sqlFile)) {
                $output->error('SQL文件不存在: ' . $sqlFile);
                return;
            }
            
            $sql = file_get_contents($sqlFile);
            
            // 分割SQL语句
            $sqlArr = explode(';', $sql);
            
            // 执行SQL语句
            foreach ($sqlArr as $statement) {
                $statement = trim($statement);
                if ($statement) {
                    Db::execute($statement);
                    $output->writeln('执行SQL: ' . mb_substr($statement, 0, 100) . '...');
                }
            }
            
            $output->info('数据库初始化完成！');
        } catch (\Exception $e) {
            $output->error('数据库初始化失败: ' . $e->getMessage());
        }
    }
} 