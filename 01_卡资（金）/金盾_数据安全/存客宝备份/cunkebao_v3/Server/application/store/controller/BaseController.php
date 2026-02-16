<?php

namespace app\store\controller;

use think\Controller;
use think\facade\Config;
use think\facade\Request;
use think\facade\Response;
use think\facade\Log;
use app\common\controller\Api;
use think\Db;
use think\facade\Cache;

/**
 * 基础控制器
 */
class BaseController extends Api
{
    protected $device = [];
    protected $userInfo = [];
    protected $cacheExpire = 3600; // 缓存过期时间：1小时

    /**
     * 构造方法
     */
    public function __construct()
    {
        parent::__construct();
        $this->userInfo = request()->userInfo;

        // 生成缓存key
        $cacheKey = 'device_info_' . $this->userInfo['id'] . '_' . $this->userInfo['companyId'];
        
        // 尝试从缓存获取设备信息
        $device = Cache::get($cacheKey);
        // 如果缓存不存在，则从数据库获取
        if (!$device) {
            $device = Db::name('device_user')
                ->alias('du')
                ->join('device d', 'd.id = du.deviceId','left')
                ->join('device_wechat_login dwl', 'dwl.deviceId = du.deviceId','left')
                ->join('wechat_account wa', 'dwl.wechatId = wa.wechatId','left')
                ->where([
                    'du.userId' => $this->userInfo['id'],
                    'du.companyId' => $this->userInfo['companyId']
                ])
                ->field('d.*,wa.wechatId,wa.alias,wa.s2_wechatAccountId as wechatAccountId')
                ->find();
            // 将设备信息存入缓存
            if ($device) {
                Cache::set($cacheKey, $device, $this->cacheExpire);
            }
        }
        $this->device = $device;
    }
    
    /**
     * 清除设备信息缓存
     */
    protected function clearDeviceCache()
    {
        $cacheKey = 'device_info_' . $this->userInfo['id'] . '_' . $this->userInfo['companyId'];
        Cache::rm($cacheKey);
    }
} 