<?php

namespace app\chukebao\controller;

use app\ai\controller\CozeAI;
use app\ai\controller\DouBaoAI;
use app\api\model\WechatFriendModel;
use app\chukebao\controller\TokensRecordController as tokensRecord;
use app\chukebao\model\AiSettings;
use app\chukebao\model\FriendSettings;
use app\chukebao\model\TokensCompany;
use library\ResponseHelper;
use think\Db;
use think\facade\Cache;
use think\facade\Log;


/**
 * AI聊天控制器
 * 负责处理与好友的AI对话功能
 */
class AiChatController extends BaseController
{
    // 对话状态常量
    const STATUS_CREATED = 'created';           // 对话已创建
    const STATUS_IN_PROGRESS = 'in_progress';   // 智能体正在处理中
    const STATUS_COMPLETED = 'completed';       // 智能体已完成处理
    const STATUS_FAILED = 'failed';             // 对话失败
    const STATUS_REQUIRES_ACTION = 'requires_action'; // 对话中断，需要进一步处理
    const STATUS_CANCELED = 'canceled';         // 对话已取消

    // 轮询配置
    const MAX_RETRY_TIMES = 1000;    // 最大重试次数
    const RETRY_INTERVAL = 500000;  // 重试间隔（微秒，即500毫秒）
    
    // 并发控制
    const CACHE_EXPIRE = 30;       // 缓存过期时间（秒）
    
    // 请求唯一标识符
    private $requestKey = '';
    private $requestId = '';
    private $currentStep = 0;

