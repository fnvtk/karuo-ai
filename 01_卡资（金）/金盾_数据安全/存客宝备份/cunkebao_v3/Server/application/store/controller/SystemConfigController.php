<?php

namespace app\store\controller;

use think\Db;
use think\facade\Log;
use app\store\controller\BaseController;


/**
 * 系统设置控制器
 */
class SystemConfigController extends BaseController
{
    protected $noNeedLogin = [];
    protected $noNeedRight = ['*'];
    
    /**
     * 获取系统开关状态
     * 
     * @return \think\Response
     */
    public function getSwitchStatus()
    {
        try {
            // 获取设备ID
            $deviceId = $this->device['id'] ?? 0;
            if (!$deviceId) {
                return $this->error('设备不存在');
            }

            // 从新表中获取配置
            $config = Db::name('device_taskconf')
                ->where('deviceId', $deviceId)
                ->field('id,autoLike,autoCustomerDev,groupMessageDeliver,autoGroup,contentSync,aiChat,autoReply,momentsSync')
                ->find();

            // 如果没有找到配置，创建默认配置
            if (empty($config)) {
                $taskConfig = [
                    'deviceId' => $deviceId,
                    'autoLike' => 0,
                    'autoCustomerDev' => 0,
                    'groupMessageDeliver' => 0,
                    'autoGroup' => 0,
                    'contentSync' => 0,
                    'aiChat' => 0,
                    'autoReply' => 0,
                    'momentsSync' => 0,
                    'companyId' => $this->device['companyId'] ?? 0,
                    'createTime' => time(),
                    'updateTime' => time()
                ];
                
                // 添加到数据库
                Db::name('device_taskconf')->insert($taskConfig);
                
                // 返回默认配置
                return successJson($taskConfig);
            }

            // 返回开关状态
            return successJson($config);

        } catch (\Exception $e) {
            Log::error('获取开关状态异常：' . $e->getMessage());
            return $this->error('获取开关状态失败');
        }
    }
    
    /**
     * 更新系统开关状态
     * 
     * @return \think\Response
     */
    public function updateSwitchStatus()
    {
        try {
            // 获取参数
            if (empty($this->device)) {
                return errorJson('设备不存在');
            }

            $switchName = $this->request->param('switchName');
            $deviceId = $this->device['id'];
            
            if (empty($switchName)) {
                return errorJson('开关名称不能为空');
            }
            
            // 验证开关名称是否有效
            $validSwitches = ['autoLike', 'autoCustomerDev', 'groupMessageDeliver', 'autoGroup', 'contentSync', 'aiChat', 'autoReply', 'momentsSync'];
            if (!in_array($switchName, $validSwitches)) {
                return errorJson('无效的开关名称');
            }
            
            // 获取当前配置
            $taskConfig = Db::name('device_taskconf')
                ->where('deviceId', $deviceId)
                ->find();

            // 如果没有找到配置，创建默认配置
            if (empty($taskConfig)) {
                $taskConfig = [
                    'deviceId' => $deviceId,
                    'autoLike' => 0,
                    'autoCustomerDev' => 0,
                    'groupMessageDeliver' => 0,
                    'autoGroup' => 0,
                    'contentSync' => 0,
                    'aiChat' => 0,
                    'autoReply' => 0,
                    'momentsSync' => 0,
                    'companyId' => $this->device['companyId'] ?? 0,
                    'createTime' => time(),
                    'updateTime' => time()
                ];
                
                // 设置要更新的开关
                $taskConfig[$switchName] = 1;
                
                // 添加到数据库
                Db::name('device_taskconf')->insert($taskConfig);
            } else {
                // 更新指定开关状态
                $updateData = [
                    $switchName => !$taskConfig[$switchName],
                    'updateTime' => time()
                ];
                
                // 更新数据库
                $result = Db::name('device_taskconf')
                    ->where('deviceId', $deviceId)
                    ->update($updateData);
                    
                if ($result === false) {
                    Log::error("更新设备{$switchName}开关状态失败，设备ID：{$deviceId}");
                    return errorJson('更新失败');
                }
            }
            
            // 清除缓存
            $this->clearDeviceCache();
            
            return successJson([], '更新成功');
            
        } catch (\Exception $e) {
            return errorJson('系统错误'. $e->getMessage());
        }
    }
}