<?php

namespace app\common\model;

use think\Model;

/**
 * 设备操作日志模型类
 */
class DeviceHandleLog extends Model
{
    // 设置表名
    protected $name = 'device_handle_log';

    // 自动写入时间戳
    protected $autoWriteTimestamp = true;
    protected $createTime = 'createTime';
    protected $updateTime = 'updateTime';

    /**
     * 添加设备操作日志
     *
     * @param array $data 日志数据
     * @return int 新增日志ID
     */
    public static function addLog(array $data): int
    {
        $log = new self();

        $log->allowField(true)->save($data);

        return $log->id;
    }
} 