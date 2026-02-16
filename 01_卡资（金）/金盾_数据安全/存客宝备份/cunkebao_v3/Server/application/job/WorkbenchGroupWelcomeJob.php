<?php

namespace app\job;

use app\api\controller\WebSocketController;
use app\cunkebao\model\WorkbenchGroupWelcomeItem;
use think\Db;
use think\facade\Log;
use think\facade\Env;
use think\queue\Job;

/**
 * 入群欢迎语任务
 */
class WorkbenchGroupWelcomeJob
{
    // 常量定义
    const MAX_RETRY_ATTEMPTS = 3; // 最大重试次数
    const RETRY_DELAY = 10; // 重试延迟（秒）
    const MAX_JOIN_AGE_SECONDS = 86400; // 最大入群时间（1天）
    const MSG_TYPE_TEXT = 1; // 普通文本消息
    const MSG_TYPE_AT = 90001; // @人消息
    const WORKBENCH_TYPE_WELCOME = 7; // 入群欢迎语类型
    const STATUS_SUCCESS = 2; // 发送成功状态
    /**
     * 队列执行方法
     * @param Job $job 队列任务
     * @param array $data 任务数据
     * @return void
     */
    public function fire(Job $job, $data)
    {
        try {
            if ($this->processWelcomeMessage($data, $job->attempts())) {
                $job->delete();
            } else {
                if ($job->attempts() > self::MAX_RETRY_ATTEMPTS) {
                    Log::error('入群欢迎语任务执行失败，已超过重试次数，数据：' . json_encode($data));
                    $job->delete();
                } else {
                    Log::warning('入群欢迎语任务执行失败，重试次数：' . $job->attempts() . '，数据：' . json_encode($data));
                    $job->release(self::RETRY_DELAY);
                }
            }
        } catch (\Exception $e) {
            Log::error('入群欢迎语任务异常：' . $e->getMessage());
            if ($job->attempts() > self::MAX_RETRY_ATTEMPTS) {
                $job->delete();
            } else {
                $job->release(self::RETRY_DELAY);
            }
        }
    }

    /**
     * 处理欢迎消息发送
     * @param array $data 任务数据
     * @param int $attempts 重试次数
     * @return bool
     */
    public function processWelcomeMessage($data, $attempts)
    {
        try {
            // 查找该群配置的入群欢迎语工作台
            $welcomeConfigs = Db::table('ck_workbench_group_welcome')
                ->alias('wgw')
                ->join('ck_workbench w', 'w.id = wgw.workbenchId')
                ->where('w.status', 1) // 工作台启用
                ->where('w.type', self::WORKBENCH_TYPE_WELCOME) // 入群欢迎语类型
                ->field('wgw.*,w.id as workbenchId')
                ->select();

            if (empty($welcomeConfigs)) {
                return true; // 没有配置欢迎语，不算失败
            }

            foreach ($welcomeConfigs as $config) {
                // 解析配置中的群组列表
                $wechatGroups = json_decode($config['groups'] ?? '[]', true);
                if (!is_array($wechatGroups) || empty($wechatGroups)) {
                    continue; // 该配置没有配置群组，跳过
                }

                // 遍历该配置中的每个群ID，处理每个群的欢迎语
                foreach ($wechatGroups as $groupItemId) {
                    // 检查群是否存在
                    $chatroomExists = Db::table('s2_wechat_chatroom')
                        ->where('id', $groupItemId)
                        ->where('isDeleted', 0)
                        ->count();
                    if (!$chatroomExists) {
                        Log::warning("群ID {$groupItemId} 不存在或已删除，跳过欢迎语处理");
                        continue;
                    }

                    // 处理单个群的欢迎语
                    $this->processSingleGroupWelcome($groupItemId, $config);
                }
            }

            return true;
        } catch (\Exception $e) {
            Log::error('处理入群欢迎语异常：' . $e->getMessage() . ', 数据：' . json_encode($data));
            return false;
        }
    }

