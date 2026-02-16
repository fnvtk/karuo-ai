<?php

namespace app\cunkebao\controller\plan;

use app\common\model\Device as DeviceModel;
use app\common\model\DeviceWechatLogin as DeviceWechatLoginModel;
use app\common\model\WechatCustomer as WechatCustomerModel;
use library\ResponseHelper;
use think\Controller;
use think\Db;

/**
 * 获取获客计划详情控制器
 */
class GetAddFriendPlanDetailV1Controller extends Controller
{
    /**
     * 生成签名
     * 
     * @param array $params 参数数组
     * @param string $apiKey API密钥
     * @return string
     */
    private function generateSignature($params, $apiKey)
    {
        // 1. 移除sign和apiKey
        unset($params['sign'], $params['apiKey']);
        
        // 2. 移除空值
        $params = array_filter($params, function($value) {
            return !is_null($value) && $value !== '';
        });
        
        // 3. 参数按键名升序排序
        ksort($params);
        
        // 4. 直接拼接参数值
        $stringToSign = implode('', array_values($params));
        
        // 5. 第一次MD5加密
        $firstMd5 = md5($stringToSign);
        
        // 6. 拼接apiKey并第二次MD5加密
        return md5($firstMd5 . $apiKey);
    }

    /**
     * 生成测试URL
     *
     * @param string $apiKey API密钥
     * @return array
     */
    public function testUrl($apiKey)
    {
        try {
            if (empty($apiKey)) {
                return [];
            }

            // 构建测试参数
            $testParams = [
                'name' => '测试客户',
                'phone' => '18888888888',
                'apiKey' => $apiKey,
                'timestamp' => time()
            ];

            // 生成签名
            $sign = $this->generateSignature($testParams, $apiKey);
            $testParams['sign'] = $sign;

            // 构建签名过程说明
            $signParams = $testParams;
            unset($signParams['sign'], $signParams['apiKey']);
            ksort($signParams);
            $signStr = implode('', array_values($signParams));

            // 构建完整URL参数，不对中文进行编码
            $urlParams = [];
            foreach ($testParams as $key => $value) {
                $urlParams[] = $key . '=' . $value;
            }
            $fullUrl = implode('&', $urlParams);

            return [
                'apiKey' => $apiKey,
                'originalString' => $signStr,
                'sign' => $sign,
                'fullUrl' => $fullUrl
            ];

        } catch (\Exception $e) {
            return [];
        }
    }

