<?php

namespace app\common\model;

use think\Model;

class Attachment extends Model
{
    // 设置表名
    protected $name = 'attachments';

    // 自动写入时间戳
    protected $autoWriteTimestamp = true;
    protected $createTime = 'createTime';
    protected $updateTime = 'updateTime';
    protected $defaultSoftDelete = 0;


    public static function addAttachment($attachmentData)
    {
        return self::create($attachmentData);
    }
} 