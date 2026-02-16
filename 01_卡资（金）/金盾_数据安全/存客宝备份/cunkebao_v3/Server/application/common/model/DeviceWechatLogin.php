<?php

namespace app\common\model;

use think\Model;

/**
 * 微信好友模型类
 */
class DeviceWechatLogin extends Model
{
    const ALIVE_WECHAT_ACTIVE = 1;  // 微信在线
    const ALIVE_WECHAT_DIED = 0;    // 微信离线

    // 登录日志最新登录 alive = 1，旧数据全部设置0
    protected $name = 'device_wechat_login';

    // 自动写入时间戳
    protected $autoWriteTimestamp = true;
    protected $createTime = 'createTime';
    protected $updateTime = 'updateTime';

    /**
     * 获取设备最新登录记录的id
     *
     * @param array $deviceIds
     * @return array
     */
    public static function getDevicesLatestLogin(array $deviceIds): array
    {
        return static::fieldRaw('max(id) as lastedId,deviceId')
            ->whereIn('deviceId', $deviceIds)
            ->group('deviceId')
            ->select()
            ->toArray();
    }
}