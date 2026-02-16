<?php

namespace app\chukebao\controller;

use app\chukebao\model\Questions;
use library\ResponseHelper;
use think\Db;

class QuestionsController extends BaseController
{

    /**
     * 列表
     * @return \think\response\Json
     * @throws \Exception
     */
    public function getList(){
        $page = $this->request->param('page', 1);
        $limit =  $this->request->param('limit', 10);
        $keyword =  $this->request->param('keyword', '');
        $accountId = $this->getUserInfo('s2_accountId');
        $userId = $this->getUserInfo('id');
        $companyId = $this->getUserInfo('companyId');

        if (empty($accountId)){
            return ResponseHelper::error('请先登录');
        }
        $query = Questions::where(['userId' => $userId,'companyId' => $companyId,'isDel' => 0])
            ->order('id desc');
        if (!empty($keyword)){
            $query->where('questions|answers', 'like', '%'.$keyword.'%');
        }
        $total = $query->count();
        $list = $query->page($page, $limit)->select()->toArray();


        foreach ($list as $k => &$v){
            $user =  Db::name('users')->where(['id' => $v['userId']])->field('username,account')->find();
            if (!empty($user)){
                $v['userName'] = !empty($user['username']) ? $user['username'] : $user['account'];
            }else{
                $v['userName'] = '';
            }
            $v['answers'] = json_decode($v['answers'],true);
        }
        unset($v);
        return ResponseHelper::success(['list'=>$list,'total'=>$total]);
    }


    /**
     * 新增
     * @return \think\response\Json
     * @throws \Exception
     */
    public function create(){

        $type =  $this->request->param('type', 0);
        $questions =  $this->request->param('questions', '');
        $answers =  $this->request->param('answers', []);
        $status =  $this->request->param('status', 0);
        $accountId = $this->getUserInfo('s2_accountId');
        $userId = $this->getUserInfo('id');
        $companyId = $this->getUserInfo('companyId');

        if (empty($accountId)){
            return ResponseHelper::error('请先登录');
        }

        if (empty($questions) || empty($answers)){
            return ResponseHelper::error('问题和答案不能为空');
        }

        Db::startTrans();
        try {
            $questionsModel = new Questions();
            $questionsModel->type = $type;
            $questionsModel->questions = $questions;
            $questionsModel->answers = !empty($answers) ? json_encode($answers,256) : json_encode([],256);
            $questionsModel->status = $status;
            $questionsModel->accountId = $accountId;
            $questionsModel->userId = $userId;
            $questionsModel->companyId = $companyId;
            $questionsModel->createTime = time();
            $questionsModel->updateTime = time();
            $questionsModel->save();
            Db::commit();
            return ResponseHelper::success(' ','创建成功');
        } catch (\Exception $e) {
            Db::rollback();
            return ResponseHelper::error('创建失败：'.$e->getMessage());
        }
    }


    /**
     * 更新
     * @return \think\response\Json
     * @throws \Exception
     */
    public function update(){

        $id =  $this->request->param('id', 0);
        $accountId = $this->getUserInfo('s2_accountId');
        $userId = $this->getUserInfo('id');
        $companyId = $this->getUserInfo('companyId');
        $type =  $this->request->param('type', 0);
        $questions =  $this->request->param('questions', '');
        $answers =  $this->request->param('answers', []);
        $status =  $this->request->param('status', 0);
        $accountId = $this->getUserInfo('s2_accountId');
        $userId = $this->getUserInfo('id');
        $companyId = $this->getUserInfo('companyId');

        if (empty($accountId)){
            return ResponseHelper::error('请先登录');
        }

        if (empty($id)){
            return ResponseHelper::error('参数缺失');
        }

        if (empty($questions) || empty($answers)){
            return ResponseHelper::error('问题和答案不能为空');
        }
        Db::startTrans();
        try {
            $questionsData = Questions::where(['id' => $id,'userId' => $userId,'companyId' => $companyId,'isDel' => 0])->find();
            $questionsData->type = $type;
            $questionsData->questions = $questions;
            $questionsData->answers = !empty($answers) ? json_encode($answers,256) : json_encode([],256);
            $questionsData->status = $status;
            $questionsData->accountId = $accountId;
            $questionsData->userId = $userId;
            $questionsData->companyId = $companyId;
            $questionsData->updateTime = time();
            $questionsData->save();
            Db::commit();
            return ResponseHelper::success(' ','更新成功');
        } catch (\Exception $e) {
            Db::rollback();
            return ResponseHelper::error('更新失败：'.$e->getMessage());
        }
    }





    /**
     * 删除
     * @return \think\response\Json
     * @throws \Exception
     */
    public function delete(){

        $id =  $this->request->param('id', 0);
        $accountId = $this->getUserInfo('s2_accountId');
        $userId = $this->getUserInfo('id');
        $companyId = $this->getUserInfo('companyId');

        if (empty($accountId)){
            return ResponseHelper::error('请先登录');
        }

        if (empty($id)){
            return ResponseHelper::error('参数缺失');
        }
        $questions = Questions::where(['id' => $id,'userId' => $userId,'companyId' => $companyId,'isDel' => 0])->find();

        if (empty($questions)){
            return ResponseHelper::error('该问题不存在或者已删除');
        }
        $res = Questions::where(['id' => $id])->update(['isDel' => 1,'deleteTime' => time()]);

        if (!empty($res)){
            return ResponseHelper::success('','已删除');
        }else{
            return ResponseHelper::error('删除失败');
        }

    }


    /**
     * 详情
     * @return \think\response\Json
     * @throws \Exception
     */
    public function detail(){

        $id =  $this->request->param('id', 0);
        $accountId = $this->getUserInfo('s2_accountId');
        $userId = $this->getUserInfo('id');
        $companyId = $this->getUserInfo('companyId');

        if (empty($accountId)){
            return ResponseHelper::error('请先登录');
        }

        if (empty($id)){
            return ResponseHelper::error('参数缺失');
        }
        $questions = Questions::where(['id' => $id,'userId' => $userId,'companyId' => $companyId,'isDel' => 0])->find();

        if (empty($questions)){
            return ResponseHelper::error('该问题不存在或者已删除');
        }

        $questions['answers'] = json_decode($questions['answers'],true);
        $user =  Db::name('users')->where(['id' => $questions['userId']])->field('username,account')->find();
        if (!empty($user)){
            $questions['userName'] = !empty($user['username']) ? $user['username'] : $user['account'];
        }else{
            $questions['userName'] = '';
        }

        unset(
            $questions['isDel'],
            $questions['deleteTime'],
            $questions['createTime'],
            $questions['updateTime']
        );

        return ResponseHelper::success($questions,'获取成功');


    }




}