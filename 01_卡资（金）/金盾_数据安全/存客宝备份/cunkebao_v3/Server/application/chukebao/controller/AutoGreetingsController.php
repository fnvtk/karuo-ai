<?php

namespace app\chukebao\controller;

use app\chukebao\model\AutoGreetings;
use library\ResponseHelper;
use think\Db;

class AutoGreetingsController extends BaseController
{

    /**
     * 获取问候规则列表
     * @return \think\response\Json
     */
    public function getList(){
        $page = $this->request->param('page', 1);
        $limit =  $this->request->param('limit', 10);
        $keyword =  $this->request->param('keyword', '');
        $is_template =  $this->request->param('is_template', 0);
        $triggerType = $this->request->param('triggerType', ''); // 触发类型筛选
        $userId = $this->getUserInfo('id');
        $companyId = $this->getUserInfo('companyId');

        if($is_template == 1){
            $where = [
                ['is_template','=',1],
                ['isDel' ,'=', 0],
            ];
        }else{
            $where = [
                ['companyId','=',$companyId],
                ['userId' ,'=', $userId],
                ['isDel' ,'=', 0],
            ];
        }

        if(!empty($keyword)){
            $where[] = ['name','like','%'.$keyword.'%'];
        }

        if(!empty($triggerType)){
            $where[] = ['trigger','=',$triggerType];
        }

        $query = AutoGreetings::where($where);
        $total = $query->count();
        $list = $query->where($where)->page($page,$limit)->order('level asc,id desc')->select();

        // 获取使用次数
        $list = is_array($list) ? $list : $list->toArray();
        $ids = array_column($list, 'id');
        $usageCounts = [];
        if (!empty($ids)) {
            $counts = Db::name('kf_auto_greetings_record')
                ->where('autoId', 'in', $ids)
                ->field('autoId, COUNT(*) as count')
                ->group('autoId')
                ->select();
            foreach ($counts as $count) {
                $usageCounts[$count['autoId']] = (int)$count['count'];
            }
        }

        foreach ($list as &$item) {
            $item['condition'] = json_decode($item['condition'], true);
            $item['usageCount'] = $usageCounts[$item['id']] ?? 0;
            // 格式化触发类型显示文本
            $triggerTypes = [
                1 => '新好友',
                2 => '首次发消息',
                3 => '时间触发',
                4 => '关键词触发',
                5 => '生日触发',
                6 => '自定义'
            ];
            $item['triggerText'] = $triggerTypes[$item['trigger']] ?? '未知';
        }
        unset($item);

        return ResponseHelper::success(['list'=>$list,'total'=>$total]);
    }