    /**
     * AI聊天主入口
     * 
     * @return \think\response\Json
     */
    public function index()
    {
        try {
            // 1. 参数验证和初始化
            $params = $this->validateAndInitParams();
            
            if ($params === false) {
                return ResponseHelper::error('参数验证失败');
            }
            
            // 并发控制：检查并处理同一用户的重复请求
            $this->requestKey = "aichat_{$params['friendId']}_{$params['wechatAccountId']}";
            $this->requestId = uniqid('req_', true);
            
            $concurrentCheck = $this->handleConcurrentRequest($params);
            if ($concurrentCheck !== true) {
                return $concurrentCheck; // 返回错误响应
            }
            
            $this->currentStep = 1;

            // 2. 验证Tokens余额
            $this->updateRequestStep(2);
            if ($this->isRequestCanceled()) {
                return ResponseHelper::error('该好友有新的AI对话请求正在处理中，当前请求已被取消');
            }
            $hasBalance = $this->checkTokensBalance($params['companyId']);
            
            if (!$hasBalance) {
                $this->clearRequestCache();
                return ResponseHelper::error('Tokens余额不足，请充值后再试');
            }

            // 3. 获取AI配置
            $this->updateRequestStep(3);
            if ($this->isRequestCanceled()) {
                return ResponseHelper::error('该好友有新的AI对话请求正在处理中，当前请求已被取消');
            }
            $setting = $this->getAiSettings($params['companyId']);
            
            if (!$setting) {
                $this->clearRequestCache();
                return ResponseHelper::error('未找到AI配置信息，请先配置AI策略');
            }

            // 4. 获取好友AI设置
            $this->updateRequestStep(4);
            if ($this->isRequestCanceled()) {
                return ResponseHelper::error('该好友有新的AI对话请求正在处理中，当前请求已被取消');
            }
            $friendSettings = $this->getFriendSettings($params['companyId'], $params['friendId']);
            
            if (!$friendSettings) {
                $this->clearRequestCache();
                return ResponseHelper::error('该好友未配置或未开启AI功能');
            }

            // 5. 确保会话存在
            $this->updateRequestStep(5);
            if ($this->isRequestCanceled()) {
                return ResponseHelper::error('该好友有新的AI对话请求正在处理中，当前请求已被取消');
            }
            $conversationId = $this->ensureConversation($friendSettings, $setting, $params);

            if (empty($conversationId)) {
                $this->clearRequestCache();
                return ResponseHelper::error('创建会话失败');
            }

            // 6. 获取历史消息
            $this->updateRequestStep(6);
            if ($this->isRequestCanceled()) {
                return ResponseHelper::error('该好友有新的AI对话请求正在处理中，当前请求已被取消');
            }
            $msgData = $this->getHistoryMessages($params['friendId'], $friendSettings);

            // 7. 创建AI对话（从这步开始需要保存对话ID以便取消）
            $this->updateRequestStep(7);
            if ($this->isRequestCanceled($conversationId, null)) {
                return ResponseHelper::error('该好友有新的AI对话请求正在处理中，当前请求已被取消');
            }
            $chatId = $this->createAiChat($setting, $friendSettings, $msgData);

            if (empty($chatId)) {
                $this->clearRequestCache();
                return ResponseHelper::error('创建对话失败');
            }
            
            // 保存对话ID到缓存，以便新请求可以取消
            $this->updateRequestStep(7, $conversationId, $chatId);

            // 8. 等待AI处理完成（轮询）
            $this->updateRequestStep(8, $conversationId, $chatId);
            if ($this->isRequestCanceled($conversationId, $chatId)) {
                return ResponseHelper::error('该好友有新的AI对话请求正在处理中，当前请求已被取消');
            }
            $chatResult = $this->waitForChatCompletion($conversationId, $chatId);
            
            if (!$chatResult['success']) {
                $this->clearRequestCache();
                return ResponseHelper::error($chatResult['error']);
            }
            
            $chatResult = $chatResult['data'];

            // 9. 扣除Tokens
            $this->updateRequestStep(9, $conversationId, $chatId);
            if ($this->isRequestCanceled($conversationId, $chatId)) {
                return ResponseHelper::error('该好友有新的AI对话请求正在处理中，当前请求已被取消');
            }
            $this->consumeTokens($chatResult, $params, $friendSettings);

            // 10. 获取对话消息
            $this->updateRequestStep(10, $conversationId, $chatId);
            if ($this->isRequestCanceled($conversationId, $chatId)) {
                return ResponseHelper::error('该好友有新的AI对话请求正在处理中，当前请求已被取消');
            }
            $messages = $this->getChatMessages($conversationId, $chatId);
            
            if (!$messages) {
                return ResponseHelper::error('获取对话消息失败');
            }
            
            // 筛选type为answer的消息（AI回复的内容）
            $answerContent = '';
            foreach ($messages as $msg) {
                if (isset($msg['type']) && $msg['type'] === 'answer') {
                    $answerContent = $msg['content'] ?? '';
                    break;
                }
            }
            
            if (empty($answerContent)) {
                Log::warning('未找到AI回复内容，messages: ' . json_encode($messages));
                return ResponseHelper::error('未获取到AI回复内容');
            }
            
            // 清理请求缓存
            $this->clearRequestCache();
            
            // 返回结果
            return ResponseHelper::success(['content' => $answerContent], '对话成功');
            
        } catch (\Exception $e) {
            Log::error('AI聊天异常：' . $e->getMessage());
            
            // 清理请求缓存
            $this->clearRequestCache();
            
            return ResponseHelper::error('系统异常：' . $e->getMessage());
        }
    }

