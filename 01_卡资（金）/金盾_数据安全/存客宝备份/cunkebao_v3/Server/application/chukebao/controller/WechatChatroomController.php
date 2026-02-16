<?php

namespace app\chukebao\controller;

use app\ai\controller\DouBaoAI;
use app\chukebao\controller\TokensRecordController as tokensRecord;
use app\chukebao\model\TokensCompany;
use library\ResponseHelper;
use think\Db;

class WechatChatroomController extends BaseController
{

    public function getList(){
        $page = $this->request->param('page', 1);
        $limit =  $this->request->param('limit', 10);
        $keyword = $this->request->param('keyword', '');
        $groupIds = $this->request->param('groupId', '');
        $ownerWechatId = $this->request->param('ownerWechatId', '');
        $accountId = $this->getUserInfo('s2_accountId');
        if (empty($accountId)){
            return ResponseHelper::error('请先登录');
        }
        $query = Db::table('s2_wechat_chatroom')
            ->where(['accountId' => $accountId,'isDeleted' => 0]);

        // 关键字搜索：群昵称、微信号（这里使用chatroomId作为群标识）
        if ($keyword !== '' && $keyword !== null) {
            $query->where(function ($q) use ($keyword) {
                $like = '%' . $keyword . '%';
                $q->whereLike('nickname', $like)
                    ->whereOr('conRemark', 'like', $like);
            });
        }

        // 分组筛选：groupIds（单个分组ID）
        if ($groupIds !== '' && $groupIds !== null) {
            $query->where('groupIds', $groupIds);
        }

        if (!empty($ownerWechatId)) {
            $query->where('ownerWechatId', $ownerWechatId);
        }

        $query->order('id desc');
        $total = $query->count();
        $list = $query->page($page, $limit)->select();



        // 提取所有聊天室ID，用于批量查询
        $chatroomIds = array_column($list, 'id');
        
        
        // 一次性查询所有聊天室的未读消息数量
        $unreadCounts = [];
        if (!empty($chatroomIds)) {
            $unreadResults = Db::table('s2_wechat_message')
                ->field('wechatChatroomId, COUNT(*) as count')
                ->where('wechatChatroomId', 'in', $chatroomIds)
                ->where('isRead', 0)
                ->group('wechatChatroomId')
                ->select();
            
            foreach ($unreadResults as $result) {
                $unreadCounts[$result['wechatChatroomId']] = $result['count'];
            }
        }
         // 一次性查询所有聊天室的最新消息
        $latestMessages = [];
        if (!empty($chatroomIds)) {
            // 使用子查询获取每个聊天室的最新消息ID
            $subQuery = Db::table('s2_wechat_message')
                ->field('MAX(id) as max_id, wechatChatroomId')
                ->where('wechatChatroomId', 'in', $chatroomIds)
                ->group('wechatChatroomId')
                ->buildSql();
            
            // 查询最新消息的详细信息
            $messageResults = Db::table('s2_wechat_message')
                ->alias('m')
                ->join([$subQuery => 'sub'], 'm.id = sub.max_id')
                ->field('m.*, sub.wechatChatroomId')
                ->select();
            
            foreach ($messageResults as $message) {
                $latestMessages[$message['wechatChatroomId']] = $message;
            }
        }
        
        // 处理每个聊天室的数据
        foreach ($list as $k => &$v) {
            $v['createTime'] = !empty($v['createTime']) ? date('Y-m-d H:i:s', $v['createTime']) : '';
            $v['updateTime'] = !empty($v['updateTime']) ? date('Y-m-d H:i:s', $v['updateTime']) : '';
            
            $config = [
                'unreadCount' => isset($unreadCounts[$v['id']]) ? $unreadCounts[$v['id']] : 0,
                'chat' => isset($latestMessages[$v['id']]),
                'msgTime' => isset($latestMessages[$v['id']]) ? $latestMessages[$v['id']]['wechatTime'] : 0
            ];
            $v['config'] = $config;
        }
        unset($v);

        return ResponseHelper::success(['list'=>$list,'total'=>$total]);
    }

