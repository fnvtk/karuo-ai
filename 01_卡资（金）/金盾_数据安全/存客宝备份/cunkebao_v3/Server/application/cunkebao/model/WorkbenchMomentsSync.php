<?php

namespace app\cunkebao\model;

use think\Model;

class WorkbenchMomentsSync extends Model
{
    protected $table = 'ck_workbench_moments_sync';
    protected $pk = 'id';
    protected $name  = 'workbench_moments_sync';

    // 同步类型
    const SYNC_TYPE_TEXT = 1;      // 文本
    const SYNC_TYPE_IMAGE = 2;     // 图片
    const SYNC_TYPE_VIDEO = 3;     // 视频
    const SYNC_TYPE_LINK = 4;      // 链接

    // 自动写入时间戳
    protected $autoWriteTimestamp = true;
    protected $createTime = 'createTime';
    protected $updateTime = 'updateTime';

    // 定义关联的工作台
    public function workbench()
    {
        return $this->belongsTo('Workbench', 'workbenchId', 'id');
    }

    // 定义关联的内容库
    public function contentLibraries()
    {
        return $this->belongsToMany('ContentLibrary', 'workbench_content_relation', 'contentLibraryId', 'workbenchId');
    }

    // 开始时间获取器
    public function getStartTimeAttr($value)
    {
        return $value ? date('H:i', strtotime($value)) : '';
    }

    // 结束时间获取器
    public function getEndTimeAttr($value)
    {
        return $value ? date('H:i', strtotime($value)) : '';
    }

    // 同步类型获取器
    public function getSyncTypeTextAttr($value, $data)
    {
        $types = [
            self::SYNC_TYPE_TEXT => '文本',
            self::SYNC_TYPE_IMAGE => '图片',
            self::SYNC_TYPE_VIDEO => '视频',
            self::SYNC_TYPE_LINK => '链接'
        ];
        return isset($types[$data['syncType']]) ? $types[$data['syncType']] : '未知';
    }
} 