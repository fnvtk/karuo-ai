<?php

namespace app\cozeai\controller;

use app\cozeai\model\Conversation as ConversationModel;
use app\cozeai\model\Message as MessageModel;
use think\facade\Env;
/**
 * Coze AI 对话控制器
 */
class ConversationController extends BaseController
{

    
    /**
     * 保存对话数据到数据库
     * @param array $conversation 对话数据
     * @param string $bot_id 机器人ID
     */
    private function saveConversation($conversation, $bot_id)
    {
        if (empty($conversation['id'])) {
            return false;
        }

        // 检查是否已存在
        $exists = ConversationModel::where('conversation_id', $conversation['id'])->find();
        $meta_data = $conversation['meta_data'] ?? [];
        if (!$exists) {
            // 不存在则插入
            $data = [
                'conversation_id' => $conversation['id'],
                'bot_id' => $bot_id,
                'created_at' => $conversation['created_at'],
                'meta_data' => $meta_data,
                'create_time' => time(),
                'update_time' => time()
            ];

            if(isset($meta_data['uid']) && !empty($meta_data['uid'])){
                $data['userId'] = $meta_data['uid'];
            }

            if(isset($meta_data['companyId']) && !empty($meta_data['companyId'])){
                $data['companyId'] = $meta_data['companyId'];
            }
            return ConversationModel::create($data);
        } else {
            // 存在则更新
            return $exists->save([
                'meta_data' => json_encode($meta_data),
                'update_time' => time()
            ]);
        }
    }

    /**
     * 获取会话列表
     */
    public function list()
    {
        try {
            $bot_id = input('bot_id','');
            if(empty($bot_id)){
                if($is_internal){
                    return json_encode([
                        'code' => 400,
                        'msg' => '智能体ID不能为空',
                        'data' => []
                    ]);
                }else{
                    return errorJson('智能体ID不能为空');
                }
            }
            $page = input('page',1);
            $limit = input('limit',20);

            $params = [
                'bot_id' => $bot_id,
                'page_num' => $page,
                'page_size' => $limit,
                'sort_order' => 'desc'
            ];
            
            $result = requestCurl($this->apiUrl . "/v1/conversations", $params, 'GET', $this->headers);
            $result = json_decode($result, true);
            
            if ($result['code'] != 0) {
                if($is_internal){
                    return json_encode([
                        'code' => $result['code'],
                        'msg' => $result['msg'],
                        'data' => []
                    ]);
                }else{
                    return errorJson($result['msg'], $result['code']);
                }
            }

            // 处理返回的数据并存入数据库
            if (!empty($result['data']['conversations'])) {
                foreach ($result['data']['conversations'] as $item) {
                    $this->saveConversation($item, $bot_id);
                }
            }

            return successJson($result['data'], '获取成功');
            
        } catch (\Exception $e) {
            return errorJson('获取对话列表失败：' . $e->getMessage());
        }
    }

    /**
     * 创建会话
     */
    public function create($is_internal = false)
    {
        try {
            $bot_id = Env::get('cozeAi.bot_id');
            $userInfo = request()->userInfo;
            $uid = $userInfo['id'];
            $companyId = $userInfo['companyId'];
            
            if(empty($bot_id)){
                if($is_internal){
                    return json_encode([
                        'code' => 400,
                        'msg' => '智能体ID不能为空',
                        'data' => []
                    ]);
                }else{
                    return errorJson('智能体ID不能为空');
                }
            }

            // 构建元数据和消息
            $meta_data = [
                'uid' => strval($uid),
                'companyId' => strval($companyId),
            ];
            $messages[] = [
                'role' => 'assistant',
                'content' => Env::get('cozeAi.content'),
                'type' => 'answer',
                'content_type' => 'text',
            ];
            
            $params = [
                'bot_id' => strval($bot_id),
                'meta_data' => $meta_data,
                'messages' => $messages,
            ];
            $url = $this->apiUrl . '/v1/conversation/create';
            $result = $this->httpRequest($url, 'POST', json_encode($params,256), $this->headers);
            $result = json_decode($result, true);
            if ($result['code'] != 0) {
                if($is_internal){
                    return json_encode([
                        'code' => $result['code'],
                        'msg' => $result['msg'],
                        'data' => []
                    ]);
                }else{
                    return errorJson($result['msg'], $result['code']);
                }
            }
          
            // 获取返回的对话数据并保存
            $conversation = $result['data'] ?? [];
            if (!empty($conversation)) {
                $this->saveConversation($conversation, $bot_id);


            // 保存用户发送的消息
            $userMessageData = [
                'chat_id' => $conversation['id'],
                'conversation_id' => $conversation['id'],
                'bot_id' => $bot_id,
                'content' => Env::get('cozeAi.content'),
                'content_type' => 'text',
                'role' => 'assistant',
                'type' => 'answer',
                'created_at' => time(),
                'updated_at' => time()
            ];
            MessageModel::create($userMessageData);

            }
            
            if($is_internal){
                return json_encode([
                    'code' => 200,
                    'data' => $conversation,
                    'msg' => '创建成功'
                ]);
            }else{
                return successJson($conversation, '创建成功');
            }
            
        } catch (\Exception $e) {
            if($is_internal){
                return json_encode([
                    'code' => 500,
                    'msg' => '创建对话失败：' . $e->getMessage(),
                    'data' => []
                ]);
            }else{
                return errorJson('创建对话失败：' . $e->getMessage());
            }
        }
    }

