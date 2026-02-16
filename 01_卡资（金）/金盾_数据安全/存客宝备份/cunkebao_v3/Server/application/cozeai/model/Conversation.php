<?php

namespace app\cozeai\model;

use think\Model;

/**
 * Coze AI 对话模型
 */
class Conversation extends Model
{
    // 设置表名
    protected $table = 'ck_coze_conversation';
    
    // 设置主键
    protected $pk = 'id';
    
    // 设置字段
    protected $schema = [
        'id' => 'int',
        'conversation_id' => 'string',
        'workspace_id' => 'string',
        'bot_id' => 'string',
        'title' => 'string',
        'create_time' => 'datetime',
        'update_time' => 'datetime'
    ];
    
    // 自动写入时间戳
    protected $autoWriteTimestamp = true;
    
    /**
     * 根据对话ID获取对话信息
     */
    public function getByConversationId($conversationId)
    {
        return $this->where('conversation_id', $conversationId)->find();
    }
    
    /**
     * 保存对话信息
     */
    public function saveConversation($data)
    {
        $conversation = $this->getByConversationId($data['conversation_id']);
        if ($conversation) {
            return $this->where('conversation_id', $data['conversation_id'])->update($data);
        } else {
            return $this->save($data);
        }
    }
    
    /**
     * 删除对话
     */
    public function deleteConversation($conversationId)
    {
        return $this->where('conversation_id', $conversationId)->delete();
    }
} 