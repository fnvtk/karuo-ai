<?php

namespace WeChatDeviceApi\Adapters\ChuKeBao;

use think\facade\Cache;
use think\facade\Env;
use WeChatDeviceApi\Contracts\WeChatServiceInterface;
use WeChatDeviceApi\Exceptions\ApiException;

// 如果有 Client.php
// use WeChatDeviceApi\Adapters\ChuKeBao\Client as ChuKeBaoApiClient;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;
use GuzzleHttp\Exception\RequestException;
use GuzzleHttp\Psr7\Request;
use think\Db;
use think\facade\Config;
use think\facade\Log;
use app\api\controller\FriendTaskController;
use app\common\service\AuthService;
use app\common\service\WechatAccountHealthScoreService;
use app\api\controller\WebSocketController;
use Workerman\Lib\Timer;
use app\cunkebao\service\DistributionRewardService;

class Adapter implements WeChatServiceInterface
{
    protected $config;

    // protected $apiClient; // 如果使用 VendorAApiClient

    public function __construct(array $config = [])
    {

        // $this->config = $config ?: Config::get('wechat_device_api.');
        $this->config = $config ?: Config::get('wechat_device_api.adapters.ChuKeBao');
        // $this->config = $config;
        // $this->apiClient = new ChuKeBaoApiClient($config['api_key'], $config['api_secret'], $config['base_url']);
        // 校验配置等...
        if (empty($this->config['base_url']) || empty($this->config['username']) || empty($this->config['password'])) {
            throw new \InvalidArgumentException("ChuKeBao username and password are required.");
        }
    }

    public function addFriend(string $deviceId, string $targetWxId): bool
    {
        // 1. 构建请求参数 (ChuKeBao 特定的格式)
        $params = [
            'device_identifier' => $deviceId,
            'wechat_user_to_add' => $targetWxId,
            'username' => $this->config['username'],
            'password' => $this->config['password'],
            // ... 其他 ChuKeBao 特定参数
        ];

        // 2. 调用 ChuKeBao 的 API (例如使用 GuzzleHttp 或 cURL)
        // $response = $this->apiClient->post('/friend/add', $params);
        // 伪代码:
        $url = $this->config['base_url'] . '/friend/add';
        // $httpClient = new \GuzzleHttp\Client();
        // $response = $httpClient->request('POST', $url, ['form_params' => $params]);
        // $responseData = json_decode($response->getBody()->getContents(), true);

        // 模拟API调用
        echo "ChuKeBao: Adding friend {$targetWxId} using device {$deviceId}\n";
        $responseData = ['code' => 0, 'message' => 'Success']; // 假设的响应

        // 3. 处理响应，转换为标准结果
        if (!isset($responseData['code'])) {
            throw new ApiException("ChuKeBao: Invalid API response for addFriend.");
        }

        if ($responseData['code'] !== 0) {
            throw new ApiException("ChuKeBao: Failed to add friend - " . ($responseData['message'] ?? 'Unknown error'));
        }

        return true;
    }

    public function likeMoment(string $deviceId, string $momentId): bool
    {
        echo "ChuKeBao: Liking moment {$momentId} using device {$deviceId}\n";
        // 实现 VendorA 的点赞逻辑
        return true;
    }

    public function getGroupList(string $deviceId): array
    {
        echo "ChuKeBao: Getting group list for device {$deviceId}\n";
        // 实现 VendorA 的获取群列表逻辑，并转换数据格式
        return [
            ['id' => 'group1_va', 'name' => 'ChuKeBao Group 1', 'member_count' => 10],
        ];
    }

    public function getFriendList(string $deviceId): array
    {
        echo "VendorA: Getting friend list for device {$deviceId}\n";
        return [
            ['id' => 'friend1_va', 'nickname' => 'ChuKeBao Friend 1', 'remark' => 'VA-F1'],
        ];
    }

    public function getDeviceInfo(string $deviceId): array
    {
        echo "ChuKeBao: Getting device info for device {$deviceId}\n";
        return ['id' => $deviceId, 'status' => 'online_va', 'battery' => '80%'];
    }

    public function bindDeviceToCompany(string $deviceId, string $companyId): bool
    {
        echo "ChuKeBao: Binding device {$deviceId} to company {$companyId}\n";
        return true;
    }

    /**
     * 获取群成员列表
     * @param string $deviceId 设备ID
     * @param string $chatroomId 群ID
     * @return array 群成员列表
     */
    public function getChatroomMemberList(string $deviceId, string $chatroomId): array
    {
        echo "ChuKeBao: Getting chatroom member list for device {$deviceId}, chatroom {$chatroomId}\n";
        return [
            ['id' => 'member1_va', 'nickname' => 'VendorA Member 1', 'avatar' => ''],
        ];
    }

    /**
     * 获取指定微信的朋友圈内容/列表
     * @param string $deviceId 设备ID
     * @param string $wxId 微信ID
     * @return array 朋友圈列表
     */
    public function getMomentList(string $deviceId, string $wxId): array
    {
        echo "VendorA: Getting moment list for device {$deviceId}, wxId {$wxId}\n";
        return [
            ['id' => 'moment1_va', 'content' => 'VendorA Moment 1', 'created_at' => time()],
        ];
    }


    /**
     * 发送微信朋友圈
     * @param string $deviceId 设备ID
     * @param string $wxId 微信ID
     * @param string $moment 朋友圈内容
     * @return bool 是否成功
     */
    public function sendMoment(string $deviceId, string $wxId, string $moment): bool
    {
        echo "VendorA: Sending moment for device {$deviceId}, wxId {$wxId}, content: {$moment}\n";
        return true;
    }

    public function handleCustomerTaskWithStatusIsNew(int $current_worker_id, int $process_count_for_status_0)
    {
        $task = Db::name('customer_acquisition_task')
            ->where(['status' => 1, 'deleteTime' => 0])
          /*  ->whereRaw("id % $process_count_for_status_0 = {$current_worker_id}")*/
            ->order('id desc')
            ->select();

        if (empty($task)) {
            return false;
        }

        $taskData = [];
        foreach ($task as $item) {
            $reqConf = json_decode($item['reqConf'], true);
            $device = $reqConf['device'] ?? [];
            $deviceCount = count($device);
            if ($deviceCount <= 0) {
                continue;
            }
            $tasks = Db::name('task_customer')
                ->where(['status' => 0, 'task_id' => $item['id']])
                ->order('id DESC')
                ->limit($deviceCount)
                ->select();
            $taskData = array_merge($taskData, $tasks);
        }
        if ($taskData) {

            foreach ($taskData as $task) {
                $task_id = $task['task_id'];
                $task_info = $this->getCustomerAcquisitionTask($task_id);
                if (empty($task_info['status']) || empty($task_info['reqConf']) || empty($task_info['reqConf']['device'])) {
                    continue;
                }
                //筛选出设备在线微信在线
                $wechatIdAccountIdMap = $this->getWeChatIdsAccountIdsMapByDeviceIds($task_info['reqConf']['device']);
                if (empty($wechatIdAccountIdMap)) {
                    continue;
                }

                $friendAddTaskCreated = false;
                foreach ($wechatIdAccountIdMap as $accountId => $wechatId) {
                    // 是否已经是好友的判断，如果已经是好友，直接break; 但状态还是维持1，让另外一个进程处理发消息的逻辑
                    $wechatTags = json_decode($task['tags'], true);
                    $isFriend = $this->checkIfIsWeChatFriendByPhone($wechatId, $task['phone'], $task['siteTags']);
                    if (!empty($isFriend)) {
                        $friendAddTaskCreated = true;
                        $task['processed_wechat_ids'] = $task['processed_wechat_ids'] . ',' . $wechatId; // 处理失败任务用，用于过滤已处理的微信号
                        break;
                    }

                    // 判断时间间隔\时间段和最后一次的状态
                    $canCreateFriendAddTask = $this->checkIfCanCreateFriendAddTask($wechatId, $task_info['reqConf']);
                    if (empty($canCreateFriendAddTask)) {
                        continue;
                    }

                    // 根据健康分判断24h内加的好友数量限制
                    $healthScoreService = new WechatAccountHealthScoreService();
                    $healthScoreInfo = $healthScoreService->getHealthScore($accountId);

                    // 如果健康分记录不存在，先计算一次
                    if (empty($healthScoreInfo)) {
                        try {
                            $healthScoreService->calculateAndUpdate($accountId);
                            $healthScoreInfo = $healthScoreService->getHealthScore($accountId);
                        } catch (\Exception $e) {
                            Log::error("计算健康分失败 (accountId: {$accountId}): " . $e->getMessage());
                            // 如果计算失败，使用默认值5作为兜底
                            $maxAddFriendPerDay = 5;
                        }
                    }

                    // 获取每日最大加人次数（基于健康分）
                    $maxAddFriendPerDay = $healthScoreInfo['maxAddFriendPerDay'] ?? 5;

                    // 如果健康分为0或很低，不允许添加好友
                    if ($maxAddFriendPerDay <= 0) {
                        Log::info("账号健康分过低，不允许添加好友 (accountId: {$accountId}, wechatId: {$wechatId}, healthScore: " . ($healthScoreInfo['healthScore'] ?? 0) . ")");
                        continue;
                    }
                    
                    // 检查频繁暂停限制：首次频繁或再次频繁，暂停24小时
                    $lastFrequentTime = $healthScoreInfo['lastFrequentTime'] ?? null;
                    $frequentCount = $healthScoreInfo['frequentCount'] ?? 0;
                    if (!empty($lastFrequentTime) && $frequentCount > 0) {
                        $frequentPauseHours = 24; // 频繁暂停24小时
                        $frequentPauseTime = $lastFrequentTime + ($frequentPauseHours * 3600);
                        $currentTime = time();
                        
                        if ($currentTime < $frequentPauseTime) {
                            $remainingHours = ceil(($frequentPauseTime - $currentTime) / 3600);
                            Log::info("账号频繁，暂停添加好友 (accountId: {$accountId}, wechatId: {$wechatId}, frequentCount: {$frequentCount}, 剩余暂停时间: {$remainingHours}小时)");
                            continue;
                        }
                    }
                    
                    // 检查封号暂停限制：封号暂停72小时
                    $isBanned = $healthScoreInfo['isBanned'] ?? 0;
                    if ($isBanned == 1) {
                        // 查询封号时间（从s2_wechat_message表查询最近一次封号消息）
                        $banMessage = Db::table('s2_wechat_message')
                            ->where('wechatAccountId', $accountId)
                            ->where('msgType', 10000)
                            ->where('content', 'like', '%你的账号被限制%')
                            ->where('isDeleted', 0)
                            ->order('createTime', 'desc')
                            ->find();
                        
                        if (!empty($banMessage)) {
                            $banTime = $banMessage['createTime'] ?? 0;
                            $banPauseHours = 72; // 封号暂停72小时
                            $banPauseTime = $banTime + ($banPauseHours * 3600);
                            $currentTime = time();
                            
                            if ($currentTime < $banPauseTime) {
                                $remainingHours = ceil(($banPauseTime - $currentTime) / 3600);
                                Log::info("账号封号，暂停添加好友 (accountId: {$accountId}, wechatId: {$wechatId}, 剩余暂停时间: {$remainingHours}小时)");
                                continue;
                            }
                        }
                    }
                    
                    // 判断今天添加的好友数量，使用健康分计算的每日最大加人次数
                    // 优先使用今天添加的好友数量（更符合"每日"限制）
                    $todayAddedFriendsCount = $this->getTodayAddedFriendsCount($wechatId);
                    if ($todayAddedFriendsCount >= $maxAddFriendPerDay) {
                        Log::info("今天添加好友数量已达上限 (accountId: {$accountId}, wechatId: {$wechatId}, count: {$todayAddedFriendsCount}, max: {$maxAddFriendPerDay}, healthScore: " . ($healthScoreInfo['healthScore'] ?? 0) . ")");
                        continue;
                    }
                    
                    // 如果今天添加数量未达上限，再检查24小时内的数量（作为额外保护）
                    $last24hAddedFriendsCount = $this->getLast24hAddedFriendsCount($wechatId);
                    // 24小时内的限制可以稍微宽松一些，设置为每日限制的1.2倍（防止跨天累积）
                    $max24hLimit = (int)ceil($maxAddFriendPerDay * 1.2);
                    if ($last24hAddedFriendsCount >= $max24hLimit) {
                        Log::info("24小时内添加好友数量已达上限 (accountId: {$accountId}, wechatId: {$wechatId}, count: {$last24hAddedFriendsCount}, max24h: {$max24hLimit}, maxDaily: {$maxAddFriendPerDay})");
                        continue;
                    }

                    // 采取乐观尝试的策略，假设第一个可以添加的人可以添加成功的; 回头再另外一个任务进程去判断

                    // 创建好友添加任务， 对接触客宝
                    $tags = array_merge($task_info['tagConf']['customTags'], $task_info['tagConf']['scenarioTags']);
                    if (!empty($wechatTags)) {
                        $tags = array_merge($tags, $wechatTags);
                    }
                    $tags = array_unique($tags);
                    $tags = array_values($tags);
                    $conf = array_merge($task_info['reqConf'], ['task_name' => $task_info['name'], 'tags' => $tags]);


                    $this->createFriendAddTask($accountId, $task['phone'], $conf, $task['remark']);
                    $friendAddTaskCreated = true;
                    $task['processed_wechat_ids'] = $task['processed_wechat_ids'] . ',' . $wechatId; // 处理失败任务用，用于过滤已处理的微信号
                    break;
                }
                if (!empty($friendAddTaskCreated)){
                    Db::name('task_customer')
                        ->where('id', $task['id'])
                        ->update([
                            'status' => $friendAddTaskCreated ? 1 : 3,
                            'fail_reason' => '',
                            'processed_wechat_ids' => $task['processed_wechat_ids'],
                            'addTime' => time(),
                            'updateTime' => time()
                        ]);
                }
                // ~~不用管，回头再添加再判断即可~~
                // 失败一定是另一个进程/定时器在检查的

            }
        }
    }

