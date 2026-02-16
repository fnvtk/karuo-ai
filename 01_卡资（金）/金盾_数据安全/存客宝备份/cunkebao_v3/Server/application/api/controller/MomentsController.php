<?php

namespace app\api\controller;

use think\facade\Request;

class MomentsController extends BaseController
{
    /************************ 朋友圈发布相关接口 ************************/
    
    /**
     * 发布朋友圈
     * @return \think\response\Json
     */
    public function addJob($data = [])
    {
        // 获取授权token
        $authorization = $this->authorization;
        if (empty($authorization)) {
            return json_encode(['msg' => '缺少授权信息','code' => 400]);
        }

        try {
            // 获取请求参数
            $text = $data['text'] ?? ''; // 朋友圈文本内容
            $picUrlList = $data['picUrlList'] ?? []; // 图片URL列表
            $videoUrl = $data['videoUrl'] ?? ''; // 视频URL
            $immediately = $data['immediately'] ?? true; // 是否立即发布
            $timingTime = $data['timingTime'] ?? ''; // 定时发布时间
            $beginTime = $data['beginTime'] ?? ''; // 开始时间
            $endTime = $data['endTime'] ?? ''; // 结束时间
            $isUseLocation = $data['isUseLocation'] ?? false; // 是否使用位置信息
            $poiName = $data['poiName'] ?? ''; // 位置名称
            $poiAddress = $data['poiAddress'] ?? ''; // 位置地址
            $lat = $data['lat'] ?? 0; // 纬度
            $lng = $data['lng'] ?? 0; // 经度
            $momentContentType = $data['momentContentType'] ?? 1; // 朋友圈内容类型
            $publicMode = $data['publicMode'] ?? 0; // 发布模式
            $altList = $data['altList'] ?? ''; // 替代列表
            $link = $data['link'] ?? []; // 链接信息
            $jobPublishWechatMomentsItems = $data['jobPublishWechatMomentsItems'] ?? []; // 发布账号和评论信息

            // 必填参数验证
            if (empty($jobPublishWechatMomentsItems) || !is_array($jobPublishWechatMomentsItems)) {
                return json_encode(['msg' => '至少需要选择一个发布账号','code' => 400]);
            }
            
            // 根据朋友圈类型验证必填字段
            if ($momentContentType == 1 && empty($text)) { // 纯文本
                 return json_encode(['msg' => '朋友圈内容不能为空','code' => 400]);
            } else if ($momentContentType == 2 && (empty($picUrlList) || empty($text))) { // 图片+文字
                 return json_encode(['msg' => '朋友圈内容和图片不能为空','code' => 400]);
            } else if ($momentContentType == 3 && (empty($videoUrl) || empty($text))) { // 视频+文字
                 return json_encode(['msg' => '朋友圈内容和视频不能为空','code' => 400]);
            } else if ($momentContentType == 4 && (empty($link) || empty($text))) { // 链接+文字
                 return json_encode(['msg' => '朋友圈内容和链接不能为空','code' => 400]);
            }

            // 构建请求参数
            $params = [
                'text' => $text,
                'picUrlList' => $picUrlList,
                'videoUrl' => $videoUrl,
                'immediately' => $immediately,
                'timingTime' => $timingTime,
                'beginTime' => $beginTime,
                'endTime' => $endTime,
                'isUseLocation' => $isUseLocation,
                'poiName' => $poiName,
                'poiAddress' => $poiAddress,
                'lat' => $lat,
                'lng' => $lng,
                'momentContentType' => (int)$momentContentType,
                'publicMode' => (int)$publicMode,
                'altList' => $altList,
                'link' => $link,
                'jobPublishWechatMomentsItems' => $jobPublishWechatMomentsItems
            ];
            // 设置请求头
            $headerData = ['client:system'];
            $header = setHeader($headerData, $authorization, 'json');

            // 发送请求发布朋友圈
            $result = requestCurl($this->baseUrl . 'api/JobPublishWechatMoments/addJob', $params, 'POST', $header, 'json');
            // 处理响应
            if (empty($result)) {
                return json_encode(['msg' =>  '朋友圈任务创建成功','code' => 200]);
            } else {
                // 如果返回的是错误信息
                 return json_encode(['msg' => $result,'code' => 400]);
            }
        } catch (\Exception $e) {
             return json_encode(['msg' => '发布朋友圈失败','code' => 400]);
        }
    }

    /************************ 朋友圈任务管理相关接口 ************************/

    /**
     * 获取朋友圈任务列表
     * @return \think\response\Json
     */
    public function getList()
    {
        // 获取授权token
        $authorization = trim($this->request->header('authorization', $this->authorization));
        if (empty($authorization)) {
            return errorJson('缺少授权信息');
        }

        try {
            // 获取请求参数
            $keyword = $this->request->param('keyword', ''); // 关键词搜索
            $jobStatus = $this->request->param('jobStatus', ''); // 任务状态筛选
            $contentType = $this->request->param('contentType', ''); // 内容类型筛选
            $only = $this->request->param('only', 'false'); // 是否只查看自己的
            $pageIndex = $this->request->param('pageIndex', 0); // 当前页码
            $pageSize = $this->request->param('pageSize', 10); // 每页数量
            $from = $this->request->param('from', ''); // 开始日期
            $to = $this->request->param('to', ''); // 结束日期

            // 构建请求参数
            $params = [
                'keyword' => $keyword,
                'jobStatus' => $jobStatus,
                'contentType' => $contentType,
                'only' => $only,
                'pageIndex' => (int)$pageIndex,
                'pageSize' => (int)$pageSize
            ];
            
            // 添加日期筛选条件（如果有）
            if (!empty($from)) {
                $params['from'] = $from;
            }
            if (!empty($to)) {
                $params['to'] = $to;
            }

            // 设置请求头
            $headerData = ['client:system'];
            $header = setHeader($headerData, $authorization, 'json');

            // 发送请求获取朋友圈任务列表
            $result = requestCurl($this->baseUrl . 'api/JobPublishWechatMoments/listPagination', $params, 'GET', $header, 'json');
            $response = handleApiResponse($result);
            
            return successJson($response);
        } catch (\Exception $e) {
            return errorJson('获取朋友圈任务列表失败：' . $e->getMessage());
        }
    }
} 