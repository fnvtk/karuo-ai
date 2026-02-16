<?php

namespace app\api\controller;

use app\api\model\DeviceModel;
use app\api\model\DeviceGroupModel;
use think\Db;
use think\facade\Request;
use think\facade\Env;
use Endroid\QrCode\QrCode;
use Endroid\QrCode\ErrorCorrectionLevel;

class DeviceController extends BaseController
{
    /************************ 设备管理相关接口 ************************/
    
    /**
     * 获取设备列表
     * @param string $pageIndex 页码
     * @param string $pageSize 每页数量
     * @param bool $isInner 是否为内部调用
     * @return \think\response\Json
     */
    public function getlist($data = [],$isInner = false,$isDel = 0)
    {

        // 获取授权token
        $authorization =  $this->authorization;
        if (empty($authorization)) {
            if($isInner){
                return json_encode(['code'=>500,'msg'=>'缺少授权信息']);
            }else{
                return errorJson('缺少授权信息');
            }
        }

        try {
            // 根据isDel设置对应的deleteType值
            $deleteType = 'unDeleted'; // 默认值
            if ($isDel == 1) {
                $deleteType = 'deleted';
            } elseif ($isDel == 2) {
                $deleteType = 'deletedAndStop';
            }
            
            // 构建请求参数
            $params = [
                'accountId' => !empty($data['accountId']) ? $data['accountId'] : $this->request->param('accountId', ''),
                'keyword' => $this->request->param('keyword', ''),
                'imei' => $this->request->param('imei', ''),
                'groupId' => $this->request->param('groupId', ''),
                'brand' => $this->request->param('brand', ''),
                'model' => $this->request->param('model', ''),
                'deleteType' => $this->request->param('deleteType', $deleteType),
                'operatingSystem' => $this->request->param('operatingSystem', ''),
                'softwareVersion' => $this->request->param('softwareVersion', ''),
                'phoneAppVersion' => $this->request->param('phoneAppVersion', ''),
                'recorderVersion' => $this->request->param('recorderVersion', ''),
                'contactsVersion' => $this->request->param('contactsVersion', ''),
                'rooted' => $this->request->param('rooted', ''),
                'xPosed' => $this->request->param('xPosed', ''),
                'alive' => $this->request->param('alive', ''),
                'hasWechat' => $this->request->param('hasWechat', ''),
                'departmentId' => $this->request->param('departmentId', ''),
                'pageIndex' => !empty($data['pageIndex']) ? $data['pageIndex'] : $this->request->param('pageIndex', 0),
                'pageSize' => !empty($data['pageSize']) ? $data['pageSize'] : $this->request->param('pageSize', 20)
            ];

            // 设置请求头
            $headerData = ['client:system'];
            $header = setHeader($headerData, $authorization, 'plain');

            // 发送请求获取设备列表
            $result = requestCurl($this->baseUrl . 'api/device/pageResult', $params, 'GET', $header);
            $response = handleApiResponse($result);
            
            // 保存数据到数据库
            if (!empty($response['results'])) {
                foreach ($response['results'] as $item) {
                    $this->saveDevice($item);
                }
            }
            
            if($isInner){
                return json_encode(['code'=>200,'msg'=>'success','data'=>$response]);
            }else{
                return successJson($response);
            }
        } catch (\Exception $e) {
            if($isInner){
                return json_encode(['code'=>500,'msg'=>'获取设备列表失败：' . $e->getMessage()]);
            }else{
                return errorJson('获取设备列表失败：' . $e->getMessage());
            }
        }
    }