    // 处理添加中的获客任务, only run in workerman process!
    public function handleCustomerTaskWithStatusIsCreated()
    {

        $tasks = Db::name('task_customer')
            ->whereIn('status', [1, 2])
            ->where('updateTime', '>=', (time() - 86400 * 3))
            ->limit(50)
            ->order('updateTime DESC')
            ->select();

        if (empty($tasks)) {
            return;
        }

        foreach ($tasks as $task) {
            $task_id = $task['task_id'];
            $task_info = $this->getCustomerAcquisitionTask($task_id);


            if (empty($task_info['status']) || empty($task_info['reqConf']) || empty($task_info['reqConf']['device'])) {
                continue;
            }

            if (empty($task['processed_wechat_ids'])) {
                continue;
            }

            $weChatIds = explode(',', $task['processed_wechat_ids']);
            $passedWeChatId = '';
            foreach ($weChatIds as $wechatId) {
                // 先是否是好友，如果不是好友，先查询执行状态，看是否还能以及需要换账号继续添加，还是直接更新状态为3
                // 如果添加成功，先更新为2，然后去发消息（先判断有无消息设置，发消息的log记录？）
                if (!empty($wechatId)) {
                    $isFriend = $this->checkIfIsWeChatFriendByPhone($wechatId, $task['phone']);
                    if ($isFriend) {
                        // 更新状态为5（已通过未发消息）
                        Db::name('task_customer')
                            ->where('id', $task['id'])
                            ->update(['status' => 5,'passTime' => time(), 'updateTime' => time()]);
                        $passedWeChatId = $wechatId;
                        break;
                    }
                }
            }


            if ($passedWeChatId) {
                // 获取好友记录（用于发消息 & 拉群）
                $wechatFriendRecord = $this->getWeChatAccoutIdAndFriendIdByWeChatIdAndFriendPhone($passedWeChatId, $task['phone']);
                if ($wechatFriendRecord) {
                    // 1. 如配置了消息，则先发送消息，并将状态置为4（已通过并已发消息）
                    if (!empty($task_info['msgConf'])) {
                        Db::name('task_customer')
                            ->where('id', $task['id'])
                            ->update(['status' => 4,'passTime' => time(), 'updateTime' => time()]);

                        // 记录添加好友奖励（如果之前没有记录过，status从其他状态变为4时）
                        if ($task['status'] != 2 && !empty($task['channelId'])) {
                            try {
                                DistributionRewardService::recordAddFriendReward(
                                    $task['task_id'],
                                    $task['id'],
                                    $task['phone'],
                                    intval($task['channelId'])
                                );
                            } catch (\Exception $e) {
                                // 记录错误但不影响主流程
                                Log::error('记录添加好友奖励失败：' . $e->getMessage());
                            }
                        }

                        $msgConf = is_string($task_info['msgConf']) ? json_decode($task_info['msgConf'], 1) : $task_info['msgConf'];
                        $this->sendMsgToFriend($wechatFriendRecord['id'], $wechatFriendRecord['wechatAccountId'], $msgConf);
                    }

                    // 2. 好友通过后，如配置了拉群，则建群并拉人：通过的好友 + 固定成员
                    $this->createGroupAfterFriendPass($task_info, $wechatFriendRecord['id'], $wechatFriendRecord['wechatAccountId']);
                    // 如果没有 msgConf，则保持之前更新的状态5（已通过未发消息）不变
                }

            } else {

                foreach ($weChatIds as $wechatId) {

                    // 查询执行状态
                    $latestFriendTask = $this->getLatestFriendTaskByPhoneAndWeChatId($task['phone'], $wechatId);
                    if (empty($latestFriendTask)) {
                        continue;
                    }

                    // 已经执行成功的话，直接break，同时更新对应task_customer的状态为2（添加成功）
                    if (isset($latestFriendTask['status']) && $latestFriendTask['status'] == 1) {
                        // 更新状态
                        Db::name('task_customer')
                            ->where('id', $task['id'])
                            ->update(['status' => 2, 'updateTime' => time()]);
                        
                        // 记录添加好友奖励（异步处理，不影响主流程）
                        if (!empty($task['channelId'])) {
                            try {
                                DistributionRewardService::recordAddFriendReward(
                                    $task['task_id'],
                                    $task['id'],
                                    $task['phone'],
                                    intval($task['channelId'])
                                );
                            } catch (\Exception $e) {
                                // 记录错误但不影响主流程
                                Log::error('记录添加好友奖励失败：' . $e->getMessage());
                            }
                        }
                        
                        break;
                    }

                    // todo 判断处理执行失败的情况 status=2，根据 extra 的描述去处理；-- 可以先直接更新为失败，然后 extra =》fail_reason -- 因为有专门的任务会处理失败的
                    if (isset($latestFriendTask['status']) && $latestFriendTask['status'] == 2) {
                        Db::name('task_customer')
                            ->where('id', $task['id'])
                            ->update(['status' => 3, 'fail_reason' => $latestFriendTask['extra'] ?? '未知原因', 'updateTime' => time()]);
                        break;
                    }
                }
            }
        }
    }


