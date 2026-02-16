<?php

namespace app\cunkebao\model;

use think\Model;

/**
 * 入群欢迎语发送记录模型
 */
class WorkbenchGroupWelcomeItem extends Model
{
    protected $table = 'ck_workbench_group_welcome_item';
    protected $pk = 'id';
    protected $name = 'workbench_group_welcome_item';

    // 自动写入时间戳
    protected $autoWriteTimestamp = true;
    protected $createTime = 'createTime';
    protected $updateTime = 'updateTime';

    // 状态常量
    const STATUS_PENDING = 0;      // 待发送
    const STATUS_SENDING = 1;     // 发送中
    const STATUS_SUCCESS = 2;     // 发送成功
    const STATUS_FAILED = 3;       // 发送失败

    /**
     * 定义关联的工作台
     */
    public function workbench()
    {
        return $this->belongsTo('Workbench', 'workbenchId', 'id');
    }

    /**
     * 获取状态文本
     * @param int $status 状态值
     * @return string
     */
    public static function getStatusText($status)
    {
        $statusMap = [
            self::STATUS_PENDING => '待发送',
            self::STATUS_SENDING => '发送中',
            self::STATUS_SUCCESS => '发送成功',
            self::STATUS_FAILED => '发送失败',
        ];
        return $statusMap[$status] ?? '未知';
    }
}