    /**
     * 获取计划详情
     *
     * @return \think\response\Json
     */
    public function index()
    {
        try {
            $planId = $this->request->param('planId');
            
            if (empty($planId)) {
                return ResponseHelper::error('计划ID不能为空', 400);
            }

            // 查询计划详情
            $plan = Db::name('customer_acquisition_task')
                ->where('id', $planId)
                ->find();

            if (!$plan) {
                return ResponseHelper::error('计划不存在', 404);
            }

            // 解析JSON字段
            $sceneConf = json_decode($plan['sceneConf'], true) ?: [];
            $reqConf = json_decode($plan['reqConf'], true) ?: [];
            $reqConf['deviceGroups'] = $reqConf['device'];
            $msgConf = json_decode($plan['msgConf'], true) ?: [];
            $tagConf = json_decode($plan['tagConf'], true) ?: [];

            // 处理拉群固定成员为数组，并构造下拉 options
            if (!empty($plan['groupFixedMembers'])) {
                $fixedMembers = json_decode($plan['groupFixedMembers'], true);
                $plan['groupFixedMembers'] = is_array($fixedMembers) ? $fixedMembers : [];
            } else {
                $plan['groupFixedMembers'] = [];
            }
            // groupFixedMembersOptions：参考 workbench 中好友 options 的结构，返回完整好友信息
            $groupFixedMembersOptions = [];
            if (!empty($plan['groupFixedMembers'])) {
                $friendIds = [];
                $manualIds = [];
                foreach ($plan['groupFixedMembers'] as $member) {
                    if (is_numeric($member)) {
                        $friendIds[] = intval($member);
                    } else {
                        $manualIds[] = $member;
                    }
                }

                // 数字 ID：从 s2_wechat_friend 中查询好友信息
                if (!empty($friendIds)) {
                    $friendList = Db::table('s2_wechat_friend')->alias('wf')
                        ->join(['s2_wechat_account' => 'wa'], 'wa.id = wf.wechatAccountId', 'left')
                        ->join(['s2_company_account' => 'ca'], 'ca.id = wf.accountId', 'left')
                        ->where('wf.id', 'in', $friendIds)
                        ->order('wf.id', 'desc')
                        ->field('wf.id,wf.wechatId,wf.nickname,wf.avatar,wf.alias,wf.gender,wf.phone,wa.nickName as accountNickname,ca.userName as account,ca.realName as username,wf.createTime,wf.updateTime,wf.deleteTime,wf.ownerWechatId')
                        ->select();

                    // 获取群主信息，格式化时间
                    foreach ($friendList as &$friend) {
                        if (!empty($friend['ownerWechatId'])) {
                            $owner = Db::name('wechat_account')
                                ->where('wechatId', $friend['ownerWechatId'])
                                ->field('nickName,alias')
                                ->find();
                            $friend['ownerNickname'] = $owner['nickName'] ?? '';
                            $friend['ownerAlias'] = $owner['alias'] ?? '';
                        } else {
                            $friend['ownerNickname'] = '';
                            $friend['ownerAlias'] = '';
                        }
                        $friend['isManual'] = '';
                        $friend['createTime'] = !empty($friend['createTime']) ? date('Y-m-d H:i:s', $friend['createTime']) : '';
                        $friend['updateTime'] = !empty($friend['updateTime']) ? date('Y-m-d H:i:s', $friend['updateTime']) : '';
                        $friend['deleteTime'] = !empty($friend['deleteTime']) ? date('Y-m-d H:i:s', $friend['deleteTime']) : '';
                    }
                    unset($friend);

                    $groupFixedMembersOptions = array_merge($groupFixedMembersOptions, $friendList);
                }

                // 手动 ID：仅返回基础结构，标记 isManual=1
                if (!empty($manualIds)) {
                    foreach ($manualIds as $mid) {
                        $groupFixedMembersOptions[] = [
                            'id' => $mid,
                            'wechatId' => $mid,
                            'nickname' => $mid,
                            'avatar' => '',
                            'alias' => '',
                            'gender' => 0,
                            'phone' => '',
                            'accountNickname' => '',
                            'account' => '',
                            'username' => '',
                            'ownerNickname' => '',
                            'ownerAlias' => '',
                            'ownerWechatId' => '',
                            'createTime' => '',
                            'updateTime' => '',
                            'deleteTime' => '',
                            'isManual' => 1,
                        ];
                    }
                }
            }
            $sceneConf['groupFixedMembersOptions'] = $groupFixedMembersOptions;

            // 处理分销配置
            $distributionConfig = $sceneConf['distribution'] ?? [
                'enabled' => false,
                'channels' => [],
                'customerRewardAmount' => 0,
                'addFriendRewardAmount' => 0,
            ];

            // 格式化分销配置（分转元，并获取渠道详情）
            $distributionEnabled = !empty($distributionConfig['enabled']);
            $distributionChannels = [];
            if ($distributionEnabled && !empty($distributionConfig['channels'])) {
                $channels = Db::name('distribution_channel')
                    ->where([
                        ['id', 'in', $distributionConfig['channels']],
                        ['deleteTime', '=', 0]
                    ])
                    ->field('id,code,name')
                    ->select();
                $distributionChannels = array_map(function($channel) {
                    return [
                        'id' => (int)$channel['id'],
                        'code' => $channel['code'],
                        'name' => $channel['name']
                    ];
                }, $channels);
            }

            // 将分销配置添加到返回数据中
            $sceneConf['distributionEnabled'] = $distributionEnabled;
            $sceneConf['distributionChannels'] = $distributionChannels;
            $sceneConf['customerRewardAmount'] = round(($distributionConfig['customerRewardAmount'] ?? 0) / 100, 2); // 分转元
            $sceneConf['addFriendRewardAmount'] = round(($distributionConfig['addFriendRewardAmount'] ?? 0) / 100, 2); // 分转元



            if(!empty($sceneConf['wechatGroups'])){
                $groupList = Db::name('wechat_group')->alias('wg')
                    ->join('wechat_account wa', 'wa.wechatId = wg.ownerWechatId')
                    ->where('wg.id', 'in', $sceneConf['wechatGroups'])
                    ->order('wg.id', 'desc')
                    ->field('wg.id,wg.name,wg.chatroomId,wg.ownerWechatId,wa.nickName as ownerNickName,wa.avatar as ownerAvatar,wa.alias as ownerAlias,wg.avatar')
                    ->select();
                $sceneConf['wechatGroupsOptions'] = $groupList;
            }else{
                $sceneConf['wechatGroupsOptions'] = [];
            }


            if (!empty($reqConf['deviceGroups'])){
                $deviceGroupsOptions = DeviceModel::alias('d')
                    ->field([
                        'd.id', 'd.imei', 'd.memo', 'd.alive',
                        'l.wechatId',
                        'a.nickname', 'a.alias', '0 totalFriend', '0 totalFriend'
                    ])
                    ->leftJoin('device_wechat_login l', 'd.id = l.deviceId and l.alive =' . DeviceWechatLoginModel::ALIVE_WECHAT_ACTIVE . ' and l.companyId = d.companyId')
                    ->leftJoin('wechat_account a', 'l.wechatId = a.wechatId')
                    ->order('d.id desc')
                    ->whereIn('d.id',$reqConf['deviceGroups'])
                    ->select();
                foreach ($deviceGroupsOptions as &$device) {
                    $curstomer = WechatCustomerModel::field('friendShip')->where(['wechatId'  => $device['wechatId']])->find();
                    $device['totalFriend'] = $curstomer->friendShip->totalFriend ?? 0;
                }
                unset($device);
                $reqConf['deviceGroupsOptions'] = $deviceGroupsOptions;
            }else{
                $reqConf['deviceGroupsOptions'] = [];
            }




            unset(
                $reqConf['device'],
                $sceneConf['groupSelected'],
            );

            // 合并数据
            $newData['messagePlans'] = $msgConf;
            $newData = array_merge($newData, $sceneConf, $reqConf, $tagConf, $plan);
            
            // 确保 planType 有默认值（0=全局，1=独立，默认1）
            if (!isset($newData['planType'])) {
                $newData['planType'] = 1;
            } else {
                $newData['planType'] = intval($newData['planType']);
            }
            
            // 移除不需要的字段
            unset(
                $newData['sceneConf'],
                $newData['reqConf'],
                $newData['msgConf'],
                $newData['tagConf'],
                $newData['userInfo'],
                $newData['createTime'],
                $newData['updateTime'],
                $newData['deleteTime']
            );
            
            // 生成测试URL
            $newData['textUrl'] = $this->testUrl($newData['apiKey']);

            return ResponseHelper::success($newData, '获取计划详情成功');
            
        } catch (\Exception $e) {
            return ResponseHelper::error('系统错误: ' . $e->getMessage(), 500);
        }
    }
} 