    /**
     * 取消AI对话
     * 取消当前正在进行的AI对话请求
     * 
     * @return \think\response\Json
     */
    public function cancel()
    {
        try {
            // 获取参数
            $friendId = $this->request->param('friendId', '');
            $wechatAccountId = $this->request->param('wechatAccountId', '');
            
            if (empty($wechatAccountId) || empty($friendId)) {
                return ResponseHelper::error('参数缺失');
            }
            
            // 生成缓存键
            $requestKey = "aichat_{$friendId}_{$wechatAccountId}";
            
            // 获取缓存数据
            $cacheData = Cache::get($requestKey);
            
            if (!$cacheData) {
                return ResponseHelper::error('当前没有正在进行的AI对话');
            }
            
            $requestId = $cacheData['request_id'] ?? '';
            $step = $cacheData['step'] ?? 0;
            $conversationId = $cacheData['conversation_id'] ?? '';
            $chatId = $cacheData['chat_id'] ?? '';
            
            Log::info("手动取消AI对话 - 请求ID: {$requestId}, 步骤: {$step}");
            
            // 如果已经到达步骤7或之后，需要调用取消API
            if ($step >= 7 && !empty($conversationId) && !empty($chatId)) {
                try {
                    $cozeAI = new CozeAI();
                    $cancelResult = $cozeAI->cancelConversationChat([
                        'conversation_id' => $conversationId,
                        'chat_id' => $chatId,
                    ]);
                    
                    $result = json_decode($cancelResult, true);
                    if ($result['code'] != 200) {
                        Log::error("调用取消API失败 - conversation_id: {$conversationId}, chat_id: {$chatId}, 错误: " . ($result['msg'] ?? '未知错误'));
                    } else {
                        Log::info("成功调用取消API - conversation_id: {$conversationId}, chat_id: {$chatId}");
                    }
                } catch (\Exception $e) {
                    Log::error("调用取消API异常：" . $e->getMessage());
                }
            }
            
            // 清理缓存
            Cache::rm($requestKey);
            Log::info("已清理AI对话缓存 - 请求ID: {$requestId}");
            
            return ResponseHelper::success([
                'canceled_request_id' => $requestId,
                'step' => $step
            ], 'AI对话已取消');
            
        } catch (\Exception $e) {
            Log::error('取消AI对话异常：' . $e->getMessage());
            return ResponseHelper::error('系统异常：' . $e->getMessage());
        }
    }

    /**
     * 验证和初始化参数
     * 
     * @return array|false
     */
    private function validateAndInitParams()
    {
        $userId = $this->getUserInfo('id');
        $companyId = $this->getUserInfo('companyId');
        $friendId = $this->request->param('friendId', '');
        $wechatAccountId = $this->request->param('wechatAccountId', '');

        if (empty($wechatAccountId) || empty($friendId)) {
            return false;
        }

        return [
            'userId' => $userId,
            'companyId' => $companyId,
            'friendId' => $friendId,
            'wechatAccountId' => $wechatAccountId
        ];
    }

    /**
     * 检查Tokens余额
     * 
     * @param int $companyId 公司ID
     * @return bool
     */
    private function checkTokensBalance($companyId)
    {
        $tokens = TokensCompany::where(['companyId' => $companyId])->value('tokens');
        return !empty($tokens) && $tokens > 1000;
    }

    /**
     * 获取AI配置
     * 
     * @param int $companyId 公司ID
     * @return AiSettings|null
     */
    private function getAiSettings($companyId)
    {
        return AiSettings::where(['companyId' => $companyId])->find();
    }

    /**
     * 获取好友AI设置
     * 
     * @param int $companyId 公司ID
     * @param string $friendId 好友ID
     * @return FriendSettings|null
     */
    private function getFriendSettings($companyId, $friendId)
    {
        $friendSettings = FriendSettings::where([
            'companyId' => $companyId,
            'friendId' => $friendId
        ])->find();

        if (empty($friendSettings) || $friendSettings->type == 0) {
            return null;
        }

        return $friendSettings;
    }