    public function getDetail(){
        $id = input('id', 0);
        
        if (!$id) {
            return ResponseHelper::error('聊天室ID不能为空');
        }

        $accountId = $this->getUserInfo('s2_accountId');
        if (empty($accountId)){
            return ResponseHelper::error('请先登录');
        }

        $detail = Db::table('s2_wechat_chatroom')
            //->where(['accountId' => $accountId, 'id' => $id, 'isDeleted' => 0])
            ->where([ 'id' => $id, 'isDeleted' => 0])
            ->find();

        // if (!$detail) {
        //     return ResponseHelper::error('聊天室不存在或无权限访问');
        // }

        // 处理时间格式
        $detail['createTime'] = !empty($detail['createTime']) ? date('Y-m-d H:i:s', $detail['createTime']) : '';
        $detail['updateTime'] = !empty($detail['updateTime']) ? date('Y-m-d H:i:s', $detail['updateTime']) : '';

        // 查询未读消息数量
        $unreadCount = Db::table('s2_wechat_message')
            ->where('wechatChatroomId', $id)
            ->where('isRead', 0)
            ->count();

        // 查询最新消息
        $latestMessage = Db::table('s2_wechat_message')
            ->where('wechatChatroomId', $id)
            ->order('id desc')
            ->find();

        $config = [
            'unreadCount' => $unreadCount,
            'chat' => !empty($latestMessage),
            'msgTime' => isset($latestMessage['wechatTime']) ? $latestMessage['wechatTime'] : 0
        ];
        $detail['config'] = $config;

        return ResponseHelper::success($detail);
    }

    public function getMembers()
    {
        $page = $this->request->param('page', 1);
        $limit = $this->request->param('limit', 10);
        $groupId = $this->request->param('groupId', '');
        $keyword = $this->request->param('keyword', '');
        
        $accountId = $this->getUserInfo('s2_accountId');
        if (empty($accountId)) {
            return ResponseHelper::error('请先登录');
        }

        // 验证群组ID必填
        if (empty($groupId)) {
            return ResponseHelper::error('群组ID不能为空');
        }

        // 验证群组是否属于当前账号
        $chatroom = Db::table('s2_wechat_chatroom')
            ->where(['id' => $groupId, 'isDeleted' => 0])
            ->find();

        if (!$chatroom) {
            return ResponseHelper::error('群组不存在或无权限访问');
        }

        // 获取群组的chatroomId（微信群聊ID）
        $chatroomId = $chatroom['chatroomId'] ?? $chatroom['id'];
        
        // 如果chatroomId为空，使用id作为chatroomId
        if (empty($chatroomId)) {
            $chatroomId = $chatroom['id'];
        }

        // 构建查询
        $query = Db::table('s2_wechat_chatroom_member')
            ->where('chatroomId', $chatroomId);

        // 关键字搜索：昵称、备注、别名
        if ($keyword !== '' && $keyword !== null) {
            $query->where(function ($q) use ($keyword) {
                $like = '%' . $keyword . '%';
                $q->whereLike('nickname', $like)
                    ->whereOr('conRemark', 'like', $like)
                    ->whereOr('alias', 'like', $like);
            });
        }

        $query->order('id desc');
        $total = $query->count();
        $list = $query->page($page, $limit)->select();

        // 处理时间格式
        foreach ($list as $k => &$v) {
            $v['createTime'] = !empty($v['createTime']) ? date('Y-m-d H:i:s', $v['createTime']) : '';
            $v['updateTime'] = !empty($v['updateTime']) ? date('Y-m-d H:i:s', $v['updateTime']) : '';
        }
        unset($v);

        return ResponseHelper::success(['list' => $list, 'total' => $total]);
    }

    public function aiAnnouncement()
    {
        $userId = $this->getUserInfo('id');
        $companyId = $this->getUserInfo('companyId');
        $wechatAccountId =  $this->request->param('wechatAccountId', '');
        $groupId =  $this->request->param('groupId', '');
        $content =  $this->request->param('content', '');

        if (empty($groupId) || empty($content)|| empty($wechatAccountId)){
            return ResponseHelper::error('参数缺失');
        }

        $tokens = TokensCompany::where(['companyId' => $companyId])->value('tokens');
        if (empty($tokens) || $tokens <= 0){
            return ResponseHelper::error('用户Tokens余额不足');
        }

        $params = [
            'model' => 'doubao-1-5-pro-32k-250115',
            'messages' => [
                ['role' => 'system', 'content' => '你现在是存客宝的AI助理，你精通中国大陆的法律'],
                ['role' => 'user', 'content' => $content],
            ],
        ];

        //AI处理
        $ai = new DouBaoAI();
        $res = $ai->text($params);
        $res = json_decode($res,true);


        if ($res['code'] == 200) {
            //扣除Tokens
            $tokensRecord = new  tokensRecord();
            $nickname = Db::table('s2_wechat_chatroom')->where(['id' => $groupId])->value('nickname');
            $remarks = !empty($nickname) ? '生成【'.$nickname.'】群公告' : '生成群公告';
            $data = [
                'tokens' => $res['data']['token'],
                'type' => 0,
                'form' => 14,
                'wechatAccountId' => $wechatAccountId,
                'friendIdOrGroupId' => $groupId,
                'remarks' => $remarks,
            ];
            $tokensRecord->consumeTokens($data);
            return ResponseHelper::success($res['data']['content']);
        }else{
            return ResponseHelper::error($res['msg']);
        }


    }

}