<?php

namespace app\ai\controller;

use think\facade\Env;
use think\Controller;

class CozeAI extends Controller
{
    protected $apiUrl;
    protected $accessToken;
    protected $headers;

    /**
     * 初始化
     */
    public function __construct()
    {
        parent::__construct();

        // 从环境变量获取配置
        $this->apiUrl = Env::get('cozeAi.api_url');
        $this->accessToken = Env::get('cozeAi.token');

        if (empty($this->accessToken) || empty($this->apiUrl)) {
            return json_encode(['code' => 500, 'msg' => '参数缺失']);
        }

        // 设置请求头
        $this->headers = [
            'Authorization: Bearer ' . $this->accessToken,
            'Content-Type: application/json'
        ];
    }


    /**
     * 创建智能体
     * @param $data
     * @return false|string|\think\response\Json
     */
    public function createBot($data = [])
    {
        $space_id = Env::get('cozeAi.space_id');
        $name = !empty($data['name']) ? $data['name'] : '';
        $model_id = !empty($data['model_id']) ? $data['model_id'] : '';
        $prompt_info = !empty($data['prompt_info']) ? $data['prompt_info'] : '';
        $plugin_id_list = [
            'id_list' => [
                ['api_id' => '7362852017859035163', 'plugin_id' => '7362852017859018779'],
                ['api_id' => '7472045461050851367', 'plugin_id' => '7472045461050834983'],
            ]
        ];
        if (empty($name)) {
            return json_encode(['code' => 500, 'msg' => '参数缺失']);
        }

        $model_info_config = [
            'model_id' => (string)$model_id,
        ];

        $params = [
            'space_id' => $space_id,
            'name' => $name,
            'model_info_config' => (object)$model_info_config,
            'plugin_id_list' => (object)$plugin_id_list
        ];

        if (!empty($prompt_info)){
            $new_prompt_info = [
                'prompt' => $prompt_info
            ];
            $params['prompt_info'] = (object) $new_prompt_info;
        }

        $result = requestCurl($this->apiUrl . '/v1/bot/create', $params, 'POST', $this->headers, 'json');
        $result = json_decode($result, true);
        if ($result['code'] != 0) {
            return json_encode(['code' => $result['code'], 'msg' => $result['msg'], 'data' => []]);
        }

        return json_encode(['code' => 200, 'msg' => '创建成功', 'data' => $result['data']]);
    }


    /**
     * 创建智能体
     * @param $data
     * @return false|string|\think\response\Json
     */
    public function updateBot($data = [])
    {
        $space_id = Env::get('cozeAi.space_id');
        $bot_id = !empty($data['bot_id']) ? $data['bot_id'] : '';
        $name = !empty($data['name']) ? $data['name'] : '';
        $model_id = !empty($data['model_id']) ? $data['model_id'] : '';
        $prompt_info = !empty($data['prompt_info']) ? $data['prompt_info'] : '';
        $dataset_ids = !empty($data['dataset_ids']) ? $data['dataset_ids'] : '';
        $plugin_id_list = [
            'id_list' => [
                ['api_id' => '7362852017859035163', 'plugin_id' => '7362852017859018779'],
                ['api_id' => '7472045461050851367', 'plugin_id' => '7472045461050834983'],
            ]
        ];
        if (empty($name) || empty($bot_id)) {
            return json_encode(['code' => 500, 'msg' => '参数缺失']);
        }

        $model_info_config = [
            'model_id' => (string)$model_id,
        ];

        $params = [
            'bot_id' => $bot_id,
            'space_id' => $space_id,
            'name' => $name,
            'model_info_config' => (object)$model_info_config,
            'plugin_id_list' => (object)$plugin_id_list
        ];


        if (!empty($prompt_info)){
            $new_prompt_info = [
                'prompt' => $prompt_info
            ];
            $params['prompt_info'] = (object) $new_prompt_info;
        }

        if (!empty($dataset_ids)){
            $knowledge = [
                'dataset_ids' => $dataset_ids
            ];
            $params['knowledge'] = (object) $knowledge;
        }

        $result = requestCurl($this->apiUrl . '/v1/bot/update', $params, 'POST', $this->headers, 'json');
        $result = json_decode($result, true);
        if ($result['code'] != 0) {
            return json_encode(['code' => $result['code'], 'msg' => $result['msg'], 'data' => []]);
        }
        return json_encode(['code' => 200, 'msg' => '更新成功', 'data' => []]);
    }