    /**
     * 处理单个群的欢迎语发送
     * @param int $groupId 群ID（s2_wechat_chatroom表的id）
     * @param array $config 工作台配置
     * @return void
     */
    protected function processSingleGroupWelcome($groupId, $config)
    {
        // 根据groupId获取群信息
        $chatroom = Db::table('s2_wechat_chatroom')
            ->where('id', $groupId)
            ->where('isDeleted', 0)
            ->field('wechatAccountId,wechatAccountWechatId')
            ->find();
        if (empty($chatroom)) {
            Log::warning("群ID {$groupId} 不存在或已删除，跳过欢迎语处理");
            return;
        }
        // 检查时间范围
        if (!$this->isInTimeRange($config['startTime'] ?? '', $config['endTime'] ?? '')) {
            return; // 不在工作时间范围内
        }

        // 解析消息列表
        $messages = json_decode($config['messages'] ?? '[]', true);
        if (empty($messages) || !is_array($messages)) {
            return; // 没有配置消息
        }

        // interval代表整组消息的时间间隔，在此间隔内进群的成员都需要@
        $interval = intval($config['interval'] ?? 0); // 秒

        // 查找该群最近一次发送欢迎语的时间
        $lastWelcomeTime = Db::table('ck_workbench_group_welcome_item')
            ->where('workbenchId', $config['workbenchId'])
            ->where('groupid', $groupId)
            ->where('status', self::STATUS_SUCCESS) // 发送成功
            ->order('sendTime', 'desc')
            ->value('sendTime');
        // 确定时间窗口起点
        if (!empty($lastWelcomeTime)) {
            // 如果上次发送时间在interval内，说明还在同一个时间窗口，需要累积新成员
            $windowStartTime = max($lastWelcomeTime, time() - $interval);
        } else {
            // 第一次发送，从interval前开始
            $windowStartTime = time() - $interval;
        }

        // 查询该群在时间窗口内的新成员
        // 通过关联s2_wechat_chatroom表查询，使用groupId
        $recentMembers = Db::table('s2_wechat_chatroom_member')
            ->alias('wcm')
            ->join(['s2_wechat_chatroom' => 'wc'], 'wc.chatroomId = wcm.chatroomId')
            ->where('wc.id', $groupId)
            ->where('wcm.createTime', '>=', $windowStartTime)
            ->field('wcm.wechatId,wcm.nickname,wcm.createTime')
            ->select();
        // 入群太久远的成员不要 @，只保留「近期加入」的成员
        $minJoinTime = time() - self::MAX_JOIN_AGE_SECONDS;
        $recentMembers = array_values(array_filter($recentMembers, function ($member) use ($minJoinTime) {
            $joinTime = intval($member['createTime'] ?? 0);
            return $joinTime >= $minJoinTime;
        }));

        if (empty($recentMembers)) {
            return;
        }
        // 如果上次发送时间在interval内，检查是否有新成员
        if (!empty($lastWelcomeTime) && $lastWelcomeTime >= (time() - $interval)) {
            // 获取上次发送时的成员列表
            $lastWelcomeItem = Db::table('ck_workbench_group_welcome_item')
                ->where('workbenchId', $config['workbenchId'])
                ->where('groupid', $groupId)
                ->where('sendTime', $lastWelcomeTime)
                ->field('friendId')
                ->find();
            $lastMemberIds = json_decode($lastWelcomeItem['friendId'] ?? '[]', true);
            $currentMemberWechatIds = array_column($recentMembers, 'wechatId');
            
            // 找出新加入的成员
            $newMemberWechatIds = array_diff($currentMemberWechatIds, $lastMemberIds);
            if (empty($newMemberWechatIds)) {
                return; // 没有新成员，跳过
            }
            
            // 只发送给新加入的成员
            $membersToWelcome = [];
            foreach ($recentMembers as $member) {
                if (in_array($member['wechatId'], $newMemberWechatIds)) {
                    $membersToWelcome[] = $member;
                }
            }
        } else {
            // 不在同一个时间窗口，@所有在时间间隔内的成员
            $membersToWelcome = $recentMembers;
        }

        if (empty($membersToWelcome)) {
            return;
        }

        // 获取设备信息（用于发送消息）
        $devices = json_decode($config['devices'] ?? '[]', true);
        if (empty($devices) || !is_array($devices)) {
            return;
        }

        // wechatAccountId 是 s2_wechat_account 表的 id
        $wechatAccountId = $chatroom['wechatAccountId'] ?? 0;
        $wechatAccountWechatId = $chatroom['wechatAccountWechatId'] ?? '';

        if (empty($wechatAccountWechatId)) {
            Log::warning("群ID {$groupId} 的微信账号ID为空，跳过欢迎语发送");
            return;
        }

        // 初始化WebSocket
        $username = Env::get('api.username', '');
        $password = Env::get('api.password', '');
        $toAccountId = '';
        if (!empty($username) || !empty($password)) {
            $toAccountId = Db::name('users')->where('account', $username)->value('s2_accountId');
        }
        $webSocket = new WebSocketController(['userName' => $username, 'password' => $password, 'accountId' => $toAccountId]);

        // 按order排序消息
        usort($messages, function($a, $b) {
            return (intval($a['order'] ?? 0)) <=> (intval($b['order'] ?? 0));
        });

        // 发送每条消息
        foreach ($messages as $messageIndex => $message) {
            $messageContent = $message['content'] ?? '';
            $sendInterval = intval($message['sendInterval'] ?? 5); // 秒
            $intervalUnit = $message['intervalUnit'] ?? 'seconds';

            // 转换间隔单位
            $sendInterval = $this->convertIntervalToSeconds($sendInterval, $intervalUnit);

            // 替换 @{好友} 占位符
            $processedContent = $this->replaceFriendPlaceholder($messageContent, $membersToWelcome);

            // 构建@消息格式
            $atContent = $this->buildAtMessage($processedContent, $membersToWelcome);
            
            // 判断是否有@人：如果有atId，则使用90001，否则使用1
            $hasAtMembers = !empty($atContent['atId']);
            $msgType = $hasAtMembers ? self::MSG_TYPE_AT : self::MSG_TYPE_TEXT;
            
            // 发送消息
            // 注意：wechatChatroomId 使用 groupId（数字类型），不是 chatroomId
            $sendResult = $webSocket->sendCommunitys([
                'content' => json_encode($atContent, JSON_UNESCAPED_UNICODE),
                'msgType' => $msgType,
                'wechatAccountId' => intval($wechatAccountId),
                'wechatChatroomId' => $groupId, // 使用 groupId（数字类型）
            ]);
            $sendResultData = json_decode($sendResult, true);
            $sendSuccess = !empty($sendResultData) && isset($sendResultData['code']) && $sendResultData['code'] == 200;
            // 记录发送记录
            $friendIds = array_column($membersToWelcome, 'wechatId');
            $this->saveWelcomeItem([
                'workbenchId' => $config['workbenchId'],
                'groupId' => $groupId,
                'deviceId' => !empty($devices) ? intval($devices[0]) : 0,
                'wechatAccountId' => $wechatAccountId,
                'friendId' => $friendIds,
                'status' => $sendSuccess ? WorkbenchGroupWelcomeItem::STATUS_SUCCESS : WorkbenchGroupWelcomeItem::STATUS_FAILED,
                'messageIndex' => $messageIndex,
                'messageId' => $message['id'] ?? '',
                'content' => $processedContent,
                'sendTime' => time(),
                'errorMsg' => $sendSuccess ? '' : ($sendResultData['msg'] ?? '发送失败'),
            ]);

            // 如果不是最后一条消息，等待间隔时间
            if ($messageIndex < count($messages) - 1) {
                sleep($sendInterval);
            }
        }

        Log::info("入群欢迎语发送成功，工作台ID: {$config['workbenchId']}, 群ID: {$groupId}, 成员数: " . count($membersToWelcome));
    }

