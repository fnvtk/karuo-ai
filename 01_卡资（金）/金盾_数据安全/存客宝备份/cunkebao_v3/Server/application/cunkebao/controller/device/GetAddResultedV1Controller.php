<?php

namespace app\cunkebao\controller\device;

use app\api\controller\DeviceController as ApiDeviceController;
use app\common\model\Device as DeviceModel;
use app\common\model\User as UserModel;
use app\cunkebao\controller\BaseController;
use library\ResponseHelper;
use think\Db;
use think\facade\Cache;

/**
 * 设备控制器
 */
class GetAddResultedV1Controller extends BaseController
{
    /**
     * 通过账号id 获取项目id。
     *
     * @param int $accountId
     * @return int
     */
    protected function getCompanyIdByAccountId(int $accountId): int
    {
        return UserModel::where('s2_accountId', $accountId)->value('companyId');
    }

    /**
     * 获取项目下的所有设备。
     *
     * @param int $companyId
     * @return array
     */
    protected function getAllDevicesIdWithInCompany(int $companyId): array
    {
        return DeviceModel::where('companyId', $companyId)->column('id') ?: [0];
    }

    /**
     * 执行数据迁移。
     *
     * @param int $accountId
     * @return void
     */
    protected function migrateData(int $accountId): void
    {
        $companyId = $this->getCompanyIdByAccountId($accountId);
        $deviceIds = $this->getAllDevicesIdWithInCompany($companyId) ?: [0];

        // 从 s2_device 导入数据。
        $newDeviceIds = $this->getNewDeviceFromS2_device($deviceIds, $companyId);
        
        // 如果有新设备，自动加入到全局配置中
        if (!empty($newDeviceIds)) {
            $this->addDevicesToGlobalConfigs($newDeviceIds, $companyId);
        }
    }

