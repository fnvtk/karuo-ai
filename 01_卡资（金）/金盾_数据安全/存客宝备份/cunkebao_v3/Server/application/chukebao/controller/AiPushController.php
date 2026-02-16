<?php

namespace app\chukebao\controller;

use app\chukebao\model\AiPush;
use app\chukebao\model\AiPushRecord;
use app\chukebao\model\AutoGreetings;
use library\ResponseHelper;
use think\Db;

class AiPushController extends BaseController
{

    /**
     * 获取推送列表
     * @return \think\response\Json
     * @throws \Exception
     */
    public function getList()
    {
        $page = $this->request->param('page', 1);
        $limit = $this->request->param('limit', 10);
        $keyword = $this->request->param('keyword', '');
        $userId = $this->getUserInfo('id');
        $companyId = $this->getUserInfo('companyId');

        $where = [
            ['companyId', '=', $companyId],
            ['userId', '=', $userId],
            ['isDel', '=', 0],
        ];

        if (!empty($keyword)) {
            $where[] = ['name', 'like', '%' . $keyword . '%'];
        }

        $query = AiPush::where($where);
        $total = $query->count();
        $list = $query->where($where)->page($page, $limit)->order('id desc')->select();

        // 处理数据
        $list = is_array($list) ? $list : $list->toArray();
        foreach ($list as &$item) {
            // 解析标签数组
            $item['tags'] = json_decode($item['tags'], true);
            if (!is_array($item['tags'])) {
                $item['tags'] = [];
            }
            // 格式化推送时机显示文本
            $timingTypes = [
                1 => '立即推送',
                2 => 'AI最佳时机',
                3 => '定时推送'
            ];
            $item['timingText'] = $timingTypes[$item['pushTiming']] ?? '未知';
            // 处理定时推送时间
            if ($item['pushTiming'] == 3 && !empty($item['scheduledTime'])) {
                $item['scheduledTime'] = date('Y-m-d H:i:s', $item['scheduledTime']);
            } else {
                $item['scheduledTime'] = '';
            }
            // 从记录表计算实际成功率
            $pushId = $item['id'];
            $totalCount = Db::name('kf_ai_push_record')
                ->where('pushId', $pushId)
                ->count();
            $sendCount = Db::name('kf_ai_push_record')
                ->where('pushId', $pushId)
                ->where('isSend', 1)
                ->count();
            $item['successRate'] = $totalCount > 0 ? round(($sendCount * 100) / $totalCount, 1) : 0;
            $item['totalPushCount'] = $totalCount; // 推送总数
            $item['sendCount'] = $sendCount; // 成功发送数
        }
        unset($item);

        return ResponseHelper::success(['list' => $list, 'total' => $total]);
    }

    /**
     * 添加
     * @return \think\response\Json
     * @throws \Exception
     */
    public function add()
    {
        $name = $this->request->param('name', '');
        $tags = $this->request->param('tags', ''); // 标签，支持逗号分隔的字符串或数组
        $content = $this->request->param('content', '');
        $pushTiming = $this->request->param('pushTiming', 1); // 1=立即推送，2=最佳时机(AI决定)，3=定时推送
        $scheduledTime = $this->request->param('scheduledTime', ''); // 定时推送的时间
        $status = $this->request->param('status', 1);
        $userId = $this->getUserInfo('id');
        $companyId = $this->getUserInfo('companyId');

        if (empty($name) || empty($content)) {
            return ResponseHelper::error('推送名称和推送内容不能为空');
        }

        // 验证推送时机
        if (!in_array($pushTiming, [1, 2, 3])) {
            return ResponseHelper::error('无效的推送时机类型');
        }

        // 如果是定时推送，需要验证时间
        if ($pushTiming == 3) {
            if (empty($scheduledTime)) {
                return ResponseHelper::error('定时推送需要设置推送时间');
            }
            // 验证时间格式
            $timestamp = strtotime($scheduledTime);
            if ($timestamp === false || $timestamp <= time()) {
                return ResponseHelper::error('定时推送时间格式不正确或必须大于当前时间');
            }
        } else {
            $scheduledTime = '';
        }

        // 处理标签
        $tagsArray = [];
        if (!empty($tags)) {
            if (is_string($tags)) {
                // 如果是字符串，按逗号分割
                $tagsArray = array_filter(array_map('trim', explode(',', $tags)));
            } elseif (is_array($tags)) {
                $tagsArray = array_filter(array_map('trim', $tags));
            }
        }
        
        if (empty($tagsArray)) {
            return ResponseHelper::error('目标用户标签不能为空');
        }

        Db::startTrans();
        try {
            $aiPush = new AiPush();
            $aiPush->name = $name;
            $aiPush->tags = json_encode($tagsArray, JSON_UNESCAPED_UNICODE);
            $aiPush->content = $content;
            $aiPush->pushTiming = $pushTiming;
            $aiPush->scheduledTime = $pushTiming == 3 && !empty($scheduledTime) ? strtotime($scheduledTime) : 0;
            $aiPush->status = $status;
            $aiPush->successRate = 0; // 初始成功率为0
            $aiPush->userId = $userId;
            $aiPush->companyId = $companyId;
            $aiPush->createTime = time();
            $aiPush->updateTime = time();
            $aiPush->save();
            Db::commit();
            return ResponseHelper::success(['id' => $aiPush->id], '创建成功');
        } catch (\Exception $e) {
            Db::rollback();
            return ResponseHelper::error('创建失败：' . $e->getMessage());
        }
    }