    /**
     * 替换 @{好友} 占位符为群成员昵称（带@符号）
     * @param string $content 原始内容
     * @param array $members 成员列表
     * @return string 替换后的内容
     */
    protected function replaceFriendPlaceholder($content, $members)
    {
        if (empty($members)) {
            return str_replace('@{好友}', '', $content);
        }

        // 将所有成员的昵称拼接，每个昵称前添加@符号
        $atNicknames = [];
        foreach ($members as $member) {
            $nickname = $member['nickname'] ?? '';
            if (!empty($nickname)) {
                $atNicknames[] = '@' . $nickname;
            } else {
                // 如果没有昵称，使用wechatId
                $wechatId = $member['wechatId'] ?? '';
                if (!empty($wechatId)) {
                    $atNicknames[] = '@' . $wechatId;
                }
            }
        }
        
        $atNicknameStr = implode(' ', $atNicknames);

        // 替换 @{好友} 为 @昵称1 @昵称2 ...
        $content = str_replace('@{好友}', $atNicknameStr, $content);

        return $content;
    }

    /**
     * 构建@消息格式
     * @param string $text 文本内容（已替换@{好友}占位符，已包含@符号）
     * @param array $members 成员列表
     * @return array 格式：{"text":"@wong @wong 11111111","atId":"WANGMINGZHENG000,WANGMINGZHENG000"}
     */
    protected function buildAtMessage($text, $members)
    {
        $atIds = [];

        // 收集所有成员的wechatId用于atId
        foreach ($members as $member) {
            $wechatId = $member['wechatId'] ?? '';
            if (!empty($wechatId)) {
                $atIds[] = $wechatId;
            }
        }

        // 文本中已经包含了@昵称（在replaceFriendPlaceholder中已添加）
        // 直接使用处理后的文本
        return [
            'text' => trim($text),
            'atId' => implode(',', $atIds)
        ];
    }

