<?php

namespace app\chukebao\controller;

use app\chukebao\model\FollowUp;
use library\ResponseHelper;
use think\Db;

class FollowUpController extends BaseController
{

    public function getList(){
        $page = $this->request->param('page', 1);
        $limit =  $this->request->param('limit', 10);
        $keyword =  $this->request->param('keyword', '');
        $isRemind =  $this->request->param('isRemind', '');
        $isProcess =  $this->request->param('isProcess', '');
        $type =  $this->request->param('type', '');
        $userId = $this->getUserInfo('id');
        $companyId = $this->getUserInfo('companyId');


        $where = [
            ['companyId','=',$companyId],
            ['userId' ,'=', $userId]
        ];

        if ($isRemind != '') {
            $where[] = ['isRemind','=',$isRemind];
        }
        if ($type != '') {
            $where[] = ['type','=',$type];
        }
        if ($isProcess != '') {
            $where[] = ['isProcess','=',$isProcess];
        }

        if(!empty($keyword)){
            $where[] = ['title|description','like','%'.$keyword.'%'];
        }

        $query = FollowUp::where($where);

        $total = $query->count();
        $list = $query->where($where)->page($page,$limit)->order('id desc')->select();


        foreach ($list as &$item) {
            $nickname = Db::table('s2_wechat_friend')->where(['id' => $item['friendId']])->value('nickname');
            $item['nickname'] = !empty($nickname) ? $nickname : '-';
            $item['reminderTime'] = date('Y-m-d H:i:s',$item['reminderTime']);
        }
        unset($item);

        return ResponseHelper::success(['list'=>$list,'total'=>$total]);
    }


    /**
     * 添加
     * @return \think\response\Json
     * @throws \Exception
     */
    public function create(){
        $type =  $this->request->param('type', 0);
        $title =  $this->request->param('title', '');
        $reminderTime =  $this->request->param('reminderTime', '');
        $description =  $this->request->param('description', '');
        $friendId =  $this->request->param('friendId', '');
        $userId = $this->getUserInfo('id');
        $companyId = $this->getUserInfo('companyId');

        if (empty($title) || empty($reminderTime) || empty($description) || empty($friendId)){
            return ResponseHelper::error('参数缺失');
        }
        $friend = Db::table('s2_wechat_friend')->where(['id' => $friendId])->find();
        if (empty($friend)) {
            return ResponseHelper::error('好友不存在');
        }


        Db::startTrans();
        try {
            $FollowUp = new FollowUp();
            $FollowUp->type = $type;
            $FollowUp->title = $title;
            $FollowUp->friendId = $friendId;
            $FollowUp->reminderTime = !empty($reminderTime) ? strtotime($reminderTime) : time();
            $FollowUp->description = $description;
            $FollowUp->userId = $userId;
            $FollowUp->companyId = $companyId;
            $FollowUp->updateTime = time();
            $FollowUp->createTime = time();
            $FollowUp->save();
            Db::commit();
            return ResponseHelper::success(' ','创建成功');
        } catch (\Exception $e) {
            Db::rollback();
            return ResponseHelper::error('创建失败：'.$e->getMessage());
        }
    }


    /**
     * 处理代办事项
     * @return \think\response\Json
     * @throws \Exception
     */
    public function process(){
        $ids = $this->request->param('ids','');
        $userId = $this->getUserInfo('id');
        $companyId = $this->getUserInfo('companyId');

        if (empty($ids)){
            return ResponseHelper::error('参数缺失');
        }
        $ids = explode(',',$ids);

        if (!is_array($ids)){
            return ResponseHelper::error('格式错误');
        }

        $FollowUpIds = FollowUp::where(['userId' => $userId,'companyId' => $companyId,'isProcess' => 0])->whereIn('id',$ids)->column('id');
        if (empty($FollowUpIds)){
            return ResponseHelper::error('代办事项不存在');
        }

        Db::startTrans();
        try {
            FollowUp::whereIn('id',$FollowUpIds)->update(['isProcess' => 1,'isRemind' => 1,'updateTime' => time()]);
            Db::commit();
            return ResponseHelper::success(' ','已处理');
        } catch (\Exception $e) {
            Db::rollback();
            return ResponseHelper::error('处理失败：'.$e->getMessage());
        }





    }

}