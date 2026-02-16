<?php

namespace app\chukebao\model;

use think\Model;
class AutoGreetings extends Model
{
    protected $pk = 'id';
    protected $name  = 'kf_auto_greetings';

    // 自动写入时间戳
    protected $autoWriteTimestamp = true;
    protected $createTime = 'createTime';
    protected $updateTime = 'updateTime';


}