    public function handleCustomerTaskNewUser()
    {
        $task = Db::name('customer_acquisition_task')
            ->where(['status' => 1, 'deleteTime' => 0])
            ->whereIn('sceneId', [5, 7])
            ->order('id desc')
            ->select();

        if (empty($task)) {
            return false;
        }

        foreach ($task as $item) {
            $sceneConf = json_decode($item['sceneConf'], true);
            //电话
            if ($item['sceneId'] == 5) {
                $rows = Db::name('call_recording')
                    ->where('companyId', $item['companyId'])
                    ->group('phone')
                    ->field('id,phone')
                    ->order('id asc')
                    ->limit(0, 100)
                    ->select();
            }

            if ($item['sceneId'] == 7) {
                if (!empty($sceneConf['groupSelected']) && is_array($sceneConf['groupSelected'])) {
                    $rows = Db::name('wechat_group_member')->alias('gm')
                        ->join('wechat_account wa', 'gm.identifier = wa.wechatId')
                        ->where('gm.companyId', $item['companyId'])
                        ->whereIn('gm.groupId', $sceneConf['groupSelected'])
                        ->group('gm.identifier')
                        ->column('wa.id,wa.wechatId,wa.alias,wa.phone');
                }
            }


            if (in_array($item['sceneId'], [5, 7]) && !empty($rows) && is_array($rows)) {
                // 1000条为一组进行批量处理
                $batchSize = 1000;
                $totalRows = count($rows);

                for ($i = 0; $i < $totalRows; $i += $batchSize) {
                    $batchRows = array_slice($rows, $i, $batchSize);

                    if (!empty($batchRows)) {
                        // 1. 提取当前批次的phone
                        $phones = [];
                        foreach ($batchRows as $row) {
                            if (!empty($row['phone'])) {
                                $phone = !empty($row['phone']);
                            } elseif (!empty($row['alias'])) {
                                $phone = $row['alias'];
                            } else {
                                $phone = $row['wechatId'];
                            }
                            if (!empty($phone)) {
                                $phones[] = $phone;
                            }
                        }

                        // 2. 批量查询已存在的phone
                        $existingPhones = [];
                        if (!empty($phones)) {
                            $existing = Db::name('task_customer')
                                ->where('task_id', $item['id'])
                                ->where('phone', 'in', $phones)
                                ->field('phone')
                                ->select();
                            $existingPhones = array_column($existing, 'phone');
                        }

                        // 3. 过滤出新数据，批量插入
                        $newData = [];
                        foreach ($batchRows as $row) {
                            if (!empty($row['phone'])) {
                                $phone = !empty($row['phone']);
                            } elseif (!empty($row['alias'])) {
                                $phone = $row['alias'];
                            } else {
                                $phone = $row['wechatId'];
                            }
                            if (!empty($phone) && !in_array($phone, $existingPhones)) {
                                $newData[] = [
                                    'task_id' => $item['id'],
                                    'name' => '',
                                    'source' => '场景获客_' . $item['name'],
                                    'phone' => $phone,
                                    'tags' => json_encode([], JSON_UNESCAPED_UNICODE),
                                    'siteTags' => json_encode([], JSON_UNESCAPED_UNICODE),
                                    'createTime' => time(),
                                ];
                            }
                        }

                        // 4. 批量插入新数据
                        if (!empty($newData)) {
                            Db::name('task_customer')->insertAll($newData);
                        }
                    }
                }
            }


        }
    }


    // 发微信个人消息
    public function sendMsgToFriend(int $friendId, int $wechatAccountId, array $msgConf)
    {
        // 消息拼接  msgType(1:文本 3:图片 43:视频 47:动图表情包（gif、其他表情包） 49:小程序/其他：图文、文件)
        // 当前，type 为文本、图片、动图表情包的时候，content为string, 其他情况为对象 {type: 'file/link/...', url: '', title: '', thunmbPath: '', desc: ''}
        // $result = [
        //     "content" => $dataArray['content'],
        //     "msgSubType" => 0,
        //     "msgType" => $dataArray['msgType'],
        //     "seq" => time(),
        //     "wechatAccountId" => $dataArray['wechatAccountId'],
        //     "wechatChatroomId" => 0,
        //     "wechatFriendId" => $dataArray['wechatFriendId'],
        // ];
        $toAccountId = '';
        $username = Env::get('api.username', '');
        $password = Env::get('api.password', '');
        if (!empty($username) || !empty($password)) {
            $toAccountId = Db::name('users')->where('account', $username)->value('s2_accountId');
        }

        // 建立WebSocket
        $wsController = new WebSocketController(['userName' => $username, 'password' => $password, 'accountId' => $toAccountId]);


        $gap = 0;
        foreach ($msgConf as $messages) {
            foreach ($messages['messages'] as $content) {

                $msgType = 0;
                $detail = '';
                switch ($content['type']) {
                    case 'text':
                        $msgType = 1;
                        $detail = $content['content'];
                        break;
                    case 'image':
                        $msgType = 3;
                        $detail = $content['content'];
                        break;
                    case 'video':
                        $msgType = 43;
                        $detail = $content['content'];
                        break;

                    case 'file':
                        $msgType = 49;

                        $detail = [
                            'type' => 'file',
                            'title' => $content['content'][0]['name'],
                            'url' => $content['content'][0]['url'],
                        ];
                        $detail = json_encode($detail);
                        break;

                    case 'miniprogram':
                        $msgType = 49;
                        $detail = '';
                        break;

                    case 'link':
                        $msgType = 49;
                        $detail = [
                            'type' => 'link',
                            'title' => $content['title'],
                            'url' => $content['linkUrl'],
                            'thumbPath' => $content['cover'],
                            'desc' => $content['description'],
                        ];
                        $detail = json_encode($detail);
                        break;

                    case 'group':
                        $msgType = 49;
                        $detail = '';
                        break;
                    default :
                        $msgType = 47;
                        $detail = $content['content'];
                        break;
                }


                if (empty($detail)) {
                    continue;
                }

                if ($gap) {
                    Timer::add($gap, function () use ($wsController, $friendId, $wechatAccountId, $msgType, $content, $detail) {
                        $wsController->sendPersonal([
                            'wechatFriendId' => $friendId,
                            'wechatAccountId' => $wechatAccountId,
                            'msgType' => $msgType,
                            'content' => $detail,
                        ]);
                    }, [], false);
                } else {
                    $wsController->sendPersonal([
                        'wechatFriendId' => $friendId,
                        'wechatAccountId' => $wechatAccountId,
                        'msgType' => $msgType,
                        'content' => $detail,
                    ]);
                }

                !empty($content['sendInterval']) && $gap += $content['sendInterval'];
            }
        }

    }

    // getCustomerAcquisitionTask
    public function getCustomerAcquisitionTask($id)
    {
        // 先读取缓存
        $task_info = Db::name('customer_acquisition_task')
            ->where('id', $id)
            ->find();
        if ($task_info) {
            $task_info['sceneConf'] = json_decode($task_info['sceneConf'], true);
            $task_info['reqConf'] = json_decode($task_info['reqConf'], true);
            $task_info['msgConf'] = json_decode($task_info['msgConf'], true);
            $task_info['tagConf'] = json_decode($task_info['tagConf'], true);
            // 处理拉群固定成员配置（JSON 字段）
            if (!empty($task_info['groupFixedMembers'])) {
                $fixedMembers = json_decode($task_info['groupFixedMembers'], true);
                $task_info['groupFixedMembers'] = is_array($fixedMembers) ? $fixedMembers : [];
            } else {
                $task_info['groupFixedMembers'] = [];
            }
        }
        return $task_info;
    }

    /**
     * 好友通过后，根据任务配置建群并拉人（通过好友 + 固定成员）
     * @param array $taskInfo customer_acquisition_task 记录（含 groupInviteEnabled/groupName/groupFixedMembers）
     * @param int $passedFriendId 通过的好友ID（s2_wechat_friend.id）
     * @param int $wechatAccountId 微信账号ID（建群账号）
     */
    protected function createGroupAfterFriendPass(array $taskInfo, int $passedFriendId, int $wechatAccountId): void
    {
        // 1. 校验拉群开关与基础配置
        if (empty($taskInfo['groupInviteEnabled'])) {
            return;
        }

        $groupName = $taskInfo['groupName'] ?? '';
        if ($groupName === '') {
            return;
        }

        $fixedMembers = $taskInfo['groupFixedMembers'] ?? [];
        if (!is_array($fixedMembers)) {
            $fixedMembers = [];
        }

        // 2. 过滤出有效的固定成员好友ID（数字ID）
        $fixedFriendIds = [];
        foreach ($fixedMembers as $member) {
            if (is_numeric($member)) {
                $fixedFriendIds[] = intval($member);
            }
        }

        // 包含通过的好友
        $friendIds = array_unique(array_merge([$passedFriendId], $fixedFriendIds));
        if (empty($friendIds)) {
            return;
        }

        try {
            // 3. 初始化 WebSocket（参考 sendMsgToFriend / Workbench 群创建逻辑）
            $toAccountId = '';
            $username = Env::get('api.username', '');
            $password = Env::get('api.password', '');
            if (!empty($username) || !empty($password)) {
                $toAccountId = Db::name('users')->where('account', $username)->value('s2_accountId');
            }
            if (empty($toAccountId)) {
                Log::warning('createGroupAfterFriendPass: toAccountId 为空，跳过建群');
                return;
            }

            $webSocket = new WebSocketController(['userName' => $username, 'password' => $password, 'accountId' => $toAccountId]);

            // 4. 调用建群接口：群名 = 配置的 groupName，成员 = 通过好友 + 固定好友
            $createResult = $webSocket->CmdChatroomCreate([
                'chatroomName' => $groupName,
                'wechatFriendIds' => $friendIds,
                'wechatAccountId' => $wechatAccountId,
            ]);

            $createResultData = json_decode($createResult, true);
            if (empty($createResultData) || !isset($createResultData['code']) || $createResultData['code'] != 200) {
                Log::warning('createGroupAfterFriendPass: 建群失败', [
                    'taskId' => $taskInfo['id'] ?? 0,
                    'wechatAccountId' => $wechatAccountId,
                    'friendIds' => $friendIds,
                    'result' => $createResult,
                ]);
            }
        } catch (\Exception $e) {
            Log::error('createGroupAfterFriendPass 异常: ' . $e->getMessage());
        }
    }

    // 检查是否是好友关系

    public function checkIfIsWeChatFriendByPhone($wxId = '', $phone = '', $siteTags = '')
    {
        if (empty($wxId) || empty($phone)) {
            return false;
        }

        try {
            $friend = Db::table('s2_wechat_friend')
                ->where('ownerWechatId', $wxId)
                ->where(['isPassed' => 1, 'isDeleted' => 0])
                ->where('phone|alias|wechatId', 'like', $phone . '%')
                ->order('createTime', 'desc')
                ->find();
            if (!empty($friend)) {
                if (!empty($siteTags)) {
                    $siteTags = json_decode($siteTags, true);
                    $siteLabels = json_decode($friend['siteLabels'], true);
                    $tags = array_merge($siteTags, $siteLabels);
                    $tags = array_unique($tags);
                    $tags = array_values($tags);
                    if (empty($tags)) {
                        $tags = [];
                    }
                    $tags = json_encode($tags, 256);
                    Db::table('s2_wechat_friend')->where(['id' => $friend['id']])->update(['siteLabels' => $tags, 'updateTime' => time()]);
                }
                return true;
            } else {
                return false;
            }
        } catch (\Exception $e) {
            Log::error("Error in checkIfIsWeChatFriendByPhone (wxId: {$wxId}, phone: {$phone}): " . $e->getMessage());
            return false;
        }
    }

