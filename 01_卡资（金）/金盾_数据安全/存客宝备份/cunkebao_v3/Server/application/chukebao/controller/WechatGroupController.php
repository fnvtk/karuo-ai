<?php

namespace app\chukebao\controller;

use library\ResponseHelper;
use think\Db;
use app\chukebao\model\ChatGroups;

class WechatGroupController extends BaseController
{

    /**
     * 获取分组列表
     * @return \think\response\Json
     * @throws \Exception
     */
    public function getList()
    {
        // 公司维度分组，不强制校验 userId
        $companyId = $this->getUserInfo('companyId');

        $query = ChatGroups::where([
                'companyId' => $companyId,
                'isDel'     => 0,
            ])
            ->order('groupType desc,sort desc,id desc');

        $total = $query->count();
        $list = $query->select();

        // 处理每个分组的数据
        $list = is_array($list) ? $list : $list->toArray();
        foreach ($list as $k => &$v) {
            $v['createTime'] = !empty($v['createTime']) ? date('Y-m-d H:i:s', $v['createTime']) : '';
        }
        unset($v);

        return ResponseHelper::success(['list'=>$list,'total'=>$total]);
    }

    /**
     * 新增分组
     * @return \think\response\Json
     * @throws \Exception
     */
    public function create()
    {   
        $groupName = $this->request->param('groupName', '');
        $groupMemo = $this->request->param('groupMemo', '');
        $groupType = $this->request->param('groupType', 1);
        $sort = $this->request->param('sort', 0);
        $companyId = $this->getUserInfo('companyId');

        // 只校验公司维度
        if (empty($companyId)) {
            return ResponseHelper::error('请先登录');
        }

        if (empty($groupName)) {
            return ResponseHelper::error('分组名称不能为空');
        }

        // 验证分组类型
        if (!in_array($groupType, [1, 2])) {
            return ResponseHelper::error('无效的分组类型');
        }

        Db::startTrans();
        try {
            $chatGroup = new ChatGroups();
            $chatGroup->groupName  = $groupName;
            $chatGroup->groupMemo  = $groupMemo;
            $chatGroup->groupType  = $groupType;
            $chatGroup->sort       = $sort;
            $chatGroup->userId     = $this->getUserInfo('id');
            $chatGroup->companyId  = $companyId;
            $chatGroup->createTime = time();
            $chatGroup->isDel      = 0;
            $chatGroup->save();

            Db::commit();
            return ResponseHelper::success(['id' => $chatGroup->id], '创建成功');
        } catch (\Exception $e) {
            Db::rollback();
            return ResponseHelper::error('创建失败：' . $e->getMessage());
        }
    }

    /**
     * 更新分组
     * @return \think\response\Json
     * @throws \Exception
     */
    public function update()
    {   
        $id = $this->request->param('id', 0);
        $groupName = $this->request->param('groupName', '');
        $groupMemo = $this->request->param('groupMemo', '');
        $groupType = $this->request->param('groupType', 1);
        $sort = $this->request->param('sort', 0);
        $companyId = $this->getUserInfo('companyId');

        if (empty($companyId)) {
            return ResponseHelper::error('请先登录');
        }

        if (empty($id)) {
            return ResponseHelper::error('参数缺失');
        }

        if (empty($groupName)) {
            return ResponseHelper::error('分组名称不能为空');
        }

        // 验证分组类型
        if (!in_array($groupType, [1, 2])) {
            return ResponseHelper::error('无效的分组类型');
        }

        // 检查分组是否存在
        $chatGroup = ChatGroups::where([
                'id'        => $id,
                'companyId' => $companyId,
                'isDel'     => 0,
            ])->find();

        if (empty($chatGroup)) {
            return ResponseHelper::error('该分组不存在或已删除');
        }

        Db::startTrans();
        try {
            $chatGroup->groupName = $groupName;
            $chatGroup->groupMemo = $groupMemo;
            $chatGroup->groupType = $groupType;
            $chatGroup->sort      = $sort;
            $chatGroup->save();

            Db::commit();
            return ResponseHelper::success('', '更新成功');
        } catch (\Exception $e) {
            Db::rollback();
            return ResponseHelper::error('更新失败：' . $e->getMessage());
        }
    }