    /**
     * 确保会话存在
     * 
     * @param FriendSettings $friendSettings 好友设置
     * @param AiSettings $setting AI设置
     * @param array $params 参数
     * @return string|null 会话ID
     */
    private function ensureConversation($friendSettings, $setting, $params)
    {
        if (!empty($friendSettings->conversationId)) {
            return $friendSettings->conversationId;
        }

        // 创建新会话
        $cozeAI = new CozeAI();
        $data = [
            'bot_id' => $setting->botId,
            'name' => '与好友' . $params['friendId'] . '的对话',
            'meta_data' => [
                'friendId' => (string)$friendSettings->friendId,
                'wechatAccountId' => (string)$params['wechatAccountId'],
            ],
        ];

        $res = $cozeAI->createConversation($data);
        $res = json_decode($res, true);

        if ($res['code'] != 200) {
            Log::error('创建会话失败：' . ($res['msg'] ?? '未知错误'));
            return null;
        }

        // 保存会话ID
        $conversationId = $res['data']['id'];
        $friendSettings->conversationId = $conversationId;
        $friendSettings->conversationTime = time();
        $friendSettings->save();
        return $conversationId;
    }

    /**
     * 获取历史消息
     * 
     * @param string $friendId 好友ID
     * @param FriendSettings $friendSettings 好友设置
     * @return array
     */
    private function getHistoryMessages($friendId, $friendSettings)
    {
        $msgData = [];

        // 会话创建时间小于1分钟，加载最近10条消息
        if ($friendSettings->conversationTime >= time() - 60) {
            $messages = Db::table('s2_wechat_message')
                ->where('wechatFriendId', $friendId)
                ->where('msgType', '<', 50)
                ->order('wechatTime desc')
                ->field('id,content,msgType,isSend,wechatTime')
                ->limit(10)
                ->select();

            // 按时间正序排列
            usort($messages, function ($a, $b) {
                return $a['wechatTime'] <=> $b['wechatTime'];
            });

            // 处理聊天数据
            foreach ($messages as $val) {
                if (empty($val['content'])) {
                    continue;
                }

                $msg = [
                    'role' => empty($val['isSend']) ? 'user' : 'assistant',
                    'content' => $val['content'],
                    'type' => empty($val['isSend']) ? 'question' : 'answer',
                    'content_type' => 'text'
                ];
                $msgData[] = $msg;
            }
        } else {
            // 只加载最新一条用户消息
            $message = Db::table('s2_wechat_message')
                ->where('wechatFriendId', $friendId)
                ->where('msgType', '<', 50)
                ->where('isSend', 0)
                ->order('wechatTime desc')
                ->field('id,content,msgType,isSend,wechatTime')
                ->find();

            if (!empty($message) && !empty($message['content'])) {
                $msgData[] = [
                    'role' => 'user',
                    'content' => $message['content'],
                    'type' => 'question',
                    'content_type' => 'text'
                ];
            }
        }

        return $msgData;
    }

    /**
     * 创建AI对话
     * 
     * @param AiSettings $setting AI设置
     * @param FriendSettings $friendSettings 好友设置
     * @param array $msgData 消息数据
     * @return string|null 对话ID
     */
    private function createAiChat($setting, $friendSettings, $msgData)
    {
        $cozeAI = new CozeAI();
        $data = [
            'bot_id' => $setting->botId,
            'uid' => $friendSettings->friendId,
            'conversation_id' => $friendSettings->conversationId,
            'question' => $msgData,
        ];

        $res = $cozeAI->createChat($data);
        $res = json_decode($res, true);

        if ($res['code'] != 200) {
            Log::error('创建对话失败：' . ($res['msg'] ?? '未知错误'));
            return null;
        }

        return $res['data']['id'];
    }

