<?php

namespace app\cozeai\model;

use think\Model;

/**
 * Coze AI 工作区模型
 */
class Workspace extends Model
{
    // 设置当前模型对应的完整数据表名称
    protected $table = 'ck_coze_workspace';
    
    // 设置主键
    protected $pk = 'id';
    
    // 设置字段信息
    protected $schema = [
        'id' => 'int',
        'workspace_id' => 'string',
        'name' => 'string',
        'description' => 'string',
        'create_time' => 'datetime',
        'update_time' => 'datetime'
    ];
    
    // 自动写入时间戳
    protected $autoWriteTimestamp = true;
    protected $createTime = 'create_time';
    protected $updateTime = 'update_time';
    
    /**
     * 根据工作区ID获取工作区信息
     */
    public function getByWorkspaceId($workspaceId)
    {
        return $this->where('workspace_id', $workspaceId)->find();
    }
    
    /**
     * 保存工作区信息
     */
    public function saveWorkspace($data)
    {
        $workspace = $this->getByWorkspaceId($data['workspace_id']);
        
        if ($workspace) {
            // 更新
            return $this->where('workspace_id', $data['workspace_id'])->update($data);
        } else {
            // 新增
            return $this->save($data);
        }
    }
    
    /**
     * 删除工作区
     */
    public function deleteWorkspace($workspaceId)
    {
        return $this->where('workspace_id', $workspaceId)->delete();
    }
} 