    // getWeChatAccoutIdAndFriendIdByWeChatId
    public function getWeChatAccoutIdAndFriendIdByWeChatIdAndFriendPhone(string $wechatId, string $phone): array
    {
        if (empty($wechatId) || empty($phone)) {
            return [];
        }

        return Db::table('s2_wechat_friend')
            ->where('ownerWechatId', $wechatId)
            ->where('phone|alias|wechatId', 'like', $phone . '%')
            ->field('id,wechatAccountId,passTime,createTime')
            ->find();
    }

    // 判断是否已添加某手机号为好友并返回添加时间
    public function getWeChatFriendPassTimeByPhone(string $wxId, string $phone): int
    {
        if (empty($wxId) || empty($phone)) {
            return 0;
        }

        try {
            $record = Db::table('s2_wechat_friend')
                ->where('ownerWechatId', $wxId)
                ->where('phone|alias|wechatId', 'like', $phone . '%')
                ->field('id,createTime,passTime')
                ->find();

            return $record['passTime'] ?? $record['createTime'] ?? 0;
        } catch (\Exception $e) {
            Log::error("Error in getWeChatFriendPassTimeByPhone (wxId: {$wxId}, phone: {$phone}): " . $e->getMessage());
            return 0;
        }
    }

    /**
     * 查询某个微信今天添加了多少个好友
     * @param string $wechatId 微信ID
     * @return int 好友数量
     */
    public function getTodayAddedFriendsCount(string $wechatId): int
    {
        if (empty($wechatId)) {
            return 0;
        }
        try {
            $count = Db::table('s2_friend_task')
                ->where('wechatId', $wechatId)
                ->whereRaw("FROM_UNIXTIME(createTime, '%Y-%m-%d') = CURDATE()")
                ->count();
            return (int)$count;
        } catch (\Exception $e) {
            Log::error("Error in getTodayAddedFriendsCount (wechatId: {$wechatId}): " . $e->getMessage());
            return 0;
        }
    }

    /**
     * 查询某个微信24小时内添加了多少个好友
     * @param string $wechatId 微信ID
     * @return int 好友数量
     */
    public function getLast24hAddedFriendsCount(string $wechatId): int
    {
        if (empty($wechatId)) {
            return 0;
        }
        try {
            $twentyFourHoursAgo = time() - (24 * 60 * 60);
            $count = Db::table('s2_friend_task')
                ->where('wechatId', $wechatId)
                ->where('createTime', '>=', $twentyFourHoursAgo)
                ->count();
            return (int)$count;
        } catch (\Exception $e) {
            Log::error("Error in getLast24hAddedFriendsCount (wechatId: {$wechatId}): " . $e->getMessage());
            return 0;
        }
    }

    /**
     * 查询某个微信最新的一条添加好友任务记录
     * @param string $wechatId 微信ID
     * @return array|null 任务记录或null
     */
    public function getLatestFriendTask(string $wechatId): ?array
    {
        if (empty($wechatId)) {
            return null;
        }
        try {
            $task = Db::table('s2_friend_task')
                ->where('wechatId', $wechatId)
                ->order('createTime', 'desc')
                ->find();
            return $task;
        } catch (\Exception $e) {
            Log::error("Error in getLatestFriendTask (wechatId: {$wechatId}): " . $e->getMessage());
            return null;
        }
    }

    // 获取某微信最后一条添加好友任务
    public function getLatestFriendTaskByPhoneAndWeChatId(string $phone, string $wechatId): array
    {
        if (empty($phone) || empty($wechatId)) {
            return [];
        }

        $record = Db::table('s2_friend_task')
            ->where('phone', $phone)
            ->where('wechatId', $wechatId)
            ->order('createTime', 'desc')
            ->find();
        return $record ?: [];
    }

    // 获取最新的一条添加好友任务记录的创建时间
    public function getLastCreateFriendTaskTime(string $wechatId): int
    {
        if (empty($wechatId)) {
            return 0;
        }
        $record = Db::table('s2_friend_task')
            ->where('wechatId', $wechatId)
            ->order('createTime', 'desc')
            ->find();
        return $record['createTime'] ?? 0;
    }

    // 判断是否能够加好友
    public function checkIfCanCreateFriendAddTask(string $wechatId, $conf = []): bool
    {
        if (empty($wechatId)) {
            return false;
        }
        //强制请求添加好友的列表
        $friendController = new FriendTaskController();
        $friendController->getlist(0, 50);


        $record = $this->getLatestFriendTask($wechatId);
        if (empty($record)) {
            return true;
        }

        if (!empty($conf['addFriendInterval']) && isset($record['createTime']) && $record['createTime'] > time() - $conf['addFriendInterval'] * 60) {
            return false;
        }

        if (!empty($conf['startTime']) && !empty($conf['endTime'])) {
            $currentTime = date('H:i');
            $startTime = $conf['startTime'];
            $endTime = $conf['endTime'];

            if ($currentTime >= $startTime && $currentTime <= $endTime) {
                return true;
            } else {
                return false;
            }
        }

        if (isset($record['status'])) {

            if ($record['status'] == 2) {

                // 判断$record['extra'] 是否包含文字： 操作过于频繁；如果包含判断 updateTime 是否已经超过72min，updateTime是10位时间戳；如果包含指定文字且时间未超过72min，return false
                if (isset($record['extra']) && strpos($record['extra'], '操作过于频繁') !== false) {
                    $updateTime = isset($record['updateTime']) ? (int)$record['updateTime'] : 0;
                    $now = time();
                    $diff = $now - $updateTime;

                    if ($diff < 24 * 60 * 60) {
                        return false;
                    }
                }
            }
        }

        return true;
    }

    // 获取触客宝系统的客服微信账号id，用于后续微信相关操作
    public function getWeChatAccountIdByWechatId(string $wechatId): string
    {
        if (empty($wechatId)) {
            return '';
        }
        $record = Db::table('s2_wechat_account')
            ->where('wechatId', $wechatId)
            ->field('id')
            ->find();
        return $record['id'] ?? '';
    }

    // 获取在线的客服微信账号id列表
    public function getOnlineWeChatAccountIdsByWechatIds(array $wechatIds): array
    {
        if (empty($wechatIds)) {
            return [];
        }
        $records = Db::table('s2_wechat_account')
            ->where('deviceAlive', 1)
            ->where('wechatAlive', 1)
            ->where('wechatId', 'in', $wechatIds)
            ->field('id,wechatId')
            ->column('id', 'wechatId');

        return $records;
    }

    public function getWeChatIdsAccountIdsMapByDeviceIds(array $deviceIds): array
    {
        if (empty($deviceIds)) {
            return [];
        }

        $records = Db::table('s2_wechat_account')
            ->where('deviceAlive', 1)
            ->where('wechatAlive', 1)
            ->where('currentDeviceId', 'in', $deviceIds)
            ->field('id,wechatId')
            ->column('id,wechatId');
        return $records;
    }

    // 触客宝添加好友API
    public function addFriendTaskApi(int $wechatAccountId, string $phone, string $message, string $remark, array $labels, $authorization = '')
    {

        $authorization = $authorization ?: AuthService::getSystemAuthorization();

        if (empty($authorization)) {
            return [
                'status_code' => 0,
                'body' => null,
                'error' => true,
            ];
        }

        $params = [
            'phone' => $phone,
            'message' => $message,
            'remark' => $remark,
            'labels' => $labels,
            'wechatAccountId' => $wechatAccountId
        ];

        //准备发起添加请求
        $friendController = new FriendTaskController();
        $result = $friendController->addFriendTask($params);
        $result = json_decode($result, true);
        if ($result['code'] == 200) {
            return $result;
        } else {
            $authorization = AuthService::getSystemAuthorization(false);
            return $this->addFriendTaskApi($wechatAccountId, $phone, $message, $remark, $labels, $authorization);
        }


    }

    // 创建添加好友任务/执行添加
    public function createFriendAddTask(int $wechatAccountId, string $phone, array $conf, $remark = '')
    {
        if (empty($wechatAccountId) || empty($phone) || empty($conf)) {
            return;
        }

        if (empty($remark)){
            switch ($conf['remarkType']) {
                case 'phone':
                    $remark = $phone . '-' . $conf['task_name'];
                    break;
                case 'nickname':
                    $remark = '';
                    break;
                case 'source':
                    $remark = $conf['task_name'];
                    break;
                default:
                    $remark = '';
                    break;
            }
        }

        $tags = [];
        if (!empty($conf['tags'])) {
            if (is_array($conf['tags'])) {
                $tags = $conf['tags'];
            }
        }
        $res = $this->addFriendTaskApi($wechatAccountId, $phone, $conf['greeting'] ?? '你好', $remark, $tags);
    }

    /* TODO: 以上方法待实现，基于/参考 application/api/controller/WebSocketController.php 去实现；以下同步脚本用的方法转移到其他类 */


    // NOTE: run in background; 5min 同步一次
    public function syncFriendship()
    {
        $sql = "INSERT INTO ck_wechat_friendship(id,wechatId,tags,memo,ownerWechatId,createTime,updateTime,deleteTime,companyId)
        SELECT 
            f.id,f.wechatId,f.labels as tags,f.conRemark as memo,f.ownerWechatId,f.createTime,f.updateTime,f.deleteTime,
            c.departmentId
        FROM s2_wechat_friend f
            LEFT JOIN s2_wechat_account a on a.id = f.wechatAccountId
            LEFT JOIN s2_company_account c on c.id = a.deviceAccountId
        ORDER BY f.id DESC
        LIMIT ?, ?
        ON DUPLICATE KEY UPDATE 
            id=VALUES(id),
            tags=VALUES(tags),
            memo=VALUES(memo),
            updateTime=VALUES(updateTime),
            deleteTime=VALUES(deleteTime),
            companyId=VALUES(companyId)";

        $offset = 0;
        $limit = 2000;
        $usleepTime = 50000;

        do {
            $affected = Db::execute($sql, [$offset, $limit]);
            $offset += $limit;
            if ($affected > 0) {
                usleep($usleepTime);
            }
        } while ($affected > 0);
    }


