<?php

namespace app\cunkebao\controller;

use app\common\model\Device as DeviceModel;
use app\common\model\DeviceWechatLogin as DeviceWechatLoginModel;
use app\common\model\WechatCustomer as WechatCustomerModel;
use app\cunkebao\model\ContentLibrary;
use app\cunkebao\model\ContentItem;
use library\s2\titleFavicon;
use think\Controller;
use think\Db;
use app\api\controller\WebSocketController;
use think\facade\Cache;
use think\facade\Env;
use app\api\controller\AutomaticAssign;
use think\facade\Request;
use PHPExcel_IOFactory;
use app\common\util\AliyunOSS;

/**
 * 内容库控制器
 */
class ContentLibraryController extends Controller
{
    /************************************
     * 内容库基础管理功能
     ************************************/

    /**
     * 创建内容库
     * @return \think\response\Json
     */
    public function create()
    {
        if (!$this->request->isPost()) {
            return json(['code' => 400, 'msg' => '请求方式错误']);
        }

        // 获取请求参数
        $param = $this->request->post();

        // 验证参数
        if (empty($param['name'])) {
            return json(['code' => 400, 'msg' => '内容库名称不能为空']);
        }


        // 检查内容库名称是否已存在
        $where = [
            ['name', '=', $param['name']],
            ['companyId', '=', $this->request->userInfo['companyId']],
            ['isDel', '=', 0]
        ];
        if (empty($this->request->userInfo['isAdmin'])) {
            $where[] = ['userId', '=', $this->request->userInfo['id']];
        }

        // 查询内容库是否存在
        $exists = ContentLibrary::where($where)->find();


        if ($exists) {
            return json(['code' => 400, 'msg' => '内容库名称已存在']);
        }

        Db::startTrans();
        try {

            $keywordInclude = isset($param['keywordInclude']) ? json_encode($param['keywordInclude'], 256) : json_encode([]);
            $keywordExclude = isset($param['keywordExclude']) ? json_encode($param['keywordExclude'], 256) : json_encode([]);
            $devices = isset($param['devices']) ? json_encode($param['devices'], 256) : json_encode([]);
            $sourceType = isset($param['sourceType']) ? $param['sourceType'] : 1;


            // 构建数据
            $data = [
                'name' => $param['name'],
                // 数据来源配置
                'sourceFriends' => $sourceType == 1 && isset($param['friendsGroups']) ? json_encode($param['friendsGroups']) : json_encode([]), // 选择的微信好友
                'sourceGroups' => $sourceType == 2 && isset($param['wechatGroups']) ? json_encode($param['wechatGroups']) : json_encode([]), // 选择的微信群
                'groupMembers' => $sourceType == 2 && isset($param['groupMembers']) ? json_encode($param['groupMembers']) : json_encode([]), // 群组成员
                'catchType' => isset($param['catchType']) ? json_encode($param['catchType']) : json_encode([]), // 采集类型
                'devices' => $devices,
                // 关键词配置
                'keywordInclude' => $keywordInclude, // 包含的关键词
                'keywordExclude' => $keywordExclude, // 排除的关键词
                // AI配置
                'aiEnabled' => isset($param['aiEnabled']) ? $param['aiEnabled'] : 0, // 是否启用AI
                'aiPrompt' => isset($param['aiPrompt']) ? $param['aiPrompt'] : '', // AI提示词
                // 时间配置
                'timeEnabled' => isset($param['timeEnabled']) ? $param['timeEnabled'] : 0, // 是否启用时间限制
                'timeStart' => isset($param['startTime']) ? strtotime($param['startTime']) : 0, // 开始时间（转换为时间戳）
                'timeEnd' => isset($param['endTime']) ? strtotime($param['endTime']) : 0, // 结束时间（转换为时间戳）
                // 来源类型
                'sourceType' => $sourceType, // 1=好友，2=群，3=好友和群
                // 表单类型
                'formType' => isset($param['formType']) ? intval($param['formType']) : 1, // 表单类型，默认为0
                // 基础信息
                'status' => isset($param['status']) ? $param['status'] : 0, // 状态：0=禁用，1=启用
                'userId' => $this->request->userInfo['id'],
                'companyId' => $this->request->userInfo['companyId'],
                'createTime' => time(),
                'updateTime' => time()
            ];

            // 创建内容库
            $library = new ContentLibrary;
            $result = $library->save($data);

            if (!$result) {
                Db::rollback();
                return json(['code' => 500, 'msg' => '创建内容库失败']);
            }

            Db::commit();
            return json(['code' => 200, 'msg' => '创建成功', 'data' => ['id' => $library->id]]);
        } catch (\Exception $e) {
            Db::rollback();
            return json(['code' => 500, 'msg' => '创建失败：' . $e->getMessage()]);
        }
    }

    /**
     * 获取内容库列表
     * @return \think\response\Json
     */
    public function getList()
    {
        $page = $this->request->param('page', 1);
        $limit = $this->request->param('limit', 10);
        $keyword = $this->request->param('keyword', '');
        $sourceType = $this->request->param('sourceType', ''); // 来源类型，1=好友，2=群
        $formType = $this->request->param('formType', 0); // 表单类型筛选
        $companyId = $this->request->userInfo['companyId'];
        $userId = $this->request->userInfo['id'];
        $isAdmin = !empty($this->request->userInfo['isAdmin']);

        // 构建基础查询条件
        $where = [
            ['companyId', '=', $companyId],
            ['isDel', '=', 0]  // 只查询未删除的记录
        ];

        // 非管理员只能查看自己的内容库
        if (!$isAdmin) {
            $where[] = ['userId', '=', $userId];
        }

        // 添加名称模糊搜索
        if ($keyword !== '') {
            $where[] = ['name', 'like', '%' . $keyword . '%'];
        }

        // 添加来源类型筛选
        if (!empty($sourceType)) {
            $where[] = ['sourceType', '=', $sourceType];
        }

        // 添加表单类型筛选
        if ($formType !== '') {
            $where[] = ['formType', '=', $formType];
        }

        // 获取总记录数
        $total = ContentLibrary::where($where)->count();

        // 获取分页数据
        $list = ContentLibrary::where($where)
            ->field('id,name,sourceFriends,sourceGroups,keywordInclude,keywordExclude,aiEnabled,aiPrompt,timeEnabled,timeStart,timeEnd,status,sourceType,formType,userId,createTime,updateTime')
            ->with(['user' => function ($query) {
                $query->field('id,username');
            }])
            ->order('id', 'desc')
            ->page($page, $limit)
            ->select();

        // 收集所有需要查询的ID
        $libraryIds = [];
        $friendIdsByLibrary = [];
        $groupIdsByLibrary = [];

        foreach ($list as $item) {
            $libraryIds[] = $item['id'];

            // 解析JSON字段
            $item['sourceFriends'] = json_decode($item['sourceFriends'] ?: '[]', true);
            $item['sourceGroups'] = json_decode($item['sourceGroups'] ?: '[]', true);
            $item['keywordInclude'] = json_decode($item['keywordInclude'] ?: '[]', true);
            $item['keywordExclude'] = json_decode($item['keywordExclude'] ?: '[]', true);

            // 收集好友和群组ID
            if (!empty($item['sourceFriends']) && $item['sourceType'] == 1) {
                $friendIdsByLibrary[$item['id']] = $item['sourceFriends'];
            }

            if (!empty($item['sourceGroups']) && $item['sourceType'] == 2) {
                $groupIdsByLibrary[$item['id']] = $item['sourceGroups'];
            }
        }

        // 批量查询内容项数量
        $itemCounts = [];
        if (!empty($libraryIds)) {
            $counts = Db::name('content_item')
                ->field('libraryId, COUNT(*) as count')
                ->whereIn('libraryId', $libraryIds)
                ->where('isDel', 0)
                ->group('libraryId')
                ->select();

            foreach ($counts as $count) {
                $itemCounts[$count['libraryId']] = $count['count'];
            }
        }

        // 批量查询好友信息
        $friendsInfoMap = [];
        $allFriendIds = [];
        foreach ($friendIdsByLibrary as $libraryId => $friendIds) {
            if (!empty($friendIds)) {
                $allFriendIds = array_merge($allFriendIds, $friendIds);
            }
        }

        if (!empty($allFriendIds)) {
            $allFriendIds = array_unique($allFriendIds);
            $friendsInfo = Db::name('wechat_friendship')->alias('wf')
                ->field('wf.id,wf.wechatId, wa.nickname, wa.avatar')
                ->join('wechat_account wa', 'wf.wechatId = wa.wechatId')
                ->whereIn('wf.id', $allFriendIds)
                ->select();

            foreach ($friendsInfo as $friend) {
                $friendsInfoMap[$friend['id']] = $friend;
            }
        }

        // 批量查询群组信息
        $groupsInfoMap = [];
        $allGroupIds = [];
        foreach ($groupIdsByLibrary as $libraryId => $groupIds) {
            if (!empty($groupIds)) {
                $allGroupIds = array_merge($allGroupIds, $groupIds);
            }
        }

        if (!empty($allGroupIds)) {
            $allGroupIds = array_unique($allGroupIds);
            $groupsInfo = Db::name('wechat_group')->alias('g')
                ->field('g.id, g.chatroomId, g.name, g.avatar, g.ownerWechatId')
                ->whereIn('g.id', $allGroupIds)
                ->select();

            foreach ($groupsInfo as $group) {
                $groupsInfoMap[$group['id']] = $group;
            }
        }

        // 处理每个内容库的数据
        foreach ($list as &$item) {
            // 添加创建人名称
            $item['creatorName'] = $item['user']['username'] ?? '';

            // 添加内容项数量
            $item['itemCount'] = $itemCounts[$item['id']] ?? 0;

            // 处理好友信息
            if (!empty($friendIdsByLibrary[$item['id']])) {
                $selectedFriends = [];
                foreach ($friendIdsByLibrary[$item['id']] as $friendId) {
                    if (isset($friendsInfoMap[$friendId])) {
                        $selectedFriends[] = $friendsInfoMap[$friendId];
                    }
                }
                $item['selectedFriends'] = $selectedFriends;
            }

            // 处理群组信息
            if (!empty($groupIdsByLibrary[$item['id']])) {
                $selectedGroups = [];
                foreach ($groupIdsByLibrary[$item['id']] as $groupId) {
                    if (isset($groupsInfoMap[$groupId])) {
                        $selectedGroups[] = $groupsInfoMap[$groupId];
                    }
                }
                $item['selectedGroups'] = $selectedGroups;
            }

            unset($item['user']); // 移除关联数据
        }

        return json([
            'code' => 200,
            'msg' => '获取成功',
            'data' => [
                'list' => $list,
                'total' => $total,
                'page' => $page,
            ]
        ]);
    }