    /**
     * 生成设备二维码
     * @param int $accountId 账号ID
     * @return \think\response\Json
     */
    public function addDevice($accountId = 0,$isInner = false)
    {
        if (empty($accountId)) {
            $accountId = $this->request->param('accountId', '');
        }
        
        if (empty($accountId)) {
            if($isInner){
                return json_encode(['code'=>500,'msg'=>'账号ID不能为空']);
            }else{
                return errorJson('账号ID不能为空');
            }
        }

        try {
            // 获取环境配置
            $tenantGuid = Env::get('api.guid', '');
            $deviceSocketHost = Env::get('api.deviceSocketHost', '');
            
            if (empty($tenantGuid) || empty($deviceSocketHost)) {
                if($isInner){
                    return json_encode(['code'=>500,'msg'=>'环境配置不完整，请检查api.guid和api.deviceSocketHost配置']);
                }else{
                    return errorJson('环境配置不完整，请检查api.guid和api.deviceSocketHost配置');
                }
            }
            
            // 构建设备配置数据
            $data = [
                'tenantGuid' => $tenantGuid,
                'deviceSocketHost' => $deviceSocketHost,
                'checkVersionUrl' => '',
                'accountId' => intval($accountId)
            ];
            
            // 将数据转换为JSON
            $jsonData = json_encode($data);
            
            // 生成二维码图片
            $qrCode = $this->generateQrCodeImage($jsonData);
            
            return successJson([
                'qrCode' => $qrCode,
                'config' => $data
            ]);
        } catch (\Exception $e) {
            if($isInner){
                return json_encode(['code'=>500,'msg'=>'生成设备二维码失败：' . $e->getMessage()]);
            }else{
                return errorJson('生成设备二维码失败：' . $e->getMessage());
            }
        }
    }

    /**
     * 更新设备账号
     * @return \think\response\Json
     */
    public function updateaccount($data = [],$isInner = false)
    {
        // 获取授权token
        $authorization = trim($this->request->header('authorization', $this->authorization));
        if (empty($authorization)) {
            if($isInner){
                return json_encode(['code'=>500,'msg'=>'缺少授权信息']);
            }else{
                return errorJson('缺少授权信息');
            }
        }

        try {
            // 获取参数
            $id = !empty($data['id']) ? $data['id'] : $this->request->param('id', '');
            $accountId = !empty($data['accountId']) ? $data['accountId'] : $this->request->param('accountId', '');

            if (empty($id)) {
                if($isInner){
                    return json_encode(['code'=>500,'msg'=>'设备ID不能为空']);
                }else{
                    return errorJson('设备ID不能为空');
                }
            }

            if (empty($accountId)) {
                if($isInner){
                    return json_encode(['code'=>500,'msg'=>'账号id不能为空']);
                }else{
                    return errorJson('账号id不能为空');
                }
            }

            // 设置请求头
            $headerData = ['client:system'];
            $header = setHeader($headerData, $authorization, 'plain');

            // 发送请求
            $result = requestCurl($this->baseUrl . 'api/device/updateaccount?accountId=' . $accountId . '&deviceId=' . $id, [], 'PUT', $header);
            $response = handleApiResponse($result);
            
            if(empty($response)){
                return successJson([],'操作成功');
            }else{
                return errorJson([],$response);
            }
        } catch (\Exception $e) {
            if($isInner){
                return json_encode(['code'=>500,'msg'=>'更新设备账号失败：' . $e->getMessage()]);
            }else{
                return errorJson('更新设备账号失败：' . $e->getMessage());
            }
        }
    }

    /**
     * 更新设备所属分组
     * @param int $id 设备ID
     * @param int $groupId 分组ID
     * @return \think\response\Json
     */
    public function updateDeviceToGroup($data = [])
    {
        // 获取授权token
        $authorization = trim($this->request->header('authorization', $this->authorization));
        if (empty($authorization)) {
            return errorJson('缺少授权信息');
        }

        try {
            // 获取参数
            $id = !empty($data['id']) ? $data['id'] : $this->request->param('id', '');
            $groupId = !empty($data['groupId']) ? $data['groupId'] : $this->request->param('groupId', '');

            if (empty($id)) {
                return errorJson('设备ID不能为空');
            }

            if (empty($groupId)) {
                return errorJson('分组ID不能为空');
            }

            // 验证设备是否存在
            $device = DeviceModel::where('id', $id)->find();
            if (empty($device)) {
                return errorJson('设备不存在');
            }

            // 验证分组是否存在
            $group = DeviceGroupModel::where('id', $groupId)->find();
            if (empty($group)) {
                return errorJson('分组不存在');
            }

            // 设置请求头
            $headerData = ['client:system'];
            $header = setHeader($headerData, $authorization, 'plain');

            // 发送请求到微信接口
            $result = requestCurl($this->baseUrl . 'api/device/updateDeviceGroup?id=' . $id . '&groupId=' . $groupId, [], 'PUT', $header);
            $response = handleApiResponse($result);
            
            if (empty($response)) {
                // 更新成功，更新本地数据库
                $device->groupId = $groupId;
                $device->groupName = $group->groupName;
                $device->save();
                
                return successJson([], '设备分组更新成功');
            } else {
                return errorJson([], $response);
            }
        } catch (\Exception $e) {
            return errorJson('更新设备分组失败：' . $e->getMessage());
        }
    }


