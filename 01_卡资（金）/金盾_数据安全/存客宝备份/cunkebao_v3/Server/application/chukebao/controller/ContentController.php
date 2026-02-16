<?php

namespace app\chukebao\controller;

use app\chukebao\model\Keywords;
use app\chukebao\model\Material;
use app\chukebao\model\SensitiveWord;
use think\Db;
use library\ResponseHelper;

class ContentController extends BaseController
{
    //===================================================== 素材管理 =====================================================

    public function getAllMaterial(){

        $keyword =  $this->request->param('keyword', '');
        $userId = $this->getUserInfo('id');
        $companyId = $this->getUserInfo('companyId');

        $query = Material::where(['userId' => $userId,'companyId' => $companyId,'isDel' => 0,'status' => 1])
            ->field('id,title,cover')
            ->order('id desc');

        $list = $query->select()->toArray();

        return ResponseHelper::success($list);
    }


    /**
     * 素材列表
     * @return \think\response\Json
     * @throws \think\db\exception\DataNotFoundException
     * @throws \think\db\exception\ModelNotFoundException
     * @throws \think\exception\DbException
     */
    public function getMaterial(){
        $page = $this->request->param('page', 1);
        $limit =  $this->request->param('limit', 10);
        $keyword =  $this->request->param('keyword', '');
        $userId = $this->getUserInfo('id');
        $companyId = $this->getUserInfo('companyId');

        $query = Material::where(['userId' => $userId,'companyId' => $companyId,'isDel' => 0])
            ->order('id desc');
        if (!empty($keyword)){
            $query->where('title', 'like', '%'.$keyword.'%');
        }
        $list = $query->page($page, $limit)->select()->toArray();
        $total = $query->count();

        foreach ($list as $k => &$v){
            $user =  Db::name('users')->where(['id' => $v['userId']])->field('username,account')->find();
            if (!empty($user)){
                $v['userName'] = !empty($user['username']) ? $user['username'] : $user['account'];
            }else{
                $v['userName'] = '';
            }
        }
        unset($v);
        return ResponseHelper::success(['list'=>$list,'total'=>$total]);
    }


    /**
     * 素材添加
     * @return \think\response\Json
     * @throws \Exception
     */
    public function createMaterial(){
        $title =  $this->request->param('title', '');
        $content =  $this->request->param('content', []);
        $cover =  $this->request->param('cover', '');
        $status =  $this->request->param('status', 0);
        $userId = $this->getUserInfo('id');
        $companyId = $this->getUserInfo('companyId');

        if (empty($title) || empty($content) || empty($cover)){
            return ResponseHelper::error('参数缺失');
        }
        $newContent = [];
        foreach ($content as $k => $v){
            if (in_array($v['type'],['text','image','video','audio','file','link'])){
                $newContent[] = $v;
            }
        }

        Db::startTrans();
        try {
            $query = new Material();
            $query->title = $title;
            $query->content = !empty($newContent) ? json_encode($newContent,256) : json_encode([],256);
            $query->cover = $cover;
            $query->status = $status;
            $query->userId = $userId;
            $query->companyId = $companyId;
            $query->createTime = time();
            $query->updateTime = time();
            $query->save();
            Db::commit();
            return ResponseHelper::success(' ','创建成功');
        } catch (\Exception $e) {
            Db::rollback();
            return ResponseHelper::error('创建失败：'.$e->getMessage());
        }
    }

    /**
     * 素材详情
     * @return \think\response\Json
     */
    public function detailsMaterial()
    {
        $id =  $this->request->param('id', '');
        $userId = $this->getUserInfo('id');
        $companyId = $this->getUserInfo('companyId');
        if (empty($id)){
            return ResponseHelper::error('参数缺失');
        }
        $data = Material::where(['id'=>$id,'isDel' => 0,'userId' => $userId,'companyId' => $companyId])->find();
        if (empty($data)){
            return ResponseHelper::error('该素材已被删除或者不存在');
        }
        $data['content'] = json_decode($data['content'],true);
        unset($data['createTime'],$data['updateTime'],$data['isDel'],$data['delTime']);
        return ResponseHelper::success($data,'获取成功');
    }