    /**
     * 获取内容库详情
     * @return \think\response\Json
     */
    public function detail()
    {
        $id = $this->request->param('id', 0);
        $companyId = $this->request->userInfo['companyId'];
        $userId = $this->request->userInfo['id'];
        $isAdmin = !empty($this->request->userInfo['isAdmin']);

        if (empty($id)) {
            return json(['code' => 400, 'msg' => '参数错误']);
        }

        // 构建查询条件
        $where = [
            ['id', '=', $id],
            ['companyId', '=', $companyId],
            ['isDel', '=', 0]  // 只查询未删除的记录
        ];

        if (!$isAdmin) {
            $where[] = ['userId', '=', $userId];
        }

        // 查询内容库信息
        $library = ContentLibrary::where($where)
            ->field('id,name,sourceType,formType,devices ,sourceFriends,sourceGroups,keywordInclude,keywordExclude,aiEnabled,aiPrompt,timeEnabled,timeStart,timeEnd,status,userId,companyId,createTime,updateTime,groupMembers,catchType')
            ->find();

        if (empty($library)) {
            return json(['code' => 500, 'msg' => '内容库不存在']);
        }

        // 处理JSON字段转数组
        $library['friendsGroups'] = json_decode($library['sourceFriends'] ?: [], true);
        $library['wechatGroups'] = json_decode($library['sourceGroups'] ?: [], true);
        $library['keywordInclude'] = json_decode($library['keywordInclude'] ?: [], true);
        $library['keywordExclude'] = json_decode($library['keywordExclude'] ?: [], true);
        $library['groupMembers'] = json_decode($library['groupMembers'] ?: [], true);
        $library['catchType'] = json_decode($library['catchType'] ?: [], true);
        $library['deviceGroups'] = json_decode($library['devices'] ?: [], true);
        unset($library['sourceFriends'], $library['sourceGroups'], $library['devices']);

        // 将时间戳转换为日期格式（精确到日）
        if (!empty($library['timeStart'])) {
            $library['timeStart'] = date('Y-m-d', $library['timeStart']);
        }
        if (!empty($library['timeEnd'])) {
            $library['timeEnd'] = date('Y-m-d', $library['timeEnd']);
        }

        // 初始化选项数组
        $library['friendsGroupsOptions'] = [];
        $library['wechatGroupsOptions'] = [];
        $library['groupMembersOptions'] = [];

        // 批量查询好友信息
        if (!empty($library['friendsGroups'])) {
            $friendIds = $library['friendsGroups'];
            if (!empty($friendIds)) {
                // 查询好友信息，使用wechat_friendship表
                $library['friendsGroupsOptions'] = Db::name('wechat_friendship')->alias('wf')
                    ->field('wf.id,wf.wechatId, wa.nickname, wa.avatar')
                    ->join('wechat_account wa', 'wf.wechatId = wa.wechatId')
                    ->order('wa.id DESC')
                    ->whereIn('wf.id', $friendIds)
                    ->select();
            }
        }

        // 批量查询群组信息
        if (!empty($library['wechatGroups'])) {
            $groupIds = $library['wechatGroups'];
            if (!empty($groupIds)) {
                // 查询群组信息
                $library['wechatGroupsOptions'] = Db::name('wechat_group')->alias('g')
                    ->field('g.id, g.chatroomId, g.name, g.avatar, g.ownerWechatId, wa.nickname as ownerNickname, wa.avatar as ownerAvatar, wa.alias as ownerAlias')
                    ->join('wechat_account wa', 'g.ownerWechatId = wa.wechatId', 'LEFT') // 使用LEFT JOIN避免因群主不存在导致查询失败
                    ->whereIn('g.id', $groupIds)
                    ->select();
            }
        }

        // 批量查询群成员信息
        if (!empty($library['groupMembers'])) {
            // groupMembers格式: {"826825": ["413771", "413769"], "840818": ["496300", "496302"]}
            // 键是群组ID，值是成员ID数组
            $allMemberIds = [];
            $groupMembersMap = [];

            if (is_array($library['groupMembers'])) {
                foreach ($library['groupMembers'] as $groupId => $memberIds) {
                    if (is_array($memberIds) && !empty($memberIds)) {
                        $allMemberIds = array_merge($allMemberIds, $memberIds);
                        // 保存群组ID和成员ID的映射关系
                        $groupMembersMap[$groupId] = $memberIds;
                    }
                }
            }

            if (!empty($allMemberIds)) {
                // 去重
                $allMemberIds = array_unique($allMemberIds);

                // 查询群成员信息
                $members = Db::table('s2_wechat_chatroom_member')
                    ->field('id, chatroomId, wechatId, nickname, avatar, conRemark, alias, friendType, createTime, updateTime')
                    ->whereIn('id', $allMemberIds)
                    ->select();

                // 将成员数据按ID建立索引
                $membersById = [];
                foreach ($members as $member) {
                    // 格式化时间字段
                    $member['createTime'] = !empty($member['createTime']) ? date('Y-m-d H:i:s', $member['createTime']) : '';
                    $member['updateTime'] = !empty($member['updateTime']) ? date('Y-m-d H:i:s', $member['updateTime']) : '';
                    $membersById[$member['id']] = $member;
                }

                // 按照群组ID分组返回
                $groupMembersOptions = [];
                foreach ($groupMembersMap as $groupId => $memberIds) {
                    $groupMembersOptions[$groupId] = [];
                    foreach ($memberIds as $memberId) {
                        if (isset($membersById[$memberId])) {
                            $groupMembersOptions[$groupId][] = $membersById[$memberId];
                        }
                    }
                }

                $library['groupMembersOptions'] = $groupMembersOptions;
            } else {
                $library['groupMembersOptions'] = [];
            }
        } else {
            $library['groupMembersOptions'] = [];
        }

        //获取设备信息
        if (!empty($library['deviceGroups'])) {
            $deviceList = DeviceModel::alias('d')
                ->field([
                    'd.id', 'd.imei', 'd.memo', 'd.alive',
                    'l.wechatId',
                    'a.nickname', 'a.alias', 'a.avatar', 'a.alias', '0 totalFriend'
                ])
                ->leftJoin('device_wechat_login l', 'd.id = l.deviceId and l.alive =' . DeviceWechatLoginModel::ALIVE_WECHAT_ACTIVE . ' and l.companyId = d.companyId')
                ->leftJoin('wechat_account a', 'l.wechatId = a.wechatId')
                ->whereIn('d.id', $library['deviceGroups'])
                ->order('d.id desc')
                ->select();

            foreach ($deviceList as &$device) {
                $curstomer = WechatCustomerModel::field('friendShip')->where(['wechatId' => $device['wechatId']])->find();
                $device['totalFriend'] = $curstomer->friendShip->totalFriend ?? 0;
            }
            unset($device);
            $library['deviceGroupsOptions'] = $deviceList;
        } else {
            $library['deviceGroupsOptions'] = [];
        }


        return json([
            'code' => 200,
            'msg' => '获取成功',
            'data' => $library
        ]);
    }

    /**
     * 更新内容库
     * @return \think\response\Json
     */
    public function update()
    {
        if (!$this->request->isPost()) {
            return json(['code' => 400, 'msg' => '请求方式错误']);
        }

        // 获取请求参数
        $param = $this->request->post();

        // 简单验证
        if (empty($param['id'])) {
            return json(['code' => 400, 'msg' => '参数错误']);
        }

        if (empty($param['name'])) {
            return json(['code' => 400, 'msg' => '内容库名称不能为空']);
        }


        $where = [
            ['companyId', '=', $this->request->userInfo['companyId']],
            ['isDel', '=', 0],  // 只查询未删除的记录
            ['id', '=', $param['id']]
        ];

        if (empty($this->request->userInfo['isAdmin'])) {
            $where[] = ['userId', '=', $this->request->userInfo['id']];
        }

        // 查询内容库是否存在
        $library = ContentLibrary::where($where)->find();

        if (!$library) {
            return json(['code' => 500, 'msg' => '内容库不存在']);
        }

        Db::startTrans();
        try {

            $keywordInclude = isset($param['keywordInclude']) ? json_encode($param['keywordInclude'], 256) : json_encode([]);
            $keywordExclude = isset($param['keywordExclude']) ? json_encode($param['keywordExclude'], 256) : json_encode([]);
            $devices = isset($param['devices']) ? json_encode($param['devices'], 256) : json_encode([]);

            // 更新内容库基本信息
            $library->name = $param['name'];
            $library->sourceType = isset($param['sourceType']) ? $param['sourceType'] : 1;
            $library->sourceFriends = $param['sourceType'] == 1 && isset($param['friendsGroups']) ? json_encode($param['friendsGroups']) : json_encode([]);
            $library->sourceGroups = $param['sourceType'] == 2 && isset($param['wechatGroups']) ? json_encode($param['wechatGroups']) : json_encode([]);
            $library->groupMembers = $param['sourceType'] == 2 && isset($param['groupMembers']) ? json_encode($param['groupMembers']) : json_encode([]);
            $library->catchType = isset($param['catchType']) ? json_encode($param['catchType']) : json_encode([]);// 采集类型
            $library->devices = $devices;
            $library->keywordInclude = $keywordInclude;
            $library->keywordExclude = $keywordExclude;
            $library->aiEnabled = isset($param['aiEnabled']) ? $param['aiEnabled'] : 0;
            $library->aiPrompt = isset($param['aiPrompt']) ? $param['aiPrompt'] : '';
            $library->timeEnabled = isset($param['timeEnabled']) ? $param['timeEnabled'] : 0;
            $library->timeStart = isset($param['startTime']) ? strtotime($param['startTime']) : 0;
            $library->timeEnd = isset($param['endTime']) ? strtotime($param['endTime']) : 0;
            $library->formType = isset($param['formType']) ? intval($param['formType']) : $library->formType; // 表单类型，如果未传则保持原值
            $library->status = isset($param['status']) ? $param['status'] : 0;
            $library->updateTime = time();
            $library->save();

            Db::commit();
            return json(['code' => 200, 'msg' => '更新成功']);
        } catch (\Exception $e) {
            Db::rollback();
            return json(['code' => 500, 'msg' => '更新失败：' . $e->getMessage()]);
        }
    }

    /**
     * 删除内容库
     * @return \think\response\Json
     */
    public function delete()
    {
        $id = $this->request->param('id', 0);
        if (empty($id)) {
            return json(['code' => 400, 'msg' => '参数错误']);
        }


        $where = [
            ['id', '=', $id],
            ['companyId', '=', $this->request->userInfo['companyId']],
            ['isDel', '=', 0]
        ];
        if (empty($this->request->userInfo['isAdmin'])) {
            $where[] = ['userId', '=', $this->request->userInfo['id']];
        }
        $library = ContentLibrary::where($where)->find();

        if (empty($library)) {
            return json(['code' => 500, 'msg' => '内容库不存在']);
        }

        try {
            // 软删除
            $library->isDel = 1;
            $library->deleteTime = time();
            $library->save();

            return json(['code' => 200, 'msg' => '删除成功']);
        } catch (\Exception $e) {
            return json(['code' => 500, 'msg' => '删除失败：' . $e->getMessage()]);
        }
    }

    /************************************
     * 内容项目管理功能
     ************************************/

