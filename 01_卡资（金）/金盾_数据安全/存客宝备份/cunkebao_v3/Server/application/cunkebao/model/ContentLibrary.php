<?php

namespace app\cunkebao\model;

use think\Model;

class ContentLibrary extends Model
{
    protected $pk = 'id';
    protected $name = 'content_library';

    // 自动写入时间戳
    protected $autoWriteTimestamp = true;
    protected $createTime = 'createTime';
    protected $updateTime = 'updateTime';

    // 定义关联的用户
    public function user()
    {
        return $this->belongsTo('User', 'userId', 'id');
    }

    // 定义关联的内容项目
    public function items()
    {
        return $this->hasMany('ContentItem', 'libraryId', 'id');
    }

    // 根据ID数组获取内容库列表
    public static function getByIds($ids)
    {
        if (empty($ids)) {
            return [];
        }
        
        return self::where('id', 'in', $ids)->select();
    }
} 