<?php

namespace app\job;

use app\api\controller\WebSocketController;
use app\cunkebao\model\Workbench;
use app\cunkebao\model\WorkbenchGroupPush;
use app\api\model\WechatFriendModel as WechatFriend;
use app\api\model\WechatMomentsModel as WechatMoments;
use think\facade\Log;
use think\facade\Env;
use think\Db;
use think\queue\Job;
use think\facade\Cache;
use think\facade\Config;
use app\api\controller\MomentsController as Moments;
use Workerman\Lib\Timer;
use app\cunkebao\controller\WorkbenchController;

/**
 * 工作台消息群发任务
 * Class WorkbenchGroupPushJob
 * @package app\job
 */
class WorkbenchGroupPushJob
{

    /**
     * 最大重试次数
     */
    const MAX_RETRY_ATTEMPTS = 3;

    /**
     * 队列任务处理
     * @param Job $job 队列任务
     * @param array $data 任务数据
     * @return bool
     */
    public function fire(Job $job, $data)
    {
        $jobId = $data['jobId'] ?? '';
        $queueLockKey = $data['queueLockKey'] ?? '';
        try {
            $this->logJobStart($jobId, $queueLockKey);
            $this->execute();
            $this->handleJobSuccess($job, $queueLockKey);
            return true;
        } catch (\Exception $e) {
            return $this->handleJobError($e, $job, $queueLockKey);
        }
    }

    /**
     * 执行任务
     * @throws \Exception
     */
    public function execute()
    {
        try {
            // 获取所有工作台
            $workbenches = Workbench::where(['status' => 1, 'type' => 3, 'isDel' => 0,'id' => 264])->order('id desc')->select();
            foreach ($workbenches as $workbench) {
                // 获取工作台配置
                $configModel = WorkbenchGroupPush::where('workbenchId', $workbench->id)->find();
                if (!$configModel) {
                    continue;
                }

                // 标准化配置
                $config = $this->normalizeConfig($configModel->toArray());
                if ($config === false) {
                    Log::warning("消息群发：配置无效，工作台ID: {$workbench->id}");
                    continue;
                }

                //判断是否推送
                $isPush = $this->isPush($workbench, $config);
                if (empty($isPush)) {
                    continue;
                }

                $targetType = intval($config['targetType']);
                $groupPushSubType = intval($config['groupPushSubType']);

                // 如果是群推送且是群公告，暂时跳过（晚点处理）
                if ($targetType == 1 && $groupPushSubType == 2) {
                    Log::info("群公告功能暂未实现，工作台ID: {$workbench->id}");
                    continue;
                }

                // 获取内容库（群群发需要内容库，好友推送也需要内容库）
                $contentLibrary = $this->getContentLibrary($workbench, $config);
                if (empty($contentLibrary)) {
                    continue;
                }
                // 处理内容发送
                $this->sendMsgToGroup($workbench, $config, $contentLibrary);
            }
        } catch (\Exception $e) {
            Log::error("消息群发任务异常: " . $e->getMessage());
            throw $e;
        }
    }


    // 发送消息（支持群推送和好友推送）
    public function sendMsgToGroup($workbench, $config, $msgConf)
    {
        // 消息拼接  msgType(1:文本 3:图片 43:视频 47:动图表情包（gif、其他表情包） 49:小程序/其他：图文、文件)
        // 当前，type 为文本、图片、动图表情包的时候，content为string, 其他情况为对象 {type: 'file/link/...', url: '', title: '', thunmbPath: '', desc: ''}

        $targetType = intval($config['targetType']); // 默认1=群推送

        $toAccountId = '';
        $username = Env::get('api.username', '');
        $password = Env::get('api.password', '');
        if (!empty($username) || !empty($password)) {
            $toAccountId = Db::name('users')->where('account', $username)->value('s2_accountId');
        }
        // 建立WebSocket
        $wsController = new WebSocketController(['userName' => $username, 'password' => $password, 'accountId' => $toAccountId]);
        $ownerWechatIds = $config['ownerWechatIds'] ?? $this->getOwnerWechatIds($config);
        if ($targetType == 1) {
            // 群推送
            $this->sendToGroups($workbench, $config, $msgConf, $wsController, $ownerWechatIds);
        } else {
            // 好友推送
            $this->sendToFriends($workbench, $config, $msgConf, $wsController, $ownerWechatIds);
        }
    }

