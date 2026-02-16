<?php

namespace app\job;

use app\api\controller\WebSocketController;
use app\cunkebao\model\Workbench;
use app\cunkebao\model\WorkbenchMomentsSync as WorkbenchMoments;
use app\api\model\WechatFriendModel as WechatFriend;
use app\api\model\WechatMomentsModel as WechatMoments;
use think\facade\Log;
use think\facade\Env;
use think\Db;
use think\queue\Job;
use think\facade\Cache;
use think\facade\Config;
use app\api\controller\MomentsController as Moments;
use app\chukebao\model\KfMoments;

/**
 * 工作台朋友圈同步任务
 * Class WorkbenchMomentsJob
 * @package app\job
 */
class WorkbenchMomentsJob
{
    /**
     * 内容类型映射
     * 0：未知 1：图片 2：链接 3：视频 4：文本 5：小程序 6:图文
     */
    const CONTENT_TYPE_MAP = [
        0 => 1, // 未知 -> 文本
        1 => 2, // 图片 -> 图文
        2 => 4, // 链接 -> 链接
        3 => 3, // 视频 -> 视频
        4 => 1, // 文本 -> 文本
        5 => 1, // 小程序 -> 文本
        6 => 2, // 图文 -> 图文
    ];

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
            $this->execute2();
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
            $workbenches = Workbench::where(['status' => 1, 'type' => 2, 'isDel' => 0])->order('id desc')->select();
            foreach ($workbenches as $workbench) {
                // 获取工作台配置
                $config = WorkbenchMoments::where('workbenchId', $workbench->id)->find();
                if (!$config) {
                    continue;
                }
                $startTime = strtotime(date('Y-m-d ' . $config['startTime']));
                $endTime = strtotime(date('Y-m-d ' . $config['endTime']));
                // 如果时间不符，则跳过
                if ($startTime > time() || $endTime < time()) {
                    continue;
                }

                // 获取设备
                $devices = $this->getDevice($workbench, $config);
                if (empty($devices)) {
                    continue;
                }

                // 获取内容库
                $contentLibrary = $this->getContentLibrary($workbench, $config);
                if (empty($contentLibrary)) {
                    continue;
                }
                // 处理内容发送
                $this->handleContentSend($workbench, $config, $devices, $contentLibrary);
            }
        } catch (\Exception $e) {
            Log::error("朋友圈同步任务异常: " . $e->getMessage());
            throw $e;
        }
    }

    public function execute2()
    {
        try {
            // 1) 每日重置
            $this->resetDailyCountersIfNeeded();

            // 2) 获取发送窗口内的任务
            [$nowTs, $kfMoments] = $this->getWindowTasks();
            foreach ($kfMoments as $val) {
                $companyId = (int)($val['companyId'] ?? 0);
                $userId = (int)($val['userId'] ?? 0);

                // 2.1) 数据规范化
                $sendData = json_decode($val->sendData, true);
                $sendData = $this->normalizeSendData($sendData);

                // 2.2) 账号额度过滤
                $items = $sendData['jobPublishWechatMomentsItems'] ?? [];
                if (empty($items)) { continue; }
                $allowed = $this->filterAccountsByQuota($companyId, $userId, $items);
                if (empty($allowed)) { continue; }
                $sendData['jobPublishWechatMomentsItems'] = $allowed;

                // 3) 下发
                $moments = new Moments();
                $res = $moments->addJob($sendData);
                $res = json_decode($res, true);
                if ($res['code'] == 200){
                    KfMoments::where(['id' => $val['id']])->update(['isSend' => 1]);

                    // 4) 统计
                    $this->incrementSendStats($companyId, $userId, $allowed);
                }
            }
        } catch (\Exception $e) {
            Log::error("朋友圈同步任务异常: " . $e->getMessage());
            throw $e;
        }
    }

    protected function resetDailyCountersIfNeeded()
    {
        $now = time();
        $todayStart = strtotime(date('Y-m-d 00:00:00'));
        if ($now - $todayStart >= 0 && $now - $todayStart <= 600) {
            $cacheKey = 'moments_settings_reset_' . date('Ymd');
            if (!Cache::has($cacheKey)) {
                Db::table('ck_kf_moments_settings')->where('sendNum', '<>', 0)
                    ->update(['sendNum' => 0, 'updateTime' => $now]);
                Cache::set($cacheKey, 1, 7200);
            }
        }
    }

    protected function getWindowTasks()
    {
        $nowTs = time();
        $windowStart = $nowTs - 300;
        $windowEnd = $nowTs + 300;
        $kfMoments = KfMoments::where(['isSend' => 0, 'isDel' => 0])
            ->whereBetween('sendTime', [$windowStart, $windowEnd])
            ->order('id desc')->select();
        return [$nowTs, $kfMoments];
    }

    protected function normalizeSendData(array $sendData)
    {
        $endTime = strtotime($sendData['endTime'] ?? '');
        if ($endTime <= time() + 1800) {
            $endTime = time() + 3600;
            $sendData['endTime'] = date('Y-m-d H:i:s', $endTime);
        }
        switch ($sendData['momentContentType'] ?? 1) {
            case 1:
                $sendData['link'] = ['image' => ''];
                $sendData['picUrlList'] = [];
                $sendData['videoUrl'] = '';
                break;
            case 2:
                $sendData['link'] = ['image' => ''];
                $sendData['videoUrl'] = '';
                break;
            case 3:
                $sendData['link'] = ['image' => ''];
                $sendData['picUrlList'] = [];
                break;
            case 4:
                $sendData['picUrlList'] = [];
                $sendData['videoUrl'] = '';
                break;
            default:
                $sendData['link'] = ['image' => ''];
                $sendData['picUrlList'] = [];
                $sendData['videoUrl'] = '';
                break;
        }
        return $sendData;
    }

    protected function filterAccountsByQuota(int $companyId, int $userId, array $items)
    {
        $wechatIds = array_values(array_filter(array_map(function($it){ return (int)($it['wechatAccountId'] ?? 0); }, $items)));
        if (empty($wechatIds)) { return []; }
        $settings = Db::table('ck_kf_moments_settings')
            ->where('companyId', $companyId)
            ->where('userId', $userId)
            ->whereIn('wechatId', $wechatIds)
            ->column('id,max,sendNum', 'wechatId');
        $allowed = [];
        foreach ($items as $it) {
            $wid = (int)($it['wechatAccountId'] ?? 0);
            if ($wid <= 0) { continue; }
            if (isset($settings[$wid])) {
                $max = (int)$settings[$wid]['max'];
                $sent = (int)$settings[$wid]['sendNum'];
                if ($sent < ($max > 0 ? $max : 5)) { $allowed[] = $it; }
            } else {
                $allowed[] = $it;
            }
        }
        return $allowed;
    }

    protected function incrementSendStats(int $companyId, int $userId, array $items)
    {
        try {
            $nowTs = time();
            foreach ($items as $it) {
                $wechatId = (int)($it['wechatAccountId'] ?? 0);
                if ($wechatId <= 0) { continue; }
                $cond = ['companyId' => $companyId, 'userId' => $userId, 'wechatId' => $wechatId];
                $setting = Db::table('ck_kf_moments_settings')->where($cond)->find();
                if ($setting) {
                    Db::table('ck_kf_moments_settings')->where('id', $setting['id'])
                        ->update(['sendNum' => Db::raw('sendNum + 1'), 'updateTime' => $nowTs]);
                } else {
                    Db::table('ck_kf_moments_settings')->insert([
                        'companyId' => $companyId,
                        'userId' => $userId,
                        'wechatId' => $wechatId,
                        'max' => 5,
                        'sendNum' => 1,
                        'createTime' => $nowTs,
                        'updateTime' => $nowTs,
                    ]);
                }
            }
        } catch (\Throwable $e) {
            Log::error('朋友圈发送统计失败: ' . $e->getMessage());
        }
    }


    /**
     * 处理内容发送
     * @param Workbench $workbench
     * @param WorkbenchMoments $config
     * @param array $devices
     * @param array $contentLibrary
     */
    protected function handleContentSend($workbench, $config, $devices, $contentLibrary)
    {
        // 准备评论数据
        $comment = [];
        if (!empty($contentLibrary['comment'])) {
            $comment[] = $contentLibrary['comment'];
        }

        // 准备发送数据
        $jobPublishWechatMomentsItems = [];
        foreach ($devices as $device) {
            $jobPublishWechatMomentsItems[] = [
                'comments' => $comment,
                'labels' => [],
                'wechatAccountId' => $device['wechatAccountId']
            ];
        }

        // 转换内容类型
        $momentContentType = self::CONTENT_TYPE_MAP[$contentLibrary['contentType']] ?? 1;
        $sendTime = !empty($contentLibrary['sendTime']) ? $contentLibrary['sendTime'] : time();

        // 图片url
        if ($momentContentType == 2) {
            $picUrlList = json_decode($contentLibrary['resUrls'], true);
        } else {
            $picUrlList = [];
        }

        // 视频url
        if ($momentContentType == 3) {
            $videoUrl = json_decode($contentLibrary['urls'], true);
            $videoUrl = $videoUrl[0] ?? '';
        } else {
            $videoUrl = '';
        }

        // 链接url
        if ($momentContentType == 4) {
            $urls = json_decode($contentLibrary['urls'], true);
            $url = $urls[0] ?? [];
            $link = [
                'desc' => $url['desc'] ?? '',
                'image' => $url['image'] ?? '',
                'url' => $url['url'] ?? ''
            ];
        } else {
            $link = ['image' => ''];
        }

        // 准备发送参数
        $data = [
            'altList' => '',
            'immediately' => false,
            'isUseLocation' => false,
            'jobPublishWechatMomentsItems' => $jobPublishWechatMomentsItems,
            'lat' => 0,
            'lng' => 0,
            'link' => $link,
            'momentContentType' => $momentContentType,
            'picUrlList' => $picUrlList,
            'poiAddress' => '',
            'poiName' => '',
            'publicMode' => '',
            'text' => !empty($contentLibrary['contentAi']) ? $contentLibrary['contentAi'] : $contentLibrary['content'],
            'timingTime' => date('Y-m-d H:i:s', $sendTime),
            'beginTime' => date('Y-m-d H:i:s', $sendTime),
            'endTime' => date('Y-m-d H:i:s', $sendTime + 3600),
            'videoUrl' => $videoUrl,
        ];
        // 发送朋友圈
        $moments = new Moments();
        $res = $moments->addJob($data);
        $res = json_decode($res,true);
        if ($res['code'] == 200){
            // 记录发送记录
            $this->recordSendHistory($workbench, $devices, $contentLibrary);
        }
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
                'isLoop' => 0, // 初始状态为未完成循环
                'createTime' => $now,
            ];
            Db::name('workbench_moments_sync_item')->insert($data);
        }

    }

    /**
     * 获取设备列表
     * @param Workbench $workbench 工作台
     * @param WorkbenchMoments $config 配置
     * @return array|bool
     */
    protected function getDevice($workbench, $config)
    {
        $devices = json_decode($config['devices'], true);
        if (empty($devices)) {
            return false;
        }

        $list = Db::name('device')->alias('d')
            ->join('device_wechat_login dw', 'dw.alive = 1 and dw.deviceId = d.id and dw.companyId = d.companyId')
            ->join(['s2_wechat_account' => 'wa'], 'wa.wechatId = dw.wechatId')
            ->where(['d.companyId' => $workbench->companyId, 'd.alive' => 1])
            ->whereIn('d.id', $devices)
            ->field('d.id as deviceId, d.memo as deviceName, d.companyId, dw.wechatId, wa.id as wechatAccountId')
            ->select();

        $newList = [];
        foreach ($list as $val) {
            // 检查发送间隔（新逻辑：根据startTime、endTime、syncCount动态计算）
            $today = date('Y-m-d');
            $startTimestamp = strtotime($today . ' ' . $config['startTime'] . ':00');
            $endTimestamp = strtotime($today . ' ' . $config['endTime'] . ':00');
            $totalSeconds = $endTimestamp - $startTimestamp;
            if ($totalSeconds <= 0 || empty($config['syncCount'])) {
                continue;
            }
            $interval = floor($totalSeconds / $config['syncCount']);

            // 查询今日已同步次数
            $count = Db::name('workbench_moments_sync_item')
                ->where('workbenchId', $workbench->id)
                ->where('deviceId', $val['deviceId'])
                ->whereTime('createTime', 'between', [$startTimestamp, $endTimestamp])
                ->count();

            if ($count >= $config['syncCount']) {
                continue;
            }

            // 计算本次同步的最早允许时间
            $nextSyncTime = $startTimestamp + $count * $interval;
            if (time() < $nextSyncTime) {
                continue;
            }

            $newList[] = $val;
        }

        return $newList;
    }

    /**
     * 获取内容库
     * @param Workbench $workbench 工作台
     * @param WorkbenchMoments $config 配置
     * @return array|bool
     */
    protected function getContentLibrary($workbench, $config)
    {
        $contentids = json_decode($config['contentLibraries'], true);
        // 清洗 contentids：去除 null/空字符串，并去重，保持原顺序
        if (is_array($contentids)) {
            $contentids = array_values(array_unique(array_filter($contentids, function ($v) {
                return $v !== null && $v !== '';
            })));
        } else {
            $contentids = [];
        }
        if (empty($contentids)) {
            return false;
        }
        // 基础查询
        $query = Db::name('content_library')->alias('cl')
            ->join('content_item ci', 'ci.libraryId = cl.id')
            ->where(['cl.isDel' => 0, 'ci.isDel' => 0])
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
        // 根据accountType处理不同的发送逻辑
        if ($config['accountType'] == 1) {
            // 可以循环发送
            // 1. 优先获取未发送的内容
            $unsentContent = $query2->join('workbench_moments_sync_item wmsi', 'wmsi.contentId = ci.id and wmsi.workbenchId = ' . $workbench->id, 'left')
                ->where('wmsi.id', 'null')
                ->where('ci.sendTime <= ' . (time() + 60))
                ->order('ci.sendTime desc, ci.id desc')
                ->find();

            if (!empty($unsentContent)) {
                return $unsentContent;
            }

            // 获取下一个要发送的内容（从内容库中查询，排除isLoop为0的数据）
            $isPushIds = Db::name('workbench_moments_sync_item')
                ->where(['workbenchId' => $workbench->id, 'isLoop' => 0])
                ->column('contentId');

            if (empty($isPushIds)) {
                $isPushIds = [0];
            }
            $sentContent = $query3
                ->whereNotIn('ci.id', $isPushIds)
                ->group('ci.id')
                ->order('ci.id asc')
                ->find();
            // 4. 如果仍然没有内容，说明内容库为空，将所有记录的isLoop标记为1
            if (empty($sentContent)) {
                // 将所有该工作台的记录标记为循环完成
                Db::name('workbench_moments_sync_item')
                    ->where('workbenchId', $workbench->id)
                    ->where('isLoop', 0)
                    ->update(['isLoop' => 1]);
                return false;
            }

            return $sentContent;
        } else {
            // 不能循环发送，只获取未发送的内容
            $list = $query2->join('workbench_moments_sync_item wmsi', 'wmsi.contentId = ci.id and wmsi.workbenchId = ' . $workbench->id, 'left')
                ->where('wmsi.id', 'null')
                ->order('ci.sendTime desc, ci.id desc')
                ->find();
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
        // 去除开始日志，减少日志空间消耗
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
        // 去除成功日志，减少日志空间消耗
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
        Log::error('工作台朋友圈同步任务异常：' . $e->getMessage());

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