    /**
     * 从 s2_device 导入数据。
     *
     * @param array $ids
     * @param int $companyId
     * @return array 返回新添加的设备ID数组
     */
    protected function getNewDeviceFromS2_device(array $ids, int $companyId): array
    {
        $ids = implode(',', $ids);

        // 先查询要插入的新设备ID
        $newDeviceIds = Db::query("SELECT d.id
                FROM s2_device d 
                    JOIN s2_company_account a ON d.currentAccountId = a.id 
                WHERE isDeleted = 0 AND deletedAndStop = 0 AND d.id NOT IN ({$ids}) AND a.departmentId = {$companyId}");
        $newDeviceIds = array_column($newDeviceIds, 'id');

        if (empty($newDeviceIds)) {
            return [];
        }

        $sql = "INSERT INTO ck_device(`id`, `imei`, `model`, phone, operatingSystem, memo, alive, brand, rooted, xPosed, softwareVersion, extra, createTime, updateTime, deleteTime, companyId)  
                SELECT 
                    d.id, d.imei, d.model, d.phone, d.operatingSystem, d.memo, d.alive, d.brand, d.rooted, d.xPosed, d.softwareVersion, d.extra, d.createTime, d.lastUpdateTime, d.deleteTime, a.departmentId AS companyId
                FROM s2_device d 
                    JOIN s2_company_account a ON d.currentAccountId = a.id 
                WHERE isDeleted = 0 AND deletedAndStop = 0 AND d.id NOT IN ({$ids}) AND a.departmentId = {$companyId}
                ON DUPLICATE KEY UPDATE 
                    imei = VALUES(imei),
                    model = VALUES(model),
                    phone = VALUES(phone),
                    operatingSystem = VALUES(operatingSystem),
                    memo = VALUES(memo),
                    alive = VALUES(alive),
                    brand = VALUES(brand),
                    rooted = VALUES(rooted),
                    xPosed = VALUES(xPosed),
                    softwareVersion = VALUES(softwareVersion),
                    extra = VALUES(extra),
                    updateTime = VALUES(updateTime),
                    deleteTime = VALUES(deleteTime),
                    companyId = VALUES(companyId)";

        Db::query($sql);

        return $newDeviceIds;
    }

    /**
     * 获取当前设备数量
     *
     * @return int
     */
    protected function getCkbDeviceCount(): int
    {
        $companyId = $this->getUserInfo('companyId');
        $cacheKey = 'deviceNum_'.$companyId;
        $deviceNum = Cache::get($cacheKey);
        if (empty($deviceNum)) {
            $deviceNum = DeviceModel::where(['companyId' => $companyId])->count('*');
            Cache::set($cacheKey,$deviceNum,120);
        }
        return $deviceNum;
    }

    /**
     * 获取添加的关联设备结果。
     *
     * @param int $accountId
     * @return bool
     */
    protected function getAddResulted(int $accountId): bool
    {
        $deviceNum = $this->getCkbDeviceCount();
        $result = (new ApiDeviceController())->getlist(
            [
                'accountId' => $accountId,
                'pageIndex' => 0,
                'pageSize'  => 100
            ],
            true
        );
        $result = json_decode($result, true);
        $result = $result['data']['results'] ?? false;

        if (empty($result)){
            return false;
        }else{
           if (count($result) > $deviceNum){
               $companyId = $this->getUserInfo('companyId');
               $cacheKey = 'deviceNum_'.$companyId;
               Cache::rm($cacheKey);
               return true;
           }else{
               return false;
           }
        }

    }

    /**
     * 获取基础统计信息
     *
     * @return \think\response\Json
     */
    public function index()
    {
        $accountId = $this->request->param('accountId/d');

        if (empty($accountId)){
            return ResponseHelper::error('参数缺失');
        }

        $isAdded = $this->getAddResulted($accountId);
        $isAdded && $this->migrateData($accountId);

        return ResponseHelper::success(
            [
                'added' => $isAdded
            ]
        );
    }

    /**
     * 将新设备自动加入到全局配置中（planType=0的计划和工作台）
     *
     * @param array $newDeviceIds 新添加的设备ID数组
     * @param int $companyId 公司ID
     * @return void
     */
    protected function addDevicesToGlobalConfigs(array $newDeviceIds, int $companyId): void
    {
        try {
            // 1. 更新全局计划（场景获客）的设备组
            $this->addDevicesToGlobalPlans($newDeviceIds, $companyId);
            
            // 2. 更新全局工作台的设备组
            $this->addDevicesToGlobalWorkbenches($newDeviceIds, $companyId);
        } catch (\Exception $e) {
            // 记录错误但不影响设备添加流程
            \think\facade\Log::error('自动添加设备到全局配置失败：' . $e->getMessage(), [
                'newDeviceIds' => $newDeviceIds,
                'companyId' => $companyId
            ]);
        }
    }

    /**
     * 将新设备加入到全局计划（planType=0）的设备组
     *
     * @param array $newDeviceIds 新添加的设备ID数组
     * @param int $companyId 公司ID
     * @return void
     */
    protected function addDevicesToGlobalPlans(array $newDeviceIds, int $companyId): void
    {
        // 查询所有全局计划（planType=0）
        $plans = Db::name('customer_acquisition_task')
            ->where('companyId', $companyId)
            ->where('planType', 0)  // 全局计划
            ->where('deleteTime', 0)
            ->field('id,reqConf')
            ->select();

        foreach ($plans as $plan) {
            $reqConf = json_decode($plan['reqConf'], true) ?: [];
            $deviceGroups = isset($reqConf['device']) ? $reqConf['device'] : [];
            
            if (!is_array($deviceGroups)) {
                $deviceGroups = [];
            }

            // 合并新设备ID（去重）
            $deviceGroups = array_unique(array_merge($deviceGroups, $newDeviceIds));
            $reqConf['device'] = array_values($deviceGroups); // 重新索引数组

            // 更新数据库
            Db::name('customer_acquisition_task')
                ->where('id', $plan['id'])
                ->update([
                    'reqConf' => json_encode($reqConf, JSON_UNESCAPED_UNICODE),
                    'updateTime' => time()
                ]);
        }
    }

    /**
     * 将新设备加入到全局工作台（planType=0）的设备组
     *
     * @param array $newDeviceIds 新添加的设备ID数组
     * @param int $companyId 公司ID
     * @return void
     */
    protected function addDevicesToGlobalWorkbenches(array $newDeviceIds, int $companyId): void
    {
        // 查询所有全局工作台（planType=0）
        $workbenches = Db::name('workbench')
            ->where('companyId', $companyId)
            ->where('planType', 0)  // 全局工作台
            ->where('isDel', 0)
            ->field('id,type')
            ->select();

        foreach ($workbenches as $workbench) {
            // 根据工作台类型更新对应的配置表
            $this->updateWorkbenchDevices($workbench['id'], $workbench['type'], $newDeviceIds);
        }
    }

    /**
     * 更新工作台的设备组
     *
     * @param int $workbenchId 工作台ID
     * @param int $type 工作台类型
     * @param array $newDeviceIds 新设备ID数组
     * @return void
     */
    protected function updateWorkbenchDevices(int $workbenchId, int $type, array $newDeviceIds): void
    {
        $configTableMap = [
            1 => 'workbench_auto_like',           // 自动点赞
            2 => 'workbench_moments_sync',        // 朋友圈同步
            3 => 'workbench_group_push',          // 群消息推送
            4 => 'workbench_group_create',       // 自动建群
            5 => 'workbench_traffic_config',      // 流量分发
            6 => 'workbench_import_contact',     // 通讯录导入
            7 => 'workbench_group_welcome',      // 入群欢迎语
        ];

        $tableName = $configTableMap[$type] ?? null;
        if (empty($tableName)) {
            return;
        }

        // 查询配置
        $config = Db::name($tableName)
            ->where('workbenchId', $workbenchId)
            ->field('id,devices')
            ->find();

        if (empty($config)) {
            return;
        }

        // 解析设备组
        $deviceGroups = json_decode($config['devices'], true) ?: [];
        if (!is_array($deviceGroups)) {
            $deviceGroups = [];
        }

        // 合并新设备ID（去重）
        $deviceGroups = array_unique(array_merge($deviceGroups, $newDeviceIds));
        $deviceGroups = array_values($deviceGroups); // 重新索引数组

        // 更新数据库
        Db::name($tableName)
            ->where('id', $config['id'])
            ->update([
                'devices' => json_encode($deviceGroups, JSON_UNESCAPED_UNICODE),
                'updateTime' => time()
            ]);
    }
}