    /**
     * 发送群消息
     */
    protected function sendToGroups($workbench, $config, $msgConf, $wsController, array $ownerWechatIds = [])
    {
        // 获取群推送子类型：1=群群发，2=群公告
        $groupPushSubType = intval($config['groupPushSubType'] ?? 1); // 默认1=群群发

        // 如果是群公告，暂时跳过（晚点处理）
        if ($groupPushSubType == 2) {
            Log::info("群公告功能暂未实现，工作台ID: {$workbench['id']}");
            return false;
        }

        // 群群发：从groups字段获取群ID列表
        $groups = $config['groups'] ?? [];
        if (empty($groups)) {
            Log::warning("群群发：未选择微信群，工作台ID: {$workbench['id']}");
            return false;
        }

        $query = Db::name('wechat_group')
            ->whereIn('id', $groups);

        if (!empty($ownerWechatIds)) {
            $query->whereIn('wechatAccountId', $ownerWechatIds);
        }

        $groupsData = $query
            ->field('id,wechatAccountId,chatroomId,companyId,ownerWechatId')
            ->select();
        if (empty($groupsData)) {
            Log::warning("群群发：未找到微信群数据，工作台ID: {$workbench['id']}");
            return false;
        }

        foreach ($msgConf as $content) {
            $sqlData = [];

            foreach ($groupsData as $group) {
                // 构建发送数据
                $sendData = $this->buildSendData($content, $config, $group['wechatAccountId'], $group['id'], 'group');
                if (empty($sendData)) {
                    continue;
                }

                //发送消息
                foreach ($sendData as $send) {
                    $wsController->sendCommunity($send);
                }

                // 准备插入发送记录
                $sqlData[] = [
                    'workbenchId' => $workbench['id'],
                    'contentId' => $content['id'],
                    'groupId' => $group['id'],
                    'friendId' => null,
                    'targetType' => 1,
                    'wechatAccountId' => $group['wechatAccountId'],
                    'createTime' => time()
                ];
            }

            // 批量插入发送记录
            if (!empty($sqlData)) {
                Db::name('workbench_group_push_item')->insertAll($sqlData);
                Log::info("群群发：推送了" . count($sqlData) . "个群，工作台ID: {$workbench['id']}");
            }
        }

        return true;
    }

