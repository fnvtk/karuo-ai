<?php

namespace app\cunkebao\controller\workbench;

use app\cunkebao\controller\BaseController;
use library\ResponseHelper;
use think\Db;

/**
 * 常用功能控制器
 */
class CommonFunctionsController extends BaseController
{
    /**
     * 获取常用功能列表
     * @return \think\response\Json
     */
    public function getList()
    {
        try {
            $companyId = $this->getUserInfo('companyId');
            
            // 从数据库查询常用功能列表
            $functions = Db::name('workbench_function')
                ->where('status', 1)
                ->order('sort ASC, id ASC')
                ->select();
    
            
            // 处理数据，判断是否显示New标签（创建时间近1个月）
            $oneMonthAgo = time() - 30 * 24 * 60 * 60; // 30天前的时间戳
            foreach ($functions as &$function) {
                // 判断是否显示New标签：创建时间在近1个月内
                $function['isNew'] = ($function['createTime'] >= $oneMonthAgo) ? true : false;
                $function['labels'] = json_decode($function['labels'],true);
            }
            unset($function);
            
            return ResponseHelper::success([
                'list' => $functions
            ]);

        } catch (\Exception $e) {
            return ResponseHelper::error('获取常用功能列表失败：' . $e->getMessage());
        }
    }
    
  
}

