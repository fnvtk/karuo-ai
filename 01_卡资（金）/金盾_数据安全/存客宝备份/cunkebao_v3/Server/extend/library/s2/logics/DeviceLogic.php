<?php

namespace library\s2\logics;

use app\api\model\DeviceGroupModel;
use app\api\model\DeviceModel;
use app\common\service\AuthService;
use library\s2\CurlHandle;
use library\s2\interfaces\DeviceInterface;
use think\facade\Log;

class DeviceLogic implements DeviceInterface
{
    /**
     * 获取设备列表
     * @inheritDoc
     */
    public function getlist(array $params = []): array
    {

        try {
            // 构建请求参数
            $params = [
                'accountId' => $params['accountId'] ?? '',
                'keyword' => $params['keyword'] ?? '',
                'imei' => $params['imei'] ?? '',
                'groupId' => $params['groupId'] ?? '',
                'brand' => $params['brand'] ?? '',
                'model' => $params['model'] ?? '',
                'deleteType' => $params['deleteType'] ?? 'unDeleted',
                'operatingSystem' => $params['operatingSystem'] ?? '',
                'softwareVersion' => $params['softwareVersion'] ?? '',
                'phoneAppVersion' => $params['phoneAppVersion'] ?? '',
                'recorderVersion' => $params['recorderVersion'] ?? '',
                'contactsVersion' => $params['contactsVersion'] ?? '',
                'rooted' => $params['rooted'] ?? '',
                'xPosed' => $params['xPosed'] ?? '',
                'alive' => $params['alive'] ?? '',
                'hasWechat' => $params['hasWechat'] ?? '',
                'departmentId' => $params['departmentId'] ?? '',
                'pageIndex' => $params['pageIndex'] ?? 0,
                'pageSize' => $params['pageSize'] ?? 20
            ];

            $JWT = AuthService::getSystemAuthorization();
            $result = CurlHandle::getInstant()
                ->setHeader('Content-Type', 'text/plain')
                ->setHeader('authorization', 'bearer ' . $JWT)
                ->setMethod('get')
                ->send('api/Account/myTenantPageAccounts', $params);

            $response = handleApiResponse($result);
            // 保存数据到数据库
            if (!empty($response['results'])) {
                foreach ($response['results'] as $item) {
                    $this->saveData($item);
                }
            }
            return json_encode(['code' => 200, 'msg' => '获取公司账号列表成功', 'data' => $response]);

        } catch (\Exception $e) {
            return json_encode(['code' => 500, 'msg' => '获取公司账号列表失败：' . $e->getMessage()]);
        }
    }


    private function saveData($item)
    {
        $data = [
            'id' => isset($item['id']) ? $item['id'] : '',
            'userName' => isset($item['userName']) ? $item['userName'] : '',
            'nickname' => isset($item['nickname']) ? $item['nickname'] : '',
            'realName' => isset($item['realName']) ? $item['realName'] : '',
            'groupName' => isset($item['groupName']) ? $item['groupName'] : '',
            'wechatAccounts' => isset($item['wechatAccounts']) ? json_encode($item['wechatAccounts']) : json_encode([]),
            'alive' => isset($item['alive']) ? $item['alive'] : false,
            'lastAliveTime' => isset($item['lastAliveTime']) ? $item['lastAliveTime'] : null,
            'tenantId' => isset($item['tenantId']) ? $item['tenantId'] : 0,
            'groupId' => isset($item['groupId']) ? $item['groupId'] : 0,
            'currentAccountId' => isset($item['currentAccountId']) ? $item['currentAccountId'] : 0,
            'imei' => $item['imei'],
            'memo' => isset($item['memo']) ? $item['memo'] : '',
            'createTime' => isset($item['createTime']) ? strtotime($item['createTime']) : 0,
            'isDeleted' => isset($item['isDeleted']) ? $item['isDeleted'] : false,
            'deletedAndStop' => isset($item['deletedAndStop']) ? $item['deletedAndStop'] : false,
            'deleteTime' => empty($item['isDeleted']) ? 0 : strtotime($item['deleteTime']),
            'rooted' => isset($item['rooted']) ? $item['rooted'] : false,
            'xPosed' => isset($item['xPosed']) ? $item['xPosed'] : false,
            'brand' => isset($item['brand']) ? $item['brand'] : '',
            'model' => isset($item['model']) ? $item['model'] : '',
            'operatingSystem' => isset($item['operatingSystem']) ? $item['operatingSystem'] : '',
            'softwareVersion' => isset($item['softwareVersion']) ? $item['softwareVersion'] : '',
            'extra' => isset($item['extra']) ? json_encode($item['extra']) : json_encode([]),
            'phone' => isset($item['phone']) ? $item['phone'] : '',
            'lastUpdateTime' => isset($item['lastUpdateTime']) ? ($item['lastUpdateTime'] == '0001-01-01T00:00:00' ? 0 : strtotime($item['lastUpdateTime'])) : 0
        ];

        // 使用imei作为唯一性判断
        $device = DeviceModel::where('id', $item['id'])->find();

        if ($device) {
            $device->save($data);
        } else {

            // autoLike：自动点赞
            // momentsSync：朋友圈同步
            // autoCustomerDev：自动开发客户
            // groupMessageDeliver：群消息推送
            // autoGroup：自动建群

            $data['taskConfig'] = json_encode([
                'autoLike' => true,
                'momentsSync' => true,
                'autoCustomerDev' => true,
                'groupMessageDeliver' => true,
                'autoGroup' => true,
            ]);
            DeviceModel::create($data);
        }
    }