    /**
     * 发布智能体
     * @param $data
     * @return false|string|\think\response\Json
     */
    public function botPublish($data = [])
    {
        $bot_id = !empty($data['bot_id']) ? $data['bot_id'] : '';
        $connector_ids = ['1024', '999'];
        if (empty($bot_id) || empty($connector_ids)) {
            return json_encode(['code' => 500, 'msg' => '参数缺失']);
        }

        $params = [
            'bot_id' => $bot_id,
            'connector_ids' => $connector_ids,
        ];
        $result = requestCurl($this->apiUrl . '/v1/bot/publish', $params, 'POST', $this->headers, 'json');
        $result = json_decode($result, true);
        if ($result['code'] != 0) {
            return json_encode(['code' => $result['code'], 'msg' => $result['msg'], 'data' => []]);
        }
        return json_encode(['code' => 200, 'msg' => '发布成功', 'data' => []]);
    }


    /**
     * 创建知识库
     * @param $data
     * @return false|string|\think\response\Json
     */
    public function createKnowledge($data = [])
    {

        $space_id = Env::get('cozeAi.space_id');
        $name = !empty($data['name']) ? $data['name'] : '';
        if (empty($space_id) || empty($name)) {
            return json_encode(['code' => 500, 'msg' => '参数缺失']);
        }

        $params = [
            'space_id' => $space_id,
            'format_type' => 0,
            'name' => $name,
        ];
        $result = requestCurl($this->apiUrl . '/v1/datasets', $params, 'POST', $this->headers, 'json');
        $result = json_decode($result, true);

        if ($result['code'] != 0) {
            return json_encode(['code' => $result['code'], 'msg' => $result['msg'], 'data' => []]);
        }
        return json_encode(['code' => 200, 'msg' => '创建成功','data' => $result['data']]);
    }


    public function createDocument($data = [])
    {
        // 文件路径
        $filePath = !empty($data['filePath']) ? $data['filePath'] : '';
        $fileName = !empty($data['fileName']) ? $data['fileName'] : '';
        if (empty($filePath)) {
            return json_encode(['code' => 500, 'msg' => '参数缺失']);
        }
        // 读取文件内容
        $fileContent = file_get_contents($filePath);
        // 将文件内容编码为Base64
        $base64EncodedContent = base64_encode($fileContent);


        $dataset_id = !empty($data['dataset_id']) ? $data['dataset_id'] : '';

        $document_bases = [
             ['name' => $fileName,'source_info' => ['file_base64' => $base64EncodedContent]]
        ];

        $chunk_strategy = [
            'chunk_type' => 0,
            'remove_extra_spaces' => true
        ];
        $params = [
            'dataset_id' => (string) $dataset_id,
            'document_bases' => $document_bases,
            'chunk_strategy' => (object) $chunk_strategy,
            'format_type' => 0
        ];
        $headers = array_merge($this->headers, ['Agw-Js-Conv: str']);
        $result = requestCurl($this->apiUrl . '/open_api/knowledge/document/create', $params, 'POST', $headers, 'json');
        $result = json_decode($result, true);
        if ($result['code'] != 0) {
            return json_encode(['code' => $result['code'], 'msg' => $result['msg'], 'data' => []]);
        }
        return json_encode(['code' => 200, 'msg' => '创建成功','data' => $result['document_infos']]);
    }


    /**
     * 删除知识库文件
     * @param $data
     * @return false|string|\think\response\Json
     */
    public function deleteDocument($data = [])
    {
        if (empty($data)) {
            return json_encode(['code' => 500, 'msg' => '参数缺失']);
        }
        $params = [
            'document_ids' => $data,
        ];
        $headers = array_merge($this->headers, ['Agw-Js-Conv: str']);
        $result = requestCurl($this->apiUrl . '/open_api/knowledge/document/delete', $params, 'POST', $headers, 'json');
        $result = json_decode($result, true);
        if ($result['code'] != 0) {
            return json_encode(['code' => $result['code'], 'msg' => $result['msg'], 'data' => []]);
        }
        return json_encode(['code' => 200, 'msg' => '删除成功', 'data' => []]);

    }


    /**
     * 创建会话
     * @param $data
     * @return false|string|\think\response\Json
     */
    public function createConversation($data = [])
    {
        $bot_id = !empty($data['bot_id']) ? $data['bot_id'] : '';
        $name = !empty($data['name']) ? $data['name'] : '';
        $meta_data = !empty($data['meta_data']) ? $data['meta_data'] : [];

        if (empty($bot_id) || empty($name)) {
            return json_encode(['code' => 500, 'msg' => '参数缺失']);
        }
        $params = [
            'bot_id' => $bot_id,
            'name' => $name,
        ];
        if (!empty($meta_data)){
            $params['meta_data'] = $meta_data;
        }
        $result = requestCurl($this->apiUrl . '/v1/conversation/create', $params, 'POST', $this->headers, 'json');
        $result = json_decode($result, true);
        if ($result['code'] != 0) {
            return json_encode(['code' => $result['code'], 'msg' => $result['msg'], 'data' => []]);
        }
        return json_encode(['code' => 200, 'msg' => '创建成功','data' => $result['data']]);
    }