    /**
     * 获取内容库素材列表
     * @return \think\response\Json
     */
    public function getItemList()
    {
        $page = $this->request->param('page', 1);
        $limit = $this->request->param('limit', 10);
        $libraryId = $this->request->param('libraryId', 0);
        $keyword = $this->request->param('keyword', ''); // 搜索关键词
        $companyId = $this->request->userInfo['companyId'];
        $userId = $this->request->userInfo['id'];
        $isAdmin = !empty($this->request->userInfo['isAdmin']);

        if (empty($libraryId)) {
            return json(['code' => 400, 'msg' => '内容库ID不能为空']);
        }

        // 验证内容库权限
        $libraryWhere = [
            ['id', '=', $libraryId],
            ['companyId', '=', $companyId],
            ['isDel', '=', 0]
        ];


        if (!$isAdmin) {
            $libraryWhere[] = ['userId', '=', $userId];
        }

        $library = ContentLibrary::where($libraryWhere)->find();

        if (empty($library)) {
            return json(['code' => 500, 'msg' => '内容库不存在或无权限访问']);
        }

        // 构建查询条件
        $where = [
            ['libraryId', '=', $libraryId],
            ['isDel', '=', 0]
        ];

        // 关键词搜索
        if (!empty($keyword)) {
            $where[] = ['content|title', 'like', '%' . $keyword . '%'];
        }

        // 获取总数
        $total = ContentItem::where($where)->count();

        // 查询数据
        $list = ContentItem::where($where)
            ->field('id,libraryId,type,title,content,contentAi,contentType,resUrls,urls,friendId,wechatId,wechatChatroomId,createTime,createMomentTime,createMessageTime,coverImage,ossUrls')
            ->order('createMomentTime DESC,createMessageTime DESC,createTime DESC')
            ->page($page, $limit)
            ->select();

        // 收集需要查询的ID
        $friendIds = [];
        $chatroomIds = [];
        $wechatIds = [];

        foreach ($list as $item) {
            if ($item['type'] == 'moment' && !empty($item['friendId'])) {
                $friendIds[] = $item['friendId'];
            } else if ($item['type'] == 'group_message' && !empty($item['wechatChatroomId'])) {
                $chatroomIds[] = $item['wechatChatroomId'];
                if (!empty($item['wechatId'])) {
                    $wechatIds[] = $item['wechatId'];
                }
            }
        }

        // 批量查询好友信息
        $friendInfoMap = [];
        if (!empty($friendIds)) {
            $friendIds = array_unique($friendIds);
            $friendInfos = Db::table('s2_wechat_friend')
                ->whereIn('id', $friendIds)
                ->field('id, nickname, avatar')
                ->select();

            foreach ($friendInfos as $info) {
                $friendInfoMap[$info['id']] = $info;
            }
        }

        // 批量查询群成员信息
        $memberInfoMap = [];
        if (!empty($wechatIds)) {
            $wechatIds = array_unique($wechatIds);
            $memberInfos = Db::table('s2_wechat_chatroom_member')
                ->whereIn('wechatId', $wechatIds)
                ->field('wechatId, nickname, avatar')
                ->select();

            foreach ($memberInfos as $info) {
                $memberInfoMap[$info['wechatId']] = $info;
            }
        }


        // 处理数据
        foreach ($list as &$item) {
            // 使用AI内容（如果有）
            $item['content'] = !empty($item['contentAi']) ? $item['contentAi'] : $item['content'];

            // 处理JSON字段
            $item['resUrls'] = json_decode($item['resUrls'] ?: [], true);
            $item['urls'] = json_decode($item['urls'] ?: [], true);
            $item['ossUrls'] = json_decode($item['ossUrls'] ?: [], true);

            if (!empty($item['ossUrls']) && count($item['ossUrls']) > 0) {
                $item['resUrls'] = $item['ossUrls'];
            }


            // 格式化时间
            if (!empty($item['createMomentTime']) && is_numeric($item['createMomentTime'])) {
                $item['time'] = date('Y-m-d H:i:s', (int)$item['createMomentTime']);
            } elseif (!empty($item['createMessageTime']) && is_numeric($item['createMessageTime'])) {
                $item['time'] = date('Y-m-d H:i:s', (int)$item['createMessageTime']);
            } elseif (!empty($item['createTime']) && is_numeric($item['createTime'])) {
                $item['time'] = date('Y-m-d H:i:s', (int)$item['createTime']);
            } else {
                $item['time'] = date('Y-m-d H:i:s'); // 如果没有有效的时间戳，使用当前时间
            }

            // 设置发送者信息
            $item['senderNickname'] = '';
            $item['senderAvatar'] = '';

            // 从映射表获取发送者信息
            if ($item['type'] == 'moment' && !empty($item['friendId'])) {
                if (isset($friendInfoMap[$item['friendId']])) {
                    $friendInfo = $friendInfoMap[$item['friendId']];
                    $item['senderNickname'] = $friendInfo['nickname'] ?? '';
                    $item['senderAvatar'] = $friendInfo['avatar'] ?? '';
                }
            } else if ($item['type'] == 'group_message' && !empty($item['wechatId'])) {
                if (isset($memberInfoMap[$item['wechatId']])) {
                    $memberInfo = $memberInfoMap[$item['wechatId']];
                    $item['senderNickname'] = $memberInfo['nickname'] ?? '';
                    $item['senderAvatar'] = $memberInfo['avatar'] ?? '';
                }
            }

            unset($item['contentAi'], $item['ossUrls']);
        }

        return json([
            'code' => 200,
            'msg' => '获取成功',
            'data' => [
                'list' => $list,
                'total' => $total,
                'page' => $page,
                'limit' => $limit
            ]
        ]);
    }

    /**
     * 添加内容项目
     * @return \think\response\Json
     */
    public function addItem()
    {
        if (!$this->request->isPost()) {
            return json(['code' => 400, 'msg' => '请求方式错误']);
        }

        // 获取请求参数
        $param = $this->request->post();

        // A简单验证
        if (empty($param['libraryId'])) {
            return json(['code' => 400, 'msg' => '内容库ID不能为空']);
        }

        if (empty($param['type'])) {
            return json(['code' => 400, 'msg' => '内容类型不能为空']);
        }

        if (empty($param['content'])) {
            return json(['code' => 400, 'msg' => '内容数据不能为空']);
        }

        // 当类型为群消息时，限制图片只能上传一张
        if ($param['type'] == 'group_message') {
            $images = isset($param['images']) ? $param['images'] : [];
            if (is_string($images)) {
                $images = json_decode($images, true);
            }

            if (count($images) > 1) {
                return json(['code' => 400, 'msg' => '群消息类型只能上传一张图片']);
            }
        }

        $where = [
            ['id', '=', $param['libraryId']],
            ['companyId', '=', $this->request->userInfo['companyId']],
            ['isDel', '=', 0]
        ];
        if (empty($this->request->userInfo['isAdmin'])) {
            $where[] = ['userId', '=', $this->request->userInfo['id']];
        }

        // 查询内容库是否存在
        $library = ContentLibrary::where($where)->find();

        if (!$library) {
            return json(['code' => 500, 'msg' => '内容库不存在']);
        }

        try {
            // 创建内容项目
            $item = new ContentItem;
            $item->libraryId = $param['libraryId'];
            $item->contentType = $param['type'];
            $item->type = 'diy';
            $item->title = $param['title'] ?? '自定义内容';
            $item->content = $param['content'];
            $item->comment = $param['comment'] ?? '';
            $item->sendTime = strtotime($param['sendTime']);
            $item->resUrls = json_encode($param['resUrls'] ?? [], 256);
            $item->urls = json_encode($param['urls'] ?? [], 256);
            $item->ossUrls = json_encode($param['ossUrls'] ?? [], 256);
            $item->senderNickname = '系统创建';
            $item->coverImage = $param['coverImage'] ?? '';
            $item->save();

            return json(['code' => 200, 'msg' => '添加成功', 'data' => ['id' => $item->id]]);
        } catch (\Exception $e) {
            return json(['code' => 500, 'msg' => '添加失败：' . $e->getMessage()]);
        }
    }

    /**
     * 删除内容项目
     * @param int $id 内容项目ID
     * @return \think\response\Json
     */
    public function deleteItem()
    {

        $id = $this->request->param('id', 0);
        if (empty($id)) {
            return json(['code' => 400, 'msg' => '参数错误']);
        }


        $where = [
            ['i.id', '=', $id],
            ['l.companyId', '=', $this->request->userInfo['companyId']]
        ];

        if (empty($this->request->userInfo['isAdmin'])) {
            $where[] = ['l.userId', '=', $this->request->userInfo['id']];
        }

        // 查询内容项目是否存在并检查权限
        $item = ContentItem::alias('i')
            ->join('content_library l', 'i.libraryId = l.id')
            ->where($where)
            ->find();


        if (empty($item)) {
            return json(['code' => 500, 'msg' => '内容项目不存在或无权限操作']);
        }

        try {
            // 删除内容项目
            $service = new \app\cunkebao\service\ContentItemService();
            $result = $service->deleteItem($id);
            if ($result['code'] != 200) {
                return json($result);
            }

            return json(['code' => 200, 'msg' => '删除成功']);
        } catch (\Exception $e) {
            return json(['code' => 500, 'msg' => '删除失败：' . $e->getMessage()]);
        }
    }

    /**
     * 获取内容项目详情
     * @return \think\response\Json
     */
    public function getItemDetail()
    {
        $id = $this->request->param('id', 0);
        $userId = $this->request->userInfo['id'];
        $isAdmin = !empty($this->request->userInfo['isAdmin']);

        if (empty($id)) {
            return json(['code' => 400, 'msg' => '参数错误']);
        }

        // 构建查询条件
        $where = [
            ['i.id', '=', $id],
            ['i.isDel', '=', 0]
        ];

        // 非管理员只能查看自己的内容项
        if (!$isAdmin) {
            $where[] = ['l.userId', '=', $userId];
        }

        // 查询内容项目是否存在并检查权限
        $item = ContentItem::alias('i')
            ->join('content_library l', 'i.libraryId = l.id')
            ->where($where)
            ->field('i.*')
            ->find();

        if (empty($item)) {
            return json(['code' => 500, 'msg' => '内容项目不存在或无权限访问']);
        }

        // 处理JSON字段
        $item['resUrls'] = json_decode($item['resUrls'] ?: [], true);
        $item['urls'] = json_decode($item['urls'] ?: [], true);

        // 添加内容类型的文字描述
        $contentTypeMap = [
            0 => '未知',
            1 => '图片',
            2 => '链接',
            3 => '视频',
            4 => '文本',
            5 => '小程序',
            6 => '图文'
        ];
        $item['contentTypeName'] = $contentTypeMap[$item['contentType'] ?? 0] ?? '未知';

        // 格式化时间
        if (!empty($item['createMomentTime']) && is_numeric($item['createMomentTime'])) {
            $item['createMomentTimeFormatted'] = date('Y-m-d H:i:s', (int)$item['createMomentTime']);
        }
        if (!empty($item['createMessageTime']) && is_numeric($item['createMessageTime'])) {
            $item['createMessageTimeFormatted'] = date('Y-m-d H:i:s', (int)$item['createMessageTime']);
        }
        if (!empty($item['createTime']) && is_numeric($item['createTime'])) {
            $item['createTimeFormatted'] = date('Y-m-d H:i:s', (int)$item['createTime']);
        }

        // 格式化发送时间
        if (!empty($item['sendTime']) && is_numeric($item['sendTime'])) {
            $item['sendTimeFormatted'] = date('Y-m-d H:i:s', (int)$item['sendTime']);
            // 保持原字段兼容
            $item['sendTime'] = $item['sendTimeFormatted'];
        }

        // 初始化发送者和群组信息
        $item['senderInfo'] = [];
        $item['groupInfo'] = [];

        // 批量获取关联信息
        if ($item['type'] == 'moment' && !empty($item['friendId'])) {
            // 获取朋友圈发送者信息
            $friendInfo = Db::name('wechat_friendship')
                ->alias('wf')
                ->join('wechat_account wa', 'wf.wechatId = wa.wechatId', 'LEFT')
                ->where('wf.id', $item['friendId'])
                ->field('wf.id, wf.wechatId, wa.nickname, wa.avatar')
                ->find();

            if ($friendInfo) {
                $item['senderInfo'] = $friendInfo;
            }
        } elseif ($item['type'] == 'group_message' && !empty($item['wechatChatroomId'])) {
            // 获取群组信息
            $groupInfo = Db::name('wechat_group')
                ->where('id', $item['wechatChatroomId'])
                ->field('id, chatroomId, name, avatar, ownerWechatId')
                ->find();

            if ($groupInfo) {
                $item['groupInfo'] = $groupInfo;

                // 如果有发送者信息，也获取发送者详情
                if (!empty($item['wechatId'])) {
                    $senderInfo = Db::table('s2_wechat_chatroom_member')
                        ->where([
                            'chatroomId' => $groupInfo['chatroomId'],
                            'wechatId' => $item['wechatId']
                        ])
                        ->field('wechatId, nickname, avatar')
                        ->find();

                    if ($senderInfo) {
                        $item['senderInfo'] = $senderInfo;
                    }
                }
            }
        }

        // 如果有AI内容，添加到返回数据中
        if (!empty($item['contentAi'])) {
            $item['contentOriginal'] = $item['content'];
            $item['content'] = $item['contentAi'];
        }

        return json([
            'code' => 200,
            'msg' => '获取成功',
            'data' => $item
        ]);
    }