    /**
     * 删除设备
     *
     * @param $deviceId
     * @return false|string
     * @throws \think\db\exception\DataNotFoundException
     * @throws \think\db\exception\ModelNotFoundException
     * @throws \think\exception\DbException
     */
    public function delDevice($deviceId = '')
    {
        $authorization = $this->authorization;
        if (empty($authorization)) {
            return json_encode(['code'=>500,'msg'=>'缺少授权信息']);
        }

        if (empty($deviceId)) {
            return json_encode(['code'=>500,'msg'=>'删除的设备不能为空']);
        }

        $device = Db::table('s2_device')->where('id', $deviceId)->find();
        if (empty($device)) {
            return json_encode(['code'=>500,'msg'=>'设备不存在']);
        }

        try {
            // 设置请求头
            $headerData = ['client:system'];
            $header = setHeader($headerData, $authorization, 'json');
            // 发送请求
            $result = requestCurl($this->baseUrl . 'api/device/del/'.$deviceId, [], 'DELETE', $header,'json');
            if (empty($result)) {
                Db::table('s2_device')->where('id', $deviceId)->update([
                    'isDeleted' => 1,
                    'deleteTime' => time()
                ]);
                return json_encode(['code'=>200,'msg'=>'删除成功']);
            }else{
                return json_encode(['code'=>200,'msg'=>'删除失败']);
            }
        } catch (\Exception $e) {
            return json_encode(['code'=>500,'msg'=>'获取设备分组列表失败：' . $e->getMessage()]);
        }
    }

    /**
     * 更新设备联系人
     * @param int $id 设备ID
     * @param int $groupId 分组ID
     * @return \think\response\Json
     */
    public function importContact($data = [],$isInner = false)
    {
        // 获取授权token
        $authorization = $this->authorization;
        if (empty($authorization)) {
            if($isInner){
                return json_encode(['code'=>500,'msg'=>'缺少授权信息']);
            }else{
                return errorJson('缺少授权信息');
            }
        }

        try {
            // 获取参数
            $deviceId = !empty($data['deviceId']) ? $data['deviceId'] : $this->request->param('deviceId', '');
            $rawContactJson = !empty($data['contactJson']) ? $data['contactJson'] : $this->request->param('contactJson', '');
            $clearContact = !empty($data['clearContact']) ? $data['clearContact'] : $this->request->param('clearContact', false);


            if (empty($deviceId)) {
                if($isInner){
                    return json_encode(['code'=>500,'msg'=>'设备ID不能为空']);
                }else{
                    return errorJson('设备ID不能为空');
                }
            }

            $contacts = [];
            if (!empty($rawContactJson)) {
                if (is_string($rawContactJson)) {
                    $decodedContacts = json_decode($rawContactJson, true);
                    if (json_last_error() === JSON_ERROR_NONE) {
                        // It's a valid JSON string
                        $contacts = $decodedContacts;
                    } else {
                        // It's not a JSON string, treat as multi-line text
                        $lines = explode("\n", str_replace("\r\n", "\n", $rawContactJson));
                        foreach ($lines as $line) {
                            $line = trim($line);
                            if (empty($line)) continue;
                            $parts = explode(',', $line);
                            if (count($parts) == 2) {
                                $contacts[] = ['name' => trim($parts[0]), 'phone' => trim($parts[1])];
                            }
                        }
                    }
                } elseif (is_array($rawContactJson)) {
                    // It's already an array
                    $contacts = $rawContactJson;
                }
            }


            if (empty($contacts)){
                if($isInner){
                    return json_encode(['code'=>500,'msg'=>'更新设备联系人失败：通讯录不能为空' ]);
                }else{
                    return errorJson('更新设备联系人失败：通讯录不能为空'  );
                }
            }


            // Trim whitespace from name and phone in all cases
            if (!empty($contacts)) {
                foreach ($contacts as &$contact) {
                    if (isset($contact['name'])) {
                        $contact['name'] = trim($contact['name']);
                    }
                    if (isset($contact['phone'])) {
                        $contact['phone'] = trim($contact['phone']);
                    }
                }
                unset($contact); // Unset reference to the last element
            }

            $contactJsonForApi = json_encode($contacts);

            // 构建请求参数
            $params = [
                'deviceId' => $deviceId,
                'contactJson' => $contactJsonForApi,
                'clearContact' => $clearContact
            ];
            // 设置请求头
            $headerData = ['client:system'];
            $header = setHeader($headerData, $authorization, 'json');

            // 发送请求
            $result = requestCurl($this->baseUrl . 'api/device/importContact', $params, 'POST', $header,'json');
            $response = handleApiResponse($result);

            if(empty($response)){
                if($isInner){
                    return json_encode(['code'=>200,'msg'=>'更新设备联系人成功' ]);
                }else{
                    return successJson([],'更新设备联系人失败：通讯录不能为空'  );
                }
            }else{
                if($isInner){
                    return json_encode(['code'=>200,'msg'=> $response ]);
                }else{
                    return successJson([],$response );
                }
            }
        } catch (\Exception $e) {
            if($isInner){
                return json_encode(['code'=>500,'msg'=>'更新设备联系人失败：' . $e->getMessage()]);
            }else{
                return errorJson('更新设备联系人失败：' . $e->getMessage());
            }
        }
    }