    /**
     * 详情
     * @return \think\response\Json
     * @throws \Exception
     */
    public function details()
    {
        $id = $this->request->param('id', '');
        $userId = $this->getUserInfo('id');
        $companyId = $this->getUserInfo('companyId');
        
        if (empty($id)) {
            return ResponseHelper::error('参数缺失');
        }
        
        $data = AiPush::where(['id' => $id, 'isDel' => 0, 'userId' => $userId, 'companyId' => $companyId])->find();
        if (empty($data)) {
            return ResponseHelper::error('该推送已被删除或者不存在');
        }

        $data = $data->toArray();
        // 解析标签数组
        $data['tags'] = json_decode($data['tags'], true);
        if (!is_array($data['tags'])) {
            $data['tags'] = [];
        }
        // 标签转为逗号分隔的字符串（用于编辑时回显）
        $data['tagsString'] = implode(',', $data['tags']);
        
        // 处理定时推送时间
        if ($data['pushTiming'] == 3 && !empty($data['scheduledTime'])) {
            $data['scheduledTime'] = date('Y-m-d H:i:s', $data['scheduledTime']);
        } else {
            $data['scheduledTime'] = '';
        }
        
        // 成功率保留一位小数
        $data['successRate'] = isset($data['successRate']) ? round($data['successRate'], 1) : 0;

        return ResponseHelper::success($data, '获取成功');
    }

    /**
     * 删除
     * @return \think\response\Json
     * @throws \Exception
     */
    public function del()
    {
        $id = $this->request->param('id', '');
        $userId = $this->getUserInfo('id');
        $companyId = $this->getUserInfo('companyId');
        
        if (empty($id)) {
            return ResponseHelper::error('参数缺失');
        }
        
        $data = AiPush::where(['id' => $id, 'isDel' => 0, 'userId' => $userId, 'companyId' => $companyId])->find();
        if (empty($data)) {
            return ResponseHelper::error('该推送已被删除或者不存在');
        }
        
        Db::startTrans();
        try {
            $data->isDel = 1;
            $data->delTime = time();
            $data->save();
            Db::commit();
            return ResponseHelper::success('', '删除成功');
        } catch (\Exception $e) {
            Db::rollback();
            return ResponseHelper::error('删除失败：' . $e->getMessage());
        }
    }