    /**
     * 校验trigger类型对应的condition
     * @param int $trigger 触发类型
     * @param mixed $condition 条件参数
     * @return array|string 返回处理后的condition数组，或错误信息字符串
     */
    private function validateTriggerCondition($trigger, $condition)
    {
        // trigger类型：1=新好友，2=首次发消息，3=时间触发，4=关键词触发，5=生日触发，6=自定义
        switch ($trigger) {
            case 1: // 新好友
                // 不需要condition
                return [];
                
            case 2: // 首次发消息
                // 不需要condition
                return [];
                
            case 3: // 时间触发
                // 需要condition，格式为：{"type": "daily_time|yearly_datetime|fixed_range|workday", "value": "..."}
                if (empty($condition)) {
                    return '时间触发类型需要配置具体的触发条件';
                }
                $condition = is_array($condition) ? $condition : json_decode($condition, true);
                if (empty($condition) || !is_array($condition)) {
                    return '时间触发类型的条件格式不正确，应为数组格式';
                }
                
                // 验证必须包含type字段
                if (!isset($condition['type']) || empty($condition['type'])) {
                    return '时间触发类型必须指定触发方式：daily_time（每天固定时间）、yearly_datetime（每年固定日期时间）、fixed_range（固定时间段）、workday（工作日）';
                }
                
                $timeType = $condition['type'];
                $allowedTypes = ['daily_time', 'yearly_datetime', 'fixed_range', 'workday'];
                // 兼容旧版本的 fixed_time，自动转换为 daily_time
                if ($timeType === 'fixed_time') {
                    $timeType = 'daily_time';
                }
                if (!in_array($timeType, $allowedTypes)) {
                    return '时间触发类型无效，必须为：daily_time（每天固定时间）、yearly_datetime（每年固定日期时间）、fixed_range（固定时间段）、workday（工作日）';
                }
                
                // 根据不同的type验证value
                switch ($timeType) {
                    case 'daily_time': // 每天固定时间（每天的几点几分）
                        // value应该是时间字符串，格式：HH:mm，如 "14:30"
                        if (!isset($condition['value']) || empty($condition['value'])) {
                            return '每天固定时间类型需要配置具体时间，格式：HH:mm（如 14:30）';
                        }
                        $timeValue = $condition['value'];
                        if (!preg_match('/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/', $timeValue)) {
                            return '每天固定时间格式不正确，应为 HH:mm 格式（如 14:30）';
                        }
                        return [
                            'type' => 'daily_time',
                            'value' => $timeValue
                        ];
                        
                    case 'yearly_datetime': // 每年固定日期时间（每年的几月几号几点几分）
                        // value应该是日期时间字符串，格式：MM-dd HH:mm，如 "12-25 14:30"
                        if (!isset($condition['value']) || empty($condition['value'])) {
                            return '每年固定日期时间类型需要配置具体日期和时间，格式：MM-dd HH:mm（如 12-25 14:30）';
                        }
                        $datetimeValue = $condition['value'];
                        // 验证格式：MM-dd HH:mm
                        if (!preg_match('/^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01]) ([01]?[0-9]|2[0-3]):[0-5][0-9]$/', $datetimeValue)) {
                            return '每年固定日期时间格式不正确，应为 MM-dd HH:mm 格式（如 12-25 14:30）';
                        }
                        // 进一步验证日期是否有效（例如2月30日不存在）
                        list($datePart, $timePart) = explode(' ', $datetimeValue);
                        list($month, $day) = explode('-', $datePart);
                        if (!checkdate((int)$month, (int)$day, 2000)) { // 使用2000年作为参考年份验证日期有效性
                            return '日期无效，请检查月份和日期是否正确（如2月不能有30日）';
                        }
                        return [
                            'type' => 'yearly_datetime',
                            'value' => $datetimeValue
                        ];
                        
                    case 'fixed_range': // 固定时间段
                        // value应该是时间段数组，格式：["09:00", "18:00"]
                        if (!isset($condition['value']) || !is_array($condition['value'])) {
                            return '固定时间段类型需要配置时间段，格式：["开始时间", "结束时间"]（如 ["09:00", "18:00"]）';
                        }
                        $rangeValue = $condition['value'];
                        if (count($rangeValue) !== 2) {
                            return '固定时间段应为包含两个时间点的数组，格式：["09:00", "18:00"]';
                        }
                        // 验证时间格式
                        foreach ($rangeValue as $time) {
                            if (!preg_match('/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/', $time)) {
                                return '时间段格式不正确，应为 HH:mm 格式（如 09:00）';
                            }
                        }
                        // 验证开始时间小于结束时间
                        $startTime = strtotime('2000-01-01 ' . $rangeValue[0]);
                        $endTime = strtotime('2000-01-01 ' . $rangeValue[1]);
                        if ($startTime >= $endTime) {
                            return '开始时间必须小于结束时间';
                        }
                        return [
                            'type' => 'fixed_range',
                            'value' => $rangeValue
                        ];
                        
                    case 'workday': // 工作日
                        // 工作日需要配置时间，格式：HH:mm（如 09:00）
                        if (!isset($condition['value']) || empty($condition['value'])) {
                            return '工作日触发类型需要配置时间，格式：HH:mm（如 09:00）';
                        }
                        $timeValue = trim($condition['value']);
                        // 验证格式：HH:mm
                        if (!preg_match('/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/', $timeValue)) {
                            return '工作日时间格式不正确，应为 HH:mm 格式（如 09:00）';
                        }
                        return [
                            'type' => 'workday',
                            'value' => $timeValue
                        ];
                        
                    default:
                        return '时间触发类型无效';
                }
                
            case 4: // 关键词触发
                // 需要condition，格式：{"keywords": ["关键词1", "关键词2"], "match_type": "exact|fuzzy"}
                if (empty($condition)) {
                    return '关键词触发类型需要配置至少一个关键词';
                }
                
                // 如果是字符串，尝试解析JSON
                if (is_string($condition)) {
                    $decoded = json_decode($condition, true);
                    if (json_last_error() === JSON_ERROR_NONE) {
                        $condition = $decoded;
                    } else {
                        return '关键词触发类型格式错误，应为对象格式：{"keywords": ["关键词1", "关键词2"], "match_type": "exact|fuzzy"}';
                    }
                }
                
                // 必须是对象格式
                if (!is_array($condition) || !isset($condition['keywords'])) {
                    return '关键词触发类型格式错误，应为对象格式：{"keywords": ["关键词1", "关键词2"], "match_type": "exact|fuzzy"}';
                }
                
                $keywords = $condition['keywords'];
                $matchType = isset($condition['match_type']) ? $condition['match_type'] : 'fuzzy';
                
                // 验证match_type
                if (!in_array($matchType, ['exact', 'fuzzy'])) {
                    return '匹配类型无效，必须为：exact（精准匹配）或 fuzzy（模糊匹配）';
                }
                
                // 处理keywords
                if (is_string($keywords)) {
                    $keywords = explode(',', $keywords);
                }
                if (!is_array($keywords)) {
                    return '关键词格式不正确，应为数组格式';
                }
                
                // 过滤空值并去重
                $keywords = array_filter(array_map('trim', $keywords));
                if (empty($keywords)) {
                    return '关键词触发类型需要配置至少一个关键词';
                }
                
                // 验证每个关键词不为空
                foreach ($keywords as $keyword) {
                    if (empty($keyword)) {
                        return '关键词不能为空';
                    }
                }
                
                return [
                    'keywords' => array_values($keywords),
                    'match_type' => $matchType
                ];
                
            case 5: // 生日触发
                // 需要condition，格式支持：
                // 1. 月日字符串：'10-10' 或 '10-10 09:00'（MM-DD格式，不包含年份）
                // 2. 对象格式：{'month': 10, 'day': 10, 'time': '09:00'} 或 {'month': '10', 'day': '10', 'time_range': ['09:00', '10:00']}
                if (empty($condition)) {
                    return '生日触发类型需要配置日期条件';
                }
                
                // 如果是字符串，只接受 MM-DD 格式（不包含年份）
                if (is_string($condition)) {
                    // 检查是否包含时间部分
                    if (preg_match('/^(\d{1,2})-(\d{1,2})\s+(\d{2}:\d{2})$/', $condition, $matches)) {
                        // 格式：'10-10 09:00'
                        $month = (int)$matches[1];
                        $day = (int)$matches[2];
                        if ($month < 1 || $month > 12 || $day < 1 || $day > 31) {
                            return '生日日期格式不正确，月份应为1-12，日期应为1-31';
                        }
                        return [
                            'month' => $month,
                            'day' => $day,
                            'time' => $matches[3]
                        ];
                    } elseif (preg_match('/^(\d{1,2})-(\d{1,2})$/', $condition, $matches)) {
                        // 格式：'10-10'（不指定时间，当天任何时间都可以触发）
                        $month = (int)$matches[1];
                        $day = (int)$matches[2];
                        if ($month < 1 || $month > 12 || $day < 1 || $day > 31) {
                            return '生日日期格式不正确，月份应为1-12，日期应为1-31';
                        }
                        return [
                            'month' => $month,
                            'day' => $day
                        ];
                    } else {
                        return '生日日期格式不正确，应为 MM-DD 或 MM-DD HH:mm 格式（如 10-10 或 10-10 09:00），不包含年份';
                    }
                }
                
                // 如果是数组，可能是对象格式或旧格式
                if (is_array($condition)) {
                    // 检查是否是旧格式（仅兼容 MM-DD 格式的数组）
                    if (isset($condition[0]) && is_string($condition[0])) {
                        $dateStr = $condition[0];
                        // 只接受 MM-DD 格式：'10-10' 或 '10-10 09:00'
                        if (preg_match('/^(\d{1,2})-(\d{1,2})(?:\s+(\d{2}:\d{2}))?$/', $dateStr, $matches)) {
                            $month = (int)$matches[1];
                            $day = (int)$matches[2];
                            if ($month < 1 || $month > 12 || $day < 1 || $day > 31) {
                                return '生日日期格式不正确，月份应为1-12，日期应为1-31';
                            }
                            if (isset($matches[3])) {
                                return [
                                    'month' => $month,
                                    'day' => $day,
                                    'time' => $matches[3]
                                ];
                            } else {
                                return [
                                    'month' => $month,
                                    'day' => $day
                                ];
                            }
                        } else {
                            return '生日日期格式不正确，应为 MM-DD 格式（如 10-10），不包含年份';
                        }
                    }
                    
                    // 新格式：{'month': 10, 'day': 10, 'time': '09:00'}
                    if (isset($condition['month']) && isset($condition['day'])) {
                        $month = (int)$condition['month'];
                        $day = (int)$condition['day'];
                        
                        if ($month < 1 || $month > 12) {
                            return '生日月份格式不正确，应为1-12';
                        }
                        if ($day < 1 || $day > 31) {
                            return '生日日期格式不正确，应为1-31';
                        }
                        
                        $result = [
                            'month' => $month,
                            'day' => $day
                        ];
                        
                        // 检查是否配置了时间
                        if (isset($condition['time']) && !empty($condition['time'])) {
                            $time = trim($condition['time']);
                            if (!preg_match('/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/', $time)) {
                                return '生日时间格式不正确，应为 HH:mm 格式（如 09:00）';
                            }
                            $result['time'] = $time;
                        }
                        
                        // 检查是否配置了时间范围
                        if (isset($condition['time_range']) && is_array($condition['time_range']) && count($condition['time_range']) === 2) {
                            $startTime = trim($condition['time_range'][0]);
                            $endTime = trim($condition['time_range'][1]);
                            if (!preg_match('/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/', $startTime) || 
                                !preg_match('/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/', $endTime)) {
                                return '生日时间范围格式不正确，应为 ["HH:mm", "HH:mm"] 格式';
                            }
                            $result['time_range'] = [$startTime, $endTime];
                        }
                        
                        return $result;
                    }
                    
                    return '生日触发条件格式不正确，需要提供month和day字段';
                }
                
                return '生日触发条件格式不正确';
                
            case 6: // 自定义
                // 自定义类型，condition可选，如果有则必须是数组格式
                if (!empty($condition)) {
                    $condition = is_array($condition) ? $condition : json_decode($condition, true);
                    if (!is_array($condition)) {
                        return '自定义类型的条件格式不正确，应为数组格式';
                    }
                    return $condition;
                }
                return [];
                
            default:
                return '无效的触发类型';
        }
    }

