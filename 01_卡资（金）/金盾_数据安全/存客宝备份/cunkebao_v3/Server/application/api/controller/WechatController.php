<?php

namespace app\api\controller;

use app\api\model\WechatAccountModel;
use think\Db;

/**
 * 微信账号管理控制器
 */
class WechatController extends BaseController
{
    /**
     * 获取微信账号列表（主方法）
     * 
     * @param string $pageIndex 页码
     * @param string $pageSize 每页大小
     * @param bool $isInner 是否为任务调用
     * @return \think\response\Json
     */
    public function getList($pageIndex = '', $pageSize = '', $isInner = false)
    {
        // 获取授权token
        $authorization = trim($this->request->header('authorization', $this->authorization));
        if (empty($authorization)) {
            if ($isInner) {
                return json_encode(['code' => 500, 'msg' => '缺少授权信息']);
            } else {
                return errorJson('缺少授权信息');
            }
        }

        try {
            // 构建请求参数
            $params = [
                'wechatAlive' => $this->request->param('wechatAlive', ''),
                'keyword' => $this->request->param('keyword', ''),
                'groupId' => $this->request->param('groupId', ''),
                'departmentId' => $this->request->param('departmentId', ''),
                'hasDevice' => $this->request->param('hasDevice', ''),
                'deviceGroupId' => $this->request->param('deviceGroupId', ''),
                'containSubDepartment' => $this->request->param('containSubDepartment', 'false'),
                'pageIndex' => !empty($pageIndex) ? $pageIndex : $this->request->param('pageIndex', 0),
                'pageSize' => !empty($pageSize) ? $pageSize : $this->request->param('pageSize', 10)
            ];
            // 设置请求头
            $headerData = ['client:system'];
            $header = setHeader($headerData, $authorization, 'plain');

            // 发送请求获取基本信息
            $result = requestCurl($this->baseUrl . 'api/WechatAccount/list', $params, 'GET', $header);
            $response = handleApiResponse($result);
            // 保存基本数据到数据库
            if (!empty($response['results'])) {
                foreach ($response['results'] as $item) {
                    $this->saveWechatAccount($item);
                }

                // 获取并更新微信账号状态信息
                $this->getListTenantWechatPartial($authorization);
            }

          

            if ($isInner) {
                return json_encode(['code' => 200, 'msg' => '获取微信账号列表成功', 'data' => $response]);
            } else {
                return successJson($response);
            }
        } catch (\Exception $e) {
            if ($isInner) {
                return json_encode(['code' => 500, 'msg' => '获取微信账号列表失败：' . $e->getMessage()]);
            } else {
                return errorJson('获取微信账号列表失败：' . $e->getMessage());
            }
        }
    }

    /**
     * 获取微信账号状态信息
     * 
     * @param string $authorization 授权token
     * @param int $pageIndex 页码，默认为1
     * @param int $pageSize 每页数量，默认为40
     * @return \think\response\Json|void
     */
    public function getListTenantWechatPartial($authorization = '', $pageIndex = 1, $pageSize = 40)
    {
        // 获取授权token（如果未传入）
        if (empty($authorization)) {
            $authorization = trim($this->request->header('authorization', $this->authorization));
            if (empty($authorization)) {
                return errorJson('缺少授权信息');
            }
        }

        try {
            // 从数据库获取微信账号和设备信息
            $wechatList = Db::table('s2_wechat_account')
                ->where('imei', 'not null')
                ->page($pageIndex, $pageSize)
                ->select();
            if (empty($wechatList)) {
                return;
            }

            // 构造请求参数
            $wechatAccountIds = [];
            $deviceIds = [];
            $accountIds = [];
            
            foreach ($wechatList as $item) {
                $wechatAccountIds[] = $item['id'];
                $deviceIds[] = $item['currentDeviceId'] ?: 0;
                $accountIds[] = $item['deviceAccountId'] ?: 0;
            }

            // 设置请求头
            $headerData = ['client:system'];
            $header = setHeader($headerData, $authorization, 'json');

            $params = [
                'wechatAccountIdsStr' => json_encode($wechatAccountIds),
                'deviceIdsStr' => json_encode($deviceIds),
                'accountIdsStr' => json_encode($accountIds),
                'groupId' => ''
            ];
            // 发送请求获取状态信息
            $result = requestCurl($this->baseUrl . 'api/WechatAccount/listTenantWechatPartial', $params, 'GET', $header,'json');
            $response = handleApiResponse($result);
            // 如果请求成功并返回数据，则更新数据库
            if (!empty($response)) {
                $this->batchUpdateWechatAccounts($response);
            }

            // 递归调用获取下一页数据
            $this->getListTenantWechatPartial($authorization, $pageIndex + 1, $pageSize);

        } catch (\Exception $e) {
            if (empty($authorization)) { // 只有作为独立API调用时才返回
                return json(['code' => 500, 'msg' => '获取失败：' . $e->getMessage()]);
            }
        }
    }

