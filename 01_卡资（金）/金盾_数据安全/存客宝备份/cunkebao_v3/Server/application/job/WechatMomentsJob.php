<?php

namespace app\job;

use think\queue\Job;
use think\facade\Log;
use think\facade\Cache;
use think\Db;
use app\command\WechatMomentsCommand;
use app\api\controller\WebSocketController;
use think\facade\Env;
use app\api\controller\AutomaticAssign;

class WechatMomentsJob
{
    protected $maxPages = 10; // 最大页数

    public function fire(Job $job, $data)
    {
        $toAccountId = '';
        $username = Env::get('api.username2', '');
        $password = Env::get('api.password2', '');
        if (!empty($username) || !empty($password)) {
            $toAccountId = Db::name('users')->where('account',$username)->value('s2_accountId');
        }else{
            Log::error("没有账号配置");
            return;
        }

        try {
            $jobId = $data['jobId'] ?? '';
            $queueLockKey = $data['queueLockKey'] ?? '';
            Log::info("开始处理朋友圈采集任务，任务ID：{$jobId}");
            
            // 获取好友列表
            $friends = $this->getFriends($data['pageIndex'], $data['pageSize']);
            if (empty($friends)) {
                Log::info("没有更多好友数据，任务完成");
                Cache::rm($queueLockKey);
                $job->delete();
                return;
            }

            foreach ($friends as $friend) {
                try {
                    // 执行切换好友命令
                    $automaticAssign = new AutomaticAssign();
                    $automaticAssign->allotWechatFriend(['wechatFriendId' => $friend['friendId'], 'toAccountId' => $toAccountId], true);
                    //存入缓存
                    artificialAllotWechatFriend($friend);

                    // 执行采集朋友圈命令
                    $webSocket = new WebSocketController(['userName' => $username, 'password' => $password, 'accountId' => $toAccountId]);
                    $webSocket->getMoments(['wechatFriendId' => $friend['friendId'], 'wechatAccountId' => $friend['wechatAccountId']]);
                    
                    // 处理完毕切换回原账号
                    $automaticAssign->allotWechatFriend(['wechatFriendId' => $friend['friendId'], 'toAccountId' => $friend['accountId']], true);


                } catch (\Exception $e) {
                    // 发生异常时也要切换回原账号
                    $automaticAssign->allotWechatFriend(['wechatFriendId' => $friend['friendId'], 'toAccountId' => $friend['accountId']], true);
                    Log::error("采集好友 {$friend['id']} 的朋友圈失败：" . $e->getMessage());
                    continue;
                }
            }

            // 判断是否需要继续翻页
            if (count($friends) < $data['pageSize']) {
                // 如果返回的数据少于页面大小，说明已经没有更多数据了
                Log::info("朋友圈采集任务完成，没有更多数据");
                Cache::rm($queueLockKey);
                $job->delete();
            } else {
                // 还有更多数据，继续处理下一页
                $data['pageIndex']++;
                if ($data['pageIndex'] > $this->maxPages) {
                    Log::info("已达到最大页数限制 {$this->maxPages}，任务完成");
                    Cache::rm($data['pageIndexCacheKey']);
                    Cache::rm($queueLockKey);
                    $job->delete();
                } else {
                    // 处理下一页
                    Cache::set($data['pageIndexCacheKey'], $data['pageIndex']);

                    // 有下一页，将下一页任务添加到队列
                    $command = new WechatMomentsCommand();
                    $command->addToQueue($data['pageIndex'], $data['pageSize'], $jobId, $queueLockKey);
                }
            }
        } catch (\Exception $e) {
            $automaticAssign->allotWechatFriend(['wechatFriendId' => $friend['friendId'], 'toAccountId' => $friend['accountId']], true);
            Log::error("朋友圈采集任务异常：" . $e->getMessage());
            Cache::rm($queueLockKey);
            $job->delete();
        }
    }
    
    
    /**
     * 获取账号的好友列表
     * @param int $accountId 账号ID
     * @return array
     */
    private function getFriends($page = 1 ,$pageSize = 100)
    {
        $list = Db::table('s2_company_account')
            ->alias('ca')
            ->join(['s2_wechat_account' => 'wa'], 'ca.id = wa.deviceAccountId')
            ->join(['s2_wechat_friend' => 'wf'], 'ca.id = wf.accountId AND wf.wechatAccountId = wa.id')
            ->where([
                'ca.status' => 0,
                'wf.isDeleted' => 0,
                'wa.deviceAlive' => 1,
                'wa.wechatAlive' => 1
            ])
            ->field([
                'ca.id as accountId',
                'ca.userName',
                'wf.id as friendId',
                'wf.wechatId',
                'wf.wechatAccountId',
                'wa.wechatId as wechatAccountWechatId',
                'wa.currentDeviceId as deviceId'
            ])->group('wf.wechatId')
            ->order('wf.id DESC')
            ->page($page, $pageSize)
            ->select();
        return $list;
    }
} 