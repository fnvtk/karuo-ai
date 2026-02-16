<?php

namespace app\chukebao\controller;

use app\chukebao\model\Reply;
use app\chukebao\model\ReplyGroup;
use library\ResponseHelper;

class ReplyController extends BaseController
{
    /**
     * 列表
     * @return \think\response\Json
     * @throws \Exception
     */
    public function getList()
    {
        $replyType = $this->request->param('replyType', 0);
        $keyword = $this->request->param('keyword', '');
        $userId = $this->getUserInfo('id');
        $companyId = $this->getUserInfo('companyId');

        try {
            // 构建分组查询条件
            $groupWhere = [
               ['isDel','=',0]
            ];
            switch ($replyType) {
                case 0:
                    //公共快捷语
                    $groupWhere[] = ['replyType', '=', 0];
                    break;
                case 1:
                    //私有快捷语
                    $groupWhere[] = ['companyId', '=', $companyId];
                    $groupWhere[] = ['userId', '=', $userId];
                    $groupWhere[] = ['replyType', '=', 1];
                    break;
                case 2:
                    //公司快捷语
                    $groupWhere[] = ['companyId', '=', $companyId];
                    $groupWhere[] = ['replyType', '=', 2];
                    break;
                default:
                    $groupWhere[] = ['replyType', '=', 0];
                    break;
            }


            if (!empty($keyword)) {
                $groupWhere[] = ['groupName','like', '%' . $keyword . '%'];
            }

            // 获取所有分组
            $allGroups = ReplyGroup::where($groupWhere)
                ->order('sortIndex asc,id DESC')
                ->select();
            // 构建树形结构
            $result = $this->buildGroupTree($allGroups, $keyword);

            return ResponseHelper::success($result, '获取成功');

        } catch (\Exception $e) {
            return ResponseHelper::error('获取失败：' . $e->getMessage());
        }
    }

    /**
     * 新增快捷语分组
     * @return \think\response\Json
     */
    public function addGroup()
    {
        $groupName = $this->request->param('groupName', '');
        $parentId = (int)$this->request->param('parentId', 0);
        $replyType = (int)$this->request->param('replyType', 0); // 0公共 1私有 2公司
        $sortIndex = (string)$this->request->param('sortIndex', 50);

        $userId = $this->getUserInfo('id');
        $companyId = $this->getUserInfo('companyId');
        $accountId = $this->getUserInfo('s2_accountId');

        if ($groupName === '') {
            return ResponseHelper::error('分组名称不能为空');
        }

        try {
            $data = [
                'groupName' => $groupName,
                'parentId' => $parentId,
                'replyType' => $replyType,
                'sortIndex' => $sortIndex,
                // 兼容现有程序中使用到的字段
                'companyId' => $companyId,
                'userId' => $userId,
            ];

            /** @var ReplyGroup $group */
            $group = new ReplyGroup();
            $group->save($data);

            return ResponseHelper::success($group->toArray(), '创建成功');
        } catch (\Exception $e) {
            return ResponseHelper::error('创建失败：' . $e->getMessage());
        }
    }

    /**
     * 新增快捷语
     * @return \think\response\Json
     */
    public function addReply()
    {
        $groupId = (int)$this->request->param('groupId', 0);
        $title = $this->request->param('title', '');
        $msgType = (int)$this->request->param('msgType', 1); // 1文本 3图片 43视频 49链接 等
        $content = $this->request->param('content', '');
        $sortIndex = (string)$this->request->param('sortIndex', 50);

        $accountId = $this->getUserInfo('s2_accountId');
        $companyId = $this->getUserInfo('companyId');
        $userId = $this->getUserInfo('id');

        if ($groupId <= 0) {
            return ResponseHelper::error('分组ID不合法');
        }
        if ($title === '') {
            return ResponseHelper::error('标题不能为空');
        }
        if ($content === '') {
            return ResponseHelper::error('内容不能为空');
        }

        // 根据 msgType 处理 content：3=图片，43=视频，49=链接 需要 JSON 编码
        if (in_array($msgType, [3, 43, 49])) {
            // 如果 content 已经是数组，直接编码；如果是字符串，先尝试解码再编码（确保格式正确）
            if (is_array($content)) {
                $content = json_encode($content, JSON_UNESCAPED_UNICODE);
            } elseif (is_string($content)) {
                // 尝试解析，如果已经是 JSON 字符串，确保格式正确
                $decoded = json_decode($content, true);
                if ($decoded !== null) {
                    // 是有效的 JSON，重新编码确保格式统一
                    $content = json_encode($decoded, JSON_UNESCAPED_UNICODE);
                } else {
                    // 不是 JSON，直接编码
                    $content = json_encode($content, JSON_UNESCAPED_UNICODE);
                }
            }
        }

        try {
            $now = time();
            $data = [
                'tenantId' => $companyId,
                'groupId' => $groupId,
                'accountId' => $accountId,
                'title' => $title,
                'msgType' => $msgType,
                'content' => $content,
                'sortIndex' => $sortIndex,
                'createTime' => $now,
                'lastUpdateTime' => $now,
                'userId' => $userId,
            ];
            /** @var Reply $reply */
            $reply = new Reply();
            $reply->save($data);

            // 返回时解析 content（与 buildGroupData 保持一致）
            $replyData = $reply->toArray();
            if (in_array($msgType, [3, 43, 49]) && !empty($replyData['content'])) {
                $decoded = json_decode($replyData['content'], true);
                if ($decoded !== null) {
                    $replyData['content'] = $decoded;
                }
            }

            return ResponseHelper::success($replyData, '创建成功');
        } catch (\Exception $e) {
            return ResponseHelper::error('创建失败：' . $e->getMessage());
        }
    }

