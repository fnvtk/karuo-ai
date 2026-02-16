<?php

namespace app\chukebao\controller;

use app\chukebao\model\FollowUp;
use app\chukebao\model\NoticeModel;
use app\chukebao\model\ToDo;
use library\ResponseHelper;
use think\Db;

class NoticeController extends BaseController
{
    /**
     * 列表
     * @return \think\response\Json
     * @throws \Exception
     */
    public function getList()
    {
        $page = $this->request->param('page', 1);
        $limit = $this->request->param('limit', 10);
        $keyword = $this->request->param('keyword', '');
        $accountId = $this->getUserInfo('s2_accountId');
        $userId = $this->getUserInfo('id');
        $companyId = $this->getUserInfo('companyId');

        if (empty($accountId)) {
            return ResponseHelper::error('请先登录');
        }

        $noRead =  NoticeModel::where(['userId' => $userId, 'companyId' => $companyId,'isRead' => 0])->count();

        $query = NoticeModel::where(['userId' => $userId, 'companyId' => $companyId])
            ->order('id desc');
        if (!empty($keyword)) {
            $query->where('title|message', 'like', '%' . $keyword . '%');
        }
        $total = $query->count();
        $list = $query->page($page, $limit)->order('isRead ASC,id DESC')->select()->toArray();


        foreach ($list as $k => &$v) {
            if ($v['type'] == 1) {
                $friendId = ToDo::where(['id' => $v['bindId']])->value('friendId');
            } elseif ($v['type'] == 2) {
                $friendId = FollowUp::where(['id' => $v['bindId']])->value('friendId');
            }
            if (!empty($friendId)) {
                $friend = Db::table('s2_wechat_friend')->where(['id' => $friendId])->field('nickname,avatar')->find();
            } else {
                $friend = ['nickname' => '', 'avatar' => ''];
            }
            $v['friendData'] = $friend;

            $v['readTime'] = !empty($v['readTime']) ? date('Y-m-d H:i:s', $v['readTime']) : '';
        }
        unset($v);
        return ResponseHelper::success(['list' => $list, 'total' => $total,'noRead' => $noRead]);
    }


    public function readMessage()
    {
        $id = $this->request->param('id', '');
        $userId = $this->getUserInfo('id');
        $companyId = $this->getUserInfo('companyId');

        if (empty($id)) {
            return ResponseHelper::error('参数缺失');
        }
        Db::startTrans();
        try {
            $notice = NoticeModel::where(['userId' => $userId, 'companyId' => $companyId, 'id' => $id, 'isRead' => 0])->find();
            if (empty($notice)) {
                return ResponseHelper::error('该消息不存在或标记已读');
            }
            $notice->isRead = 1;
            $notice->readTime = time();
            $notice->save();
            if ($notice->type == 1) {
                ToDo::where(['userId' => $userId, 'companyId' => $companyId, 'id' => $notice->bindId])->update(['isProcess' => 1, 'updateTime' => time()]);
            } elseif ($notice->type == 2) {
                FollowUp::where(['userId' => $userId, 'companyId' => $companyId, 'id' => $notice->bindId])->update(['isProcess' => 1, 'updateTime' => time()]);
            }
            Db::commit();
            return ResponseHelper::success(' ', '处理成功');
        } catch (\Exception $e) {
            Db::rollback();
            return ResponseHelper::error('处理失败：' . $e->getMessage());
        }
    }


    public function readAll()
    {
        $userId = $this->getUserInfo('id');
        $companyId = $this->getUserInfo('companyId');

        Db::startTrans();
        try {
            $noticeData = NoticeModel::where(['userId' => $userId, 'companyId' => $companyId, 'isRead' => 0])->select()->toArray();
            if (empty($noticeData)) {
                return ResponseHelper::error('暂未有新消息');
            }
            NoticeModel::where(['userId' => $userId, 'companyId' => $companyId, 'isRead' => 0])->update(['isRead' => 1, 'readTime' => time()]);
            FollowUp::where(['userId' => $userId, 'companyId' => $companyId, 'isProcess' => 0])->update(['isProcess' => 1, 'updateTime' => time()]);
            ToDo::where(['userId' => $userId, 'companyId' => $companyId, 'isProcess' => 0])->update(['isProcess' => 1, 'updateTime' => time()]);
            Db::commit();
            return ResponseHelper::success(' ', '全部已读');
        } catch (\Exception $e) {
            Db::rollback();
            return ResponseHelper::error('处理失败：' . $e->getMessage());
        }
    }

}