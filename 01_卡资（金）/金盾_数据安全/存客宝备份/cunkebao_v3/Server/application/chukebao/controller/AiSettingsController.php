<?php

namespace app\chukebao\controller;

use app\chukebao\model\FriendSettings;
use app\chukebao\model\Questions;
use library\ResponseHelper;
use think\Db;

class AiSettingsController extends BaseController
{


    const SETTING_DEFAULT = [
        'audioSetting' => false,
        'round' => 10,
        'aiStopSetting' => [
            'status' => true,
            'key' => ['好', '不错', '好的', '下次', '可以']
        ],
        'fileSetting' => [
            'type' => 1,
            'content' => ''
        ],
        'modelSetting' => [
            'model' => 'GPT-4',
            'role' => '你是一名销售的AI助理，同时也是一个工智能技术专家，你的名字叫小灵，你是单身女性，出生于2003年10月10日，喜欢听音乐和看电影有着丰富的人生阅历，前成熟大方，分享用幽默风趣的语言和客户交流，顾客问起你的感情，回复内容中不要使用号，特别注意不要跟客户问题，不要更多选择发送的信息。',
            'businessBackground' => '灵销智能公司开发了多款AI营销智能技术产品，以提升销售GPT AI大模型为核心，接入打造的销售/营销/客服等AI智能应用，为企业AI办公，AI助理，AI销售，AI营销，AI直播等大AI应用产品。',
            'dialogueStyle' => '客户：你们的AI解决方案具体是怎么收费的？销售：嗯，朋友，我们的AI解决方案是根据项目需求来定的，这样吧，你能跟我说说你们的具体情况吗，不过这样一分钱，您看怎么样？我们可以给您做个详细的方案对比。',
        ]
    ];

    const TYPE_DATA = ['audioSetting', 'round', 'aiStopSetting', 'fileSetting', 'modelSetting'];

    /**
     * 获取配置信息
     * @return \think\response\Json
     * @throws \think\db\exception\DataNotFoundException
     * @throws \think\db\exception\ModelNotFoundException
     * @throws \think\exception\DbException
     */
    public function getSetting()
    {
        $userId = $this->getUserInfo('id');
        $companyId = $this->getUserInfo('companyId');

        $data = Db::name('ai_settings')->where(['userId' => $userId, 'companyId' => $companyId])->find();
        if (empty($data)) {
            $setting = self::SETTING_DEFAULT;
            $data = [
                'companyId' => $companyId,
                'userId' => $userId,
                'config' => json_encode($setting, 256),
                'createTime' => time(),
                'updateTime' => time()
            ];
            Db::name('ai_settings')->insert($data);

        } else {
            $setting = json_decode($data['config'], true);
        }

        return ResponseHelper::success($setting, '获取成功');
    }


    /**
     * 配置
     * @return \think\response\Json
     * @throws \Exception
     */
    public function setSetting()
    {
        $key = $this->request->param('key', '');
        $value = $this->request->param('value', '');
        $userId = $this->getUserInfo('id');
        $companyId = $this->getUserInfo('companyId');

        if (empty($key) || empty($value)) {
            return ResponseHelper::error('参数缺失');
        }


        if (!in_array($key, self::TYPE_DATA)) {
            return ResponseHelper::error('该类型不在配置项');
        }

        Db::startTrans();
        try {
            $data = Db::name('ai_settings')->where(['userId' => $userId, 'companyId' => $companyId])->find();
            if (empty($data)) {
                $setting = self::SETTING_DEFAULT;
            } else {
                $setting = json_decode($data['config'], true);
            }
            $setting[$key] = $value;
            $setting = json_encode($setting, 256);
            Db::name('ai_settings')->where(['id' => $data['id']])->update(['config' => $setting, 'updateTime' => time()]);
            Db::commit();
            return ResponseHelper::success(' ', '配置成功');
        } catch (\Exception $e) {
            Db::rollback();
            return ResponseHelper::error('配置失败：' . $e->getMessage());
        }
    }


    public function getUserTokens()
    {
        $userId = $this->getUserInfo('id');
        $companyId = $this->getUserInfo('companyId');
        $tokens = Db::name('users')
            ->where('id', $userId)
            ->where('companyId', $companyId)
            ->value('tokens');

        return ResponseHelper::success($tokens, '获取成功');
    }