    /**
     * 等待AI处理完成（轮询机制）
     * 
     * @param string $conversationId 会话ID
     * @param string $chatId 对话ID
     * @return array ['success' => bool, 'data' => array|null, 'error' => string]
     */
    private function waitForChatCompletion($conversationId, $chatId)
    {
        $cozeAI = new CozeAI();
        $retryCount = 0;

        while ($retryCount < self::MAX_RETRY_TIMES) {
            // 获取对话状态
            $res = $cozeAI->getConversationChat([
                'conversation_id' => $conversationId,
                'chat_id' => $chatId,
            ]);
            $res = json_decode($res, true);

            if ($res['code'] != 200) {
                $errorMsg = 'AI接口调用失败：' . ($res['msg'] ?? '未知错误');
                Log::error($errorMsg);
                return ['success' => false, 'data' => null, 'error' => $errorMsg];
            }

            $status = $res['data']['status'] ?? '';

            // 处理不同的状态
            switch ($status) {
                case self::STATUS_COMPLETED:
                    // 对话完成，返回结果
                    return ['success' => true, 'data' => $res['data'], 'error' => ''];

                case self::STATUS_IN_PROGRESS:
                case self::STATUS_CREATED:
                    // 继续等待
                    $retryCount++;
                    usleep(self::RETRY_INTERVAL);
                    break;

                case self::STATUS_FAILED:
                    $errorMsg = 'AI对话处理失败';
                    Log::error($errorMsg . '，chat_id: ' . $chatId);
                    return ['success' => false, 'data' => null, 'error' => $errorMsg];

                case self::STATUS_CANCELED:
                    $errorMsg = 'AI对话已被取消';
                    Log::error($errorMsg . '，chat_id: ' . $chatId);
                    return ['success' => false, 'data' => null, 'error' => $errorMsg];

                case self::STATUS_REQUIRES_ACTION:
                    $errorMsg = 'AI对话需要进一步处理';
                    Log::warning($errorMsg . '，chat_id: ' . $chatId);
                    return ['success' => false, 'data' => null, 'error' => $errorMsg];

                default:
                    $errorMsg = 'AI返回未知状态：' . $status;
                    Log::error($errorMsg);
                    return ['success' => false, 'data' => null, 'error' => $errorMsg];
            }
        }

        // 超时
        $errorMsg = 'AI对话处理超时，已等待' . (self::MAX_RETRY_TIMES * self::RETRY_INTERVAL / 1000000) . '秒';
        Log::error($errorMsg . '，chat_id: ' . $chatId);
        return ['success' => false, 'data' => null, 'error' => $errorMsg];
    }

    /**
     * 扣除Tokens
     * 
     * @param array $chatResult 对话结果
     * @param array $params 参数
     * @param FriendSettings $friendSettings 好友设置
     */
    private function consumeTokens($chatResult, $params, $friendSettings)
    {
        $tokenCount = $chatResult['usage']['token_count'] ?? 0;
        
        if (empty($tokenCount)) {
            return;
        }

        // 获取好友昵称
        $nickname = WechatFriendModel::where('id', $friendSettings->friendId)->value('nickname');
        $remarks = !empty($nickname) ? '与好友【' . $nickname . '】聊天' : '与好友聊天';

        // 扣除Tokens
        $tokensRecord = new tokensRecord();
        $data = [
            'tokens' => $tokenCount * 20,
            'type' => 0,
            'form' => 13,
            'wechatAccountId' => $params['wechatAccountId'],
            'friendIdOrGroupId' => $params['friendId'],
            'remarks' => $remarks,
        ];
        
        $tokensRecord->consumeTokens($data);
    }

    /**
     * 获取对话消息
     * 
     * @param string $conversationId 会话ID
     * @param string $chatId 对话ID
     * @return array|null
     */
    private function getChatMessages($conversationId, $chatId)
    {
        $cozeAI = new CozeAI();
        $res = $cozeAI->listConversationMessage([
            'conversation_id' => $conversationId,
            'chat_id' => $chatId,
        ]);
        $res = json_decode($res, true);

        if ($res['code'] != 200) {
            Log::error('获取对话消息失败：' . ($res['msg'] ?? '未知错误'));
            return null;
        }

        return $res['data'] ?? [];
    }

