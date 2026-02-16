<?php

namespace app\cunkebao\service;

use app\cunkebao\model\ContentItem;
use think\Db;

class ContentItemService
{
    // ==================== 基础CRUD操作 ====================
    
    /**
     * 创建内容项目
     * @param array $data 内容项目数据
     * @param int $libraryId 内容库ID
     * @return array
     */
    public function createItem($data, $libraryId)
    {
        Db::startTrans();
        try {
            $item = new ContentItem;
            $result = $item->save($this->prepareItemData($data, $libraryId));

            if (!$result) {
                Db::rollback();
                return ['code' => 500, 'msg' => '创建内容项目失败'];
            }

            Db::commit();
            return ['code' => 200, 'msg' => '创建成功', 'data' => ['id' => $item->id]];
        } catch (\Exception $e) {
            Db::rollback();
            return ['code' => 500, 'msg' => '创建失败：' . $e->getMessage()];
        }
    }

    /**
     * 准备内容项目数据
     * @param array $data 原始数据
     * @param int $libraryId 内容库ID
     * @return array
     */
    private function prepareItemData($data, $libraryId)
    {
        return [
            'libraryId' => $libraryId,
            'title' => $data['title'] ?? '',
            'content' => $data['content'] ?? '',
            'images' => isset($data['images']) ? json_encode($data['images']) : json_encode([]),
            'videos' => isset($data['videos']) ? json_encode($data['videos']) : json_encode([]),
            'status' => $data['status'] ?? 0,
            'createTime' => time(),
            'updateTime' => time()
        ];
    }

    /**
     * 删除内容项目
     * @param int $itemId 内容项目ID
     * @return array
     */
    public function deleteItem($itemId)
    {
        try {
            $result = ContentItem::where('id', $itemId)
                ->update(['isDel' => 1, 'delTime' => time()]);

            if ($result === false) {
                return ['code' => 500, 'msg' => '删除失败'];
            }

            return ['code' => 200, 'msg' => '删除成功'];
        } catch (\Exception $e) {
            return ['code' => 500, 'msg' => '删除失败：' . $e->getMessage()];
        }
    }

    // ==================== 查询相关 ====================
    
    /**
     * 获取内容项目列表
     * @param array $params 查询参数
     * @param int $libraryId 内容库ID
     * @return array
     */
    public function getItemList($params, $libraryId)
    {
        $where = [
            ['libraryId', '=', $libraryId],
            ['isDel', '=', 0]
        ];
        
        if (!empty($params['keyword'])) {
            $where[] = ['title', 'like', '%' . $params['keyword'] . '%'];
        }
        
        if (isset($params['status'])) {
            $where[] = ['status', '=', $params['status']];
        }

        $list = ContentItem::where($where)
            ->field('id,title,content,images,videos,status,createTime,updateTime')
            ->order('id', 'desc')
            ->page($params['page'], $params['limit'])
            ->select();

        $this->processItemList($list);

        $total = ContentItem::where($where)->count();

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
     * 处理内容项目列表数据
     * @param array $list 内容项目列表
     */
    private function processItemList(&$list)
    {
        foreach ($list as &$item) {
            $item['images'] = json_decode($item['images'] ?: '[]', true);
            $item['videos'] = json_decode($item['videos'] ?: '[]', true);
        }
    }

    // ==================== 状态管理 ====================
    
    /**
     * 更新内容项目状态
     * @param int $itemId 内容项目ID
     * @param int $status 状态
     * @return array
     */
    public function updateItemStatus($itemId, $status)
    {
        try {
            $result = ContentItem::where('id', $itemId)
                ->update(['status' => $status, 'updateTime' => time()]);

            if ($result === false) {
                return ['code' => 500, 'msg' => '更新状态失败'];
            }

            return ['code' => 200, 'msg' => '更新成功'];
        } catch (\Exception $e) {
            return ['code' => 500, 'msg' => '更新失败：' . $e->getMessage()];
        }
    }
} 