    public function getFriend()
    {
        $friendId = $this->request->param('friendId', '');
        $wechatAccountId = $this->request->param('wechatAccountId', '');
        $userId = $this->getUserInfo('id');
        $companyId = $this->getUserInfo('companyId');
        $aiType = FriendSettings::where(['userId' => $userId, 'companyId' => $companyId,'friendId' => $friendId,'wechatAccountId' => $wechatAccountId])->value('type');
        if (empty($aiType)) {
            $aiType = 0;
        }
        return ResponseHelper::success($aiType, '获取成功');
    }





    public function setFriend()
    {
        $friendId = $this->request->param('friendId', '');
        $wechatAccountId = $this->request->param('wechatAccountId', '');
        $type = $this->request->param('type', 0);

        $userId = $this->getUserInfo('id');
        $companyId = $this->getUserInfo('companyId');

        if (empty($friendId) || empty($wechatAccountId)) {
            return ResponseHelper::error('参数缺失');
        }
        $friend = Db::table('s2_wechat_friend')->where(['id' => $friendId,'wechatAccountId' => $wechatAccountId])->find();

        if (empty($friend)) {
            return ResponseHelper::error('该好友不存在');
        }

        $friendSettings = FriendSettings::where(['userId' => $userId, 'companyId' => $companyId,'friendId' => $friendId,'wechatAccountId' => $wechatAccountId])->find();
        Db::startTrans();
        try {
            if (empty($friendSettings)) {
                $friendSettings = new FriendSettings();
                $friendSettings->companyId = $companyId;
                $friendSettings->userId = $userId;
                $friendSettings->type = $type;
                $friendSettings->wechatAccountId = $wechatAccountId;
                $friendSettings->friendId = $friendId;
                $friendSettings->createTime = time();
                $friendSettings->updateTime = time();
            }else{
                $friendSettings->type = $type;
                $friendSettings->updateTime = time();
            }
            $friendSettings->save();
            Db::commit();
            return ResponseHelper::success(' ', '配置成功');
        } catch (\Exception $e) {
            Db::rollback();
            return ResponseHelper::error('配置失败：' . $e->getMessage());
        }

    }




    public function setAllFriend()
    {
        $packageId = $this->request->param('packageId', []);
        $type = $this->request->param('type', 0);
        $isUpdata = $this->request->param('isUpdata', 0);

        $userId = $this->getUserInfo('id');
        $companyId = $this->getUserInfo('companyId');

        if (empty($packageId)) {
            return ResponseHelper::error('参数缺失');
        }
        //列出所有好友
        $row = Db::name('traffic_source_package_item')->alias('a')
            ->join('wechat_friendship f','a.identifier = f.wechatId and f.companyId = '.$companyId)
            ->join(['s2_wechat_account' => 'wa'],'f.ownerWechatId = wa.wechatId')
            ->whereIn('a.packageId' , $packageId)
            ->field('f.id as friendId,wa.id as wechatAccountId')
            ->group('f.id')
            ->select();

        if (empty($row)) {
            return ResponseHelper::error('`好友不存在');
        }






        // 1000条为一组进行批量处理
        $batchSize = 1000;
        $totalRows = count($row);

        for ($i = 0; $i < $totalRows; $i += $batchSize) {
            $batchRows = array_slice($row, $i, $batchSize);
            if (!empty($batchRows)) {
                // 1. 提取当前批次的phone
                $friendIds = array_column($batchRows, 'friendId');
                // 2. 批量查询已存在的phone
                $existingPhones = [];
                if (!empty($friendIds)) {
                    //强制更新
                    if(!empty($isUpdata)){
                        FriendSettings::whereIn('friendId',$friendIds)->update(['type' => $type,'updateTime' => time()]);
                    }

                    $existing = FriendSettings::where('companyId', $companyId)->where('friendId', 'in', $friendIds)->field('friendId')->select()->toArray();
                    $existingPhones = array_column($existing, 'friendId');
                }

                // 3. 过滤出新数据，批量插入
                $newData = [];
                foreach ($batchRows as $row) {
                    if (!empty($friendIds) && !in_array($row['friendId'], $existingPhones)) {
                        $newData[] = [
                            'companyId' => $companyId,
                            'userId' => $userId,
                            'type' => $type,
                            'wechatAccountId' => $row['wechatAccountId'],
                            'friendId' => $row['friendId'],
                            'createTime' => time(),
                            'updateTime' => time(),
                        ];
                    }
                }
                // 4. 批量插入新数据
                if (!empty($newData)) {
                    FriendSettings::insertAll($newData);
                }
            }
        }
        try {
            return ResponseHelper::success(' ', '配置成功');
        } catch (\Exception $e) {
            return ResponseHelper::error('配置失败：' . $e->getMessage());
        }

    }

}