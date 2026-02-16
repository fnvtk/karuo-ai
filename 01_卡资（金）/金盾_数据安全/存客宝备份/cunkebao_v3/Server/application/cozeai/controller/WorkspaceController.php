<?php

namespace app\cozeai\controller;

/**
 * Coze AI 工作区控制器
 */
class WorkspaceController extends BaseController
{
    /**
     * 获取工作区列表
     */
    public function list()
    {
        try {
            $page = input('page',1);
            $limit = input('limit',20);

            $params = [
                'page_num' => $page,
                'page_size' => $limit
            ];

            $result =requestCurl($this->apiUrl . '/v1/workspaces', $params, 'GET', $this->headers);
            $result = json_decode($result, true);
            if ($result['code'] != 0) {
                return errorJson($result['msg'],$result['code']);
            }

            return successJson($result['data'], '获取成功');
        } catch (\Exception $e) {
            return errorJson('获取工作区列表失败：' . $e->getMessage());
        }
    }



    /**
     * 获取智能体列表
     */ 
    public function getBotsList()
    {
        try {
            $space_id = input('space_id','');
            if(empty($space_id)){
                return errorJson('Space ID不能为空');
            }
            $page = input('page',1);
            $limit = input('limit',20);

            $params = [
                'space_id' => $space_id,
                'page_index' => $page,
                'page_size' => $limit
            ];

            $result = requestCurl($this->apiUrl . '/v1/space/published_bots_list', $params, 'GET', $this->headers);
            $result = json_decode($result, true);
            if ($result['code'] != 0) {
                return errorJson($result['msg'],$result['code']);
            }
            return successJson($result['data'], '获取成功');
        } catch (\Exception $e) {
            return errorJson('获取智能体列表失败：'.$e->getMessage());
        }
    }
} 