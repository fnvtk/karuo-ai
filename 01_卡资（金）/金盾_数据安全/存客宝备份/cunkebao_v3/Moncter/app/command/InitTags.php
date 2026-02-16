<?php

namespace app\command;

use app\service\TagInitService;

/**
 * 初始化标签命令
 *
 * 用于预置基础标签定义
 * 使用方法：php start.php init:tags
 */
class InitTags
{
    public function run(): void
    {
        echo "开始初始化标签定义...\n";
        
        $initService = new TagInitService(
            new \app\repository\TagDefinitionRepository()
        );
        
        $initService->initBasicTags();
        
        echo "标签初始化完成！\n";
    }
}

