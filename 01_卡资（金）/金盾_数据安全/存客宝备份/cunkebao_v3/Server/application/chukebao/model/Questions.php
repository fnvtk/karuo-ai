<?php

namespace app\chukebao\model;

use think\Model;
class Questions extends Model
{
    protected $pk = 'id';
    protected $name  = 'kf_questions';

    // 自动写入时间戳
    protected $autoWriteTimestamp = true;
    protected $createTime = 'createTime';
    protected $updateTime = 'updateTime';


}