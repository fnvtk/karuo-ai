<?php

namespace app\chukebao\model;

use think\Model;
class AiSettings extends Model
{
    protected $pk = 'id';
    protected $name  = 'ai_settings';

    // 自动写入时间戳
    protected $autoWriteTimestamp = true;
    protected $createTime = 'createTime';
    protected $updateTime = 'updateTime';


}