    /**
     * 发送好友消息
     */
    protected function sendToFriends($workbench, $config, $msgConf, $wsController, array $ownerWechatIds = [])
    {
        $friends = $config['friends'] ?? [];
        $trafficPools = $config['trafficPools'] ?? [];
        $devices = $config['devices'] ?? [];

        $friendsData = [];

        // 指定好友
        if (!empty($friends)) {
            $friendsData = array_merge($friendsData, $this->getFriendsByIds($friends, $ownerWechatIds));
        }

        // 流量池好友
        if (!empty($trafficPools)) {
            $friendsData = array_merge($friendsData, $this->getFriendsByTrafficPools($trafficPools, $workbench, $ownerWechatIds));
        }

        // 如果未选择好友或流量池，则根据设备查询所有好友
        if (empty($friendsData)) {
            if (empty($devices)) {
                Log::warning('好友推送：未选择好友或流量池，且未选择设备，无法推送');
                return false;
            }
            $friendsData = $this->getFriendsByDevices($devices, $ownerWechatIds);
        }
        $friendsData = $this->deduplicateFriends($friendsData);
        if (empty($friendsData)) {
            return false;
        }

        // 获取已推送的好友ID列表（不限制时间范围，避免重复推送）
        $sentFriendIds = Db::name('workbench_group_push_item')
            ->where('workbenchId', $workbench->id)
            ->where('targetType', 2)
            ->column('friendId');
        $sentFriendIds = array_unique(array_filter($sentFriendIds));

        // 过滤掉所有已推送的好友
        $friendsData = array_filter($friendsData, function($friend) use ($sentFriendIds) {
            return !in_array($friend['id'], $sentFriendIds);
        });

        if (empty($friendsData)) {
            Log::info('好友推送：所有好友都已推送过');
            return false;
        }

        // 重新索引数组
        $friendsData = array_values($friendsData);

        // 计算剩余可推送人数（基于累计推送人数）
        $sentFriendCount = count($sentFriendIds);
        $maxPerDay = intval($config['maxPerDay']);
        $remainingCount = $maxPerDay - $sentFriendCount;
        
        if ($remainingCount <= 0) {
            Log::info('好友推送：累计推送人数已达上限');
            return false;
        }

        // 限制本次推送人数（不超过剩余可推送人数）
        $friendsData = array_slice($friendsData, 0, $remainingCount);

        // 批量处理：每批最多500人
        $batchSize = 500;
        $batches = array_chunk($friendsData, $batchSize);

        foreach ($msgConf as $content) {
            foreach ($batches as $batchIndex => $batch) {
                $sqlData = [];

                foreach ($batch as $friend) {
                    // 构建发送数据
                    $sendData = $this->buildSendData($content, $config, $friend['wechatAccountId'], $friend['id'], 'friend');

                    if (empty($sendData)) {
                        continue;
                    }

                    // 发送个人消息
                    foreach ($sendData as $send) {
                        if ($send['msgType'] == 49){
                            $sendContent = json_encode($send['content'], 256);
                        } else {
                            $sendContent = $send['content'];
                        }
                        $wsController->sendPersonal([
                            'wechatFriendId' => $friend['id'],
                            'wechatAccountId' => $friend['wechatAccountId'],
                            'msgType' => $send['msgType'],
                            'content' => $sendContent,
                        ]);
                    }

                    // 准备插入发送记录
                    $sqlData[] = [
                        'workbenchId' => $workbench['id'],
                        'contentId' => $content['id'],
                        'groupId' => null,
                        'friendId' => $friend['id'],
                        'targetType' => 2,
                        'wechatAccountId' => $friend['wechatAccountId'],
                        'createTime' => time()
                    ];
                }

                // 批量插入发送记录
                if (!empty($sqlData)) {
                    Db::name('workbench_group_push_item')->insertAll($sqlData);
                    Log::info("好友推送：第" . ($batchIndex + 1) . "批，推送了" . count($sqlData) . "个好友");
                }

                // 如果不是最后一批，等待一下再处理下一批（避免一次性推送太多）
                if ($batchIndex < count($batches) - 1) {
                    sleep(1); // 等待1秒
                }
            }
        }
    }

    /**
     * 构建发送数据
     */
    protected function buildSendData($content, $config, $wechatAccountId, $targetId, $type = 'group')
    {
        $sendData = [];

        // 内容处理
        if (!empty($content['content'])) {
            // 京东转链
            if (!empty($config['promotionSiteId'])) {
                $WorkbenchController = new WorkbenchController();
                $jdLink = $WorkbenchController->changeLink($content['content'], $config['promotionSiteId']);
                $jdLink = json_decode($jdLink, true);
                if ($jdLink['code'] == 200) {
                    $content['content'] = $jdLink['data'];
                }
            }

            if ($type == 'group') {
                $sendData[] = [
                    'content' => $content['content'],
                    'msgType' => 1,
                    'wechatAccountId' => $wechatAccountId,
                    'wechatChatroomId' => $targetId,
                ];
            } else {
                $sendData[] = [
                    'content' => $content['content'],
                    'msgType' => 1,
                ];
            }
        }

        // 根据内容类型处理
        switch ($content['contentType']) {
            case 1:
                // 图片解析
                $imgs = json_decode($content['resUrls'], true);
                if (!empty($imgs)) {
                    foreach ($imgs as $img) {
                        if ($type == 'group') {
                            $sendData[] = [
                                'content' => $img,
                                'msgType' => 3,
                                'wechatAccountId' => $wechatAccountId,
                                'wechatChatroomId' => $targetId,
                            ];
                        } else {
                            $sendData[] = [
                                'content' => $img,
                                'msgType' => 3,
                            ];
                        }
                    }
                }
                break;
            case 2:
                // 链接解析
                $url = json_decode($content['urls'], true);
                if (!empty($url[0])) {
                    $url = $url[0];
                    $linkContent = [
                        'desc' => $url['desc'],
                        'thumbPath' => $url['image'],
                        'title' => $url['desc'],
                        'type' => 'link',
                        'url' => $url['url'],
                    ];
                    if ($type == 'group') {
                        $sendData[] = [
                            'content' => $linkContent,
                            'msgType' => 49,
                            'wechatAccountId' => $wechatAccountId,
                            'wechatChatroomId' => $targetId,
                        ];
                    } else {
                        $sendData[] = [
                            'content' => $linkContent,
                            'msgType' => 49,
                        ];
                    }
                }
                break;
            case 3:
                // 视频解析
                $video = json_decode($content['resUrls'], true);
                if (!empty($video)) {
                    $video = $video[0];
                }
                if ($type == 'group') {
                    $sendData[] = [
                        'content' => $video,
                        'msgType' => 43,
                        'wechatAccountId' => $wechatAccountId,
                        'wechatChatroomId' => $targetId,
                    ];
                } else {
                    $sendData[] = [
                        'content' => $video,
                        'msgType' => 43,
                    ];
                }
                break;
        }

        return $sendData;
    }