    /**
     * 添加
     * @return \think\response\Json
     * @throws \Exception
     */
    public function create(){
        $name =  $this->request->param('name', '');
        $trigger =  $this->request->param('trigger', 0);
        $condition =  $this->request->param('condition', '');
        $content =  $this->request->param('content', '');
        $level =  $this->request->param('level', 0);
        $status =  $this->request->param('status', 1);
        $userId = $this->getUserInfo('id');
        $companyId = $this->getUserInfo('companyId');

        if (empty($name) || empty($trigger) || empty($content)){
            return ResponseHelper::error('参数缺失');
        }

        // 校验trigger类型
        if (!in_array($trigger, [1, 2, 3, 4, 5, 6])) {
            return ResponseHelper::error('无效的触发类型');
        }

        // 校验并处理condition
        $conditionResult = $this->validateTriggerCondition($trigger, $condition);
        if (is_string($conditionResult)) {
            // 返回的是错误信息
            return ResponseHelper::error($conditionResult);
        }
        $condition = $conditionResult;


        Db::startTrans();
        try {
            $AutoGreetings = new AutoGreetings();
            $AutoGreetings->name = $name;
            $AutoGreetings->trigger = $trigger;
            $AutoGreetings->condition = json_encode($condition,256);
            $AutoGreetings->content = $content;
            $AutoGreetings->level = $level;
            $AutoGreetings->status = $status;
            $AutoGreetings->userId = $userId;
            $AutoGreetings->companyId = $companyId;
            $AutoGreetings->updateTime = time();
            $AutoGreetings->createTime = time();
            $AutoGreetings->usageCount = 0; // 初始化使用次数为0
            $AutoGreetings->save();
            Db::commit();
            return ResponseHelper::success(['id' => $AutoGreetings->id],'创建成功');
        } catch (\Exception $e) {
            Db::rollback();
            return ResponseHelper::error('创建失败：'.$e->getMessage());
        }
    }




