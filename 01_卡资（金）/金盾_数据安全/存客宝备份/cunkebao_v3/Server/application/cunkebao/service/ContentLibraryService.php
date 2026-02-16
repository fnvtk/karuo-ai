<?php

namespace app\cunkebao\service;

use app\cunkebao\model\ContentLibrary;
use think\Db;

class ContentLibraryService
{
    // ==================== 基础CRUD操作 ====================
    
    /**
     * 创建内容库
     * @param array $data 内容库数据
     * @param int $userId 用户ID
     * @return array
     */
    public function createLibrary($data, $userId)
    {
        // 检查内容库名称是否已存在
        $exists = ContentLibrary::where([
            'name' => $data['name'],
            'userId' => $userId,
            'isDel' => 0
        ])->find();
        
        if ($exists) {
            return ['code' => 400, 'msg' => '内容库名称已存在'];
        }

        Db::startTrans();
        try {
            $library = new ContentLibrary;
            $result = $library->save($this->prepareLibraryData($data, $userId));

            if (!$result) {
                Db::rollback();
                return ['code' => 500, 'msg' => '创建内容库失败'];
            }

            Db::commit();
            return ['code' => 200, 'msg' => '创建成功', 'data' => ['id' => $library->id]];
        } catch (\Exception $e) {
            Db::rollback();
            return ['code' => 500, 'msg' => '创建失败：' . $e->getMessage()];
        }
    }

    /**
     * 准备内容库数据
     * @param array $data 原始数据
     * @param int $userId 用户ID
     * @return array
     */
    private function prepareLibraryData($data, $userId)
    {
        return [
            'name' => $data['name'],
            'sourceFriends' => $data['sourceType'] == 1 ? json_encode($data['friends']) : json_encode([]),
            'sourceGroups' => $data['sourceType'] == 2 ? json_encode($data['groups']) : json_encode([]),
            'groupMembers' => $data['sourceType'] == 2 ? json_encode($data['groupMembers']) : json_encode([]),
            'keywordInclude' => isset($data['keywordInclude']) ? json_encode($data['keywordInclude'], 256) : json_encode([]),
            'keywordExclude' => isset($data['keywordExclude']) ? json_encode($data['keywordExclude'], 256) : json_encode([]),
            'aiEnabled' => $data['aiEnabled'] ?? 0,
            'aiPrompt' => $data['aiPrompt'] ?? '',
            'timeEnabled' => $data['timeEnabled'] ?? 0,
            'timeStart' => isset($data['startTime']) ? strtotime($data['startTime']) : 0,
            'timeEnd' => isset($data['endTime']) ? strtotime($data['endTime']) : 0,
            'sourceType' => $data['sourceType'] ?? 1,
            'status' => $data['status'] ?? 0,
            'userId' => $userId,
            'createTime' => time(),
            'updateTime' => time()
        ];
    }

    // ==================== 查询相关 ====================
    
    /**
     * 获取内容库列表
     * @param array $params 查询参数
     * @param int $userId 用户ID
     * @return array
     */
    public function getLibraryList($params, $userId)
    {
        $where = [
            ['userId', '=', $userId],
            ['isDel', '=', 0]
        ];
        
        if (!empty($params['keyword'])) {
            $where[] = ['name', 'like', '%' . $params['keyword'] . '%'];
        }
        
        if (!empty($params['sourceType'])) {
            $where[] = ['sourceType', '=', $params['sourceType']];
        }

        $list = ContentLibrary::where($where)
            ->field('id,name,sourceFriends,sourceGroups,keywordInclude,keywordExclude,aiEnabled,aiPrompt,timeEnabled,timeStart,timeEnd,status,sourceType,userId,createTime,updateTime')
            ->with(['user' => function($query) {
                $query->field('id,username');
            }])
            ->order('id', 'desc')
            ->page($params['page'], $params['limit'])
            ->select();

        $this->processLibraryList($list);

        $total = ContentLibrary::where($where)->count();

        return [
            'code' => 200,
            'msg' => '获取成功',
            'data' => [
                'list' => $list,
                'total' => $total,
                'page' => $params['page']
            ]
        ];
    }

    /**
     * 处理内容库列表数据
     * @param array $list 内容库列表
     */
    private function processLibraryList(&$list)
    {
        foreach ($list as &$item) {
            $item['sourceFriends'] = json_decode($item['sourceFriends'] ?: '[]', true);
            $item['sourceGroups'] = json_decode($item['sourceGroups'] ?: '[]', true);
            $item['keywordInclude'] = json_decode($item['keywordInclude'] ?: '[]', true);
            $item['keywordExclude'] = json_decode($item['keywordExclude'] ?: '[]', true);
            $item['creatorName'] = $item['user']['username'] ?? '';

            if (!empty($item['sourceFriends']) && $item['sourceType'] == 1) {
                $item['selectedFriends'] = $this->getFriendsInfo($item['sourceFriends']);
            }

            if (!empty($item['sourceGroups']) && $item['sourceType'] == 2) {
                $item['selectedGroups'] = $this->getGroupsInfo($item['sourceGroups']);
            }

            unset($item['user']);
        }
    }

    // ==================== 数据关联查询 ====================
    
    /**
     * 获取好友信息
     * @param array $friendIds 好友ID列表
     * @return array
     */
    private function getFriendsInfo($friendIds)
    {
        if (empty($friendIds)) {
            return [];
        }

        return Db::name('wechat_friend')->alias('wf')
            ->field('wf.id,wf.wechatId, wa.nickname, wa.avatar')
            ->join('wechat_account wa', 'wf.wechatId = wa.wechatId')
            ->whereIn('wf.id', $friendIds)
            ->select();
    }

    /**
     * 获取群组信息
     * @param array $groupIds 群组ID列表
     * @return array
     */
    private function getGroupsInfo($groupIds)
    {
        if (empty($groupIds)) {
            return [];
        }

        return Db::name('wechat_group')->alias('g')
            ->field('g.id, g.chatroomId, g.name, g.avatar, g.ownerWechatId')
            ->whereIn('g.id', $groupIds)
            ->select();
    }
} 