    /**
     * 根据好友ID获取好友信息
     * @param array $friendIds
     * @return array
     */
    protected function getFriendsByIds(array $friendIds, array $ownerWechatIds = [])
    {
        if (empty($friendIds)) {
            return [];
        }
        $query = Db::table('s2_wechat_friend')
            ->whereIn('id', $friendIds)
            ->where('isDeleted', 0);

        if (!empty($ownerWechatIds)) {
            $query->whereIn('wechatAccountId', $ownerWechatIds);
        }

        $friends = $query
            ->field('id,wechatAccountId,wechatId,ownerWechatId')
            ->select();
        if ($friends === false) {
            return [];
        }

        return $friends;
    }

    /**
     * 根据设备获取好友信息
     * @param array $deviceIds
     * @return array
     */
    protected function getFriendsByDevices(array $deviceIds, array $ownerWechatIds = [])
    {
        if (empty($deviceIds)) {
            return [];
        }

        $query = Db::table('s2_company_account')
            ->alias('ca')
            ->join(['s2_wechat_account' => 'wa'], 'ca.id = wa.deviceAccountId')
            ->join(['s2_wechat_friend' => 'wf'], 'wf.wechatAccountId = wa.id')
            ->where([
                'ca.status' => 0,
                'wf.isDeleted' => 0,
                'wa.deviceAlive' => 1,
                'wa.wechatAlive' => 1
            ])
            ->whereIn('wa.currentDeviceId', $deviceIds);

        if (!empty($ownerWechatIds)) {
            $query->whereIn('wf.wechatAccountId', $ownerWechatIds);
        }

        $friends = $query
            ->field('wf.id,wf.wechatAccountId,wf.wechatId,wf.ownerWechatId')
            ->group('wf.id')
            ->select();

        if ($friends === false) {
            return [];
        }

        return $friends->toArray();
    }

    /**
     * 根据流量池获取好友信息
     * @param array $trafficPools
     * @param Workbench $workbench
     * @return array
     */
        protected function getFriendsByTrafficPools(array $trafficPools, $workbench, array $ownerWechatIds = [])
    {
        if (empty($trafficPools)) {
            return [];
        }

        $companyId = $workbench->companyId ?? 0;
        
        // 检查是否包含"所有好友"（packageId=0）
        $hasAllFriends = in_array(0, $trafficPools) || in_array('0', $trafficPools);
        $normalPools = array_filter($trafficPools, function($id) {
            return $id !== 0 && $id !== '0';
        });
        
        $friends = [];
        
        // 处理"所有好友"特殊流量池
        if ($hasAllFriends) {
            $allFriends = $this->getAllFriendsByCompany($companyId, $ownerWechatIds);
            $friends = array_merge($friends, $allFriends);
        }
        
        // 处理普通流量池
        if (!empty($normalPools)) {
            $normalFriends = $this->getFriendsByNormalPools($normalPools, $companyId, $ownerWechatIds);
            $friends = array_merge($friends, $normalFriends);
        }

        // 去重
        $uniqueFriends = [];
        $seenIds = [];
        foreach ($friends as $friend) {
            $friendId = $friend['id'] ?? null;
            if ($friendId && !in_array($friendId, $seenIds)) {
                $seenIds[] = $friendId;
                $uniqueFriends[] = $friend;
            }
        }

        if (empty($uniqueFriends)) {
            Log::info('好友推送：流量池未匹配到好友');
            return [];
        }

        return $uniqueFriends;
    }
    