    /**
     * 更新内容项目
     * @return \think\response\Json
     */
    public function updateItem()
    {
        if (!$this->request->isPost()) {
            return json(['code' => 400, 'msg' => '请求方式错误']);
        }

        // 获取请求参数
        $param = $this->request->post();

        // 简单验证
        if (empty($param['id'])) {
            return json(['code' => 400, 'msg' => '参数错误']);
        }

        // 查询内容项目是否存在并检查权限
        $item = ContentItem::where([
            ['id', '=', $param['id']],
            ['isDel', '=', 0]
        ])->find();

        if (!$item) {
            return json(['code' => 500, 'msg' => '内容项目不存在或无权限操作']);
        }

        try {
            // 更新内容项目
            $item->title = $param['title'] ?? $item->title;
            $item->content = $param['content'] ?? $item->content;
            $item->comment = $param['comment'] ?? $item->comment;

            // 处理发送时间
            if (!empty($param['sendTime'])) {
                $item->sendTime = strtotime($param['sendTime']);
            }

            // 处理内容类型
            if (isset($param['contentType'])) {
                $item->contentType = $param['contentType'];
            }

            // 处理资源URL
            if (isset($param['resUrls'])) {
                $resUrls = is_string($param['resUrls']) ? json_decode($param['resUrls'], true) : $param['resUrls'];
                $item->resUrls = json_encode($resUrls, JSON_UNESCAPED_UNICODE);

                // 设置封面图片
                if (!empty($resUrls[0])) {
                    $item->coverImage = $resUrls[0];
                }
            }

            // 处理链接URL
            if (isset($param['urls'])) {
                $urls = is_string($param['urls']) ? json_decode($param['urls'], true) : $param['urls'];
                $item->urls = json_encode($urls, JSON_UNESCAPED_UNICODE);
            }

            // 处理地理位置信息
            if (isset($param['location'])) {
                $item->location = $param['location'];
            }
            if (isset($param['lat'])) {
                $item->lat = $param['lat'];
            }
            if (isset($param['lng'])) {
                $item->lng = $param['lng'];
            }

            // 更新修改时间
            $item->updateTime = time();
            // 保存更新
            $item->save();

            return json(['code' => 200, 'msg' => '更新成功']);
        } catch (\Exception $e) {
            return json(['code' => 500, 'msg' => '更新失败：' . $e->getMessage()]);
        }
    }


    public function aiEditContent()
    {

        $id = Request::param('id', '');
        $aiPrompt = Request::param('aiPrompt', '');
        $content = Request::param('content', '');
        $companyId = $this->request->userInfo['companyId'];
        // 简单验证
        if (empty($id) && empty($content)) {
            return json(['code' => 400, 'msg' => '参数错误']);
        }

        if (!empty($id)) {
            // 查询内容项目是否存在并检查权限
            $item = ContentItem::alias('ci')
                ->join('content_library cl', 'ci.libraryId = cl.id')
                ->where(['ci.id' => $id, 'ci.isDel' => 0, 'cl.isDel' => 0, 'cl.companyId' => $companyId])
                ->field('ci.*')
                ->find();
        } else {
            $item['content'] = $content;
        }

        if (empty($item)) {
            return json(['code' => 500, 'msg' => '内容项目不存在或无权限操作']);
        }

        if (empty($item['content'])) {
            return json(['code' => 500, 'msg' => '内容不能为空']);
        }
        $contentFront = !empty($item['contentAi']) ? $item['contentAi'] : $item['content'];
        if (!$this->request->isPost()) {
            try {
                $contentAi = $this->aiRewrite(['aiEnabled' => true, 'aiPrompt' => $aiPrompt], $contentFront);
                if (!empty($contentAi)) {
                    return json(['code' => 200, 'msg' => 'ai编写成功', 'data' => ['contentAfter' => $contentAi, 'contentFront' => $contentFront]]);
                } else {
                    return json(['code' => 500, 'msg' => 'ai编写失败']);
                }
            } catch (\Exception $e) {
                return json(['code' => 500, 'msg' => 'ai编写失败：' . $e->getMessage()]);
            }
        } else {
            if (empty($content)) {
                return json(['code' => 500, 'msg' => '新内容不能为空']);
            }
            $res = ContentItem::where(['id' => $item['id']])->update(['contentAi' => $content, 'updateTime' => time()]);
            if (!empty($res)) {
                return json(['code' => 200, 'msg' => '更新成功']);
            } else {
                return json(['code' => 500, 'msg' => '更新失败']);
            }
        }
    }


    /************************************
     * 数据采集相关功能
     ************************************/

    function getExternalPageDetails($url)
    {
        $html = file_get_contents($url);
        $dom = new \DOMDocument();
        @$dom->loadHTML($html);
        $xpath = new \DOMXPath($dom);

        // 获取标题
        $titleNode = $xpath->query('//title');
        $title = $titleNode->length > 0 ? $titleNode->item(0)->nodeValue : '';

        // 获取图标链接
        $iconNode = $xpath->query('//link[@rel="shortcut icon"]/@href');
        $icon = $iconNode->length > 0 ? $iconNode->item(0)->nodeValue : '';

        return ['title' => $title, 'icon' => $icon];
    }


    /**
     * 执行朋友圈采集任务
     * @return \think\response\Json
     */
    public function collectMoments()
    {
        // 查询条件：未删除且已开启的内容库
        $where = [
            ['isDel', '=', 0],      // 未删除
            ['status', '=', 1],     // 已开启
        ];

        // 查询符合条件的内容库
        $libraries = ContentLibrary::where($where)
            ->field('id,name,sourceType,sourceFriends,sourceGroups,keywordInclude,keywordExclude,aiEnabled,aiPrompt,timeEnabled,timeStart,timeEnd,status,userId,companyId,createTime,updateTime,groupMembers,catchType')
            ->order('id', 'desc')
            ->select()->toArray();

        if (empty($libraries)) {
            return json_encode(['code' => 200, 'msg' => '没有可用的内容库配置'], 256);
        }

        $successCount = 0;
        $failCount = 0;
        $results = [];
        $processedLibraries = 0;
        $totalLibraries = count($libraries);

        // 预处理内容库数据
        foreach ($libraries as &$library) {
            // 解析JSON字段
            $library['sourceFriends'] = json_decode($library['sourceFriends'] ?: [], true);
            $library['sourceGroups'] = json_decode($library['sourceGroups'] ?: [], true);
            $library['keywordInclude'] = json_decode($library['keywordInclude'] ?: [], true);
            $library['keywordExclude'] = json_decode($library['keywordExclude'] ?: [], true);
            $library['groupMembers'] = json_decode($library['groupMembers'] ?: [], true);
            $library['catchType'] = json_decode($library['catchType'] ?: [], true);
        }
        unset($library); // 解除引用

        // 处理每个内容库的采集任务
        foreach ($libraries as $library) {
            try {
                $processedLibraries++;

                // 根据数据来源类型执行不同的采集逻辑
                $collectResult = [
                    'status' => 'skipped',
                    'message' => '没有配置数据来源'
                ];

                switch ($library['sourceType']) {
                    case 1: // 好友类型
                        if (!empty($library['sourceFriends'])) {
                            $collectResult = $this->collectFromFriends($library);
                        }
                        break;

                    case 2: // 群类型
                        if (!empty($library['sourceGroups'])) {
                            $collectResult = $this->collectFromGroups($library);
                        }
                        break;

                    default:
                        $collectResult = [
                            'status' => 'failed',
                            'message' => '不支持的数据来源类型'
                        ];
                }

                // 统计成功和失败数量
                if ($collectResult['status'] == 'success') {
                    $successCount++;
                } elseif ($collectResult['status'] == 'failed' || $collectResult['status'] == 'error') {
                    $failCount++;
                }

                // 记录结果
                $results[] = [
                    'library_id' => $library['id'],
                    'library_name' => $library['name'],
                    'source_type' => $library['sourceType'] == 1 ? '好友' : ($library['sourceType'] == 2 ? '群组' : '未知'),
                    'status' => $collectResult['status'],
                    'message' => $collectResult['message'] ?? '',
                    'data' => $collectResult['data'] ?? []
                ];

                // 每处理5个内容库，释放一次内存
                if ($processedLibraries % 5 == 0 && $processedLibraries < $totalLibraries) {
                    gc_collect_cycles();
                }
            } catch (\Exception $e) {
                $failCount++;
                $results[] = [
                    'library_id' => $library['id'],
                    'library_name' => $library['name'],
                    'source_type' => $library['sourceType'] == 1 ? '好友' : ($library['sourceType'] == 2 ? '群组' : '未知'),
                    'status' => 'error',
                    'message' => $e->getMessage()
                ];

                // 记录错误日志
                \think\facade\Log::error('内容库采集错误: ' . $e->getMessage() . ' [库ID: ' . $library['id'] . ']');
            }
        }

        // 返回采集结果
        return json_encode([
            'code' => 200,
            'msg' => '采集任务执行完成',
            'data' => [
                'total' => $totalLibraries,
                'success' => $successCount,
                'fail' => $failCount,
                'skipped' => $totalLibraries - $successCount - $failCount,
                'results' => $results
            ]
        ], 256);
    }

    /**
     * 从好友采集朋友圈内容
     * @param array $library 内容库配置
     * @return array 采集结果
     */
    private function collectFromFriends($library)
    {
        $friendIds = $library['sourceFriends'];
        if (empty($friendIds)) {
            return [
                'status' => 'failed',
                'message' => '没有指定要采集的好友'
            ];
        }

        try {
            // 获取API配置
            $toAccountId = '';
            $username = Env::get('api.username2', '');
            $password = Env::get('api.password2', '');
            $needFetch = false;

            // 检查是否需要主动获取朋友圈
            if (!empty($username) && !empty($password)) {
                $toAccountId = Db::name('users')->where('account', $username)->value('s2_accountId');
                $needFetch = !empty($toAccountId);
            }

            // 批量查询好友信息
            $friends = Db::table('s2_wechat_friend')
                ->field('id, wechatAccountId, wechatId, accountId, nickname, avatar')
                ->whereIn('id', $friendIds)
                ->where('isDeleted', 0)
                ->select();

            if (empty($friends)) {
                return [
                    'status' => 'failed',
                    'message' => '未找到有效的好友信息'
                ];
            }

            // 从朋友圈采集内容
            $collectedData = [];
            $totalMomentsCount = 0;
            $processedFriends = 0;
            $totalFriends = count($friends);

            // 获取采集类型限制
            $catchTypes = $library['catchType'] ?? [];

            foreach ($friends as $friend) {
                $processedFriends++;

                // 如果配置了API并且需要主动获取朋友圈
                if ($needFetch) {
                    try {
                        // 执行切换好友命令
                        $automaticAssign = new AutomaticAssign();
                        $automaticAssign->allotWechatFriend(['wechatFriendId' => $friend['id'], 'toAccountId' => $toAccountId], true);

                        // 存入缓存
                        $friendData = $friend;
                        $friendData['friendId'] = $friend['id'];
                        artificialAllotWechatFriend($friendData);

                        // 执行采集朋友圈命令
                        $webSocket = new WebSocketController(['userName' => $username, 'password' => $password, 'accountId' => $toAccountId]);
                        $webSocket->getMoments(['wechatFriendId' => $friend['id'], 'wechatAccountId' => $friend['wechatAccountId']]);

                        // 采集完毕切换回原账号
                        $automaticAssign->allotWechatFriend(['wechatFriendId' => $friend['id'], 'toAccountId' => $friend['accountId']], true);
                    } catch (\Exception $e) {
                        \think\facade\Log::error('采集朋友圈失败: ' . $e->getMessage() . ' [好友ID: ' . $friend['id'] . ']');
                        // 继续处理下一个好友，不中断整个流程
                    }
                }

                // 从s2_wechat_moments表获取朋友圈数据
                $query = Db::table('s2_wechat_moments')
                    ->where([
                        //'wechatAccountId' => $friend['wechatAccountId'],
                        'userName' => $friend['wechatId'],
                    ])
                    ->order('createTime', 'desc')
                    ->group('snsId');

                // 如果启用了时间限制
                if ($library['timeEnabled'] && $library['timeStart'] > 0 && $library['timeEnd'] > 0) {
                    $query->whereBetween('createTime', [$library['timeStart'], $library['timeEnd']]);
                }

                // 如果指定了采集类型，进行过滤
                /*if (!empty($catchTypes)) {
                    $query->whereIn('type', $catchTypes);
                }*/

                // 获取最近20条朋友圈
                $moments = $query->page(1, 100)->select();
                if (empty($moments)) {
                    continue;
                }

                $nickname = $friend['nickname'] ?? '未知好友';
                $friendMomentsCount = 0;
                $filteredMoments = [];

                // 处理每条朋友圈数据
                foreach ($moments as $moment) {
                    // 处理关键词过滤
                    $content = $moment['content'] ?? '';

                    // 应用关键词过滤
                    if (!$this->passKeywordFilter($content, $library['keywordInclude'], $library['keywordExclude'])) {
                        continue;
                    }

                    /*   // 如果启用了AI处理
                       if (!empty($library['aiEnabled']) && !empty($content)) {
                           try {
                               $contentAi = $this->aiRewrite($library, $content);
                               if (!empty($contentAi)) {
                                   $moment['contentAi'] = $contentAi;
                               }
                           } catch (\Exception $e) {
                               \think\facade\Log::error('AI处理失败: ' . $e->getMessage() . ' [朋友圈ID: ' . ($moment['id'] ?? 'unknown') . ']');
                               $moment['contentAi'] = '';
                           }
                       }*/

                    // 保存到内容库的content_item表
                    if ($this->saveMomentToContentItem($moment, $library['id'], $friend, $nickname)) {
                        $friendMomentsCount++;
                        $filteredMoments[] = [
                            'id' => $moment['id'] ?? '',
                            'content' => mb_substr($content, 0, 50) . (mb_strlen($content) > 50 ? '...' : ''),
                            'time' => date('Y-m-d H:i:s', $moment['createTime'] ?? time())
                        ];
                    }
                }

                if ($friendMomentsCount > 0) {
                    // 记录采集结果
                    $collectedData[$friend['wechatId']] = [
                        'friendId' => $friend['id'],
                        'nickname' => $nickname,
                        'count' => $friendMomentsCount,
                        'samples' => array_slice($filteredMoments, 0, 3) // 只保留前3条示例
                    ];

                    $totalMomentsCount += $friendMomentsCount;
                }

                // 每处理5个好友，释放一次内存
                if ($processedFriends % 5 == 0 && $processedFriends < $totalFriends) {
                    gc_collect_cycles();
                }
            }

            if (empty($collectedData)) {
                return [
                    'status' => 'warning',
                    'message' => '未采集到任何朋友圈内容'
                ];
            }

            return [
                'status' => 'success',
                'message' => '成功采集到' . count($collectedData) . '位好友的' . $totalMomentsCount . '条朋友圈内容',
                'data' => [
                    'friend_count' => count($collectedData),
                    'collected_count' => $totalMomentsCount,
                    'details' => $collectedData
                ]
            ];

        } catch (\Exception $e) {
            \think\facade\Log::error('从好友采集朋友圈失败: ' . $e->getMessage() . ' [内容库ID: ' . ($library['id'] ?? 'unknown') . ']');
            return [
                'status' => 'error',
                'message' => '采集过程发生错误: ' . $e->getMessage()
            ];
        }
    }

