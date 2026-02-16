<?php

namespace app\chukebao\controller;

use app\api\model\WechatMessageModel;
use app\chukebao\model\FriendSettings;
use library\ResponseHelper;
use think\Db;
use think\facade\Env;
use app\common\service\AuthService;

class MessageController extends BaseController
{
    protected $baseUrl;
    protected $authorization;

    public function __construct()
    {
        parent::__construct();
        $this->baseUrl = Env::get('api.wechat_url');
        $this->authorization = AuthService::getSystemAuthorization();
    }

    public function getList()
    {
        $page = $this->request->param('page', 1);
        $limit = $this->request->param('limit', 10);
        $accountId = $this->getUserInfo('s2_accountId');
        if (empty($accountId)) {
            return ResponseHelper::error('请先登录');
        }

        // 直接查询好友ID列表
        $ids = Db::table('s2_wechat_friend')
            ->where(['accountId' => $accountId, 'isDeleted' => 0])
            ->column('id');
        $friendIds = empty($ids) ? [0] : $ids; // 避免 IN 查询为空

        // 直接查询好友信息
        $friends = Db::table('s2_wechat_friend')
            ->where(['accountId' => $accountId, 'isDeleted' => 0])
            ->column('id,nickname,avatar,conRemark,labels,groupId,wechatAccountId,wechatId,extendFields,phone,region,isTop');

        // 直接查询群聊信息
        $chatrooms = Db::table('s2_wechat_chatroom')
            ->where(['accountId' => $accountId, 'isDeleted' => 0])
            ->column('id,nickname,chatroomAvatar,chatroomId,isTop');

        // 获取群聊ID列表
        $chatroomIds = array_keys($chatrooms);
        if (empty($chatroomIds)) {
            $chatroomIds = [0];
        }
        
        // 1. 查询群聊最新消息
        $chatroomMessages = [];
        if (!empty($chatroomIds) && $chatroomIds[0] != 0) {
            $chatroomIdsStr = implode(',', array_map('intval', $chatroomIds));
            $chatroomLatestQuery = "
                SELECT wc.id as chatroomId, m.id, m.content, m.wechatChatroomId, m.createTime, m.wechatTime, m.wechatAccountId,
                       wc.nickname, wc.chatroomAvatar as avatar, wc.chatroomId, wc.isTop, 2 as msgType
                FROM s2_wechat_chatroom wc
                INNER JOIN (
                    SELECT wechatChatroomId, MAX(wechatTime) as maxTime, MAX(id) as maxId
                    FROM s2_wechat_message 
                    WHERE type = 2 AND wechatChatroomId IN ({$chatroomIdsStr})
                    GROUP BY wechatChatroomId
                ) latest ON wc.id = latest.wechatChatroomId
                INNER JOIN s2_wechat_message m ON m.wechatChatroomId = latest.wechatChatroomId 
                    AND m.wechatTime = latest.maxTime AND m.id = latest.maxId
                WHERE wc.accountId = {$accountId} AND wc.isDeleted = 0
            ";
            $chatroomMessages = Db::query($chatroomLatestQuery);
        }

        // 2. 查询好友最新消息
        $friendMessages = [];
        if (!empty($friendIds) && $friendIds[0] != 0) {
            $friendIdsStr = implode(',', array_map('intval', $friendIds));
            $friendLatestQuery = "
                SELECT m.wechatFriendId, m.id, m.content, m.createTime, m.wechatTime, 
                       f.wechatAccountId, 1 as msgType, 0 as isTop
                FROM s2_wechat_message m
                INNER JOIN (
                    SELECT wechatFriendId, MAX(wechatTime) as maxTime, MAX(id) as maxId
                    FROM s2_wechat_message 
                    WHERE type = 1 AND wechatFriendId IN ({$friendIdsStr})
                    GROUP BY wechatFriendId
                ) latest ON m.wechatFriendId = latest.wechatFriendId 
                    AND m.wechatTime = latest.maxTime AND m.id = latest.maxId
                INNER JOIN s2_wechat_friend f ON f.id = m.wechatFriendId
                WHERE m.type = 1 AND m.wechatFriendId IN ({$friendIdsStr})
            ";
            $friendMessages = Db::query($friendLatestQuery);
        }

        // 合并结果并排序
        $allMessages = array_merge($chatroomMessages, $friendMessages);
        usort($allMessages, function ($a, $b) {
            return $b['wechatTime'] <=> $a['wechatTime'];
        });

        // 计算总数
        $totalCount = count($allMessages);
        
        // 分页处理
        $list = array_slice($allMessages, ($page - 1) * $limit, $limit);

        // 收集需要查询的ID
        $queryFriendIds = [];
        $queryChatroomIds = [];
        foreach ($list as $row) {
            if (!empty($row['wechatFriendId'])) {
                $queryFriendIds[] = $row['wechatFriendId'];
            }
            if (!empty($row['wechatChatroomId'])) {
                $queryChatroomIds[] = $row['wechatChatroomId'];
            }
        }
        $queryFriendIds = array_unique($queryFriendIds);
        $queryChatroomIds = array_unique($queryChatroomIds);

        // 批量查询未读数量（优化：合并查询）
        $unreadMap = [];
        if (!empty($queryFriendIds)) {
            $friendUnreads = Db::table('s2_wechat_message')
                ->where(['isRead' => 0, 'type' => 1])
                ->whereIn('wechatFriendId', $queryFriendIds)
                ->field('wechatFriendId, COUNT(*) as cnt')
                ->group('wechatFriendId')
                ->select();
            foreach ($friendUnreads as $item) {
                $unreadMap['friend_' . $item['wechatFriendId']] = (int)$item['cnt'];
            }
        }

        if (!empty($queryChatroomIds)) {
            $chatroomUnreads = Db::table('s2_wechat_message')
                ->where(['isRead' => 0, 'type' => 2])
                ->whereIn('wechatChatroomId', $queryChatroomIds)
                ->field('wechatChatroomId, COUNT(*) as cnt')
                ->group('wechatChatroomId')
                ->select();
            foreach ($chatroomUnreads as $item) {
                $unreadMap['chatroom_' . $item['wechatChatroomId']] = (int)$item['cnt'];
            }
        }

        // 批量查询AI类型
        $aiTypeData = [];
        if (!empty($queryFriendIds)) {
            $aiTypeData = FriendSettings::where('friendId', 'in', $queryFriendIds)->column('friendId,type');
        }

        // 格式化数据
        foreach ($list as $k => &$v) {
            $createTime = !empty($v['createTime']) ? date('Y-m-d H:i:s', $v['createTime']) : '';
            $wechatTime = !empty($v['wechatTime']) ? date('Y-m-d H:i:s', $v['wechatTime']) : '';

            $unreadCount = 0;
            $v['aiType'] = 0;

            if (!empty($v['wechatFriendId'])) {
                // 好友消息
                $friendId = $v['wechatFriendId'];
                $friend = $friends[$friendId] ?? null;
                
                $v['nickname'] = $friend['nickname'] ?? '';
                $v['avatar'] = $friend['avatar'] ?? '';
                $v['conRemark'] = $friend['conRemark'] ?? '';
                $v['groupId'] = $friend['groupId'] ?? '';
                $v['wechatAccountId'] = $friend['wechatAccountId'] ?? '';
                $v['wechatId'] = $friend['wechatId'] ?? '';
                $v['extendFields'] = $friend['extendFields'] ?? [];
                $v['region'] = $friend['region'] ?? '';
                $v['phone'] = $friend['phone'] ?? '';
                $v['isTop'] = $friend['isTop'] ?? 0;
                $v['labels'] = !empty($friend['labels']) ? json_decode($friend['labels'], true) : [];

                $unreadCount = $unreadMap['friend_' . $friendId] ?? 0;
                $v['aiType'] = $aiTypeData[$friendId] ?? 0;
                $v['id'] = $friendId;
                unset($v['chatroomId']);
            } elseif (!empty($v['wechatChatroomId'])) {
                // 群聊消息
                $chatroomId = $v['wechatChatroomId'];
                $chatroom = $chatrooms[$chatroomId] ?? null;
                
                $v['nickname'] = $chatroom['nickname'] ?? '';
                $v['avatar'] = $chatroom['chatroomAvatar'] ?? '';
                $v['conRemark'] = '';
                $v['isTop'] = $chatroom['isTop'] ?? 0;
                $v['chatroomId'] = $chatroom['chatroomId'] ?? '';
                
                $unreadCount = $unreadMap['chatroom_' . $chatroomId] ?? 0;
                $v['id'] = $chatroomId;
                unset($v['wechatFriendId']);
            }

            $v['config'] = [
                'top' => !empty($v['isTop']) ? true : false,
                'unreadCount' => $unreadCount,
                'chat' => true,
                'msgTime' => $wechatTime,
            ];
            $v['createTime'] = $createTime;
            $v['lastUpdateTime'] = $wechatTime;
            $v['latestMessage'] = [
                'content' => $v['content'] ?? '',
                'wechatTime' => $wechatTime
            ];

            unset($v['wechatChatroomId'], $v['isTop'], $v['msgType']);
        }
        unset($v);

        return ResponseHelper::success(['list' => $list, 'total' => $totalCount]);
    }