    /**
     * 获取公司下所有好友（特殊流量池 packageId=0）
     * @param int $companyId
     * @param array $ownerWechatIds
     * @return array
     */
    protected function getAllFriendsByCompany($companyId, array $ownerWechatIds = [])
    {
        // 获取公司下所有设备的微信ID
        $wechatIds = Db::name('device')->alias('d')
            ->join('(SELECT MAX(id) AS id, deviceId FROM ck_device_wechat_login WHERE companyId='.$companyId.' GROUP BY deviceId) dwl_max', 'dwl_max.deviceId = d.id')
            ->join('device_wechat_login dwl', 'dwl.id = dwl_max.id')
            ->where(['d.companyId' => $companyId, 'd.deleteTime' => 0])
            ->column('dwl.wechatId');

        if (empty($wechatIds)) {
            return [];
        }

        $query = Db::table('s2_wechat_friend')->alias('wf')
            ->join(['s2_wechat_account' => 'wa'], 'wa.id = wf.wechatAccountId', 'left')
            ->where('wf.ownerWechatId', 'in', $wechatIds)
            ->where('wf.isDeleted', 0)
            ->whereNotNull('wf.id')
            ->whereNotNull('wf.wechatAccountId');

        if (!empty($ownerWechatIds)) {
            $query->whereIn('wf.wechatAccountId', $ownerWechatIds);
        }

        $friends = $query
            ->field('wf.id,wf.wechatAccountId,wf.wechatId,wf.ownerWechatId')
            ->group('wf.id')
            ->select();

        return $friends ?: [];
    }
    
    /**
     * 根据普通流量池获取好友信息
     * @param array $packageIds
     * @param int $companyId
     * @param array $ownerWechatIds
     * @return array
     */
    protected function getFriendsByNormalPools(array $packageIds, $companyId, array $ownerWechatIds = [])
    {
        $query = Db::name('traffic_source_package_item')
            ->alias('tspi')
            ->leftJoin('traffic_source_package tsp', 'tsp.id = tspi.packageId')
            ->leftJoin('traffic_pool tp', 'tp.identifier = tspi.identifier')
            ->leftJoin(['s2_wechat_friend' => 'wf'], 'wf.wechatId = tp.wechatId')
            ->leftJoin(['s2_wechat_account' => 'wa'], 'wa.id = wf.wechatAccountId')
            ->whereIn('tspi.packageId', $packageIds)
            ->where('tsp.isDel', 0)
            ->where('wf.isDeleted', 0)
            ->whereNotNull('wf.id')
            ->whereNotNull('wf.wechatAccountId')
            ->where(function ($query) use ($companyId) {
                $query->whereIn('tsp.companyId', [$companyId, 0]);
            })
            ->where(function ($query) use ($companyId) {
                $query->whereIn('tspi.companyId', [$companyId, 0]);
            });

        if (!empty($ownerWechatIds)) {
            $query->whereIn('wf.wechatAccountId', $ownerWechatIds);
        }

        $friends = $query
            ->field('wf.id,wf.wechatAccountId,wf.wechatId,wf.ownerWechatId')
            ->group('wf.id')
            ->select();

        return $friends ?: [];
    }

    /**
     * 标准化群推送配置
     * @param array $config
     * @return array|false
     */
    protected function normalizeConfig(array $config)
    {
        $config['targetType'] = intval($config['targetType'] ?? 1);
        $config['groupPushSubType'] = intval($config['groupPushSubType'] ?? 1);
        if (!in_array($config['groupPushSubType'], [1, 2], true)) {
            $config['groupPushSubType'] = 1;
        }

        $config['pushType'] = !empty($config['pushType']) ? 1 : 0;
        $config['status'] = !empty($config['status']) ? 1 : 0;
        $config['isLoop'] = !empty($config['isLoop']) ? 1 : 0;

        $config['startTime'] = $this->normalizeTimeString($config['startTime'] ?? '00:00');
        $config['endTime'] = $this->normalizeTimeString($config['endTime'] ?? '23:59');
        $config['maxPerDay'] = max(0, intval($config['maxPerDay'] ?? 0));

        $config['friendIntervalMin'] = max(0, intval($config['friendIntervalMin'] ?? 0));
        $config['friendIntervalMax'] = max(0, intval($config['friendIntervalMax'] ?? $config['friendIntervalMin']));
        if ($config['friendIntervalMin'] > $config['friendIntervalMax']) {
            $config['friendIntervalMax'] = $config['friendIntervalMin'];
        }

        $config['messageIntervalMin'] = max(0, intval($config['messageIntervalMin'] ?? 0));
        $config['messageIntervalMax'] = max(0, intval($config['messageIntervalMax'] ?? $config['messageIntervalMin']));
        if ($config['messageIntervalMin'] > $config['messageIntervalMax']) {
            $config['messageIntervalMax'] = $config['messageIntervalMin'];
        }

        $config['ownerWechatIds'] = $this->deduplicateIds($this->jsonToArray($config['ownerWechatIds'] ?? []));
        $config['groups'] = $this->deduplicateIds($this->jsonToArray($config['groups'] ?? []));
        $config['friends'] = $this->deduplicateIds($this->jsonToArray($config['friends'] ?? []));
        $config['trafficPools'] = $this->deduplicateIds($this->jsonToArray($config['trafficPools'] ?? []));
        $config['devices'] = $this->deduplicateIds($this->jsonToArray($config['devices'] ?? []));
        $config['contentLibraries'] = $this->deduplicateIds($this->jsonToArray($config['contentLibraries'] ?? []));
        $config['postPushTags'] = $this->deduplicateIds($this->jsonToArray($config['postPushTags'] ?? []));

        return $config;
    }

