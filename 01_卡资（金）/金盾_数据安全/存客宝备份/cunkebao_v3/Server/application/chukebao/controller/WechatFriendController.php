<?php

namespace app\chukebao\controller;

use app\chukebao\model\FriendSettings;
use library\ResponseHelper;
use think\Db;

class WechatFriendController extends BaseController
{

    public function getList()
    {
        $page = $this->request->param('page', 1);
        $limit = $this->request->param('limit', 10);
        $keyword = $this->request->param('keyword', '');
        $groupIds = $this->request->param('groupId', '');
        $ownerWechatId = $this->request->param('ownerWechatId', '');
        $accountId = $this->getUserInfo('s2_accountId');
        if (empty($accountId)) {
            return ResponseHelper::error('请先登录');
        }
        $query = Db::table('s2_wechat_friend')
            ->where(['accountId' => $accountId, 'isDeleted' => 0]);

        // 关键字搜索：昵称、备注、微信号
        if ($keyword !== '' && $keyword !== null) {
            $query->where(function ($q) use ($keyword) {
                $like = '%' . $keyword . '%';
                $q->whereLike('nickname', $like)
                    ->whereOr('conRemark', 'like', $like)
                    ->whereOr('alias', 'like', $like)
                    ->whereOr('wechatId', 'like', $like);
            });
        }

        // 分组筛选：groupIds（单个分组ID）
        if ($groupIds !== '' && $groupIds !== null) {
            $query->where('groupIds', $groupIds);
        }

        if (!empty($ownerWechatId)) {
            $query->where('ownerWechatId', $ownerWechatId);
        }

        $query->order('id desc');
        $total = $query->count();
        $list = $query->page($page, $limit)->select();

        // 提取所有好友ID
        $friendIds = array_column($list, 'id');

        $aiTypeData = [];
        if (!empty($friendIds)) {
            $aiTypeData = FriendSettings::where('friendId', 'in', $friendIds)->column('friendId,type');
        }


        // 处理每个好友的数据
        foreach ($list as $k => &$v) {
            $v['labels'] = json_decode($v['labels'], true);
            $v['siteLabels'] = json_decode($v['siteLabels'], true);
            $v['createTime'] = !empty($v['createTime']) ? date('Y-m-d H:i:s', $v['createTime']) : '';
            $v['updateTime'] = !empty($v['updateTime']) ? date('Y-m-d H:i:s', $v['updateTime']) : '';
            $v['passTime'] = !empty($v['passTime']) ? date('Y-m-d H:i:s', $v['passTime']) : '';
            $v['aiType'] = isset($aiTypeData[$v['id']]) ? $aiTypeData[$v['id']] : 0;
        }
        unset($v);

        return ResponseHelper::success(['list' => $list, 'total' => $total]);
    }

    /**
     * 获取单个好友详情
     * @return \think\response\Json
     */
    public function getDetail()
    {
        $friendId = $this->request->param('id');
        $accountId = $this->getUserInfo('s2_accountId');

        if (empty($accountId)) {
            return ResponseHelper::error('请先登录');
        }
        
        if (empty($friendId)) {
            return ResponseHelper::error('好友ID不能为空');
        }
        
        // 查询好友详情
        $friend = Db::table('s2_wechat_friend')
            ->where(['id' => $friendId, 'isDeleted' => 0])
            ->find();

        if (empty($friend)) {
            return ResponseHelper::error('好友不存在');
        }
        
        // 处理好友数据
        $friend['labels'] = json_decode($friend['labels'], true);
        $friend['siteLabels'] = json_decode($friend['siteLabels'], true);
        $friend['createTime'] = !empty($friend['createTime']) ? date('Y-m-d H:i:s', $friend['createTime']) : '';
        $friend['updateTime'] = !empty($friend['updateTime']) ? date('Y-m-d H:i:s', $friend['updateTime']) : '';
        $friend['passTime'] = !empty($friend['passTime']) ? date('Y-m-d H:i:s', $friend['passTime']) : '';

        // 获取AI类型设置
        $aiTypeSetting = FriendSettings::where('friendId', $friendId)->find();
        $friend['aiType'] = $aiTypeSetting ? $aiTypeSetting['type'] : 0;

        return ResponseHelper::success(['detail' => $friend]);
    }

    /**
     * 更新好友资料（公司、姓名、手机号等字段可单独更新）
     * @return \think\response\Json
     */
    public function updateFriendInfo()
    {
        $friendId = $this->request->param('id');
        $accountId = $this->getUserInfo('s2_accountId');

        if (empty($accountId)) {
            return ResponseHelper::error('请先登录');
        }

        if (empty($friendId)) {
            return ResponseHelper::error('好友ID不能为空');
        }

        $friend = Db::table('s2_wechat_friend')
            ->where(['id' => $friendId, 'accountId' => $accountId, 'isDeleted' => 0])
            ->find();

        if (empty($friend)) {
            return ResponseHelper::error('好友不存在或无权限操作');
        }

        $requestData = $this->request->param();
        $updatableColumns = [
            'phone',
            'conRemark',
        ];
        $columnUpdates = [];

        foreach ($updatableColumns as $field) {
            if (array_key_exists($field, $requestData)) {
                $columnUpdates[$field] = $requestData[$field];
            }
        }

        $extendFieldsData = [];
        if (!empty($friend['extendFields'])) {
            $decodedExtend = json_decode($friend['extendFields'], true);
            $extendFieldsData = is_array($decodedExtend) ? $decodedExtend : [];
        }

        $extendFieldKeys = [
            'company',
            'name',
            'position',
            'email',
            'address',
            'wechat',
            'qq',
            'remark'
        ];
        $extendFieldsUpdated = false;

        foreach ($extendFieldKeys as $key) {
            if (array_key_exists($key, $requestData)) {
                $extendFieldsData[$key] = $requestData[$key];
                $extendFieldsUpdated = true;
            }
        }

        if ($extendFieldsUpdated) {
            $columnUpdates['extendFields'] = json_encode($extendFieldsData, JSON_UNESCAPED_UNICODE);
        }

        if (empty($columnUpdates)) {
            return ResponseHelper::error('没有可更新的字段');
        }

        $columnUpdates['updateTime'] = time();

        try {
            Db::table('s2_wechat_friend')->where('id', $friendId)->update($columnUpdates);
        } catch (\Exception $e) {
            return ResponseHelper::error('更新失败：' . $e->getMessage());
        }

        return ResponseHelper::success(['id' => $friendId]);
    }

