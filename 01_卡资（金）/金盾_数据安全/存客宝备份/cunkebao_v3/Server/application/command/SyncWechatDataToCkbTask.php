<?php

namespace app\command;

use think\facade\Log;
use think\console\Input;
use think\console\Output;
use think\console\Command;
use think\facade\App;
use WeChatDeviceApi\Adapters\ChuKeBao\Adapter as ChuKeBaoAdapter;

// */7 * * * * cd /www/wwwroot/mckb_quwanzhi_com/Server && php think sync:wechatData >> /www/wwwroot/mckb_quwanzhi_com/Server/runtime/log/sync_wechat_data.log 2>&1
class SyncWechatDataToCkbTask extends Command
{
    protected $lockFile;
    
    public function __construct()
    {
        parent::__construct();
        $this->lockFile = App::getRuntimePath() . 'sync_wechat_to_ckb.lock';
    }


    protected function configure()
    {
        $this->setName('sync:wechatData')
            ->setDescription('同步微信数据到存客宝');
    }

    
    protected function execute(Input $input, Output $output)
    {
        // 检查锁文件
        if (file_exists($this->lockFile)) {
            $lockTime = filectime($this->lockFile);
            if (time() - $lockTime < 3600) {
                Log::info('微信好友同步任务已在运行中，跳过本次执行');
                return false;
            }
            unlink($this->lockFile);
        }
        
        file_put_contents($this->lockFile, time());
        
        try {

            $output->writeln("同步任务 sync_wechat_to_ckb 开始");
            $ChuKeBaoAdapter = new ChuKeBaoAdapter();
            $this->syncWechatAccount($ChuKeBaoAdapter);
            $this->syncWechatFriend($ChuKeBaoAdapter);
            $this->syncWechatDeviceLoginLog($ChuKeBaoAdapter);
            $this->syncWechatDevice($ChuKeBaoAdapter);
            $this->syncWechatCustomer($ChuKeBaoAdapter);
            $this->syncWechatGroup($ChuKeBaoAdapter);
            $this->syncWechatGroupCustomer($ChuKeBaoAdapter);
            $this->syncWechatFriendToTrafficPoolBatch($ChuKeBaoAdapter);
            $this->syncTrafficSourceUser($ChuKeBaoAdapter);
            $this->syncTrafficSourceGroup($ChuKeBaoAdapter);
            $this->syncCallRecording($ChuKeBaoAdapter);

            $output->writeln("同步任务 sync_wechat_to_ckb 已结束");
            return true;
        } catch (\Exception $e) {
            Log::error('微信好友同步任务异常：' . $e->getMessage());
            return false;
        } finally {
            if (file_exists($this->lockFile)) {
                unlink($this->lockFile);
            }
        }
    }
    
    protected function syncWechatFriend(ChuKeBaoAdapter $ChuKeBaoAdapter)
    {
        return $ChuKeBaoAdapter->syncFriendship();
    }

    protected function syncWechatAccount(ChuKeBaoAdapter $ChuKeBaoAdapter)
    {
        return $ChuKeBaoAdapter->syncWechatAccount();
    }

    protected function syncWechatDeviceLoginLog(ChuKeBaoAdapter $ChuKeBaoAdapter)
    {
        return $ChuKeBaoAdapter->syncWechatDeviceLoginLog();
    }

    // syncDevice
    protected function syncWechatDevice(ChuKeBaoAdapter $ChuKeBaoAdapter)
    {
        return $ChuKeBaoAdapter->syncDevice();
    }

    // syncWechatCustomer
    protected function syncWechatCustomer(ChuKeBaoAdapter $ChuKeBaoAdapter)
    {
        return $ChuKeBaoAdapter->syncWechatCustomer();
    }

    protected function syncWechatFriendToTrafficPoolBatch(ChuKeBaoAdapter $ChuKeBaoAdapter)
    {
        return $ChuKeBaoAdapter->syncWechatFriendToTrafficPoolBatch();
    }
    protected function syncTrafficSourceUser(ChuKeBaoAdapter $ChuKeBaoAdapter)
    {
        return $ChuKeBaoAdapter->syncTrafficSourceUser();
    }

    protected function syncTrafficSourceGroup(ChuKeBaoAdapter $ChuKeBaoAdapter)
    {
        return $ChuKeBaoAdapter->syncTrafficSourceGroup();
    }

    protected function syncWechatGroup(ChuKeBaoAdapter $ChuKeBaoAdapter)
    {
        return $ChuKeBaoAdapter->syncWechatGroup();
    }
    protected function syncWechatGroupCustomer(ChuKeBaoAdapter $ChuKeBaoAdapter)
    {
        return $ChuKeBaoAdapter->syncWechatGroupCustomer();
    }
    protected function syncCallRecording(ChuKeBaoAdapter $ChuKeBaoAdapter)
    {
        return $ChuKeBaoAdapter->syncCallRecording();
    }


}