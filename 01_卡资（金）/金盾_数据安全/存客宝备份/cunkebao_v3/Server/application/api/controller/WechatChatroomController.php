<?php

namespace app\api\controller;

use app\api\model\WechatChatroomModel;
use app\api\model\WechatChatroomMemberModel;
use app\job\WechatChatroomJob;
use app\job\WorkbenchGroupWelcomeJob;
use think\facade\Request;
use think\Queue;

class WechatChatroomController extends BaseController
{
    /**
     * 获取微信群聊列表
     * @return \think\response\Json
     */
    public function getlist($data = [],$isInner = false, $isDel = '')
    {
        // 获取授权token
        $authorization =  $this->authorization;
        if (empty($authorization)) {
            return json_encode(['code'=>500,'msg'=>'缺少授权信息']);
       }

        try {
            // 根据isDel设置对应的isDeleted值
            $isDeleted = '';
            if ($isDel === '0' || $isDel === 0) {
                $isDeleted = false;
            } elseif ($isDel === '1' || $isDel === 1) {
                $isDeleted = true;
            }
            
            // 构建请求参数
            $params = [
                'keyword' =>  $data['keyword'] ?? '',
                'wechatAccountKeyword' => $data['wechatAccountKeyword'] ?? '',
                'isDeleted' =>  $data['isDeleted'] ?? $isDeleted ,
                'allotAccountId' =>  $data['allotAccountId'] ?? '',
                'groupId' =>  $data['groupId'] ?? '',
                'wechatChatroomId' =>  $data['wechatChatroomId'] ?? '',
                'memberKeyword' =>  $data['memberKeyword'] ?? '',
                'pageIndex' =>  $data['pageIndex'] ?? 0,
                'pageSize' =>  $data['pageSize'] ?? 20
            ];

            // 设置请求头
            $headerData = ['client:system'];
            $header = setHeader($headerData, $authorization, 'json');

            // 发送请求获取群聊列表
            $result = requestCurl($this->baseUrl . 'api/WechatChatroom/pagelist', $params, 'GET', $header,'json');
            $response = handleApiResponse($result);
            
            // 保存数据到数据库
            if (!empty($response['results'])) {
                $isUpdate = false;
                foreach ($response['results'] as $item) {
                    $updated = $this->saveChatroom($item);
                    if($updated && $isDel == 0){
                        $isUpdate = true;
                    }
                }
            }

            if($isInner){
                return json_encode(['code'=>200,'msg'=>'success','data'=>$response,'isUpdate'=>$isUpdate]);
            }else{
                return successJson($response);
            }
        } catch (\Exception $e) {
            if($isInner){
                return json_encode(['code'=>200,'msg'=>'获取微信群聊列表失败' . $e->getMessage()]);
            }else{
                return errorJson('获取微信群聊列表失败：' . $e->getMessage());
            }
        }
    }

    /**
     * 保存群聊数据到数据库
     * @param array $item 群聊数据
     */
    private function saveChatroom($item)
    {
        $data = [
            'id' => $item['id'],
            'wechatAccountId' => $item['wechatAccountId'],
            'wechatAccountAlias' => $item['wechatAccountAlias'],
            'wechatAccountWechatId' => $item['wechatAccountWechatId'],
            'wechatAccountAvatar' => $item['wechatAccountAvatar'],
            'wechatAccountNickname' => $item['wechatAccountNickname'],
            'chatroomId' => $item['chatroomId'],
            'hasMe' => $item['hasMe'],
            'chatroomOwnerNickname' => isset($item['chatroomOwnerNickname']) ? $item['chatroomOwnerNickname'] : '',
            'chatroomOwnerAvatar' => isset($item['chatroomOwnerAvatar']) ? $item['chatroomOwnerAvatar'] : '',
            'conRemark' => isset($item['conRemark']) ? $item['conRemark'] : '',
            'nickname' => isset($item['nickname']) ? $item['nickname'] : '',
            'pyInitial' => isset($item['pyInitial']) ? $item['pyInitial'] : '',
            'quanPin' => isset($item['quanPin']) ? $item['quanPin'] : '',
            'chatroomAvatar' => isset($item['chatroomAvatar']) ? $item['chatroomAvatar'] : '',
            'members' => is_array($item['members']) ? json_encode($item['members']) : json_encode([]),
            'isDeleted' => isset($item['isDeleted']) ? $item['isDeleted'] : 0,
            'deleteTime' => !empty($item['isDeleted']) ? strtotime($item['deleteTime']) : 0,
            'createTime' => isset($item['createTime']) ? strtotime($item['createTime']) : 0,
            'accountId' => isset($item['accountId']) ? $item['accountId'] : 0,
            'accountUserName' => isset($item['accountUserName']) ? $item['accountUserName'] : '',
            'accountRealName' => isset($item['accountRealName']) ? $item['accountRealName'] : '',
            'accountNickname' => isset($item['accountNickname']) ? $item['accountNickname'] : '',
            'groupId' => isset($item['groupId']) ? $item['groupId'] : 0,
            'updateTime' => time()
        ];

        // 使用chatroomId和wechatAccountId的组合作为唯一性判断
        $chatroom = WechatChatroomModel::where('id',$item['id'])->find();

        if ($chatroom) {
            $chatroom->save($data);
            return true;
        } else {
            WechatChatroomModel::create($data);
            return false;
        }

        // // 同时保存群成员数据
        // if (!empty($item['members'])) {
        //     foreach ($item['members'] as $member) {
        //         $this->saveChatroomMember($member, $item['chatroomId']);
        //     }
        // }
    }