    /**
     * 详情
     * @return \think\response\Json
     */
    public function details()
    {
        $id =  $this->request->param('id', '');
        $userId = $this->getUserInfo('id');
        $companyId = $this->getUserInfo('companyId');
        if (empty($id)){
            return ResponseHelper::error('参数缺失');
        }
        $data = AutoGreetings::where(['id'=>$id,'isDel' => 0,'userId' => $userId,'companyId' => $companyId])->find();
        if (empty($data)){
            return ResponseHelper::error('该内容已被删除或者不存在');
        }


        $data['condition'] = json_decode($data['condition'],true);
        
        // 获取使用次数
        $usageCount = Db::name('kf_auto_greetings_record')
            ->where('autoId', $id)
            ->count();
        $data['usageCount'] = (int)$usageCount;

        return ResponseHelper::success($data,'获取成功');
    }

    /**
     * 删除
     * @return \think\response\Json
     */
    public function del()
    {
        $id =  $this->request->param('id', '');
        $userId = $this->getUserInfo('id');
        $companyId = $this->getUserInfo('companyId');
        if (empty($id)){
            return ResponseHelper::error('参数缺失');
        }
        $data = AutoGreetings::where(['id'=>$id,'isDel' => 0,'userId' => $userId,'companyId' => $companyId])->find();
        if (empty($data)){
            return ResponseHelper::error('该已被删除或者不存在');
        }
        Db::startTrans();
        try {
            $data->isDel = 1;
            $data->delTime = time();
            $data->save();
            Db::commit();
            return ResponseHelper::success('','删除成功');
        } catch (\Exception $e) {
            Db::rollback();
            return ResponseHelper::error('删除失败：'.$e->getMessage());
        }
    }