    /**
     * 开始对话
     * @param $data
     * @return false|string|\think\response\Json
     */
    public function createChat($data = [])
    {
        try {
            $bot_id = !empty($data['bot_id']) ? $data['bot_id'] : '';
            $uid = !empty($data['uid']) ? $data['uid'] : '';
            $conversation_id = !empty($data['conversation_id']) ? $data['conversation_id'] : '';
            $question = !empty($data['question']) ? $data['question'] : [];


            if(empty($bot_id)){
                return json_encode(['code' => 500, 'msg' => '智能体ID不能为空', 'data' => []]);
            }

            if(empty($conversation_id)){
                return json_encode(['code' => 500, 'msg' => '会话ID不能为空', 'data' => []]);
            }

            if(empty($question)){
                return json_encode(['code' => 500, 'msg' => '问题不能为空', 'data' => []]);
            }

            // 构建请求数据
            $params = [
                'bot_id' => strval($bot_id),
                'user_id' => strval($uid),
                'additional_messages' => $question,
                'stream' => false,
                'auto_save_history' => true
            ];

            $url = $this->apiUrl . '/v3/chat?conversation_id='.$conversation_id;
            $result = requestCurl($url, $params, 'POST', $this->headers, 'json');
            $result = json_decode($result, true);
            if ($result['code'] != 0) {
                return json_encode(['code' => $result['code'], 'msg' => $result['msg'], 'data' => []]);
            }
            return json_encode(['code' => 200, 'msg' => '发送成功','data' => $result['data']]);

        } catch (\Exception $e) {
            return json_encode(['code' => 500, 'msg' => '创建对话失败：' . $e->getMessage(), 'data' => []]);
        }
    }


    /**
     * 查看对话详情
     * @param $data
     * @return false|string|\think\response\Json
     */
    public function getConversationChat($data = [])
    {
        $conversation_id = !empty($data['conversation_id']) ? $data['conversation_id'] : '';
        $chat_id = !empty($data['chat_id']) ? $data['chat_id'] : '';
        $url = $this->apiUrl . '/v3/chat/retrieve?conversation_id='.$conversation_id.'&chat_id='.$chat_id;
        $result = requestCurl($url, [], 'GET', $this->headers, 'json');
        $result = json_decode($result, true);
        if ($result['code'] != 0) {
            return json_encode(['code' => $result['code'], 'msg' => $result['msg'], 'data' => []]);
        }
        return json_encode(['code' => 200, 'msg' => '获取成功','data' => $result['data']]);
    }


    /**
     * 查看对话消息详情
     * @param $data
     * @return false|string|\think\response\Json
     */
    public function listConversationMessage($data = [])
    {
        $conversation_id = !empty($data['conversation_id']) ? $data['conversation_id'] : '';
        $chat_id = !empty($data['chat_id']) ? $data['chat_id'] : '';
        $url = $this->apiUrl . '/v3/chat/message/list?conversation_id='.$conversation_id.'&chat_id='.$chat_id;
        $result = requestCurl($url, [], 'GET', $this->headers, 'json');
        $result = json_decode($result, true);
        if ($result['code'] != 0) {
            return json_encode(['code' => $result['code'], 'msg' => $result['msg'], 'data' => []]);
        }
        return json_encode(['code' => 200, 'msg' => '获取成功','data' => $result['data']]);
    }


    /**
     * 取消进行中的对话
     * @param $data
     * @return false|string|\think\response\Json
     */
    public function cancelConversationChat($data = [])
    {
        $conversation_id = !empty($data['conversation_id']) ? $data['conversation_id'] : '';
        $chat_id = !empty($data['chat_id']) ? $data['chat_id'] : '';

        // 构建请求数据
        $params = [
            'conversation_id' => (string) $conversation_id,
            'chat_id' => (string) $chat_id
        ];

        $url = $this->apiUrl . '/v3/chat/cancel';
        $result = requestCurl($url, $params, 'POST', $this->headers, 'json');
        $result = json_decode($result, true);
        if ($result['code'] != 0) {
            return json_encode(['code' => $result['code'], 'msg' => $result['msg'], 'data' => []]);
        }
        return json_encode(['code' => 200, 'msg' => '取消成功', 'data' => []]);
    }

}