    /**
     * 获取添加好友任务记录列表（全新功能）
     * 返回当前账号的所有添加好友任务记录，无论是否通过都展示
     * 包含：添加者头像、昵称、微信号、添加状态、添加时间、通过时间等信息
     * @return \think\response\Json
     */
    public function getAddTaskList()
    {
        $page = $this->request->param('page', 1);
        $limit = $this->request->param('limit', 10);
        $status = $this->request->param('status', ''); // 可选：筛选状态 0执行中，1执行成功，2执行失败
        $accountId = $this->getUserInfo('s2_accountId');

        if (empty($accountId)) {
            return ResponseHelper::error('请先登录');
        }

        // 直接使用operatorAccountId查询添加好友任务记录
        $query = Db::table('s2_friend_task')
            ->where('operatorAccountId', $accountId)
            ->order('createTime desc');

        // 如果指定了状态筛选
        if ($status !== '' && $status !== null) {
            $query->where('status', $status);
        }

        $total = $query->count();
        $tasks = $query->page($page, $limit)->select();


        // 处理任务数据
        $list = [];
        foreach ($tasks as $task) {
            // 提取所有任务的phone、wechatId，用于查询好友信息（获取通过时间）
            $friendInfo = Db::table('s2_wechat_friend')
                ->where(['isDeleted' => 0, 'ownerWechatId' => $task['wechatId']])
                ->where(function ($query) use ($task) {
                    $query->whereLike('phone', '%'.$task['phone'].'%')->whereOr('alias', $task['phone'])->whereOr('wechatId', $task['phone']);
                })->field('phone,wechatId,alias,passTime,nickname')->find();



            $item = [
                'taskId' => $task['id'] ?? 0,
                'phone' => $task['phone'] ?? '',
                'wechatId' => $task['wechatId'] ?? '',
                'alias' => $task['alias'] ?? '',
                // 添加者信息
                'adder' => [
                    'avatar' => $task['wechatAvatar'] ?? '',           // 添加者头像
                    'nickname' => $task['wechatNickname'] ?? '',      // 添加者昵称
                    'username' => $task['accountUsername'] ?? '',     // 添加者微信号
                    'accountNickname' => $task['accountNickname'] ?? '', // 账号昵称
                    'accountRealName' => $task['accountRealName'] ?? '', // 账号真实姓名
                ],
                // 添加状态
                'status' => [
                    'code' => $task['status'] ?? 0,                   // 状态码：0执行中，1执行成功，2执行失败
                    'text' => $this->getTaskStatusText($task['status'] ?? 0), // 状态文本
                    'extra' => ''
                ],
                // 时间信息
                'time' => [
                    'addTime' => !empty($task['createTime']) ? date('Y-m-d H:i:s', $task['createTime']) : '', // 添加时间
                    'addTimeStamp' => $task['createTime'] ?? 0,        // 添加时间戳
                    'updateTime' => !empty($task['updateTime']) ? date('Y-m-d H:i:s', $task['updateTime']) : '', // 更新时间
                    'updateTimeStamp' => $task['updateTime'] ?? 0,     // 更新时间戳
                    'passTime' => !empty($friendInfo['passTime']) ? date('Y-m-d H:i:s', $friendInfo['passTime']) : '', // 通过时间
                    'passTimeStamp' => $friendInfo['passTime'] ?? 0,   // 通过时间戳
                ],
                // 好友信息（如果已通过）
                'friend' => [
                    'nickname' => $friendInfo['nickname'] ?? '',       // 好友昵称
                    'isPassed' => !empty($friendInfo['passTime']),    // 是否已通过
                ],
                // 其他信息
                'other' => [
                    'msgContent' => $task['msgContent'] ?? '',         // 验证消息
                    'remark' => $task['remark'] ?? '',                // 备注
                    'from' => $task['from'] ?? '',                    // 来源
                    'labels' => !empty($task['labels']) ? explode(',', $task['labels']) : [], // 标签
                ]
            ];

            $list[] = $item;
        }

        return ResponseHelper::success(['list' => $list, 'total' => $total]);
    }


    /**
     * 获取任务状态文本
     * @param int $status 状态码
     * @return string 状态文本
     */
    private function getTaskStatusText($status)
    {
        $statusMap = [
            0 => '执行中',
            1 => '执行成功',
            2 => '执行失败',
        ];

        return isset($statusMap[$status]) ? $statusMap[$status] : '未知状态';
    }
}