    /**
     * 编辑快捷语分组
     * @return \think\response\Json
     */
    public function updateGroup()
    {
        $id = (int)$this->request->param('id', 0);
        if ($id <= 0) {
            return ResponseHelper::error('分组ID不合法');
        }

        $data = [];
        $groupName = $this->request->param('groupName', null);
        $parentId = $this->request->param('parentId', null);
        $replyType = $this->request->param('replyType', null);
        $sortIndex = $this->request->param('sortIndex', null);

        if ($groupName !== null) $data['groupName'] = $groupName;
        if ($parentId !== null) $data['parentId'] = (int)$parentId;
        if ($replyType !== null) $data['replyType'] = (int)$replyType;
        if ($sortIndex !== null) $data['sortIndex'] = (string)$sortIndex;

        if (empty($data)) {
            return ResponseHelper::error('无可更新字段');
        }

        try {
            $group = ReplyGroup::where(['id' => $id,'isDel' => 0])->find();
            if (empty($group)) {
                return ResponseHelper::error('分组不存在');
            }
            $group->save($data);
            return ResponseHelper::success($group->toArray(), '更新成功');
        } catch (\Exception $e) {
            return ResponseHelper::error('更新失败：' . $e->getMessage());
        }
    }

    /**
     * 假删除快捷语分组
     * @return \think\response\Json
     */
    public function deleteGroup()
    {
        $id = (int)$this->request->param('id', 0);
        if ($id <= 0) {
            return ResponseHelper::error('分组ID不合法');
        }
        try {
            $group = ReplyGroup::where(['id' => $id,'isDel' => 0])->find();
            if (empty($group)) {
                return ResponseHelper::error('分组不存在');
            }
            $group->save(['isDel' => 1,'delTime' => time()]);
            return ResponseHelper::success([], '删除成功');
        } catch (\Exception $e) {
            return ResponseHelper::error('删除失败：' . $e->getMessage());
        }
    }

    /**
     * 编辑快捷语
     * @return \think\response\Json
     */
    public function updateReply()
    {
        $id = (int)$this->request->param('id', 0);
        if ($id <= 0) {
            return ResponseHelper::error('快捷语ID不合法');
        }

        $data = [];
        $groupId = $this->request->param('groupId', null);
        $title = $this->request->param('title', null);
        $msgType = $this->request->param('msgType', null);
        $content = $this->request->param('content', null);
        $sortIndex = $this->request->param('sortIndex', null);

        if ($groupId !== null) $data['groupId'] = (int)$groupId;
        if ($title !== null) {
            if ($title === '') {
                return ResponseHelper::error('标题不能为空');
            }
            $data['title'] = $title;
        }
        if ($msgType !== null) $data['msgType'] = (int)$msgType;
        if ($content !== null) {
            // 确定 msgType：如果传了新的 msgType，用新的；否则用原有的
            $currentMsgType = $msgType !== null ? (int)$msgType : null;
            if ($currentMsgType === null) {
                // 需要查询原有的 msgType
                $reply = Reply::where(['id' => $id, 'isDel' => 0])->find();
                if (empty($reply)) {
                    return ResponseHelper::error('快捷语不存在');
                }
                $currentMsgType = $reply->msgType;
            }
            
            // 根据 msgType 处理 content：3=图片，43=视频，49=链接 需要 JSON 编码
            if (in_array($currentMsgType, [3, 43, 49])) {
                // 如果 content 已经是数组，直接编码；如果是字符串，先尝试解码再编码（确保格式正确）
                if (is_array($content)) {
                    $data['content'] = json_encode($content, JSON_UNESCAPED_UNICODE);
                } elseif (is_string($content)) {
                    // 尝试解析，如果已经是 JSON 字符串，确保格式正确
                    $decoded = json_decode($content, true);
                    if ($decoded !== null) {
                        // 是有效的 JSON，重新编码确保格式统一
                        $data['content'] = json_encode($decoded, JSON_UNESCAPED_UNICODE);
                    } else {
                        // 不是 JSON，直接编码
                        $data['content'] = json_encode($content, JSON_UNESCAPED_UNICODE);
                    }
                }
            } else {
                // 文本类型，直接使用
                $data['content'] = $content;
            }
        }
        if ($sortIndex !== null) $data['sortIndex'] = (string)$sortIndex;
        if (!empty($data)) {
            $data['lastUpdateTime'] = time();
        }

        if (empty($data)) {
            return ResponseHelper::error('无可更新字段');
        }

        try {
            $reply = Reply::where(['id' => $id, 'isDel' => 0])->find();
            if (empty($reply)) {
                return ResponseHelper::error('快捷语不存在');
            }
            $reply->save($data);
            
            // 返回时解析 content（与 buildGroupData 保持一致）
            $replyData = $reply->toArray();
            $finalMsgType = isset($data['msgType']) ? $data['msgType'] : $reply->msgType;
            if (in_array($finalMsgType, [3, 43, 49]) && !empty($replyData['content'])) {
                $decoded = json_decode($replyData['content'], true);
                if ($decoded !== null) {
                    $replyData['content'] = $decoded;
                }
            }
            
            return ResponseHelper::success($replyData, '更新成功');
        } catch (\Exception $e) {
            return ResponseHelper::error('更新失败：' . $e->getMessage());
        }
    }

