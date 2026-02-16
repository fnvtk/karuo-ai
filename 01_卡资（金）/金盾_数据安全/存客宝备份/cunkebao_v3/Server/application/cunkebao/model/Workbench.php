<?php

namespace app\cunkebao\model;

use think\Model;
use think\model\concern\SoftDelete;

/**
 * 工作台模型
 */
class Workbench extends Model
{

    protected $table = 'ck_workbench';
    protected $pk = 'id';

    // 自动写入时间戳
    protected $autoWriteTimestamp = true;
    protected $createTime = 'createTime';
    protected $updateTime = 'updateTime';
    protected $dateFormat = 'Y-m-d H:i:s';

    // 创建时间获取器
    public function getCreateTimeAttr($value)
    {
        return $value ? date('Y-m-d', is_numeric($value) ? $value : strtotime($value)) : '';
    }

    // 更新时间获取器
    public function getUpdateTimeAttr($value)
    {
        return $value ? date('Y-m-d', is_numeric($value) ? $value : strtotime($value)) : '';
    }

    // 自动点赞配置关联
    public function autoLike()
    {
        return $this->hasOne('WorkbenchAutoLike', 'workbenchId', 'id');
    }

    // 朋友圈同步配置关联
    public function momentsSync()
    {
        return $this->hasOne('WorkbenchMomentsSync', 'workbenchId', 'id');
    }

    // 群消息推送配置关联
    public function groupPush()
    {
        return $this->hasOne('WorkbenchGroupPush', 'workbenchId', 'id');
    }

    // 自动建群配置关联
    public function groupCreate()
    {
        return $this->hasOne('WorkbenchGroupCreate', 'workbenchId', 'id');
    }
 
    // 流量分发配置关联
    public function trafficConfig()
    {
        return $this->hasOne('WorkbenchTrafficConfig', 'workbenchId', 'id');
    }

    public function importContact()
    {
        return $this->hasOne('WorkbenchImportContact', 'workbenchId', 'id');
    }

    // 入群欢迎语配置关联
    public function groupWelcome()
    {
        return $this->hasOne('WorkbenchGroupWelcome', 'workbenchId', 'id');
    }

    /**
     * 用户关联
     */
    public function user()
    {
        return $this->belongsTo('User', 'userId', 'id');
    }
} 