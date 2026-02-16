<?php
namespace app\cunkebao\validate;

use think\Validate;

/**
 * 任务验证器
 */
class Task extends Validate
{
    /**
     * 验证规则
     * @var array
     */
    protected $rule = [
        'name'          => 'require|max:100',
        'device_id'     => 'number',
        'scene_id'      => 'number',
        'scene_config'  => 'array',
        'status'        => 'in:0,1,2,3',
        'priority'      => 'between:1,10',
        'created_by'    => 'number'
    ];
    
    /**
     * 错误信息
     * @var array
     */
    protected $message = [
        'name.require'      => '任务名称不能为空',
        'name.max'          => '任务名称不能超过100个字符',
        'device_id.number'  => '设备ID必须是数字',
        'scene_id.number'   => '场景ID必须是数字',
        'scene_config.array'=> '场景配置必须是数组',
        'status.in'         => '状态值无效',
        'priority.between'  => '优先级必须在1到10之间',
        'created_by.number' => '创建者ID必须是数字'
    ];
    
    /**
     * 验证场景
     * @var array
     */
    protected $scene = [
        'create' => ['name', 'device_id', 'scene_id', 'scene_config', 'status', 'priority', 'created_by'],
        'update' => ['name', 'device_id', 'scene_id', 'scene_config', 'status', 'priority']
    ];
} 