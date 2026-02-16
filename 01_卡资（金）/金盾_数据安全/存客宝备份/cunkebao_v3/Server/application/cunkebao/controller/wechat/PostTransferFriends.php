<?php

namespace app\cunkebao\controller\wechat;

use app\cunkebao\controller\BaseController;
use app\cunkebao\controller\plan\PostCreateAddFriendPlanV1Controller;
use library\ResponseHelper;
use think\Db;

class PostTransferFriends extends BaseController
{
    public function index()
    {
        $wechatId = $this->request->param('wechatId', '');
        $inherit = $this->request->param('inherit', '');
        $greeting = $this->request->param('greeting', '');
        $firstMessage = $this->request->param('firstMessage', '');
        $devices = $this->request->param('devices', []);
        $companyId = $this->getUserInfo('companyId');


        if (empty($wechatId)){
            return ResponseHelper::error('迁移的微信不能为空');
        }

        if (empty($devices)){
            return ResponseHelper::error('迁移的设备不能为空');
        }
        if (empty($greeting)){
            return ResponseHelper::error('打招呼不能为空');
        }
        if (!is_array($devices)){
            return ResponseHelper::error('迁移的设备必须为数组');
        }

        $wechat = Db::name('wechat_customer')->alias('wc')
            ->join('wechat_account wa', 'wc.wechatId = wa.wechatId')
            ->where(['wc.wechatId' => $wechatId])
            ->field('wa.*')
            ->find();

        if (empty($wechat)) {
            return ResponseHelper::error('该微信不存在');
        }

        $devices = Db::name('device')
            ->where(['companyId' => $companyId,'deleteTime' => 0])
            ->whereIn('id', $devices)
            ->column('id');





        try {
            $sceneConf = [
                'enabled' => true,
                'posters' => [
                    'id' => 'poster-3',
                    'name' => '点击咨询',
                    'src' => 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/%E7%82%B9%E5%87%BB%E5%92%A8%E8%AF%A2-FTiyAMAPop2g9LvjLOLDz0VwPg3KVu.gif'
                ]
            ];
            $reqConf = [
                'device' => $devices,
                'startTime' => '09:00',
                'endTime' => '18:00',
                'remarkType' => 'phone',
                'addFriendInterval' => 60,
                'greeting' => !empty($greeting) ? $greeting :'我是'. $wechat['nickname'] .'的新号，请通过'
            ];

            if (!empty($firstMessage)){
                $msgConf = [
                    [
                        'day' => 0,
                        'messages' => [
                            [
                                'id' => 1,
                                'type' => 'text',
                                'content' => $firstMessage,
                                'intervalUnit' => 'seconds',
                                'sendInterval' => 5,
                            ]
                        ]
                    ]
                ];
            }else{
                $msgConf = [];
            }

            // 使用容器获取控制器实例，而不是直接实例化
            $createAddFriendPlan = app('app\cunkebao\controller\plan\PostCreateAddFriendPlanV1Controller');

            $taskId = Db::name('customer_acquisition_task')->insertGetId([
                'name' => '迁移好友（'. $wechat['nickname'] .'）',
                'sceneId' => 10,
                'sceneConf' => json_encode($sceneConf,256),
                'reqConf' => json_encode($reqConf,256),
                'tagConf' => json_encode([]),
                'msgConf' => json_encode($msgConf,256),
                'userId' => $this->getUserInfo('id'),
                'companyId' => $companyId,
                'status' => 0,
                'createTime' => time(),
                'apiKey' => $createAddFriendPlan->generateApiKey(),
            ]);

            $friends = Db::table('s2_wechat_friend')
                ->where(['ownerWechatId' => $wechatId])
                ->group('wechatId')
                ->order('id DESC')
                ->column('id', 'wechatId,alias,phone,labels,conRemark');

            // 1000条为一组进行批量处理
            $batchSize = 1000;
            $totalRows = count($friends);

            for ($i = 0; $i < $totalRows; $i += $batchSize) {
                $batchRows = array_slice($friends, $i, $batchSize);
                if (!empty($batchRows)) {
                    $newData = [];
                    foreach ($batchRows as $row) {
                        if (!empty($row['phone'])) {
                            $phone = $row['phone'];
                        } elseif (!empty($row['alias'])) {
                            $phone = $row['alias'];
                        } else {
                            $phone = $row['wechatId'];
                        }

                        $tags = !empty($row['labels']) ? json_decode($row['labels'], true) : [];
                        $newData[] = [
                            'task_id' => $taskId,
                            'name' => '',
                            'source' => '迁移好友（'. $wechat['nickname'] .'）',
                            'phone' => $phone,
                            'remark' => !empty($inherit) ? $row['conRemark'] : '',
                            'tags' => !empty($inherit) ? json_encode($tags, JSON_UNESCAPED_UNICODE) : json_encode([]),
                            'siteTags' => json_encode([]),
                            'status' => 0,
                            'createTime' => time(),
                        ];
                    }
                    Db::name('task_customer')->insertAll($newData);
                }
            }
            return ResponseHelper::success('好友迁移创建成功' );
        } catch (\Exception $e) {
            // 回滚事务
            Db::rollback();
            return ResponseHelper::error('好友迁移创建失败：' . $e->getMessage());
        }


    }
}