    /**
     * 删除分组（假删除）
     * @return \think\response\Json
     * @throws \Exception
     */
    public function delete()
    {   
        $id = $this->request->param('id', 0);
        $companyId = $this->getUserInfo('companyId');

        if (empty($companyId)) {
            return ResponseHelper::error('请先登录');
        }

        if (empty($id)) {
            return ResponseHelper::error('参数缺失');
        }

        // 检查分组是否存在
        $chatGroup = ChatGroups::where([
                'id'        => $id,
                'companyId' => $companyId,
                'isDel'     => 0,
            ])->find();

        if (empty($chatGroup)) {
            return ResponseHelper::error('该分组不存在或已删除');
        }

        Db::startTrans();
        try {
            // 1. 假删除当前分组
            $chatGroup->isDel      = 1;
            $chatGroup->deleteTime = time();
            $chatGroup->save();

            // 2. 重置该分组下所有好友的分组ID（s2_wechat_friend.groupIds -> 0）
            Db::table('s2_wechat_friend')
                ->where('groupIds', $id)
                ->update(['groupIds' => 0]);

            // 3. 重置该分组下所有微信群的分组ID（s2_wechat_chatroom.groupIds -> 0）
            Db::table('s2_wechat_chatroom')
                ->where('groupIds', $id)
                ->update(['groupIds' => 0]);

            Db::commit();
            return ResponseHelper::success('', '删除成功');
        } catch (\Exception $e) {
            Db::rollback();
            return ResponseHelper::error('删除失败：' . $e->getMessage());
        }
    }

    /**
     * 移动分组（将好友或群移动到指定分组）
     * @return \think\response\Json
     * @throws \Exception
     */
    public function move()
    {
        // type: friend 好友, chatroom 群
        $type      = $this->request->param('type', 'friend');
        $targetId  = (int)$this->request->param('groupId', 0);
        // 仅支持单个ID移动
        $idParam   = $this->request->param('id', 0);
        $companyId = $this->getUserInfo('companyId');

        if (empty($companyId)) {
            return ResponseHelper::error('请先登录');
        }

        if (empty($targetId)) {
            return ResponseHelper::error('目标分组ID不能为空');
        }

        // 仅允许单个 ID，禁止批量
        $moveId = (int)$idParam;
        if (empty($moveId)) {
            return ResponseHelper::error('需要移动的ID不能为空');
        }

        // 校验目标分组是否存在且属于当前公司
        $targetGroup = ChatGroups::where([
                'id'        => $targetId,
                'companyId' => $companyId,
                'isDel'     => 0,
            ])->find();

        if (empty($targetGroup)) {
            return ResponseHelper::error('目标分组不存在或已删除');
        }

        // 校验分组类型与移动对象类型是否匹配
        // groupType: 1=好友分组, 2=群分组
        if ($type === 'friend' && (int)$targetGroup->groupType !== 1) {
            return ResponseHelper::error('目标分组类型错误（需要好友分组）');
        }
        if ($type === 'chatroom' && (int)$targetGroup->groupType !== 2) {
            return ResponseHelper::error('目标分组类型错误（需要群分组）');
        }

        Db::startTrans();
        try {
            if ($type === 'friend') {
                // 移动单个好友到指定分组：更新 s2_wechat_friend.groupIds
                Db::table('s2_wechat_friend')
                    ->where('id', $moveId)
                    ->update(['groupIds' => $targetId]);
            } elseif ($type === 'chatroom') {
                // 移动单个群到指定分组：更新 s2_wechat_chatroom.groupIds
                Db::table('s2_wechat_chatroom')
                    ->where('id', $moveId)
                    ->update(['groupIds' => $targetId]);
            } else {
                Db::rollback();
                return ResponseHelper::error('无效的类型参数');
            }

            Db::commit();
            return ResponseHelper::success('', '移动成功');
        } catch (\Exception $e) {
            Db::rollback();
            return ResponseHelper::error('移动失败：' . $e->getMessage());
        }
    }
}