    public function readMessage()
    {
        $wechatFriendId = $this->request->param('wechatFriendId', '');
        $wechatChatroomId = $this->request->param('wechatChatroomId', '');
        $accountId = $this->getUserInfo('s2_accountId');
        if (empty($accountId)) {
            return ResponseHelper::error('请先登录');
        }
        if (empty($wechatChatroomId) && empty($wechatFriendId)) {
            return ResponseHelper::error('参数缺失');
        }

        $where = [];
        if (!empty($wechatChatroomId)) {
            $where[] = ['wechatChatroomId', '=', $wechatChatroomId];
        }

        if (!empty($wechatFriendId)) {
            $where[] = ['wechatFriendId', '=', $wechatFriendId];
        }

        Db::table('s2_wechat_message')->where($where)->update(['isRead' => 1]);
        return ResponseHelper::success([]);
    }


    /**
     * 获取单条消息发送状态（带轮询功能）
     * @return \think\response\Json
     */
    public function getMessageStatus()
    {
        $messageId = $this->request->param('messageId', 0);
        $wechatAccountId = $this->request->param('wechatAccountId', '');
        $accountId = $this->getUserInfo('s2_accountId');
        $wechatFriendId = $this->request->param('wechatFriendId', '');
        $wechatChatroomId = $this->request->param('wechatChatroomId', '');

        if (empty($accountId)) {
            return ResponseHelper::error('请先登录');
        }
        
        if (empty($messageId)) {
            return ResponseHelper::error('消息ID不能为空');
        }
        
        if(empty($wechatFriendId) && empty($wechatChatroomId)) {
            return ResponseHelper::error('消息类型不能为空');
        }

        // 查询单条消息的基本信息（只需要发送状态相关字段）
        $message = Db::table('s2_wechat_message')
            ->where('id', $messageId)
            ->field('id,wechatAccountId,wechatFriendId,wechatChatroomId,sendStatus')
            ->find();
        
        if (empty($message)) {
            $message = [
                'id' => $messageId,
                'wechatAccountId' => $wechatAccountId,
                'wechatFriendId' => $wechatFriendId,
                'wechatChatroomId' => $wechatChatroomId,
                'sendStatus' => 0,
            ];
        }

        $sendStatus = isset($message['sendStatus']) ? (int)$message['sendStatus'] : 0;
        $isUpdated = false;
        $pollCount = 0;
        $maxPollCount = 10; // 最多轮询10次

        // 如果sendStatus不为0，开始轮询
        if ($sendStatus != 0) {
            $messageRequest = [
                'id' => $message['id'],
                'wechatAccountId' => !empty($wechatAccountId) ? $wechatAccountId : $message['wechatAccountId'],
                'wechatFriendId' => !empty($message['wechatFriendId']) ? $message['wechatFriendId'] : '',
                'wechatChatroomId' => !empty($message['wechatChatroomId']) ? $message['wechatChatroomId'] : '',
                'from' => '',
                'to' => '',
            ];
            

            // 轮询逻辑：最多10次
            while ($pollCount < $maxPollCount && $sendStatus != 0) {
                $pollCount++;
                
                // 请求线上接口获取最新状态
                $newData = $this->fetchLatestMessageFromApi($messageRequest);
                
                if (!empty($newData)) {
                    // 重新查询消息状态（可能已更新）
                    $updatedMessage = Db::table('s2_wechat_message')
                        ->where('id', $messageId)
                        ->field('sendStatus')
                        ->find();
                    
                    if (!empty($updatedMessage)) {
                        $newSendStatus = isset($updatedMessage['sendStatus']) ? (int)$updatedMessage['sendStatus'] : 0;
                        
                        // 如果状态已更新为0（已发送），停止轮询
                        if ($newSendStatus == 0) {
                            $sendStatus = 0;
                            $isUpdated = true;
                            break;
                        }
                        
                        // 如果状态仍然是1，继续轮询（但需要等待一下，避免请求过快）
                        if ($newSendStatus != 0 && $pollCount < $maxPollCount) {
                            // 每次轮询间隔500毫秒（0.5秒）
                            usleep(500000);
                        }
                    }
                } else {
                    // 如果请求失败，等待后继续尝试
                    if ($pollCount < $maxPollCount) {
                        usleep(500000);
                    }
                }
            }
        }

        // 返回发送状态信息
        return ResponseHelper::success([
            'messageId' => $messageId,
            'sendStatus' => $sendStatus,
            'statusText' => $sendStatus == 0 ? '已发送' : '发送中'
        ]);
    }