    /**
     * 保存设备数据
     * @param array $item 设备数据
     * @return bool
     */
    public function saveDevice($item)
    {
        try {
            $data = [
                'id' => isset($item['id']) ? $item['id'] : '',
                'userName' => isset($item['userName']) ? $item['userName'] : '',
                'nickname' => isset($item['nickname']) ? $item['nickname'] : '',
                'realName' => isset($item['realName']) ? $item['realName'] : '',
                'groupName' => isset($item['groupName']) ? $item['groupName'] : '',
                'wechatAccounts' => isset($item['wechatAccounts']) ? json_encode($item['wechatAccounts']) : json_encode([]),
                'alive' => isset($item['alive']) ? $item['alive'] : false,
                'lastAliveTime' => isset($item['lastAliveTime']) ? $item['lastAliveTime'] : null,
                'tenantId' => isset($item['tenantId']) ? $item['tenantId'] : 0,
                'groupId' => isset($item['groupId']) ? $item['groupId'] : 0,
                'currentAccountId' => isset($item['currentAccountId']) ? $item['currentAccountId'] : 0,
                'imei' => $item['imei'],
                'memo' => isset($item['memo']) ? $item['memo'] : '',
                'createTime' => isset($item['createTime']) ? strtotime($item['createTime']) : 0,
                'isDeleted' => isset($item['isDeleted']) ? $item['isDeleted'] : false,
                'deletedAndStop' => isset($item['deletedAndStop']) ? $item['deletedAndStop'] : false,
                'deleteTime' => empty($item['isDeleted']) ? 0 : strtotime($item['deleteTime']),
                'rooted' => isset($item['rooted']) ? $item['rooted'] : false,
                'xPosed' => isset($item['xPosed']) ? $item['xPosed'] : false,
                'brand' => isset($item['brand']) ? $item['brand'] : '',
                'model' => isset($item['model']) ? $item['model'] : '',
                'operatingSystem' => isset($item['operatingSystem']) ? $item['operatingSystem'] : '',
                'softwareVersion' => isset($item['softwareVersion']) ? $item['softwareVersion'] : '',
                'extra' => isset($item['extra']) ? json_encode($item['extra']) : json_encode([]),
                'phone' => isset($item['phone']) ? $item['phone'] : '',
                'lastUpdateTime' => isset($item['lastUpdateTime']) ? ($item['lastUpdateTime'] == '0001-01-01T00:00:00' ? 0 : strtotime($item['lastUpdateTime'])) : 0
            ];

            // 使用ID作为唯一性判断
            $device = DeviceModel::where('id', $item['id'])->find();

            if ($device) {
                $device->save($data);
            } else {
                $data['taskConfig'] = json_encode([
                    'autoLike' => true,
                    'momentsSync' => true,
                    'autoCustomerDev' => true,
                    'groupMessageDeliver' => true,
                    'autoGroup' => true,
                ]);
                DeviceModel::create($data);
            }

            return true;
        } catch (\Exception $e) {
            Log::error('保存设备数据失败：' . $e->getMessage());
            return false;
        }
    }

    /**
     * 保存设备分组数据
     * @param array $item 设备分组数据
     * @return bool
     */
    public function saveDeviceGroup($item)
    {
        try {
            $data = [
                'id' => $item['id'],
                'tenantId' => $item['tenantId'],
                'groupName' => $item['groupName'],
                'groupMemo' => $item['groupMemo'],
                'count' => isset($item['count']) ? $item['count'] : 0,
                'createTime' => $item['createTime'] == '0001-01-01T00:00:00' ? 0 : strtotime($item['createTime'])
            ];

            // 使用ID作为唯一性判断
            $group = DeviceGroupModel::where('id', $item['id'])->find();

            if ($group) {
                $group->save($data);
            } else {
                DeviceGroupModel::create($data);
            }

            return true;
        } catch (\Exception $e) {
            Log::error('保存设备分组数据失败：' . $e->getMessage());
            return false;
        }
    }
}