    public function syncWechatAccount()
    {
        $pk = 'wechatId';
        $limit = 1000;
        // $lastId = '';
        $lastId = null; // Or some other sentinel indicating "first run"


        $totalAffected = 0;
        $iterations = 0;
        $maxIterations = 10000;

        do {
            // Fetch a batch of distinct wechatIds
            // Important: Order by wechatId for consistent pagination
            $sourceDb = Db::connect()->table('s2_wechat_friend');
            // if ($lastId !== '') { // For subsequent iterations
            if (!is_null($lastId)) { // Check if it's not the first iteration
                $sourceDb->where($pk, '>', $lastId);
            }
            $distinctWechatIds = $sourceDb->order($pk, 'ASC')
                ->distinct(true)
                ->limit($limit)
                ->column($pk); // Get an array of wechatIds

            if (empty($distinctWechatIds)) {
                break; // No more wechatIds to process
            }

            // Prepare the main IODKU query for this batch of wechatIds
            $sql = "INSERT INTO ck_wechat_account(wechatId,alias,nickname,pyInitial,quanPin,avatar,gender,region,signature,phone,country,privince,city,createTime,updateTime)
        SELECT
            wechatId,alias,nickname,pyInitial,quanPin,avatar,gender,region,signature,phone,country,privince,city,createTime,updateTime
        FROM
            s2_wechat_friend 
        WHERE wechatId IN (" . implode(',', array_fill(0, count($distinctWechatIds), '?')) . ")
        GROUP BY wechatId  -- Grouping within the selected wechatIds
        ON DUPLICATE KEY UPDATE 
            alias=VALUES(alias),
            nickname=VALUES(nickname),
            pyInitial=VALUES(pyInitial),
            quanPin=VALUES(quanPin),
            avatar=VALUES(avatar),
            gender=VALUES(gender),
            region=VALUES(region),
            signature=VALUES(signature),
            phone=VALUES(phone),
            country=VALUES(country),
            privince=VALUES(privince),
            city=VALUES(city),
            updateTime=VALUES(updateTime)";

            // The parameters for the IN clause are the distinctWechatIds themselves
            $bindings = $distinctWechatIds;

            try {
                $affected = Db::execute($sql, $bindings);
                $totalAffected += $affected;
                // Log::info("syncWechatAccount: Processed batch of " . count($distinctWechatIds) . " distinct wechatIds. Affected rows: " . $affected);

                // Update lastId for the next iteration
                $lastId = end($distinctWechatIds);

                if ($affected > 0) {
                    usleep(50000);
                }
            } catch (\Exception $e) {
                Log::error("syncWechatAccount batch error: " . $e->getMessage() . " with wechatIds starting around " . $distinctWechatIds[0] . ". SQL: " . $sql . " Bindings: " . json_encode($bindings));
                // Decide if you want to break or continue with the next batch
                break; // Example: break on error
            }
            $iterations++;
        } while (count($distinctWechatIds) === $limit && $iterations < $maxIterations); // Continue if we fetched a full batch

        // Log::info("syncWechatAccount finished. Total affected rows: " . $totalAffected);
        return $totalAffected;
    }


    public function syncWechatDeviceLoginLog()
    {
        try {
            $cursor = Db::table('s2_wechat_account')
                ->alias('a')
                ->join(['s2_device' => 'd'], 'd.imei = a.imei')
                ->join(['s2_company_account' => 'c'], 'c.id = d.currentAccountId')
                ->field('d.id as deviceId, a.wechatId, a.wechatAlive as alive, c.departmentId as companyId, a.updateTime as updateTime')
                ->cursor();

            foreach ($cursor as $item) {

                if (empty($item['deviceId']) || empty($item['wechatId']) || empty($item['companyId'])) {
                    continue;
                }

                $exists = Db::table('ck_device_wechat_login')
                    ->where('deviceId', $item['deviceId'])
                    ->where('wechatId', $item['wechatId'])
                    ->where('companyId', $item['companyId'])
                    ->find();

                if ($exists) {
                    Db::table('ck_device_wechat_login')
                        ->where('deviceId', $item['deviceId'])
                        ->where('wechatId', $item['wechatId'])
                        ->where('companyId', $item['companyId'])
                        ->update(['alive' => $item['alive'], 'updateTime' => $item['updateTime']]);
                } else {
                    $item['createTime'] = $item['updateTime'];
                    Db::table('ck_device_wechat_login')->insert($item);
                }

            }

            return true;
        } catch (\Exception $e) {
            Log::error("微信好友同步任务异常: " . $e->getMessage() . ", 堆栈: " . $e->getTraceAsString());
            return false;
        }
    }

    /**
     * 大数据量分批处理版本
     * 适用于数据源非常大的情况，避免一次性加载全部数据到内存
     * 独立脚本执行，30min 同步一次 和 流量来源的更新一起
     *
     * @param int $batchSize 每批处理的数据量
     * @return int 影响的行数
     */
    public function syncWechatFriendToTrafficPoolBatch($batchSize = 5000)
    {
        Db::execute("CREATE TEMPORARY TABLE IF NOT EXISTS temp_wechat_ids (
        wechatId VARCHAR(64) PRIMARY KEY
    ) ENGINE=MEMORY");

        Db::execute("TRUNCATE TABLE temp_wechat_ids");

        // 批量插入去重的wechatId
        Db::execute("INSERT INTO temp_wechat_ids SELECT DISTINCT wechatId FROM s2_wechat_friend");

        $total = Db::table('temp_wechat_ids')->count();

        $batchCount = ceil($total / $batchSize);
        $affectedRows = 0;

        try {
            for ($i = 0; $i < $batchCount; $i++) {
                $offset = $i * $batchSize;

                $sql = "INSERT IGNORE INTO ck_traffic_pool(`identifier`, `wechatId`, `mobile`) 
                        SELECT t.wechatId AS identifier, t.wechatId, 
                            (SELECT phone FROM s2_wechat_friend 
                                WHERE wechatId = t.wechatId LIMIT 1) AS mobile
                        FROM (
                            SELECT wechatId FROM temp_wechat_ids LIMIT {$offset}, {$batchSize}
                        ) AS t";

                $currentAffected = Db::execute($sql);
                $affectedRows += $currentAffected;

                if ($i % 5 == 0) {
                    gc_collect_cycles();
                }

                usleep(30000); // 30毫秒
            }
        } catch (\Exception $e) {
            \think\facade\Log::error("Error in traffic pool sync: " . $e->getMessage());
            throw $e;
        } finally {
            Db::execute("DROP TEMPORARY TABLE IF EXISTS temp_wechat_ids");
        }

        return $affectedRows;
    }


    /**
     * 同步/更新微信客服信息到ck_wechat_customer表
     *
     * @param int $batchSize 每批处理的数据量
     * @return int 影响的行数
     */
    public function syncWechatCustomer($batchSize = 1000)
    {
        try {
            // 1. 获取要处理的wechatId和companyId列表
            $customerList = Db::table('ck_device_wechat_login')
                ->field('DISTINCT wechatId, companyId')
                ->order('id DESC')
                ->select();

            $totalAffected = 0;
            $batchCount = ceil(count($customerList) / $batchSize);

            for ($i = 0; $i < $batchCount; $i++) {
                $batch = array_slice($customerList, $i * $batchSize, $batchSize);
                $insertData = [];

                foreach ($batch as $customer) {
                    $wechatId = $customer['wechatId'];
                    $companyId = $customer['companyId'];

                    if (empty($wechatId)) continue;

                    // 2. 获取s2_wechat_account数据
                    $accountInfo = Db::table('s2_wechat_account')
                        ->where('wechatId', $wechatId)
                        ->find();

                    // 3. 获取群数量 (不包含 @openim 结尾的identifier)
                    $groupCount = Db::table('ck_wechat_group_member')
                        ->where('identifier', $wechatId)
                        ->where('customerIs', 1)
                        ->where('identifier', 'not like', '%@openim')
                        ->count();

                    // 4. 检查记录是否已存在
                    $existingRecord = Db::table('ck_wechat_customer')
                        ->where('wechatId', $wechatId)
                        ->find();

                    // 5. 构建basic JSON数据
                    $basic = [];
                    if ($existingRecord && !empty($existingRecord['basic'])) {
                        $basic = json_decode($existingRecord['basic'], true) ?: [];
                    }

                    if (empty($basic['registerDate'])) {
                        $basic['registerDate'] = date('Y-m-d H:i:s', strtotime('-' . mt_rand(1, 150) . ' months'));
                    }

                    // 6. 构建activity JSON数据
                    $activity = [];
                    if ($existingRecord && !empty($existingRecord['activity'])) {
                        $activity = json_decode($existingRecord['activity'], true) ?: [];
                    }

                    if ($accountInfo) {
                        $activity['yesterdayMsgCount'] = $accountInfo['yesterdayMsgCount'] ?? 0;
                        $activity['sevenDayMsgCount'] = $accountInfo['sevenDayMsgCount'] ?? 0;
                        $activity['thirtyDayMsgCount'] = $accountInfo['thirtyDayMsgCount'] ?? 0;

                        // 计算totalMsgCount
                        if (empty($activity['totalMsgCount'])) {
                            $activity['totalMsgCount'] = $activity['thirtyDayMsgCount'];
                        } else {
                            $activity['totalMsgCount'] += $activity['yesterdayMsgCount'];
                        }
                    }

                    // 7. 构建friendShip JSON数据
                    $friendShip = [];
                    if ($existingRecord && !empty($existingRecord['friendShip'])) {
                        $friendShip = json_decode($existingRecord['friendShip'], true) ?: [];
                    }

                    if ($accountInfo) {
                        $friendShip['totalFriend'] = $accountInfo['totalFriend'] ?? 0;
                        $friendShip['maleFriend'] = $accountInfo['maleFriend'] ?? 0;
                        $friendShip['unknowFriend'] = $accountInfo['unknowFriend'] ?? 0;
                        $friendShip['femaleFriend'] = $accountInfo['femaleFriend'] ?? 0;
                    }
                    $friendShip['groupNumber'] = $groupCount;

                    // 8. 构建weight JSON数据 (每天只计算一次)
                    // $weight = [];
                    // if ($existingRecord && !empty($existingRecord['weight'])) {
                    //     $weight = json_decode($existingRecord['weight'], true) ?: [];

                    //     // 如果不是今天更新的，重新计算权重
                    //     $lastUpdateDate = date('Y-m-d', $existingRecord['updateTime'] ?? 0);
                    //     if ($lastUpdateDate !== date('Y-m-d')) {
                    //         $weight = $this->calculateCustomerWeight($basic, $activity, $friendShip);
                    //     }
                    // } else {
                    //     $weight = $this->calculateCustomerWeight($basic, $activity, $friendShip);
                    // }

                    // 9. 准备更新或插入的数据
                    $data = [
                        'wechatId' => $wechatId,
                        'companyId' => $companyId,
                        'basic' => json_encode($basic),
                        'activity' => json_encode($activity),
                        'friendShip' => json_encode($friendShip),
                        // 'weight' => json_encode($weight),
                        'createTime' => $accountInfo['createTime'],
                        'updateTime' => time()
                    ];

                    if ($existingRecord) {
                        // 更新记录
                        Db::table('ck_wechat_customer')
                            ->where('wechatId', $wechatId)
                            ->update($data);
                    } else {
                        // 插入记录
                        Db::table('ck_wechat_customer')->insert($data);
                    }

                    $totalAffected++;
                }

                // 释放内存
                if ($i % 5 == 0) {
                    gc_collect_cycles();
                }

                usleep(50000); // 50毫秒短暂休息
            }

            return $totalAffected;
        } catch (\Exception $e) {
            Log::error("同步微信客服信息异常: " . $e->getMessage() . ", 堆栈: " . $e->getTraceAsString());
            throw $e;
        }
    }

