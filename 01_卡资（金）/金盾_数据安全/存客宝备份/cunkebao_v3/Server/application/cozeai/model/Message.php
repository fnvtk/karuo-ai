<?php

namespace app\cozeai\model;

use think\Model;

class Message extends Model
{
    protected $table = 'ck_coze_message';
    protected $pk = 'id';
    
    // 自动写入时间戳
    protected $autoWriteTimestamp = true;
    protected $createTime = 'create_time';
    protected $updateTime = 'update_time';
    
    // 类型转换
    protected $type = [
        'created_at'  =>  'integer',
        'updated_at'  =>  'integer',
        'create_time' =>  'integer',
        'update_time' =>  'integer'
    ];
} 