    /**
     * 更新
     * @return \think\response\Json
     * @throws \Exception
     */
    public function update()
    {
        $id = $this->request->param('id', '');
        $name = $this->request->param('name', '');
        $tags = $this->request->param('tags', '');
        $content = $this->request->param('content', '');
        $pushTiming = $this->request->param('pushTiming', 1);
        $scheduledTime = $this->request->param('scheduledTime', '');
        $status = $this->request->param('status', 1);
        $userId = $this->getUserInfo('id');
        $companyId = $this->getUserInfo('companyId');

        if (empty($id) || empty($name) || empty($content)) {
            return ResponseHelper::error('参数缺失');
        }

        // 验证推送时机
        if (!in_array($pushTiming, [1, 2, 3])) {
            return ResponseHelper::error('无效的推送时机类型');
        }

        // 如果是定时推送，需要验证时间
        if ($pushTiming == 3) {
            if (empty($scheduledTime)) {
                return ResponseHelper::error('定时推送需要设置推送时间');
            }
            // 验证时间格式
            $timestamp = strtotime($scheduledTime);
            if ($timestamp === false || $timestamp <= time()) {
                return ResponseHelper::error('定时推送时间格式不正确或必须大于当前时间');
            }
        } else {
            $scheduledTime = '';
        }

        // 处理标签
        $tagsArray = [];
        if (!empty($tags)) {
            if (is_string($tags)) {
                $tagsArray = array_filter(array_map('trim', explode(',', $tags)));
            } elseif (is_array($tags)) {
                $tagsArray = array_filter(array_map('trim', $tags));
            }
        }
        
        if (empty($tagsArray)) {
            return ResponseHelper::error('目标用户标签不能为空');
        }

        $query = AiPush::where(['id' => $id, 'isDel' => 0, 'userId' => $userId, 'companyId' => $companyId])->find();
        if (empty($query)) {
            return ResponseHelper::error('该推送已被删除或者不存在');
        }
        
        Db::startTrans();
        try {
            $query->name = $name;
            $query->tags = json_encode($tagsArray, JSON_UNESCAPED_UNICODE);
            $query->content = $content;
            $query->pushTiming = $pushTiming;
            $query->scheduledTime = $pushTiming == 3 && !empty($scheduledTime) ? strtotime($scheduledTime) : 0;
            $query->status = $status;
            $query->updateTime = time();
            $query->save();
            Db::commit();
            return ResponseHelper::success('', '修改成功');
        } catch (\Exception $e) {
            Db::rollback();
            return ResponseHelper::error('修改失败：' . $e->getMessage());
        }
    }

    /**
     * 修改状态
     * @return \think\response\Json
     * @throws \Exception
     */
    public function setStatus()
    {
        $id = $this->request->param('id', '');
        $status = $this->request->param('status', 1);
        $userId = $this->getUserInfo('id');
        $companyId = $this->getUserInfo('companyId');

        if (empty($id)) {
            return ResponseHelper::error('参数缺失');
        }

        if (!in_array($status, [0, 1])) {
            return ResponseHelper::error('状态值无效');
        }

        $data = AiPush::where(['id' => $id, 'isDel' => 0, 'userId' => $userId, 'companyId' => $companyId])->find();
        if (empty($data)) {
            return ResponseHelper::error('该推送已被删除或者不存在');
        }

        Db::startTrans();
        try {
            $data->status = $status;
            $data->updateTime = time();
            $data->save();
            Db::commit();
            return ResponseHelper::success('', $status == 1 ? '启用成功' : '禁用成功');
        } catch (\Exception $e) {
            Db::rollback();
            return ResponseHelper::error('操作失败：' . $e->getMessage());
        }
    }

