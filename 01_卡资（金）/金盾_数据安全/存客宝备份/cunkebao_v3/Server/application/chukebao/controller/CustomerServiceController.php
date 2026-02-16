<?php

namespace app\chukebao\controller;

use library\ResponseHelper;
use think\Db;

class CustomerServiceController extends BaseController
{

    public function getList(){
        $accountId = $this->getUserInfo('s2_accountId');
        $userId = $this->getUserInfo('id');
        $companyId = $this->getUserInfo('companyId');
        if (empty($accountId)){
            return ResponseHelper::error('请先登录');
        }

        $accountIds1= Db::table('s2_wechat_friend')->where(['accountId' => $accountId,'isDeleted' => 0])->group('wechatAccountId')->column('wechatAccountId');
        $accountIds2 = Db::table('s2_wechat_chatroom')->where(['accountId' => $accountId,'isDeleted' => 0])->group('wechatAccountId')->column('wechatAccountId');
        // 确保即使有空数组也不会报错，并且去除重复值
        $accountIds = array_unique(array_merge($accountIds1 ?: [], $accountIds2 ?: []));



        $wechatAliveTime = time() - 86400 * 30;
        $list = Db::table('s2_wechat_account')->alias('wa')
            ->join(['s2_device' => 'd'],'wa.currentDeviceId = d.id','LEFT')
            ->whereIn('wa.id',$accountIds)
            ->where('wa.wechatAliveTime','>',$wechatAliveTime)
            ->order('wa.id desc')
            ->group('wa.id')
            ->field([
                'wa.*',
                'd.imei',
                'd.extra',
            ])
            ->select();
        foreach ($list as $k=>&$v){
            $v['createTime'] = !empty($v['createTime']) ? date('Y-m-d H:i:s',$v['createTime']) : '';
            $v['updateTime'] = !empty($v['updateTime']) ? date('Y-m-d H:i:s',$v['updateTime']) : '';
            $v['labels'] = json_decode($v['labels'],true);
            $momentsSetting = Db::name('kf_moments_settings')->where(['userId' => $userId,'companyId' => $companyId,'wechatId' =>$v['id']])->find();
            $v['momentsMax'] = !empty($momentsSetting['max']) ? $momentsSetting['max'] : 5;
            $v['momentsNum'] = !empty($momentsSetting['sendNum']) ? $momentsSetting['sendNum'] : 0;
            $v['deviceExtra'] = json_decode($v['extra'],true);
            $v['deviceExtra']['imei'] = $v['imei'];
            $v['deviceExtra']['memo'] = $v['deviceMemo'];
            unset(
                $v['accountUserName'],
                $v['accountRealName'],
                $v['accountNickname'],
                $v['extra'],
                $v['imei'],
                $v['deviceMemo'],
            );
        }
        unset($v);

        return ResponseHelper::success($list);
    }
}