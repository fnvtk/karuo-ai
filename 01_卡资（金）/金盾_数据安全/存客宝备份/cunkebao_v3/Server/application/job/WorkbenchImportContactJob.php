<?php

namespace app\job;

use app\api\controller\DeviceController;
use app\cunkebao\model\Workbench;
use app\cunkebao\model\WorkbenchImportContact;
use think\facade\Log;
use think\facade\Env;
use think\Db;
use think\queue\Job;
use think\facade\Cache;
use think\facade\Config;

/**
 * 工作台通讯录导入任务
 * Class WorkbenchImportContactJob
 * @package app\job
 */
class WorkbenchImportContactJob
{

    /**
     * 最大重试次数
     */
    const MAX_RETRY_ATTEMPTS = 3;

    /**
     * 队列任务处理
     * @param Job $job 队列任务
     * @param array $data 任务数据
     * @return bool
     */
    public function fire(Job $job, $data)
    {
        $jobId = $data['jobId'] ?? '';
        $queueLockKey = $data['queueLockKey'] ?? '';
        try {
            $this->logJobStart($jobId, $queueLockKey);
            $this->execute();
            $this->handleJobSuccess($job, $queueLockKey);
            return true;
        } catch (\Exception $e) {
            return $this->handleJobError($e, $job, $queueLockKey);
        }
    }