    /**
     * 统计概览（整合自动问候和AI推送）
     * - 活跃规则（自动问候规则，近30天）
     * - 总触发次数（自动问候记录总数）
     * - AI推送成功率（AI推送的成功率）
     * - AI智能推送（AI推送规则，近30天活跃）
     * - 规则效果排行（自动问候规则，按使用次数排序）
     * @return \think\response\Json
     */
    public function stats()
    {
        $companyId = $this->getUserInfo('companyId');
        $userId = $this->getUserInfo('id');

        $start30d = time() - 30 * 24 * 3600;

        try {
            // 公司维度（用于除排行外的统计）
            $companyWhere = [
                ['companyId', '=', $companyId],
            ];
            // 排行维度（限定个人）
            $rankingWhere = [
                ['companyId', '=', $companyId],
                ['userId', '=', $userId],
            ];

            // ========== 自动问候统计 ==========
            
            // 1) 活跃规则（自动问候规则，近30天有记录的）
            $activeRules = Db::name('kf_auto_greetings_record')
                ->where($companyWhere)
                ->where('createTime', '>=', $start30d)
                ->distinct(true)
                ->count('autoId');

            // 2) 总触发次数（自动问候记录总数）
            $totalTriggers = Db::name('kf_auto_greetings_record')
                ->where($companyWhere)
                ->count();

            // ========== AI推送统计 ==========
            
            // 3) AI推送成功率
            $totalPushes = Db::name('kf_ai_push_record')
                ->where($companyWhere)
                ->count();
            $sendCount = Db::name('kf_ai_push_record')
                ->where($companyWhere)
                ->where('isSend', '=', 1)
                ->count();
            // 成功率：百分比，保留整数（75%）
            $aiPushSuccessRate = $totalPushes > 0 ? round(($sendCount * 100) / $totalPushes, 0) : 0;

            // 4) AI智能推送（AI推送规则，近30天活跃的）
            $aiPushCount = Db::name('kf_ai_push_record')
                ->where($companyWhere)
                ->where('createTime', '>=', $start30d)
                ->distinct(true)
                ->count('pushId');

            // ========== 规则效果排行（自动问候规则，按使用次数排序）==========
            $ruleRanking = Db::name('kf_auto_greetings_record')
                ->where($rankingWhere)
                ->field([
                    'autoId AS id',
                    'COUNT(*) AS usageCount'
                ])
                ->group('autoId')
                ->order('usageCount DESC')
                ->limit(20)
                ->select();

            // 附加规则名称和触发类型
            $autoIds = array_values(array_unique(array_column($ruleRanking, 'id')));
            $autoIdToRule = [];
            if (!empty($autoIds)) {
                $rules = AutoGreetings::where([['id', 'in', $autoIds]])
                    ->field('id,name,trigger')
                    ->select();
                foreach ($rules as $rule) {
                    $triggerTypes = [
                        1 => '新好友',
                        2 => '首次发消息',
                        3 => '时间触发',
                        4 => '关键词',
                        5 => '生日触发',
                        6 => '自定义'
                    ];
                    $autoIdToRule[$rule['id']] = [
                        'name' => $rule['name'],
                        'trigger' => $rule['trigger'],
                        'triggerText' => $triggerTypes[$rule['trigger']] ?? '未知',
                    ];
                }
            }

            foreach ($ruleRanking as &$row) {
                $row['usageCount'] = (int)($row['usageCount'] ?? 0);
                $row['name'] = $autoIdToRule[$row['id']]['name'] ?? '';
                $row['trigger'] = $autoIdToRule[$row['id']]['trigger'] ?? null;
                $row['triggerText'] = $autoIdToRule[$row['id']]['triggerText'] ?? '';
                // 格式化使用次数显示
                $row['usageCountText'] = $row['usageCount'] . ' 次';
            }
            unset($row);

            // 更新主表中的成功率字段（异步或定期更新）
            $this->updatePushSuccessRate($companyId);

            return ResponseHelper::success([
                'activeRules' => (int)$activeRules,
                'totalTriggers' => (int)$totalTriggers,
                'aiPushSuccessRate' => (int)$aiPushSuccessRate,
                'aiPushCount' => (int)$aiPushCount,
                'ruleRanking' => $ruleRanking,
            ], '统计成功');
        } catch (\Exception $e) {
            return ResponseHelper::error('统计失败：' . $e->getMessage());
        }
    }

    /**
     * 更新推送表的成功率字段
     * @param int $companyId
     * @return void
     */
    private function updatePushSuccessRate($companyId)
    {
        try {
            // 获取所有启用的推送
            $pushes = AiPush::where([
                ['companyId', '=', $companyId],
                ['isDel', '=', 0]
            ])->field('id')->select();

            foreach ($pushes as $push) {
                $pushId = $push['id'];
                $totalCount = Db::name('kf_ai_push_record')
                    ->where('pushId', $pushId)
                    ->count();
                $sendCount = Db::name('kf_ai_push_record')
                    ->where('pushId', $pushId)
                    ->where('isSend', 1)
                    ->count();
                
                $successRate = $totalCount > 0 ? round(($sendCount * 100) / $totalCount, 2) : 0.00;
                
                AiPush::where('id', $pushId)->update([
                    'successRate' => $successRate,
                    'updateTime' => time()
                ]);
            }
        } catch (\Exception $e) {
            // 静默失败，不影响主流程
        }
    }
}