    /**
     * 计算客服权重
     *
     * @param array $basic 基础信息
     * @param array $activity 活跃信息
     * @param array $friendShip 好友关系信息
     * @return array 权重信息
     */
    private function calculateCustomerWeight($basic, $activity, $friendShip)
    {
        // 1. 计算账号年龄权重（最大20分）
        $ageWeight = 0;
        if (!empty($basic['registerDate'])) {
            $registerTime = strtotime($basic['registerDate']);
            $accountAgeMonths = floor((time() - $registerTime) / (30 * 24 * 3600));
            $ageWeight = min(20, floor($accountAgeMonths / 12) * 4);
        }

        // 2. 计算活跃度权重（最大30分）
        $activityWeight = 0;
        if (!empty($activity)) {
            // 基于消息数计算活跃度
            $msgScore = 0;
            if ($activity['thirtyDayMsgCount'] > 10000) $msgScore = 15;
            elseif ($activity['thirtyDayMsgCount'] > 5000) $msgScore = 12;
            elseif ($activity['thirtyDayMsgCount'] > 1000) $msgScore = 8;
            elseif ($activity['thirtyDayMsgCount'] > 500) $msgScore = 5;
            elseif ($activity['thirtyDayMsgCount'] > 100) $msgScore = 3;

            // 连续活跃天数加分（这里简化处理，实际可能需要更复杂逻辑）
            $activeScore = min(15, $activity['yesterdayMsgCount'] > 10 ? 15 : floor($activity['yesterdayMsgCount'] / 2));

            $activityWeight = $msgScore + $activeScore;
        }

        // 3. 计算限制影响权重（最大15分）
        $restrictWeight = 15; // 默认满分，无限制

        // 4. 计算实名认证权重（最大10分）
        $realNameWeight = 0; // 简化处理，默认未实名

        // 5. 计算可加友数量限制（基于好友数量，最大为5000）
        $addLimit = 0;
        if (!empty($friendShip['totalFriend'])) {
            $addLimit = max(0, min(5000 - $friendShip['totalFriend'], 5000));
            $addLimit = floor($addLimit / 1000); // 每1000个空位1分，最大5分
        }

        // 6. 计算总分（满分75+5分）
        $scope = $ageWeight + $activityWeight + $restrictWeight + $realNameWeight;

        return [
            'ageWeight' => $ageWeight,
            'activityWeight' => $activityWeight, // 注意这里修正了拼写错误
            'restrictWeight' => $restrictWeight,
            'realNameWeight' => $realNameWeight,
            'scope' => $scope,
            'addLimit' => $addLimit
        ];
    }

    /**
     * 同步设备信息到ck_device表
     * 数据量不大，仅同步一次所有设备
     *
     * @return int 影响的行数
     */
    public function syncDevice()
    {
        try {
            $sql = "INSERT INTO ck_device(`id`, `imei`, `model`, phone, operatingSystem, memo, alive, brand, rooted, xPosed, softwareVersion, extra, createTime, updateTime, deleteTime, companyId)  
            SELECT 
            d.id, d.imei, d.model, d.phone, d.operatingSystem, d.memo, d.alive, d.brand, d.rooted, d.xPosed, d.softwareVersion, d.extra, d.createTime, d.lastUpdateTime, d.deleteTime, a.departmentId companyId
            FROM s2_device d 
            JOIN s2_company_account a ON d.currentAccountId = a.id
            ON DUPLICATE KEY UPDATE
                `model` = VALUES(`model`),
                `phone` = VALUES(`phone`),
                `operatingSystem` = VALUES(`operatingSystem`),
                `memo` = VALUES(`memo`),
                `alive` = VALUES(`alive`),
                `brand` = VALUES(`brand`),
                `rooted` = VALUES(`rooted`),
                `xPosed` = VALUES(`xPosed`),
                `softwareVersion` = VALUES(`softwareVersion`),
                `extra` = VALUES(`extra`),
                `updateTime` = VALUES(`updateTime`),
                `deleteTime` = VALUES(`deleteTime`),
                `companyId` = VALUES(`companyId`)";

            $affected = Db::execute($sql);
            return $affected;
        } catch (\Exception $e) {
            Log::error("同步设备信息异常: " . $e->getMessage() . ", 堆栈: " . $e->getTraceAsString());
            return false;
        }
    }

    public function syncTrafficSourceUser()
    {
        $sql = "insert into ck_traffic_source(`identifier`,companyId,`fromd`,`sourceId`,`createTime`,`type`, `status`) 
        SELECT
            f.wechatId identifier,
            c.departmentId companyId,
            f.ownerNickname fromd,
            f.ownerWechatId sourceId,
            f.createTime createTime,
	        1 as type,
	        CASE WHEN f.isDeleted = 1 THEN -3 ELSE 3 END as status
        FROM
            s2_wechat_friend f
            LEFT JOIN s2_wechat_account a ON f.wechatAccountId = a.id
            LEFT JOIN s2_company_account c on c.id = a.deviceAccountId
        ORDER BY f.id DESC
        LIMIT ?, ?
        ON DUPLICATE KEY UPDATE
            identifier=VALUES(identifier),
            companyId=VALUES(companyId),
            sourceId=VALUES(sourceId)";


        $offset = 0;
        $limit = 2000;
        $usleepTime = 50000;
        do {
            $affected = Db::execute($sql, [$offset, $limit]);
            $offset += $limit;
            if ($affected > 0) {
                usleep($usleepTime);
            }
        } while ($affected > 0);
    }

    public function syncTrafficSourceGroup()
    {
        $sql = "insert into ck_traffic_source(`identifier`,companyId,`fromd`,`sourceId`,`createTime`,`type`, `status`) 
            SELECT
                m.wechatId identifier,
                c.departmentId companyId,
                r.nickname fromd,
                m.chatroomId sourceId,
                m.createTime createTime,
	            2 as type,
	            CASE WHEN m.friendType = 1 THEN 3 ELSE 1 END as status
            FROM
                s2_wechat_chatroom_member m
                JOIN s2_wechat_chatroom r ON m.chatroomId = r.chatroomId
                LEFT JOIN s2_wechat_account  a ON a.id = r.wechatAccountId
                LEFT JOIN s2_company_account c on c.id = a.deviceAccountId
            GROUP BY m.wechatId
            ORDER BY m.id DESC
        LIMIT ?, ?
        ON DUPLICATE KEY UPDATE
            identifier=VALUES(identifier),
            companyId=VALUES(companyId),
            sourceId=VALUES(sourceId)";


        $offset = 0;
        $limit = 2000;
        $usleepTime = 50000;
        do {
            $affected = Db::execute($sql, [$offset, $limit]);
            $offset += $limit;
            if ($affected > 0) {
                usleep($usleepTime);
            }
        } while ($affected > 0);
    }

    public function syncWechatGroup()
    {
        $sql = "insert into ck_wechat_group(`id`,`wechatAccountId`,`chatroomId`,`name`,`avatar`,`companyId`,`ownerWechatId`,`createTime`,`updateTime`,`deleteTime`) 
                    SELECT
                     g.id id,
                     g.wechatAccountId wechatAccountId,
                     g.chatroomId chatroomId,
                     g.nickname name,
                     g.chatroomAvatar avatar,
                     c.departmentId companyId,
                     g.wechatAccountWechatId ownerWechatId,
                     g.createTime createTime,
                     g.updateTime updateTime,
                     g.deleteTime deleteTime
                    FROM
                    s2_wechat_chatroom g
                    LEFT JOIN s2_company_account c ON g.accountId = c.id
                    ORDER BY g.id DESC  
                    LIMIT ?, ?
                    ON DUPLICATE KEY UPDATE
                    chatroomId=VALUES(chatroomId),
                    companyId=VALUES(companyId),
                    ownerWechatId=VALUES(ownerWechatId)";


        $offset = 0;
        $limit = 2000;
        $usleepTime = 50000;
        do {
            $affected = Db::execute($sql, [$offset, $limit]);
            $offset += $limit;
            if ($affected > 0) {
                usleep($usleepTime);
            }
        } while ($affected > 0);
    }