    public function details()
    {
        $wechatFriendId = $this->request->param('wechatFriendId', '');
        $wechatChatroomId = $this->request->param('wechatChatroomId', '');
        $wechatAccountId = $this->request->param('wechatAccountId', '');
        $page = $this->request->param('page', 1);
        $limit = $this->request->param('limit', 10);
        $from = $this->request->param('From', '');
        $to = $this->request->param('To', '');
        $olderData = $this->request->param('olderData', false);
        $accountId = $this->getUserInfo('s2_accountId');
        if (empty($accountId)) {
            return ResponseHelper::error('请先登录');
        }
        if (empty($wechatChatroomId) && empty($wechatFriendId)) {
            return ResponseHelper::error('参数缺失');
        }

        $where = [];
        if (!empty($wechatChatroomId)) {
            $where[] = ['wechatChatroomId', '=', $wechatChatroomId];
        }

        if (!empty($wechatFriendId)) {
            $where[] = ['wechatFriendId', '=', $wechatFriendId];
        }

        if (!empty($From) && !empty($To)) {
            $where[] = ['wechatTime', 'between', [$from, $to]];
        }

        $total = Db::table('s2_wechat_message')->where($where)->count();
        $list = Db::table('s2_wechat_message')->where($where)->page($page, $limit)->order('id DESC')->select();

        // 检查消息是否有sendStatus字段，如果有且不为0，则请求线上最新接口
        foreach ($list as $k => &$item) {
            // 检查是否存在sendStatus字段且不为0（0表示已发送成功）
            if (isset($item['sendStatus']) && $item['sendStatus'] != 0) {
                // 需要请求新的数据
                $messageRequest = [
                    'id' => $item['id'],
                    'wechatAccountId' => $wechatAccountId,
                    'wechatFriendId' => $wechatFriendId,
                    'wechatChatroomId' => $wechatChatroomId,
                    'from' => '',
                    'to' => '',
                ];
                $newData = $this->fetchLatestMessageFromApi($messageRequest);
                if (!empty($newData)){
                    $item['sendStatus'] = 0;
                }
            }
            // 格式化时间
            $item['wechatTime'] = !empty($item['wechatTime']) ? date('Y-m-d H:i:s', $item['wechatTime']) : '';
        }
        unset($item);


        return ResponseHelper::success(['total' => $total, 'list' => $list]);
    }



    



