<?php

namespace app\cozeai\controller;

use app\cozeai\model\Conversation as ConversationModel;
use app\cozeai\model\Message as MessageModel;
use think\facade\Env;

/**
 * Coze AI 消息控制器
 */
class MessageController extends BaseController
{
    /**
     * 获取用户与AI的对话记录
     */
    public function getMessages()
    {
        return successJson([], '获取成功');
        try {
            // 获取用户信息
            $userInfo = request()->userInfo;
            $uid = $userInfo['id'];
            $companyId = $userInfo['companyId'];

            // 获取会话ID
            $conversation_id = input('conversation_id', '');
            
            // 如果没有传入会话ID，则查询用户最新的会话
            if (empty($conversation_id)) {
                // 查询用户是否有会话记录
                $conversation = ConversationModel::where([
                    ['userId', '=', $uid],
                    ['companyId', '=', $companyId]
                ])->order('create_time', 'desc')->find();

                // 如果没有会话记录，创建新会话
                if (empty($conversation)) {
                    $conversationController = new ConversationController();
                    $result = $conversationController->create(true);
                    $resultData = json_decode($result, true);
                    if ($resultData['code'] != 200) {
                        return errorJson('创建会话失败：' . $resultData['msg']);
                    }
                    $conversation_id = $resultData['data']['id'];
                } else {
                    $conversation_id = $conversation['conversation_id'];
                }
            } else {
                // 验证会话是否属于当前用户
                $conversation = ConversationModel::where([
                    ['conversation_id', '=', $conversation_id],
                    ['userId', '=', $uid],
                    ['companyId', '=', $companyId]
                ])->find();

                if (empty($conversation)) {
                    return errorJson('会话不存在或无权访问');
                }
            }



            // 分页参数
            $page = input('page', 1);
            $limit = input('limit', 20);

            // 查询消息记录
            $messages = MessageModel::where('conversation_id', $conversation_id)
                ->order('id', 'DESC')
                ->page($page, $limit)
                ->select()
                ->each(function($item) {
                    // 格式化时间显示
                    $timestamp = $item['created_at'];
                    $today = strtotime(date('Y-m-d'));
                    $yesterday = strtotime('-1 day', $today);
                    $thisYear = strtotime(date('Y-01-01'));

                    if($timestamp >= $today) {
                        $item['show_time'] = date('H:i', $timestamp);
                    } elseif($timestamp >= $yesterday) {
                        $item['show_time'] = '昨天 ' . date('H:i', $timestamp);
                    } elseif($timestamp >= $thisYear) {
                        $item['show_time'] = date('m-d H:i', $timestamp);
                    } else {
                        $item['show_time'] = date('Y-m-d H:i', $timestamp);
                    }

                    // 根据role设置type
                    if ($item['role'] == 'assistant') {
                        $item['type'] = 'assistant';
                    } else {
                        $item['type'] = 'user';
                    }
                    unset($item['role']);
                    
                    return $item;
                });

            // 对消息进行倒序处理
            $messages = array_reverse($messages->toArray());

            // 获取总记录数
            $total = MessageModel::where('conversation_id', $conversation_id)->count();

            $data = [
                'list' => $messages,
                'total' => $total,
                'conversation_id' => $conversation_id
            ];

            return successJson($data, '获取成功');
            
        } catch (\Exception $e) {
            return errorJson('获取对话记录失败：' . $e->getMessage());
        }
    }
}