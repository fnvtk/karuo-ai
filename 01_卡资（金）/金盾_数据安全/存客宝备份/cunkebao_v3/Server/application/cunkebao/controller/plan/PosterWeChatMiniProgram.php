<?php

namespace app\cunkebao\controller\plan;

use think\Controller;
use think\Request;
use EasyWeChat\Factory;
use think\facade\Env;

// use EasyWeChat\Kernel\Exceptions\DecryptException;
use EasyWeChat\Kernel\Http\StreamResponse;
use think\Db;

class PosterWeChatMiniProgram extends Controller
{

    protected $config;


    public function __construct()
    {
        parent::__construct();

        // 从环境变量获取配置
        $this->config = [
            'app_id' =>  Env::get('weChat.appidMiniApp','wx789850448e26c91d'),
            'secret' =>  Env::get('weChat.secretMiniApp','d18f75b3a3623cb40da05648b08365a1'),
            'response_type' => 'array'
        ];
    }


    public function index()
    {
        return 'Hello, World!';
    }


    // 生成小程序码，存客宝-操盘手调用
    public function generateMiniProgramCodeWithScene($taskId = '', $channelId = 0)
    {

        if (empty($taskId)) {
            return json_encode(['code' => 500, 'data' => '', 'msg' => '任务id不能为空']);
        }


        try {
            $app = Factory::miniProgram($this->config);
            // scene参数长度限制为32位
            // 如果提供了channelId，格式为：taskId,channelId
            // 如果没有channelId，格式为：taskId
            if (!empty($channelId) && $channelId > 0) {
                $scene = sprintf("%s,%s", $taskId, $channelId);
            } else {
                $scene = sprintf("%s", $taskId);
            }
            
            // 确保scene长度不超过32位
            if (strlen($scene) > 32) {
                $scene = substr($scene, 0, 32);
            }
            
            // 调用接口生成小程序码
            $response = $app->app_code->getUnlimit($scene, [
                'page' => 'pages/poster/index2',  // 必须是已经发布的小程序页面
                'width' => 430,  // 二维码的宽度，默认430
                // 'auto_color' => false,  // 自动配置线条颜色
                // 'line_color' => ['r' => 0, 'g' => 0, 'b' => 0],  // 颜色设置
                // 'is_hyaline' => false,  // 是否需要透明底色
            ]);
            // 保存小程序码到文件
            if ($response instanceof StreamResponse) {
                // $filename = 'minicode_' . $taskId . '.png';
                // $response->saveAs('path/to/codes', $filename);
                // return 'path/to/codes/' . $filename;

                $img = $response->getBody()->getContents();//获取图片二进制流
                $img_base64 = 'data:image/png;base64,' . base64_encode($img);//转化base64
                return json_encode(['code' => 200, 'data' => $img_base64]);
            }
        } catch (\Exception $e) {
            return json_encode(['code' => 500, 'data' => '', 'msg' => $e->getMessage()]);
        }
    }