    /**
     * 将混合类型转换为数组
     * @param mixed $value
     * @return array
     */
    protected function jsonToArray($value): array
    {
        if (empty($value)) {
            return [];
        }

        if (is_array($value)) {
            return $value;
        }

        if (is_string($value)) {
            $decoded = json_decode($value, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                return is_array($decoded) ? $decoded : [];
            }
        }

        return [];
    }

    /**
     * 归一化时间字符串，保留到分钟
     * @param string $time
     * @return string
     */
    protected function normalizeTimeString(string $time): string
    {
        if (empty($time)) {
            return '00:00';
        }
        $parts = explode(':', $time);
        $hour = str_pad(intval($parts[0] ?? 0), 2, '0', STR_PAD_LEFT);
        $minute = str_pad(intval($parts[1] ?? 0), 2, '0', STR_PAD_LEFT);
        return "{$hour}:{$minute}";
    }

    /**
     * 对ID数组进行去重并清理无效值
     * @param array $ids
     * @return array
     */
    protected function deduplicateIds(array $ids)
    {
        if (empty($ids)) {
            return [];
        }

        $normalized = array_map(function ($value) {
            if (is_array($value) && isset($value['id'])) {
                return $value['id'];
            }
            if (is_object($value) && isset($value->id)) {
                return $value->id;
            }
            return $value;
        }, $ids);

        $filtered = array_filter($normalized, function ($value) {
            return $value !== null && $value !== '';
        });

        if (empty($filtered)) {
            return [];
        }

        return array_values(array_unique($filtered));
    }

    /**
     * 对内容列表根据内容ID去重
     * @param mixed $contents
     * @return array
     */
    protected function deduplicateContentList($contents)
    {
        if (empty($contents)) {
            return [];
        }

        if ($contents instanceof \think\Collection || $contents instanceof \think\model\Collection) {
            $contents = $contents->toArray();
        } elseif ($contents instanceof \think\Model) {
            $contents = [$contents->toArray()];
        }

        if (!is_array($contents)) {
            return [];
        }

        $result = [];
        $unique = [];

        foreach ($contents as $content) {
            if ($content instanceof \think\Model) {
                $content = $content->toArray();
            } elseif (is_object($content)) {
                $content = (array)$content;
            }

            if (!is_array($content)) {
                continue;
            }

            $contentId = $content['id'] ?? null;
            if (empty($contentId) || isset($unique[$contentId])) {
                continue;
            }

            $unique[$contentId] = true;
            $result[] = $content;
        }

        return $result;
    }

    /**
     * 对好友数据进行去重
     * @param array $friends
     * @return array
     */
    protected function deduplicateFriends(array $friends)
    {
        if (empty($friends)) {
            return [];
        }

        $unique = [];
        $result = [];

        foreach ($friends as $friend) {
            if (empty($friend['id'])) {
                continue;
            }
            if (isset($unique[$friend['id']])) {
                continue;
            }
            $unique[$friend['id']] = true;
            $result[] = $friend;
        }

        return $result;
    }