    /**
     * 删除素材
     * @return \think\response\Json
     */
    public function delMaterial()
    {
        $id =  $this->request->param('id', '');
        $userId = $this->getUserInfo('id');
        $companyId = $this->getUserInfo('companyId');
        if (empty($id)){
            return ResponseHelper::error('参数缺失');
        }
        $data = Material::where(['id'=>$id,'isDel' => 0,'userId' => $userId,'companyId' => $companyId])->find();
        if (empty($data)){
            return ResponseHelper::error('该素材已被删除或者不存在');
        }
        Db::startTrans();
        try {
            $data->isDel = 1;
            $data->delTime = time();
            $data->save();
            Db::commit();
            return ResponseHelper::success('','删除成功');
        } catch (\Exception $e) {
            Db::rollback();
            return ResponseHelper::error('删除失败：'.$e->getMessage());
        }
    }


    /**
     * 修改素材
     * @return \think\response\Json
     * @throws \Exception
     */
    public function updateMaterial(){
        $id =  $this->request->param('id', '');
        $title =  $this->request->param('title', '');
        $content =  $this->request->param('content', []);
        $cover =  $this->request->param('cover', '');
        $status =  $this->request->param('status', 0);
        $userId = $this->getUserInfo('id');
        $companyId = $this->getUserInfo('companyId');

        if (empty($id) || empty($title) || empty($content) || empty($cover)){
            return ResponseHelper::error('参数缺失');
        }
        $newContent = [];
        foreach ($content as $k => $v){
            if (in_array($v['type'],['text','image','video','audio','file','link'])){
                $newContent[] = $v;
            }
        }
        $query = Material::where(['id'=>$id,'isDel' => 0,'userId' => $userId,'companyId' => $companyId])->find();
        if (empty($query)){
            return ResponseHelper::error('该素材已被删除或者不存在');
        }
        Db::startTrans();
        try {
            $query->title = $title;
            $query->content = !empty($newContent) ? json_encode($newContent,256) : json_encode([],256);
            $query->cover = $cover;
            $query->status = $status;
            $query->updateTime = time();
            $query->save();
            Db::commit();
            return ResponseHelper::success(' ','修改成功');
        } catch (\Exception $e) {
            Db::rollback();
            return ResponseHelper::error('修改失败：'.$e->getMessage());
        }
    }
    //===================================================== 素材管理 =====================================================





    //==================================================== 违禁词管理 ====================================================

    /**
     * 违禁词列表
     * @return \think\response\Json
     * @throws \think\db\exception\DataNotFoundException
     * @throws \think\db\exception\ModelNotFoundException
     * @throws \think\exception\DbException
     */
    public function getSensitiveWord(){
        $page = $this->request->param('page', 1);
        $limit =  $this->request->param('limit', 10);
        $keyword =  $this->request->param('keyword', '');
        $userId = $this->getUserInfo('id');
        $companyId = $this->getUserInfo('companyId');

        $query = SensitiveWord::where(['userId' => $userId,'companyId' => $companyId,'isDel' => 0])
            ->order('id desc');
        if (!empty($keyword)){
            $query->where('title', 'like', '%'.$keyword.'%');
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
        }
        unset($v);
        return ResponseHelper::success(['list'=>$list,'total'=>$total]);
    }


    /**
     * 违禁词添加
     * @return \think\response\Json
     * @throws \Exception
     */
    public function createSensitiveWord(){
        $title =  $this->request->param('title', '');
        $keywords =  $this->request->param('keywords', '');
        $content =  $this->request->param('content', '');
        $status =  $this->request->param('status', 0);
        $operation =  $this->request->param('operation', 0);
        $userId = $this->getUserInfo('id');
        $companyId = $this->getUserInfo('companyId');

        if (empty($title) || empty($keywords)){
            return ResponseHelper::error('参数缺失');
        }

        $keywords = explode(',',$keywords);

        Db::startTrans();
        try {
            $query = new SensitiveWord();
            $query->title = $title;
            $query->keywords = $keywords;
            $query->content = $content;
            $query->status = $status;
            $query->operation = $operation;
            $query->userId = $userId;
            $query->companyId = $companyId;
            $query->createTime = time();
            $query->updateTime = time();
            $query->save();
            Db::commit();
            return ResponseHelper::success(' ','创建成功');
        } catch (\Exception $e) {
            Db::rollback();
            return ResponseHelper::error('创建失败：'.$e->getMessage());
        }
    }