    /**
     * 应用关键词过滤规则
     * @param string $content 内容文本
     * @param array $includeKeywords 包含关键词
     * @param array $excludeKeywords 排除关键词
     * @return bool 是否通过过滤
     */
    private function passKeywordFilter($content, $includeKeywords, $excludeKeywords)
    {
        // 如果内容为空，跳过
        if (empty($content)) {
            return false;
        }

        // 检查是否包含必须关键词
        $includeMatch = empty($includeKeywords);
        if (!empty($includeKeywords)) {
            foreach ($includeKeywords as $keyword) {
                if (strpos($content, $keyword) !== false) {
                    $includeMatch = true;
                    break;
                }
            }
        }

        // 如果不满足包含条件，跳过
        if (!$includeMatch) {
            return false;
        }

        // 检查是否包含排除关键词
        if (!empty($excludeKeywords)) {
            foreach ($excludeKeywords as $keyword) {
                if (strpos($content, $keyword) !== false) {
                    return false; // 包含排除关键词，不通过过滤
                }
            }
        }

        return true; // 通过所有过滤条件
    }

    /**
     * 从群组采集消息内容
     * @param array $library 内容库配置
     * @return array 采集结果
     */
    private function collectFromGroups($library)
    {
        $groupIds = $library['sourceGroups'];
        if (empty($groupIds)) {
            return [
                'status' => 'failed',
                'message' => '没有指定要采集的群组'
            ];
        }

        try {
            // 查询群组信息
            $groups = Db::table('s2_wechat_chatroom')->alias('g')
                ->field('g.id, g.chatroomId, g.nickname as name, g.wechatAccountWechatId as ownerWechatId')
                ->whereIn('g.id', $groupIds)
                ->where('g.deleteTime', 0)
                ->select();

            if (empty($groups)) {
                return [
                    'status' => 'failed',
                    'message' => '未找到有效的群组信息'
                ];
            }

            // 获取群成员信息
            $groupMembers = $library['groupMembers'];
            if (empty($groupMembers)) {
                // 如果没有指定群成员，则尝试获取所有群成员
                return [
                    'status' => 'failed',
                    'message' => '未找到有效的群成员信息'
                ];
            }

            // groupMembers格式: {"826825": ["413771", "413769"], "840818": ["496300", "496302"]}
            // 键是群组ID，值是该群组的成员ID数组
            // 需要按群组分组处理，确保每个群组只采集该群组配置的成员

            // 建立群组ID到成员ID数组的映射
            $groupIdToMemberIds = [];
            if (is_array($groupMembers)) {
                foreach ($groupMembers as $groupId => $memberIds) {
                    if (is_array($memberIds) && !empty($memberIds)) {
                        $groupIdToMemberIds[$groupId] = $memberIds;
                    }
                }
            }
            if (empty($groupIdToMemberIds)) {
                return [
                    'status' => 'failed',
                    'message' => '未找到有效的群成员ID'
                ];
            }

            // 为每个群组查询成员信息，建立群组ID到成员wechatId数组的映射
            $groupIdToMemberWechatIds = [];
            foreach ($groupIdToMemberIds as $groupId => $memberIds) {
                // 查询该群组的成员信息，获取wechatId
                $members = Db::table('s2_wechat_chatroom_member')
                    ->field('id, wechatId')
                    ->whereIn('id', $memberIds)
                    ->select();

                $wechatIds = [];
                foreach ($members as $member) {
                    if (!empty($member['wechatId'])) {
                        $wechatIds[] = $member['wechatId'];
                    }
                }

                if (!empty($wechatIds)) {
                    $groupIdToMemberWechatIds[$groupId] = array_unique($wechatIds);
                }
            }
            if (empty($groupIdToMemberWechatIds)) {
                return [
                    'status' => 'failed',
                    'message' => '未找到有效的群成员微信ID'
                ];
            }

            // 从群组采集内容
            $collectedData = [];
            $totalMessagesCount = 0;
            $chatroomIds = array_column($groups, 'id');

            // 获取群消息 - 支持时间范围过滤（先不添加群成员过滤，后面按群组分别过滤）
            $messageWhere = [
                ['wechatChatroomId', 'in', $chatroomIds],
                ['type', '=', 2]
            ];

            // 如果启用时间限制
            if ($library['timeEnabled'] && $library['timeStart'] > 0 && $library['timeEnd'] > 0) {
                $messageWhere[] = ['createTime', 'between', [$library['timeStart'], $library['timeEnd']]];
            }

            // 查询群消息（先查询所有消息，后面按群组和成员过滤）
            $groupMessages = Db::table('s2_wechat_message')
                ->where($messageWhere)
                ->order('createTime', 'desc')
                ->limit(500) // 限制最大消息数量
                ->select();
            if (empty($groupMessages)) {
                return [
                    'status' => 'warning',
                    'message' => '未找到符合条件的群消息'
                ];
            }
            // 按群组分组处理消息
            $groupedMessages = [];
            foreach ($groupMessages as $message) {
                $chatroomId = $message['wechatChatroomId'];
                $senderWechatId = $message['senderWechatId'] ?? '';

                // 找到对应的群组信息
                $groupInfo = null;
                foreach ($groups as $group) {
                    if ($group['id'] == $chatroomId) {
                        $groupInfo = $group;
                        break;
                    }
                }

                if (!$groupInfo) {
                    continue;
                }

                // 检查该消息的发送者是否在该群组的配置成员列表中
                $groupId = $groupInfo['id'];
                if (!isset($groupIdToMemberWechatIds[$groupId])) {
                    // 该群组没有配置成员，跳过
                    continue;
                }

                // 检查发送者是否在配置的成员列表中
                if (!in_array($senderWechatId, $groupIdToMemberWechatIds[$groupId])) {
                    // 发送者不在该群组的配置成员列表中，跳过
                    continue;
                }

                if (!isset($groupedMessages[$chatroomId])) {
                    $groupedMessages[$chatroomId] = [
                        'count' => 0,
                        'messages' => []
                    ];
                }

                // 处理消息内容
                $content = $message['content'] ?? '';

                // 如果启用了关键词过滤
                $includeKeywords = $library['keywordInclude'];
                $excludeKeywords = $library['keywordExclude'];


                // 检查是否包含必须关键词
                $includeMatch = empty($includeKeywords);
                if (!empty($includeKeywords)) {
                    foreach ($includeKeywords as $keyword) {
                        if (strpos($content, $keyword) !== false) {
                            $includeMatch = true;
                            break;
                        }
                    }
                }

                // 如果不满足包含条件，跳过
                if (!$includeMatch) {
                    continue;
                }

                // 检查是否包含排除关键词
                $excludeMatch = false;
                if (!empty($excludeKeywords)) {
                    foreach ($excludeKeywords as $keyword) {
                        if (strpos($content, $keyword) !== false) {
                            $excludeMatch = true;
                            break;
                        }
                    }
                }

                // 如果满足排除条件，跳过
                if ($excludeMatch) {
                    continue;
                }


                // 如果启用了AI处理
                if (!empty($library['aiEnabled']) && !empty($content)) {
                    $contentAi = $this->aiRewrite($library, $content);
                    if (!empty($contentAi)) {
                        $message['contentAi'] = $contentAi;
                    } else {
                        $message['contentAi'] = '';
                    }
                }


                // 保存消息到内容库
                $this->saveMessageToContentItem($message, $library['id'], $groupInfo);

                // 累计计数
                $groupedMessages[$chatroomId]['count']++;
                $groupedMessages[$chatroomId]['messages'][] = [
                    'id' => $message['id'],
                    'content' => mb_substr($content, 0, 50) . (mb_strlen($content) > 50 ? '...' : ''),
                    'sender' => $message['senderNickname'],
                    'time' => date('Y-m-d H:i:s', $message['createTime'])
                ];

                $totalMessagesCount++;
            }

            // 构建结果数据
            foreach ($groups as $group) {
                $chatroomId = $group['chatroomId'];
                if (isset($groupedMessages[$chatroomId]) && $groupedMessages[$chatroomId]['count'] > 0) {
                    $collectedData[$chatroomId] = [
                        'groupId' => $group['id'],
                        'groupName' => $group['name'],
                        'count' => $groupedMessages[$chatroomId]['count'],
                        'messages' => $groupedMessages[$chatroomId]['messages']
                    ];
                }
            }

            if (empty($collectedData)) {
                return [
                    'status' => 'warning',
                    'message' => '未采集到符合条件的群消息内容'
                ];
            }

            return [
                'status' => 'success',
                'message' => '成功采集到' . count($collectedData) . '个群的' . $totalMessagesCount . '条消息',
                'data' => [
                    'group_count' => count($collectedData),
                    'collected_count' => $totalMessagesCount,
                    'details' => $collectedData
                ]
            ];

        } catch (\Exception $e) {
            return [
                'status' => 'error',
                'message' => '采集过程发生错误: ' . $e->getMessage()
            ];
        }
    }