    /**
     * 处理并发请求
     * 检查是否有同一用户的旧请求正在处理，如果有则取消旧请求
     * 
     * @param array $params 请求参数
     * @return true|\think\response\Json true表示可以继续，否则返回错误响应
     */
    private function handleConcurrentRequest($params)
    {
        $cacheData = Cache::get($this->requestKey);
        
        if ($cacheData) {
            // 有旧请求正在处理
            $oldRequestId = $cacheData['request_id'] ?? '';
            $oldStep = $cacheData['step'] ?? 0;
            $oldConversationId = $cacheData['conversation_id'] ?? '';
            $oldChatId = $cacheData['chat_id'] ?? '';
            
            Log::info("检测到并发请求 - 旧请求: {$oldRequestId} (步骤{$oldStep}), 新请求: {$this->requestId}");
            
            // 如果旧请求已经到达步骤7或之后，需要调用取消API
            if ($oldStep >= 7 && !empty($oldConversationId) && !empty($oldChatId)) {
                try {
                    $cozeAI = new CozeAI();
                    $cancelResult = $cozeAI->cancelConversationChat([
                        'conversation_id' => $oldConversationId,
                        'chat_id' => $oldChatId,
                    ]);
                    Log::info("已调用取消API取消旧请求的对话 - conversation_id: {$oldConversationId}, chat_id: {$oldChatId}");
                } catch (\Exception $e) {
                    Log::error("取消旧请求对话失败：" . $e->getMessage());
                }
            }
            
            // 标记旧请求为已取消（通过更新缓存的 canceled 标志）
            $cacheData['canceled'] = true;
            $cacheData['canceled_by'] = $this->requestId;
            Cache::set($this->requestKey, $cacheData, self::CACHE_EXPIRE);
        }
        
        // 设置当前请求为活动请求
        $newCacheData = [
            'request_id' => $this->requestId,
            'step' => 1,
            'start_time' => time(),
            'canceled' => false,
            'conversation_id' => '',
            'chat_id' => '',
        ];
        Cache::set($this->requestKey, $newCacheData, self::CACHE_EXPIRE);
        
        return true;
    }

    /**
     * 检查当前请求是否被新请求取消
     * 
     * @param string $conversationId 会话ID（可选，用于取消对话）
     * @param string $chatId 对话ID（可选，用于取消对话）
     * @return bool
     */
    private function isRequestCanceled($conversationId = '', $chatId = '')
    {
        $cacheData = Cache::get($this->requestKey);
        
        if (!$cacheData) {
            // 缓存不存在，说明被清理或过期，视为被取消
            return true;
        }
        
        $currentRequestId = $cacheData['request_id'] ?? '';
        $isCanceled = $cacheData['canceled'] ?? false;
        
        // 如果缓存中的请求ID与当前请求ID不一致，或者被标记为取消
        if ($currentRequestId !== $this->requestId || $isCanceled) {
            Log::info("当前请求已被取消 - 请求ID: {$this->requestId}, 缓存请求ID: {$currentRequestId}, 取消标志: " . ($isCanceled ? 'true' : 'false'));
            
            // 如果提供了对话ID，尝试取消对话
            if (!empty($conversationId) && !empty($chatId) && $this->currentStep >= 7) {
                try {
                    $cozeAI = new CozeAI();
                    $cancelResult = $cozeAI->cancelConversationChat([
                        'conversation_id' => $conversationId,
                        'chat_id' => $chatId,
                    ]);
                    Log::info("已取消当前请求的对话 - conversation_id: {$conversationId}, chat_id: {$chatId}");
                } catch (\Exception $e) {
                    Log::error("取消当前请求对话失败：" . $e->getMessage());
                }
            }
            
            return true;
        }
        
        return false;
    }

    /**
     * 更新请求步骤
     * 
     * @param int $step 当前步骤
     * @param string $conversationId 会话ID（可选）
     * @param string $chatId 对话ID（可选）
     */
    private function updateRequestStep($step, $conversationId = '', $chatId = '')
    {
        $this->currentStep = $step;
        
        $cacheData = Cache::get($this->requestKey);
        
        if ($cacheData && $cacheData['request_id'] === $this->requestId) {
            $cacheData['step'] = $step;
            $cacheData['update_time'] = time();
            
            if (!empty($conversationId)) {
                $cacheData['conversation_id'] = $conversationId;
            }
            if (!empty($chatId)) {
                $cacheData['chat_id'] = $chatId;
            }
            
            Cache::set($this->requestKey, $cacheData, self::CACHE_EXPIRE);
        }
    }

