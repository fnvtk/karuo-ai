<?php

namespace app\cunkebao\model;

use think\Model;

class ContentItem extends Model
{
    protected $pk = 'id';
    protected $name = 'content_item';



    // 自动写入时间戳
    protected $autoWriteTimestamp = true;
    protected $createTime = 'createTime';
    protected $updateTime = 'updateTime';


} 