    /**
     * 执行任务
     * @throws \Exception
     */
    public function execute()
    {
        try {
            // 获取所有启用的通讯录导入工作台
            $workbenches = Workbench::where(['status' => 1, 'type' => 6, 'isDel' => 0])->order('id desc')->select();
            foreach ($workbenches as $workbench) {
                // 获取工作台配置
                $config = WorkbenchImportContact::where('workbenchId', $workbench->id)->find();
                if (!$config) {
                    continue;
                }

                // 判断是否需要导入
                $shouldImport = $this->shouldImport($workbench, $config);
                if (!$shouldImport) {
                    continue;
                }

                // 获取需要导入的设备列表
                $devices = $this->getDeviceList($workbench, $config);
                if (empty($devices)) {
                    continue;
                }

                // 获取通讯录数据
                $contactData = $this->getContactFromDatabase($workbench, $config);
                if (empty($contactData)) {
                    continue;
                }

                // 执行通讯录导入
                $this->importContactToDevices($workbench, $config, $devices, $contactData);
            }
        } catch (\Exception $e) {
            Log::error("通讯录导入任务异常: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * 导入通讯录到设备
     * @param Workbench $workbench
     * @param WorkbenchImportContact $config
     * @param array $devices
     * @param array $contactData
     */
    public function importContactToDevices($workbench, $config, $devices, $contactData)
    {
        $deviceController = new DeviceController();
        
        // 根据设备数量平分通讯录数据
        $deviceCount = count($devices);
        if ($deviceCount == 0) {
            Log::warning("没有可用设备进行通讯录导入");
            return;
        }
        
        $contactCount = count($contactData);
        if ($contactCount == 0) {
            Log::warning("没有通讯录数据需要导入");
            return;
        }
        
        // 计算每个设备分配的联系人数量
        $contactsPerDevice = ceil($contactCount / $deviceCount);
        foreach ($devices as $index => $device) {
            try {
                // 计算当前设备的联系人数据范围
                $startIndex = $index * $contactsPerDevice;
                $endIndex = min($startIndex + $contactsPerDevice, $contactCount);
                
                // 如果起始索引超出范围，跳过
                if ($startIndex >= $contactCount) {
                    continue;
                }
                
                // 获取当前设备的联系人数据片段
                $deviceContactData = array_slice($contactData, $startIndex, $endIndex - $startIndex);
                
                if (empty($deviceContactData)) {
                    continue;
                }
                // 准备联系人数据
                $contactJson = $this->formatContactData($deviceContactData, $config);

                // 调用设备控制器的导入联系人方法
                $result = $deviceController->importContact([
                    'deviceId' => $device['deviceId'],
                    'contactJson' => $contactJson,
                    'clearContact' => $config['clearContact'] ?? false
                ], true);

                $resultData = json_decode($result, true);
                
                // 记录导入历史
                $this->recordImportHistory($workbench, $device, $deviceContactData);
                
                if ($resultData['code'] == 200) {
                    Log::info("设备 {$device['deviceId']} 通讯录导入成功，导入联系人数量: " . count($deviceContactData));
                } else {
                    Log::error("设备 {$device['deviceId']} 通讯录导入失败: " . ($resultData['msg'] ?? '未知错误'));
                }
                
                // 添加延迟，避免频繁请求
                if ($config['importInterval'] ?? 0 > 0) {
                    sleep($config['importInterval']);
                }
                
            } catch (\Exception $e) {
                Log::error("设备 {$device['deviceId']} 通讯录导入异常: " . $e->getMessage());
            }
        }
    }

    /**
     * 格式化联系人数据
     * @param array $contactData
     * @param WorkbenchImportContact $config
     * @return array|string
     */
    protected function formatContactData($contactData, $config)
    {
        $remarkType = $config['remarkType'] ?? 0;
        $remark = $config['remark'] ?? '';

        // 根据remarkType添加备注
        $suffix = '';
        switch ($remarkType) {
            case 0:
                // 不添加备注
                $suffix = '';
                break;
            case 1:
                // 添加年月日
                $suffix = date('Ymd') . '_';
                break;
            case 2:
                // 添加月日
                $suffix = date('md') . '_';
                break;
            case 3:
                // 自定义备注
                $suffix = $remark . '_';
                break;
            default:
                $suffix = '';
                break;
        }
        // 返回数组格式
        $contacts = [];
        foreach ($contactData as $contact) {
               $name = !empty($contact['name']) ? trim($contact['name']) : trim($contact['phone']);
               if (!empty($suffix)) {
                  $name = $suffix . $name;
            }
              $contacts[] = [
                'name' => $name,
                'phone' => trim($contact['phone'])
               ];
         }
        return $contacts;
        
    }

    /**
     * 记录导入历史
     * @param Workbench $workbench
     * @param array $device
     * @param array $contactData
     * @param array $result
     */
    protected function recordImportHistory($workbench, $device, $contactData)
    {
        $data = [];
        foreach ($contactData as $v){
            $data[] = [
                'workbenchId' => $workbench->id,
                'deviceId' => $device['deviceId'],
                'packageId' => !empty($v['packageId']) ? $v['packageId'] : 0,
                'poolId' => !empty($v['id']) ? $v['id'] : 0,
                'createTime' => time(),
            ];
        }
        Db::name('workbench_import_contact_item')->insertAll($data);
    }

    /**
     * 获取设备列表
     * @param Workbench $workbench 工作台
     * @param WorkbenchImportContact $config 配置
     * @return array
     */
    protected function getDeviceList($workbench, $config)
    {
        $deviceIds = json_decode($config['devices'], true);
        if (empty($deviceIds)) {
            return [];
        }

        // 从数据库获取设备信息
        $devices = Db::table('s2_device')
            ->whereIn('id', $deviceIds)
            ->where('isDeleted', 0)
            ->where('alive', 1) // 只选择在线设备
            ->field('id as deviceId, imei, nickname')
            ->select();

        return $devices;
    }

    /**
     * 判断是否需要导入
     * @param Workbench $workbench 工作台
     * @param WorkbenchImportContact $config 配置
     * @return bool
     */
    protected function shouldImport($workbench, $config)
    {
        // 检查导入间隔
        $today = date('Y-m-d');
        $startTimestamp = strtotime($today . ' ' . $config['startTime'] . ':00');
        $endTimestamp = strtotime($today . ' ' . $config['endTime'] . ':00');
        // 如果不在指定时间范围内，则跳过
        if ($startTimestamp > time() || $endTimestamp < time()) {
            return false;
        }

        $maxPerDay = $config['num'];
        if ($maxPerDay <= 0) {
            return false;
        }

        // 查询今日已导入次数
        $count = Db::name('workbench_import_contact_item')
            ->where('workbenchId', $workbench->id)
            ->whereTime('createTime', 'between', [$startTimestamp, $endTimestamp])
            ->count();
            
        if ($count >= $maxPerDay) {
            return false;
        }

        // 计算导入间隔
        $totalSeconds = $endTimestamp - $startTimestamp;
        $interval = floor($totalSeconds / $maxPerDay);
        $nextImportTime = $startTimestamp + $count * $interval;
        
        if (time() < $nextImportTime) {
            return false;
        }

        return true;
    }



    /**
     * 从数据库读取通讯录
     * @param WorkbenchImportContact $config
     * @return array
     */
    protected function getContactFromDatabase($workbench,$config)
    {
        $pools = json_decode($config['pools'], true);
        $deviceIds = json_decode($config['devices'], true);
        if (empty($pools) || empty($deviceIds)) {
            return false;
        }
        $deviceNum = count($deviceIds);
        $contactNum = $deviceNum * $config['num'];
        if (empty($contactNum)) {
            return false;
        }
        // 检查是否包含"所有好友"（packageId=0）
        $hasAllFriends = in_array(0, $pools) || in_array('0', $pools);
        $normalPools = array_filter($pools, function($id) {
            return $id !== 0 && $id !== '0';
        });
        
        $data = [];
        
        // 处理"所有好友"特殊流量池
        if ($hasAllFriends) {
            $allFriendsData = $this->getAllFriendsForImportContact($workbench, $contactNum);
            $data = array_merge($data, $allFriendsData);
        }
        
        // 处理普通流量池
        if (!empty($normalPools)) {
            //过滤已删除的数据
            $packageIds = Db::name('traffic_source_package')
                ->where(['isDel' => 0])
                ->whereIn('id', $normalPools)
                ->column('id');

            if (!empty($packageIds)) {
                $normalData = Db::name('traffic_source_package_item')->alias('tpi')
                    ->join('traffic_pool tp', 'tp.identifier = tpi.identifier')
                    ->join('traffic_source ts', 'ts.identifier = tpi.identifier','left')
                    ->join('workbench_import_contact_item wici', 'wici.poolId = tp.id AND wici.workbenchId = '.$workbench->id,'left')
                    ->where('tp.mobile', '>',0)
                    ->where('wici.id','null')
                    ->whereIn('tpi.packageId',$packageIds)
                    ->field('tp.id,tpi.packageId,tp.mobile as phone,ts.name')
                    ->order('tp.id DESC')
                    ->group('tpi.identifier')
                    ->limit($contactNum)
                    ->select();
                $data = array_merge($data, $normalData ?: []);
            }
        }
        
        if (empty($data)) {
            return false;
        }
        
        return $data;
    }
    
    /**
     * 获取"所有好友"流量池的联系人数据（用于通讯录导入）
     * @param Workbench $workbench
     * @param int $limit
     * @return array
     */
    protected function getAllFriendsForImportContact($workbench, $limit)
    {
        $companyId = $workbench->companyId ?? 0;
        
        // 获取公司下所有设备的微信ID
        $wechatIds = Db::name('device')->alias('d')
            ->join('(SELECT MAX(id) AS id, deviceId FROM ck_device_wechat_login WHERE companyId='.$companyId.' GROUP BY deviceId) dwl_max', 'dwl_max.deviceId = d.id')
            ->join('device_wechat_login dwl', 'dwl.id = dwl_max.id')
            ->where(['d.companyId' => $companyId, 'd.deleteTime' => 0])
            ->column('dwl.wechatId');

        if (empty($wechatIds)) {
            return [];
        }

        // 从 s2_wechat_friend 表获取好友，然后关联 traffic_pool 表获取手机号
        $data = Db::table('s2_wechat_friend')->alias('wf')
            ->join('traffic_pool tp', 'tp.wechatId = wf.wechatId', 'left')
            ->join('traffic_source ts', 'ts.identifier = tp.identifier', 'left')
            ->join('workbench_import_contact_item wici', 'wici.poolId = tp.id AND wici.workbenchId = '.$workbench->id, 'left')
            ->where('wf.ownerWechatId', 'in', $wechatIds)
            ->where('wf.isDeleted', 0)
            ->where('tp.mobile', '>', 0)
            ->where('wici.id', 'null')
            ->field('tp.id,tp.mobile as phone,ts.name')
            ->field(Db::raw('0 as packageId')) // 标记为"所有好友"流量池
            ->order('tp.id DESC')
            ->group('tp.identifier')
            ->limit($limit)
            ->select();

        return $data ?: [];
    }

    /**
     * 记录任务开始
     * @param string $jobId
     * @param string $queueLockKey
     */
    protected function logJobStart($jobId, $queueLockKey)
    {
        Log::info('开始处理工作台通讯录导入任务: ' . json_encode([
                'jobId' => $jobId,
                'queueLockKey' => $queueLockKey
            ]));
    }

    /**
     * 处理任务成功
     * @param Job $job
     * @param string $queueLockKey
     */
    protected function handleJobSuccess($job, $queueLockKey)
    {
        $job->delete();
        Cache::rm($queueLockKey);
        Log::info('工作台通讯录导入任务执行成功');
    }

    /**
     * 处理任务错误
     * @param \Exception $e
     * @param Job $job
     * @param string $queueLockKey
     * @return bool
     */
    protected function handleJobError(\Exception $e, $job, $queueLockKey)
    {
        Log::error('工作台通讯录导入任务异常：' . $e->getMessage());

        if (!empty($queueLockKey)) {
            Cache::rm($queueLockKey);
            Log::info("由于异常释放队列锁: {$queueLockKey}");
        }

        if ($job->attempts() > self::MAX_RETRY_ATTEMPTS) {
            $job->delete();
        } else {
            $job->release(Config::get('queue.failed_delay', 10));
        }

        return false;
    }
}