    /**
     * 从线上接口获取最新消息
     * @param array $messageRequest 消息项（包含wechatAccountId、wechatFriendId或wechatChatroomId、id等）
     * @return array|null 最新消息数据，失败返回null
     */
    private function fetchLatestMessageFromApi($messageRequest)
    {
        if (empty($this->baseUrl) || empty($this->authorization)) {
            return null;
        }

        try {
            // 设置请求头
            $headerData = ['client:system'];
            $header = setHeader($headerData, $this->authorization, 'json');

            // 判断是好友消息还是群聊消息
            if (!empty($messageRequest['wechatFriendId'])) {
                // 好友消息接口
                $params = [
                    'keyword' => '',
                    'msgType' => '',
                    'accountId' => '',
                    'count' => 20, // 获取多条消息以便找到对应的消息
                    'messageId' => isset($messageRequest['id']) ? $messageRequest['id'] : '',
                    'olderData' => true,
                    'wechatAccountId' => $messageRequest['wechatAccountId'],
                    'wechatFriendId' => $messageRequest['wechatFriendId'],
                    'from' => $messageRequest['from'],
                    'to' => $messageRequest['to'],
                    'searchFrom' => 'admin'
                ];
                $result = requestCurl($this->baseUrl . 'api/FriendMessage/searchMessage', $params, 'GET', $header, 'json');
                $response = handleApiResponse($result);
                // 查找对应的消息
                if (!empty($response) && is_array($response)) {
                    $data = $response[0];
                    if ($data['sendStatus'] == 0){
                        WechatMessageModel::where(['id' => $data['id']])->update(['sendStatus' => 0]);
                        return true;
                    }
                }
                return false;
            } elseif (!empty($messageRequest['wechatChatroomId'])) {
                // 群聊消息接口
                $params = [
                    'keyword' => '',
                    'msgType' => '',
                    'accountId' => '',
                    'count' => 20, // 获取多条消息以便找到对应的消息
                    'messageId' => isset($messageRequest['id']) ? $messageRequest['id'] : '',
                    'olderData' => true,
                    'wechatId' => '',
                    'wechatAccountId' => $messageRequest['wechatAccountId'],
                    'wechatChatroomId' => $messageRequest['wechatChatroomId'],
                    'from' => $messageRequest['from'],
                    'to' => $messageRequest['to'],
                    'searchFrom' => 'admin'
                ];

                $result = requestCurl($this->baseUrl . 'api/ChatroomMessage/searchMessage', $params, 'GET', $header, 'json');
                $response = handleApiResponse($result);

                // 查找对应的消息
                if (!empty($response) && is_array($response)) {
                    $data = $response[0];
                    if ($data['sendStatus'] == 0){
                        WechatMessageModel::where(['id' => $data['id']])->update(['sendStatus' => 0]);
                        return true;
                    }
                }
                return false;
            }
        } catch (\Exception $e) {
            // 记录错误日志，但不影响主流程
            \think\facade\Log::error('获取线上最新消息失败：' . $e->getMessage());
        }

        return null;
    }

    /**
     * 更新数据库中的消息
     * @param array $latestMessage 线上获取的最新消息
     * @param array $oldMessage 旧消息数据
     */
    private function updateMessageInDatabase($latestMessage, $oldMessage)
    {
        try {
            // 使用API模块的MessageController来保存消息
            $apiMessageController = new \app\api\controller\MessageController();

            // 判断是好友消息还是群聊消息
            if (!empty($oldMessage['wechatFriendId'])) {
                // 保存好友消息
                $apiMessageController->saveMessage($latestMessage);
            } elseif (!empty($oldMessage['wechatChatroomId'])) {
                // 保存群聊消息
                $apiMessageController->saveChatroomMessage($latestMessage);
            }
        } catch (\Exception $e) {
            // 记录错误日志，但不影响主流程
            \think\facade\Log::error('更新数据库消息失败：' . $e->getMessage());
        }
    }

}