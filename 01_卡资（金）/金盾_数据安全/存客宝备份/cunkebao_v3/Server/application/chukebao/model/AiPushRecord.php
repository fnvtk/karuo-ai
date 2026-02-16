<?php

namespace app\chukebao\model;

use think\Model;

class AiPushRecord extends Model
{
    protected $pk = 'id';
    protected $name = 'kf_ai_push_record';

    // 自动写入时间戳
    protected $autoWriteTimestamp = true;
    protected $createTime = 'createTime';
}