    /**
     * 更新
     * @return \think\response\Json
     * @throws \Exception
     */
    public function update(){
        $id =  $this->request->param('id', '');
        $name =  $this->request->param('name', '');
        $trigger =  $this->request->param('trigger', 0);
        $condition =  $this->request->param('condition', '');
        $content =  $this->request->param('content', '');
        $level =  $this->request->param('level', 0);
        $status =  $this->request->param('status', 1);
        $userId = $this->getUserInfo('id');
        $companyId = $this->getUserInfo('companyId');

        if (empty($id) || empty($name) || empty($trigger) || empty($content)){
            return ResponseHelper::error('参数缺失');
        }

        // 校验trigger类型
        if (!in_array($trigger, [1, 2, 3, 4, 5, 6])) {
            return ResponseHelper::error('无效的触发类型');
        }

        // 校验并处理condition
        $conditionResult = $this->validateTriggerCondition($trigger, $condition);
        if (is_string($conditionResult)) {
            // 返回的是错误信息
            return ResponseHelper::error($conditionResult);
        }
        $condition = $conditionResult;


        $query = AutoGreetings::where(['id'=>$id,'isDel' => 0,'userId' => $userId,'companyId' => $companyId])->find();
        if (empty($query)){
            return ResponseHelper::error('该内容已被删除或者不存在');
        }
        Db::startTrans();
        try {
            $query->name = $name;
            $query->trigger = $trigger;
            $query->condition = !empty($condition) ? json_encode($condition,256) : json_encode([]);
            $query->content = $content;
            $query->level = $level;
            $query->status = $status;
            $query->userId = $userId;
            $query->companyId = $companyId;
            $query->updateTime = time();
            $query->createTime = time();
            $query->save();
            Db::commit();
            return ResponseHelper::success(' ','修改成功');
        } catch (\Exception $e) {
            Db::rollback();
            return ResponseHelper::error('修改失败：'.$e->getMessage());
        }
    }

    /**
     * 修改状态
     * @return \think\response\Json
     * @throws \Exception
     */
    public function setStatus(){
        $id =  $this->request->param('id', '');
        $userId = $this->getUserInfo('id');
        $companyId = $this->getUserInfo('companyId');

        if (empty($id)){
            return ResponseHelper::error('参数缺失');
        }

        $query = AutoGreetings::where(['id'=>$id,'isDel' => 0,'userId' => $userId,'companyId' => $companyId])->find();
        if (empty($query)){
            return ResponseHelper::error('该内容已被删除或者不存在');
        }
        Db::startTrans();
        try {
            $status = $this->request->param('status', '');
            if ($status !== '') {
                $query->status = (int)$status;
            } else {
                $query->status = $query->status == 1 ? 0 : 1;
            }
            $query->updateTime = time();
            $query->save();
            Db::commit();
            return ResponseHelper::success(['status' => $query->status],'修改成功');
        } catch (\Exception $e) {
            Db::rollback();
            return ResponseHelper::error('修改失败：'.$e->getMessage());
        }
    }