    /************************ 设备分组相关接口 ************************/

    /**
     * 获取设备分组列表
     * @return \think\response\Json
     */
    public function getGroupList($data = [],$isInner = false)
    {
        // 获取授权token
        $authorization = trim($this->request->header('authorization', $this->authorization));
        if (empty($authorization)) {
            if($isInner){
                return json_encode(['code'=>500,'msg'=>'缺少授权信息']);
            }else{
                return errorJson('缺少授权信息');
            }
        }

        try {
            // 设置请求头
            $headerData = ['client:system'];
            $header = setHeader($headerData, $authorization, 'json');

            // 发送请求
            $result = requestCurl($this->baseUrl . 'api/DeviceGroup/list', [], 'GET', $header,'json');
            $response = handleApiResponse($result);
            // 保存数据到数据库
            if (!empty($response)) {
                foreach ($response as $item) {
                    $this->saveDeviceGroup($item);
                }
            }
            if($isInner){   
                return json_encode(['code'=>200,'msg'=>'success','data'=>$response]);
            }else{
                return successJson($response);
            }
        } catch (\Exception $e) {
            if($isInner){
                return json_encode(['code'=>500,'msg'=>'获取设备分组列表失败：' . $e->getMessage()]);
            }else{
                return errorJson('获取设备分组列表失败：' . $e->getMessage());
            }
        }
    }

    /**
     * 创建设备分组
     * @return \think\response\Json
     */
    public function createGroup($data = [],$isInner = false)
    {
        // 获取授权token
        $authorization = trim($this->request->header('authorization', $this->authorization));
        if (empty($authorization)) {
            if($isInner){
                return json_encode(['code'=>500,'msg'=>'缺少授权信息']);
            }else{
                return errorJson('缺少授权信息');
            }
        }

        try {
            // 获取参数
            $groupName = !empty($data['groupName']) ? $data['groupName'] : $this->request->param('groupName', '');
            $groupMemo = !empty($data['groupMemo']) ? $data['groupMemo'] : $this->request->param('groupMemo', '');

            if (empty($groupName)) {
                if($isInner){
                    return json_encode(['code'=>500,'msg'=>'分组名称不能为空']);
                }else{
                    return errorJson('分组名称不能为空');
                }
            }

            // 构建请求参数
            $params = [
                'groupName' => $groupName,
                'groupMemo' => $groupMemo
            ];

            // 设置请求头
            $headerData = ['client:system'];
            $header = setHeader($headerData, $authorization, 'json');

            // 发送请求
            $result = requestCurl($this->baseUrl . 'api/DeviceGroup/new', $params, 'POST', $header,'json');
            if(empty($result)){
                // $res = $this->getGroupList([],true);
                // $res = json_decode($res,true);
                // if(!empty($res['data'])){
                //     $data = $res['data'][0];
                // }

                $data = [];
            
                if($isInner){
                    return json_encode(['code'=>200,'msg'=>'success','data'=>$data]);
                }else{
                    return successJson($data,'操作成功');
                }
            }else{
                if($isInner){
                    return json_encode(['code'=>500,'msg'=> $result]);
                }else{
                    return errorJson($result);
                }
            }
        } catch (\Exception $e) {
            if($isInner){
                return json_encode(['code'=>500,'msg'=>'创建设备分组失败：' . $e->getMessage()]);
            }else{
                return errorJson('创建设备分组失败：' . $e->getMessage());
            }
        }
    }

