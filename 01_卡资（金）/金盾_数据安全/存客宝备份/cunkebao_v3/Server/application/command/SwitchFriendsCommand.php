<?php

namespace app\command;

use app\job\WorkbenchAutoLikeJob;
use think\console\Command;
use think\console\Input;
use think\console\input\Option;
use think\console\Output;
use think\Db;
use think\facade\Cache;
use think\facade\Log;
use think\Queue;
use app\api\controller\AutomaticAssign;

class SwitchFriendsCommand extends Command
{
// 队列名称
    protected $queueName = 'switch_friends';

    protected function configure()
    {
        $this->setName('switch:friends')
            ->setDescription('切换好友命令');
    }

    protected function execute(Input $input, Output $output)
    {
        // 清理可能损坏的缓存数据
        $this->clearCorruptedCache($output);
        
        //处理流量分过期数据
        $expUserData = Db::name('workbench_traffic_config_item')
            ->where('expTime','<=',time())
            ->where('isRecycle',0)
            ->select();

        // 根据accountId对数组进行归类
        $groupedByAccount = [];
        foreach ($expUserData as $friend) {
            $accountId = $friend['wechatAccountId'];
            if (!isset($groupedByAccount[$accountId])) {
                $groupedByAccount[$accountId] = [];
            }
            $friendId =  $friend['wechatFriendId'];
            $groupedByAccount[$accountId][] = $friendId;
        }

        // 对每个账号的好友进行20个为一组的分组
        foreach ($groupedByAccount as $accountId => $accountFriends) {
            //检索主账号
            $account = Db::name('users')->where('s2_accountId',$accountId)->find();
            if (empty($account)) {
                continue;
            }
            $account2 = Db::name('users')
                ->where('s2_accountId','>',0)
                ->where('companyId',$account['companyId'])
                ->order('s2_accountId ASC')
                ->find();
            if (empty($account2)) {
                continue;
            }
            $newaAccountId = $account2['s2_accountId'];

            $chunks = array_chunk($accountFriends, 20);
            $output->writeln('账号 ' . $newaAccountId . ' 共有 ' . count($accountFriends) . ' 个好友，分为 ' . count($chunks) . ' 组');

            $automaticAssign = new AutomaticAssign();
            foreach ($chunks as $chunkIndex => $chunk) {
                $output->writeln('处理账号 ' . $newaAccountId . ' 第 ' . ($chunkIndex + 1) . ' 组，共 ' . count($chunk) . ' 个好友');
                try {
                    $friendIds = implode(',', $chunk);
                    $res = $automaticAssign->multiAllotFriendToAccount([
                        'wechatFriendIds' => $friendIds,
                        'toAccountId'     => $newaAccountId,
                    ]);
                    $res = json_decode($res, true);
                    if ($res['code'] == 200){
                        //修改数据库
                        Db::table('s2_wechat_friend')
                            ->where('id',$friendIds)
                            ->update([
                                'accountId' => $account2['s2_accountId'],
                                'accountUserName' => $account2['account'],
                                'accountRealName' => $account2['username'],
                                'accountNickname' => $account2['username'],
                            ]);

                        Db::name('workbench_traffic_config_item')
                            ->whereIn('wechatFriendId',$friendIds)
                            ->where('wechatAccountId',$accountId)
                            ->update([
                                'isRecycle' => 1,
                                'recycleTime' => time(),
                            ]);
                        $output->writeln('✓ 成功切换好友：' . $friendIds . ' 到账号：' . $newaAccountId);
                    } else {
                        $output->writeln('✗ 切换失败 - 好友：' . $friendIds . ' 到账号：' . $newaAccountId . ' 结果：' . $res['msg']);
                    }
                } catch (\Exception $e) {
                    $output->writeln('✗ 切换异常 - 好友：' . implode(',', $chunk) . ' 到账号：' . $newaAccountId . ' 错误：' . $e->getMessage());
                }

                // 每组处理完后稍作延迟，避免请求过于频繁
                if ($chunkIndex < count($chunks) - 1) {
                    sleep(1);
                }
            }
        }





        $cacheKey = 'allotWechatFriend';
        $now = time();
        $maxRetry = 5;
        $retry = 0;
        $switchedIds = [];
        $totalProcessed = 0;
        $totalSuccess = 0;
        $totalFailed = 0;

        $output->writeln('开始执行好友切换任务...');

        do {
            try {
                $friends = Cache::get($cacheKey, []);
            } catch (\Exception $e) {
                // 如果缓存数据损坏，清空缓存并记录错误
                $output->writeln('缓存数据损坏，正在清空缓存: ' . $e->getMessage());
                Cache::rm($cacheKey);
                $friends = [];
            }
            
            $toSwitch = [];
            foreach ($friends as $friend) {
                if (isset($friend['time']) && $friend['time'] < $now) {
                    $toSwitch[] = $friend;
                }
            }

            if (empty($toSwitch)) {
                $output->writeln('没有需要切换的好友');
                return;
            }

            $output->writeln('找到 ' . count($toSwitch) . ' 个需要切换的好友');

            $automaticAssign = new AutomaticAssign();
            
            // 根据accountId对数组进行归类
            $groupedByAccount = [];
            foreach ($toSwitch as $friend) {
                $accountId = $friend['accountId'];
                if (!isset($groupedByAccount[$accountId])) {
                    $groupedByAccount[$accountId] = [];
                }
                $friendId = !empty($friend['friendId']) ? $friend['friendId'] : $friend['id'];
                $groupedByAccount[$accountId][] = $friendId;
            }


            // 对每个账号的好友进行20个为一组的分组
            foreach ($groupedByAccount as $accountId => $accountFriends) {
                $chunks = array_chunk($accountFriends, 20);
                $output->writeln('账号 ' . $accountId . ' 共有 ' . count($accountFriends) . ' 个好友，分为 ' . count($chunks) . ' 组');
                $accountSuccess = 0;
                $accountFailed = 0;

                foreach ($chunks as $chunkIndex => $chunk) {
                    $output->writeln('处理账号 ' . $accountId . ' 第 ' . ($chunkIndex + 1) . ' 组，共 ' . count($chunk) . ' 个好友');
                    try {
                        $friendIds = implode(',', $chunk);
                        $res = $automaticAssign->multiAllotFriendToAccount([
                            'wechatFriendIds' => $friendIds,
                            'toAccountId'     => $accountId,
                        ]);
                        $res = json_decode($res, true);
                        if ($res['code'] == 200){
                            $output->writeln('✓ 成功切换好友：' . $friendIds . ' 到账号：' . $accountId);
                            $switchedIds = array_merge($switchedIds, $chunk);
                            $accountSuccess += count($chunk);
                            $totalSuccess += count($chunk);
                        } else {
                            $output->writeln('✗ 切换失败 - 好友：' . $friendIds . ' 到账号：' . $accountId . ' 结果：' . $res['msg']);
                            $accountFailed += count($chunk);
                            $totalFailed += count($chunk);
                        }
                    } catch (\Exception $e) {
                        $output->writeln('✗ 切换异常 - 好友：' . implode(',', $chunk) . ' 到账号：' . $accountId . ' 错误：' . $e->getMessage());
                        Log::error('切换好友异常: ' . $e->getMessage() . ' 好友IDs: ' . implode(',', $chunk) . ' 账号ID: ' . $accountId);
                        $accountFailed += count($chunk);
                        $totalFailed += count($chunk);
                    }
                    
                    $totalProcessed += count($chunk);
                    
                    // 每组处理完后稍作延迟，避免请求过于频繁
                    if ($chunkIndex < count($chunks) - 1) {
                        sleep(1);
                    }
                }
                
                $output->writeln('账号 ' . $accountId . ' 处理完成 - 成功：' . $accountSuccess . '，失败：' . $accountFailed);
            }

            // 过滤掉已切换的，保留未切换和新进来的
            try {
                $newFriends = Cache::get($cacheKey, []);
            } catch (\Exception $e) {
                // 如果缓存数据损坏，清空缓存并记录错误
                $output->writeln('缓存数据损坏，正在清空缓存: ' . $e->getMessage());
                Cache::rm($cacheKey);
                $newFriends = [];
            }
            
            $updated = [];
            foreach ($newFriends as $friend) {
                $friendId = !empty($friend['friendId']) ? $friend['friendId'] : $friend['id'];
                if (!in_array($friendId, $switchedIds)) {
                    $updated[] = $friend;
                }
            }

            // 按time升序排序
            usort($updated, function($a, $b) {
                return ($a['time'] ?? 0) <=> ($b['time'] ?? 0);
            });

            try {
                $success = Cache::set($cacheKey, $updated);
            } catch (\Exception $e) {
                // 如果缓存设置失败，记录错误并继续
                $output->writeln('缓存设置失败: ' . $e->getMessage());
                $success = false;
            }
            $retry++;
        } while (!$success && $retry < $maxRetry);

        $output->writeln('=== 切换任务完成 ===');
        $output->writeln('总处理数量：' . $totalProcessed);
        $output->writeln('成功切换：' . $totalSuccess);
        $output->writeln('切换失败：' . $totalFailed);
        $output->writeln('成功率：' . ($totalProcessed > 0 ? round(($totalSuccess / $totalProcessed) * 100, 2) : 0) . '%');
        $output->writeln('缓存已更新并排序');
    }

    /**
     * 清理损坏的缓存数据
     * @param Output $output
     */
    private function clearCorruptedCache(Output $output)
    {
        $cacheKey = 'allotWechatFriend';
        try {
            // 尝试读取缓存，如果失败则清空
            $testData = Cache::get($cacheKey, []);
            if (!is_array($testData)) {
                $output->writeln('缓存数据格式错误，正在清空缓存');
                Cache::rm($cacheKey);
            }
        } catch (\Exception $e) {
            $output->writeln('检测到损坏的缓存数据，正在清空: ' . $e->getMessage());
            Cache::rm($cacheKey);
        }
    }

}