    /**
     * 违禁词详情
     * @return \think\response\Json
     */
    public function detailsSensitiveWord()
    {
        $id =  $this->request->param('id', '');
        $userId = $this->getUserInfo('id');
        $companyId = $this->getUserInfo('companyId');
        if (empty($id)){
            return ResponseHelper::error('参数缺失');
        }
        $data = SensitiveWord::where(['id'=>$id,'isDel' => 0,'userId' => $userId,'companyId' => $companyId])->find();
        if (empty($data)){
            return ResponseHelper::error('该素材已被删除或者不存在');
        }
        $data['keywords'] = json_decode($data['keywords'],true);
        $data['keywords'] = implode(',',$data['keywords']);
        unset($data['createTime'],$data['updateTime'],$data['isDel'],$data['delTime']);
        return ResponseHelper::success($data,'获取成功');
    }

    /**
     * 违禁词删除
     * @return \think\response\Json
     */
    public function delSensitiveWord()
    {
        $id =  $this->request->param('id', '');
        $userId = $this->getUserInfo('id');
        $companyId = $this->getUserInfo('companyId');
        if (empty($id)){
            return ResponseHelper::error('参数缺失');
        }
        $data = SensitiveWord::where(['id'=>$id,'isDel' => 0,'userId' => $userId,'companyId' => $companyId])->find();
        if (empty($data)){
            return ResponseHelper::error('该素材已被删除或者不存在');
        }
        Db::startTrans();
        try {
            $data->isDel = 1;
            $data->delTime = time();
            $data->save();
            Db::commit();
            return ResponseHelper::success('','删除成功');
        } catch (\Exception $e) {
            Db::rollback();
            return ResponseHelper::error('删除失败：'.$e->getMessage());
        }
    }


    /**
     * 更新违禁词
     * @return \think\response\Json
     * @throws \Exception
     */
    public function updateSensitiveWord(){
        $id =  $this->request->param('id', '');
        $title =  $this->request->param('title', '');
        $keywords =  $this->request->param('keywords', '');
        $content =  $this->request->param('content', '');
        $status =  $this->request->param('status', 0);
        $operation =  $this->request->param('operation', 0);
        $userId = $this->getUserInfo('id');
        $companyId = $this->getUserInfo('companyId');

        if (empty($id) || empty($title) || empty($keywords)){
            return ResponseHelper::error('参数缺失');
        }

        $keywords = explode(',',$keywords);

        $query = SensitiveWord::where(['id'=>$id,'isDel' => 0,'userId' => $userId,'companyId' => $companyId])->find();
        if (empty($query)){
            return ResponseHelper::error('该素材已被删除或者不存在');
        }
        Db::startTrans();
        try {
            $query->title = $title;
            $query->keywords = $keywords;
            $query->content = $content;
            $query->status = $status;
            $query->operation = $operation;
            $query->updateTime = time();
            $query->save();
            Db::commit();
            return ResponseHelper::success(' ','修改成功');
        } catch (\Exception $e) {
            Db::rollback();
            return ResponseHelper::error('修改失败：'.$e->getMessage());
        }
    }

    /**
     * 修改违禁词状态
     * @return \think\response\Json
     * @throws \Exception
     */
    public function setSensitiveWordStatus(){
        $id =  $this->request->param('id', '');
        $userId = $this->getUserInfo('id');
        $companyId = $this->getUserInfo('companyId');

        if (empty($id)){
            return ResponseHelper::error('参数缺失');
        }

        $query = SensitiveWord::where(['id'=>$id,'isDel' => 0,'userId' => $userId,'companyId' => $companyId])->find();
        if (empty($query)){
            return ResponseHelper::error('该素材已被删除或者不存在');
        }
        Db::startTrans();
        try {
            $query->status = !empty($query['status']) ? 0 : 1;;
            $query->updateTime = time();
            $query->save();
            Db::commit();
            return ResponseHelper::success(' ','修改成功');
        } catch (\Exception $e) {
            Db::rollback();
            return ResponseHelper::error('修改失败：'.$e->getMessage());
        }
    }


