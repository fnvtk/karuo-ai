<?php

namespace app\api\controller;

use app\api\model\CompanyAccountModel;
use app\api\model\CompanyModel;
use app\api\model\CallRecordingModel;
use Library\S2\Logics\AccountLogic;
use think\Db;
use think\facade\Request;

/**
 * 通话记录控制器
 * 包含通话记录管理的相关功能
 */
class CallRecordingController extends BaseController
{
    /**
     * 获取通话记录列表
     * @param array $data 请求参数
     * @param bool $isInner 是否为定时任务调用
     * @return \think\response\Json
     */
    public function getlist($data = [], $isInner = false)
    {
        // 获取请求参数
        $keyword = !empty($data['keyword']) ? $data['keyword'] : '';
        $isCallOut = !empty($data['isCallOut']) ? $data['isCallOut'] : '';
        $secondMin = !empty($data['secondMin']) ? $data['secondMin'] : 0;
        $secondMax = !empty($data['secondMax']) ? $data['secondMax'] : 99999;
        $departmentIds = !empty($data['departmentIds']) ? $data['departmentIds'] : '';
        $pageIndex = !empty($data['pageIndex']) ? $data['pageIndex'] : 0;
        $pageSize = !empty($data['pageSize']) ? $data['pageSize'] : 100;
        $from = !empty($data['from']) ? $data['from'] : '2016-01-01 00:00:00';
        $to = !empty($data['to']) ? $data['to'] : '2025-08-31 00:00:00';
        $departmentId = !empty($data['departmentId']) ? $data['departmentId'] : '';

        // 获取授权token
        $authorization = trim($this->request->header('authorization', $this->authorization));
        if (empty($authorization)) {
            if ($isInner) {
                return json_encode(['code' => 500, 'msg' => '缺少授权信息']);
            } else {
                return errorJson('缺少授权信息');
            }
        }

        try {
            // 构建请求参数
            $params = [
                'keyword' => $keyword,
                'isCallOut' => $isCallOut,
                'secondMin' => $secondMin,
                'secondMax' => $secondMax,
                'departmentIds' => $departmentIds,
                'pageIndex' => $pageIndex,
                'pageSize' => $pageSize,
                'from' => $from,
                'to' => $to,
                'departmentId' => $departmentId
            ];

            // 设置请求头
            $headerData = ['client:system'];
            $header = setHeader($headerData, $authorization, 'plain');

            // 发送请求获取通话记录列表
            $result = requestCurl($this->baseUrl . 'api/CallRecording/list', $params, 'GET', $header);
            $response = handleApiResponse($result);

            // 保存数据到数据库
            if (!empty($response['results'])) {
                foreach ($response['results'] as $item) {
                    $this->saveCallRecording($item);
                }
            }

            if ($isInner) {
                return json_encode(['code' => 200, 'msg' => '获取通话记录列表成功', 'data' => $response]);
            } else {
                return successJson($response, '获取通话记录列表成功');
            }
        } catch (\Exception $e) {
            if ($isInner) {
                return json_encode(['code' => 500, 'msg' => '获取通话记录列表失败：' . $e->getMessage()]);
            } else {
                return errorJson('获取通话记录列表失败：' . $e->getMessage());
            }
        }
    }

    /**
     * 保存通话记录数据到数据库
     * @param array $item 通话记录数据
     */
    private function saveCallRecording($item)
    {
        // 将时间戳转换为秒级时间戳（API返回的是毫秒级）
        $beginTime = isset($item['beginTime']) ? intval($item['beginTime'] / 1000) : 0;
        $endTime = isset($item['endTime']) ? intval($item['endTime'] / 1000) : 0;
        $callBeginTime = isset($item['callBeginTime']) ? intval($item['callBeginTime'] / 1000) : 0;
        
        // 将日期时间字符串转换为时间戳
        $createTime = isset($item['createTime']) ? strtotime($item['createTime']) : 0;
        $lastUpdateTime = isset($item['lastUpdateTime']) ? strtotime($item['lastUpdateTime']) : 0;

        $data = [
            'id' => isset($item['id']) ? $item['id'] : 0,
            'tenantId' => isset($item['tenantId']) ? $item['tenantId'] : 0,
            'deviceOwnerId' => isset($item['deviceOwnerId']) ? $item['deviceOwnerId'] : 0,
            'userName' => isset($item['userName']) ? $item['userName'] : '',
            'nickname' => isset($item['nickname']) ? $item['nickname'] : '',
            'realName' => isset($item['realName']) ? $item['realName'] : '',
            'deviceMemo' => isset($item['deviceMemo']) ? $item['deviceMemo'] : '',
            'fileName' => isset($item['fileName']) ? $item['fileName'] : '',
            'imei' => isset($item['imei']) ? $item['imei'] : '',
            'phone' => isset($item['phone']) ? $item['phone'] : '',
            'isCallOut' => isset($item['isCallOut']) ? $item['isCallOut'] : false,
            'beginTime' => $beginTime,
            'endTime' => $endTime,
            'audioUrl' => isset($item['audioUrl']) ? $item['audioUrl'] : '',
            'mp3AudioUrl' => isset($item['mp3AudioUrl']) ? $item['mp3AudioUrl'] : '',
            'callBeginTime' => $callBeginTime,
            'callLogId' => isset($item['callLogId']) ? $item['callLogId'] : 0,
            'callType' => isset($item['callType']) ? $item['callType'] : 0,
            'duration' => isset($item['duration']) ? $item['duration'] : 0,
            'skipReason' => isset($item['skipReason']) ? $item['skipReason'] : '',
            'skipUpload' => isset($item['skipUpload']) ? $item['skipUpload'] : false,
            'isDeleted' => isset($item['isDeleted']) ? $item['isDeleted'] : false,
            'createTime' => $createTime,
            'lastUpdateTime' => $lastUpdateTime
        ];

        // 使用id作为唯一性判断
        $callRecording = CallRecordingModel::where('id', $item['id'])->find();
        if ($callRecording) {
            $callRecording->save($data);
        } else {
            CallRecordingModel::create($data);
        }
    }
} 