    /**
     * 假删除快捷语
     * @return \think\response\Json
     */
    public function deleteReply()
    {
        $id = (int)$this->request->param('id', 0);
        if ($id <= 0) {
            return ResponseHelper::error('快捷语ID不合法');
        }
        try {
            $reply = Reply::where(['id' => $id,'isDel' => 0])->find();
            if (empty($reply)) {
                return ResponseHelper::error('快捷语不存在');
            }
            $reply->save(['isDel' => 1, 'delTime' => time()]);
            return ResponseHelper::success([], '删除成功');
        } catch (\Exception $e) {
            return ResponseHelper::error('删除失败：' . $e->getMessage());
        }
    }

    /**
     * 构建分组树形结构
     * @param array $groups 所有分组数据
     * @param string $keyword 搜索关键词
     * @return array
     */
    private function buildGroupTree($groups, $keyword = '')
    {
        $tree = [];
        $groupMap = [];

        // 先构建分组映射
        foreach ($groups as $group) {
            $groupMap[$group->id] = $group->toArray();
        }

        // 构建树形结构
        foreach ($groups as $group) {
            $groupData = $this->buildGroupData($group, $keyword);

            if ($group->parentId == null || $group->parentId == 0) {
                // 顶级分组
                $tree[] = $groupData;
            } else {
                // 子分组，需要找到父分组并添加到其children中
                $this->addToParentGroup($tree, $group->parentId, $groupData);
            }
        }

        return $tree;
    }

    /**
     * 构建单个分组数据
     * @param object $group 分组对象
     * @param string $keyword 搜索关键词
     * @return array
     */
    private function buildGroupData($group, $keyword = '')
    {
        // 构建快捷回复查询条件
        $replyWhere[] =[
            ['groupId' ,'=', $group->id],
            ['isDel','=',0]
        ];
        if (!empty($keyword)) {
            $replyWhere[] = ['title','like', '%' . $keyword . '%'];
        }

        // 获取该分组下的快捷回复
        $replies = Reply::where($replyWhere)
            ->order('sortIndex asc, id desc')
            ->select();

        // 解析 replies 的 content 字段（根据 msgType 判断是否需要 JSON 解析）
        $repliesArray = [];
        foreach ($replies as $reply) {
            $replyData = $reply->toArray();
            // 根据 msgType 解析 content：3=图片，43=视频，49=链接
            if (in_array($replyData['msgType'], [3, 43, 49]) && !empty($replyData['content'])) {
                $decoded = json_decode($replyData['content'], true);
                // 如果解析成功，使用解析后的内容；否则保持原样
                if ($decoded !== null) {
                    $replyData['content'] = $decoded;
                }
            }
            $repliesArray[] = $replyData;
        }

        return [
            'id' => $group->id,
            'groupName' => $group->groupName,
            'sortIndex' => $group->sortIndex,
            'parentId' => $group->parentId,
            'replyType' => $group->replyType,
            'replys' => $group->replys,
            'companyId' => $group->companyId,
            'userId' => $group->userId,
            'replies' => $repliesArray,
            'children' => [] // 子分组
        ];
    }

    /**
     * 将子分组添加到父分组中
     * @param array $tree 树形结构
     * @param int $parentId 父分组ID
     * @param array $childGroup 子分组数据
     */
    private function addToParentGroup(&$tree, $parentId, $childGroup)
    {
        foreach ($tree as &$group) {
            if ($group['id'] == $parentId) {
                $group['children'][] = $childGroup;
                return;
            }

            // 递归查找子分组
            if (!empty($group['children'])) {
                $this->addToParentGroup($group['children'], $parentId, $childGroup);
            }
        }
    }

}