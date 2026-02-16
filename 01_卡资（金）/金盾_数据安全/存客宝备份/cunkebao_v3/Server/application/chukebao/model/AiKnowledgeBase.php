<?php

namespace app\chukebao\model;

use think\Model;

/**
 * AI知识库模型
 */
class AiKnowledgeBase extends Model
{
    // 设置表名
    protected $name = 'ai_knowledge_base';
    
    // 设置主键
    protected $pk = 'id';
    
    // 设置JSON字段
    protected $json = ['label'];
    
    // 设置JSON字段自动转换为数组
    protected $jsonAssoc = true;
    
    /**
     * 关联知识库类型
     */
    public function type()
    {
        return $this->belongsTo(AiKnowledgeBaseType::class, 'typeId', 'id');
    }
    
    /**
     * 获取有效的知识库列表（未删除）
     */
    public static function getValidList($companyId, $typeId = null)
    {
        $where = [
            ['isDel', '=', 0],
            ['companyId', '=', $companyId]
        ];
        
        if ($typeId !== null) {
            $where[] = ['typeId', '=', $typeId];
        }
        
        return self::where($where)
            ->with(['type'])
            ->order('createTime', 'desc')
            ->select();
    }
}

