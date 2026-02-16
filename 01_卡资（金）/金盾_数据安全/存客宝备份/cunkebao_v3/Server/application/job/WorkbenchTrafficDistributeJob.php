<?php

namespace app\job;

use think\queue\Job;
use think\facade\Log;
use think\Queue;
use think\facade\Config;
use think\facade\Cache;
use app\cunkebao\model\Workbench;
use app\cunkebao\model\WorkbenchTrafficConfig;
use think\Db;
use app\api\controller\AutomaticAssign;

class WorkbenchTrafficDistributeJob
{
    const MAX_RETRY_ATTEMPTS = 3;

    public function fire(Job $job, $data)
    {
        $jobId = $data['jobId'] ?? '';
        $queueLockKey = $data['queueLockKey'] ?? '';
        try {
            $this->logJobStart($jobId, $queueLockKey);
            $workbenches = $this->getActiveWorkbenches();
            if (empty($workbenches)) {
                $this->handleEmptyWorkbenches($job, $queueLockKey);
                return true;
            }
            $this->processWorkbenches($workbenches);
            $this->handleJobSuccess($job, $queueLockKey);
            return true;
        } catch (\Exception $e) {
            return $this->handleJobError($e, $job, $queueLockKey);
        }
    }

    protected function getActiveWorkbenches()
    {
        return Workbench::where([
            ['status', '=', 1],
            ['isDel', '=', 0],
            ['type', '=', 5]
        ])->order('id DESC')->select();
    }

    protected function processWorkbenches($workbenches)
    {
        foreach ($workbenches as $workbench) {
            try {
                $this->processSingleWorkbench($workbench);
            } catch (\Exception $e) {
                Log::error("处理流量分发工作台 {$workbench->id} 失败: " . $e->getMessage());
            }
        }
    }

    protected function processSingleWorkbench($workbench)
    {
        $page = 1;
        $pageSize = 20;

        $config = WorkbenchTrafficConfig::where('workbenchId', $workbench->id)->find();
        if (!$config) {
            Log::error("流量分发工作台 {$workbench->id} 配置获取失败");
            return;
        }

        // 验证是否在流量分发时间范围内
        if (!$this->isTimeRange($config) && $config['timeType'] == 2) {
            return;
        }
        // 获取当天未超额的可用账号
        if(empty($config['account'])){
            Log::error("流量分发工作台 {$workbench->id} 未配置分发的客服");
            return;
        }
        $accountIds = json_decode($config['account'],true);
        $todayStart = strtotime(date('Y-m-d 00:00:00'));
        $todayEnd = strtotime(date('Y-m-d 23:59:59'));
        $accounts = Db::table('s2_company_account')
            ->alias('a')
            ->where(['a.departmentId' => $workbench->companyId, 'a.status' => 0])
            ->whereIn('a.id',$accountIds)
            ->whereNotLike('a.userName', '%_offline%')
            ->whereNotLike('a.userName', '%_delete%')
            ->leftJoin('workbench_traffic_config_item wti', "wti.wechatAccountId = a.id AND wti.workbenchId = {$workbench->id} AND wti.createTime BETWEEN {$todayStart} AND {$todayEnd}")
            ->field('a.id,a.userName,a.realName,a.nickname,COUNT(wti.id) as todayCount')
            ->group('a.id')
            ->having('todayCount <= ' . $config['maxPerDay'])
            ->select();
        $accountNum = count($accounts);
        if ($accountNum < 1) {
            Log::info("流量分发工作台 {$workbench->id} 可分配账号少于1个");
            return;
        }
        $automaticAssign = new AutomaticAssign();
        do {
            $friends = $this->getFriendsByLabels($workbench, $config, $page, $pageSize);

            if (empty($friends) || count($friends) == 0) {
                Log::info("流量分发工作台 {$workbench->id} 没有可分配的好友");
                break;
            }
            $i = 0;
            $accountNum = count($accounts);
            foreach ($friends as $friend) {
                if ($accountNum == 0) {
                    Log::info("流量分发工作台 {$workbench->id} 所有账号今日分配已满");
                    break 2;
                }
                if ($i >= $accountNum) {
                    $i = 0;
                }
                $account = $accounts[$i];

                // 如果该账号今天分配的记录数加上本次分配的记录数超过最大限制
                if (($account['todayCount'] + $pageSize) >= $config['maxPerDay']) {
                    // 查询该客服账号当天分配记录数
                    $todayCount = Db::name('workbench_traffic_config_item')
                    ->where('workbenchId', $workbench->id)
                    ->where('wechatAccountId', $account['id'])
                    ->whereBetween('createTime', [$todayStart, $todayEnd])
                    ->count();
                    if ($todayCount >= $config['maxPerDay']) {
                    unset($accounts[$i]);
                    $accounts = array_values($accounts);
                    $accountNum = count($accounts);
                    $i++;
                    continue;
                    }
                }

                // 执行切换好友命令
                $res = $automaticAssign->allotWechatFriend([
                    'wechatFriendId' => $friend['id'],
                    'toAccountId' => $account['id']
                ], true);

                $res = json_decode($res,true);
                if ($res['code'] == 200){
                    Db::table('s2_wechat_friend')
                        ->where('id',$friend['id'])
                        ->update([
                            'accountId' => $account['id'],
                            'accountUserName' => $account['userName'],
                            'accountRealName' => $account['realName'],
                            'accountNickname' => $account['nickname'],
                        ]);
                    // 写入分配记录表
                    Db::name('workbench_traffic_config_item')->insert([
                        'workbenchId' => $workbench->id,
                        'deviceId' => $friend['deviceId'],
                        'wechatFriendId' => $friend['id'],
                        'wechatAccountId' => $account['id'],
                        'createTime' => time(),
                        'exp' => $config['exp'],
                        'expTime' => time() + 86400 * $config['exp'],
                    ]);
-                    // 去除成功日志，减少日志空间消耗
                }
                $i++;
            }
            break;
            $page++;
        } while (true);
        // 去除完成日志，减少日志空间消耗
    }


