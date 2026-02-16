<?php

namespace app\job;

use think\queue\Job;
use think\facade\Log;
use think\Queue;
use think\facade\Config;
use think\Db;
use think\facade\Env;
use app\api\controller\WebSocketController;

class OwnMomentsCollectJob
{
    /**
     * 队列任务处理
     * @param Job $job 队列任务
     * @param array $data 任务数据
     * @return void
     */
    public function fire(Job $job, $data)
    {
        try {
            // 如果任务执行成功后删除任务
            if ($this->processOwnMomentsCollect($data, $job->attempts())) {
                $job->delete();
            } else {
                if ($job->attempts() > 3) {
                    // 超过重试次数，删除任务
                    Log::error('自己朋友圈采集任务执行失败，已超过重试次数');
                    $job->delete();
                } else {
                    // 任务失败，重新放回队列
                    Log::warning('自己朋友圈采集任务执行失败，重试次数：' . $job->attempts());
                    $job->release(Config::get('queue.failed_delay', 10));
                }
            }
        } catch (\Exception $e) {
            // 出现异常，记录日志
            Log::error('自己朋友圈采集任务异常：' . $e->getMessage());
            if ($job->attempts() > 3) {
                $job->delete();
            } else {
                $job->release(Config::get('queue.failed_delay', 10));
            }
        }
    }
    
    /**
     * 处理自己朋友圈采集
     * @param array $data 任务数据
     * @param int $attempts 重试次数
     * @return bool
     */
    protected function processOwnMomentsCollect($data, $attempts)
    {
        try {
            // 获取在线微信账号列表（只获取在线微信）
            $onlineWechatAccounts = $this->getOnlineWechatAccounts();
            
            if (empty($onlineWechatAccounts)) {
                return true;
            }
            
            // 获取API账号配置
            $username = Env::get('api.username2', '');
            $password = Env::get('api.password2', '');
            
            if (empty($username) || empty($password)) {
                Log::error('API账号配置缺失，无法执行朋友圈采集');
                return false;
            }
            
            // 获取账号ID
            $toAccountId = Db::name('users')->where('account', $username)->value('s2_accountId');
            if (empty($toAccountId)) {
                Log::error('未找到API账号对应的账号ID');
                return false;
            }
            
            $successCount = 0;
            $failCount = 0;
            
            // 遍历每个在线微信账号，采集自己的朋友圈
            foreach ($onlineWechatAccounts as $account) {
                try {
                    $wechatAccountId = $account['id'];
                    $wechatId = $account['wechatId'];
                    
                    // 创建WebSocket控制器实例
                    $webSocket = new WebSocketController([
                        'userName' => $username,
                        'password' => $password,
                        'accountId' => $toAccountId
                    ]);

                    // 采集自己的朋友圈（wechatFriendId传0或空，表示采集自己的朋友圈）
                    $result = $webSocket->getMoments([
                        'wechatAccountId' => $wechatAccountId,
                        'wechatFriendId' => 0,
                        'isTimeline' => true,
                        'maxPages' => 1,
                        'count' => 10 // 每次采集10条
                    ]);
                    
                    $resultData = json_decode($result, true);
                    if (!empty($resultData) && $resultData['code'] == 200) {
                        $successCount++;
                    } else {
                        $failCount++;
                        Log::warning("微信账号 {$wechatId} 朋友圈采集失败：" . ($resultData['msg'] ?? '未知错误'));
                    }
                    
                    // 避免请求过于频繁，每个账号之间稍作延迟
                    usleep(500000); // 延迟0.5秒
                    
                } catch (\Exception $e) {
                    $failCount++;
                    Log::error("采集微信账号 {$account['wechatId']} 朋友圈异常：" . $e->getMessage());
                    continue;
                }
            }
            
            Log::info("自己朋友圈采集任务完成，成功：{$successCount}，失败：{$failCount}");
            return true;
            
        } catch (\Exception $e) {
            Log::error('自己朋友圈采集处理异常：' . $e->getMessage());
            return false;
        }
    }
    
    /**
     * 获取在线微信账号列表
     * @return array
     */
    protected function getOnlineWechatAccounts()
    {
        try {
            // 查询在线微信账号（deviceAlive=1 且 wechatAlive=1）
            $accounts = Db::table('s2_wechat_account')
                ->where('deviceAlive', 1)
                ->where('wechatAlive', 1)
                ->field('id, wechatId, nickname, alias')
                ->select();
            
            return $accounts ?: [];
        } catch (\Exception $e) {
            Log::error('获取在线微信账号列表失败：' . $e->getMessage());
            return [];
        }
    }
}