    // getPhoneNumber
    public function getPhoneNumber()
    {

        $taskId = request()->param('id');
        $code = request()->param('code');
        // code 不能为空
        if (!$code) {
            return json([
                'code' => 400,
                'message' => 'code不能为空'
            ]);
        }

        $task = Db::name('customer_acquisition_task')->where('id', $taskId)->find();
        if (!$task) {
            return json([
                'code' => 400,
                'message' => '任务不存在'
            ]);
        }

        $app = Factory::miniProgram($this->config);

        $result = $app->phone_number->getUserPhoneNumber($code);

        if ($result['errcode'] == 0 && isset($result['phone_info']['phoneNumber'])) {

            // TODO 拿到手机号之后的后续操作： 
            // 1. 先写入 ck_traffic_pool 表 identifier  mobile 都是 用 phone字段的值
            $trafficPool = Db::name('traffic_pool')->where('identifier', $result['phone_info']['phoneNumber'])->find();
            if (!$trafficPool) {
                Db::name('traffic_pool')->insert([
                    'identifier' => $result['phone_info']['phoneNumber'],
                    'mobile' => $result['phone_info']['phoneNumber'],
                    'createTime' => time()
                ]);
            }
            // 2. 写入 ck_task_customer: 以 task_id ~~identifier~~ phone 为条件，如果存在则忽略，使用类似laravel的firstOrcreate（但我不知道thinkphp5.1里的写法）
            // $taskCustomer = Db::name('task_customer')->where('task_id', $taskId)->where('identifier', $result['phone_info']['phoneNumber'])->find();
            $taskCustomer = Db::name('task_customer')
                ->where('task_id', $taskId)
                ->where('phone', $result['phone_info']['phoneNumber'])
                ->find();
            if (!$taskCustomer) {
                // 渠道ID（cid），对应 distribution_channel.id
                $channelId = intval($this->request->param('cid', 0));

                $finalChannelId = 0;
                if ($channelId > 0) {
                    // 获取任务信息，解析分销配置
                    $sceneConf = json_decode($task['sceneConf'] ?? '[]', true) ?: [];
                    $distributionConfig = $sceneConf['distribution'] ?? null;
                    $allowedChannelIds = $distributionConfig['channels'] ?? [];
                    if (!empty($distributionConfig) && !empty($distributionConfig['enabled']) && in_array($channelId, $allowedChannelIds)) {
                        // 验证渠道是否存在且正常
                        $channel = Db::name('distribution_channel')
                            ->where([
                                ['id', '=', $channelId],
                                ['companyId', '=', $task['companyId']],
                                ['status', '=', 'enabled'],
                                ['deleteTime', '=', 0]
                            ])
                            ->find();
                        if ($channel) {
                            $finalChannelId = $channelId;
                        }
                    }
                }

                $customerId = Db::name('task_customer')->insertGetId([
                    'task_id' => $taskId,
                    'channelId' => $finalChannelId,
                    // 'identifier' => $result['phone_info']['phoneNumber'],
                    'phone' => $result['phone_info']['phoneNumber'],
                    'source' => $task['name'],
                    'createTime' => time(),
                    'tags' => json_encode([]),
                    'siteTags' => json_encode([]),
                ]);
                
                // 记录获客奖励（异步处理，不影响主流程）
                if ($customerId) {
                    try {
                        if ($finalChannelId > 0) {
                            \app\cunkebao\service\DistributionRewardService::recordCustomerReward(
                                $taskId,
                                $customerId,
                                $result['phone_info']['phoneNumber'],
                                $finalChannelId
                            );
                        }
                    } catch (\Exception $e) {
                        // 记录错误但不影响主流程
                        \think\facade\Log::error('记录获客奖励失败：' . $e->getMessage());
                    }
                }
            }
            // return $result['phone_info']['phoneNumber'];
            return json([
                'code' => 200,
                'message' => '获取手机号成功',
                'data' => $result['phone_info']['phoneNumber']
            ]);
        } else {
            // return null;
            return json([
                'code' => 400,
                'message' => '获取手机号失败: ' . $result['errmsg'] ?? '未知错误'
            ]);
        }

        // return $result;

    }


    public function decryptphones()
    {

        $taskId = request()->param('id');
        $rawInput = trim((string)request()->param('phone', ''));
        // 渠道ID（cid），对应 distribution_channel.id
        $channelId = intval(request()->param('cid', 0));
        if ($rawInput === '') {
            return json([
                'code' => 400,
                'message' => '手机号或微信号不能为空'
            ]);
        }
        $task = Db::name('customer_acquisition_task')->where('id', $taskId)->find();

        if (!$task) {
            return json([
                'code' => 400,
                'message' => '任务不存在'
            ]);
        }

        // 预先根据任务的分销配置校验渠道是否有效（仅当传入了cid时）
        $finalChannelId = 0;
        if ($channelId > 0) {
            $sceneConf = json_decode($task['sceneConf'] ?? '[]', true) ?: [];
            $distributionConfig = $sceneConf['distribution'] ?? null;
            $allowedChannelIds = $distributionConfig['channels'] ?? [];
            if (!empty($distributionConfig) && !empty($distributionConfig['enabled']) && in_array($channelId, $allowedChannelIds)) {
                // 验证渠道是否存在且正常
                $channel = Db::name('distribution_channel')
                    ->where([
                        ['id', '=', $channelId],
                        ['companyId', '=', $task['companyId']],
                        ['status', '=', 'enabled'],
                        ['deleteTime', '=', 0]
                    ])
                    ->find();
                if ($channel) {
                    $finalChannelId = $channelId;
                }
            }
        }


        $lines = preg_split('/\r\n|\r|\n/', $rawInput);
        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '') {
                continue;
            }
            $parts = array_map('trim', explode(',', $line, 2));
            $identifier = $parts[0] ?? '';
            $remark = $parts[1] ?? '';
            if ($identifier === '') {
                continue;
            }
            $isPhone = preg_match('/^\+?\d{6,}$/', $identifier);
            $trafficPool = Db::name('traffic_pool')->where('identifier', $identifier)->find();
            if (!$trafficPool) {
                $insertData = [
                    'identifier' => $identifier,
                    'createTime' => time()
                ];
                if ($isPhone) {
                    $insertData['mobile'] = $identifier;
                } else {
                    $insertData['wechatId'] = $identifier;
                }
                Db::name('traffic_pool')->insert($insertData);
            } else {
                $updates = [];
                if ($isPhone && empty($trafficPool['mobile'])) {
                    $updates['mobile'] = $identifier;
                }
                if (!$isPhone && empty($trafficPool['wechatId'])) {
                    $updates['wechatId'] = $identifier;
                }
                if (!empty($updates)) {
                    $updates['updateTime'] = time();
                    Db::name('traffic_pool')->where('id', $trafficPool['id'])->update($updates);
                }
            }