    /**
     * 获取配置中的客服微信ID列表
     * @param array $config
     * @return array
     */
    protected function getOwnerWechatIds($config)
    {
        if (empty($config['ownerWechatIds'])) {
            return [];
        }

        $ownerWechatIds = $config['ownerWechatIds'];

        if (is_string($ownerWechatIds)) {
            $decoded = json_decode($ownerWechatIds, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $ownerWechatIds = $decoded;
            }
        }

        if (!is_array($ownerWechatIds)) {
            return [];
        }

        $ownerWechatIds = array_map(function ($id) {
            return is_numeric($id) ? intval($id) : $id;
        }, $ownerWechatIds);

        return $this->deduplicateIds($ownerWechatIds);
    }


    /**
     * 记录发送历史
     * @param Workbench $workbench
     * @param array $devices
     * @param array $contentLibrary
     */
    protected function recordSendHistory($workbench, $devices, $contentLibrary)
    {
        $now = time();
        $data = [];
        foreach ($devices as $device) {
            $data = [
                'workbenchId' => $workbench->id,
                'deviceId' => $device['deviceId'],
                'contentId' => $contentLibrary['id'],
                'wechatAccountId' => $device['wechatAccountId'],
                'createTime' => $now,
            ];
            Db::name('workbench_group_push_item')->insert($data);
        }

    }

