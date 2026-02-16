<?php

namespace app\chukebao\model;

use think\Model;
class ToDo extends Model
{
    protected $pk = 'id';
    protected $name  = 'kf_to_do';

    // 自动写入时间戳
    protected $autoWriteTimestamp = true;
    protected $createTime = 'createTime';
    protected $updateTime = 'updateTime';


}