<?php

namespace app\chukebao\model;

use think\Model;
class SensitiveWord extends Model
{
    protected $pk = 'id';
    protected $name  = 'kf_sensitive_word';

    // 自动写入时间戳
    protected $autoWriteTimestamp = true;
    protected $createTime = 'createTime';
    protected $updateTime = 'updateTime';


}