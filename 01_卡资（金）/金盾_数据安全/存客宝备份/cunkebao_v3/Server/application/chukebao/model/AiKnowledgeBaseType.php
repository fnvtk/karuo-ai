<?php

namespace app\chukebao\model;

use think\Model;

/**
 * AI知识库类型模型
 */
class AiKnowledgeBaseType extends Model
{
    // 设置表名
    protected $name = 'ai_knowledge_base_type';
    
    // 设置主键
    protected $pk = 'id';
    
    // 设置JSON字段
    protected $json = ['label'];
    
    // 设置JSON字段自动转换为数组
    protected $jsonAssoc = true;
    
    // 类型常量
    const TYPE_SYSTEM = 0; // 系统类型
    const TYPE_USER = 1;   // 用户创建类型
    
    /**
     * 获取有效的类型列表（未删除）
     */
    public static function getValidList($companyId, $includeSystem = true)
    {
        $where = [
            ['isDel', '=', 0]
        ];
        
        if ($includeSystem) {
            $where[] = ['type|companyId', 'in', [0, $companyId]];
        } else {
            $where[] = ['companyId', '=', $companyId];
            $where[] = ['type', '=', self::TYPE_USER];
        }
        
        return self::where($where)
            ->order('createTime', 'desc')
            ->select();
    }
    
    /**
     * 检查是否为系统类型
     */
    public function isSystemType()
    {
        return $this->type == self::TYPE_SYSTEM;
    }
}