    /**
     * 清理请求缓存
     */
    private function clearRequestCache()
    {
        if (!empty($this->requestKey)) {
            $cacheData = Cache::get($this->requestKey);
            
            // 只有当前请求才能清理自己的缓存
            if ($cacheData && isset($cacheData['request_id']) && $cacheData['request_id'] === $this->requestId) {
                Cache::rm($this->requestKey);
                Log::info("已清理请求缓存 - 请求ID: {$this->requestId}");
            }
        }
    }


    public function index2222()
    {
        $userId = $this->getUserInfo('id');
        $companyId = $this->getUserInfo('companyId');
        $friendId = $this->request->param('friendId', '');
        $wechatAccountId = $this->request->param('wechatAccountId', '');
        $content = $this->request->param('content', '');

        if (empty($wechatAccountId) || empty($friendId)) {
            return ResponseHelper::error('参数缺失');
        }

        $tokens = TokensCompany::where(['companyId' => $companyId])->value('tokens');
        if (empty($tokens) || $tokens <= 0) {
            return ResponseHelper::error('用户Tokens余额不足');
        }


        //读取AI配置
        $setting = Db::name('ai_settings')->where(['companyId' => $companyId, 'userId' => $userId])->find();
        if (empty($setting)) {
            return ResponseHelper::error('未找到配置信息，请先配置AI策略');
        }
        $config = json_decode($setting['config'], true);
        $modelSetting = $config['modelSetting'];
        $round = isset($config['round']) ? $config['round'] : 10;


        // 导出聊天
        $messages = Db::table('s2_wechat_message')
            ->where('wechatFriendId', $friendId)
            ->order('wechatTime desc')
            ->field('id,content,msgType,isSend,wechatTime')
            ->limit($round)
            ->select();

        usort($messages, function ($a, $b) {
            return $a['wechatTime'] <=> $b['wechatTime'];
        });

        //处理聊天数据
        $msg = [];
        foreach ($messages as $val) {
            if (empty($val['content'])) {
                continue;
            }
            if (!empty($val['isSend'])) {
                $msg[] = '客服：' . $val['content'];
            } else {
                $msg[] = '用户：' . $val['content'];
            }
        }
        $content = implode("\n", $msg);


        $params = [
            'model' => 'doubao-1-5-pro-32k-250115',
            'messages' => [
                // ['role' => 'system', 'content' => '请完成跟客户的对话'],
                ['role' => 'system', 'content' => '角色设定：' . $modelSetting['role']],
                ['role' => 'system', 'content' => '公司背景：' . $modelSetting['businessBackground']],
                ['role' => 'system', 'content' => '对话风格：' . $modelSetting['dialogueStyle']],
                ['role' => 'user', 'content' => $content],
            ],
        ];

        //AI处理
        $ai = new DouBaoAI();
        $res = $ai->text($params);
        $res = json_decode($res, true);

        if ($res['code'] == 200) {
            //扣除Tokens
            $tokensRecord = new  tokensRecord();
            $nickname = Db::table('s2_wechat_friend')->where(['id' => $friendId])->value('nickname');
            $remarks = !empty($nickname) ? '与好友【' . $nickname . '】聊天' : '与好友聊天';
            $data = [
                'tokens' => $res['data']['token'],
                'type' => 0,
                'form' => 13,
                'wechatAccountId' => $wechatAccountId,
                'friendIdOrGroupId' => $friendId,
                'remarks' => $remarks,
            ];
            $tokensRecord->consumeTokens($data);
            return ResponseHelper::success($res['data']['content']);
        } else {
            return ResponseHelper::error($res['msg']);
        }


    }
}