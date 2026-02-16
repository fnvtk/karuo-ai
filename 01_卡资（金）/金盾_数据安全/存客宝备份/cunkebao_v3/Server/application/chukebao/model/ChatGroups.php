<?php

namespace app\chukebao\model;

use think\Model;

class ChatGroups extends Model
{
    protected $pk = 'id';
    protected $name = 'chat_groups';

    // 不开启自动时间戳，手动维护 createTime / deleteTime
    protected $autoWriteTimestamp = false;
}