    /**
     * 检查是否在工作时间范围内
     * @param string $startTime 开始时间（格式：HH:mm）
     * @param string $endTime 结束时间（格式：HH:mm）
     * @return bool
     */
    protected function isInTimeRange($startTime, $endTime)
    {
        if (empty($startTime) || empty($endTime)) {
            return true; // 如果没有配置时间，默认全天可用
        }

        $currentTime = date('H:i');
        $currentMinutes = $this->timeToMinutes($currentTime);
        $startMinutes = $this->timeToMinutes($startTime);
        $endMinutes = $this->timeToMinutes($endTime);

        if ($startMinutes <= $endMinutes) {
            // 正常情况：09:00 - 21:00
            return $currentMinutes >= $startMinutes && $currentMinutes <= $endMinutes;
        } else {
            // 跨天情况：21:00 - 09:00
            return $currentMinutes >= $startMinutes || $currentMinutes <= $endMinutes;
        }
    }

    /**
     * 将时间转换为分钟数
     * @param string $time 时间（格式：HH:mm）
     * @return int 分钟数
     */
    protected function timeToMinutes($time)
    {
        $parts = explode(':', $time);
        if (count($parts) != 2) {
            return 0;
        }
        return intval($parts[0]) * 60 + intval($parts[1]);
    }

    /**
     * 转换间隔单位到秒
     * @param int $interval 间隔数值
     * @param string $unit 单位（seconds/minutes/hours）
     * @return int 秒数
     */
    protected function convertIntervalToSeconds($interval, $unit)
    {
        switch ($unit) {
            case 'minutes':
                return $interval * 60;
            case 'hours':
                return $interval * 3600;
            case 'seconds':
            default:
                return $interval;
        }
    }

    /**
     * 保存欢迎语发送记录
     * @param array $data 记录数据
     * @return void
     */
    protected function saveWelcomeItem($data)
    {
        try {
            $item = new WorkbenchGroupWelcomeItem();
            $item->workbenchId = $data['workbenchId'];
            $item->groupId = $data['groupId'];
            $item->deviceId = $data['deviceId'] ?? 0;
            $item->wechatAccountId = $data['wechatAccountId'] ?? 0;
            $item->friendId = json_encode($data['friendId'] ?? [], JSON_UNESCAPED_UNICODE);
            $item->status = $data['status'] ?? WorkbenchGroupWelcomeItem::STATUS_PENDING;
            $item->messageIndex = $data['messageIndex'] ?? null;
            $item->messageId = $data['messageId'] ?? '';
            $item->content = $data['content'] ?? '';
            $item->sendTime = $data['sendTime'] ?? time();
            $item->errorMsg = $data['errorMsg'] ?? '';
            $item->retryCount = 0;
            $item->createTime = time();
            $item->updateTime = time();
            $item->save();
        } catch (\Exception $e) {
            Log::error('保存入群欢迎语记录失败：' . $e->getMessage());
        }
    }
}