            $taskCustomer = Db::name('task_customer')
                ->where('task_id', $taskId)
                ->where('phone', $identifier)
                ->find();
            if (empty($taskCustomer)) {
                $insertCustomer = [
                    'task_id'   => $taskId,
                    'channelId' => $finalChannelId, // 记录本次导入归属的分销渠道（如有）
                    'phone'     => $identifier,
                    'source'    => $task['name'],
                    'createTime'=> time(),
                    'tags'      => json_encode([]),
                    'siteTags'  => json_encode([]),
                ];
                if ($remark !== '') {
                    $insertCustomer['remark'] = $remark;
                }
                // 使用 insertGetId 以便在需要时记录获客奖励
                $customerId = Db::name('task_customer')->insertGetId($insertCustomer);

                // 表单录入成功即视为一次获客：
                // 仅在存在有效渠道ID时，记录获客奖励（谁的cid谁获客）
                if (!empty($customerId) && $finalChannelId > 0) {
                    try {
                        \app\cunkebao\service\DistributionRewardService::recordCustomerReward(
                            $taskId,
                            $customerId,
                            $identifier,
                            $finalChannelId
                        );
                    } catch (\Exception $e) {
                        // 记录错误但不影响主流程
                        \think\facade\Log::error('记录获客奖励失败：' . $e->getMessage());
                    }
                }
            } elseif ($remark !== '' && $taskCustomer['remark'] !== $remark) {
                Db::name('task_customer')
                    ->where('id', $taskCustomer['id'])
                    ->update([
                        'remark' => $remark,
                        'updateTime' => time()
                    ]);
            }

        }

        // return $phone;
        return json([
            'code' => 200,
            'message' => '操作成功',
        ]);

    }

    // return $result;


// todo 获取海报获客任务的任务/海报数据 -- 表还没设计好，不急 ck_customer_acquisition_task
    public
    function getPosterTaskData()
    {
        $id = request()->param('id');
        $oldId = request()->param('oldId');
        
        // 兼容旧数据：如果传了 oldId，通过 legacyId 和 isLegacy 查找
        if (!empty($oldId)) {
            $task = Db::name('customer_acquisition_task')
                ->where([
                    'legacyId' => $oldId,
                    'isLegacy' => 1,
                    'deleteTime' => 0
                ])
                ->field('id,name,sceneConf,status')
                ->find();
        } elseif (!empty($id)) {
            // 新数据：直接用 id 查找
            $task = Db::name('customer_acquisition_task')
                ->where(['id' => $id, 'deleteTime' => 0])
                ->field('id,name,sceneConf,status')
                ->find();
        } else {
            return json([
                'code' => 400,
                'message' => '任务ID不能为空'
            ]);
        }
        
        if (!$task) {
            return json([
                'code' => 400,
                'message' => '任务不存在'
            ]);
        }

        if ($task['status'] == 0) {
            return json([
                'code' => 400,
                'message' => '任务已结束'
            ]);
        }

        $sceneConf = json_decode($task['sceneConf'], true);

        if (isset($sceneConf['posters']['url']) && !empty($sceneConf['posters']['url'])) {
            $posterUrl = $sceneConf['posters']['url'];
        } else {
            $posterUrl = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/%E7%82%B9%E5%87%BB%E5%92%A8%E8%AF%A2-FTiyAMAPop2g9LvjLOLDz0VwPg3KVu.gif';
        }


        if (isset($sceneConf['tips'])) {
            $sTip = $sceneConf['tips'];
        } else {
            $sTip = '';
        }

        unset($task['sceneConf']);
        $task['sTip'] = $sTip;

        $data = [
            'id' => $task['id'],
            'name' => $task['name'],
            'poster' => ['sUrl' => $posterUrl],
            'task' => $task,
        ];


        // todo 只需 返回 poster_url  success_tip
        return json([
            'code' => 200,
            'message' => '获取海报获客任务数据成功',
            'data' => $data
        ]);
    }


}