    /**
     * 判断内容类型
     * @param string $content 内容文本
     * @param array $resUrls 资源URL数组
     * @param array $urls URL数组
     * @return int 内容类型:  1=图片, 2=链接, 3=视频, 4=文本, 5=小程序
     */
    private function determineContentType($content, $resUrls = [], $urls = [])
    {
        // 判断是否为空
        if (empty($content) && empty($resUrls) && empty($urls)) {
            return 0; // 未知类型
        }

        // 分析内容中可能包含的链接或图片地址
        if (!empty($content)) {
            // 检查内容中是否有链接
            $urlPattern = '/https?:\/\/[-A-Za-z0-9+&@#\/%?=~_|!:,.;]+[-A-Za-z0-9+&@#\/%=~_|]/';
            preg_match_all($urlPattern, $content, $contentUrlMatches);

            if (!empty($contentUrlMatches[0])) {
                // 将内容中的链接添加到urls数组中(去重)
                foreach ($contentUrlMatches[0] as $url) {
                    if (!in_array($url, $urls)) {
                        $urls[] = $url;
                    }
                }
            }

            // 检查内容中是否包含图片或视频链接
            foreach ($contentUrlMatches[0] ?? [] as $url) {
                // 检查是否为图片文件
                if (stripos($url, '.jpg') !== false ||
                    stripos($url, '.jpeg') !== false ||
                    stripos($url, '.png') !== false ||
                    stripos($url, '.gif') !== false ||
                    stripos($url, '.webp') !== false ||
                    stripos($url, '.bmp') !== false ||
                    stripos($url, 'image') !== false) {
                    if (!in_array($url, $resUrls)) {
                        $resUrls[] = $url;
                    }
                }

                // 检查是否为视频文件
                if (stripos($url, '.mp4') !== false ||
                    stripos($url, '.mov') !== false ||
                    stripos($url, '.avi') !== false ||
                    stripos($url, '.wmv') !== false ||
                    stripos($url, '.flv') !== false ||
                    stripos($url, 'video') !== false) {
                    if (!in_array($url, $resUrls)) {
                        $resUrls[] = $url;
                    }
                }
            }
        }

        // 判断是否有小程序信息
        if (strpos($content, '小程序') !== false || strpos($content, 'appid') !== false) {
            return 5; // 小程序
        }

        // 检查资源URL中是否有视频或图片
        $hasVideo = false;
        $hasImage = false;

        if (!empty($resUrls)) {
            foreach ($resUrls as $url) {
                // 检查是否为视频文件
                if (stripos($url, '.mp4') !== false ||
                    stripos($url, '.mov') !== false ||
                    stripos($url, '.avi') !== false ||
                    stripos($url, '.wmv') !== false ||
                    stripos($url, '.flv') !== false ||
                    stripos($url, 'video') !== false) {
                    $hasVideo = true;
                    break; // 一旦发现视频文件，立即退出循环
                }

                // 检查是否为图片文件
                if (stripos($url, '.jpg') !== false ||
                    stripos($url, '.jpeg') !== false ||
                    stripos($url, '.png') !== false ||
                    stripos($url, '.gif') !== false ||
                    stripos($url, '.webp') !== false ||
                    stripos($url, '.bmp') !== false ||
                    stripos($url, 'image') !== false) {
                    $hasImage = true;
                    // 不退出循环，继续检查是否有视频（视频优先级更高）
                }
            }
        }

        // 如果发现视频文件，判定为视频类型
        if ($hasVideo) {
            return 3; // 视频
        }

        // 判断内容是否纯链接
        $isPureLink = false;
        if (!empty($content) && !empty($urls)) {
            $contentWithoutUrls = $content;
            foreach ($urls as $url) {
                $contentWithoutUrls = str_replace($url, '', $contentWithoutUrls);
            }
            // 如果去除链接后内容为空，则认为是纯链接
            if (empty(trim($contentWithoutUrls))) {
                $isPureLink = true;
            }
        }

        // 如果内容是纯链接，判定为链接类型
        if ($isPureLink) {
            return 2; // 链接
        }

        // 优先判断内容文本
        // 如果有文本内容(不仅仅是链接)
        if (!empty($content) && !$isPureLink) {
            // 如果有图片，则为图文类型
            if ($hasImage) {
                return 1; // 图文
            } else {
                return 4; // 纯文本
            }
        }

        // 判断是否为图片类型
        if ($hasImage) {
            return 1; // 图片
        }

        // 判断是否为链接类型
        if (!empty($urls)) {
            return 2; // 链接
        }

        // 默认为文本类型
        return 4; // 文本
    }