    public function syncWechatGroupCustomer()
    {
        $sql = "insert into ck_wechat_group_member(`identifier`,`chatroomId`,`companyId`,`groupId`,`createTime`) 
                    SELECT
                        m.wechatId identifier,
                        g.chatroomId chatroomId,
                        c.departmentId companyId,
                        g.id groupId,
                        m.createTime createTime
                    FROM
                    s2_wechat_chatroom_member m
                    LEFT JOIN s2_wechat_chatroom g ON g.chatroomId = m.chatroomId
                    LEFT JOIN s2_company_account c ON g.accountId = c.id
                    ORDER BY m.id DESC  
                    LIMIT ?, ?
                    ON DUPLICATE KEY UPDATE
                    identifier=VALUES(identifier),
                    chatroomId=VALUES(chatroomId),
                    companyId=VALUES(companyId),
                    groupId=VALUES(groupId)";

        $offset = 0;
        $limit = 2000;
        $usleepTime = 50000;
        do {
            $affected = Db::execute($sql, [$offset, $limit]);
            $offset += $limit;
            if ($affected > 0) {
                usleep($usleepTime);
            }
        } while ($affected > 0);
    }


    public function syncCallRecording()
    {
        $sql = "insert into ck_call_recording(`id`,`phone`,`isCallOut`,`companyId`,`callType`,`beginTime`,`endTime`,`createTime`) 
                    SELECT
                        c.id id,
                        c.phone phone,
                        c.isCallOut isCallOut,
                        a.departmentId companyId,
                        c.callType callType,
                        c.beginTime beginTime,
                        c.endTime endTime,
                        c.callBeginTime createTime
                    FROM 
                    s2_call_recording c
                    LEFT JOIN s2_company_account a ON c.deviceOwnerId = a.id
                    ORDER BY c.id DESC
                    LIMIT ?, ?
                    ON DUPLICATE KEY UPDATE
                    id=VALUES(id),
                    phone=VALUES(phone),
                    isCallOut=VALUES(isCallOut),
                    companyId=VALUES(companyId)";

        $offset = 0;
        $limit = 2000;
        $usleepTime = 50000;
        do {
            $affected = Db::execute($sql, [$offset, $limit]);
            $offset += $limit;
            if ($affected > 0) {
                usleep($usleepTime);
            }
        } while ($affected > 0);
    }

    /**
     * 处理自动问候功能
     * 根据不同的触发类型检查并发送问候消息
     */
    public function handleAutoGreetings()
    {
        try {
            // 获取所有启用的问候规则
            $rules = Db::name('kf_auto_greetings')
                ->where(['status' => 1, 'isDel' => 0])
                ->order('level asc, id asc')
                ->select();

            if (empty($rules)) {
                return;
            }

            foreach ($rules as $rule) {
                $trigger = $rule['trigger'];
                $condition = json_decode($rule['condition'], true);
                
                switch ($trigger) {
                    case 1: // 新好友
                        $this->handleNewFriendGreeting($rule);
                        break;
                    case 2: // 首次发消息
                        $this->handleFirstMessageGreeting($rule);
                        break;
                    case 3: // 时间触发
                        $this->handleTimeTriggerGreeting($rule, $condition);
                        break;
                    case 4: // 关键词触发
                        $this->handleKeywordTriggerGreeting($rule, $condition);
                        break;
                    case 5: // 生日触发
                        $this->handleBirthdayTriggerGreeting($rule, $condition);
                        break;
                    case 6: // 自定义
                        $this->handleCustomTriggerGreeting($rule, $condition);
                        break;
                }
            }
        } catch (\Exception $e) {
            Log::error('自动问候处理失败：' . $e->getMessage());
        }
    }

    /**
     * 处理新好友触发
     */
    private function handleNewFriendGreeting($rule)
    {
        // 获取最近24小时内添加的好友（避免重复处理）
        $last24h = time() - 24 * 3600;
        
        // 查询该用户/公司最近24小时内新添加的好友
        // 通过 s2_wechat_account -> s2_company_account 关联获取 companyId
        $friends = Db::table('s2_wechat_friend')
            ->alias('wf')
            ->join(['s2_wechat_account' => 'wa'], 'wf.wechatAccountId = wa.id')
            ->join(['s2_company_account' => 'ca'], 'wa.deviceAccountId = ca.id')
            ->where([
                ['wf.isPassed', '=', 1],
                ['wf.isDeleted', '=', 0],
                ['wf.passTime', '>=', $last24h],
                ['ca.departmentId', '=', $rule['companyId']],
            ])
            ->field('wf.id, wf.wechatAccountId')
            ->select();

        foreach ($friends as $friend) {
            // 检查是否已经发送过问候
            $exists = Db::name('kf_auto_greetings_record')
                ->where([
                    'autoId' => $rule['id'],
                    'friendIdOrGroupId' => $friend['id'],
                    'wechatAccountId' => $friend['wechatAccountId'],
                ])
                ->find();

            if (!$exists) {
                $this->sendGreetingMessage($rule, $friend['wechatAccountId'], $friend['id'], 0);
            }
        }
    }

    /**
     * 处理首次发消息触发
     */
    private function handleFirstMessageGreeting($rule)
    {
        // 获取最近1小时内收到的消息
        $last1h = time() - 3600;
        
        // 查询消息表，找出首次发消息的好友
        // 通过 s2_wechat_account -> s2_company_account 关联获取 companyId
        $messages = Db::table('s2_wechat_message')
            ->alias('wm')
            ->join(['s2_wechat_account' => 'wa'], 'wm.wechatAccountId = wa.id')
            ->join(['s2_company_account' => 'ca'], 'wa.deviceAccountId = ca.id')
            ->where([
                ['wm.isSend', '=', 0], // 接收的消息
                ['wm.wechatChatroomId', '=', 0], // 个人消息
                ['wm.createTime', '>=', $last1h],
                ['ca.departmentId', '=', $rule['companyId']],
            ])
            ->group('wm.wechatFriendId, wm.wechatAccountId')
            ->field('wm.wechatFriendId, wm.wechatAccountId, MIN(wm.createTime) as firstMsgTime')
            ->select();

        foreach ($messages as $msg) {
            // 检查该好友是否之前发送过消息
            $previousMsg = Db::table('s2_wechat_message')
                ->where([
                    'wechatFriendId' => $msg['wechatFriendId'],
                    'wechatAccountId' => $msg['wechatAccountId'],
                    'isSend' => 0,
                ])
                ->where('createTime', '<', $msg['firstMsgTime'])
                ->find();

            // 如果是首次发消息，且没有发送过问候
            if (!$previousMsg) {
                $exists = Db::name('kf_auto_greetings_record')
                    ->where([
                        'autoId' => $rule['id'],
                        'friendIdOrGroupId' => $msg['wechatFriendId'],
                        'wechatAccountId' => $msg['wechatAccountId'],
                    ])
                    ->find();

                if (!$exists) {
                    $this->sendGreetingMessage($rule, $msg['wechatAccountId'], $msg['wechatFriendId'], 0);
                }
            }
        }
    }

    /**
     * 处理时间触发
     */
    private function handleTimeTriggerGreeting($rule, $condition)
    {
        if (empty($condition) || !isset($condition['type'])) {
            return;
        }

        $now = time();
        $currentTime = date('H:i', $now);
        $currentDate = date('m-d', $now);
        $currentDateTime = date('m-d H:i', $now);
        $currentWeekday = date('w', $now); // 0=周日, 1=周一, ..., 6=周六

        $shouldTrigger = false;

        switch ($condition['type']) {
            case 'daily_time': // 每天固定时间
                if ($currentTime === $condition['value']) {
                    $shouldTrigger = true;
                }
                break;

            case 'yearly_datetime': // 每年固定日期时间
                if ($currentDateTime === $condition['value']) {
                    $shouldTrigger = true;
                }
                break;

            case 'fixed_range': // 固定时间段
                if (is_array($condition['value']) && count($condition['value']) === 2) {
                    $startTime = strtotime('2000-01-01 ' . $condition['value'][0]);
                    $endTime = strtotime('2000-01-01 ' . $condition['value'][1]);
                    $currentTimeStamp = strtotime('2000-01-01 ' . $currentTime);
                    
                    if ($currentTimeStamp >= $startTime && $currentTimeStamp <= $endTime) {
                        $shouldTrigger = true;
                    }
                }
                break;

            case 'workday': // 工作日
                // 周一到周五（1-5）
                if ($currentWeekday >= 1 && $currentWeekday <= 5 && $currentTime === $condition['value']) {
                    $shouldTrigger = true;
                }
                break;
        }

        if ($shouldTrigger) {
            // 获取该用户/公司的所有好友
            // 通过 s2_wechat_account -> s2_company_account 关联获取 companyId
            $friends = Db::table('s2_wechat_friend')
                ->alias('wf')
                ->join(['s2_wechat_account' => 'wa'], 'wf.wechatAccountId = wa.id')
                ->join(['s2_company_account' => 'ca'], 'wa.deviceAccountId = ca.id')
                ->where([
                    ['wf.isPassed', '=', 1],
                    ['wf.isDeleted', '=', 0],
                    ['ca.departmentId', '=', $rule['companyId']],
                ])
                ->field('wf.id, wf.wechatAccountId')
                ->select();

            foreach ($friends as $friend) {
                // 检查今天是否已经发送过
                $todayStart = strtotime(date('Y-m-d 00:00:00'));
                $exists = Db::name('kf_auto_greetings_record')
                    ->where([
                        'autoId' => $rule['id'],
                        'friendIdOrGroupId' => $friend['id'],
                        'wechatAccountId' => $friend['wechatAccountId'],
                    ])
                    ->where('createTime', '>=', $todayStart)
                    ->find();

                if (!$exists) {
                    $this->sendGreetingMessage($rule, $friend['wechatAccountId'], $friend['id'], 0);
                }
            }
        }
    }

