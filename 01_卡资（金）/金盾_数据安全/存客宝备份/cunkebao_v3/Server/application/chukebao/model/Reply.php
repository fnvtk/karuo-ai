<?php

namespace app\chukebao\model;

use think\Model;
class Reply extends Model
{
    protected $pk = 'id';
    protected $name  = 'kf_reply';

    // 自动写入时间戳
    protected $autoWriteTimestamp = true;
    protected $createTime = 'createTime';
    protected $updateTime = 'lastUpdateTime';


}