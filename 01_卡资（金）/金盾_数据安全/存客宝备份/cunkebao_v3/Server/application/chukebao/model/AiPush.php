<?php

namespace app\chukebao\model;

use think\Model;

class AiPush extends Model
{
    protected $pk = 'id';
    protected $name = 'kf_ai_push';

    // 自动写入时间戳
    protected $autoWriteTimestamp = true;
    protected $createTime = 'createTime';
    protected $updateTime = 'updateTime';
}