    /**
     * 获取群成员列表
     * @param string $wechatChatroomId 微信群ID
     * @return \think\response\Json
     */
    public function listChatroomMember($wechatChatroomId = '',$chatroomId = '',$isInner = false)
    {
        // 获取授权token
        $authorization = trim($this->request->header('authorization', $this->authorization));
        $wechatChatroomId = !empty($wechatChatroomId) ? $wechatChatroomId : $this->request->param('id', '');
        $chatroomId = !empty($chatroomId) ? $chatroomId : $this->request->param('chatroomId', '');

        
        if (empty($authorization)) {
            if($isInner){
                return json_encode(['code'=>500,'msg'=>'缺少授权信息']);
            }else{
                return errorJson('缺少授权信息');
            }
        }

        if (empty($wechatChatroomId)) {
            if($isInner){
                return json_encode(['code'=>500,'msg'=>'群ID不能为空']);
            }else{
                return errorJson('群ID不能为空');
            }
        }

        try {
            // 构建请求参数
            $params = [
                'wechatChatroomId' => $wechatChatroomId
            ];

            // 设置请求头
            $headerData = ['client:system'];
            $header = setHeader($headerData, $authorization, 'plain');

            // 发送请求获取群成员列表
            $result = requestCurl($this->baseUrl . 'api/WechatChatroom/listChatroomMember', $params, 'GET', $header);
            $response = handleApiResponse($result);

            // 保存数据到数据库
            if (!empty($response)) {
                foreach ($response as $item) {
                    $this->saveChatroomMember($item, $chatroomId);
                }
            }
            
            if($isInner){
                return json_encode(['code'=>200,'msg'=>'success','data'=>$response]);
            }else{
                return successJson($response);
            }
        } catch (\Exception $e) {
            if($isInner){
                return json_encode(['code'=>500,'msg'=>'获取群成员列表失败：' . $e->getMessage()]);
            }else{
                return errorJson('获取群成员列表失败：' . $e->getMessage());
            }
        }
    }

    /**
     * 保存群成员数据到数据库
     * @param array $item 群成员数据
     * @param string $wechatChatroomId 微信群ID
     */
    private function saveChatroomMember($item, $wechatChatroomId)
    {
        $data = [
            'chatroomId' => $wechatChatroomId,
            'wechatId' => isset($item['wechatId']) ? $item['wechatId'] : '',
            'nickname' => isset($item['nickname']) ? $item['nickname'] : '',
            'avatar' => isset($item['avatar']) ? $item['avatar'] : '',
            'conRemark' => isset($item['conRemark']) ? $item['conRemark'] : '',
            'alias' => isset($item['alias']) ? $item['alias'] : '',
            'friendType' => isset($item['friendType']) ? $item['friendType'] : false,
            'updateTime' => time()
        ];

        // 使用chatroomId和wechatId的组合作为唯一性判断
        $member = WechatChatroomMemberModel::where([
            ['chatroomId', '=', $wechatChatroomId],
            ['wechatId', '=', $item['wechatId']]
        ])->find();

        if ($member) {
            $member->save($data);
        } else {
            // 新成员，记录首次出现时间
            $data['createTime'] = time();
            WechatChatroomMemberModel::create($data);
        }
    }

    /**
     * 同步微信群聊数据
     * 此方法用于手动触发微信群聊数据同步任务
     * @return \think\response\Json
     */
    public function syncChatrooms()
    {
        try {
            // 获取请求参数
            $pageIndex = $this->request->param('pageIndex', 0);
            $pageSize = $this->request->param('pageSize', 100);
            $keyword = $this->request->param('keyword', '');
            $wechatAccountKeyword = $this->request->param('wechatAccountKeyword', '');
            $isDeleted = $this->request->param('isDeleted', '');
            
            // 添加同步任务到队列
            $result = WechatChatroomJob::addSyncTask($pageIndex, $pageSize, $keyword, $wechatAccountKeyword, $isDeleted);
            
            if ($result) {
                return successJson([], '微信群聊同步任务已添加到队列');
            } else {
                return errorJson('添加同步任务失败');
            }
        } catch (\Exception $e) {
            return errorJson('添加同步任务异常：' . $e->getMessage());
        }
    }
} 