    /**
     * 批量更新微信账号数据
     * 
     * @param array $data 接口返回的数据
     */
    private function batchUpdateWechatAccounts($data)
    {
        // 更新微信账号信息
        if (!empty($data['totalFriend'])) {
            // 遍历所有微信账号ID
            $wechatIds = array_keys($data['totalFriend']);
            foreach ($wechatIds as $wechatId) {
                // 构建更新数据
                $updateData = [
                    'maleFriend' => $data['maleFriend'][$wechatId] ?? 0,
                    'femaleFriend' => $data['femaleFriend'][$wechatId] ?? 0,
                    'unknowFriend' => $data['unknowFriend'][$wechatId] ?? 0,
                    'totalFriend' => $data['totalFriend'][$wechatId] ?? 0,
                    'yesterdayMsgCount' => $data['yesterdayMsgCount'][$wechatId] ?? 0,
                    'sevenDayMsgCount' => $data['sevenDayMsgCount'][$wechatId] ?? 0,
                    'thirtyDayMsgCount' => $data['thirtyDayMsgCount'][$wechatId] ?? 0,
                    'wechatAlive' => isset($data['wechatAlive'][$wechatId]) ? (int)$data['wechatAlive'][$wechatId] : 0,
                    'updateTime' => time()
                ];

                if (!empty($updateData['wechatAlive'])) {
                    $updateData['wechatAliveTime'] =  time();
                }


                // 更新数据库
                Db::table('s2_wechat_account')
                    ->where('id', $wechatId)
                    ->update($updateData);
            }
        }

        // 更新设备状态
        if (!empty($data['deviceAlive'])) {
            foreach ($data['deviceAlive'] as $deviceId => $isAlive) {
                // 更新微信账号的设备状态
                Db::table('s2_wechat_account')
                    ->where('currentDeviceId', $deviceId)
                    ->update([
                        'deviceAlive' => (int)$isAlive,
                        'updateTime' => time()
                    ]);
                
                // 更新设备表的状态
                Db::table('s2_device')
                    ->where('id', $deviceId)
                    ->update([
                        'alive' => (int)$isAlive,
                        'updateTime' => time()
                    ]);
            }
        }
    }

    /**
     * 保存微信账号基本数据到数据库
     * 
     * @param array $item 微信账号数据
     */
    private function saveWechatAccount($item)
    {
        // 处理时间字段
        $createTime = isset($item['createTime']) ? strtotime($item['createTime']) : 0;
        $deleteTime = !empty($item['isDeleted']) ? strtotime($item['deleteTime']) : 0;

        // 构建数据
        $data = [
            'id' => $item['id'],
            'wechatId' => $item['wechatId'] ?? '',
            'deviceAccountId' => $item['deviceAccountId'] ?? 0,
            'imei' => $item['imei'] ?? '',
            'deviceMemo' => $item['deviceMemo'] ?? '',
            'accountUserName' => $item['accountUserName'] ?? '',
            'accountRealName' => $item['accountRealName'] ?? '',
            'accountNickname' => $item['accountNickname'] ?? '',
            'wechatGroupName' => $item['wechatGroupName'] ?? '',
            'alias' => $item['alias'] ?? '',
            'tenantId' => $item['tenantId'] ?? 0,
            'nickname' => $item['nickname'] ?? '',    
            'avatar' => $item['avatar'] ?? '',
            'gender' => $item['gender'] ?? 0,
            'region' => $item['region'] ?? '',
            'signature' => $item['signature'] ?? '',
            'bindQQ' => $item['bindQQ'] ?? '',
            'bindEmail' => $item['bindEmail'] ?? '',
            'bindMobile' => $item['bindMobile'] ?? '',
            'currentDeviceId' => $item['currentDeviceId'] ?? 0,
            'isDeleted' => $item['isDeleted'] ?? 0,
            'groupId' => $item['groupId'] ?? 0,
            'memo' => $item['memo'] ?? '',
            'wechatVersion' => $item['wechatVersion'] ?? '',
            'labels' => !empty($item['labels']) ? json_encode($item['labels']) : json_encode([]),
            'createTime' => $createTime,
            'deleteTime' => $deleteTime,
            'updateTime' => time()
        ];

        // 保存或更新数据
        $account = WechatAccountModel::where('id', $item['id'])->find();
        if ($account) {
            $account->save($data);
        } else {
            WechatAccountModel::create($data);
        }
    }


    public function chatroomCreate($data = [])
    {

        $authorization =  $this->authorization;
    
        if (empty($authorization)) {
            return json_encode(['code' => 500, 'msg' => '缺少授权信息']);
        }

        try {
            // 设置请求头
            $headerData = ['Client:system'];
            $header = setHeader($headerData, $authorization,'json');
            $params = [
                "chatroomOperateType" => 7,
                "extra" => "{chatroomName:{$data['chatroomName']}}",
                "wechatAccountId" => $data['wechatAccountId'],
                "wechatChatroomId" => 0,
                "wechatFriendIds" => $data['wechatFriendIds']
            ];

            // 发送请求获取状态信息
            $result = requestCurl($this->baseUrl . 'api/WechatChatroom/chatroomOperate', $params, 'POST', $header,'json');
            $response = handleApiResponse($result);
            if (!empty($response)) {
                return json_encode(['code' => 500, 'msg' =>$response]);
            }else{
                return json_encode(['code' => 200, 'msg' =>'成功']);
            }
        } catch (\Exception $e) {
            if (empty($authorization)) { // 只有作为独立API调用时才返回
                return json_encode(['code' => 500, 'msg' => '获取失败：' . $e->getMessage()]);
            }
        }
    }


}