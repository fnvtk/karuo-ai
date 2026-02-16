<?php

namespace app\api\controller;

/**
 * 统计控制器
 * Class StatsController
 * @package app\frontend\controller
 */
class StatsController extends BaseController
{
    /**
     * API客户端类型
     */
    const CLIENT_TYPE = 'system';

    /**
     * 账号基本信息
     * @return \think\response\Json
     */
    public function basicData()
    {
        $authorization = trim($this->request->header('authorization', $this->authorization));
        if (empty($authorization)) {
            return errorJson('缺少授权信息');
        }

        $headerData = ['client:' . self::CLIENT_TYPE];
        $header = setHeader($headerData, $authorization, 'plain');

        try {
            $result = requestCurl($this->baseUrl . '/api/DashBoard/ListHomePageStatistics', ['refresh' => 10000], 'GET', $header);
            return successJson($result);
        } catch (\Exception $e) {
            return errorJson('获取基础数据失败：' . $e->getMessage());
        }
    }

    /**
     * 好友统计
     * @return \think\response\Json
     */
    public function FansStatistics(){
        /*  参数说明
           lidu 数据搜索类型 0 小时 1 天 2月
           from to 时间 当lidu为 0时（2025-03-12 09:54:42） 当lidu为 1时（2025-03-12）  当lidu为 2时（2025-03）
         */

        $authorization = trim($this->request->header('authorization', $this->authorization));
        $lidu = trim($this->request->param('lidu', ''));
        $from = trim($this->request->param('from', ''));
        $to = trim($this->request->param('to', ''));

        if (empty($authorization)) {
            return errorJson('缺少授权信息');
        }

        $params = [
            'lidu' => $lidu,
            'from' => $from,
            'to' => $to,
        ];

        $headerData = ['client:' . self::CLIENT_TYPE];
        $header = setHeader($headerData, $authorization, 'plain');

        try {
            $result = requestCurl($this->baseUrl . 'api/DashBoard/listStatisticsCountDTOByCreateTimeAsync', $params, 'GET', $header);
            return successJson($result);
        } catch (\Exception $e) {
            return errorJson('获取粉丝统计数据失败：' . $e->getMessage());
        }
    }

}