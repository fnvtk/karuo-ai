<?php

namespace app\api\controller;

use app\api\model\WechatMessageModel;
use app\common\service\FriendTransferService;
use think\Db;
use think\facade\Request;

class MessageController extends BaseController
{
    /************************ 好友消息相关接口 ************************/
    
    /**
     * 获取微信好友列表
     * @return \think\response\Json
     */
    public function getFriendsList($pageIndex = '',$pageSize = '',$isInner = false)
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

        $fromTime = $this->request->param('fromTime', date('Y-m-d 00:00:00'));
        $toTime = $this->request->param('toTime', date('Y-m-d 23:59:59'));


        try {
            // 构建请求参数
            $params = [
                'chatroomKeyword' => $this->request->param('chatroomKeyword', ''),
                'friendKeyword' => $this->request->param('friendKeyword', ''),
                'friendPhoneKeyword' => $this->request->param('friendPhoneKeyword', ''),
                'friendPinYinKeyword' => $this->request->param('friendPinYinKeyword', ''),
                'friendRegionKeyword' => $this->request->param('friendRegionKeyword', ''),
                'friendRemarkKeyword' => $this->request->param('friendRemarkKeyword', ''),
                'groupId' => $this->request->param('groupId', null),
                'kefuId' => $this->request->param('kefuId', null),
                'labels' => $this->request->param('labels', []),
                'msgFrom' => $fromTime,
                'msgKeyword' => $this->request->param('msgKeyword', ''),
                'msgTo' => $toTime,
                'msgType' => $this->request->param('msgType', ''),
                'pageIndex' => !empty($pageIndex) ? $pageIndex : input('pageIndex', 0),
                'pageSize' => !empty($pageSize) ? $pageSize : input('pageSize', 20),
                'reverse' => $this->request->param('reverse', false),
                'type' => $this->request->param('type', 'friend'),
                'wechatAccountIds' => $this->request->param('wechatAccountIds', [])
            ];
      
         
            // 设置请求头
            $headerData = ['client:system'];
            $header = setHeader($headerData, $authorization, 'json');

            // 发送请求获取好友列表
            $result = requestCurl($this->baseUrl . 'api/WechatFriend/listWechatFriendForMsgPagination', $params, 'POST', $header, 'json');
            $response = handleApiResponse($result);
            
            // 确保 response 是数组格式
            if (!is_array($response)) {
                $response = [];
            }
            
            // 确保 results 字段存在且是数组
            if (!isset($response['results']) || !is_array($response['results'])) {
                $response['results'] = [];
            }
            
            // 获取同步消息标志
            $syncMessages = $this->request->param('syncMessages', true);
            // 如果需要同步消息，则获取每个好友的消息
            if ($syncMessages && !empty($response['results'])) {
                $from =  strtotime($fromTime) * 1000;
                $to =  strtotime($toTime) * 1000;
            

                foreach ($response['results'] as &$friend) {
                    // 构建获取消息的参数
                    $messageParams = [
                        'keyword' => '',
                        'msgType' => '',
                        'accountId' => '',
                        'count' => 20,
                        'messageId' => '',
                        'olderData' => true,
                        'wechatAccountId' => $friend['wechatAccountId'],
                        'wechatFriendId' => $friend['wechatFriendId'],
                        'from' => $from,
                        'to' => $to,
                        'searchFrom' => 'admin'
                    ];
                    
                    // 调用获取消息的接口
                    $messageResult = requestCurl($this->baseUrl . 'api/FriendMessage/searchMessage', $messageParams, 'GET', $header, 'json');
                    $messageResponse = handleApiResponse($messageResult);
                    
                    // 确保 messageResponse 是数组格式
                    if (!is_array($messageResponse)) {
                        $messageResponse = [];
                    }
                    
                    // 保存消息到数据库
                    if (!empty($messageResponse)) {
                        foreach ($messageResponse as $item) {
                            if (is_array($item)) {
                                $this->saveMessage($item);
                            }
                        }
                    }
                    
                    // 将消息列表添加到好友数据中
                    $friend['messages'] = $messageResponse ?? [];
                }
                unset($friend);
            }
            if($isInner){
                return json_encode(['code'=>200,'msg'=>'获取好友列表成功','data'=>$response]);
            }else{
                return successJson($response);
            }
        } catch (\Exception $e) {
            if($isInner){
                return json_encode(['code'=>500,'msg'=>'获取好友列表失败：' . $e->getMessage()]);
            }else{
                return errorJson('获取好友列表失败：' . $e->getMessage());
            }
        }
    }

    /**
     * 用户聊天记录
     * @return \think\response\Json
     */
    public function getMessageList()
    {
        // 获取授权token
        $authorization = trim($this->request->header('authorization', $this->authorization));
        if (empty($authorization)) {
            return errorJson('缺少授权信息');
        }

        try {
            // 构建请求参数
            $params = [
                'keyword' => $this->request->param('keyword', ''),
                'msgType' => $this->request->param('msgType', ''),
                'accountId' => $this->request->param('accountId', ''),
                'count' => $this->request->param('count', 100),
                'messageId' => $this->request->param('messageId', ''),
                'olderData' => $this->request->param('olderData', true),
                'wechatAccountId' => $this->request->param('wechatAccountId', ''),
                'wechatFriendId' => $this->request->param('wechatFriendId', ''),
                'from' => $this->request->param('from', ''),
                'to' => $this->request->param('to', ''),
                'searchFrom' => $this->request->param('searchFrom', 'admin')
            ];

            // 参数验证
            if (empty($params['wechatAccountId'])) {
                return errorJson('微信账号ID不能为空');
            }
            if (empty($params['wechatFriendId'])) {
                return errorJson('好友ID不能为空');
            }

            // 设置请求头
            $headerData = ['client:system'];
            $header = setHeader($headerData, $authorization, 'json');

            // 发送请求获取聊天记录
            $result = requestCurl($this->baseUrl . 'api/FriendMessage/searchMessage', $params, 'GET', $header, 'json');
            $response = handleApiResponse($result);

            // 确保 response 是数组格式
            if (!is_array($response)) {
                $response = [];
            }

            // 保存数据到数据库
            if (!empty($response)) {
                foreach ($response as $item) {
                    if (is_array($item)) {
                        $this->saveMessage($item);
                    }
                }
            }

            return successJson($response);
        } catch (\Exception $e) {
            return errorJson('获取聊天记录失败：' . $e->getMessage());
        }
    }

    /************************ 群聊消息相关接口 ************************/

    /**
     * 获取微信群聊列表
     * @return \think\response\Json
     */
    public function getChatroomList($pageIndex = '',$pageSize = '',$isInner = false)
    {
        // 获取授权token
        $authorization = $this->authorization;
        //$authorization = 'vIxE_SlpPqQLpG3maOL8VaPBDz_uoGqhK4HGR4VtxvtsjNkW9kP6RQicwsfX6lLXruq9UqyDV7wBU5iGT2OPv3t_GZKfVUv-PG_CL4zc6806GKhmT7QxFOXHLF0KH2VWlzVfo9i_MxsuPm9MqiuYwKDXKOpBwSemNL6vwYOrIkZBAcanG06rPEdSlrNcNyJiYrUpqZKDeQEgxE4o9WeYVczYLN8OS-p8Z57DXlVwW8CJCdLsFi7csBVT7uTreDJnAv7wraMRHB5FYs1U7vEmO9IbmsQhhdC1swMuz0kQIESr2zf11nBKEDEadMoH4HptIENXQQ';
        if (empty($authorization)) {
            if($isInner){
                return json_encode(['code'=>500,'msg'=>'缺少授权信息']);
            }else{
                return errorJson('缺少授权信息');
            }
        }

        $fromTime = $this->request->param('fromTime', date('Y-m-d 00:00:00'));
        $toTime = $this->request->param('toTime', date('Y-m-d 23:59:59'));

    
        try {
            // 构建请求参数
            $params = [
                'chatroomKeyword' => $this->request->param('chatroomKeyword', ''),
                'friendKeyword' => $this->request->param('friendKeyword', ''),
                'friendInKeyword' => $this->request->param('friendInKeyword', ''),
                'friendInTimeKeyword' => $this->request->param('friendInTimeKeyword', ''),
                'friendOutKeyword' => $this->request->param('friendOutKeyword', ''),
                'friendRemarkKeyword' => $this->request->param('friendRemarkKeyword', ''),
                'groupId' => $this->request->param('groupId', null),
                'kefuId' => $this->request->param('kefuId', null),
                'labels' => $this->request->param('labels', []),
                'msgFrom' => $fromTime,
                'msgKeyword' => $this->request->param('msgKeyword', ''),
                'msgTo' => $toTime,
                'msgType' => $this->request->param('msgType', ''),
                'pageIndex' => $this->request->param('pageIndex', 0),
                'pageSize' => $this->request->param('pageSize', 100),
                'reverse' => $this->request->param('reverse', false),
                'type' => $this->request->param('type', 'chatroom'),
                'wechatAccountIds' => $this->request->param('wechatAccountIds', [])
            ];

            // 设置请求头
            $headerData = ['client:system'];
            $header = setHeader($headerData, $authorization, 'json');

            // 发送请求获取群聊列表
            $result = requestCurl($this->baseUrl . 'api/WechatChatroom/listWechatChatroomForMsgPagination', $params, 'POST', $header, 'json');
            $response = handleApiResponse($result);
            
            // 确保 response 是数组格式
            if (!is_array($response)) {
                $response = [];
            }
            
            // 确保 results 字段存在且是数组
            if (!isset($response['results']) || !is_array($response['results'])) {
                $response['results'] = [];
            }
            
            // 获取同步消息标志
            $syncMessages = $this->request->param('syncMessages', true);
            
            // 如果需要同步消息，则获取每个群的消息
            if ($syncMessages && !empty($response['results'])) {
                $from =  strtotime($fromTime) * 1000;
                $to =  strtotime($toTime) * 1000;
                foreach ($response['results'] as &$chatroom) {

                    // 构建获取消息的参数
                    $messageParams = [
                        'keyword' => '',
                        'msgType' =>'',
                        'accountId' => '',
                        'count' => 20,
                        'messageId' => '',
                        'olderData' => true,
                        'wechatId' => '',
                        'wechatAccountId' => $chatroom['wechatAccountId'],
                        'wechatChatroomId' => $chatroom['wechatChatroomId'],
                        'from' => $from,
                        'to' => $to,
                        'searchFrom' => 'admin'
                    ];
                 
                    // 调用获取消息的接口
                    $messageResult = requestCurl($this->baseUrl . 'api/ChatroomMessage/searchMessage', $messageParams, 'GET', $header, 'json');
                    $messageResponse = handleApiResponse($messageResult);
                    
                    // 确保 messageResponse 是数组格式
                    if (!is_array($messageResponse)) {
                        $messageResponse = [];
                    }
                    
                    // 保存消息到数据库
                    if (!empty($messageResponse)) {
                        foreach ($messageResponse as $item) {
                            if (is_array($item)) {
                                $this->saveChatroomMessage($item);
                            }
                        }
                    }
                    
                    // 将消息列表添加到群聊数据中
                    $chatroom['messages'] = $messageResponse ?? [];
                }
                unset($chatroom);
            }
            if($isInner){
                return json_encode(['code'=>200,'msg'=>'获取群聊列表成功','data'=>$response]);
            }else{
                return successJson($response);
            }
        } catch (\Exception $e) {
            if($isInner){
                return json_encode(['code'=>500,'msg'=>'获取群聊列表失败：' . $e->getMessage()]);
            }else{
                return errorJson('获取群聊列表失败：' . $e->getMessage());
            }
        }
    }

    /**
     * 获取群聊消息列表
     * @return \think\response\Json
     */
    public function getChatroomMessages()
    {
        // 获取授权token
        $authorization = trim($this->request->header('authorization', $this->authorization));
        if (empty($authorization)) {
            return errorJson('缺少授权信息');
        }

        try {
            // 构建请求参数
            $params = [
                'keyword' => $this->request->param('keyword', ''),
                'msgType' => $this->request->param('msgType', ''),
                'accountId' => $this->request->param('accountId', ''),
                'count' => $this->request->param('count', 100),
                'messageId' => $this->request->param('messageId', ''),
                'olderData' => $this->request->param('olderData', true),
                'wechatId' => $this->request->param('wechatId', ''),
                'wechatAccountId' => $this->request->param('wechatAccountId', ''),
                'wechatChatroomId' => $this->request->param('wechatChatroomId', ''),
                'from' => $this->request->param('from', strtotime(date('Y-m-d 00:00:00', strtotime('-1 days')))),
                'to' => $this->request->param('to', strtotime(date('Y-m-d 00:00:00'))),
                'searchFrom' => $this->request->param('searchFrom', 'admin')
            ];

            // 参数验证
            if (empty($params['wechatAccountId'])) {
                return errorJson('微信账号ID不能为空');
            }
            if (empty($params['wechatChatroomId'])) {
                return errorJson('群聊ID不能为空');
            }

            // 设置请求头
            $headerData = ['client:system'];
            $header = setHeader($headerData, $authorization, 'json');

            // 发送请求获取群聊消息
            $result = requestCurl($this->baseUrl . 'api/ChatroomMessage/searchMessage', $params, 'GET', $header, 'json');
            $response = handleApiResponse($result);

            // 确保 response 是数组格式
            if (!is_array($response)) {
                $response = [];
            }

            // 保存数据到数据库
            if (!empty($response)) {
                foreach ($response as $item) {
                    if (is_array($item)) {
                        $res = $this->saveChatroomMessage($item);
                        if(!$res){
                            return errorJson('保存群聊消息失败');
                        }
                    }
                }
            }

            return successJson($response);
        } catch (\Exception $e) {
            return errorJson('获取群聊消息失败：' . $e->getMessage());
        }
    }

    /************************ 私有辅助方法 ************************/

    /**
     * 保存消息记录到数据库
     * @param array $item 消息记录数据
     */
    public function saveMessage($item)
    {
        // 检查消息是否已存在
        $exists = WechatMessageModel::where(['id'=> $item['id'],'type' => 1])->find();

        if (!empty($exists) && $exists['sendStatus'] == 0){
            return true;
        }


        // 将毫秒时间戳转换为秒级时间戳
        $createTime = isset($item['createTime']) ? strtotime($item['createTime']) : null;
        $deleteTime = !empty($item['isDeleted']) ? strtotime($item['deleteTime']) : null;
        $wechatTime = isset($item['wechatTime']) ? floor($item['wechatTime'] / 1000) : null;

        $data = [
            'id' => $item['id'],
            'type' => 1,
            'accountId' => $item['accountId'],
            'content' => $item['content'],
            'createTime' => $createTime,
            'deleteTime' => $deleteTime,
            'isDeleted' => $item['isDeleted'] ?? false,
            'isSend' => $item['isSend'] ?? true,
            'msgId' => $item['msgId'],
            'msgSubType' => $item['msgSubType'] ?? 0,
            'msgSvrId' => $item['msgSvrId'] ?? '',
            'msgType' => $item['msgType'],
            'origin' => $item['origin'] ?? 0,
            'recallId' => $item['recallId'] ?? false,
            'sendStatus' => $item['sendStatus'] ?? 0,
            'synergyAccountId' => $item['synergyAccountId'] ?? 0,
            'tenantId' => $item['tenantId'],
            'wechatAccountId' => $item['wechatAccountId'],
            'wechatFriendId' => $item['wechatFriendId'],
            'wechatTime' => $wechatTime
        ];


       //已被删除
        if ($item['msgType'] == 10000 && strpos($item['content'],'开启了朋友验证') !== false) {
            Db::table('s2_wechat_friend')->where('id',$item['wechatFriendId'])->update(['isDeleted'=> 1,'deleteTime' => $wechatTime]);
        }else{
            //优先分配在线客服 - 使用新的好友迁移服务
            $friend = Db::table('s2_wechat_friend')->where('id',$item['wechatFriendId'])->find();
            if (!empty($friend)){
                $accountId = $item['accountId'];
                $friendTransferService = new FriendTransferService();
                $result = $friendTransferService->transferFriend(
                    $item['wechatFriendId'],
                    $accountId,
                    '账号不在线，自动迁移到在线账号'
                );
                // 迁移结果已记录在服务中，这里不需要额外处理
            }
        }

        $id = '';
        if (empty($exists)){
            // 创建新记录
            $res =  WechatMessageModel::create($data);
            $id= $res['id'];
        }else{
            $id = $data['id'];
            unset($data['id']);
            $res = $exists->save($data);
        }



        // 1 文字 3图片 47动态图片 34语言 43视频 42名片 40/20链接  49文件
        if (!empty($res) && empty($item['isSend']) && in_array($item['msgType'],[1,3,20,34,40,42,43,47,49])){
            $friend = Db::name('wechat_friendship')->where('id',$item['wechatFriendId'])->find();
            if (!empty($friend)){
                $trafficPoolId = Db::name('traffic_pool')->where('identifier',$friend['wechatId'])->value('id');
                if (!empty($trafficPoolId)){
                    $data = [
                        'type' => 4,
                        'companyId' => $friend['companyId'],
                        'trafficPoolId' => $trafficPoolId,
                        'source' => 0,
                        'uniqueId' => $id,
                        'sourceData' => json_encode([]),
                        'remark' => '用户发送了消息',
                        'createTime' => time(),
                        'updateTime' => time()
                    ];
                     Db::name('user_portrait')->insert($data);

                }
            }
        }
        return true;
    }

    /**
     * 保存群聊消息记录到数据库
     * @param array $item 消息记录数据
     * @return bool 是否保存成功
     */
    public function saveChatroomMessage($item)
    {
        // 检查消息是否已存在（必须指定 type=2 表示群聊消息）
        $exists = WechatMessageModel::where(['id' => $item['id'], 'type' => 2])->find();

        // 如果消息已存在且 sendStatus == 0（已发送），则跳过更新
        // 注意：这里只跳过已发送的消息，未发送的消息（sendStatus != 0）仍然需要更新
        if (!empty($exists) && $exists['sendStatus'] == 0){
            return true;
        }

        // 处理发送者信息
        $sender = $item['sender'] ?? [];
        
        // 处理消息内容，提取发送者ID和消息内容
        $originalContent = $item['content'] ?? '';
        $processedResult = $this->processMessageContent($originalContent);
        $senderId = $processedResult['senderId'];
        $processedContent = $processedResult['content'];

        // 将毫秒时间戳转换为秒级时间戳
        $createTime = isset($item['createTime']) ? strtotime($item['createTime']) : null;
        $deleteTime = !empty($item['isDeleted']) ? strtotime($item['deleteTime']) : null;
        $wechatTime = isset($item['wechatTime']) ? floor($item['wechatTime'] / 1000) : null;

        $data = [
            'id' => $item['id'],
            'type' => 2,
            'wechatChatroomId' => $item['wechatChatroomId'],
            // sender信息，添加sender前缀
            'senderNickname' => $sender['nickname'] ?? '',
            'senderWechatId' => $sender['wechatId'] ?? $senderId, // 使用提取的发送者ID作为备选
            'senderIsAdmin' => $sender['isAdmin'] ?? false,
            'senderIsDeleted' => $sender['isDeleted'] ?? false,
            'senderChatroomNickname' => $sender['chatroomNickname'] ?? '',
            'senderWechatAccountId' => $sender['wechatAccountId'] ?? '',
            // 其他字段
            'wechatAccountId' => $item['wechatAccountId'],
            'tenantId' => $item['tenantId'],
            'accountId' => $item['accountId'],
            'synergyAccountId' => $item['synergyAccountId'] ?? 0,
            'content' => $processedContent, // 使用处理后的内容
            'originalContent' => $originalContent, // 保存原始内容
            'msgType' => $item['msgType'],
            'msgSubType' => $item['msgSubType'] ?? 0,
            'msgSvrId' => $item['msgSvrId'] ?? '',
            'isSend' => $item['isSend'] ?? true,
            'createTime' => $createTime,
            'isDeleted' => $item['isDeleted'] ?? false,
            'deleteTime' => $deleteTime,
            'sendStatus' => $item['sendStatus'] ?? 0,
            'wechatTime' => $wechatTime,
            'origin' => $item['origin'] ?? 0,
            'msgId' => $item['msgId'],
            'recallId' => $item['recallId'] ?? false
        ];

        // 创建或更新记录
        try {
            if(empty($exists)){
                // 新记录，直接创建
                $result = WechatMessageModel::create($data);
                if (!$result) {
                    throw new \Exception('创建群聊消息记录失败');
                }
            }else{
                // 已存在记录，更新（排除 id 字段）
                unset($data['id']);
                $result = $exists->save($data);
                if ($result === false) {
                    throw new \Exception('更新群聊消息记录失败');
                }
            }
            return true;
        } catch (\Exception $e) {
            // 记录错误日志，便于调试
            \think\facade\Log::error('保存群聊消息失败：' . $e->getMessage(), [
                'message_id' => $item['id'] ?? '',
                'data' => $data ?? []
            ]);
            return false;
        }
    }

    /**
     * 处理消息内容，提取发送者ID和消息内容
     * @param string $content 原始消息内容
     * @return array 包含senderId和content的数组
     */
    private function processMessageContent($content)
    {
        if (empty($content)) {
            return [
                'senderId' => '',
                'content' => ''
            ];
        }

        // 处理消息格式：wxid_vr2qafb1vg0d22:\n安德玛儿童
        if (preg_match('/^([^:]+):\n(.+)$/s', $content, $matches)) {
            $senderId = trim($matches[1]);
            $messageContent = trim($matches[2]);
            
            // 检查消息内容是否为JSON格式
            if (substr($messageContent, 0, 1) === '{' && substr($messageContent, -1) === '}') {
                try {
                    // 尝试解析JSON
                    $jsonData = json_decode($messageContent, true);
                    if (json_last_error() == JSON_ERROR_NONE && isset($jsonData['text'])) {
                        // 如果是合法的JSON且包含text字段，则提取text字段作为内容
                        $messageContent = $jsonData['text'];
                    }
                } catch (\Exception $e) {
                    // JSON解析出错，保持原内容不变
                }
            }
            
            return [
                'senderId' => $senderId,
                'content' => $messageContent
            ];
        }
        
        // 如果没有匹配到格式，则返回原始内容
        return [
            'senderId' => '',
            'content' => $content
        ];
    }
} 