    /**
     * 判断是否推送
     * @param Workbench $workbench 工作台
     * @param array $config 配置
     * @return bool
     */
    protected function isPush($workbench, $config)
    {
        // 检查发送间隔（新逻辑：根据startTime、endTime、maxPerDay动态计算）
        $today = date('Y-m-d');
        $startTimestamp = strtotime($today . ' ' . $config['startTime'] . ':00');
        $endTimestamp = strtotime($today . ' ' . $config['endTime'] . ':00');

        // 如果时间不符，则跳过
        if (($startTimestamp > time() || $endTimestamp < time()) && empty($config['pushType'])) {
            return false;
        }

        $totalSeconds = $endTimestamp - $startTimestamp;
        if ($totalSeconds <= 0 || empty($config['maxPerDay'])) {
            return false;
        }

        $targetType = intval($config['targetType']); // 默认1=群推送

        if ($targetType == 2) {
            // 好友推送：maxPerDay表示每日推送人数
            // 查询已推送的好友ID列表（去重）
            $sentFriendIds = Db::name('workbench_group_push_item')
                ->where('workbenchId', $workbench->id)
                ->where('targetType', 2)
                ->column('friendId');
            $sentFriendIds = array_filter($sentFriendIds); // 过滤null值
            $count = count(array_unique($sentFriendIds)); // 去重后统计累计推送人数
            
            if ($count >= $config['maxPerDay']) {
                return false;
            }

            // 计算本次同步的最早允许时间（基于好友/消息间隔配置）
            $friendIntervalMin = max(0, intval($config['friendIntervalMin'] ?? 0));
            $messageIntervalMin = max(0, intval($config['messageIntervalMin'] ?? 0));
            $minInterval = max(1, $friendIntervalMin + $messageIntervalMin);

            $lastSendTime = Db::name('workbench_group_push_item')
                ->where('workbenchId', $workbench->id)
                ->where('targetType', 2)
                ->order('id', 'desc')
                ->value('createTime');

            if (!empty($lastSendTime) && (time() - $lastSendTime) < $minInterval) {
                return false;
            }
        } else {
            // 群推送：maxPerDay表示每日推送次数
            $interval = floor($totalSeconds / $config['maxPerDay']);

            // 查询今日已同步次数
            $count = Db::name('workbench_group_push_item')
                ->where('workbenchId', $workbench->id)
                ->where('targetType', 1)
                ->whereTime('createTime', 'between', [$startTimestamp, $endTimestamp])
                ->count();
            if ($count >= $config['maxPerDay']) {
                return false;
            }

            // 计算本次同步的最早允许时间
            $nextSyncTime = $startTimestamp + $count * $interval;
            if (time() < $nextSyncTime) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * 获取内容库
     * @param Workbench $workbench 工作台
     * @param array $config 配置
     * @return array|bool
     */
    protected function getContentLibrary($workbench, $config)
    {
        $targetType = intval($config['targetType']); // 默认1=群推送
        $groupPushSubType = intval($config['groupPushSubType']); // 默认1=群群发

        // 如果是群公告，不需要内容库（晚点处理）
        if ($targetType == 1 && $groupPushSubType == 2) {
            return false;
        }

        $contentids = $config['contentLibraries'] ?? [];
        if (empty($contentids)) {
            Log::warning("未选择内容库，工作台ID: {$workbench->id}");
            return false;
        }

        if ($config['pushType'] == 1) {
            $limit = 10;
        } else {
            $limit = 1;
        }

        //推送顺序
        if ($config['pushOrder'] == 1) {
            $order = 'ci.sendTime desc, ci.id asc';
        } else {
            $order = 'ci.sendTime desc, ci.id desc';
        }

        // 基础查询，根据targetType过滤记录
        $query = Db::name('content_library')->alias('cl')
            ->join('content_item ci', 'ci.libraryId = cl.id')
            ->join('workbench_group_push_item wgpi', 'wgpi.contentId = ci.id and wgpi.workbenchId = ' . $workbench->id . ' and wgpi.targetType = ' . $targetType, 'left')
            ->where(['cl.isDel' => 0, 'ci.isDel' => 0])
            ->where('ci.sendTime <= ' . (time() + 60))
            ->whereIn('cl.id', $contentids)
            ->field([
                'ci.id',
                'ci.libraryId',
                'ci.contentType',
                'ci.title',
                'ci.content',
                'ci.resUrls',
                'ci.urls',
                'ci.comment',
                'ci.sendTime'
            ]);
        // 复制 query
        $query2 = clone $query;
        $query3 = clone $query;
        // 根据isLoop处理不同的发送逻辑
        if ($config['isLoop'] == 1) {
            // 可以循环发送（只有群推送时才能为1）
            // 1. 优先获取未发送的内容
            $unsentContent = $this->deduplicateContentList(
                $query->where('wgpi.id', 'null')
                    ->order($order)
                    ->limit(0, $limit)
                    ->select()
            );
            if (!empty($unsentContent)) {
                return $unsentContent;
            }
            $lastSendData = Db::name('workbench_group_push_item')
                ->where('workbenchId', $workbench->id)
                ->where('targetType', $targetType)
                ->order('id desc')
                ->find();
            $fastSendData = Db::name('workbench_group_push_item')
                ->where('workbenchId', $workbench->id)
                ->where('targetType', $targetType)
                ->order('id asc')
                ->find();

            if (empty($lastSendData) || empty($fastSendData)) {
                return [];
            }

            $sentContent = $this->deduplicateContentList(
                $query2->where('wgpi.contentId', '<', $lastSendData['contentId'])
                    ->order('wgpi.id ASC')
                    ->group('wgpi.contentId')
                    ->limit(0, $limit)
                    ->select()
            );

            if (empty($sentContent)) {
                $sentContent = $this->deduplicateContentList(
                    $query3->where('wgpi.contentId', '=', $fastSendData['contentId'])
                        ->order('wgpi.id ASC')
                        ->group('wgpi.contentId')
                        ->limit(0, $limit)
                        ->select()
                );
            }
            return $sentContent;
        } else {
            // 不能循环发送，只获取未发送的内容（好友推送时isLoop=0）
            $list = $this->deduplicateContentList(
                $query->where('wgpi.id', 'null')
                    ->order($order)
                    ->limit(0, $limit)
                    ->select()
            );
            return $list;
        }
    }

    /**
     * 记录任务开始
     * @param string $jobId
     * @param string $queueLockKey
     */
    protected function logJobStart($jobId, $queueLockKey)
    {
        Log::info('开始处理工作台消息群发任务: ' . json_encode([
                'jobId' => $jobId,
                'queueLockKey' => $queueLockKey
            ]));
    }

    /**
     * 处理任务成功
     * @param Job $job
     * @param string $queueLockKey
     */
    protected function handleJobSuccess($job, $queueLockKey)
    {
        $job->delete();
        Cache::rm($queueLockKey);
        Log::info('工作台消息群发任务执行成功');
    }

    /**
     * 处理任务错误
     * @param \Exception $e
     * @param Job $job
     * @param string $queueLockKey
     * @return bool
     */
    protected function handleJobError(\Exception $e, $job, $queueLockKey)
    {
        Log::error('工作台消息群发任务异常：' . $e->getMessage());

        if (!empty($queueLockKey)) {
            Cache::rm($queueLockKey);
            Log::info("由于异常释放队列锁: {$queueLockKey}");
        }

        if ($job->attempts() > self::MAX_RETRY_ATTEMPTS) {
            $job->delete();
        } else {
            $job->release(Config::get('queue.failed_delay', 10));
        }

        return false;
    }
} 