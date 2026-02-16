<?php

namespace app\job;

use think\queue\Job;
use think\facade\Log;
use think\Queue;
use think\facade\Config;
use think\facade\Cache;
use think\facade\Env;
use app\cunkebao\model\Workbench;
use app\cunkebao\model\WorkbenchAutoLike;
use think\Db;
use app\api\controller\WebSocketController;
use app\api\controller\AutomaticAssign;
use app\api\controller\WechatFriendController;

class WorkbenchAutoLikeJob
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

    /**
     * 获取活跃的工作台
     * @return \think\Collection
     */
    protected function getActiveWorkbenches()
    {
        return Workbench::where([
            ['status', '=', 1],
            ['isDel', '=', 0],
            ['type', '=', 1] // 只获取自动点赞类型的工作台
        ])->order('id DESC')->select();
    }

    /**
     * 处理工作台列表
     * @param \think\Collection $workbenches
     */
    protected function processWorkbenches($workbenches)
    {
        foreach ($workbenches as $workbench) {
            try {
                $this->processSingleWorkbench($workbench);
            } catch (\Exception $e) {
                Log::error("处理工作台 {$workbench->id} 失败: " . $e->getMessage());
            }
        }
    }

    /**
     * 处理单个工作台
     * @param Workbench $workbench
     */
    protected function processSingleWorkbench($workbench)
    {
        $config = WorkbenchAutoLike::where('workbenchId', $workbench->id)->find();
        if (!$config) {
            Log::error("工作台 {$workbench->id} 配置获取失败");
            return;
        }

        $this->handleAutoLike($workbench, $config);
    }

    /**
     * 处理自动点赞任务
     * @param Workbench $workbench
     * @param WorkbenchAutoLike $config
     */
    protected function handleAutoLike($workbench, $config)
    {
        if (!$this->validateAutoLikeConfig($workbench, $config)) {
            return;
        }

        // 验证是否在点赞时间范围内
        if (!$this->isWithinLikeTimeRange($config)) {
            return;
        }   

        // 处理分页获取好友列表
        $this->processAllFriends($workbench, $config);
    }

    /**
     * 处理所有好友分页
     * @param Workbench $workbench
     * @param WorkbenchAutoLike $config
     * @param int $page 当前页码
     * @param int $pageSize 每页大小
     */
    protected function processAllFriends($workbench, $config, $page = 1, $pageSize = 100)
    {
        $friendList = $this->getFriendList($config, $page, $pageSize);
        
        if (empty($friendList)) {
            return;
        }

        // 直接顺序处理所有好友
        foreach ($friendList as $friend) {
            // 验证是否达到点赞次数上限
            $likeCount = $this->getTodayLikeCount($workbench, $config, $friend['deviceId']);
            if ($likeCount >= $config['maxLikes']) {
                Log::info("工作台 {$workbench->id} 点赞次数已达上限");
                continue;
            }

            // 验证是否达到好友点赞次数上限
            $friendMaxLikes = Db::name('workbench_auto_like_item')
                ->where('workbenchId', $workbench->id)
                ->where('wechatFriendId', $friend['friendId'])
                ->count();
            
            if ($friendMaxLikes < $config['friendMaxLikes']) {
                $this->processFriendMoments($workbench, $config, $friend);
            }
        }

        // 如果当前页数据量等于页大小，说明可能还有更多数据，继续处理下一页
        if (count($friendList) == $pageSize) {
            $this->processAllFriends($workbench, $config, $page + 1, $pageSize);
        }
    }

    /**
     * 获取好友列表
     * @param WorkbenchAutoLike $config 配置
     * @param int $page 页码
     * @param int $pageSize 每页大小
     * @return array
     */
    protected function getFriendList($config, $page = 1, $pageSize = 100)
    {
        $friends = json_decode($config['friends'], true);
        $devices = json_decode($config['devices'], true);

        $list = Db::table('s2_company_account')
            ->alias('ca')
            ->join(['s2_wechat_account' => 'wa'], 'ca.id = wa.deviceAccountId')
            ->join(['s2_wechat_friend' => 'wf'], 'wf.wechatAccountId = wa.id')
            ->join('workbench_auto_like_item wali', 'wali.wechatFriendId = wf.id AND wali.workbenchId = ' . $config['workbenchId'], 'left')
            ->where([
                'ca.status' => 0,
                'wf.isDeleted' => 0,
                'wa.deviceAlive' => 1,
                'wa.wechatAlive' => 1
            ])
            ->whereIn('wa.currentDeviceId', $devices)
            ->field([
                'ca.id as accountId',
                'ca.userName',
                'wf.id as friendId',
                'wf.wechatId',
                'wf.wechatAccountId',
                'wa.wechatId as wechatAccountWechatId',
                'wa.currentDeviceId as deviceId',
                'COUNT(wali.id) as like_count'
            ]);

        if (!empty($friends) && is_array($friends) && count($friends) > 0) {
            $list = $list->whereIn('wf.id', $friends);
        }
  
        $list = $list->group('wf.wechatId')
                     ->having('like_count < ' . $config['friendMaxLikes'])
                     ->order('wf.id DESC')
                     ->page($page, $pageSize)
                     ->select();
                     
        return $list;
    }

    /**
     * 处理好友朋友圈
     * @param Workbench $workbench
     * @param WorkbenchAutoLike $config
     * @param array $friend
     */
    protected function processFriendMoments($workbench, $config, $friend)
    {
        $toAccountId = '';
        $username = Env::get('api.username2', '');
        $password = Env::get('api.password2', '');
        if (!empty($username) || !empty($password)) {
            $toAccountId = Db::name('users')->where('account',$username)->value('s2_accountId');
        }

        try {
            // 执行切换好友命令
            $automaticAssign = new AutomaticAssign();
            $automaticAssign->allotWechatFriend(['wechatFriendId' => $friend['friendId'], 'toAccountId' => $toAccountId], true);
            //存入缓存
            artificialAllotWechatFriend($friend);
            // 创建WebSocket链接
            $webSocket = new WebSocketController(['userName' => $username, 'password' => $password, 'accountId' => $toAccountId]);
            
            // 查询未点赞的朋友圈
            $moments = $this->getUnlikedMoments($friend['wechatId']);
            if (empty($moments) || count($moments) == 0) {
                //采集最新朋友圈
                $webSocket->getMoments(['wechatFriendId' => $friend['friendId'], 'wechatAccountId' => $friend['wechatAccountId']]);
                $moments = $this->getUnlikedMoments($friend['wechatId']);
            }
            
            
            if (empty($moments) || count($moments) == 0) {
                 // 处理完毕切换回原账号
                $automaticAssign->allotWechatFriend(['wechatFriendId' => $friend['friendId'], 'toAccountId' => $friend['accountId']], true);
                Log::info("好友 {$friend['friendId']} 没有需要点赞的朋友圈");
                return;
            }


            foreach ($moments as $moment) {
                // 点赞朋友圈
                $this->likeMoment($workbench, $config, $friend, $moment, $webSocket);
                
                if(!empty($config['enableFriendTags']) && !empty($config['friendTags'])){
                    // 修改好友标签
                    $labels = $this->getFriendLabels($friend);
                    $labels[] = $config['friendTags'];
                    $webSocket->modifyFriendLabel(['wechatFriendId' => $friend['friendId'], 'wechatAccountId' => $friend['wechatAccountId'], 'labels' => $labels]);

                    //更新用户标签
                    $friendData = Db::table('s2_wechat_friend')->where('id', $friend['friendId'])->find();
                    Db::table('s2_wechat_friend')->where('id', $friend['friendId'])->update(['labels' => json_encode($labels,256)]);
                }
                break;
            }

            // 处理完毕切换回原账号
            $automaticAssign->allotWechatFriend(['wechatFriendId' => $friend['friendId'], 'toAccountId' => $friend['accountId']], true);
        } catch (\Exception $e) {
            // 异常情况下也要确保切换回原账号
            $automaticAssign = new AutomaticAssign();
            $automaticAssign->allotWechatFriend(['wechatFriendId' => $friend['friendId'], 'toAccountId' => $friend['accountId']], true);
            Log::error("处理好友 {$friend['friendId']} 朋友圈失败异常: " . $e->getMessage());
        }
    }

    /**
     * 获取未点赞的朋友圈
     * @param int $wechatId
     * @return \think\Collection
     */
    protected function getUnlikedMoments($wechatId)
    {
        return Db::table('s2_wechat_moments')
            ->alias('wm')
            ->join('workbench_auto_like_item wali', 'wali.momentsId = wm.id', 'left')
            ->where([
                ['wm.userName', '=', $wechatId],
                ['wali.id', 'null', null]
            ])
            ->where('wm.update_time', '>=', time() - 86400)
            ->field('wm.id, wm.snsId')
            ->group('wali.wechatFriendId')
            ->order('wm.createTime DESC')
            ->page(1,1)
            ->select();
    }

    /**
     * 点赞朋友圈
     * @param Workbench $workbench
     * @param WorkbenchAutoLike $config
     * @param array $friend
     * @param array $moment
     * @param WebSocketController $webSocket
     */
    protected function likeMoment($workbench, $config, $friend, $moment, $webSocket)
    {
        try {
            $result = $webSocket->momentInteract([
                'snsId' => $moment['snsId'],
                'wechatAccountId' => $friend['wechatAccountId'],
            ]);

            $result = json_decode($result, true);
            
            if ($result['code'] == 200) {
                $this->recordLike($workbench, $moment, $friend);
                
                // 添加间隔时间
                if (!empty($config['interval'])) {
                    sleep($config['interval']);
                }
            } else {
                Log::error("工作台 {$workbench->id} 点赞失败: " . ($result['msg'] ?? '未知错误'));
            }
        } catch (\Exception $e) {
            Log::error("工作台 {$workbench->id} 点赞异常: " . $e->getMessage());
        }
    }

    /**
     * 记录点赞
     * @param Workbench $workbench
     * @param array $moment
     * @param array $friend
     */
    protected function recordLike($workbench, $moment, $friend)
    {
        Db::name('workbench_auto_like_item')->insert([
            'workbenchId' => $workbench->id,
            'deviceId' => $friend['deviceId'],
            'momentsId' => $moment['id'],
            'snsId' => $moment['snsId'],
            'wechatAccountId' => $friend['wechatAccountId'],
            'wechatFriendId' => $friend['friendId'],
            'createTime' => time()
        ]);
        Log::info("工作台 {$workbench->id} 点赞成功: {$moment['snsId']}");
    }

    /**
     * 获取好友标签
     * @param array $friend
     * @return array
     */
    protected function getFriendLabels($friend)
    {
        $wechatFriendController = new WechatFriendController();
        $result = $wechatFriendController->getlist([
            'friendKeyword' => $friend['wechatId'],
            'wechatAccountKeyword' => $friend['wechatAccountWechatId']
        ], true);
        
        $result = json_decode($result, true);
        $labels = [];
        
        if(!empty($result['data'])){
            foreach($result['data'] as $item){
                $labels = array_merge($labels, $item['labels']);
            }
        }
        
        return $labels;
    }

    /**
     * 验证自动点赞配置
     * @param Workbench $workbench
     * @param WorkbenchAutoLike $config
     * @return bool
     */
    protected function validateAutoLikeConfig($workbench, $config)
    {
        $requiredFields = ['contentTypes', 'interval', 'maxLikes', 'startTime', 'endTime'];
        foreach ($requiredFields as $field) {
            if (empty($config[$field])) {
                Log::error("工作台 {$workbench->id} 配置字段 {$field} 为空");
                return false;
            }
        }
        return true;
    }

    /**
     * 获取今日点赞次数
     * @param Workbench $workbench
     * @param WorkbenchAutoLike $config
     * @return int
     */
    protected function getTodayLikeCount($workbench, $config, $deviceId)
    {
        return Db::name('workbench_auto_like_item')
            ->where('workbenchId', $workbench->id)
            ->where('deviceId', $deviceId)
            ->whereTime('createTime', 'between', [
                strtotime(date('Y-m-d') . ' ' . $config['startTime'] . ':00'),
                strtotime(date('Y-m-d') . ' ' . $config['endTime'] . ':00')
            ])
            ->count();
    }

    /**
     * 检查是否在点赞时间范围内
     * @param WorkbenchAutoLike $config
     * @return bool
     */
    protected function isWithinLikeTimeRange($config)
    {
        $currentTime = date('H:i');
        if ($currentTime < $config['startTime'] || $currentTime > $config['endTime']) {
            Log::info("当前时间 {$currentTime} 不在点赞时间范围内 ({$config['startTime']} - {$config['endTime']})");
            return false;
        }
        return true;
    }

    /**
     * 记录任务开始
     * @param string $jobId
     * @param string $queueLockKey
     */
    protected function logJobStart($jobId, $queueLockKey)
    {
        Log::info('开始处理工作台自动点赞任务: ' . json_encode([
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
        Log::info('工作台自动点赞任务执行成功');
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
        Log::error('工作台自动点赞任务异常：' . $e->getMessage());
        
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

    /**
     * 处理空工作台情况
     * @param Job $job
     * @param string $queueLockKey
     */
    protected function handleEmptyWorkbenches(Job $job, $queueLockKey)
    {
        Log::info('没有需要处理的工作台自动点赞任务');
        $job->delete();
        Cache::rm($queueLockKey);
    }
} 