    /**
     * 处理关键词触发
     */
    private function handleKeywordTriggerGreeting($rule, $condition)
    {
        if (empty($condition) || empty($condition['keywords'])) {
            return;
        }

        $keywords = $condition['keywords'];
        $matchType = $condition['match_type'] ?? 'fuzzy';

        // 获取最近1小时内收到的消息
        $last1h = time() - 3600;

        // 通过 s2_wechat_account -> s2_company_account 关联获取 companyId
        $messages = Db::table('s2_wechat_message')
            ->alias('wm')
            ->join(['s2_wechat_account' => 'wa'], 'wm.wechatAccountId = wa.id')
            ->join(['s2_company_account' => 'ca'], 'wa.deviceAccountId = ca.id')
            ->where([
                ['wm.isSend', '=', 0], // 接收的消息
                ['wm.wechatChatroomId', '=', 0], // 个人消息
                ['wm.msgType', '=', 1], // 文本消息
                ['wm.createTime', '>=', $last1h],
                ['ca.departmentId', '=', $rule['companyId']],
            ])
            ->field('wm.*')
            ->select();

        foreach ($messages as $msg) {
            $content = $msg['content'] ?? '';
            
            // 检查关键词匹配
            $matched = false;
            foreach ($keywords as $keyword) {
                if ($matchType === 'exact') {
                    // 精准匹配
                    if ($content === $keyword) {
                        $matched = true;
                        break;
                    }
                } else {
                    // 模糊匹配
                    if (strpos($content, $keyword) !== false) {
                        $matched = true;
                        break;
                    }
                }
            }

            if ($matched) {
                // 检查是否已经发送过问候（同一好友同一规则，1小时内只发送一次）
                $last1h = time() - 3600;
                $exists = Db::name('kf_auto_greetings_record')
                    ->where([
                        'autoId' => $rule['id'],
                        'friendIdOrGroupId' => $msg['wechatFriendId'],
                        'wechatAccountId' => $msg['wechatAccountId'],
                    ])
                    ->where('createTime', '>=', $last1h)
                    ->find();

                if (!$exists) {
                    $this->sendGreetingMessage($rule, $msg['wechatAccountId'], $msg['wechatFriendId'], 0);
                }
            }
        }
    }

    /**
     * 处理生日触发
     */
    private function handleBirthdayTriggerGreeting($rule, $condition)
    {
        if (empty($condition)) {
            return;
        }

        // 解析condition格式
        // 支持格式：
        // 1. {'month': 10, 'day': 10} - 当天任何时间都可以触发
        // 2. {'month': 10, 'day': 10, 'time': '09:00'} - 当天指定时间触发
        // 3. {'month': 10, 'day': 10, 'time_range': ['09:00', '10:00']} - 当天时间范围内触发
        // 兼容旧格式：['10-10'] 或 '10-10'（仅支持 MM-DD 格式，不包含年份）
        
        $birthdayMonth = null;
        $birthdayDay = null;
        $birthdayTime = null;
        $timeRange = null;
        
        if (is_array($condition)) {
            // 新格式：对象格式 {'month': 10, 'day': 10}
            if (isset($condition['month']) && isset($condition['day'])) {
                $birthdayMonth = (int)$condition['month'];
                $birthdayDay = (int)$condition['day'];
                $birthdayTime = $condition['time'] ?? null;
                $timeRange = $condition['time_range'] ?? null;
            } 
            // 兼容旧格式：['10-10'] 或 ['10-10 09:00']（仅支持 MM-DD 格式）
            elseif (isset($condition[0])) {
                $dateStr = $condition[0];
                // 只接受月日格式：'10-10' 或 '10-10 09:00'
                if (preg_match('/^(\d{1,2})-(\d{1,2})(?:\s+(\d{2}:\d{2}))?$/', $dateStr, $matches)) {
                    $birthdayMonth = (int)$matches[1];
                    $birthdayDay = (int)$matches[2];
                    if (isset($matches[3])) {
                        $birthdayTime = $matches[3];
                    }
                }
            }
        } elseif (is_string($condition)) {
            // 字符串格式：只接受 '10-10' 或 '10-10 09:00'（MM-DD 格式，不包含年份）
            if (preg_match('/^(\d{1,2})-(\d{1,2})(?:\s+(\d{2}:\d{2}))?$/', $condition, $matches)) {
                $birthdayMonth = (int)$matches[1];
                $birthdayDay = (int)$matches[2];
                if (isset($matches[3])) {
                    $birthdayTime = $matches[3];
                }
            }
        }
        
        if ($birthdayMonth === null || $birthdayDay === null || $birthdayMonth < 1 || $birthdayMonth > 12 || $birthdayDay < 1 || $birthdayDay > 31) {
            return;
        }

        $todayMonth = (int)date('m');
        $todayDay = (int)date('d');

        // 检查今天是否是生日（只匹配月日，不匹配年份）
        if ($todayMonth !== $birthdayMonth || $todayDay !== $birthdayDay) {
            return;
        }
        
        // 如果配置了时间，检查当前时间是否匹配
        $now = time();
        $currentTime = date('H:i', $now);
        
        if ($birthdayTime !== null) {
            // 指定了具体时间，检查是否在指定时间（允许1分钟误差，避免定时任务执行时间不精确）
            $birthdayTimestamp = strtotime('2000-01-01 ' . $birthdayTime);
            $currentTimestamp = strtotime('2000-01-01 ' . $currentTime);
            $diff = abs($currentTimestamp - $birthdayTimestamp);
            
            // 如果时间差超过2分钟，不触发（允许1分钟误差）
            if ($diff > 120) {
                return;
            }
        } elseif ($timeRange !== null && is_array($timeRange) && count($timeRange) === 2) {
            // 指定了时间范围，检查当前时间是否在范围内
            $startTime = strtotime('2000-01-01 ' . $timeRange[0]);
            $endTime = strtotime('2000-01-01 ' . $timeRange[1]);
            $currentTimestamp = strtotime('2000-01-01 ' . $currentTime);
            
            if ($currentTimestamp < $startTime || $currentTimestamp > $endTime) {
                return;
            }
        }
        // 如果没有配置时间或时间范围，则当天任何时间都可以触发

        // 获取该用户/公司的所有好友
        // 通过 s2_wechat_account -> s2_company_account 关联获取 companyId
        $friends = Db::table('s2_wechat_friend')
            ->alias('wf')
            ->join(['s2_wechat_account' => 'wa'], 'wf.wechatAccountId = wa.id')
            ->join(['s2_company_account' => 'ca'], 'wa.deviceAccountId = ca.id')
            ->where([
                ['wf.isPassed', '=', 1],
                ['wf.isDeleted', '=', 0],
                ['ca.departmentId', '=', $rule['companyId']],
            ])
            ->field('wf.id, wf.wechatAccountId')
            ->select();

        foreach ($friends as $friend) {
            // 检查今天是否已经发送过
            $todayStart = strtotime(date('Y-m-d 00:00:00'));
            $exists = Db::name('kf_auto_greetings_record')
                ->where([
                    'autoId' => $rule['id'],
                    'friendIdOrGroupId' => $friend['id'],
                    'wechatAccountId' => $friend['wechatAccountId'],
                ])
                ->where('createTime', '>=', $todayStart)
                ->find();

            if (!$exists) {
                $this->sendGreetingMessage($rule, $friend['wechatAccountId'], $friend['id'], 0);
            }
        }
    }

    /**
     * 处理自定义触发
     */
    private function handleCustomTriggerGreeting($rule, $condition)
    {
        // 自定义类型需要根据具体业务需求实现
        // 这里提供一个基础框架，可根据实际需求扩展
        // 暂时不实现，留待后续扩展
    }

    /**
     * 发送问候消息
     * @param array $rule 问候规则
     * @param int $wechatAccountId 微信账号ID
     * @param int $friendId 好友ID
     * @param int $groupId 群ID（0表示个人消息）
     */
    private function sendGreetingMessage($rule, $wechatAccountId, $friendId, $groupId = 0)
    {
        try {
            $content = $rule['content'];
            
            // 创建记录
            $recordId = Db::name('kf_auto_greetings_record')->insertGetId([
                'autoId' => $rule['id'],
                'userId' => $rule['userId'],
                'companyId' => $rule['companyId'],
                'wechatAccountId' => $wechatAccountId,
                'friendIdOrGroupId' => $friendId,
                'isSend' => 0,
                'sendTime' => 0,
                'receiveTime' => 0,
                'createTime' => time(),
            ]);

            // 发送消息（文本消息）
            $username = Env::get('api.username', '');
            $password = Env::get('api.password', '');
            $toAccountId = '';
            if (!empty($username) || !empty($password)) {
                $toAccountId = Db::name('users')->where('account', $username)->value('s2_accountId');
            }

            $wsController = new WebSocketController(['userName' => $username, 'password' => $password, 'accountId' => $toAccountId]);
            
            $sendTime = time();
            $result = $wsController->sendPersonal([
                'wechatFriendId' => $friendId,
                'wechatAccountId' => $wechatAccountId,
                'msgType' => 1, // 文本消息
                'content' => $content,
            ]);

            $isSend = 0;
            $receiveTime = 0;

            // 解析返回结果
            $resultData = json_decode($result, true);
            if (!empty($resultData) && $resultData['code'] == 200) {
                $isSend = 1;
                $receiveTime = time(); // 简化处理，实际应该从返回结果中获取
            }

            // 更新记录
            Db::name('kf_auto_greetings_record')
                ->where('id', $recordId)
                ->update([
                    'isSend' => $isSend,
                    'sendTime' => $sendTime,
                    'receiveTime' => $receiveTime,
                ]);

            // 更新规则使用次数
            Db::name('kf_auto_greetings')
                ->where('id', $rule['id'])
                ->setInc('usageCount');

        } catch (\Exception $e) {
            Log::error('发送问候消息失败：' . $e->getMessage() . '，规则ID：' . $rule['id']);
        }
    }

}
