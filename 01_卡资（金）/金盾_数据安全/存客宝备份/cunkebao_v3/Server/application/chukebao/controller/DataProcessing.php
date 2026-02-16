<?php

namespace app\chukebao\controller;

use app\api\model\WechatChatroomModel;
use library\ResponseHelper;
use app\api\model\WechatFriendModel;
use app\api\model\WechatMessageModel;
use app\api\controller\MessageController;
use think\Db;


class DataProcessing extends BaseController
{
    public function index()
    {
        $userId = $this->getUserInfo('id');
        $companyId = $this->getUserInfo('companyId');
        $type = $this->request->param('type', '');
        $wechatAccountId = $this->request->param('wechatAccountId', '');
        //微信好友
        $toAccountId = $this->request->param('toAccountId', '');
        $wechatFriendId = $this->request->param('wechatFriendId', '');
        $newRemark = $this->request->param('newRemark', '');
        $labels = $this->request->param('labels', []);
        //微信群
        $wechatChatroomId = $this->request->param('wechatChatroomId', '');

        //新消息
        $friendMessage = $this->request->param('friendMessage', '');
        $chatroomMessage = $this->request->param('chatroomMessage', '');

        $typeData = [
            'CmdModifyFriendRemark', //好友修改备注  {newRemark、wechatAccountId、wechatFriendId}
            'CmdModifyFriendLabel', //好友修改标签  {labels、wechatAccountId、wechatFriendId}
            'CmdAllotFriend', //转让好友  {labels、wechatAccountId、wechatFriendId}
            'CmdChatroomOperate', //修改群信息  {chatroomName（群名）、announce（公告）、extra（公告）、wechatAccountId、wechatChatroomId}
            'CmdNewMessage', //接收消息
            'CmdSendMessageResult', //更新消息状态
            'CmdPinToTop', //置顶
        ];

        if (empty($type) || empty($wechatAccountId)) {
            return ResponseHelper::error('参数缺失');
        }

        if (!in_array($type, $typeData)) {
            return ResponseHelper::error('类型错误');
        }
        $msg = '';
        $codee = 200;
        switch ($type) {
            case 'CmdModifyFriendRemark': //修改好友备注
                if(empty($wechatFriendId) || empty($newRemark)){
                    return ResponseHelper::error('参数缺失');
                }
                $friend = WechatFriendModel::where(['id' => $wechatFriendId,'wechatAccountId' => $wechatAccountId])->find();
                if(empty($friend)){
                    return ResponseHelper::error('好友不存在');
                }
                $friend->conRemark = $newRemark;
                $friend->updateTime = time();
                $friend->save();
                
                $msg = '修改备成功';
                break;
            case 'CmdModifyFriendLabel': //修改好友标签
                if(empty($wechatFriendId)){
                    return ResponseHelper::error('参数缺失');
                }
                $friend = WechatFriendModel::where(['id' => $wechatFriendId,'wechatAccountId' => $wechatAccountId])->find();
                if(empty($friend)){
                    return ResponseHelper::error('好友不存在');
                }
                $friend->labels = json_encode($labels,256);
                $friend->updateTime = time();
                $friend->save();
                
                $msg = '修标签成功';
                break;
            case 'CmdAllotFriend': //迁移好友
                if(empty($toAccountId)){
                    return ResponseHelper::error('参数缺失');
                }
                if(empty($wechatFriendId) && empty($wechatChatroomId)){
                    return ResponseHelper::error('参数缺失');
                }


                if (!empty($wechatFriendId)){
                    $data = WechatFriendModel::where(['id' => $wechatFriendId,'wechatAccountId' => $wechatAccountId])->find();
                    $msg = '好友转移成功';
                    if(empty($data)){
                        return ResponseHelper::error('好友不存在');
                    }
                }


                if (!empty($wechatChatroomId)){
                    $data = WechatChatroomModel::where(['id' => $wechatChatroomId,'wechatAccountId' => $wechatAccountId])->find();
                    $msg = '群聊转移成功';
                    if(empty($data)){
                        return ResponseHelper::error('群聊不存在');
                    }
                }

                $data->accountId = $toAccountId;
                $data->updateTime = time();
                $data->save();
                break;
            case 'CmdNewMessage':
                if(empty($friendMessage) && empty($chatroomMessage)){
                    return ResponseHelper::error('参数缺失');
                }

                if(is_array($friendMessage) && is_array($chatroomMessage)){
                    return ResponseHelper::error('数据类型错误');
                }


                $messageController = new MessageController();
                if (!empty($friendMessage)){
                    $res = $messageController->saveMessage($friendMessage[0]);
                }else{
                    $res = $messageController->saveChatroomMessage($chatroomMessage[0]);
                }
                if (!empty($res)){
                    $msg = '消息记录成功';
                }else{
                    $msg = '消息记录失败';
                    $codee = 200;
                }
                break;
            case 'CmdSendMessageResult':
                $friendMessageId = $this->request->param('friendMessageId', 0);
                $chatroomMessageId = $this->request->param('chatroomMessageId', 0);
                $sendStatus = $this->request->param('sendStatus', null);
                $wechatTime = $this->request->param('wechatTime', 0);

                if ($sendStatus === null) {
                    return ResponseHelper::error('sendStatus不能为空');
                }

                if (empty($friendMessageId) && empty($chatroomMessageId)) {
                    return ResponseHelper::error('friendMessageId或chatroomMessageId至少提供一个');
                }

                $messageId = $friendMessageId ?: $chatroomMessageId;
                $update = [
                    'sendStatus' => (int)$sendStatus,
                ];

                if (!empty($wechatTime)) {
                    $update['wechatTime'] = strlen((string)$wechatTime) > 10
                        ? intval($wechatTime / 1000)
                        : (int)$wechatTime;
                }

                $affected = WechatMessageModel::where('id', $messageId)->update($update);

                if ($affected === false) {
                    return ResponseHelper::success('','更新消息状态失败');
                }

                if ($affected === 0) {
                    return ResponseHelper::success('','消息不存在');
                }

                $msg = '更新消息状态成功';
                break;
            case 'CmdPinToTop': //置顶
                $wechatFriendId = $this->request->param('wechatFriendId', 0);
                $wechatChatroomId = $this->request->param('wechatChatroomId', 0);
                $isTop = $this->request->param('isTop', null);

                if ($isTop === null) {
                    return ResponseHelper::error('isTop不能为空');
                }

                if (empty($wechatFriendId) && empty($wechatChatroomId)) {
                    return ResponseHelper::error('wechatFriendId或chatroomId至少提供一个');
                }


                if (!empty($wechatFriendId)){
                    $data = WechatFriendModel::where(['id' => $wechatFriendId,'wechatAccountId' => $wechatAccountId])->find();
                    $msg = $isTop == 1 ? '已置顶' : '取消置顶';
                    if(empty($data)){
                        return ResponseHelper::error('好友不存在');
                    }
                }


                if (!empty($wechatChatroomId)){
                    $data = WechatChatroomModel::where(['id' => $wechatChatroomId,'wechatAccountId' => $wechatAccountId])->find();
                    $msg = $isTop == 1 ? '已置顶' : '取消置顶';
                    if(empty($data)){
                        return ResponseHelper::error('群聊不存在');
                    }
                }

                $data->updateTime = time();
                $data->isTop = $isTop;
                $data->save();
                
                break;
        }
        return ResponseHelper::success('',$msg,$codee);
    }
}