    //==================================================== 违禁词管理 ====================================================





    //=================================================== 关键词词管理 ====================================================

    /**
     * 关键词列表
     * @return \think\response\Json
     * @throws \think\db\exception\DataNotFoundException
     * @throws \think\db\exception\ModelNotFoundException
     * @throws \think\exception\DbException
     */
    public function getKeywords(){
        $page = $this->request->param('page', 1);
        $limit =  $this->request->param('limit', 10);
        $keyword =  $this->request->param('keyword', '');
        $userId = $this->getUserInfo('id');
        $companyId = $this->getUserInfo('companyId');

        $query = Keywords::where(['userId' => $userId,'companyId' => $companyId,'isDel' => 0])
            ->order('id desc');
        if (!empty($keyword)){
            $query->where('title', 'like', '%'.$keyword.'%');
        }
        $total = $query->count();
        $list = $query->page($page, $limit)->select()->toArray();


        foreach ($list as $k => &$v){
            $v['metailGroups'] = json_decode($v['metailGroups'],true);
            $v['content'] = json_decode($v['content'],true);
            $v['keywords'] = json_decode($v['keywords'],true);

            $metailData = Material::where(['isDel' => 0,'userId' => $userId,'companyId' => $companyId])
                ->whereIn('id',$v['metailGroups'])
                ->select()->toArray();
            $v['metailGroupsOptions'] =  $metailData;


            $user =  Db::name('users')->where(['id' => $v['userId']])->field('username,account')->find();
            if (!empty($user)){
                $v['userName'] = !empty($user['username']) ? $user['username'] : $user['account'];
            }else{
                $v['userName'] = '';
            }
        }
        unset($v);
        return ResponseHelper::success(['list'=>$list,'total'=>$total]);
    }


    /**
     * 关键词添加
     * @return \think\response\Json
     * @throws \Exception
     */
    public function createKeywords(){
        $title =  $this->request->param('title', '');
        $type =  $this->request->param('type', 0);
        $keywords =  $this->request->param('keywords', '');
        $replyType =  $this->request->param('replyType', 0);
        $content =  $this->request->param('content','');
        $metailGroups =  $this->request->param('metailGroups',[]);
        $status =  $this->request->param('status', 0);
        $level =  $this->request->param('level', 50);
        $userId = $this->getUserInfo('id');
        $companyId = $this->getUserInfo('companyId');

        if (empty($title) || empty($keywords) || (empty(metailGroups) && empty($content))){
            return ResponseHelper::error('参数缺失');
        }

        $keywords = explode(',',$keywords);

        Db::startTrans();
        try {
            $query = new Keywords();
            $query->title = $title;
            $query->type = $type;
            $query->keywords = !empty($keywords) ? json_encode($keywords,256) : json_encode([]);
            $query->replyType = $replyType;
            $query->content = !empty($content) ? json_encode($content,256) : json_encode([]);;
            $query->metailGroups = !empty($metailGroups) ? json_encode($metailGroups,256) : json_encode([]);;
            $query->status = $status;
            $query->level = $level;
            $query->userId = $userId;
            $query->companyId = $companyId;
            $query->createTime = time();
            $query->updateTime = time();
            $query->save();
            Db::commit();
            return ResponseHelper::success(' ','创建成功');
        } catch (\Exception $e) {
            Db::rollback();
            return ResponseHelper::error('创建失败：'.$e->getMessage());
        }
    }



    /**
     * 关键词详情
     * @return \think\response\Json
     */
    public function detailsKeywords()
    {
        $id =  $this->request->param('id', '');
        $userId = $this->getUserInfo('id');
        $companyId = $this->getUserInfo('companyId');
        if (empty($id)){
            return ResponseHelper::error('参数缺失');
        }
        $data = Keywords::where(['id'=>$id,'isDel' => 0,'userId' => $userId,'companyId' => $companyId])->find();
        if (empty($data)){
            return ResponseHelper::error('该素材已被删除或者不存在');
        }

        $data['metailGroups'] = json_decode($data['metailGroups'],true);
        $metailData = Material::where(['isDel' => 0,'userId' => $userId,'companyId' => $companyId])
            ->whereIn('id',$data['metailGroups'])
            ->select()->toArray();
        $data['metailGroupsOptions'] =  $metailData;

        $data['content'] = json_decode($data['content'],true);
        $data['keywords'] = json_decode($data['keywords'],true);
        $data['keywords'] = implode(',',$data['keywords']);
        unset($data['createTime'],$data['updateTime'],$data['isDel'],$data['delTime']);
        return ResponseHelper::success($data,'获取成功');
    }