    /**
     * 拷贝
     * @return \think\response\Json
     * @throws \Exception
     */
    public function copy(){
        $id =  $this->request->param('id', '');
        $userId = $this->getUserInfo('id');
        $companyId = $this->getUserInfo('companyId');

        if (empty($id) ){
            return ResponseHelper::error('参数缺失');
        }

        $data = AutoGreetings::where(['id'=>$id,'isDel' => 0,'userId' => $userId,'companyId' => $companyId])->find();
        if (empty($data)){
            return ResponseHelper::error('该内容已被删除或者不存在');
        }
        Db::startTrans();
        try {
            $query = new AutoGreetings();
            $query->name = $data['name'] . '_copy';
            $query->trigger = $data['trigger'];
            $query->condition = $data['condition'];
            $query->content = $data['content'];
            $query->level = $data['level'];
            $query->status = $data['status'];
            $query->userId = $userId;
            $query->companyId = $companyId;
            $query->updateTime = time();
            $query->createTime = time();
            $query->save();
            Db::commit();
            return ResponseHelper::success(' ','拷贝成功');
        } catch (\Exception $e) {
            Db::rollback();
            return ResponseHelper::error('拷贝失败：'.$e->getMessage());
        }
    }


    /**
     * 统计概览
     * - 总触发次数
     * - 活跃规则（近一个月）
     * - 发送成功率
     * - 平均响应时间（秒）
     * - 规则效果排行（按发送次数降序、平均响应时间升序）
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

            // 1) 总触发次数
            $totalTriggers = Db::name('kf_auto_greetings_record')
                ->where($companyWhere)
                ->count();

            // 2) 近30天活跃规则（仅返回数量，按公司维度，distinct autoId）
            $activeRulesCount = Db::name('kf_auto_greetings_record')
                ->where($companyWhere)
                ->where('createTime', '>=', $start30d)
                ->distinct(true)
                ->count('autoId');

            // 3) 发送成功率
            $sendCount = Db::name('kf_auto_greetings_record')
                ->where($companyWhere)
                ->where('isSend', '=', 1)
                ->count();
            // 成功率：百分比，保留两位小数
            $sendRate = $totalTriggers > 0 ? round(($sendCount * 100) / $totalTriggers, 2) : 0.00;

            // 4) 平均响应时间（receiveTime - sendTime，单位秒）
            $avgResponse = Db::name('kf_auto_greetings_record')
                ->where($companyWhere)
                ->whereRaw('sendTime IS NOT NULL AND receiveTime IS NOT NULL AND receiveTime >= sendTime')
                ->avg(Db::raw('(receiveTime - sendTime)'));
            $avgResponse = $avgResponse ? (int)round($avgResponse) : 0;

            // 5) 规则效果排行（按发送次数降序、平均响应时间升序）
            $ranking = Db::name('kf_auto_greetings_record')
                ->where($rankingWhere)
                ->field([
                    'autoId AS id',
                    'COUNT(*) AS totalCount',
                    'SUM(CASE WHEN isSend = 1 THEN 1 ELSE 0 END) AS sendCount',
                    'AVG(CASE WHEN sendTime IS NOT NULL AND receiveTime IS NOT NULL AND receiveTime >= sendTime THEN (receiveTime - sendTime) END) AS avgResp'
                ])
                ->group('autoId')
                ->orderRaw('sendCount DESC, avgResp ASC')
                ->limit(20)
                ->select();

            // 附加规则名称（如存在）
            $autoIds = array_values(array_unique(array_column($ranking, 'id')));
            $autoIdToRule = [];
            if (!empty($autoIds)) {
                $rules = AutoGreetings::where([['id', 'in', $autoIds]])
                    ->field('id,name,trigger')
                    ->select();
                foreach ($rules as $rule) {
                    $autoIdToRule[$rule['id']] = [
                        'name' => $rule['name'],
                        'trigger' => $rule['trigger'],
                    ];
                }
            }

            foreach ($ranking as &$row) {
                $row['avgResp'] = isset($row['avgResp']) && $row['avgResp'] !== null ? (int)round($row['avgResp']) : 0;
                // 百分比，两位小数
                $row['sendRate'] = ($row['totalCount'] ?? 0) > 0 ? round((($row['sendCount'] ?? 0) * 100) / $row['totalCount'], 2) : 0.00;
                $row['name'] = $autoIdToRule[$row['id']]['name'] ?? '';
                $row['trigger'] = $autoIdToRule[$row['id']]['trigger'] ?? null;
            }
            unset($row);

            return ResponseHelper::success([
                'totalTriggers' => (int)$totalTriggers,
                'activeRules' => (int)$activeRulesCount,
                'sendSuccessRate' => $sendRate,
                'avgResponseSeconds' => $avgResponse,
                'ruleRanking' => $ranking,
            ], '统计成功');
        } catch (\Exception $e) {
            return ResponseHelper::error('统计失败：' . $e->getMessage());
        }
    }
}