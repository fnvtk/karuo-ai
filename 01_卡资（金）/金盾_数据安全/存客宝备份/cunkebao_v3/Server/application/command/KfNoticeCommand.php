<?php

namespace app\command;

use app\chukebao\model\FollowUp;
use app\chukebao\model\NoticeModel;
use app\chukebao\model\ToDo;
use library\ResponseHelper;
use think\console\Command;
use think\console\Input;
use think\console\Output;
use think\console\input\Option;
use think\Db;
use think\facade\Log;
use think\Queue;
use app\job\AllotFriendJob;
use think\facade\Cache;

class KfNoticeCommand extends Command
{
    // 队列名称
    protected $queueName = 'kf_notice';

    protected function configure()
    {
        $this->setName('kfNotice:run')
            ->setDescription('消息通知');
    }

    protected function execute(Input $input, Output $output)
    {
        $output->writeln('开始处理消息通知任务...');
        $where = [
            ['isRemind', '=', 0],
            ['reminderTime', '<=', time()],
        ];
        $notice = [];
        Db::startTrans();
        try {
            $followUp = FollowUp::where($where)->alias('a')
                ->field('a.*,f.nickname,f.avatar,f.alias,f.wechatId')
                ->join(['s2_wechat_friend f'], 'a.friendId = f.id')
                ->where('a.isRemind',0)
                ->select();
            if (!empty($followUp)) {
                foreach ($followUp as $k => $v) {
                    switch ($v['type']) {
                        case 1:
                            $title = '电话回访';
                            break;
                        case 2:
                            $title = '发送消息';
                            break;
                        case 3:
                            $title = '安排会议';
                            break;
                        case 4:
                            $title = '发送邮件';
                            break;
                        default:
                            $title = '其他';
                            break;
                    }

                    $wechatId = !empty($v['alias']) ? $v['alias'] : $v['wechatId'];
                    $nickname = $v['nickname'] . '(' . $wechatId . ')';
                    $message = $nickname . '：' . $v['description'];
                    $notice[] = [
                        'type' => 2,
                        'userId' => $v['userId'],
                        'companyId' => $v['companyId'],
                        'bindId' => $v['id'],
                        'title' => $title,
                        'message' => $message,
                        'createTime' => $v['reminderTime'],
                    ];
                }
                FollowUp::where($where)->update(['isRemind' => 1]);
            }

            $toDo = ToDo::where($where)->alias('a')
                ->field('a.*,f.nickname,f.avatar,f.alias,f.wechatId')
                ->join(['s2_wechat_friend f'], 'a.friendId = f.id')
                ->where('a.isRemind',0)
                ->select();
            if (!empty($toDo)) {
                foreach ($toDo as $k => $v) {

                    $wechatId = !empty($v['alias']) ? $v['alias'] : $v['wechatId'];
                    $nickname = $v['nickname'] . '(' . $wechatId . ')';
                    $message = $nickname . '：' . $v['description'];


                    $notice[] = [
                        'type' => 1,
                        'userId' => $v['userId'],
                        'companyId' => $v['companyId'],
                        'bindId' => $v['id'],
                        'title' => $v['title'],
                        'message' => $message,
                        'createTime' => $v['reminderTime'],
                    ];
                }
                ToDo::where($where)->update(['isRemind' => 1]);
            }

            $noticeModel = new NoticeModel();
            $noticeModel->insertAll($notice);
            Db::commit();
            return true;
        } catch (\Exception $e) {
            Db::rollback();
            return false;
        }

    }

} 