    /**
     * 关键词删除
     * @return \think\response\Json
     */
    public function delKeywords()
    {
        $id =  $this->request->param('id', '');
        $userId = $this->getUserInfo('id');
        $companyId = $this->getUserInfo('companyId');
        if (empty($id)){
            return ResponseHelper::error('参数缺失');
        }
        $data = Keywords::where(['id'=>$id,'isDel' => 0,'userId' => $userId,'companyId' => $companyId])->find();
        if (empty($data)){
            return ResponseHelper::error('该关键词已被删除或者不存在');
        }
        Db::startTrans();
        try {
            $data->isDel = 1;
            $data->delTime = time();
            $data->save();
            Db::commit();
            return ResponseHelper::success('','删除成功');
        } catch (\Exception $e) {
            Db::rollback();
            return ResponseHelper::error('删除失败：'.$e->getMessage());
        }
    }


    /**
     * 更新关键词
     * @return \think\response\Json
     * @throws \Exception
     */
    public function updateKeywords(){
        $id =  $this->request->param('id', '');
        $title =  $this->request->param('title', '');
        $type =  $this->request->param('type', 0);
        $keywords =  $this->request->param('keywords', '');
        $replyType =  $this->request->param('replyType', 0);
        $content =  $this->request->param('content','');
        $metailGroups =  $this->request->param('metailGroups','');
        $status =  $this->request->param('status', 0);
        $level =  $this->request->param('level', 50);
        $userId = $this->getUserInfo('id');
        $companyId = $this->getUserInfo('companyId');

        if (empty($title) || empty($keywords) || (empty($metailGroups) && empty($content))){
            return ResponseHelper::error('参数缺失');
        }

        $keywords = explode(',',$keywords);

        $query = Keywords::where(['id'=>$id,'isDel' => 0,'userId' => $userId,'companyId' => $companyId])->find();
        if (empty($query)){
            return ResponseHelper::error('该素材已被删除或者不存在');
        }
        Db::startTrans();
        try {
            $query->title = $title;
            $query->type = $type;
            $query->keywords = !empty($keywords) ? json_encode($keywords,256) : json_encode([]);
            $query->replyType = $replyType;
            $query->content = !empty($content) ? json_encode($content,256) : json_encode([]);;
            $query->metailGroups = !empty($metailGroups) ? json_encode($metailGroups,256) : json_encode([]);;;
            $query->status = $status;
            $query->level = $level;
            $query->save();
            Db::commit();
            return ResponseHelper::success(' ','修改成功');
        } catch (\Exception $e) {
            Db::rollback();
            return ResponseHelper::error('修改失败：'.$e->getMessage());
        }
    }

    /**
     * 修改关键词状态
     * @return \think\response\Json
     * @throws \Exception
     */
    public function setKeywordStatus(){
        $id =  $this->request->param('id', '');
        $userId = $this->getUserInfo('id');
        $companyId = $this->getUserInfo('companyId');

        if (empty($id)){
            return ResponseHelper::error('参数缺失');
        }

        $query = Keywords::where(['id'=>$id,'isDel' => 0,'userId' => $userId,'companyId' => $companyId])->find();
        if (empty($query)){
            return ResponseHelper::error('该素材已被删除或者不存在');
        }
        Db::startTrans();
        try {
            $query->status = !empty($query['status']) ? 0 : 1;
            $query->updateTime = time();
            $query->save();
            Db::commit();
            return ResponseHelper::success(' ','修改成功');
        } catch (\Exception $e) {
            Db::rollback();
            return ResponseHelper::error('修改失败：'.$e->getMessage());
        }
    }



    //=================================================== 关键词词管理 ====================================================






}