    /**
     * 检查是否在流量分发时间范围内
     * @param WorkbenchAutoLike $config
     * @return bool
     */
    protected function isTimeRange($config)
    {
        $currentTime = date('H:i');
        if ($currentTime < $config['startTime'] || $currentTime > $config['endTime']) {
            Log::info("当前时间 {$currentTime} 不在流量分发时间范围内 ({$config['startTime']} - {$config['endTime']})");
            return false;
        }
        return true;
    }

    /**
     * 一次性查出所有包含指定标签数组的好友（支持分页）
     * @param object $workbench 工作台对象
     * @param object $config 配置对象
     * @param int $page 页码
     * @param int $pageSize 每页数量
     * @return array
     */
    protected function getFriendsByLabels($workbench, $config, $page = 1, $pageSize = 20)
    {
        $labels = [];
        if (!empty($config['pools'])) {
            $labels = is_array($config['pools']) ? $config['pools'] : json_decode($config['pools'], true);
        }

        $devices = [];
        if (!empty($config['devices'])) {
            $devices = is_array($config['devices']) ? $config['devices'] : json_decode($config['devices'], true);
        }
        if (empty($devices)) {
            return [];
        }
        $query = Db::table('s2_wechat_friend')->alias('wf')
            ->join(['s2_company_account' => 'sa'], 'sa.id = wf.accountId', 'left')
            ->join(['s2_wechat_account' => 'wa'], 'wa.id = wf.wechatAccountId', 'left')
            ->join('workbench_traffic_config_item wtci', 'wtci.isRecycle = 0 and wtci.wechatFriendId = wf.id AND wtci.workbenchId = ' . $config['workbenchId'], 'left')
            ->where([
                ['wf.isDeleted', '=', 0],
                ['wf.isPassed', '=', 1],
                //['sa.departmentId', '=', $workbench->companyId],
                ['wtci.id', 'null', null]
            ])
            ->whereIn('wa.currentDeviceId', $devices)
            ->field('wf.id,wf.wechatAccountId,wf.wechatId,wf.labels,sa.userName,wa.currentDeviceId as deviceId');


        if(!empty($labels)){
            $query->where(function ($q) use ($labels) {
                foreach ($labels as $label) {
                    $q->whereOrRaw("JSON_CONTAINS(wf.labels, '\"{$label}\"')");
                }
            });
        }
        $list = $query->page($page, $pageSize)->order('wf.id DESC')->select();
        
        return $list;
    }

    protected function logJobStart($jobId, $queueLockKey)
    {
        // 去除开始日志，减少日志空间消耗
    }

    protected function handleJobSuccess($job, $queueLockKey)
    {
        $job->delete();
        Cache::rm($queueLockKey);
        // 去除成功日志，减少日志空间消耗
    }

    protected function handleJobError(\Exception $e, $job, $queueLockKey)
    {
        Log::error('流量分发任务异常：' . $e->getMessage());
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

    protected function handleEmptyWorkbenches(Job $job, $queueLockKey)
    {
        Log::info('没有需要处理的流量分发任务');
        $job->delete();
        Cache::rm($queueLockKey);
    }
} 