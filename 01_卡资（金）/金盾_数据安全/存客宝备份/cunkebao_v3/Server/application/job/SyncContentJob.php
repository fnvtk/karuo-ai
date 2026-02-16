<?php
namespace app\job;

use app\chukebao\model\Reply;
use app\chukebao\model\ReplyGroup;
use think\Db;
use think\queue\Job;

class SyncContentJob
{
    public function fire(Job $job, $data)
    {

        $ddd= Db::table('s2_wechat_friend')->where('ownerWechatId','wxid_h7nsh7vxseyn29')->select();
        foreach ($ddd as $v) {
            $d = Db::table('ck_task_customer')->where('task_id','167')->where('phone',$v['wechatId'])->find();
            if (!empty($d) && !in_array($d['status'],[4,5])) {
                Db::table('ck_task_customer')->where('id',$d['id'])->update(['status'=>5]);
            }
        }

        exit_data(111);

        return true;
        /*$ddd= '[{"id":21909,"groupName":"私域运营招聘","sortIndex":240426546,"parentId":0,"replyType":1,"children":[],"replys":null},{"id":8074,"groupName":"存客宝新客户介绍","sortIndex":230,"parentId":0,"replyType":1,"children":[{"id":8081,"groupName":"客户系统上线准备","sortIndex":1,"parentId":8074,"replyType":1,"children":[],"replys":null}],"replys":null},{"id":10441,"groupName":"BOSS直聘","sortIndex":229,"parentId":0,"replyType":1,"children":[],"replys":null},{"id":15111,"groupName":"点了码新客户了解","sortIndex":228,"parentId":0,"replyType":1,"children":[],"replys":null},{"id":12732,"groupName":"测试","sortIndex":219,"parentId":0,"replyType":1,"children":[],"replys":null},{"id":8814,"groupName":"封单话术","sortIndex":176,"parentId":0,"replyType":1,"children":[],"replys":null},{"id":8216,"groupName":"私域合伙人","sortIndex":172,"parentId":0,"replyType":1,"children":[],"replys":null},{"id":6476,"groupName":"新客户了解","sortIndex":119,"parentId":0,"replyType":1,"children":[],"replys":null}]';
        $ddd=json_decode($ddd,1);*/

        $ddd = ReplyGroup::where('companyId',2778)->where('companyId','<>',21898)->where('isDel',0)->select()->toArray();


        $authorization = 'OE7kh6Dsw_0SqqH1FTAPCB2ewCQDhx7VvPw6PrsE_p9tcRKbtlFsZau8kjk2NQ829Yah90KhTh0C_35ek569uRQgM_gC0NtKzfRPDDoqMIUE5mI6AO_hm0dm-xDJqhAFYkXHCdXnJYzQZxWS5dleJCIwtQxgRuIzIbr-_G_5C-7DeLEOSt2vi1oGPleLt00QGQ1WYVYqoHYrbPGMghMQpWIbgk5qNcUCeANlLJ_s7QFC3QzArU95_YiK0HlhU81hZqr8kI_5lmdrRBoR-yNIlyhySLRCmEZYGzOxCiUHL3uFHYZA1VnLBAVbryNj5DElZjMgwA';
        // 设置请求头
        $headerData = ['client:system'];
        $header = setHeader($headerData, $authorization, 'json');



        foreach ($ddd as $key => $value) {
            $data = [];
            // 发送请求获取公司账号列表
            $result = requestCurl('https://s2.siyuguanli.com:9991/api/Reply/listReply?groupId='.$value['id'], '', 'GET', $header,'json');
            $response = handleApiResponse($result);
            foreach ($response as $k => $v) {
                $data[] = [
                    'groupId' => $v['groupId'],
                    'userId' => $value['userId'],
                    'title' => $v['title'],
                    'msgType' => $v['msgType'],
                    'content' => $v['content'],
                    'createTime' => strtotime($v['createTime']),
                    'lastUpdateTime' => strtotime($v['lastUpdateTime']),
                    'sortIndex' => 50
                ];
            }
            $Reply = new Reply();
            $Reply->insertAll($data);
        }


        exit_data(11111);




    }
} 