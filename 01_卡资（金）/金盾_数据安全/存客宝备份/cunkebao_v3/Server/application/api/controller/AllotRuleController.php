<?php

namespace app\api\controller;

use app\api\model\CompanyAccountModel;
use app\api\model\AllotRuleModel;
use app\api\model\WechatAccountModel;
use think\Queue;
use app\job\AllotRuleListJob;
use think\Db;

class AllotRuleController extends BaseController
{
    /************************************
     * 分配规则列表和数据同步相关方法
     ************************************/
    
    /**
     * 获取所有分配规则
     * @param bool $isInner 是否为内部调用
     * @return \think\response\Json
     */
    public function getAllRules($data = [], $isInner = false)
    {
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
            // 设置请求头
            $headerData = ['client:system'];
            $header = setHeader($headerData, $authorization, 'plain');

            // 发送请求获取所有分配规则
            $result = requestCurl($this->baseUrl . 'api/AllotRule/all', [], 'GET', $header);
            $response = handleApiResponse($result);
            
            // 保存数据到数据库
            if (!empty($response)) {
                AllotRuleModel::where('1=1')->update(['isDel' => 1]);
                foreach ($response as $item) {
                    $this->saveAllotRule($item);
                }
            }
            
            if ($isInner) {
                return json_encode(['code' => 200, 'msg' => 'success', 'data' => $response]);
            } else {
                return successJson($response);
            }
        } catch (\Exception $e) {
            if ($isInner) {
                return json_encode(['code' => 500, 'msg' => '获取分配规则失败：' . $e->getMessage()]);
            } else {
                return errorJson('获取分配规则失败：' . $e->getMessage());
            }
        }
    }
    
    /**
     * 手动触发分配规则同步任务
     * @return \think\response\Json
     */
    public function startJob()
    {
        try {
            $data = [
                'time' => time()
            ];
            
            // 添加到队列，设置任务名为 allotrule_list
            $isSuccess = Queue::push(AllotRuleListJob::class, $data, 'allotrule_list');
            
            if ($isSuccess !== false) {
                return successJson([], '分配规则同步任务已添加到队列');
            } else {
                return errorJson('添加分配规则同步任务到队列失败');
            }
        } catch (\Exception $e) {
            return errorJson('触发分配规则同步任务失败：' . $e->getMessage());
        }
    }
    
    /************************************
     * 分配规则CRUD操作方法
     ************************************/
    
    /**
     * 创建分配规则
     * @param array $data 请求数据
     * @param bool $isInner 是否为内部调用
     * @return \think\response\Json
     */
    public function createRule($data = [], $isInner = false)
    {
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
            $wechatData = input('wechatData', '[]') ?: [];
            $priorityStrategy = input('priorityStrategy', '[]') ?: [];

            // 构建请求数据
            $params = [
                'allotType' => input('allotType', 1),
                'kefuRange' => input('kefuRange', 5),
                'wechatRange' => input('wechatRange',3),
                'kefuData' => input('kefuData', '[]') ?: [],
                'wechatData' => $wechatData,
                'labels' => input('labels', '[]') ?: [],
                'priorityStrategy' => json_encode($priorityStrategy,256)
            ];

            // 设置请求头
            $headerData = ['client:system'];
            $header = setHeader($headerData, $authorization, 'json');

            // 发送请求到微信接口
            $result = requestCurl($this->baseUrl . 'api/AllotRule/new', $params, 'POST', $header, 'json');
            if (empty($result)) {
                // 异步更新所有规则列表
                AllotRuleModel::where('1=1')->update(['isDel' => 1]);
                $this->getAllRules();
                $res = AllotRuleModel::where('isDel',0)->order('id','DESC')->find();
                $res->departmentId = !empty($data['departmentId']) ? $data['departmentId'] : 0;
                $res->save();
                return successJson($res, '创建分配规则成功');
            } else {
                return errorJson($result);
            }
        } catch (\Exception $e) {
            return errorJson('创建分配规则失败：' . $e->getMessage());
        }
    }
    
    /**
     * 更新分配规则
     * @param array $data 请求数据
     * @param bool $isInner 是否为内部调用
     * @return \think\response\Json
     */
    public function updateRule($data = [], $isInner = false)
    {
        // 获取授权token
        $authorization = trim($this->request->header('authorization', $this->authorization));
        if (empty($authorization)) {
            return errorJson('缺少授权信息');
        }

        try {
            // 获取请求参数
            $id = !empty($data['id']) ? $data['id'] : input('id',0);
            if (empty($id)) {
                return errorJson('规则ID不能为空');
            }

            $rule = AllotRuleModel::where('id', $id)->find();
            if (empty($rule)) {
                return errorJson('规则不存在');
            }

            // 构建请求数据
            $params = [
                'id' => $id,
                'tenantId' => $rule['tenantId'],
                'allotType' => !empty($data['allotType']) ? $data['allotType'] : input('allotType',1),
                'allotOnline' => !empty($data['allotOnline']) ? $data['allotOnline'] : input('allotOnline',false),
                'kefuRange' => !empty($data['kefuRange']) ? $data['kefuRange'] : input('kefuRange',5),
                'wechatRange' => !empty($data['wechatRange']) ? $data['wechatRange'] : input('wechatRange',3),
                'kefuData' => !empty($data['kefuData']) ? $data['kefuData'] : input('kefuData',[]),
                'wechatData' => !empty($data['wechatData']) ? $data['wechatData'] : input('wechatData',[]),
                'labels' => !empty($data['labels']) ? $data['labels'] : input('labels',[]),
                'priorityStrategy' => json_encode(!empty($data['priorityStrategy']) ? $data['priorityStrategy'] : input('priorityStrategy',[]),256),
            ];

            // 设置请求头
            $headerData = ['client:system'];
            $header = setHeader($headerData, $authorization, 'json');

            // 发送请求到微信接口
            $result = requestCurl($this->baseUrl . 'api/AllotRule/update', $params, 'PUT', $header, 'json');
  
            if (empty($result)) {
                $this->getAllRules();
                return successJson([], '更新分配规则成功');
            } else {
                return errorJson($result);
            }
        } catch (\Exception $e) {
            return errorJson('更新分配规则失败：' . $e->getMessage());
        }
    }

    /**
     * 删除分配规则
     * @param array $data 请求数据
     * @param bool $isInner 是否为内部调用
     * @return \think\response\Json
     */
    public function deleteRule($data = [], $isInner = false)
    {
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
            // 获取请求参数
            $id = !empty($data['id']) ? $data['id'] : input('id', 0);
            if (empty($id)) {
                return errorJson('规则ID不能为空');
            }

            // 检查规则是否存在
            $rule = AllotRuleModel::where('id', $id)->find();
            if (empty($rule)) {
                return errorJson('规则不存在');
            }

            // 设置请求头
            $headerData = ['client:system'];
            $header = setHeader($headerData, $authorization, 'plain');

            // 发送请求到微信接口
            $result = requestCurl($this->baseUrl . 'api/AllotRule/delete?id=' . $id, [], 'DELETE', $header);
            $response = handleApiResponse($result);
            
            if (empty($response)) {
                // 删除成功，同步本地数据库
                AllotRuleModel::where('id', $id)->update(['isDel' => 1]);
                return successJson([], '删除分配规则成功');
            } else {
                return errorJson($response);
            }
        } catch (\Exception $e) {
            return errorJson('删除分配规则失败：' . $e->getMessage());
        }
    }
    
    /************************************
     * 数据查询相关方法
     ************************************/
    
    /**
     * 自动创建分配规则
     * 根据今日新增微信账号自动创建或更新分配规则
     * @param array $data 请求数据
     * @param bool $isInner 是否为内部调用
     * @return \think\response\Json|string
     */
    public function autoCreateAllotRules($data = [], $isInner = false)
    {
        try {
            // 获取今天的开始时间和结束时间
            $todayStart = strtotime(date('Y-m-d 00:00:00'));
            $todayEnd = strtotime(date('Y-m-d 23:59:59'));
            
            // 查询今天新增的微信账号
            $newAccounts = Db::table('s2_wechat_account')
                ->alias('wa')
                ->join(['s2_company_account' => 'ca'], 'wa.deviceAccountId = ca.id', 'LEFT')
                ->field([
                    'wa.id',
                    'wa.wechatId',
                    'wa.nickname',
                    'wa.deviceAccountId',
                    'wa.alias',
                    'wa.createTime',
                    'ca.departmentId',
                ])
                ->where('wa.createTime', 'BETWEEN', [$todayStart, $todayEnd])
                ->where('wa.isDeleted', 0)
                ->order('wa.createTime', 'DESC')
                ->select();
                  
            // 没有今日新增微信账号，直接返回
            if (empty($newAccounts)) {
                $result = ['code' => 200, 'msg' => '没有今日新增微信账号，无需创建分配规则', 'data' => []];
                return $isInner ? json_encode($result) : successJson([], '没有今日新增微信账号，无需创建分配规则');
            }

            // 获取所有分配规则
            foreach ($newAccounts as $key => $value) {
                $rules = AllotRuleModel::where(['departmentId' => $value['departmentId'],'isDel' => 0])->order('id','DESC')->find();
                if (!empty($rules)) {
                    $wechatData = json_decode($rules['wechatData'], true);
                    if (!in_array($value['id'], $wechatData)) {
                        $wechatData[] = $value['id'];
                        $kefuData = [$value['deviceAccountId']];
                        $this->updateRule(['id' => $rules['id'],'wechatData' => $wechatData,'kefuData' => $kefuData],true);
                    }
                }else{
                    $wechatData =[$value['id']];
                    $kefuData = [$value['deviceAccountId']];
                    $this->createRule(['wechatData' => $wechatData,'kefuData' => $kefuData,'departmentId' => $value['departmentId']],true);
                }
            }
            $result = ['code' => 200, 'msg' => '自动分配规则成功', 'data' => []];
            return $isInner ? json_encode($result) : successJson([], '自动分配规则成功');
        } catch (\Exception $e) {
            $error = '自动分配规则失败: ' . $e->getMessage();
            $result = ['code' => 500, 'msg' => $error];
            return $isInner ? json_encode($result) : errorJson($error);
        }
    }
    
    /************************************
     * 辅助方法
     ************************************/
    
    /**
     * 保存分配规则数据到数据库
     * @param array $item 分配规则数据
     */
    private function saveAllotRule($item)
    {
        $data = [
            'id' => isset($item['id']) ? $item['id'] : '',
            'tenantId' => isset($item['tenantId']) ? $item['tenantId'] : 0,
            'allotType' => isset($item['allotType']) ? $item['allotType'] : 0,
            'allotOnline' => isset($item['allotOnline']) ? $item['allotOnline'] : false,
            'kefuRange' => isset($item['kefuRange']) ? $item['kefuRange'] : 0,
            'wechatRange' => isset($item['wechatRange']) ? $item['wechatRange'] : 0,
            'kefuData' => isset($item['kefuData']) ? json_encode($item['kefuData']) : json_encode([]),
            'wechatData' => isset($item['wechatData']) ? json_encode($item['wechatData']) : json_encode([]),
            'labels' => isset($item['labels']) ? json_encode($item['labels']) : json_encode([]),
            'priorityStrategy' => isset($item['priorityStrategy']) ? json_encode($item['priorityStrategy']) : json_encode([]),
            'sortIndex' => isset($item['sortIndex']) ? $item['sortIndex'] : 0,
            'creatorAccountId' => isset($item['creatorAccountId']) ? $item['creatorAccountId'] : 0,
            'createTime' => isset($item['createTime']) ? (strtotime($item['createTime']) ?: 0) : 0,
            'ruleName' => isset($item['ruleName']) ? $item['ruleName'] : '',
            'isDel' =>  0,
        ];

        // 使用ID作为唯一性判断
        $rule = AllotRuleModel::where('id', $item['id'])->find();

        if ($rule) {
            $rule->save($data);
        } else {
            AllotRuleModel::create($data);
        }
    }
}