    /**
     * 创建对话
     */
    public function createChat()
    {
        try {
            $bot_id = Env::get('cozeAi.bot_id');
            $conversation_id = input('conversation_id','');
            $question = input('question','');

            if(empty($bot_id)){
                return errorJson('智能体ID不能为空');
            }

            if(empty($conversation_id)){
                return errorJson('会话ID不能为空');
            }
        
            if(empty($question)){
                return errorJson('问题不能为空');
            }

            $userInfo = request()->userInfo;
            $uid = $userInfo['id'];
            $companyId = $userInfo['companyId'];
            
            // 构建请求数据
            $params = [
                'bot_id' => strval($bot_id),
                'user_id' => strval($uid),   
                'additional_messages' => [
                     [
                        'role' => 'user',
                        'content' => $question,
                        'type' => 'question',
                        'content_type' => 'text'
                    ]
                ],
                'stream' => false,
                'auto_save_history' => true
            ];

            $url = $this->apiUrl . '/v3/chat?conversation_id='.$conversation_id;
            $result = $this->httpRequest($url, 'POST', json_encode($params,256), $this->headers);
            $result = json_decode($result, true);
            if ($result['code'] != 0) {
                return errorJson($result['msg'], $result['code']);
            }

            // 保存用户发送的消息
            $userMessageData = [
                'chat_id' => $result['data']['id'],
                'conversation_id' => $conversation_id,
                'bot_id' => $bot_id,
                'content' => $question,
                'content_type' => 'text',
                'role' => 'user',
                'type' => 'question',
                'created_at' => $result['data']['created_at'],
                'updated_at' => $result['data']['created_at']
            ];
            MessageModel::create($userMessageData);


            return successJson($result['data'], '发送成功');
            
        } catch (\Exception $e) {
            return errorJson('创建对话失败：' . $e->getMessage());
        }
    }

    /**
     * 查看对话详情
     */
    public function chatRetrieve()
    {
        $conversation_id = input('conversation_id','');
        $chat_id = input('chat_id','');
        if(empty($conversation_id) && empty($chat_id)){
            return errorJson('参数缺失');
        }
        $conversation = ConversationModel::where('conversation_id', $conversation_id)->find();
        if(empty($conversation)){
            return errorJson('会话不存在');
        }

        $params = [
            'conversation_id' => $conversation_id,
            'chat_id' => $chat_id
        ];

        $url = $this->apiUrl . '/v3/chat/retrieve?' . dataBuild($params);

        $result = $this->httpRequest($url, 'GET', [], $this->headers);
        $result = json_decode($result, true);


        if ($result['code'] != 0) {
            return errorJson($result['msg'], $result['code']);
        }
        $status = [
            'created' => '对话已创建',
            'in_progress' => '智能体正在处理中',
            'completed' => '智能体已完成处理，本次对话结束',
            'failed' => '对话失败',
            'requires_action' => '对话中断，需要进一步处理',
            'canceled' => '对话已取消',
        ];

        $status_msg = $status[$result['data']['status']] ?? '未知状态';
        if($result['data']['status'] == 'failed'){
            $last_error = $result['data']['last_error'];
            $error_msg = $status_msg . '，错误信息：' . $last_error['msg'];
            return errorJson($error_msg);
        }else{
            return successJson($result['data'],$status_msg);
        }
    }



   /**
    * 获取对话消息详情
    */  
    public function chatMessage(){
        $conversation_id = input('conversation_id','');
        $chat_id = input('chat_id','');
        if(empty($conversation_id) && empty($chat_id)){
            return errorJson('参数缺失');
        }
        $conversation = ConversationModel::where('conversation_id', $conversation_id)->find();
        if(empty($conversation)){
            return errorJson('会话不存在');
        }

        $params = [
            'conversation_id' => $conversation_id,
            'chat_id' => $chat_id
        ];
        $url = $this->apiUrl . '/v3/chat/message/list?' . dataBuild($params);
        $result = $this->httpRequest($url, 'GET', [], $this->headers);
        $result = json_decode($result, true);

        if ($result['code'] != 0) {
            return errorJson($result['msg'], $result['code']);
        }

        $data = $result['data'];
        $list = [];
        foreach($data as $item){
            if($item['type'] == 'answer'){
                $timestamp = $item['updated_at'];
                $now = time();
                $today = strtotime(date('Y-m-d'));
                $yesterday = strtotime('-1 day', $today);
                $thisYear = strtotime(date('Y-01-01'));

                // 格式化时间
                if($timestamp >= $today) {
                    $time = date('H:i', $timestamp);
                } elseif($timestamp >= $yesterday) {
                    $time = '昨天 ' . date('H:i', $timestamp);
                } elseif($timestamp >= $thisYear) {
                    $time = date('m-d H:i', $timestamp);
                } else {
                    $time = date('Y-m-d H:i', $timestamp);
                }

                // 保存消息记录
                $messageData = [
                    'chat_id' => $item['id'],
                    'conversation_id' => $conversation_id,
                    'bot_id' => $item['bot_id'],
                    'content' => $item['content'],
                    'content_type' => $item['content_type'],
                    'role' => $item['role'],
                    'type' => $item['type'],
                    'created_at' => $item['created_at'],
                    'updated_at' => $item['updated_at']
                ];

                // 检查消息是否已存在
                $exists = MessageModel::where('chat_id', $item['id'])->find();
                if (!$exists) {
                    MessageModel::create($messageData);
                }

                $list = [
                    'id' => $item['id'],
                    'type' => 'assistant',
                    'content' => $item['content'],
                    'time' => $time
                ];
                break;
            }
        }

        return successJson($list, '获取成功');
    }
}