    /**
     * 保存朋友圈数据到内容项目表
     * @param array $moment 朋友圈数据
     * @param int $libraryId 内容库ID
     * @param array $friend 好友信息
     * @param string $nickname 好友昵称
     * @return bool 是否保存成功
     */
    private function saveMomentToContentItem($moment, $libraryId, $friend, $nickname)
    {
        if (empty($moment) || empty($libraryId)) {
            return false;
        }


        try {

            // 检查朋友圈数据是否已存在于内容项目中
            $exists = ContentItem::where('libraryId', $libraryId)
                ->where('snsId', $moment['snsId'] ?? '')
                ->find();


            // 解析资源URL (可能是JSON字符串)
            $resUrls = $moment['resUrls'];
            if (is_string($resUrls)) {
                $resUrls = json_decode($resUrls, true);
            }

            // 处理urls字段
            $urls = $moment['urls'] ?? [];
            if (is_string($urls)) {
                $urls = json_decode($urls, true);
            }

            // 构建封面图片
            $coverImage = '';
            if (!empty($resUrls) && is_array($resUrls) && count($resUrls) > 0) {
                $coverImage = $resUrls[0];
            }

            // 判断内容类型 (0=未知, 1=图片, 2=链接, 3=视频, 4=文本, 5=小程序)
            if ($moment['type'] == 1) {
                //图文
                $contentType = 1;
            } elseif ($moment['type'] == 3) {
                //链接
                $contentType = 2;
                $urls = [];
                $url = is_string($moment['urls']) ? json_decode($moment['urls'], true) : $moment['urls'] ?? [];
                $url = $url[0];

                //兼容链接采集不到标题及图标
                if (empty($moment['title'])) {
                    // 检查是否是飞书链接
                    if (strpos($url, 'feishu.cn') !== false) {
                        // 飞书文档需要登录，无法直接获取内容，返回默认信息
                        $urls[] = [
                            'url' => $url,
                            'image' => 'http://karuosiyujzk.oss-cn-shenzhen.aliyuncs.com/2025/07/09/3db2a5d7fe49011ab68175a42a5094ce.jpeg',
                            'desc' => '飞书文档'
                        ];
                    } else {
                        $getUrlDetails = $this->getExternalPageDetails($url);
                        $icon = 'http://karuosiyujzk.oss-cn-shenzhen.aliyuncs.com/2025/07/09/ec039d96fad6eab1d960f207d3d9ca9f.jpeg';
                        if (!empty($getUrlDetails['title'])) {
                            $urls[] = [
                                'url' => $url,
                                'image' => $icon,
                                'desc' => '点击查看详情'
                            ];
                        } else {
                            $urls[] = [
                                'url' => $url,
                                'image' => !empty($getUrlDetails['icon']) ? $getUrlDetails['icon'] : $icon,
                                'desc' => $getUrlDetails['title']
                            ];
                        }
                    }
                } else {
                    if (strpos($url, 'feishu.cn') !== false) {
                        $coverImage = 'http://karuosiyujzk.oss-cn-shenzhen.aliyuncs.com/2025/07/09/3db2a5d7fe49011ab68175a42a5094ce.jpeg';
                    } else {
                        $coverImage = 'http://karuosiyujzk.oss-cn-shenzhen.aliyuncs.com/2025/07/09/ec039d96fad6eab1d960f207d3d9ca9f.jpeg';
                    }

                    $urls[] = [
                        'url' => $url,
                        'image' => !empty($moment['coverImage']) ? $moment['coverImage'] : $coverImage,
                        'desc' => $moment['title']
                    ];
                }
                $moment['urls'] = $urls;
            } elseif ($moment['type'] == 15) {
                //视频
                $contentType = 3;
            } elseif ($moment['type'] == 2) {
                //纯文本
                $contentType = 4;
            } elseif ($moment['type'] == 30) {
                //小程序
                $contentType = 5;
            } else {
                $contentType = 1;
            }

            // 如果不存在，则创建新的内容项目

            if (empty($exists)) {
                $exists = new ContentItem();
            }

            $exists->libraryId = $libraryId;
            $exists->type = 'moment'; // 朋友圈类型
            $exists->title = '来自 ' . $nickname . ' 的朋友圈';
            $exists->contentData = json_encode($moment, JSON_UNESCAPED_UNICODE);
            $exists->snsId = $moment['snsId'] ?? ''; // 存储snsId便于后续查询
            $exists->createTime = time();
            $exists->wechatId = $friend['wechatId'];
            $exists->friendId = $friend['id'];
            $exists->createMomentTime = $moment['createTime'] ?? 0;
            $exists->content = $moment['content'] ?? '';
            $exists->contentAi = $moment['contentAi'] ?? '';
            $exists->coverImage = $coverImage;
            $exists->contentType = $contentType; // 设置内容类型
            $exists->ossUrls = $moment['ossUrls'] ?? json_decode([]);

            // 独立存储resUrls和urls字段
            $exists->resUrls = is_string($moment['resUrls']) ? $moment['resUrls'] : json_encode($resUrls, JSON_UNESCAPED_UNICODE);
            $exists->urls = is_string($moment['urls']) ? $moment['urls'] : json_encode($urls, JSON_UNESCAPED_UNICODE);

            // 保存地理位置信息
            $exists->location = $moment['location'] ?? '';
            $exists->lat = $moment['lat'] ?? 0;
            $exists->lng = $moment['lng'] ?? 0;
            $exists->save();


            return true;
        } catch (\Exception $e) {
            // 记录错误日志
            \think\facade\Log::error('保存朋友圈数据失败: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * 保存群聊消息到内容项目表
     * @param array $message 消息数据
     * @param int $libraryId 内容库ID
     * @param array $group 群组信息
     * @return bool 是否保存成功
     */
    private function saveMessageToContentItem($message, $libraryId, $group)
    {
        if (empty($message) || empty($libraryId)) {
            return false;
        }

        try {
            // 检查消息是否已存在于内容项目中
            $exists = ContentItem::where('libraryId', $libraryId)
                ->where('msgId', $message['msgSvrId'] ?? '')
                ->find();

            if ($exists) {
                return true;
            }

            $resUrls = [];
            $links = [];
            $contentType = 4;
            $content = '';
            switch ($message['msgType']) {
                case 1: // 文字
                    $content = $message['content'];
                    $contentType = 4;
                    break;
                case 3: //图片
                    $resUrls[] = $message['content'];
                    $contentType = 1;
                    break;
                case 47: //动态图片
                    $resUrls[] = $message['content'];
                    $contentType = 1;
                    break;
                case 34: //语言
                    return false;
                case 43: //视频
                    $resUrls[] = $message['content'];
                    $contentType = 3;
                    break;
                case 42: //名片
                    return false;
                case 49: //文件 链接
                    $link = json_decode($message['content'], true);
                    switch ($link['type']) {
                        case 'link':
                            $links[] = [
                                'desc' => $link['desc'],
                                'image' => $link['thumbPath'],
                                'url' => $link['url'],
                            ];
                            $contentType = 2;
                            break;
                        default:
                            return false;
                    }
                    break;
                default:
                    return false;
            }

            // 创建新的内容项目
            $item = new ContentItem();
            $item->libraryId = $libraryId;
            $item->type = 'group_message'; // 群消息类型
            $item->title = '来自 ' . ($group['name'] ?? '未知群组') . ' 的消息';
            $item->contentData = json_encode($message, JSON_UNESCAPED_UNICODE);
            $item->msgId = $message['msgSvrId'] ?? ''; // 存储msgSvrId便于后续查询
            $item->createTime = time();
            $item->content = $content;
            $item->contentType = $contentType; // 设置内容类型

            // 设置发送者信息
            $item->wechatId = $message['senderWechatId'] ?? '';
            $item->wechatChatroomId = $message['wechatChatroomId'] ?? '';
            $item->senderNickname = $message['senderNickname'] ?? '';
            $item->createMessageTime = $message['createTime'] ?? 0;

            // 处理资源URL
            if (!empty($resUrls)) {
                $item->resUrls = json_encode($resUrls, JSON_UNESCAPED_UNICODE);
                // 设置封面图片
                if (!empty($resUrls[0])) {
                    $item->coverImage = $resUrls[0];
                }
            } else {
                $item->resUrls = json_encode([], JSON_UNESCAPED_UNICODE);
            }

            // 处理链接
            if (!empty($links)) {
                $item->urls = json_encode($links, JSON_UNESCAPED_UNICODE);
            } else {
                $item->urls = json_encode([], JSON_UNESCAPED_UNICODE);
            }
            $item->ossUrls = json_encode([], JSON_UNESCAPED_UNICODE);

            // 设置商品信息（需根据消息内容解析）
            $this->extractProductInfo($item, $content);

            $item->save();
            return true;
        } catch (\Exception $e) {
            // 记录错误日志
            \think\facade\Log::error('保存群消息数据失败: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * 从消息内容中提取商品信息
     * @param ContentItem $item 内容项目对象
     * @param string $content 消息内容
     * @return void
     */
    private function extractProductInfo($item, $content)
    {
        // 尝试提取商品名称
        $titlePatterns = [
            '/【(.+?)】/',  // 匹配【】中的内容
            '/《(.+?)》/',  // 匹配《》中的内容
            '/商品名称[:：](.+?)[\r\n]/' // 匹配"商品名称:"后的内容
        ];

        foreach ($titlePatterns as $pattern) {
            preg_match($pattern, $content, $matches);
            if (!empty($matches[1])) {
                $item->productTitle = trim($matches[1]);
                break;
            }
        }

        // 如果没有找到商品名称，尝试使用内容的前部分作为标题
        if (empty($item->productTitle)) {
            // 获取第一行非空内容作为标题
            $lines = explode("\n", $content);
            foreach ($lines as $line) {
                $line = trim($line);
                if (!empty($line) && mb_strlen($line) > 2) {
                    $item->productTitle = mb_substr($line, 0, 30);
                    break;
                }
            }
        }
    }

    /**
     * 获取朋友圈数据
     * @param string $wechatId 微信ID
     * @return array 朋友圈数据
     */
    private function getMomentsData($wechatId)
    {
        // 这里应该是实际从API或数据库获取朋友圈数据的逻辑
        // 这里仅作示例返回
        return [
            // 示例数据
            ['id' => 1, 'content' => '今天天气真好！', 'createTime' => time() - 3600],
            ['id' => 2, 'content' => '分享一个有趣的项目', 'createTime' => time() - 7200],
        ];
    }

    /**
     * 根据关键词过滤朋友圈内容
     * @param array $moments 朋友圈内容
     * @param array $includeKeywords 包含关键词
     * @param array $excludeKeywords 排除关键词
     * @return array 过滤后的内容
     */
    private function filterMomentsByKeywords($moments, $includeKeywords, $excludeKeywords)
    {
        if (empty($moments)) {
            return [];
        }

        $filtered = [];
        foreach ($moments as $moment) {
            $content = $moment['content'] ?? '';

            // 如果内容为空，跳过
            if (empty($content)) {
                continue;
            }

            // 检查是否包含必须关键词
            $includeMatch = empty($includeKeywords);
            if (!empty($includeKeywords)) {
                foreach ($includeKeywords as $keyword) {
                    if (strpos($content, $keyword) !== false) {
                        $includeMatch = true;
                        break;
                    }
                }
            }

            // 如果不满足包含条件，跳过
            if (!$includeMatch) {
                continue;
            }

            // 检查是否包含排除关键词
            $excludeMatch = false;
            if (!empty($excludeKeywords)) {
                foreach ($excludeKeywords as $keyword) {
                    if (strpos($content, $keyword) !== false) {
                        $excludeMatch = true;
                        break;
                    }
                }
            }

            // 如果满足排除条件，跳过
            if ($excludeMatch) {
                continue;
            }

            // 通过所有过滤，添加到结果中
            $filtered[] = $moment;
        }

        return $filtered;
    }

    /**
     * 使用AI处理采集的数据
     * @param array $data 采集的数据
     * @param string $prompt AI提示词
     * @return array 处理后的数据
     */
    private function processWithAI($data, $prompt)
    {
        // 这里应该是调用AI处理数据的逻辑
        // 实际实现需要根据具体的AI API
        return $data;
    }

    /**
     * 保存采集的数据到内容项目
     * @param array $data 采集的数据
     * @param int $libraryId 内容库ID
     * @return bool 是否保存成功
     */
    private function saveCollectedData($data, $libraryId)
    {
        if (empty($data) || empty($libraryId)) {
            return false;
        }

        try {
            foreach ($data as $wechatId => $userData) {
                foreach ($userData['moments'] as $moment) {
                    // 创建内容项目
                    $item = new ContentItem;
                    $item->libraryId = $libraryId;
                    $item->type = 'moment'; // 朋友圈类型
                    $item->title = '来自 ' . $userData['nickname'] . ' 的朋友圈';
                    $item->contentData = json_encode($moment);
                    $item->createTime = time();
                    $item->save();
                }
            }
            return true;
        } catch (\Exception $e) {
            // 记录错误日志
            \think\facade\Log::error('保存采集数据失败: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * 获取所有群成员
     * @param array $groupIds 群组ID列表
     * @return array 群成员列表
     */
    private function getAllGroupMembers($groupIds)
    {
        if (empty($groupIds)) {
            return [];
        }

        try {
            // 查询群成员信息
            $members = Db::name('wechat_group_member')->alias('gm')
                ->field('gm.id, gm.memberId, gm.groupId, wa.nickname')
                ->join('wechat_account wa', 'gm.memberId = wa.wechatId')
                ->whereIn('gm.groupId', $groupIds)
                ->where('gm.isDel', 0)
                ->select();

            return $members;
        } catch (\Exception $e) {
            \think\facade\Log::error('获取群成员失败: ' . $e->getMessage());
            return [];
        }
    }


    /**
     * 解析URL获取网页信息（内部调用）
     * @param string $url 要解析的URL
     * @return array 包含title、icon的数组，失败返回空数组
     */
    public function parseUrl($url)
    {
        if (empty($url) || !filter_var($url, FILTER_VALIDATE_URL)) {
            return [];
        }

        try {
            // 设置请求头，模拟浏览器访问
            $context = stream_context_create([
                'http' => [
                    'method' => 'GET',
                    'header' => [
                        'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                        'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                        'Accept-Language: zh-CN,zh;q=0.9,en;q=0.8',
                        'Accept-Encoding: gzip, deflate',
                        'Connection: keep-alive',
                        'Upgrade-Insecure-Requests: 1'
                    ],
                    'timeout' => 10,
                    'follow_location' => true,
                    'max_redirects' => 3
                ]
            ]);

            // 获取网页内容
            $html = @file_get_contents($url, false, $context);

            if ($html === false) {
                return [];
            }

            // 检测编码并转换为UTF-8
            $encoding = mb_detect_encoding($html, ['UTF-8', 'GBK', 'GB2312', 'BIG5', 'ASCII']);
            if ($encoding && $encoding !== 'UTF-8') {
                $html = mb_convert_encoding($html, 'UTF-8', $encoding);
            }

            // 解析HTML
            $dom = new \DOMDocument();
            @$dom->loadHTML($html, LIBXML_NOERROR | LIBXML_NOWARNING);
            $xpath = new \DOMXPath($dom);

            $result = [
                'title' => '',
                'icon' => '',
                'url' => $url
            ];

            // 提取标题
            $titleNodes = $xpath->query('//title');
            if ($titleNodes->length > 0) {
                $result['title'] = trim($titleNodes->item(0)->textContent);
            }

            // 提取图标 - 优先获取favicon
            $iconNodes = $xpath->query('//link[@rel="icon"]/@href | //link[@rel="shortcut icon"]/@href | //link[@rel="apple-touch-icon"]/@href');
            if ($iconNodes->length > 0) {
                $iconUrl = trim($iconNodes->item(0)->value);
                $result['icon'] = $this->makeAbsoluteUrl($iconUrl, $url);
            } else {
                // 尝试获取Open Graph图片
                $ogImageNodes = $xpath->query('//meta[@property="og:image"]/@content');
                if ($ogImageNodes->length > 0) {
                    $result['icon'] = trim($ogImageNodes->item(0)->value);
                } else {
                    // 默认favicon路径
                    $result['icon'] = $this->makeAbsoluteUrl('/favicon.ico', $url);
                }
            }

            // 清理和验证数据
            $result['title'] = $this->cleanText($result['title']);

            return $result;

        } catch (\Exception $e) {
            // 记录错误日志但不抛出异常
            \think\facade\Log::error('URL解析失败: ' . $e->getMessage() . ' URL: ' . $url);
            return [];
        }
    }


    /**
     * 将相对URL转换为绝对URL
     * @param string $relativeUrl 相对URL
     * @param string $baseUrl 基础URL
     * @return string 绝对URL
     */
    private function makeAbsoluteUrl($relativeUrl, $baseUrl)
    {
        if (empty($relativeUrl)) {
            return '';
        }

        // 如果已经是绝对URL，直接返回
        if (filter_var($relativeUrl, FILTER_VALIDATE_URL)) {
            return $relativeUrl;
        }

        // 解析基础URL
        $baseParts = parse_url($baseUrl);
        if (!$baseParts) {
            return $relativeUrl;
        }

        // 处理以/开头的绝对路径
        if (strpos($relativeUrl, '/') === 0) {
            return $baseParts['scheme'] . '://' . $baseParts['host'] .
                (isset($baseParts['port']) ? ':' . $baseParts['port'] : '') .
                $relativeUrl;
        }

        // 处理相对路径
        $basePath = isset($baseParts['path']) ? dirname($baseParts['path']) : '/';
        if ($basePath === '.') {
            $basePath = '/';
        }

        return $baseParts['scheme'] . '://' . $baseParts['host'] .
            (isset($baseParts['port']) ? ':' . $baseParts['port'] : '') .
            $basePath . '/' . $relativeUrl;
    }

    /**
     * 清理文本内容
     * @param string $text 要清理的文本
     * @return string 清理后的文本
     */
    private function cleanText($text)
    {
        if (empty($text)) {
            return '';
        }

        // 移除HTML实体
        $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');

        // 移除多余的空白字符
        $text = preg_replace('/\s+/', ' ', $text);

        // 移除控制字符
        $text = preg_replace('/[\x00-\x1F\x7F]/', '', $text);

        return trim($text);
    }


    public function aiRewrite($library = [], $content = '')
    {
        if (empty($library['aiEnabled']) && empty($content)) {
            return false;
        }

        // 此处实现AI处理逻辑，暂未实现
        $utl = Env::get('doubaoAi.api_url', '');
        $apiKey = Env::get('doubaoAi.api_key', '');
        $model = Env::get('doubaoAi.model', 'doubao-1-5-pro-32k-250115');
        if (empty($apiKey)) {
            return false;
        }

        if (!empty($library['aiPrompt'])) {
            $aiPrompt = $library['aiPrompt'];
        } else {
            $aiPrompt = '重写这条朋友圈 要求： 
1、原本的字数和意思不要修改超过10% 
2、出现品牌名或个人名字就去除';
        }

        $content = $aiPrompt . ' ' . $content;
        $headerData = ['Authorization:Bearer ' . $apiKey];
        $header = setHeader($headerData);

        // 发送请求
        $params = [
            'model' => $model,
            'messages' => [
                ['role' => 'system', 'content' => '你是人工智能助手.'],
                ['role' => 'user', 'content' => $content],
            ]
        ];
        $result = requestCurl($utl, $params, 'POST', $header, 'json');
        $result = json_decode($result, true);
        if (!empty($result['choices'])) {
            $contentAI = $result['choices'][0]['message']['content'];
            return $contentAI;
        } else {
            return false;
        }
    }

    /**
     * 导入Excel表格（支持图片导入）
     * @return \think\response\Json
     */
    public function importExcel()
    {
        try {
            $libraryId = $this->request->param('id', 0);
            $companyId = $this->request->userInfo['companyId'];
            $userId = $this->request->userInfo['id'];
            $isAdmin = !empty($this->request->userInfo['isAdmin']);

            if (empty($libraryId)) {
                return json(['code' => 400, 'msg' => '内容库ID不能为空']);
            }

            // 验证内容库权限
            $libraryWhere = [
                ['id', '=', $libraryId],
                ['companyId', '=', $companyId],
                ['isDel', '=', 0]
            ];

            if (!$isAdmin) {
                $libraryWhere[] = ['userId', '=', $userId];
            }

            $library = ContentLibrary::where($libraryWhere)->find();
            if (empty($library)) {
                return json(['code' => 500, 'msg' => '内容库不存在或无权限访问']);
            }

            // 获取文件（可能是上传的文件或远程URL）
            $fileUrl = $this->request->param('fileUrl', '');
            $file = Request::file('file');
            $tmpFile = '';

            if (!empty($fileUrl)) {
                // 处理远程URL
                if (!preg_match('/^https?:\/\//i', $fileUrl)) {
                    return json(['code' => 400, 'msg' => '无效的文件URL']);
                }

                // 验证文件扩展名
                $urlExt = strtolower(pathinfo(parse_url($fileUrl, PHP_URL_PATH), PATHINFO_EXTENSION));
                if (!in_array($urlExt, ['xls', 'xlsx'])) {
                    return json(['code' => 400, 'msg' => '只支持Excel文件（.xls, .xlsx）']);
                }

                // 下载远程文件到临时目录
                $tmpFile = tempnam(sys_get_temp_dir(), 'excel_import_') . '.' . $urlExt;
                $fileContent = @file_get_contents($fileUrl);

                if ($fileContent === false) {
                    return json(['code' => 400, 'msg' => '下载远程文件失败，请检查URL是否可访问']);
                }

                file_put_contents($tmpFile, $fileContent);

            } elseif ($file) {
                // 处理上传的文件
                $ext = strtolower($file->getExtension());
                if (!in_array($ext, ['xls', 'xlsx'])) {
                    return json(['code' => 400, 'msg' => '只支持Excel文件（.xls, .xlsx）']);
                }

                // 保存临时文件
                $tmpFile = $file->getRealPath();
                if (empty($tmpFile)) {
                    $savePath = $file->move(sys_get_temp_dir());
                    $tmpFile = $savePath->getRealPath();
                }
            } else {
                return json(['code' => 400, 'msg' => '请上传Excel文件或提供文件URL']);
            }

            if (empty($tmpFile) || !file_exists($tmpFile)) {
                return json(['code' => 400, 'msg' => '文件不存在或无法访问']);
            }

            // 加载Excel文件
            $excel = PHPExcel_IOFactory::load($tmpFile);
            $sheet = $excel->getActiveSheet();

            // 获取所有图片
            $images = [];
            try {
                $drawings = $sheet->getDrawingCollection();
                foreach ($drawings as $drawing) {
                    if ($drawing instanceof \PHPExcel_Worksheet_Drawing) {
                        $coordinates = $drawing->getCoordinates();
                        $imagePath = $drawing->getPath();

                        // 如果是嵌入的图片（zip://格式），提取到临时文件
                        if (strpos($imagePath, 'zip://') === 0) {
                            $zipEntry = str_replace('zip://', '', $imagePath);
                            $zipEntry = explode('#', $zipEntry);
                            $zipFile = $zipEntry[0];
                            $imageEntry = isset($zipEntry[1]) ? $zipEntry[1] : '';

                            if (!empty($imageEntry)) {
                                $zip = new \ZipArchive();
                                if ($zip->open($zipFile) === true) {
                                    $imageContent = $zip->getFromName($imageEntry);
                                    if ($imageContent !== false) {
                                        $tempImageFile = tempnam(sys_get_temp_dir(), 'excel_img_');
                                        file_put_contents($tempImageFile, $imageContent);
                                        $images[$coordinates] = $tempImageFile;
                                    }
                                    $zip->close();
                                }
                            }
                        } elseif (file_exists($imagePath)) {
                            // 如果是外部文件路径
                            $images[$coordinates] = $imagePath;
                        }
                    } elseif ($drawing instanceof \PHPExcel_Worksheet_MemoryDrawing) {
                        // 处理内存中的图片
                        $coordinates = $drawing->getCoordinates();
                        $imageResource = $drawing->getImageResource();

                        if ($imageResource) {
                            $tempImageFile = tempnam(sys_get_temp_dir(), 'excel_img_') . '.png';
                            $imageType = $drawing->getMimeType();

                            switch ($imageType) {
                                case 'image/png':
                                    imagepng($imageResource, $tempImageFile);
                                    break;
                                case 'image/jpeg':
                                case 'image/jpg':
                                    imagejpeg($imageResource, $tempImageFile);
                                    break;
                                case 'image/gif':
                                    imagegif($imageResource, $tempImageFile);
                                    break;
                                default:
                                    imagepng($imageResource, $tempImageFile);
                            }

                            $images[$coordinates] = $tempImageFile;
                        }
                    }
                }
            } catch (\Exception $e) {
                \think\facade\Log::error('提取Excel图片失败：' . $e->getMessage());
            }

            // 读取数据（实际内容从第三行开始，前两行是标题和说明）
            $data = $sheet->toArray();
            if (count($data) < 3) {
                return json(['code' => 400, 'msg' => 'Excel文件数据为空']);
            }

            // 移除前两行（标题行和说明行）
            array_shift($data); // 移除第1行
            array_shift($data); // 移除第2行

            $successCount = 0;
            $failCount = 0;
            $errors = [];

            Db::startTrans();
            try {
                foreach ($data as $rowIndex => $row) {
                    $rowNum = $rowIndex + 3; // Excel行号（从3开始，因为前两行是标题和说明）

                    // 跳过空行
                    if (empty(array_filter($row))) {
                        continue;
                    }

                    try {
                        // 解析数据（根据图片中的表格结构）
                        // A:日期, B:投放时间, C:作用分类, D:朋友圈文案, E:自回评内容, F:朋友圈展示形式, G-O:配图1-9
                        $date = isset($row[0]) ? trim($row[0]) : '';
                        $placementTime = isset($row[1]) ? trim($row[1]) : '';
                        $functionCategory = isset($row[2]) ? trim($row[2]) : '';
                        $content = isset($row[3]) ? trim($row[3]) : '';
                        $selfReply = isset($row[4]) ? trim($row[4]) : '';
                        $displayForm = isset($row[5]) ? trim($row[5]) : '';

                        // 如果没有朋友圈文案，跳过
                        if (empty($content)) {
                            continue;
                        }

                        // 提取配图（G-O列，索引6-14）
                        $imageUrls = [];
                        for ($colIndex = 6; $colIndex <= 14; $colIndex++) {
                            $columnLetter = $this->columnLetter($colIndex);
                            $cellCoordinate = $columnLetter . $rowNum;

                            // 检查是否有图片
                            if (isset($images[$cellCoordinate])) {
                                $imagePath = $images[$cellCoordinate];

                                // 上传图片到OSS
                                $imageExt = 'jpg';
                                if (file_exists($imagePath)) {
                                    $imageInfo = @getimagesize($imagePath);
                                    if ($imageInfo) {
                                        $imageExt = image_type_to_extension($imageInfo[2], false);
                                        if ($imageExt === 'jpeg') {
                                            $imageExt = 'jpg';
                                        }
                                    }
                                }

                                $objectName = AliyunOSS::generateObjectName('excel_img_' . $rowNum . '_' . ($colIndex - 5) . '.' . $imageExt);
                                $uploadResult = AliyunOSS::uploadFile($imagePath, $objectName);

                                if ($uploadResult['success']) {
                                    $imageUrls[] = $uploadResult['url'];
                                }
                            }
                        }

                        // 解析日期和时间
                        $createMomentTime = 0;
                        if (!empty($date)) {
                            // 尝试解析日期格式：2025年11月25日 或 2025-11-25
                            $dateStr = $date;
                            if (preg_match('/(\d{4})[年\-](\d{1,2})[月\-](\d{1,2})/', $dateStr, $matches)) {
                                $year = $matches[1];
                                $month = str_pad($matches[2], 2, '0', STR_PAD_LEFT);
                                $day = str_pad($matches[3], 2, '0', STR_PAD_LEFT);

                                // 解析时间
                                $hour = 0;
                                $minute = 0;
                                if (!empty($placementTime) && preg_match('/(\d{1,2}):(\d{2})/', $placementTime, $timeMatches)) {
                                    $hour = intval($timeMatches[1]);
                                    $minute = intval($timeMatches[2]);
                                }

                                $createMomentTime = strtotime("{$year}-{$month}-{$day} {$hour}:{$minute}:00");
                            }
                        }

                        if ($createMomentTime == 0) {
                            $createMomentTime = time();
                        }

                        // 判断内容类型
                        $contentType = 4; // 默认文本
                        if (!empty($imageUrls)) {
                            $contentType = 1; // 图文
                        }

                        // 创建内容项
                        $item = new ContentItem();
                        $item->libraryId = $libraryId;
                        $item->type = 'diy'; // 自定义类型
                        $item->title = !empty($date) ? $date . ' ' . $placementTime : '导入的内容';
                        $item->content = $content;
                        $item->comment = $selfReply; // 自回评内容
                        $item->contentType = $contentType;
                        $item->resUrls = json_encode($imageUrls, JSON_UNESCAPED_UNICODE);
                        $item->urls = json_encode([], JSON_UNESCAPED_UNICODE);
                        $item->createMomentTime = $createMomentTime;
                        $item->createTime = time();

                        // 设置封面图片
                        if (!empty($imageUrls[0])) {
                            $item->coverImage = $imageUrls[0];
                        }

                        // 保存其他信息到contentData
                        $contentData = [
                            'date' => $date,
                            'placementTime' => $placementTime,
                            'functionCategory' => $functionCategory,
                            'displayForm' => $displayForm,
                            'selfReply' => $selfReply
                        ];
                        $item->contentData = json_encode($contentData, JSON_UNESCAPED_UNICODE);

                        $item->save();
                        $successCount++;

                    } catch (\Exception $e) {
                        $failCount++;
                        $errors[] = "第{$rowNum}行处理失败：" . $e->getMessage();
                        \think\facade\Log::error('导入Excel第' . $rowNum . '行失败：' . $e->getMessage());
                    }
                }

                Db::commit();

                // 清理临时图片文件
                foreach ($images as $imagePath) {
                    if (file_exists($imagePath) && strpos($imagePath, sys_get_temp_dir()) === 0) {
                        @unlink($imagePath);
                    }
                }

                // 清理临时Excel文件
                if (file_exists($tmpFile) && strpos($tmpFile, sys_get_temp_dir()) === 0) {
                    @unlink($tmpFile);
                }

                return json([
                    'code' => 200,
                    'msg' => '导入完成',
                    'data' => [
                        'success' => $successCount,
                        'fail' => $failCount,
                        'errors' => $errors
                    ]
                ]);

            } catch (\Exception $e) {
                Db::rollback();

                // 清理临时文件
                foreach ($images as $imagePath) {
                    if (file_exists($imagePath) && strpos($imagePath, sys_get_temp_dir()) === 0) {
                        @unlink($imagePath);
                    }
                }
                if (file_exists($tmpFile) && strpos($tmpFile, sys_get_temp_dir()) === 0) {
                    @unlink($tmpFile);
                }

                return json(['code' => 500, 'msg' => '导入失败：' . $e->getMessage()]);
            }

        } catch (\Exception $e) {
            return json(['code' => 500, 'msg' => '导入失败：' . $e->getMessage()]);
        }
    }

    /**
     * 根据列序号生成Excel列字母
     * @param int $index 列索引（从0开始）
     * @return string 列字母（如A, B, C, ..., Z, AA, AB等）
     */
    private function columnLetter($index)
    {
        $letters = '';
        do {
            $letters = chr($index % 26 + 65) . $letters;
            $index = intval($index / 26) - 1;
        } while ($index >= 0);
        return $letters;
    }
}