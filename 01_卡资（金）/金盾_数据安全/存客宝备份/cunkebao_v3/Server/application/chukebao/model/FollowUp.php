<?php

namespace app\chukebao\model;

use think\Model;
class FollowUp extends Model
{
    protected $pk = 'id';
    protected $name  = 'kf_follow_up';

    // 自动写入时间戳
    protected $autoWriteTimestamp = true;
    protected $createTime = 'createTime';
    protected $updateTime = 'updateTime';


}