    /**
     * 更新设备分组
     * @return \think\response\Json
     */
    public function updateDeviceGroup($data = [],$isInner = false)
    {
        // 获取授权token
        $authorization = trim($this->request->header('authorization', $this->authorization));
        if (empty($authorization)) {
            if($isInner){
                return json_encode(['code'=>500,'msg'=>'缺少授权信息']);
            }else{
                return errorJson('缺少授权信息');
            }
        }

        try {
            // 获取参数
            $id = !empty($data['id']) ? $data['id'] : $this->request->param('id', '');
            $groupName = !empty($data['groupName']) ? $data['groupName'] : $this->request->param('groupName', '');
            $groupMemo = !empty($data['groupMemo']) ? $data['groupMemo'] : $this->request->param('groupMemo', '');
        
            if (empty($id)) {
                if($isInner){
                    return json_encode(['code'=>500,'msg'=>'分组ID不能为空']);
                }else{
                    return errorJson('分组ID不能为空');
                }
            }

            if (empty($groupName)) {
                if($isInner){
                    return json_encode(['code'=>500,'msg'=>'分组名称不能为空']);
                }else{
                    return errorJson('分组名称不能为空');
                }
            }

            $group = DeviceGroupModel::where('id', $id)->find();
            if(empty($group)){
                if($isInner){
                    return json_encode(['code'=>500,'msg'=>'分组不存在']);
                }else{
                    return errorJson('分组不存在');
                }
            }

            $isGroupName = DeviceGroupModel::where('groupName', $groupName)->find();
            if(!empty($isGroupName)){
                if($isInner){
                    return json_encode(['code'=>500,'msg'=>'分组名称已存在']);
                }else{
                    return errorJson('分组名称已存在');
                }
            }

            // 设置请求头
            $headerData = ['client:system'];
            $header = setHeader($headerData, $authorization, 'json');

            // 从数据库获取对象后，创建一个正确格式的数组用于API请求
            $requestData = [
                'id' => $group->id,
                'tenantId' => $group->tenantId,  
                'groupName' => $groupName,
                'groupMemo' => $groupMemo
            ];

            // 发送请求
            $result = requestCurl($this->baseUrl . 'api/DeviceGroup/update', $requestData, 'PUT', $header, 'json');
            if(empty($result)){
                $group->groupName = $groupName;
                $group->groupMemo = $groupMemo;
                $group->save();
                if($isInner){
                    return json_encode(['code'=>200,'msg'=>'success','data'=>$group]);
                }else{
                    return successJson($group,'操作成功');
                }
            }else{
                if($isInner){
                    return json_encode(['code'=>500,'msg'=> $result]);
                }else{
                    return errorJson($result);
                }
            }
        } catch (\Exception $e) {
            if($isInner){
                return json_encode(['code'=>500,'msg'=>'更新设备分组失败：' . $e->getMessage()]);
            }else{
                return errorJson('更新设备分组失败：' . $e->getMessage());
            }
        }
    }

    /************************ 私有辅助方法 ************************/

    /**
     * 保存设备数据到数据库
     * @param array $item 设备数据
     */
    private function saveDevice($item)
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

        if (!empty($data['alive'])){
            $data['aliveTime'] = time();
        }


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
     * 保存设备分组数据到数据库
     * @param array $item 设备分组数据
     */
    private function saveDeviceGroup($item)
    {
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
    }

    /**
     * 生成二维码图片（base64格式）
     * @param string $data 二维码数据
     * @return string base64编码的图片
     */
    private function generateQrCodeImage($data)
    {
        // 使用endroid/qr-code 2.5版本生成二维码
        $qrCode = new QrCode($data);
        $qrCode->setSize(300);
        $qrCode->setMargin(10);
        $qrCode->setWriterByName('png');
        $qrCode->setEncoding('UTF-8');
        
        // 使用枚举常量而不是字符串
        $qrCode->setErrorCorrectionLevel(ErrorCorrectionLevel::HIGH);
        
        // 直接获取base64内容
        $base64 = 'data:image/png;base64,' . base64_encode($qrCode->writeString());
        
        return $base64;
    }
}