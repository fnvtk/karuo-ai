<?php

namespace app\cunkebao\controller\workbench;

use app\api\controller\WebSocketController;
use app\common\model\Device as DeviceModel;
use app\common\model\DeviceWechatLogin as DeviceWechatLoginModel;
use app\common\model\WechatCustomer as WechatCustomerModel;
use app\cunkebao\model\Workbench;
use app\cunkebao\model\WorkbenchAutoLike;
use app\cunkebao\model\WorkbenchImportContact;
use app\cunkebao\model\WorkbenchMomentsSync;
use app\cunkebao\model\WorkbenchGroupPush;
use app\cunkebao\model\WorkbenchGroupCreate;
use app\cunkebao\model\WorkbenchGroupWelcome;
use app\cunkebao\validate\Workbench as WorkbenchValidate;
use think\Controller;
use think\Db;
use app\cunkebao\model\WorkbenchTrafficConfig;
use app\cunkebao\model\ContentLibrary;
use think\facade\Env;

/**
 * 工作台控制器
 */
class WorkbenchController extends Controller
{
    /**
     * 工作台类型定义
     */
    const TYPE_AUTO_LIKE = 1;      // 自动点赞
    const TYPE_MOMENTS_SYNC = 2;    // 朋友圈同步
    const TYPE_GROUP_PUSH = 3;      // 群消息推送
    const TYPE_GROUP_CREATE = 4;    // 自动建群
    const TYPE_TRAFFIC_DISTRIBUTION = 5;    // 流量分发
    const TYPE_IMPORT_CONTACT = 6;    // 联系人导入
    const TYPE_GROUP_WELCOME = 7;    // 入群欢迎语

    /**
     * 创建工作台
     * @return \think\response\Json
     */
    public function create()
    {
        if (!$this->request->isPost()) {
            return json(['code' => 400, 'msg' => '请求方式错误']);
        }

        // 获取登录用户信息
        $userInfo = request()->userInfo;

        // 获取请求参数
        $param = $this->request->post();
        
        // 根据业务默认值补全参数
        if (
            isset($param['type']) &&
            intval($param['type']) === self::TYPE_GROUP_PUSH
        ) {
            if (empty($param['startTime'])) {
                $param['startTime'] = '09:00';
            }
            if (empty($param['endTime'])) {
                $param['endTime'] = '21:00';
            }
        }

        // 验证数据
        $validate = new WorkbenchValidate;
        if (!$validate->scene('create')->check($param)) {
            return json(['code' => 400, 'msg' => $validate->getError()]);
        }

        Db::startTrans();
        try {
            // 创建工作台基本信息
            $workbench = new Workbench;
            $workbench->name = $param['name'];
            $workbench->type = $param['type'];
            $workbench->status = !empty($param['status']) ? 1 : 0;
            $workbench->autoStart = !empty($param['autoStart']) ? 1 : 0;
            // 计划类型：0=全局，1=独立（默认1）
            $workbench->planType = isset($param['planType']) ? intval($param['planType']) : 1;
            $workbench->userId = $userInfo['id'];
            $workbench->companyId = $userInfo['companyId'];
            $workbench->createTime = time();
            $workbench->updateTime = time();
            $workbench->save();

            // 根据类型创建对应的配置
            switch ($param['type']) {
                case self::TYPE_AUTO_LIKE: // 自动点赞
                    $config = new WorkbenchAutoLike;
                    $config->workbenchId = $workbench->id;
                    $config->interval = $param['interval'];
                    $config->maxLikes = $param['maxLikes'];
                    $config->startTime = $param['startTime'];
                    $config->endTime = $param['endTime'];
                    $config->contentTypes = json_encode($param['contentTypes']);
                    $config->devices = json_encode($param['deviceGroups']);
                    $config->friends = json_encode($param['wechatFriends']);
                    // $config->targetGroups = json_encode($param['targetGroups']);
                    // $config->tagOperator = $param['tagOperator'];
                    $config->friendMaxLikes = $param['friendMaxLikes'];
                    $config->friendTags = $param['friendTags'];
                    $config->enableFriendTags = $param['enableFriendTags'];
                    $config->createTime = time();
                    $config->updateTime = time();
                    $config->save();
                    break;
                case self::TYPE_MOMENTS_SYNC: // 朋友圈同步
                    $config = new WorkbenchMomentsSync;
                    $config->workbenchId = $workbench->id;
                    $config->syncInterval = $param['syncInterval'];
                    $config->syncCount = $param['syncCount'];
                    $config->syncType = $param['syncType'];
                    $config->startTime = $param['startTime'];
                    $config->endTime = $param['endTime'];
                    $config->accountType = $param['accountType'];
                    $config->devices = json_encode($param['deviceGroups']);
                    $config->contentLibraries = json_encode($param['contentGroups'] ?? []);
                    $config->createTime = time();
                    $config->updateTime = time();
                    $config->save();
                    break;
                case self::TYPE_GROUP_PUSH: // 群消息推送
                    $ownerWechatIds = $this->normalizeOwnerWechatIds($param['ownerWechatIds'] ?? []);
                    $groupPushData = $this->prepareGroupPushData($param, $ownerWechatIds);
                    $groupPushData['workbenchId'] = $workbench->id;
                    $groupPushData['createTime'] = time();
                    $groupPushData['updateTime'] = time();
                    $config = new WorkbenchGroupPush;
                    $config->save($groupPushData);
                    break;
                case self::TYPE_GROUP_CREATE: // 自动建群
                    $config = new WorkbenchGroupCreate;
                    $config->workbenchId = $workbench->id;
                    $config->executorId = !empty($param['executorId']) ? $param['executorId'] : 0;

                    $config->devices = json_encode($param['deviceGroups'] ?? [], JSON_UNESCAPED_UNICODE);
                    $config->startTime = $param['startTime'] ?? '';
                    $config->endTime = $param['endTime'] ?? '';
                    $config->groupSizeMin = intval($param['groupSizeMin'] ?? 3);
                    $config->groupSizeMax = intval($param['groupSizeMax'] ?? 38);
                    $config->maxGroupsPerDay = intval($param['maxGroupsPerDay'] ?? 20);
                    $config->groupNameTemplate = $param['groupNameTemplate'] ?? '';
                    $config->groupDescription = $param['groupDescription'] ?? '';
                    $config->poolGroups = json_encode($param['poolGroups'] ?? [], JSON_UNESCAPED_UNICODE);
                    $config->wechatGroups = json_encode($param['wechatGroups'] ?? [], JSON_UNESCAPED_UNICODE);
                    
                    // 处理群管理员：如果启用了群管理员且有指定管理员，则保存到admins字段
                    $admins = [];
                    if (!empty($param['groupAdminEnabled']) && !empty($param['groupAdminWechatId'])) {
                        // 如果groupAdminWechatId是数组，取第一个；如果是单个值，直接使用
                        $adminWechatId = is_array($param['groupAdminWechatId']) ? $param['groupAdminWechatId'][0] : $param['groupAdminWechatId'];
                        // 如果是好友ID，直接添加到admins；如果是wechatId，需要转换为好友ID
                        if (is_numeric($adminWechatId)) {
                            $admins[] = intval($adminWechatId);
                        } else {
                            // 如果是wechatId字符串，需要查询对应的好友ID
                            $friend = Db::table('s2_wechat_friend')->where('wechatId', $adminWechatId)->find();
                            if ($friend) {
                                $admins[] = intval($friend['id']);
                            }
                        }
                    }
                    // 如果传入了admins参数，优先使用（兼容旧逻辑）
                    if (!empty($param['admins']) && is_array($param['admins'])) {
                        $admins = array_merge($admins, $param['admins']);
                    }
                    $config->admins = json_encode(array_unique($admins), JSON_UNESCAPED_UNICODE);
                    
                    $config->fixedWechatIds = json_encode($param['fixedWechatIds'] ?? [], JSON_UNESCAPED_UNICODE);
                    $config->createTime = time();
                    $config->updateTime = time();
                    $config->save();
                    break;
                case self::TYPE_TRAFFIC_DISTRIBUTION: // 流量分发
                    $config = new WorkbenchTrafficConfig;
                    $config->workbenchId = $workbench->id;
                    $config->distributeType = $param['distributeType'];
                    $config->maxPerDay = $param['maxPerDay'];
                    $config->timeType = $param['timeType'];
                    $config->startTime = $param['startTime'];
                    $config->endTime = $param['endTime'];
                    $config->devices = json_encode($param['deviceGroups'], JSON_UNESCAPED_UNICODE);
                    $config->pools = json_encode($param['poolGroups'], JSON_UNESCAPED_UNICODE);
                    $config->account = json_encode($param['accountGroups'], JSON_UNESCAPED_UNICODE);
                    $config->createTime = time();
                    $config->updateTime = time();
                    $config->save();
                    break;
                case self::TYPE_IMPORT_CONTACT: //联系人导入
                    $config = new WorkbenchImportContact;
                    $config->workbenchId = $workbench->id;
                    $config->devices = json_encode($param['deviceGroups'], JSON_UNESCAPED_UNICODE);
                    $config->pools = json_encode($param['poolGroups'], JSON_UNESCAPED_UNICODE);
                    $config->num = $param['num'];
                    $config->clearContact = $param['clearContact'];
                    $config->remark = $param['remark'];
                    $config->startTime = $param['startTime'];
                    $config->endTime = $param['endTime'];
                    $config->createTime = time();
                    $config->save();
                    break;
                case self::TYPE_GROUP_WELCOME: // 入群欢迎语
                    $config = new WorkbenchGroupWelcome;
                    $config->workbenchId = $workbench->id;
                    $config->devices = json_encode($param['deviceGroups'] ?? [], JSON_UNESCAPED_UNICODE);
                    $config->groups = json_encode($param['wechatGroups'] ?? [], JSON_UNESCAPED_UNICODE);
                    $config->startTime = $param['startTime'] ?? '';
                    $config->endTime = $param['endTime'] ?? '';
                    $config->interval = isset($param['interval']) ? intval($param['interval']) : 0;
                    // messages 作为 JSON 存储（如果表中有 messages 字段）
                    if (isset($param['messages']) && is_array($param['messages'])) {
                        // 按 order 排序
                        usort($param['messages'], function($a, $b) {
                            $orderA = isset($a['order']) ? intval($a['order']) : 0;
                            $orderB = isset($b['order']) ? intval($b['order']) : 0;
                            return $orderA <=> $orderB;
                        });
                        $config->messages = json_encode($param['messages'], JSON_UNESCAPED_UNICODE);
                    } else {
                        $config->messages = json_encode([], JSON_UNESCAPED_UNICODE);
                    }
                    $config->createTime = time();
                    $config->updateTime = time();
                    $config->save();
                    break;
            }

            Db::commit();
            return json(['code' => 200, 'msg' => '创建成功', 'data' => ['id' => $workbench->id]]);
        } catch (\Exception $e) {
            Db::rollback();
            return json(['code' => 500, 'msg' => '创建失败：' . $e->getMessage()]);
        }
    }

    /**
     * 获取工作台列表
     * @return \think\response\Json
     */
    public function getList()
    {
        $page = $this->request->param('page', 1);
        $limit = $this->request->param('limit', 10);
        $type = $this->request->param('type', '');
        $keyword = $this->request->param('keyword', '');

        $where = [
            ['companyId', '=', $this->request->userInfo['companyId']],
            ['isDel', '=', 0]
        ];

        if (empty($this->request->userInfo['isAdmin'])) {
            $where[] =  ['userId', '=', $this->request->userInfo['id']];
        }



        // 添加类型筛选
        if ($type !== '') {
            $where[] = ['type', '=', $type];
        }

        // 添加名称模糊搜索
        if ($keyword !== '') {
            $where[] = ['name', 'like', '%' . $keyword . '%'];
        }

        // 定义关联关系
        $with = [
            'autoLike' => function ($query) {
                $query->field('workbenchId,interval,maxLikes,startTime,endTime,contentTypes,devices,friends');
            },
            'momentsSync' => function ($query) {
                $query->field('workbenchId,syncInterval,syncCount,syncType,startTime,endTime,accountType,devices,contentLibraries');
            },
            'trafficConfig' => function ($query) {
                $query->field('workbenchId,distributeType,maxPerDay,timeType,startTime,endTime,devices,pools,account');
            },
            'groupPush' => function ($query) {
                $query->field('workbenchId,pushType,targetType,groupPushSubType,startTime,endTime,maxPerDay,pushOrder,isLoop,status,groups,friends,ownerWechatIds,trafficPools,contentLibraries,friendIntervalMin,friendIntervalMax,messageIntervalMin,messageIntervalMax,isRandomTemplate,postPushTags,announcementContent,enableAiRewrite,aiRewritePrompt');
            },
            'groupCreate' => function ($query) {
                $query->field('workbenchId,devices,startTime,endTime,groupSizeMin,groupSizeMax,maxGroupsPerDay,groupNameTemplate,groupDescription,poolGroups,wechatGroups,admins');
            },
            'importContact' => function ($query) {
                $query->field('workbenchId,devices,pools,num,remarkType,remark,clearContact,startTime,endTime');
            },
            'user' => function ($query) {
                $query->field('id,username');
            }
        ];

        $list = Workbench::where($where)
            ->with($with)
            ->field('id,companyId,name,type,status,autoStart,planType,userId,createTime,updateTime')
            ->order('id', 'desc')
            ->page($page, $limit)
            ->select()
            ->each(function ($item) {
                // 处理配置信息
                switch ($item->type) {
                    case self::TYPE_AUTO_LIKE:
                        if (!empty($item->autoLike)) {
                            $item->config = $item->autoLike;
                            $item->config->devices = json_decode($item->config->devices, true);
                            $item->config->contentTypes = json_decode($item->config->contentTypes, true);
                            $item->config->friends = json_decode($item->config->friends, true);

                            // 添加今日点赞数
                            $startTime = strtotime(date('Y-m-d') . ' 00:00:00');
                            $endTime = strtotime(date('Y-m-d') . ' 23:59:59');
                            $todayLikeCount = Db::name('workbench_auto_like_item')
                                ->where('workbenchId', $item->id)
                                ->whereTime('createTime', 'between', [$startTime, $endTime])
                                ->count();

                            // 添加总点赞数
                            $totalLikeCount = Db::name('workbench_auto_like_item')
                                ->where('workbenchId', $item->id)
                                ->count();

                            $item->config->todayLikeCount = $todayLikeCount;
                            $item->config->totalLikeCount = $totalLikeCount;
                        }
                        unset($item->autoLike, $item->auto_like);
                        break;
                    case self::TYPE_MOMENTS_SYNC:
                        if (!empty($item->momentsSync)) {
                            $item->config = $item->momentsSync;
                            $item->config->devices = json_decode($item->config->devices, true);
                            $item->config->contentGroups = json_decode($item->config->contentLibraries, true);
                            //同步记录
                            $sendNum = Db::name('workbench_moments_sync_item')->where(['workbenchId' => $item->id])->count();
                            $item->syncCount = $sendNum;
                            $lastTime = Db::name('workbench_moments_sync_item')->where(['workbenchId' => $item->id])->order('id DESC')->value('createTime');
                            $item->lastSyncTime = !empty($lastTime) ? date('Y-m-d H:i', $lastTime) : '--';


                            // 获取内容库名称
                            if (!empty($item->config->contentGroups)) {
                                $libraryNames = ContentLibrary::where('id', 'in', $item->config->contentGroups)->select();
                                $item->config->contentGroupsOptions = $libraryNames;
                            } else {
                                $item->config->contentGroupsOptions = [];
                            }
                        }
                        unset($item->momentsSync, $item->moments_sync, $item->config->contentLibraries);
                        break;
                    case self::TYPE_GROUP_PUSH:
                        if (!empty($item->groupPush)) {
                            $item->config = $item->groupPush;
                            $item->config->pushType = $item->config->pushType;
                            $item->config->targetType = isset($item->config->targetType) ? intval($item->config->targetType) : 1; // 默认1=群推送
                            $item->config->groupPushSubType = isset($item->config->groupPushSubType) ? intval($item->config->groupPushSubType) : 1; // 默认1=群群发
                            $item->config->startTime = $item->config->startTime;
                            $item->config->endTime = $item->config->endTime;
                            $item->config->maxPerDay = $item->config->maxPerDay;
                            $item->config->pushOrder = $item->config->pushOrder;
                            $item->config->isLoop = $item->config->isLoop;
                            $item->config->status = $item->config->status;
                            $item->config->ownerWechatIds = json_decode($item->config->ownerWechatIds ?? '[]', true) ?: [];
                            // 根据targetType解析不同的数据
                            if ($item->config->targetType == 1) {
                                // 群推送
                                $item->config->wechatGroups = json_decode($item->config->groups, true) ?: [];
                                $item->config->wechatFriends = [];
                                // 群推送不需要devices字段
                                // 群公告相关字段
                                if ($item->config->groupPushSubType == 2) {
                                    $item->config->announcementContent = isset($item->config->announcementContent) ? $item->config->announcementContent : '';
                                    $item->config->enableAiRewrite = isset($item->config->enableAiRewrite) ? intval($item->config->enableAiRewrite) : 0;
                                    $item->config->aiRewritePrompt = isset($item->config->aiRewritePrompt) ? $item->config->aiRewritePrompt : '';
                                }
                                $item->config->trafficPools = [];
                            } else {
                                // 好友推送
                                $item->config->wechatFriends = json_decode($item->config->friends, true) ?: [];
                                $item->config->wechatGroups = [];
                                $item->config->trafficPools = json_decode($item->config->trafficPools ?? '[]', true) ?: [];
                            }
                            $item->config->contentLibraries = json_decode($item->config->contentLibraries, true);
                            $item->config->postPushTags = json_decode($item->config->postPushTags ?? '[]', true) ?: [];
                            $item->config->lastPushTime = '';
                            if (!empty($item->config->ownerWechatIds)) {
                                $ownerWechatOptions = Db::name('wechat_account')
                                    ->whereIn('id', $item->config->ownerWechatIds)
                                    ->field('id,wechatId,nickName,avatar,alias')
                                    ->select();
                                $item->config->ownerWechatOptions = $ownerWechatOptions;
                            } else {
                                $item->config->ownerWechatOptions = [];
                            }
                        }
                        unset($item->groupPush, $item->group_push);
                        break;
                    case self::TYPE_GROUP_CREATE:
                        if (!empty($item->groupCreate)) {
                            $item->config = $item->groupCreate;
                            $item->config->devices = json_decode($item->config->devices, true);
                            $item->config->poolGroups = json_decode($item->config->poolGroups, true);
                            $item->config->wechatGroups = json_decode($item->config->wechatGroups, true);
                            $item->config->admins = json_decode($item->config->admins ?? '[]', true) ?: [];
                            
                            // 处理群管理员相关字段
                            $item->config->groupAdminEnabled = !empty($item->config->admins) ? 1 : 0;
                            
                            if (!empty($item->config->admins)) {
                                $adminOptions = Db::table('s2_wechat_friend')->alias('wf')
                                    ->join(['s2_wechat_account' => 'wa'], 'wa.id = wf.wechatAccountId', 'left')
                                    ->where('wf.id', 'in', $item->config->admins)
                                    ->order('wf.id', 'desc')
                                    ->field('wf.id,wf.wechatId,wf.nickname as friendName,wf.avatar as friendAvatar,wf.conRemark,wf.ownerWechatId,wa.nickName as accountName,wa.avatar as accountAvatar')
                                    ->select();
                                $item->config->adminsOptions = $adminOptions;
                                // 如果有管理员，设置groupAdminWechatId为第一个管理员的ID（用于前端回显）
                                $item->config->groupAdminWechatId = !empty($item->config->admins) ? $item->config->admins[0] : null;
                            } else {
                                $item->config->adminsOptions = [];
                                $item->config->groupAdminWechatId = null;
                            }
                        }
                        unset($item->groupCreate, $item->group_create);
                        break;
                    case self::TYPE_TRAFFIC_DISTRIBUTION:
                        if (!empty($item->trafficConfig)) {
                            $item->config = $item->trafficConfig;
                            $item->config->devices = json_decode($item->config->devices, true);
                            $item->config->poolGroups = json_decode($item->config->pools, true);
                            $item->config->account = json_decode($item->config->account, true);
                            $config_item = Db::name('workbench_traffic_config_item')->where(['workbenchId' => $item->id])->order('id DESC')->find();
                            $item->config->lastUpdated = !empty($config_item) ? date('Y-m-d H:i', $config_item['createTime']) : '--';

                            //统计
                            $labels = $item->config->poolGroups;
                            $totalUsers = Db::table('s2_wechat_friend')->alias('wf')
                                ->join(['s2_company_account' => 'sa'], 'sa.id = wf.accountId', 'left')
                                ->join(['s2_wechat_account' => 'wa'], 'wa.id = wf.wechatAccountId', 'left')
                                ->where([
                                    ['wf.isDeleted', '=', 0],
                                    ['sa.departmentId', '=', $item->companyId]
                                ])
                                ->whereIn('wa.currentDeviceId', $item->config->devices);

                            if (!empty($labels) && count($labels) > 0) {
                                $totalUsers = $totalUsers->where(function ($q) use ($labels) {
                                    foreach ($labels as $label) {
                                        $q->whereOrRaw("JSON_CONTAINS(wf.labels, '\"{$label}\"')");
                                    }
                                });
                            }

                            $totalUsers = $totalUsers->count();
                            $totalAccounts = count($item->config->account);
                            $dailyAverage = Db::name('workbench_traffic_config_item')
                                ->where('workbenchId', $item->id)
                                ->count();
                            $day = (time() - strtotime($item->createTime)) / 86400;
                            $day = intval($day);
                            if ($dailyAverage > 0 && $totalAccounts > 0 && $day > 0) {
                                $dailyAverage = $dailyAverage / $totalAccounts / $day;
                            }
                            $item->config->total = [
                                'dailyAverage' => intval($dailyAverage),
                                'totalAccounts' => $totalAccounts,
                                'deviceCount' => count($item->config->devices),
                                'poolCount' => !empty($item->config->poolGroups) ? count($item->config->poolGroups) : 'ALL',
                                'totalUsers' => $totalUsers >> 0
                            ];
                        }
                        unset($item->trafficConfig, $item->traffic_config);
                        break;

                    case self::TYPE_IMPORT_CONTACT:
                        if (!empty($item->importContact)) { 
                            $item->config = $item->importContact;
                            $item->config->devices = json_decode($item->config->devices, true);
                            $item->config->poolGroups = json_decode($item->config->pools, true);
                        }
                        unset($item->importContact, $item->import_contact);
                        break;
                    case self::TYPE_GROUP_WELCOME:
                        if (!empty($item->groupWelcome)) {
                            $item->config = $item->groupWelcome;
                            $item->config->deviceGroups = json_decode($item->config->devices, true);
                            $item->config->wechatGroups = json_decode($item->config->groups, true);
                            // 解析 messages JSON 字段
                            if (!empty($item->config->messages)) {
                                $item->config->messages = json_decode($item->config->messages, true);
                                if (!is_array($item->config->messages)) {
                                    $item->config->messages = [];
                                }
                            } else {
                                $item->config->messages = [];
                            }
                        }
                        unset($item->groupWelcome, $item->group_welcome);
                        break;
                }
                // 添加创建人名称
                $item['creatorName'] = $item->user ? $item->user->username : '';
                unset($item['user']); // 移除关联数据
                return $item;
            });

        $total = Workbench::where($where)->count();

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
     * 获取工作台详情
     * @param int $id 工作台ID
     * @return \think\response\Json
     */
    public function detail()
    {
        $id = $this->request->param('id', '');

        if (empty($id)) {
            return json(['code' => 400, 'msg' => '参数错误']);
        }

        // 定义关联关系
        $with = [
            'autoLike' => function ($query) {
                $query->field('workbenchId,interval,maxLikes,startTime,endTime,contentTypes,devices,friends,friendMaxLikes,friendTags,enableFriendTags');
            },
            'momentsSync' => function ($query) {
                $query->field('workbenchId,syncInterval,syncCount,syncType,startTime,endTime,accountType,devices,contentLibraries');
            },
            'trafficConfig' => function ($query) {
                $query->field('workbenchId,distributeType,maxPerDay,timeType,startTime,endTime,devices,pools,account');
            },
            'groupPush' => function ($query) {
                $query->field('workbenchId,pushType,targetType,groupPushSubType,startTime,endTime,maxPerDay,pushOrder,isLoop,status,groups,friends,ownerWechatIds,trafficPools,contentLibraries,friendIntervalMin,friendIntervalMax,messageIntervalMin,messageIntervalMax,isRandomTemplate,postPushTags,announcementContent,enableAiRewrite,aiRewritePrompt');
            },
            'groupCreate' => function ($query) {
                $query->field('workbenchId,devices,startTime,endTime,groupSizeMin,groupSizeMax,maxGroupsPerDay,groupNameTemplate,groupDescription,poolGroups,wechatGroups,admins,executorId');
            },
            'importContact' => function ($query) {
                $query->field('workbenchId,devices,pools,num,remarkType,remark,clearContact,startTime,endTime');
            },
            'groupWelcome' => function ($query) {
                $query->field('workbenchId,devices,groups,startTime,endTime,interval,messages');
            },
        ];

        $where = [
            ['id', '=', $id],
            ['companyId', '=', $this->request->userInfo['companyId']],
            ['isDel', '=', 0]
        ];
        if (empty($this->request->userInfo['isAdmin'])) {
            $where[] =  ['userId', '=', $this->request->userInfo['id']];
        }


        $workbench = Workbench::where($where)
            ->field('id,name,type,status,autoStart,planType,createTime,updateTime,companyId')
            ->with($with)
            ->find();

        if (empty($workbench)) {
            return json(['code' => 404, 'msg' => '工作台不存在']);
        }

        // 处理配置信息
        switch ($workbench->type) {
            //自动点赞
            case self::TYPE_AUTO_LIKE:
                if (!empty($workbench->autoLike)) {
                    $workbench->config = $workbench->autoLike;
                    $workbench->config->deviceGroups = json_decode($workbench->config->devices, true);
                    $workbench->config->wechatFriends = json_decode($workbench->config->friends, true);
                    $workbench->config->targetType = 2;
                    //$workbench->config->targetGroups = json_decode($workbench->config->targetGroups, true);
                    $workbench->config->contentTypes = json_decode($workbench->config->contentTypes, true);

                    // 添加今日点赞数
                    $startTime = strtotime(date('Y-m-d') . ' 00:00:00');
                    $endTime = strtotime(date('Y-m-d') . ' 23:59:59');
                    $todayLikeCount = Db::name('workbench_auto_like_item')
                        ->where('workbenchId', $workbench->id)
                        ->whereTime('createTime', 'between', [$startTime, $endTime])
                        ->count();

                    // 添加总点赞数
                    $totalLikeCount = Db::name('workbench_auto_like_item')
                        ->where('workbenchId', $workbench->id)
                        ->count();

                    $workbench->config->todayLikeCount = $todayLikeCount;
                    $workbench->config->totalLikeCount = $totalLikeCount;

                    unset($workbench->autoLike, $workbench->auto_like);
                }
                break;
            //自动同步朋友圈
            case self::TYPE_MOMENTS_SYNC:
                if (!empty($workbench->momentsSync)) {
                    $workbench->config = $workbench->momentsSync;
                    $workbench->config->deviceGroups = json_decode($workbench->config->devices, true);
                    $workbench->config->contentGroups = json_decode($workbench->config->contentLibraries, true);

                    //同步记录
                    $sendNum = Db::name('workbench_moments_sync_item')->where(['workbenchId' => $workbench->id])->count();
                    $workbench->syncCount = $sendNum;
                    $lastTime = Db::name('workbench_moments_sync_item')->where(['workbenchId' => $workbench->id])->order('id DESC')->value('createTime');
                    $workbench->lastSyncTime = !empty($lastTime) ? date('Y-m-d H:i', $lastTime) : '--';
                    unset($workbench->momentsSync, $workbench->moments_sync);
                }
                break;
            //群推送
            case self::TYPE_GROUP_PUSH:
                if (!empty($workbench->groupPush)) {
                    $workbench->config = $workbench->groupPush;
                    $workbench->config->targetType = isset($workbench->config->targetType) ? intval($workbench->config->targetType) : 1; // 默认1=群推送
                    $workbench->config->groupPushSubType = isset($workbench->config->groupPushSubType) ? intval($workbench->config->groupPushSubType) : 1; // 默认1=群群发
                    $workbench->config->ownerWechatIds = json_decode($workbench->config->ownerWechatIds ?? '[]', true) ?: [];
                    // 根据targetType解析不同的数据
                    if ($workbench->config->targetType == 1) {
                        // 群推送
                        $workbench->config->wechatGroups = json_decode($workbench->config->groups, true) ?: [];
                        $workbench->config->wechatFriends = [];
                        $workbench->config->trafficPools = [];
                        // 群推送不需要devices字段
                        // 群公告相关字段
                        if ($workbench->config->groupPushSubType == 2) {
                            $workbench->config->announcementContent = isset($workbench->config->announcementContent) ? $workbench->config->announcementContent : '';
                            $workbench->config->enableAiRewrite = isset($workbench->config->enableAiRewrite) ? intval($workbench->config->enableAiRewrite) : 0;
                            $workbench->config->aiRewritePrompt = isset($workbench->config->aiRewritePrompt) ? $workbench->config->aiRewritePrompt : '';
                        }
                    } else {
                        // 好友推送
                        $workbench->config->wechatFriends = json_decode($workbench->config->friends, true) ?: [];
                        $workbench->config->wechatGroups = [];
                        $workbench->config->trafficPools = json_decode($workbench->config->trafficPools ?? '[]', true) ?: [];
                    }
                    $workbench->config->contentLibraries = json_decode($workbench->config->contentLibraries, true);
                    $workbench->config->postPushTags = json_decode($workbench->config->postPushTags ?? '[]', true) ?: [];
                    unset($workbench->groupPush, $workbench->group_push);
                }
                break;
            //建群助手
            case self::TYPE_GROUP_CREATE:
                if (!empty($workbench->groupCreate)) {
                    $workbench->config = $workbench->groupCreate;
                    $workbench->config->deviceGroups = json_decode($workbench->config->devices, true);
                    $workbench->config->poolGroups = json_decode($workbench->config->poolGroups, true);
                    $workbench->config->wechatGroups = json_decode($workbench->config->wechatGroups, true);
                    $workbench->config->admins = json_decode($workbench->config->admins ?? '[]', true) ?: [];
                    
                    // 处理群管理员相关字段
                    $workbench->config->groupAdminEnabled = !empty($workbench->config->admins) ? 1 : 0;
                    
                    // 如果有管理员，设置groupAdminWechatId为第一个管理员的ID（用于前端回显）
                    $workbench->config->groupAdminWechatId = !empty($workbench->config->admins) ? $workbench->config->admins[0] : null;
                    
                    // 统计已建群数（状态为成功且groupId不为空的记录，按groupId分组去重）
                    $createdGroupsCount = Db::name('workbench_group_create_item')
                        ->where('workbenchId', $workbench->id)
                        ->where('status', 2) // STATUS_SUCCESS = 2
                        ->where('groupId', '<>', null)
                        ->group('groupId')
                        ->count();
                    
                    // 统计总人数（该工作台的所有记录数）
                    $totalMembersCount = Db::name('workbench_group_create_item')
                        ->where('workbenchId', $workbench->id)
                        ->count();
                    
                    // 添加统计信息
                    $workbench->config->stats = [
                        'createdGroupsCount' => $createdGroupsCount,
                        'totalMembersCount' => $totalMembersCount
                    ];
                    
                    // 如果 executorId 有值，查询设备详情（格式和 deviceGroupsOptions 一样，但返回一维数组）
                    $executorId = !empty($workbench->config->executorId) ? intval($workbench->config->executorId) : 0;
                    $executor = null;
                    if (!empty($executorId)) {
                        // 查询设备基本信息
                        $device = Db::table('s2_device')
                            ->where('id', $executorId)
                            ->where('isDeleted', 0)
                            ->field('id,imei,memo,alive,wechatAccounts')
                            ->find();
                        
                        if (!empty($device)) {
                            // 查询关联的微信账号（通过 currentDeviceId）
                            $wechatAccount = Db::table('s2_wechat_account')
                                ->where('currentDeviceId', $executorId)
                                ->field('wechatId,nickname,alias,avatar,totalFriend')
                                ->find();
                            
                            // 解析 wechatAccounts JSON 字段
                            $wechatAccountsJson = [];
                            if (!empty($device['wechatAccounts'])) {
                                $wechatAccountsJson = json_decode($device['wechatAccounts'], true);
                                if (!is_array($wechatAccountsJson)) {
                                    $wechatAccountsJson = [];
                                }
                            }
                            
                            // 优先使用 s2_wechat_account 表的数据，如果没有则使用 wechatAccounts JSON 中的第一个
                            $wechatId = '';
                            $nickname = '';
                            $alias = '';
                            $avatar = '';
                            $totalFriend = 0;
                            
                            if (!empty($wechatAccount)) {
                                $wechatId = $wechatAccount['wechatId'] ?? '';
                                $nickname = $wechatAccount['nickname'] ?? '';
                                $alias = $wechatAccount['alias'] ?? '';
                                $avatar = $wechatAccount['avatar'] ?? '';
                                $totalFriend = intval($wechatAccount['totalFriend'] ?? 0);
                            } elseif (!empty($wechatAccountsJson) && is_array($wechatAccountsJson) && count($wechatAccountsJson) > 0) {
                                $firstWechat = $wechatAccountsJson[0];
                                $wechatId = $firstWechat['wechatId'] ?? '';
                                $nickname = $firstWechat['wechatNickname'] ?? '';
                                $alias = $firstWechat['alias'] ?? '';
                                $avatar = $firstWechat['wechatAvatar'] ?? '';
                                $totalFriend = 0; // JSON 中没有 totalFriend 字段
                            }
                            
                            $executor = [
                                'id' => $device['id'],
                                'imei' => $device['imei'] ?? '',
                                'memo' => $device['memo'] ?? '',
                                'alive' => $device['alive'] ?? 0,
                                'wechatId' => $wechatId,
                                'nickname' => $nickname,
                                'alias' => $alias,
                                'avatar' => $avatar,
                                'totalFriend' => $totalFriend
                            ];
                        }
                    }
                    $workbench->config->executor = $executor;
                    
                    unset($workbench->groupCreate, $workbench->group_create);
                }
                break;
            //流量分发
            case self::TYPE_TRAFFIC_DISTRIBUTION:
                if (!empty($workbench->trafficConfig)) {
                    $workbench->config = $workbench->trafficConfig;
                    $workbench->config->deviceGroups = json_decode($workbench->config->devices, true);
                    $workbench->config->accountGroups = json_decode($workbench->config->account, true);
                    $workbench->config->poolGroups = json_decode($workbench->config->pools, true);
                    $config_item = Db::name('workbench_traffic_config_item')->where(['workbenchId' => $workbench->id])->order('id DESC')->find();
                    $workbench->config->lastUpdated = !empty($config_item) ? date('Y-m-d H:i', $config_item['createTime']) : '--';

                    //统计
                    $labels = $workbench->config->poolGroups;
                    $totalUsers = Db::table('s2_wechat_friend')->alias('wf')
                        ->join(['s2_company_account' => 'sa'], 'sa.id = wf.accountId', 'left')
                        ->join(['s2_wechat_account' => 'wa'], 'wa.id = wf.wechatAccountId', 'left')
                        ->where([
                            ['wf.isDeleted', '=', 0],
                            ['sa.departmentId', '=', $workbench->companyId]
                        ])
                        ->whereIn('wa.currentDeviceId', $workbench->config->deviceGroups)
                        ->field('wf.id,wf.wechatAccountId,wf.wechatId,wf.labels,sa.userName,wa.currentDeviceId as deviceId')
                        ->where(function ($q) use ($labels) {
                            foreach ($labels as $label) {
                                $q->whereOrRaw("JSON_CONTAINS(wf.labels, '\"{$label}\"')");
                            }
                        })->count();

                    $totalAccounts = Db::table('s2_company_account')
                        ->alias('a')
                        ->where(['a.departmentId' => $workbench->companyId, 'a.status' => 0])
                        ->whereNotLike('a.userName', '%_offline%')
                        ->whereNotLike('a.userName', '%_delete%')
                        ->group('a.id')
                        ->count();

                    $dailyAverage = Db::name('workbench_traffic_config_item')
                        ->where('workbenchId', $workbench->id)
                        ->count();
                    $day = (time() - strtotime($workbench->createTime)) / 86400;
                    $day = intval($day);


                    if ($dailyAverage > 0) {
                        $dailyAverage = $dailyAverage / $totalAccounts / $day;
                    }

                    $workbench->config->total = [
                        'dailyAverage' => intval($dailyAverage),
                        'totalAccounts' => $totalAccounts,
                        'deviceCount' => count($workbench->config->deviceGroups),
                        'poolCount' => count($workbench->config->poolGroups),
                        'totalUsers' => $totalUsers >> 0
                    ];
                    unset($workbench->trafficConfig, $workbench->traffic_config);
                }
                break;
            case self::TYPE_IMPORT_CONTACT:
                if (!empty($workbench->importContact)) {
                    $workbench->config = $workbench->importContact;
                    $workbench->config->deviceGroups = json_decode($workbench->config->devices, true);
                    $workbench->config->poolGroups = json_decode($workbench->config->pools, true);
                }
                unset($workbench->importContact, $workbench->import_contact);
                break;
            case self::TYPE_GROUP_WELCOME:
                if (!empty($workbench->groupWelcome)) {
                    $workbench->config = $workbench->groupWelcome;
                    $workbench->config->deviceGroups = json_decode($workbench->config->devices, true);
                    $workbench->config->wechatGroups = json_decode($workbench->config->groups, true);
                    // 解析 messages JSON 字段
                    if (!empty($workbench->config->messages)) {
                        $workbench->config->messages = json_decode($workbench->config->messages, true);
                        if (!is_array($workbench->config->messages)) {
                            $workbench->config->messages = [];
                        }
                    } else {
                        $workbench->config->messages = [];
                    }
                }
                unset($workbench->groupWelcome, $workbench->group_welcome);
                break;
        }
        unset(
            $workbench->autoLike,
            $workbench->momentsSync,
            $workbench->groupPush,
            $workbench->groupCreate,
            $workbench->config->devices,
            $workbench->config->friends,
            $workbench->config->groups,
            $workbench->config->contentLibraries,
            $workbench->config->account,
        );


        //获取设备信息
        if (!empty($workbench->config->deviceGroups)) {
            // 查询设备基本信息（包含 wechatAccounts JSON 字段）
            $devices = Db::table('s2_device')
                ->whereIn('id', $workbench->config->deviceGroups)
                ->where('isDeleted', 0)
                ->field('id,imei,memo,alive,wechatAccounts')
                ->order('id desc')
                ->select();
            
            $deviceList = [];
            if (!empty($devices)) {
                // 批量查询关联的微信账号（通过 currentDeviceId）
                $deviceIds = array_column($devices, 'id');
                $wechatAccounts = Db::table('s2_wechat_account')
                    ->whereIn('currentDeviceId', $deviceIds)
                    ->field('currentDeviceId,wechatId,nickname,alias,avatar,totalFriend')
                    ->select();
                
                // 将微信账号按设备ID分组
                $wechatAccountsMap = [];
                foreach ($wechatAccounts as $wa) {
                    $deviceId = $wa['currentDeviceId'];
                    if (!isset($wechatAccountsMap[$deviceId])) {
                        $wechatAccountsMap[$deviceId] = $wa;
                    }
                }
                
                // 处理每个设备
                foreach ($devices as $device) {
                    $deviceId = $device['id'];
                    
                    // 查询关联的微信账号（通过 currentDeviceId）
                    $wechatAccount = $wechatAccountsMap[$deviceId] ?? null;
                    
                    // 解析 wechatAccounts JSON 字段
                    $wechatAccountsJson = [];
                    if (!empty($device['wechatAccounts'])) {
                        $wechatAccountsJson = json_decode($device['wechatAccounts'], true);
                        if (!is_array($wechatAccountsJson)) {
                            $wechatAccountsJson = [];
                        }
                    }
                    
                    // 优先使用 s2_wechat_account 表的数据，如果没有则使用 wechatAccounts JSON 中的第一个
                    $wechatId = '';
                    $nickname = '';
                    $alias = '';
                    $avatar = '';
                    $totalFriend = 0;
                    
                    if (!empty($wechatAccount)) {
                        $wechatId = $wechatAccount['wechatId'] ?? '';
                        $nickname = $wechatAccount['nickname'] ?? '';
                        $alias = $wechatAccount['alias'] ?? '';
                        $avatar = $wechatAccount['avatar'] ?? '';
                        $totalFriend = intval($wechatAccount['totalFriend'] ?? 0);
                    } elseif (!empty($wechatAccountsJson) && is_array($wechatAccountsJson) && count($wechatAccountsJson) > 0) {
                        $firstWechat = $wechatAccountsJson[0];
                        $wechatId = $firstWechat['wechatId'] ?? '';
                        $nickname = $firstWechat['wechatNickname'] ?? '';
                        $alias = $firstWechat['alias'] ?? '';
                        $avatar = $firstWechat['wechatAvatar'] ?? '';
                        $totalFriend = 0; // JSON 中没有 totalFriend 字段
                    }
                    
                    $deviceList[] = [
                        'id' => $device['id'],
                        'imei' => $device['imei'] ?? '',
                        'memo' => $device['memo'] ?? '',
                        'alive' => $device['alive'] ?? 0,
                        'wechatId' => $wechatId,
                        'nickname' => $nickname,
                        'alias' => $alias,
                        'avatar' => $avatar,
                        'totalFriend' => $totalFriend
                    ];
                }
            }

            $workbench->config->deviceGroupsOptions = $deviceList;
        } else {
            $workbench->config->deviceGroupsOptions = [];
        }


      
        // 获取群（当targetType=1时）
        if (!empty($workbench->config->wechatGroups) && $workbench->type != self::TYPE_GROUP_CREATE) {
            $groupList = Db::table('s2_wechat_chatroom')->alias('wc')
                ->whereIn('wc.id', $workbench->config->wechatGroups)
                ->where('wc.isDeleted', 0)
                ->order('wc.id', 'desc')
                ->field('wc.id,wc.nickname as groupName,wc.wechatAccountWechatId as ownerWechatId,wc.wechatAccountNickname as nickName,wc.wechatAccountAvatar as avatar,wc.wechatAccountAlias as alias,wc.chatroomAvatar as groupAvatar')
                ->select();
            $workbench->config->wechatGroupsOptions = $groupList;
        } else {
            $workbench->config->wechatGroupsOptions = [];
        }

        // 获取好友（当targetType=2时）
        if (!empty($workbench->config->wechatFriends)) {
            $friendList = Db::table('s2_wechat_friend')->alias('wf')
                ->join(['s2_wechat_account' => 'wa'], 'wa.id = wf.wechatAccountId', 'left')
                ->where('wf.id', 'in', $workbench->config->wechatFriends)
                ->order('wf.id', 'desc')
                ->field('wf.id,wf.wechatId,wf.nickname as friendName,wf.avatar as friendAvatar,wf.conRemark,wf.ownerWechatId,wa.nickName as accountName,wa.avatar as accountAvatar')
                ->select();
            $workbench->config->wechatFriendsOptions = $friendList;
        } else {
            $workbench->config->wechatFriendsOptions = [];
        }

        // 获取流量池（当targetType=2时）
        if (!empty($workbench->config->trafficPools)) {
            $poolList = [];
            $companyId = $this->request->userInfo['companyId'];
            
            // 检查是否包含"所有好友"（packageId=0）
            $hasAllFriends = in_array(0, $workbench->config->trafficPools) || in_array('0', $workbench->config->trafficPools);
            $normalPools = array_filter($workbench->config->trafficPools, function($id) {
                return $id !== 0 && $id !== '0';
            });
            
            // 处理"所有好友"特殊流量池
            if ($hasAllFriends) {
                // 计算所有好友数量
                $wechatIds = Db::name('device')->alias('d')
                    ->join('(SELECT MAX(id) AS id, deviceId FROM ck_device_wechat_login WHERE companyId='.$companyId.' GROUP BY deviceId) dwl_max', 'dwl_max.deviceId = d.id')
                    ->join('device_wechat_login dwl', 'dwl.id = dwl_max.id')
                    ->where(['d.companyId' => $companyId, 'd.deleteTime' => 0])
                    ->column('dwl.wechatId');
                
                $allFriendsCount = 0;
                if (!empty($wechatIds)) {
                    $allFriendsCount = Db::table('s2_wechat_friend')
                        ->where('ownerWechatId', 'in', $wechatIds)
                        ->where('isDeleted', 0)
                        ->count();
                }
                
                $poolList[] = [
                    'id' => 0,
                    'name' => '所有好友',
                    'description' => '展示公司下所有设备的好友',
                    'pic' => '',
                    'itemCount' => $allFriendsCount,
                ];
            }
            
            // 处理普通流量池
            if (!empty($normalPools)) {
                $normalPoolList = Db::name('traffic_source_package')->alias('tsp')
                ->leftJoin('traffic_source_package_item tspi', 'tspi.packageId = tsp.id and tspi.isDel = 0')
                    ->whereIn('tsp.id', $normalPools)
                ->where('tsp.isDel', 0)
                    ->whereIn('tsp.companyId', [$companyId, 0])
                ->field('tsp.id,tsp.name,tsp.description,tsp.pic,COUNT(tspi.id) as itemCount')
                ->group('tsp.id')
                ->order('tsp.id', 'desc')
                ->select();
                $poolList = array_merge($poolList, $normalPoolList ?: []);
            }
            
            $workbench->config->trafficPoolsOptions = $poolList;
        } else {
            $workbench->config->trafficPoolsOptions = [];
        }

        // 获取内容库名称
        if (!empty($workbench->config->contentGroups)) {
            $libraryNames = ContentLibrary::where('id', 'in', $workbench->config->contentGroups)->select();
            $workbench->config->contentGroupsOptions = $libraryNames;
        } else {
            $workbench->config->contentGroupsOptions = [];
        }

        //账号
        if (!empty($workbench->config->accountGroups)) {
            $account = Db::table('s2_company_account')->alias('a')
                ->where(['a.departmentId' => $this->request->userInfo['companyId'], 'a.status' => 0])
                ->whereIn('a.id', $workbench->config->accountGroups)
                ->whereNotLike('a.userName', '%_offline%')
                ->whereNotLike('a.userName', '%_delete%')
                ->field('a.id,a.userName,a.realName,a.nickname,a.memo')
                ->select();
            $workbench->config->accountGroupsOptions = $account;
        } else {
            $workbench->config->accountGroupsOptions = [];
        }

        if (!empty($workbench->config->poolGroups)) {
            $poolGroupsOptions = Db::name('traffic_source_package')->alias('tsp')
                ->join('traffic_source_package_item tspi', 'tspi.packageId=tsp.id', 'left')
                ->whereIn('tsp.companyId', [$this->request->userInfo['companyId'], 0])
                ->whereIn('tsp.id', $workbench->config->poolGroups)
                ->field('tsp.id,tsp.name,tsp.description,tsp.createTime,count(tspi.id) as num')
                ->group('tsp.id')
                ->select();
            $workbench->config->poolGroupsOptions = $poolGroupsOptions;
        } else {
            $workbench->config->poolGroupsOptions = [];
        }

        if (!empty($workbench->config->ownerWechatIds)) {
            $ownerWechatOptions = Db::name('wechat_account')
                ->whereIn('id', $workbench->config->ownerWechatIds)
                ->field('id,wechatId,nickName,avatar,alias')
                ->select();
            $workbench->config->ownerWechatOptions = $ownerWechatOptions;
        } else {
            $workbench->config->ownerWechatOptions = [];
        }

        // 获取群组选项（自动建群）
        if ($workbench->type == self::TYPE_GROUP_CREATE && !empty($workbench->config->wechatGroups)) {
            // 分离数字ID（好友ID）和字符串ID（手动创建的群组）
            $friendIds = [];
            $manualGroupIds = [];
            
            foreach ($workbench->config->wechatGroups as $groupId) {
                if (is_numeric($groupId)) {
                    $friendIds[] = intval($groupId);
                } else {
                    $manualGroupIds[] = $groupId;
                }
            }
            
            $wechatGroupsOptions = [];
            
            // 查询好友信息（数字ID）
            if (!empty($friendIds)) {
                $friendList = Db::table('s2_wechat_friend')->alias('wf')
                    ->join(['s2_wechat_account' => 'wa'], 'wa.id = wf.wechatAccountId', 'left')
                    ->join(['s2_company_account' => 'ca'], 'ca.id = wf.accountId', 'left')
                    ->where('wf.id', 'in', $friendIds)
                    ->order('wf.id', 'desc')
                    ->field('wf.id,wf.wechatId,wf.nickname,wf.avatar,wf.alias,wf.gender,wf.phone,wa.nickName as accountNickname,ca.userName as account,ca.realName as username,wf.createTime,wf.updateTime,wf.deleteTime,wf.ownerWechatId')
                    ->select();
                
                // 获取群主信息
                foreach ($friendList as &$friend) {
                    if (!empty($friend['ownerWechatId'])) {
                        $owner = Db::name('wechat_account')
                            ->where('wechatId', $friend['ownerWechatId'])
                            ->field('nickName,alias')
                            ->find();
                        $friend['ownerNickname'] = $owner['nickName'] ?? '';
                        $friend['ownerAlias'] = $owner['alias'] ?? '';
                    } else {
                        $friend['ownerNickname'] = '';
                        $friend['ownerAlias'] = '';
                    }
                    $friend['isManual'] = '';
                    // 格式化时间
                    $friend['createTime'] = !empty($friend['createTime']) ? date('Y-m-d H:i:s', $friend['createTime']) : '';
                    $friend['updateTime'] = !empty($friend['updateTime']) ? date('Y-m-d H:i:s', $friend['updateTime']) : '';
                    $friend['deleteTime'] = !empty($friend['deleteTime']) ? date('Y-m-d H:i:s', $friend['deleteTime']) : '';
                }
                unset($friend);
                
                $wechatGroupsOptions = array_merge($wechatGroupsOptions, $friendList);
            }
            
            // 处理手动创建的群组（字符串ID）
            if (!empty($manualGroupIds)) {
                foreach ($manualGroupIds as $groupId) {
                    // 手动创建的群组，只返回基本信息
                    $wechatGroupsOptions[] = [
                        'id' => $groupId,
                        'wechatId' => $groupId,
                        'nickname' => $groupId,
                        'avatar' => '',
                        'isManual' => 1
                    ];
                }
            }
            
            $workbench->config->wechatGroupsOptions = $wechatGroupsOptions;
        } 

        // 获取管理员选项（自动建群）
        if ($workbench->type == self::TYPE_GROUP_CREATE && !empty($workbench->config->admins)) {
            $adminOptions = Db::table('s2_wechat_friend')->alias('wf')
                ->join(['s2_wechat_account' => 'wa'], 'wa.id = wf.wechatAccountId', 'left')
                ->where('wf.id', 'in', $workbench->config->admins)
                ->order('wf.id', 'desc')
                ->field('wf.id,wf.wechatId,wf.nickname as friendName,wf.avatar as friendAvatar,wf.conRemark,wf.ownerWechatId,wa.nickName as accountName,wa.avatar as accountAvatar')
                ->select();
            $workbench->config->adminsOptions = $adminOptions;
        } else {
            $workbench->config->adminsOptions = [];
        }

        return json(['code' => 200, 'msg' => '获取成功', 'data' => $workbench]);
    }

    /**
     * 更新工作台
     * @return \think\response\Json
     */
    public function update()
    {
        if (!$this->request->isPost()) {
            return json(['code' => 400, 'msg' => '请求方式错误']);
        }

        // 获取请求参数
        $param = $this->request->post();

        // 验证数据
        $validate = new WorkbenchValidate;
        if (!$validate->scene('update')->check($param)) {
            return json(['code' => 400, 'msg' => $validate->getError()]);
        }


        $where = [
            ['id', '=', $param['id']],
            ['companyId', '=', $this->request->userInfo['companyId']],
            ['isDel', '=', 0]
        ];
        if (empty($this->request->userInfo['isAdmin'])) {
            $where[] =  ['userId', '=', $this->request->userInfo['id']];
        }

        // 查询工作台是否存在
        $workbench = Workbench::where($where)->find();
        if (!$workbench) {
            return json(['code' => 404, 'msg' => '工作台不存在']);
        }

        Db::startTrans();
        try {
            // 更新工作台基本信息
            $workbench->name = $param['name'];
            $workbench->status = !empty($param['status']) ? 1 : 0;
            $workbench->autoStart = !empty($param['autoStart']) ? 1 : 0;
            // 更新计划类型：0=全局，1=独立（默认保留原值或1）
            if (isset($param['planType'])) {
                $workbench->planType = intval($param['planType']);
            } elseif (!isset($workbench->planType) || $workbench->planType === null) {
                $workbench->planType = 1;
            }
            $workbench->updateTime = time();
            $workbench->save();

            // 根据类型更新对应的配置
            switch ($workbench->type) {
                case self::TYPE_AUTO_LIKE:
                    $config = WorkbenchAutoLike::where('workbenchId', $param['id'])->find();
                    if ($config) {
                        $config->interval = $param['interval'];
                        $config->maxLikes = $param['maxLikes'];
                        $config->startTime = $param['startTime'];
                        $config->endTime = $param['endTime'];
                        $config->contentTypes = json_encode($param['contentTypes']);
                        $config->devices = json_encode($param['deviceGroups']);
                        $config->friends = json_encode($param['wechatFriends']);
                        // $config->targetGroups = json_encode($param['targetGroups']);
                        // $config->tagOperator = $param['tagOperator'];
                        $config->friendMaxLikes = $param['friendMaxLikes'];
                        $config->friendTags = $param['friendTags'];
                        $config->enableFriendTags = $param['enableFriendTags'];
                        $config->updateTime = time();
                        $config->save();
                    }
                    break;

                case self::TYPE_MOMENTS_SYNC:
                    $config = WorkbenchMomentsSync::where('workbenchId', $param['id'])->find();
                    if ($config) {
                        if (!empty($param['contentGroups'])) {
                            foreach ($param['contentGroups'] as $library) {
                                if (isset($library['id']) && !empty($library['id'])) {
                                    $contentLibraries[] = $library['id'];
                                } else {
                                    $contentLibraries[] = $library;
                                }
                            }
                        } else {
                            $contentLibraries = [];
                        }

                        $config->syncInterval = $param['syncInterval'];
                        $config->syncCount = $param['syncCount'];
                        $config->syncType = $param['syncType'];
                        $config->startTime = $param['startTime'];
                        $config->endTime = $param['endTime'];
                        $config->accountType = $param['accountType'];
                        $config->devices = json_encode($param['deviceGroups']);
                        $config->contentLibraries = json_encode($contentLibraries);
                        $config->updateTime = time();
                        $config->save();
                    }
                    break;

                case self::TYPE_GROUP_PUSH:
                    $config = WorkbenchGroupPush::where('workbenchId', $param['id'])->find();
                    if ($config) {
                        $ownerWechatIds = $this->normalizeOwnerWechatIds($param['ownerWechatIds'] ?? null, $config);
                        $groupPushData = $this->prepareGroupPushData($param, $ownerWechatIds, $config);
                        $groupPushData['updateTime'] = time();
                        $config->save($groupPushData);
                    }
                    break;

                case self::TYPE_GROUP_CREATE:
                    $config = WorkbenchGroupCreate::where('workbenchId', $param['id'])->find();
                    if ($config) {
                        $config->devices = json_encode($param['deviceGroups'] ?? [], JSON_UNESCAPED_UNICODE);
                        $config->startTime = $param['startTime'] ?? '';
                        $config->endTime = $param['endTime'] ?? '';
                        $config->executorId = intval($param['executorId'] ?? 3);
                        $config->groupSizeMin = intval($param['groupSizeMin'] ?? 3);
                        $config->groupSizeMax = intval($param['groupSizeMax'] ?? 38);
                        $config->maxGroupsPerDay = intval($param['maxGroupsPerDay'] ?? 20);
                        $config->groupNameTemplate = $param['groupNameTemplate'] ?? '';
                        $config->groupDescription = $param['groupDescription'] ?? '';
                        $config->poolGroups = json_encode($param['poolGroups'] ?? [], JSON_UNESCAPED_UNICODE);
                        $config->wechatGroups = json_encode($param['wechatGroups'] ?? [], JSON_UNESCAPED_UNICODE);
                        
                        // 处理群管理员：如果启用了群管理员且有指定管理员，则保存到admins字段
                        $admins = [];
                        if (!empty($param['groupAdminEnabled']) && !empty($param['groupAdminWechatId'])) {
                            // 如果groupAdminWechatId是数组，取第一个；如果是单个值，直接使用
                            $adminWechatId = is_array($param['groupAdminWechatId']) ? $param['groupAdminWechatId'][0] : $param['groupAdminWechatId'];
                            // 如果是好友ID，直接添加到admins；如果是wechatId，需要转换为好友ID
                            if (is_numeric($adminWechatId)) {
                                $admins[] = intval($adminWechatId);
                            } else {
                                // 如果是wechatId字符串，需要查询对应的好友ID
                                $friend = Db::table('s2_wechat_friend')->where('wechatId', $adminWechatId)->find();
                                if ($friend) {
                                    $admins[] = intval($friend['id']);
                                }
                            }
                        }
                        // 如果传入了admins参数，优先使用（兼容旧逻辑）
                        if (!empty($param['admins']) && is_array($param['admins'])) {
                            $admins = array_merge($admins, $param['admins']);
                        }
                        $config->admins = json_encode(array_unique($admins), JSON_UNESCAPED_UNICODE);
                        
                        $config->updateTime = time();
                        $config->save();
                    }
                    break;
                case self::TYPE_TRAFFIC_DISTRIBUTION:
                    $config = WorkbenchTrafficConfig::where('workbenchId', $param['id'])->find();
                    if ($config) {
                        $config->distributeType = $param['distributeType'];
                        $config->maxPerDay = $param['maxPerDay'];
                        $config->timeType = $param['timeType'];
                        $config->startTime = $param['startTime'];
                        $config->endTime = $param['endTime'];
                        $config->devices = json_encode($param['deviceGroups']);
                        $config->pools = json_encode($param['poolGroups']);
                        $config->account = json_encode($param['accountGroups']);
                        $config->updateTime = time();
                        $config->save();
                    }
                    break;
                case self::TYPE_IMPORT_CONTACT: //联系人导入
                    $config = WorkbenchImportContact::where('workbenchId', $param['id'])->find();;
                    if ($config) {
                        $config->devices = json_encode($param['deviceGroups']);
                        $config->pools = json_encode($param['poolGroups']);
                        $config->num = $param['num'];
                        $config->clearContact = $param['clearContact'];
                        $config->remark = $param['remark'];
                        $config->startTime = $param['startTime'];
                        $config->endTime = $param['endTime'];
                        $config->save();
                    }
                    break;
                case self::TYPE_GROUP_WELCOME: // 入群欢迎语
                    $config = WorkbenchGroupWelcome::where('workbenchId', $param['id'])->find();
                    if ($config) {
                        $config->devices = json_encode($param['deviceGroups'] ?? [], JSON_UNESCAPED_UNICODE);
                        $config->groups = json_encode($param['wechatGroups'] ?? [], JSON_UNESCAPED_UNICODE);
                        $config->startTime = $param['startTime'] ?? '';
                        $config->endTime = $param['endTime'] ?? '';
                        $config->interval = isset($param['interval']) ? intval($param['interval']) : 0;
                        // messages 作为 JSON 存储
                        if (isset($param['messages']) && is_array($param['messages'])) {
                            // 按 order 排序
                            usort($param['messages'], function($a, $b) {
                                $orderA = isset($a['order']) ? intval($a['order']) : 0;
                                $orderB = isset($b['order']) ? intval($b['order']) : 0;
                                return $orderA <=> $orderB;
                            });
                            $config->messages = json_encode($param['messages'], JSON_UNESCAPED_UNICODE);
                        } else {
                            $config->messages = json_encode([], JSON_UNESCAPED_UNICODE);
                        }
                        $config->updateTime = time();
                        $config->save();
                    }
                    break;
            }

            Db::commit();
            return json(['code' => 200, 'msg' => '更新成功']);
        } catch (\Exception $e) {
            Db::rollback();
            return json(['code' => 500, 'msg' => '更新失败：' . $e->getMessage()]);
        }
    }

    /**
     * 更新工作台状态
     * @return \think\response\Json
     */
    public function updateStatus()
    {
        if (!$this->request->isPost()) {
            return json(['code' => 400, 'msg' => '请求方式错误']);
        }

        $id = $this->request->param('id', '');

        if (empty($id)) {
            return json(['code' => 400, 'msg' => '参数错误']);
        }



        $where = [
            ['id', '=', $id],
            ['companyId', '=', $this->request->userInfo['companyId']],
            ['isDel', '=', 0]
        ];
        if (empty($this->request->userInfo['isAdmin'])) {
            $where[] =  ['userId', '=', $this->request->userInfo['id']];
        }

        $workbench = Workbench::where($where)->find();

        if (empty($workbench)) {
            return json(['code' => 404, 'msg' => '工作台不存在']);
        }

        $workbench->status = !$workbench['status'];
        $workbench->save();

        return json(['code' => 200, 'msg' => '更新成功']);
    }

    /**
     * 删除工作台（软删除）
     */
    public function delete()
    {
        $id = $this->request->param('id');
        if (empty($id)) {
            return json(['code' => 400, 'msg' => '参数错误']);
        }

        $where = [
            ['id', '=', $id],
            ['companyId', '=', $this->request->userInfo['companyId']],
            ['isDel', '=', 0]
        ];
        if (empty($this->request->userInfo['isAdmin'])) {
            $where[] =  ['userId', '=', $this->request->userInfo['id']];
        }
        $workbench = Workbench::where($where)->find();

        if (!$workbench) {
            return json(['code' => 404, 'msg' => '工作台不存在']);
        }

        // 软删除
        $workbench->isDel = 1;
        $workbench->deleteTime = time();
        $workbench->save();

        return json(['code' => 200, 'msg' => '删除成功']);
    }

    /**
     * 拷贝工作台
     * @return \think\response\Json
     */
    public function copy()
    {
        if (!$this->request->isPost()) {
            return json(['code' => 400, 'msg' => '请求方式错误']);
        }

        $id = $this->request->post('id');
        if (empty($id)) {
            return json(['code' => 400, 'msg' => '参数错误']);
        }

        // 验证权限并获取原数据
        $workbench = Workbench::where([
            ['id', '=', $id],
            ['userId', '=', $this->request->userInfo['id']]
        ])->find();

        if (empty($workbench)) {
            return json(['code' => 404, 'msg' => '工作台不存在']);
        }

        Db::startTrans();
        try {
            // 创建新的工作台基本信息
            $newWorkbench = new Workbench;
            $newWorkbench->name = $workbench->name . ' copy';
            $newWorkbench->type = $workbench->type;
            $newWorkbench->status = 1; // 新拷贝的默认启用
            $newWorkbench->autoStart = $workbench->autoStart;
            // 复制计划类型（0=全局，1=独立，默认1）
            if (isset($workbench->planType)) {
                $newWorkbench->planType = intval($workbench->planType);
            } else {
                $newWorkbench->planType = 1;
            }
            $newWorkbench->userId = $this->request->userInfo['id'];
            $newWorkbench->companyId = $this->request->userInfo['companyId'];
            $newWorkbench->save();

            // 根据类型拷贝对应的配置
            switch ($workbench->type) {
                case self::TYPE_AUTO_LIKE:
                    $config = WorkbenchAutoLike::where('workbenchId', $id)->find();
                    if ($config) {
                        $newConfig = new WorkbenchAutoLike;
                        $newConfig->workbenchId = $newWorkbench->id;
                        $newConfig->interval = $config->interval;
                        $newConfig->maxLikes = $config->maxLikes;
                        $newConfig->startTime = $config->startTime;
                        $newConfig->endTime = $config->endTime;
                        $newConfig->contentTypes = $config->contentTypes;
                        $newConfig->devices = $config->devices;
                        $newConfig->friends = $config->friends;
                        $newConfig->createTime = time();
                        $newConfig->updateTime = time();
                        $newConfig->save();
                    }
                    break;
                case self::TYPE_MOMENTS_SYNC:
                    $config = WorkbenchMomentsSync::where('workbenchId', $id)->find();
                    if ($config) {
                        $newConfig = new WorkbenchMomentsSync;
                        $newConfig->workbenchId = $newWorkbench->id;
                        $newConfig->syncInterval = $config->syncInterval;
                        $newConfig->syncCount = $config->syncCount;
                        $newConfig->syncType = $config->syncType;
                        $newConfig->startTime = $config->startTime;
                        $newConfig->endTime = $config->endTime;
                        $newConfig->accountType = $config->accountType;
                        $newConfig->devices = $config->devices;
                        $newConfig->contentLibraries = $config->contentLibraries;
                        $newConfig->createTime = time();
                        $newConfig->updateTime = time();
                        $newConfig->save();
                    }
                    break;
                case self::TYPE_GROUP_PUSH:
                    $config = WorkbenchGroupPush::where('workbenchId', $id)->find();
                    if ($config) {
                        $newConfig = new WorkbenchGroupPush;
                        $newConfig->workbenchId = $newWorkbench->id;
                        $newConfig->pushType = $config->pushType;
                        $newConfig->targetType = isset($config->targetType) ? $config->targetType : 1; // 默认1=群推送
                        $newConfig->startTime = $config->startTime;
                        $newConfig->endTime = $config->endTime;
                        $newConfig->maxPerDay = $config->maxPerDay;
                        $newConfig->pushOrder = $config->pushOrder;
                        $newConfig->isLoop = $config->isLoop;
                        $newConfig->status = $config->status;
                        $newConfig->groups = $config->groups;
                        $newConfig->friends = $config->friends;
                        $newConfig->contentLibraries = $config->contentLibraries;
                        $newConfig->trafficPools = property_exists($config, 'trafficPools') ? $config->trafficPools : json_encode([], JSON_UNESCAPED_UNICODE);
                        $newConfig->socialMediaId = $config->socialMediaId;
                        $newConfig->promotionSiteId = $config->promotionSiteId;
                        $newConfig->ownerWechatIds = $config->ownerWechatIds;
                        $newConfig->createTime = time();
                        $newConfig->updateTime = time();
                        $newConfig->save();
                    }
                    break;
                case self::TYPE_GROUP_CREATE:
                    $config = WorkbenchGroupCreate::where('workbenchId', $id)->find();
                    if ($config) {
                        $newConfig = new WorkbenchGroupCreate;
                        $newConfig->workbenchId = $newWorkbench->id;
                        $newConfig->devices = $config->devices;
                        $newConfig->startTime = $config->startTime;
                        $newConfig->endTime = $config->endTime;
                        $newConfig->executorId = $config->executorId;
                        $newConfig->groupSizeMin = $config->groupSizeMin;
                        $newConfig->groupSizeMax = $config->groupSizeMax;
                        $newConfig->maxGroupsPerDay = $config->maxGroupsPerDay;
                        $newConfig->groupNameTemplate = $config->groupNameTemplate;
                        $newConfig->groupDescription = $config->groupDescription;
                        $newConfig->poolGroups = $config->poolGroups;
                        $newConfig->wechatGroups = $config->wechatGroups;
                        $newConfig->admins = $config->admins ?? json_encode([], JSON_UNESCAPED_UNICODE);
                        $newConfig->createTime = time();
                        $newConfig->updateTime = time();
                        $newConfig->save();
                    }
                    break;
                case self::TYPE_IMPORT_CONTACT: //联系人导入
                    $config = WorkbenchImportContact::where('workbenchId', $id)->find();
                    if ($config) {
                        $newConfig = new WorkbenchImportContact;
                        $newConfig->workbenchId = $newWorkbench->id;
                        $newConfig->devices = $config->devices;
                        $newConfig->pools = $config->pools;
                        $newConfig->num = $config->num;
                        $newConfig->clearContact = $config->clearContact;
                        $newConfig->remark = $config->remark;
                        $newConfig->startTime = $config->startTime;
                        $newConfig->endTime = $config->endTime;
                        $newConfig->createTime = time();
                        $newConfig->save();
                    }
                    break;
                case self::TYPE_GROUP_WELCOME: // 入群欢迎语
                    $config = WorkbenchGroupWelcome::where('workbenchId', $id)->find();
                    if ($config) {
                        $newConfig = new WorkbenchGroupWelcome;
                        $newConfig->workbenchId = $newWorkbench->id;
                        $newConfig->devices = $config->devices;
                        $newConfig->groups = $config->groups;
                        $newConfig->startTime = $config->startTime;
                        $newConfig->endTime = $config->endTime;
                        $newConfig->interval = $config->interval;
                        $newConfig->messages = $config->messages ?? json_encode([], JSON_UNESCAPED_UNICODE);
                        $newConfig->createTime = time();
                        $newConfig->updateTime = time();
                        $newConfig->save();
                    }
                    break;
            }

            Db::commit();
            return json(['code' => 200, 'msg' => '拷贝成功', 'data' => ['id' => $newWorkbench->id]]);
        } catch (\Exception $e) {
            Db::rollback();
            return json(['code' => 500, 'msg' => '拷贝失败：' . $e->getMessage()]);
        }
    }

    /**
     * 获取点赞记录列表
     * @return \think\response\Json
     */
    public function getLikeRecords()
    {
        $page = $this->request->param('page', 1);
        $limit = $this->request->param('limit', 10);
        $workbenchId = $this->request->param('workbenchId', 0);

        $where = [
            ['wali.workbenchId', '=', $workbenchId]
        ];

        // 查询点赞记录
        $list = Db::name('workbench_auto_like_item')->alias('wali')
            ->join(['s2_wechat_moments' => 'wm'], 'wali.snsId = wm.snsId')
            ->field([
                'wali.id',
                'wali.workbenchId',
                'wali.momentsId',
                'wali.snsId',
                'wali.wechatAccountId',
                'wali.wechatFriendId',
                'wali.createTime as likeTime',
                'wm.content',
                'wm.resUrls',
                'wm.createTime as momentTime',
                'wm.userName',
            ])
            ->where($where)
            ->order('wali.createTime', 'desc')
            ->group('wali.id')
            ->page($page, $limit)
            ->select();

        // 处理数据
        foreach ($list as &$item) {
            //处理用户信息
            $friend = Db::table('s2_wechat_friend')
                ->where(['id' => $item['wechatFriendId']])
                ->field('nickName,avatar')
                ->find();
            if (!empty($friend)) {
                $item['friendName'] = $friend['nickName'];
                $item['friendAvatar'] = $friend['avatar'];
            } else {
                $item['friendName'] = '';
                $item['friendAvatar'] = '';
            }

            //处理客服
            $friend = Db::table('s2_wechat_account')
                ->where(['id' => $item['wechatAccountId']])
                ->field('nickName,avatar')
                ->find();
            if (!empty($friend)) {
                $item['operatorName'] = $friend['nickName'];
                $item['operatorAvatar'] = $friend['avatar'];
            } else {
                $item['operatorName'] = '';
                $item['operatorAvatar'] = '';
            }

            // 处理时间格式
            $item['likeTime'] = date('Y-m-d H:i:s', $item['likeTime']);
            $item['momentTime'] = !empty($item['momentTime']) ? date('Y-m-d H:i:s', $item['momentTime']) : '';

            // 处理资源链接
            if (!empty($item['resUrls'])) {
                $item['resUrls'] = json_decode($item['resUrls'], true);
            } else {
                $item['resUrls'] = [];
            }
        }

        // 获取总记录数
        $total = Db::name('workbench_auto_like_item')->alias('wali')
            ->where($where)
            ->count();

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
     * 获取朋友圈发布记录列表
     * @return \think\response\Json
     */
    public function getMomentsRecords()
    {
        $page = $this->request->param('page', 1);
        $limit = $this->request->param('limit', 10);
        $workbenchId = $this->request->param('workbenchId', 0);

        $where = [
            ['wmsi.workbenchId', '=', $workbenchId]
        ];

        // 查询发布记录
        $list = Db::name('workbench_moments_sync_item')->alias('wmsi')
            ->join('content_item ci', 'ci.id = wmsi.contentId', 'left')
            ->join(['s2_wechat_account' => 'wa'], 'wa.id = wmsi.wechatAccountId', 'left')
            ->field([
                'wmsi.id',
                'wmsi.workbenchId',
                'wmsi.createTime as publishTime',
                'ci.contentType',
                'ci.content',
                'ci.resUrls',
                'ci.urls',
                'wa.nickName as operatorName',
                'wa.avatar as operatorAvatar'
            ])
            ->where($where)
            ->order('wmsi.createTime', 'desc')
            ->page($page, $limit)
            ->select();

        foreach ($list as &$item) {
            $item['resUrls'] = json_decode($item['resUrls'], true);
            $item['urls'] = json_decode($item['urls'], true);
        }

        // 获取总记录数
        $total = Db::name('workbench_moments_sync_item')->alias('wmsi')
            ->where($where)
            ->count();

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
     * 获取朋友圈发布统计
     * @return \think\response\Json
     */
    public function getMomentsStats()
    {
        $workbenchId = $this->request->param('workbenchId', 0);
        if (empty($workbenchId)) {
            return json(['code' => 400, 'msg' => '参数错误']);
        }

        // 获取今日数据
        $todayStart = strtotime(date('Y-m-d') . ' 00:00:00');
        $todayEnd = strtotime(date('Y-m-d') . ' 23:59:59');

        $todayStats = Db::name('workbench_moments_sync_item')
            ->where([
                ['workbenchId', '=', $workbenchId],
                ['createTime', 'between', [$todayStart, $todayEnd]]
            ])
            ->field([
                'COUNT(*) as total',
                'SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as success',
                'SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) as failed'
            ])
            ->find();

        // 获取总数据
        $totalStats = Db::name('workbench_moments_sync_item')
            ->where('workbenchId', $workbenchId)
            ->field([
                'COUNT(*) as total',
                'SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as success',
                'SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) as failed'
            ])
            ->find();

        return json([
            'code' => 200,
            'msg' => '获取成功',
            'data' => [
                'today' => [
                    'total' => intval($todayStats['total']),
                    'success' => intval($todayStats['success']),
                    'failed' => intval($todayStats['failed'])
                ],
                'total' => [
                    'total' => intval($totalStats['total']),
                    'success' => intval($totalStats['success']),
                    'failed' => intval($totalStats['failed'])
                ]
            ]
        ]);
    }

    /**
     * 获取流量分发记录列表
     * @return \think\response\Json
     */
    public function getTrafficDistributionRecords()
    {
        $page = $this->request->param('page', 1);
        $limit = $this->request->param('limit', 10);
        $workbenchId = $this->request->param('workbenchId', 0);

        $where = [
            ['wtdi.workbenchId', '=', $workbenchId]
        ];

        // 查询分发记录
        $list = Db::name('workbench_traffic_distribution_item')->alias('wtdi')
            ->join(['s2_wechat_account' => 'wa'], 'wa.id = wtdi.wechatAccountId', 'left')
            ->join(['s2_wechat_friend' => 'wf'], 'wf.id = wtdi.wechatFriendId', 'left')
            ->field([
                'wtdi.id',
                'wtdi.workbenchId',
                'wtdi.wechatAccountId',
                'wtdi.wechatFriendId',
                'wtdi.createTime as distributeTime',
                'wtdi.status',
                'wtdi.errorMsg',
                'wa.nickName as operatorName',
                'wa.avatar as operatorAvatar',
                'wf.nickName as friendName',
                'wf.avatar as friendAvatar',
                'wf.gender',
                'wf.province',
                'wf.city'
            ])
            ->where($where)
            ->order('wtdi.createTime', 'desc')
            ->page($page, $limit)
            ->select();

        // 处理数据
        foreach ($list as &$item) {
            // 处理时间格式
            $item['distributeTime'] = date('Y-m-d H:i:s', $item['distributeTime']);

            // 处理性别
            $genderMap = [
                0 => '未知',
                1 => '男',
                2 => '女'
            ];
            $item['genderText'] = $genderMap[$item['gender']] ?? '未知';

            // 处理状态文字
            $statusMap = [
                0 => '待分发',
                1 => '分发成功',
                2 => '分发失败'
            ];
            $item['statusText'] = $statusMap[$item['status']] ?? '未知状态';
        }

        // 获取总记录数
        $total = Db::name('workbench_traffic_distribution_item')->alias('wtdi')
            ->where($where)
            ->count();

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
     * 获取流量分发统计
     * @return \think\response\Json
     */
    public function getTrafficDistributionStats()
    {
        $workbenchId = $this->request->param('workbenchId', 0);
        if (empty($workbenchId)) {
            return json(['code' => 400, 'msg' => '参数错误']);
        }

        // 获取今日数据
        $todayStart = strtotime(date('Y-m-d') . ' 00:00:00');
        $todayEnd = strtotime(date('Y-m-d') . ' 23:59:59');

        $todayStats = Db::name('workbench_traffic_distribution_item')
            ->where([
                ['workbenchId', '=', $workbenchId],
                ['createTime', 'between', [$todayStart, $todayEnd]]
            ])
            ->field([
                'COUNT(*) as total',
                'SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as success',
                'SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) as failed'
            ])
            ->find();

        // 获取总数据
        $totalStats = Db::name('workbench_traffic_distribution_item')
            ->where('workbenchId', $workbenchId)
            ->field([
                'COUNT(*) as total',
                'SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as success',
                'SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) as failed'
            ])
            ->find();

        return json([
            'code' => 200,
            'msg' => '获取成功',
            'data' => [
                'today' => [
                    'total' => intval($todayStats['total']),
                    'success' => intval($todayStats['success']),
                    'failed' => intval($todayStats['failed'])
                ],
                'total' => [
                    'total' => intval($totalStats['total']),
                    'success' => intval($totalStats['success']),
                    'failed' => intval($totalStats['failed'])
                ]
            ]
        ]);
    }

    /**
     * 获取流量分发详情
     * @return \think\response\Json
     */
    public function getTrafficDistributionDetail()
    {
        $id = $this->request->param('id', 0);
        if (empty($id)) {
            return json(['code' => 400, 'msg' => '参数错误']);
        }

        $detail = Db::name('workbench_traffic_distribution_item')->alias('wtdi')
            ->join(['s2_wechat_account' => 'wa'], 'wa.id = wtdi.wechatAccountId', 'left')
            ->join(['s2_wechat_friend' => 'wf'], 'wf.id = wtdi.wechatFriendId', 'left')
            ->field([
                'wtdi.id',
                'wtdi.workbenchId',
                'wtdi.wechatAccountId',
                'wtdi.wechatFriendId',
                'wtdi.createTime as distributeTime',
                'wtdi.status',
                'wtdi.errorMsg',
                'wa.nickName as operatorName',
                'wa.avatar as operatorAvatar',
                'wf.nickName as friendName',
                'wf.avatar as friendAvatar',
                'wf.gender',
                'wf.province',
                'wf.city',
                'wf.signature',
                'wf.remark'
            ])
            ->where('wtdi.id', $id)
            ->find();

        if (empty($detail)) {
            return json(['code' => 404, 'msg' => '记录不存在']);
        }

        // 处理数据
        $detail['distributeTime'] = date('Y-m-d H:i:s', $detail['distributeTime']);

        // 处理性别
        $genderMap = [
            0 => '未知',
            1 => '男',
            2 => '女'
        ];
        $detail['genderText'] = $genderMap[$detail['gender']] ?? '未知';

        // 处理状态文字
        $statusMap = [
            0 => '待分发',
            1 => '分发成功',
            2 => '分发失败'
        ];
        $detail['statusText'] = $statusMap[$detail['status']] ?? '未知状态';

        return json([
            'code' => 200,
            'msg' => '获取成功',
            'data' => $detail
        ]);
    }

    /**
     * 创建流量分发计划
     * @return \think\response\Json
     */
    public function createTrafficPlan()
    {
        $controller = new \app\cunkebao\controller\workbench\WorkbenchTrafficController();
        $controller->request = $this->request;
        return $controller->createTrafficPlan();
    }

    /**
     * 获取流量列表
     * @return \think\response\Json
     */
    public function getTrafficList()
    {
        $controller = new \app\cunkebao\controller\workbench\WorkbenchTrafficController();
        $controller->request = $this->request;
        return $controller->getTrafficList();
    }

    /**
     * 获取所有微信好友标签及数量统计
     * @return \think\response\Json
     */
    public function getDeviceLabels()
    {
        $controller = new \app\cunkebao\controller\workbench\WorkbenchHelperController();
        $controller->request = $this->request;
        return $controller->getDeviceLabels();
    }

    /**
     * 获取群列表
     * @return \think\response\Json
     */
    public function getGroupList()
    {
        $controller = new \app\cunkebao\controller\workbench\WorkbenchHelperController();
        $controller->request = $this->request;
        return $controller->getGroupList();
    }

    /**
     * 获取流量池列表
     * @return \think\response\Json
     */
    public function getTrafficPoolList()
    {
        $controller = new \app\cunkebao\controller\workbench\WorkbenchHelperController();
        $controller->request = $this->request;
        return $controller->getTrafficPoolList();
    }

    /**
     * 获取账号列表
     * @return \think\response\Json
     */
    public function getAccountList()
    {
        $controller = new \app\cunkebao\controller\workbench\WorkbenchHelperController();
        $controller->request = $this->request;
        return $controller->getAccountList();
    }

    /**
     * 获取京东联盟导购媒体
     * @return \think\response\Json
     */
    public function getJdSocialMedia()
    {
        $controller = new \app\cunkebao\controller\workbench\WorkbenchHelperController();
        $controller->request = $this->request;
        return $controller->getJdSocialMedia();
    }

    /**
     * 获取京东联盟广告位
     * @return \think\response\Json
     */
    public function getJdPromotionSite()
    {
        $controller = new \app\cunkebao\controller\workbench\WorkbenchHelperController();
        $controller->request = $this->request;
        return $controller->getJdPromotionSite();
    }

    /**
     * 京东转链-京推推
     * @param string $content
     * @param string $positionid
     * @return string
     */
    public function changeLink($content = '', $positionid = '')
    {
        $controller = new \app\cunkebao\controller\workbench\WorkbenchHelperController();
        $controller->request = $this->request;
        return $controller->changeLink($content, $positionid);
    }

    /**
     * 规范化客服微信ID列表
     * @param mixed $ownerWechatIds
     * @param WorkbenchGroupPush|null $originalConfig
     * @return array
     * @throws \Exception
     */
    private function normalizeOwnerWechatIds($ownerWechatIds, WorkbenchGroupPush $originalConfig = null): array
    {
        if ($ownerWechatIds === null) {
            $existing = $originalConfig ? $this->decodeJsonArray($originalConfig->ownerWechatIds ?? []) : [];
            if (empty($existing)) {
                throw new \Exception('请至少选择一个客服微信');
            }
            return $existing;
        }

        if (!is_array($ownerWechatIds)) {
            throw new \Exception('客服参数格式错误');
        }

        $normalized = $this->extractIdList($ownerWechatIds, '客服参数格式错误');
        if (empty($normalized)) {
            throw new \Exception('请至少选择一个客服微信');
        }
        return $normalized;
    }

    /**
     * 构建群推送配置数据
     * @param array $param
     * @param array $ownerWechatIds
     * @param WorkbenchGroupPush|null $originalConfig
     * @return array
     * @throws \Exception
     */
    private function prepareGroupPushData(array $param, array $ownerWechatIds, WorkbenchGroupPush $originalConfig = null): array
    {
        $targetTypeDefault = $originalConfig ? intval($originalConfig->targetType) : 1;
        $targetType = intval($this->getParamValue($param, 'targetType', $targetTypeDefault)) ?: 1;

        $groupPushSubTypeDefault = $originalConfig ? intval($originalConfig->groupPushSubType) : 1;
        $groupPushSubType = intval($this->getParamValue($param, 'groupPushSubType', $groupPushSubTypeDefault)) ?: 1;
        if (!in_array($groupPushSubType, [1, 2], true)) {
            $groupPushSubType = 1;
        }

        $data = [
            'pushType' => $this->toBoolInt($this->getParamValue($param, 'pushType', $originalConfig->pushType ?? 0)),
            'targetType' => $targetType,
            'startTime' => $this->getParamValue($param, 'startTime', $originalConfig->startTime ?? ''),
            'endTime' => $this->getParamValue($param, 'endTime', $originalConfig->endTime ?? ''),
            'maxPerDay' => intval($this->getParamValue($param, 'maxPerDay', $originalConfig->maxPerDay ?? 0)),
            'pushOrder' => $this->getParamValue($param, 'pushOrder', $originalConfig->pushOrder ?? 1),
            'groupPushSubType' => $groupPushSubType,
            'status' => $this->toBoolInt($this->getParamValue($param, 'status', $originalConfig->status ?? 0)),
            'socialMediaId' => $this->getParamValue($param, 'socialMediaId', $originalConfig->socialMediaId ?? ''),
            'promotionSiteId' => $this->getParamValue($param, 'promotionSiteId', $originalConfig->promotionSiteId ?? ''),
            'friendIntervalMin' => intval($this->getParamValue($param, 'friendIntervalMin', $originalConfig->friendIntervalMin ?? 10)),
            'friendIntervalMax' => intval($this->getParamValue($param, 'friendIntervalMax', $originalConfig->friendIntervalMax ?? 20)),
            'messageIntervalMin' => intval($this->getParamValue($param, 'messageIntervalMin', $originalConfig->messageIntervalMin ?? 1)),
            'messageIntervalMax' => intval($this->getParamValue($param, 'messageIntervalMax', $originalConfig->messageIntervalMax ?? 12)),
            'isRandomTemplate' => $this->toBoolInt($this->getParamValue($param, 'isRandomTemplate', $originalConfig->isRandomTemplate ?? 0)),
            'ownerWechatIds' => json_encode($ownerWechatIds, JSON_UNESCAPED_UNICODE),
        ];

        if ($data['friendIntervalMin'] > $data['friendIntervalMax']) {
            throw new \Exception('目标间最小间隔不能大于最大间隔');
        }
        if ($data['messageIntervalMin'] > $data['messageIntervalMax']) {
            throw new \Exception('消息间最小间隔不能大于最大间隔');
        }

        // 群公告（groupPushSubType = 2）时，contentGroups 可以为空，不需要验证
        if ($targetType === 1 && $groupPushSubType === 2) {
            // 群公告可以不传内容库，允许为空，不进行任何验证
            $contentGroupsParam = $this->getParamValue($param, 'contentGroups', null);
            if ($contentGroupsParam !== null) {
                // 如果传入了参数，尝试解析，但不验证格式和是否为空
                try {
                    $contentGroups = $this->extractIdList($contentGroupsParam, '内容库参数格式错误');
                } catch (\Exception $e) {
                    // 群公告时忽略格式错误，使用空数组
                    $contentGroups = [];
                }
            } else {
                // 如果没有传入参数，使用现有配置或空数组
                $contentGroupsExisting = $originalConfig ? $this->decodeJsonArray($originalConfig->contentLibraries ?? []) : [];
                $contentGroups = $contentGroupsExisting;
            }
        } else {
            // 其他情况，正常处理并验证
            $contentGroupsExisting = $originalConfig ? $this->decodeJsonArray($originalConfig->contentLibraries ?? []) : [];
            $contentGroupsParam = $this->getParamValue($param, 'contentGroups', null);
            $contentGroups = $contentGroupsParam !== null
                ? $this->extractIdList($contentGroupsParam, '内容库参数格式错误')
                : $contentGroupsExisting;
            // 其他情况，内容库为必填
            if (empty($contentGroups)) {
                throw new \Exception('请至少选择一个内容库');
            }
        }
        $data['contentLibraries'] = json_encode($contentGroups, JSON_UNESCAPED_UNICODE);

        $postPushTagsExisting = $originalConfig ? $this->decodeJsonArray($originalConfig->postPushTags ?? []) : [];
        $postPushTagsParam = $this->getParamValue($param, 'postPushTags', null);
        $postPushTags = $postPushTagsParam !== null
            ? $this->extractIdList($postPushTagsParam, '推送标签参数格式错误')
            : $postPushTagsExisting;
        $data['postPushTags'] = json_encode($postPushTags, JSON_UNESCAPED_UNICODE);

        if ($targetType === 1) {
            $data['isLoop'] = $this->toBoolInt($this->getParamValue($param, 'isLoop', $originalConfig->isLoop ?? 0));

            $groupsExisting = $originalConfig ? $this->decodeJsonArray($originalConfig->groups ?? []) : [];
            $wechatGroups = array_key_exists('wechatGroups', $param)
                ? $this->extractIdList($param['wechatGroups'], '群参数格式错误')
                : $groupsExisting;
            if (empty($wechatGroups)) {
                throw new \Exception('群推送必须选择微信群');
            }
            $data['groups'] = json_encode($wechatGroups, JSON_UNESCAPED_UNICODE);
            $data['friends'] = json_encode([], JSON_UNESCAPED_UNICODE);
            $data['trafficPools'] = json_encode([], JSON_UNESCAPED_UNICODE);

            if ($groupPushSubType === 2) {
                $announcementContent = $this->getParamValue($param, 'announcementContent', $originalConfig->announcementContent ?? '');
                if (empty($announcementContent)) {
                    throw new \Exception('群公告必须输入公告内容');
                }
                $enableAiRewrite = $this->toBoolInt($this->getParamValue($param, 'enableAiRewrite', $originalConfig->enableAiRewrite ?? 0));
                $aiRewritePrompt = trim((string)$this->getParamValue($param, 'aiRewritePrompt', $originalConfig->aiRewritePrompt ?? ''));
                if ($enableAiRewrite === 1 && $aiRewritePrompt === '') {
                    throw new \Exception('启用AI智能话术改写时，必须输入改写提示词');
                }
                $data['announcementContent'] = $announcementContent;
                $data['enableAiRewrite'] = $enableAiRewrite;
                $data['aiRewritePrompt'] = $aiRewritePrompt;
            } else {
                $data['groupPushSubType'] = 1;
                $data['announcementContent'] = '';
                $data['enableAiRewrite'] = 0;
                $data['aiRewritePrompt'] = '';
            }
        } else {
            $data['isLoop'] = 0;
            $friendsExisting = $originalConfig ? $this->decodeJsonArray($originalConfig->friends ?? []) : [];
            $trafficPoolsExisting = $originalConfig ? $this->decodeJsonArray($originalConfig->trafficPools ?? []) : [];

            $friendTargets = array_key_exists('wechatFriends', $param)
                ? $this->extractIdList($param['wechatFriends'], '好友参数格式错误')
                : $friendsExisting;
            $trafficPools = array_key_exists('trafficPools', $param)
                ? $this->extractIdList($param['trafficPools'], '流量池参数格式错误')
                : $trafficPoolsExisting;

            if (empty($friendTargets) && empty($trafficPools)) {
                throw new \Exception('好友推送需至少选择好友或流量池');
            }

            $data['friends'] = json_encode($friendTargets, JSON_UNESCAPED_UNICODE);
            $data['trafficPools'] = json_encode($trafficPools, JSON_UNESCAPED_UNICODE);
            $data['groups'] = json_encode([], JSON_UNESCAPED_UNICODE);
            $data['groupPushSubType'] = 1;
            $data['announcementContent'] = '';
            $data['enableAiRewrite'] = 0;
            $data['aiRewritePrompt'] = '';
        }

        return $data;
    }

    /**
     * 获取参数值，若不存在则返回默认值
     * @param array $param
     * @param string $key
     * @param mixed $default
     * @return mixed
     */
    private function getParamValue(array $param, string $key, $default)
    {
        return array_key_exists($key, $param) ? $param[$key] : $default;
    }

    /**
     * 将值转换为整型布尔
     * @param mixed $value
     * @return int
     */
    private function toBoolInt($value): int
    {
        return empty($value) ? 0 : 1;
    }

    /**
     * 从参数中提取ID列表
     * @param mixed $items
     * @param string $errorMessage
     * @return array
     * @throws \Exception
     */
    private function extractIdList($items, string $errorMessage = '参数格式错误'): array
    {
        if (!is_array($items)) {
            throw new \Exception($errorMessage);
        }

        $ids = [];
        foreach ($items as $item) {
            if (is_array($item) && isset($item['id'])) {
                $item = $item['id'];
            }
            if ($item === '' || $item === null) {
                continue;
            }
            $ids[] = $item;
        }

        return array_values(array_unique($ids));
    }

    /**
     * 解码JSON数组
     * @param mixed $value
     * @return array
     */
    private function decodeJsonArray($value): array
    {
        if (empty($value)) {
            return [];
        }
        if (is_array($value)) {
            return $value;
        }
        $decoded = json_decode($value, true);
        return is_array($decoded) ? $decoded : [];
    }

    /**
     * 验证内容是否包含链接
     * @param string $content 要检测的内容
     * @return bool
     */
    private function containsLink($content)
    {
        // 定义各种链接的正则表达式模式
        $patterns = [
            // HTTP/HTTPS链接
            '/https?:\/\/[^\s]+/i',
            // 京东商品链接
            '/item\.jd\.com\/\d+/i',
            // 京东短链接
            '/u\.jd\.com\/[a-zA-Z0-9]+/i',
            // 淘宝商品链接
            '/item\.taobao\.com\/item\.htm\?id=\d+/i',
            // 天猫商品链接
            '/detail\.tmall\.com\/item\.htm\?id=\d+/i',
            // 淘宝短链接
            '/m\.tb\.cn\/[a-zA-Z0-9]+/i',
            // 拼多多链接
            '/mobile\.yangkeduo\.com\/goods\.html\?goods_id=\d+/i',
            // 苏宁易购链接
            '/product\.suning\.com\/\d+\/\d+\.html/i',
            // 通用域名模式（包含常见电商域名）
            '/(?:jd|taobao|tmall|yangkeduo|suning|amazon|dangdang)\.com[^\s]*/i',
            // 通用短链接模式
            '/[a-zA-Z0-9-]+\.[a-zA-Z]{2,}\/[a-zA-Z0-9\-._~:\/?#\[\]@!$&\'()*+,;=]+/i'
        ];

        // 遍历所有模式进行匹配
        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $content)) {
                return true;
            }
        }

        return false;
    }


    /**
     * 获取通讯录导入记录列表
     * @return \think\response\Json
     */
    public function getImportContact()
    {
        $page = $this->request->param('page', 1);
        $limit = $this->request->param('limit', 10);
        $workbenchId = $this->request->param('workbenchId', 0);

        $where = [
            ['wici.workbenchId', '=', $workbenchId]
        ];

        // 查询发布记录
        $list = Db::name('workbench_import_contact_item')->alias('wici')
            ->join('traffic_pool tp', 'tp.id = wici.poolId', 'left')
            ->join('traffic_source tc', 'tc.identifier = tp.identifier', 'left')
            ->join('wechat_account wa', 'wa.wechatId = tp.wechatId', 'left')
            ->field([
                'wici.id',
                'wici.workbenchId',
                'wici.createTime',
                'tp.identifier',
                'tp.mobile',
                'tp.wechatId',
                'tc.name',
                'wa.nickName',
                'wa.avatar',
                'wa.alias',
            ])
            ->where($where)
            ->order('tc.name DESC,wici.createTime DESC')
            ->group('tp.identifier')
            ->page($page, $limit)
            ->select();

        foreach ($list as &$item) {
            $item['createTime'] = date('Y-m-d H:i:s', $item['createTime']);
        }


        // 获取总记录数
        $total = Db::name('workbench_import_contact_item')->alias('wici')
            ->where($where)
            ->count();

        return json([
            'code' => 200,
            'msg' => '获取成功',
            'data' => [
                'list' => $list,
                'total' => $total,
            ]
        ]);
    }

    /**
     * 获取群发统计数据
     * @return \think\response\Json
     */
    public function getGroupPushStats()
    {
        $workbenchId = $this->request->param('workbenchId', 0);
        $timeRange = $this->request->param('timeRange', '7'); // 默认最近7天
        $contentLibraryIds = $this->request->param('contentLibraryIds', ''); // 话术组筛选
        $userId = $this->request->userInfo['id'];

        // 如果指定了工作台ID，则验证权限
        if (!empty($workbenchId)) {
            $workbench = Workbench::where([
                ['id', '=', $workbenchId],
                ['userId', '=', $userId],
                ['type', '=', self::TYPE_GROUP_PUSH],
                ['isDel', '=', 0]
            ])->find();

            if (empty($workbench)) {
                return json(['code' => 404, 'msg' => '工作台不存在']);
            }
        }

        // 计算时间范围
        $days = intval($timeRange);
        $startTime = strtotime(date('Y-m-d 00:00:00', strtotime("-{$days} days")));
        $endTime = time();

        // 构建查询条件
        $where = [
            ['wgpi.createTime', '>=', $startTime],
            ['wgpi.createTime', '<=', $endTime]
        ];

        // 如果指定了工作台ID，则限制查询范围
        if (!empty($workbenchId)) {
            $where[] = ['wgpi.workbenchId', '=', $workbenchId];
        } else {
            // 如果没有指定工作台ID，则查询当前用户的所有群推送工作台
            $workbenchIds = Workbench::where([
                ['userId', '=', $userId],
                ['type', '=', self::TYPE_GROUP_PUSH],
                ['isDel', '=', 0]
            ])->column('id');
            
            if (empty($workbenchIds)) {
                // 如果没有工作台，返回空结果
                $workbenchIds = [-1];
            }
            $where[] = ['wgpi.workbenchId', 'in', $workbenchIds];
        }

        // 话术组筛选 - 先获取符合条件的内容ID列表
        $contentIds = null;
        if (!empty($contentLibraryIds)) {
            $libraryIds = is_array($contentLibraryIds) ? $contentLibraryIds : explode(',', $contentLibraryIds);
            $libraryIds = array_filter(array_map('intval', $libraryIds));
            if (!empty($libraryIds)) {
                // 查询符合条件的内容ID
                $contentIds = Db::name('content_item')
                    ->whereIn('libraryId', $libraryIds)
                    ->column('id');
                if (empty($contentIds)) {
                    // 如果没有符合条件的内容，返回空结果
                    $contentIds = [-1]; // 使用不存在的ID，确保查询结果为空
                }
            }
        }

        // 1. 基础统计：触达率、回复率、平均回复时间、链接点击率
        $stats = $this->calculateBasicStats($workbenchId, $where, $startTime, $endTime, $contentIds);

        // 2. 话术组对比
        $contentLibraryComparison = $this->getContentLibraryComparison($workbenchId, $where, $startTime, $endTime, $contentIds);

        // 3. 时段分析
        $timePeriodAnalysis = $this->getTimePeriodAnalysis($workbenchId, $where, $startTime, $endTime, $contentIds);

        // 4. 互动深度（可选，需要更多数据）
        $interactionDepth = $this->getInteractionDepth($workbenchId, $where, $startTime, $endTime, $contentIds);

        return json([
            'code' => 200,
            'msg' => '获取成功',
            'data' => [
                'basicStats' => $stats,
                'contentLibraryComparison' => $contentLibraryComparison,
                'timePeriodAnalysis' => $timePeriodAnalysis,
                'interactionDepth' => $interactionDepth
            ]
        ]);
    }

    /**
     * 计算基础统计数据
     */
    private function calculateBasicStats($workbenchId, $where, $startTime, $endTime, $contentIds = null)
    {
        // 获取工作台配置，计算计划发送数
        // 如果 workbenchId 为空，则查询所有工作台的配置
        $configQuery = WorkbenchGroupPush::alias('wgp')
            ->join('workbench w', 'w.id = wgp.workbenchId', 'left')
            ->where('w.type', self::TYPE_GROUP_PUSH)
            ->where('w.isDel', 0);
        
        if (!empty($workbenchId)) {
            $configQuery->where('wgp.workbenchId', $workbenchId);
        } else {
            // 如果没有指定工作台ID，需要从 where 条件中获取 workbenchId 列表
            $workbenchIdCondition = null;
            foreach ($where as $condition) {
                if (is_array($condition) && isset($condition[0]) && $condition[0] === 'wgpi.workbenchId') {
                    if ($condition[1] === 'in' && is_array($condition[2])) {
                        $workbenchIdCondition = $condition[2];
                        break;
                    } elseif ($condition[1] === '=') {
                        $workbenchIdCondition = [$condition[2]];
                        break;
                    }
                }
            }
            if ($workbenchIdCondition) {
                $configQuery->whereIn('wgp.workbenchId', $workbenchIdCondition);
            }
        }
        
        $configs = $configQuery->select();
        $targetType = 1; // 默认值
        if (!empty($configs)) {
            // 如果只有一个配置，使用它的 targetType；如果有多个，默认使用1
            $targetType = intval($configs[0]->targetType ?? 1);
        }

        // 计划发送数（根据配置计算）
        $plannedSend = 0;
        if (!empty($configs)) {
            $days = ceil(($endTime - $startTime) / 86400);
            foreach ($configs as $config) {
                $maxPerDay = intval($config->maxPerDay ?? 0);
                $configTargetType = intval($config->targetType ?? 1);
                if ($configTargetType == 1) {
                    // 群推送：计划发送数 = 每日推送次数 * 天数 * 群数量
                    $groups = $this->decodeJsonArray($config->groups ?? []);
                    $plannedSend += $maxPerDay * $days * count($groups);
                } else {
                    // 好友推送：计划发送数 = 每日推送人数 * 天数
                    $plannedSend += $maxPerDay * $days;
                }
            }
        }

        // 构建查询条件
        $queryWhere = $where;
        if ($contentIds !== null) {
            $queryWhere[] = ['wgpi.contentId', 'in', $contentIds];
        }

        // 实际成功发送数（从推送记录表统计）
        $successSend = Db::name('workbench_group_push_item')
            ->alias('wgpi')
            ->where($queryWhere)
            ->count();

        // 触达率 = 成功发送数 / 计划发送数
        $reachRate = $plannedSend > 0 ? round(($successSend / $plannedSend) * 100, 1) : 0;

        // 获取发送记录列表，用于查询回复
        $sentItemIds = Db::name('workbench_group_push_item')
            ->alias('wgpi')
            ->where($queryWhere)
            ->field('wgpi.id, wgpi.groupId, wgpi.friendId, wgpi.wechatAccountId, wgpi.createTime, wgpi.targetType, wgpi.contentId')
            ->select();

        // 回复统计（通过消息表查询）
        $replyStats = $this->calculateReplyStats($sentItemIds, $targetType, $startTime, $endTime);

        // 链接点击统计
        $clickStats = $this->calculateClickStats($sentItemIds, $targetType, $startTime, $endTime);

        // 计算本月对比数据（简化处理，实际应该查询上个月同期数据）
        $currentMonthStart = strtotime(date('Y-m-01 00:00:00'));
        $lastMonthStart = strtotime(date('Y-m-01 00:00:00', strtotime('-1 month')));
        $lastMonthEnd = $currentMonthStart - 1;

        // 获取本月统计数据（避免递归调用）
        $currentMonthWhere = [
            ['wgpi.createTime', '>=', $currentMonthStart]
        ];
        // 复制 workbenchId 条件
        foreach ($where as $condition) {
            if (is_array($condition) && isset($condition[0]) && $condition[0] === 'wgpi.workbenchId') {
                $currentMonthWhere[] = $condition;
                break;
            }
        }
        if ($contentIds !== null) {
            $currentMonthWhere[] = ['wgpi.contentId', 'in', $contentIds];
        }
        $currentMonthSend = Db::name('workbench_group_push_item')
            ->alias('wgpi')
            ->where($currentMonthWhere)
            ->count();
        
        // 获取本月配置
        $currentMonthConfigQuery = WorkbenchGroupPush::alias('wgp')
            ->join('workbench w', 'w.id = wgp.workbenchId', 'left')
            ->where('w.type', self::TYPE_GROUP_PUSH)
            ->where('w.isDel', 0);
        if (!empty($workbenchId)) {
            $currentMonthConfigQuery->where('wgp.workbenchId', $workbenchId);
        } else {
            foreach ($where as $condition) {
                if (is_array($condition) && isset($condition[0]) && $condition[0] === 'wgpi.workbenchId' && $condition[1] === 'in') {
                    $currentMonthConfigQuery->whereIn('wgp.workbenchId', $condition[2]);
                    break;
                }
            }
        }
        $currentMonthConfigs = $currentMonthConfigQuery->select();
        $currentMonthPlanned = 0;
        if (!empty($currentMonthConfigs)) {
            $currentMonthDays = ceil(($endTime - $currentMonthStart) / 86400);
            foreach ($currentMonthConfigs as $currentMonthConfig) {
                $currentMonthMaxPerDay = intval($currentMonthConfig->maxPerDay ?? 0);
                $currentMonthTargetType = intval($currentMonthConfig->targetType ?? 1);
                if ($currentMonthTargetType == 1) {
                    $currentMonthGroups = $this->decodeJsonArray($currentMonthConfig->groups ?? []);
                    $currentMonthPlanned += $currentMonthMaxPerDay * $currentMonthDays * count($currentMonthGroups);
                } else {
                    $currentMonthPlanned += $currentMonthMaxPerDay * $currentMonthDays;
                }
            }
        }
        $currentMonthReachRate = $currentMonthPlanned > 0 ? round(($currentMonthSend / $currentMonthPlanned) * 100, 1) : 0;

        // 获取上个月统计数据
        $lastMonthWhere = [
            ['wgpi.createTime', '>=', $lastMonthStart],
            ['wgpi.createTime', '<=', $lastMonthEnd]
        ];
        // 复制 workbenchId 条件
        foreach ($where as $condition) {
            if (is_array($condition) && isset($condition[0]) && $condition[0] === 'wgpi.workbenchId') {
                $lastMonthWhere[] = $condition;
                break;
            }
        }
        if ($contentIds !== null) {
            $lastMonthWhere[] = ['wgpi.contentId', 'in', $contentIds];
        }
        $lastMonthSend = Db::name('workbench_group_push_item')
            ->alias('wgpi')
            ->where($lastMonthWhere)
            ->count();
        
        // 获取上个月配置
        $lastMonthConfigQuery = WorkbenchGroupPush::alias('wgp')
            ->join('workbench w', 'w.id = wgp.workbenchId', 'left')
            ->where('w.type', self::TYPE_GROUP_PUSH)
            ->where('w.isDel', 0);
        if (!empty($workbenchId)) {
            $lastMonthConfigQuery->where('wgp.workbenchId', $workbenchId);
        } else {
            foreach ($where as $condition) {
                if (is_array($condition) && isset($condition[0]) && $condition[0] === 'wgpi.workbenchId' && $condition[1] === 'in') {
                    $lastMonthConfigQuery->whereIn('wgp.workbenchId', $condition[2]);
                    break;
                }
            }
        }
        $lastMonthConfigs = $lastMonthConfigQuery->select();
        
        $lastMonthPlanned = 0;
        if (!empty($lastMonthConfigs)) {
            $lastMonthDays = ceil(($lastMonthEnd - $lastMonthStart) / 86400);
            foreach ($lastMonthConfigs as $lastMonthConfig) {
                $lastMonthMaxPerDay = intval($lastMonthConfig->maxPerDay ?? 0);
                $lastMonthTargetType = intval($lastMonthConfig->targetType ?? 1);
                if ($lastMonthTargetType == 1) {
                    $lastMonthGroups = $this->decodeJsonArray($lastMonthConfig->groups ?? []);
                    $lastMonthPlanned += $lastMonthMaxPerDay * $lastMonthDays * count($lastMonthGroups);
                } else {
                    $lastMonthPlanned += $lastMonthMaxPerDay * $lastMonthDays;
                }
            }
        }
        $lastMonthReachRate = $lastMonthPlanned > 0 ? round(($lastMonthSend / $lastMonthPlanned) * 100, 1) : 0;

        // 获取上个月的回复和点击统计（简化处理）
        $lastMonthSentItems = Db::name('workbench_group_push_item')
            ->alias('wgpi')
            ->where($lastMonthWhere)
            ->field('wgpi.id, wgpi.groupId, wgpi.friendId, wgpi.wechatAccountId, wgpi.createTime, wgpi.targetType, wgpi.contentId')
            ->select();
        $lastMonthReplyStats = $this->calculateReplyStats($lastMonthSentItems, $targetType, $lastMonthStart, $lastMonthEnd);
        $lastMonthClickStats = $this->calculateClickStats($lastMonthSentItems, $targetType, $lastMonthStart, $lastMonthEnd);

        return [
            'reachRate' => [
                'value' => $reachRate,
                'trend' => round($reachRate - $lastMonthReachRate, 1),
                'unit' => '%',
                'description' => '成功发送/计划发送'
            ],
            'replyRate' => [
                'value' => $replyStats['replyRate'],
                'trend' => round($replyStats['replyRate'] - $lastMonthReplyStats['replyRate'], 1),
                'unit' => '%',
                'description' => '收到回复/成功发送'
            ],
            'avgReplyTime' => [
                'value' => $replyStats['avgReplyTime'],
                'trend' => round($lastMonthReplyStats['avgReplyTime'] - $replyStats['avgReplyTime'], 0),
                'unit' => '分钟',
                'description' => '从发送到回复的平均时长'
            ],
            'clickRate' => [
                'value' => $clickStats['clickRate'],
                'trend' => round($clickStats['clickRate'] - $lastMonthClickStats['clickRate'], 1),
                'unit' => '%',
                'description' => '点击链接/成功发送'
            ],
            'plannedSend' => $plannedSend,
            'successSend' => $successSend,
            'replyCount' => $replyStats['replyCount'],
            'clickCount' => $clickStats['clickCount']
        ];
    }

    /**
     * 计算回复统计
     */
    private function calculateReplyStats($sentItems, $targetType, $startTime, $endTime)
    {
        if (empty($sentItems)) {
            return ['replyRate' => 0, 'avgReplyTime' => 0, 'replyCount' => 0];
        }

        $replyCount = 0;
        $totalReplyTime = 0;
        $replyTimes = [];

        foreach ($sentItems as $item) {
            $itemArray = is_array($item) ? $item : (array)$item;
            $sendTime = $itemArray['createTime'] ?? 0;
            $accountId = $itemArray['wechatAccountId'] ?? 0;
            
            if ($targetType == 1) {
                // 群推送：查找群内回复消息
                $groupId = $itemArray['groupId'] ?? 0;
                $group = Db::name('wechat_group')->where('id', $groupId)->find();
                if ($group) {
                    $replyMsg = Db::table('s2_wechat_message')
                        ->where('wechatChatroomId', $group['chatroomId'])
                        ->where('wechatAccountId', $accountId)
                        ->where('isSend', 0) // 接收的消息
                        ->where('wechatTime', '>', $sendTime)
                        ->where('wechatTime', '<=', $sendTime + 86400) // 24小时内回复
                        ->order('wechatTime', 'asc')
                        ->find();
                    
                    if ($replyMsg) {
                        $replyCount++;
                        $replyTime = $replyMsg['wechatTime'] - $sendTime;
                        $replyTimes[] = $replyTime;
                        $totalReplyTime += $replyTime;
                    }
                }
            } else {
                // 好友推送：查找好友回复消息
                $friendId = $itemArray['friendId'] ?? 0;
                $friend = Db::table('s2_wechat_friend')->where('id', $friendId)->find();
                if ($friend) {
                    $replyMsg = Db::table('s2_wechat_message')
                        ->where('wechatFriendId', $friendId)
                        ->where('wechatAccountId', $accountId)
                        ->where('isSend', 0) // 接收的消息
                        ->where('wechatTime', '>', $sendTime)
                        ->where('wechatTime', '<=', $sendTime + 86400) // 24小时内回复
                        ->order('wechatTime', 'asc')
                        ->find();
                    
                    if ($replyMsg) {
                        $replyCount++;
                        $replyTime = $replyMsg['wechatTime'] - $sendTime;
                        $replyTimes[] = $replyTime;
                        $totalReplyTime += $replyTime;
                    }
                }
            }
        }

        $successSend = count($sentItems);
        $replyRate = $successSend > 0 ? round(($replyCount / $successSend) * 100, 1) : 0;
        $avgReplyTime = $replyCount > 0 ? round(($totalReplyTime / $replyCount) / 60, 0) : 0; // 转换为分钟

        return [
            'replyRate' => $replyRate,
            'avgReplyTime' => $avgReplyTime,
            'replyCount' => $replyCount
        ];
    }

    /**
     * 计算链接点击统计
     */
    private function calculateClickStats($sentItems, $targetType, $startTime, $endTime)
    {
        if (empty($sentItems)) {
            return ['clickRate' => 0, 'clickCount' => 0];
        }

        $clickCount = 0;
        $linkContentIds = [];

        // 获取所有发送的内容ID
        foreach ($sentItems as $item) {
            $itemArray = is_array($item) ? $item : (array)$item;
            $contentId = $itemArray['contentId'] ?? 0;
            if ($contentId > 0) {
                $linkContentIds[] = $contentId;
            }
        }

        if (empty($linkContentIds)) {
            return ['clickRate' => 0, 'clickCount' => 0];
        }

        // 查询包含链接的内容
        $linkContents = Db::name('content_item')
            ->whereIn('id', array_unique($linkContentIds))
            ->where('contentType', 2) // 链接类型
            ->column('id');

        // 统计发送了链接内容的记录数
        $linkSendCount = 0;
        foreach ($sentItems as $item) {
            $itemArray = is_array($item) ? $item : (array)$item;
            $contentId = $itemArray['contentId'] ?? 0;
            if (in_array($contentId, $linkContents)) {
                $linkSendCount++;
            }
        }

        // 简化处理：假设点击率基于链接消息的发送（实际应该从点击追踪系统获取）
        // 这里可以根据业务需求调整，比如通过消息中的链接点击事件统计
        $clickCount = $linkSendCount; // 简化处理，实际需要真实的点击数据

        $successSend = count($sentItems);
        $clickRate = $successSend > 0 ? round(($clickCount / $successSend) * 100, 1) : 0;

        return [
            'clickRate' => $clickRate,
            'clickCount' => $clickCount
        ];
    }

    /**
     * 获取话术组对比数据
     */
    private function getContentLibraryComparison($workbenchId, $where, $startTime, $endTime, $contentIds = null)
    {
        $queryWhere = $where;
        if ($contentIds !== null) {
            $queryWhere[] = ['wgpi.contentId', 'in', $contentIds];
        }
        
        $comparison = Db::name('workbench_group_push_item')
            ->alias('wgpi')
            ->join('content_item ci', 'ci.id = wgpi.contentId', 'left')
            ->join('content_library cl', 'cl.id = ci.libraryId', 'left')
            ->where($queryWhere)
            ->where('cl.id', '<>', null)
            ->field([
                'cl.id as libraryId',
                'cl.name as libraryName',
                'COUNT(DISTINCT wgpi.id) as pushCount'
            ])
            ->group('cl.id, cl.name')
            ->select();

        $result = [];
        foreach ($comparison as $item) {
            $libraryId = $item['libraryId'];
            $pushCount = intval($item['pushCount']);

            // 获取该内容库的详细统计
            $libraryContentIds = Db::name('content_item')
                ->where('libraryId', $libraryId)
                ->column('id');
            if (empty($libraryContentIds)) {
                $libraryContentIds = [-1];
            }
            
            $libraryWhere = array_merge($where, [['wgpi.contentId', 'in', $libraryContentIds]]);
            $librarySentItems = Db::name('workbench_group_push_item')
                ->alias('wgpi')
                ->where($libraryWhere)
                ->field('wgpi.id, wgpi.groupId, wgpi.friendId, wgpi.wechatAccountId, wgpi.createTime, wgpi.targetType, wgpi.contentId')
                ->select();

            $config = WorkbenchGroupPush::where('workbenchId', $workbenchId)->find();
            $targetType = $config ? intval($config->targetType) : 1;

            $replyStats = $this->calculateReplyStats($librarySentItems, $targetType, $startTime, $endTime);
            $clickStats = $this->calculateClickStats($librarySentItems, $targetType, $startTime, $endTime);

            // 计算转化率（简化处理，实际需要根据业务定义）
            $conversionRate = $pushCount > 0 ? round(($replyStats['replyCount'] / $pushCount) * 100, 1) : 0;

            $result[] = [
                'libraryId' => $libraryId,
                'libraryName' => $item['libraryName'],
                'pushCount' => $pushCount,
                'reachRate' => 100, // 简化处理，实际应该计算
                'replyRate' => $replyStats['replyRate'],
                'clickRate' => $clickStats['clickRate'],
                'conversionRate' => $conversionRate,
                'avgReplyTime' => $replyStats['avgReplyTime'],
                'level' => $this->getPerformanceLevel($replyStats['replyRate'], $clickStats['clickRate'], $conversionRate)
            ];
        }

        // 按回复率排序
        usort($result, function($a, $b) {
            return $b['replyRate'] <=> $a['replyRate'];
        });

        return $result;
    }

    /**
     * 获取性能等级
     */
    private function getPerformanceLevel($replyRate, $clickRate, $conversionRate)
    {
        $score = ($replyRate * 0.4) + ($clickRate * 0.3) + ($conversionRate * 0.3);
        
        if ($score >= 40) {
            return '优秀';
        } elseif ($score >= 25) {
            return '良好';
        } elseif ($score >= 15) {
            return '一般';
        } else {
            return '待提升';
        }
    }

    /**
     * 获取时段分析数据
     */
    private function getTimePeriodAnalysis($workbenchId, $where, $startTime, $endTime, $contentIds = null)
    {
        $queryWhere = $where;
        if ($contentIds !== null) {
            $queryWhere[] = ['wgpi.contentId', 'in', $contentIds];
        }
        
        $analysis = Db::name('workbench_group_push_item')
            ->alias('wgpi')
            ->where($queryWhere)
            ->field([
                'FROM_UNIXTIME(wgpi.createTime, "%H") as hour',
                'COUNT(*) as count'
            ])
            ->group('hour')
            ->order('hour', 'asc')
            ->select();

        $result = [];
        foreach ($analysis as $item) {
            $result[] = [
                'hour' => intval($item['hour']),
                'count' => intval($item['count'])
            ];
        }

        return $result;
    }

    /**
     * 获取互动深度数据
     */
    private function getInteractionDepth($workbenchId, $where, $startTime, $endTime, $contentIds = null)
    {
        // 简化处理，实际需要更复杂的统计逻辑
        return [
            'singleReply' => 0, // 单次回复
            'multipleReply' => 0, // 多次回复
            'deepInteraction' => 0 // 深度互动
        ];
    }

    /**
     * 获取推送历史记录列表
     * @return \think\response\Json
     */
    public function getGroupPushHistory()
    {
        $page = $this->request->param('page', 1);
        $limit = $this->request->param('limit', 10);
        $workbenchId = $this->request->param('workbenchId', 0);
        $keyword = $this->request->param('keyword', '');
        $pushType = $this->request->param('pushType', ''); // 推送类型筛选：''=全部, 'friend'=好友消息, 'group'=群消息, 'announcement'=群公告
        $status = $this->request->param('status', ''); // 状态筛选：''=全部, 'success'=已完成, 'progress'=进行中, 'failed'=失败
        $userId = $this->request->userInfo['id'];

        // 构建工作台查询条件
        $workbenchWhere = [
            ['w.userId', '=', $userId],
            ['w.type', '=', self::TYPE_GROUP_PUSH],
            ['w.isDel', '=', 0]
        ];

        // 如果指定了工作台ID，则验证权限并限制查询范围
        if (!empty($workbenchId)) {
            $workbench = Workbench::where([
                ['id', '=', $workbenchId],
                ['userId', '=', $userId],
                ['type', '=', self::TYPE_GROUP_PUSH],
                ['isDel', '=', 0]
            ])->find();

            if (empty($workbench)) {
                return json(['code' => 404, 'msg' => '工作台不存在']);
            }
            $workbenchWhere[] = ['w.id', '=', $workbenchId];
        }

        // 1. 先查询所有已执行的推送记录（按推送时间分组）
        $pushHistoryQuery = Db::name('workbench_group_push_item')
            ->alias('wgpi')
            ->join('workbench w', 'w.id = wgpi.workbenchId', 'left')
            ->join('workbench_group_push wgp', 'wgp.workbenchId = wgpi.workbenchId', 'left')
            ->join('content_item ci', 'ci.id = wgpi.contentId', 'left')
            ->join('content_library cl', 'cl.id = ci.libraryId', 'left')
            ->where($workbenchWhere)
            ->field([
                'wgpi.workbenchId',
                'w.name as workbenchName',
                'wgpi.contentId',
                'FROM_UNIXTIME(wgpi.createTime, "%Y-%m-%d %H:00:00") as pushTime',
                'wgpi.targetType',
                'wgp.groupPushSubType',
                'MIN(wgpi.createTime) as createTime',
                'COUNT(DISTINCT wgpi.id) as totalCount',
                'cl.name as contentLibraryName'
            ])
            ->group('wgpi.workbenchId, wgpi.contentId, pushTime, wgpi.targetType, wgp.groupPushSubType');

        if (!empty($keyword)) {
            $pushHistoryQuery->where('w.name|cl.name|ci.content', 'like', '%' . $keyword . '%');
        }

        $pushHistoryList = $pushHistoryQuery->order('createTime', 'desc')->select();

        // 2. 查询所有任务（包括未执行的）
        $allTasksQuery = Db::name('workbench')
            ->alias('w')
            ->join('workbench_group_push wgp', 'wgp.workbenchId = w.id', 'left')
            ->where($workbenchWhere)
            ->field([
                'w.id as workbenchId',
                'w.name as workbenchName',
                'w.createTime',
                'wgp.targetType',
                'wgp.groupPushSubType',
                'wgp.groups',
                'wgp.friends',
                'wgp.trafficPools'
            ]);

        if (!empty($keyword)) {
            $allTasksQuery->where('w.name', 'like', '%' . $keyword . '%');
        }

        $allTasks = $allTasksQuery->select();

        // 3. 合并数据：已执行的推送记录 + 未执行的任务
        $resultList = [];
        $executedWorkbenchIds = [];

        // 处理已执行的推送记录
        foreach ($pushHistoryList as $item) {
            $itemWorkbenchId = $item['workbenchId'];
            $contentId = $item['contentId'];
            $pushTime = $item['pushTime'];
            $targetType = intval($item['targetType']);
            $groupPushSubType = isset($item['groupPushSubType']) ? intval($item['groupPushSubType']) : 1;

            // 标记该工作台已有执行记录
            if (!in_array($itemWorkbenchId, $executedWorkbenchIds)) {
                $executedWorkbenchIds[] = $itemWorkbenchId;
            }

            // 将时间字符串转换为时间戳范围（小时级别）
            $pushTimeStart = strtotime($pushTime);
            $pushTimeEnd = $pushTimeStart + 3600; // 一小时内
            // 获取该次推送的详细统计
            $pushWhere = [
                ['wgpi.workbenchId', '=', $itemWorkbenchId],
                ['wgpi.contentId', '=', $contentId],
                ['wgpi.createTime', '>=', $pushTimeStart],
                ['wgpi.createTime', '<', $pushTimeEnd],
                ['wgpi.targetType', '=', $targetType]
            ];

            // 目标数量
            if ($targetType == 1) {
                // 群推送：统计群数量
                $targetCount = Db::name('workbench_group_push_item')
                    ->alias('wgpi')
                    ->where($pushWhere)
                    ->where('wgpi.groupId', '<>', null)
                    ->distinct(true)
                    ->count('wgpi.groupId');
            } else {
                // 好友推送：统计好友数量
                $targetCount = Db::name('workbench_group_push_item')
                    ->alias('wgpi')
                    ->where($pushWhere)
                    ->where('wgpi.friendId', '<>', null)
                    ->distinct(true)
                    ->count('wgpi.friendId');
            }

            // 成功数和失败数（简化处理，实际需要根据发送状态判断）
            $successCount = intval($item['totalCount']); // 简化处理
            $failCount = 0; // 简化处理，实际需要从发送状态获取
            // 状态判断
            $itemStatus = $successCount > 0 ? 'success' : 'failed';
            if ($failCount > 0 && $successCount > 0) {
                $itemStatus = 'partial';
            }

            // 推送类型判断
            $pushTypeText = '';
            $pushTypeCode = '';
            if ($targetType == 1) {
                // 群推送
                if ($groupPushSubType == 2) {
                    $pushTypeText = '群公告';
                    $pushTypeCode = 'announcement';
                } else {
                    $pushTypeText = '群消息';
                    $pushTypeCode = 'group';
                }
            } else {
                // 好友推送
                $pushTypeText = '好友消息';
                $pushTypeCode = 'friend';
            }

            $resultList[] = [
                'workbenchId' => $itemWorkbenchId,
                'taskName' => $item['workbenchName'] ?? '',
                'pushType' => $pushTypeText,
                'pushTypeCode' => $pushTypeCode,
                'targetCount' => $targetCount,
                'successCount' => $successCount,
                'failCount' => $failCount,
                'status' => $itemStatus,
                'statusText' => $this->getStatusText($itemStatus),
                'createTime' => date('Y-m-d H:i:s', $item['createTime']),
                'contentLibraryName' => $item['contentLibraryName'] ?? ''
            ];
        }

        // 处理未执行的任务
        foreach ($allTasks as $task) {
            $taskWorkbenchId = $task['workbenchId'];
            
            // 如果该任务已有执行记录，跳过（避免重复）
            if (in_array($taskWorkbenchId, $executedWorkbenchIds)) {
                continue;
            }

            $targetType = isset($task['targetType']) ? intval($task['targetType']) : 1;
            $groupPushSubType = isset($task['groupPushSubType']) ? intval($task['groupPushSubType']) : 1;
            
            // 计算目标数量（从配置中获取）
            $targetCount = 0;
            if ($targetType == 1) {
                // 群推送：统计配置的群数量
                $groups = json_decode($task['groups'] ?? '[]', true);
                $targetCount = is_array($groups) ? count($groups) : 0;
            } else {
                // 好友推送：统计配置的好友数量或流量池数量
                $friends = json_decode($task['friends'] ?? '[]', true);
                $trafficPools = json_decode($task['trafficPools'] ?? '[]', true);
                $friendCount = is_array($friends) ? count($friends) : 0;
                $poolCount = is_array($trafficPools) ? count($trafficPools) : 0;
                // 如果配置了流量池，目标数量暂时显示为流量池数量（实际数量需要从流量池中统计）
                $targetCount = $friendCount > 0 ? $friendCount : $poolCount;
            }

            // 推送类型判断
            $pushTypeText = '';
            $pushTypeCode = '';
            if ($targetType == 1) {
                // 群推送
                if ($groupPushSubType == 2) {
                    $pushTypeText = '群公告';
                    $pushTypeCode = 'announcement';
                } else {
                    $pushTypeText = '群消息';
                    $pushTypeCode = 'group';
                }
            } else {
                // 好友推送
                $pushTypeText = '好友消息';
                $pushTypeCode = 'friend';
            }

            $resultList[] = [
                'workbenchId' => $taskWorkbenchId,
                'taskName' => $task['workbenchName'] ?? '',
                'pushType' => $pushTypeText,
                'pushTypeCode' => $pushTypeCode,
                'targetCount' => $targetCount,
                'successCount' => 0,
                'failCount' => 0,
                'status' => 'pending',
                'statusText' => '进行中',
                'createTime' => date('Y-m-d H:i:s', $task['createTime']),
                'contentLibraryName' => ''
            ];
        }

        // 应用筛选条件
        $filteredList = [];
        foreach ($resultList as $item) {
            // 推送类型筛选
            if (!empty($pushType)) {
                if ($pushType === 'friend' && $item['pushTypeCode'] !== 'friend') {
                    continue;
                }
                if ($pushType === 'group' && $item['pushTypeCode'] !== 'group') {
                    continue;
                }
                if ($pushType === 'announcement' && $item['pushTypeCode'] !== 'announcement') {
                    continue;
                }
            }

            // 状态筛选
            if (!empty($status)) {
                if ($status === 'success' && $item['status'] !== 'success') {
                    continue;
                }
                if ($status === 'progress') {
                    // 进行中：包括 partial 和 pending
                    if ($item['status'] !== 'partial' && $item['status'] !== 'pending') {
                        continue;
                    }
                }
                if ($status === 'failed' && $item['status'] !== 'failed') {
                    continue;
                }
            }

            $filteredList[] = $item;
        }

        // 按创建时间倒序排序
        usort($filteredList, function($a, $b) {
            return strtotime($b['createTime']) - strtotime($a['createTime']);
        });

        // 分页处理
        $total = count($filteredList);
        $offset = ($page - 1) * $limit;
        $list = array_slice($filteredList, $offset, $limit);

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
     * 获取状态文本
     * @param string $status 状态码
     * @return string 状态文本
     */
    private function getStatusText($status)
    {
        $statusMap = [
            'success' => '已完成',
            'partial' => '进行中',
            'pending' => '进行中',
            'failed' => '失败'
        ];
        return $statusMap[$status] ?? '未知';
    }

    /**
     * 获取已创建的群列表（自动建群）
     * @return \think\response\Json
     */
    public function getCreatedGroupsList()
    {
        $workbenchId = $this->request->param('workbenchId', 0);
        $page = $this->request->param('page', 1);
        $limit = $this->request->param('limit', 100);
        $keyword = $this->request->param('keyword', '');

        if (empty($workbenchId)) {
            return json(['code' => 400, 'msg' => '工作台ID不能为空']);
        }

        // 验证工作台权限
        $where = [
            ['id', '=', $workbenchId],
            ['companyId', '=', $this->request->userInfo['companyId']],
            ['type', '=', self::TYPE_GROUP_CREATE],
            ['isDel', '=', 0]
        ];
        if (empty($this->request->userInfo['isAdmin'])) {
            $where[] = ['userId', '=', $this->request->userInfo['id']];
        }

        $workbench = Workbench::where($where)->find();
        if (empty($workbench)) {
            return json(['code' => 404, 'msg' => '工作台不存在或无权限']);
        }

        // 获取已创建的群ID列表（状态为成功且groupId不为空）
        $groupIds = Db::name('workbench_group_create_item')
            ->where('workbenchId', $workbenchId)
            ->where('status', 2) // STATUS_SUCCESS = 2
            ->where('groupId', '<>', null)
            ->group('groupId')
            ->column('groupId');

        if (empty($groupIds)) {
            return json([
                'code' => 200,
                'msg' => '获取成功',
                'data' => [
                    'list' => [],
                    'total' => 0,
                    'page' => $page,
                    'limit' => $limit
                ]
            ]);
        }

        // 查询群组详细信息（从s2_wechat_chatroom表查询）
        $query = Db::table('s2_wechat_chatroom')->alias('wc')
            ->join('wechat_account wa', 'wa.wechatId = wc.wechatAccountWechatId', 'left')
            ->where('wc.id', 'in', $groupIds)
            ->where('wc.isDeleted', 0);

        // 关键字搜索
        if (!empty($keyword)) {
            $query->where(function ($q) use ($keyword) {
                $q->where('wc.nickname', 'like', '%' . $keyword . '%')
                  ->whereOr('wc.chatroomId', 'like', '%' . $keyword . '%')
                  ->whereOr('wa.nickName', 'like', '%' . $keyword . '%');
            });
        }

        $total = $query->count();
        $list = $query->field('wc.id,wc.nickname as groupName,wc.chatroomId,wc.chatroomAvatar as groupAvatar,wc.wechatAccountWechatId as ownerWechatId,wc.createTime,wc.chatroomOwnerNickname as ownerNickname,wc.chatroomOwnerAvatar as ownerAvatar,wa.alias as ownerAlias')
            ->order('wc.createTime', 'desc')
            ->page($page, $limit)
            ->select();

        // 统计每个群的成员数量和成员信息
        foreach ($list as &$item) {
            // 统计该群的成员数量（从workbench_group_create_item表统计）
            $memberCount = Db::name('workbench_group_create_item')
                ->where('workbenchId', $workbenchId)
                ->where('groupId', $item['id'])
                ->where('status', 'in', [2, 4]) // 创建成功和管理员好友已拉入
                ->count();
            
            // 获取成员列表（用于显示成员头像）
            $memberList = Db::name('workbench_group_create_item')->alias('wgci')
                ->join(['s2_wechat_friend' => 'wf'], 'wf.id = wgci.friendId', 'left')
                ->where('wgci.workbenchId', $workbenchId)
                ->where('wgci.groupId', $item['id'])
                ->where('wgci.status', 'in', [2, 4])
                ->field('wf.avatar, wf.wechatId, wf.nickname')
                ->order('wgci.createTime', 'asc')
                ->limit(10) // 最多显示10个成员头像
                ->select();
            
            // 格式化成员头像列表
            $memberAvatars = [];
            foreach ($memberList as $member) {
                if (!empty($member['avatar'])) {
                    $memberAvatars[] = [
                        'avatar' => $member['avatar'],
                        'wechatId' => $member['wechatId'] ?? '',
                        'nickname' => $member['nickname'] ?? ''
                    ];
                }
            }
            
            // 计算剩余成员数（用于显示"+XX"）
            $remainingCount = $memberCount > count($memberAvatars) ? $memberCount - count($memberAvatars) : 0;
            
            // 格式化返回数据
            $item['memberCount'] = $memberCount;
            $item['memberCountText'] = $memberCount . '人'; // 格式化为"XX人"
            $item['createTime'] = !empty($item['createTime']) ? date('Y-m-d', $item['createTime']) : ''; // 格式化为"YYYY-MM-DD"
            $item['memberAvatars'] = $memberAvatars; // 成员头像列表（最多10个）
            $item['remainingCount'] = $remainingCount; // 剩余成员数（用于显示"+XX"）
            
            // 保留原有字段，但调整格式
            $item['groupName'] = $item['groupName'] ?? '';
            $item['groupAvatar'] = $item['groupAvatar'] ?? '';
        }
        unset($item);

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
     * 获取已创建群的详情（自动建群）
     * @return \think\response\Json
     */
    public function getCreatedGroupDetail()
    {
        $workbenchId = $this->request->param('workbenchId', 0);
        $groupId = $this->request->param('groupId', 0);

        if (empty($workbenchId)) {
            return json(['code' => 400, 'msg' => '工作台ID不能为空']);
        }

        if (empty($groupId)) {
            return json(['code' => 400, 'msg' => '群ID不能为空']);
        }

        // 验证工作台权限
        $where = [
            ['id', '=', $workbenchId],
            ['companyId', '=', $this->request->userInfo['companyId']],
            ['type', '=', self::TYPE_GROUP_CREATE],
            ['isDel', '=', 0]
        ];
        if (empty($this->request->userInfo['isAdmin'])) {
            $where[] = ['userId', '=', $this->request->userInfo['id']];
        }

        $workbench = Workbench::where($where)->find();
        if (empty($workbench)) {
            return json(['code' => 404, 'msg' => '工作台不存在或无权限']);
        }

        // 验证该群是否属于该工作台
        $groupItem = Db::name('workbench_group_create_item')
            ->where('workbenchId', $workbenchId)
            ->where('groupId', $groupId)
            ->where('status', 2) // STATUS_SUCCESS = 2
            ->find();

        if (empty($groupItem)) {
            return json(['code' => 404, 'msg' => '群不存在或不属于该工作台']);
        }

        // 查询群基本信息（从s2_wechat_chatroom表查询）
        $group = Db::table('s2_wechat_chatroom')->alias('wc')
            ->join('wechat_account wa', 'wa.wechatId = wc.wechatAccountWechatId', 'left')
            ->where('wc.id', $groupId)
            ->where('wc.isDeleted', 0)
            ->field('wc.id,wc.nickname as groupName,wc.chatroomId,wc.chatroomAvatar as groupAvatar,wc.wechatAccountWechatId as ownerWechatId,wc.createTime,wc.chatroomOwnerNickname as ownerNickname,wc.chatroomOwnerAvatar as ownerAvatar,wa.alias as ownerAlias,wc.announce')
            ->find();

        if (empty($group)) {
            return json(['code' => 404, 'msg' => '群不存在']);
        }

        // 获取chatroomId
        $chatroomId = $group['chatroomId'] ?? '';
        if (empty($chatroomId)) {
            return json(['code' => 400, 'msg' => '群聊ID不存在']);
        }

        // 从s2_wechat_chatroom_member表查询所有成员列表（不限制数量）
        $memberList = Db::table('s2_wechat_chatroom_member')->alias('wcm')
            ->join(['s2_wechat_friend' => 'wf'], 'wf.wechatId = wcm.wechatId', 'left')
            ->where('wcm.chatroomId', $chatroomId)
            ->field('wcm.wechatId,wcm.nickname as memberNickname,wcm.avatar as memberAvatar,wcm.conRemark as memberRemark,wcm.alias as memberAlias,wcm.createTime as joinTime,wcm.updateTime,wf.id as friendId,wf.nickname as friendNickname,wf.avatar as friendAvatar')
            ->order('wcm.createTime', 'asc')
            ->select();

        // 去重：按wechatId去重，保留第一条记录
        $memberMap = [];
        foreach ($memberList as $member) {
            $wechatId = $member['wechatId'] ?? '';
            if (!empty($wechatId) && !isset($memberMap[$wechatId])) {
                $memberMap[$wechatId] = $member;
            }
        }
        $memberList = array_values($memberMap); // 重新索引数组

        // 获取在群中的成员wechatId列表（用于判断是否已退群）
        $inGroupWechatIds = array_column($memberList, 'wechatId');
        $inGroupWechatIds = array_filter($inGroupWechatIds); // 过滤空值

        // 获取通过自动建群加入的成员信息（用于判断入群状态和已退群成员）
        $autoJoinMemberList = Db::name('workbench_group_create_item')
            ->alias('wgci')
            ->join(['s2_wechat_friend' => 'wf'], 'wf.id = wgci.friendId', 'left')
            ->where('wgci.workbenchId', $workbenchId)
            ->where('wgci.groupId', $groupId)
            ->where('wgci.status', 'in', [2, 4]) // 创建成功和管理员好友已拉入
            ->field('wf.wechatId,wf.id as friendId,wf.nickname as friendNickname,wf.avatar as friendAvatar,wgci.createTime as autoJoinTime')
            ->select();

        // 去重：按wechatId去重，保留第一条记录
        $autoJoinMemberMap = [];
        foreach ($autoJoinMemberList as $autoMember) {
            $wechatId = $autoMember['wechatId'] ?? '';
            if (!empty($wechatId) && !isset($autoJoinMemberMap[$wechatId])) {
                $autoJoinMemberMap[$wechatId] = $autoMember;
            }
        }
        $autoJoinMemberList = array_values($autoJoinMemberMap); // 重新索引数组

        // 统计成员总数（包括在群中的成员和已退群的成员）
        // 先统计在群中的成员数
        $inGroupCount = count($memberList);
        
        // 统计已退群的成员数（在自动建群记录中但不在群中的成员）
        $quitCount = 0;
        if (!empty($autoJoinMemberList)) {
            foreach ($autoJoinMemberList as $autoMember) {
                $wechatId = $autoMember['wechatId'] ?? '';
                if (!empty($wechatId) && !in_array($wechatId, $inGroupWechatIds)) {
                    $quitCount++;
                }
            }
        }
        
        // 总成员数 = 在群中的成员数 + 已退群的成员数
        $memberCount = $inGroupCount + $quitCount;

        // 获取自动建群加入的成员wechatId列表（用于判断入群状态）
        $autoJoinWechatIds = array_column($autoJoinMemberList, 'wechatId');
        $autoJoinWechatIds = array_filter($autoJoinWechatIds); // 过滤空值

        // 格式化在群中的成员列表
        $members = [];
        $addedWechatIds = []; // 用于记录已添加的成员wechatId，避免重复
        $ownerWechatId = $group['ownerWechatId'] ?? '';
        foreach ($memberList as $member) {
            $wechatId = $member['wechatId'] ?? '';
            
            // 跳过空wechatId和已添加的成员
            if (empty($wechatId) || in_array($wechatId, $addedWechatIds)) {
                continue;
            }
            
            // 标记为已添加
            $addedWechatIds[] = $wechatId;
            
            // 根据wechatId判断是否为群主
            $isOwner = (!empty($ownerWechatId) && $wechatId == $ownerWechatId) ? 1 : 0;
            
            // 判断入群状态：如果在自动建群记录中，说明是通过自动建群加入的；否则是其他方式加入的
            $joinStatus = in_array($wechatId, $autoJoinWechatIds) ? 'auto' : 'manual';
            
            // 判断是否已退群：如果成员在s2_wechat_chatroom_member表中存在，说明在群中；否则已退群
            // 由于我们已经从s2_wechat_chatroom_member表查询，所以这里都是"在群中"状态
            $isQuit = 0; // 0=在群中，1=已退群
            
            // 优先使用friend表的昵称和头像，如果没有则使用member表的
            $nickname = !empty($member['friendNickname']) ? $member['friendNickname'] : ($member['memberNickname'] ?? '');
            $avatar = !empty($member['friendAvatar']) ? $member['friendAvatar'] : ($member['memberAvatar'] ?? '');
            
            $members[] = [
                'friendId' => $member['friendId'] ?? 0,
                'wechatId' => $wechatId,
                'nickname' => $nickname,
                'avatar' => $avatar,
                'alias' => $member['memberAlias'] ?? '',
                'remark' => $member['memberRemark'] ?? '',
                'isOwner' => $isOwner, // 标记群主
                'joinStatus' => $joinStatus, // 入群状态：auto=自动建群加入，manual=其他方式加入
                'isQuit' => $isQuit, // 是否已退群：0=在群中，1=已退群
                'joinTime' => (!empty($member['joinTime']) && is_numeric($member['joinTime']) && $member['joinTime'] > 0) ? date('Y-m-d H:i:s', intval($member['joinTime'])) : '', // 入群时间
            ];
        }

        // 添加已退群的成员（在自动建群记录中但不在群中的成员）
        foreach ($autoJoinMemberList as $autoMember) {
            $wechatId = $autoMember['wechatId'] ?? '';
            
            // 跳过空wechatId、已在群中的成员和已添加的成员
            if (empty($wechatId) || in_array($wechatId, $inGroupWechatIds) || in_array($wechatId, $addedWechatIds)) {
                continue;
            }
            
            // 标记为已添加
            $addedWechatIds[] = $wechatId;
            
            // 根据wechatId判断是否为群主
            $isOwner = (!empty($ownerWechatId) && $wechatId == $ownerWechatId) ? 1 : 0;
            
            $members[] = [
                'friendId' => $autoMember['friendId'] ?? 0,
                'wechatId' => $wechatId,
                'nickname' => $autoMember['friendNickname'] ?? '',
                'avatar' => $autoMember['friendAvatar'] ?? '',
                'alias' => '',
                'remark' => '',
                'isOwner' => $isOwner, // 标记群主
                'joinStatus' => 'auto', // 入群状态：auto=自动建群加入
                'isQuit' => 1, // 是否已退群：1=已退群
                'joinTime' => (!empty($autoMember['autoJoinTime']) && is_numeric($autoMember['autoJoinTime']) && $autoMember['autoJoinTime'] > 0) ? date('Y-m-d H:i:s', intval($autoMember['autoJoinTime'])) : '', // 入群时间
            ];
        }
        
        // 将群主排在第一位
        usort($members, function($a, $b) {
            if ($a['isOwner'] == $b['isOwner']) {
                return 0;
            }
            return $a['isOwner'] > $b['isOwner'] ? -1 : 1;
        });

        // 获取工作台配置，检查是否有 executorId
        $groupCreateConfig = WorkbenchGroupCreate::where('workbenchId', $workbenchId)->find();
        $executorId = !empty($groupCreateConfig) ? intval($groupCreateConfig->executorId ?? 0) : 0;
        
        // 如果 executorId 有值，查询设备详情（格式和 deviceGroupsOptions 一样，但返回一维数组）
        $executor = null;
        if (!empty($executorId)) {
            // 查询设备基本信息
            $device = Db::table('s2_device')
                ->where('id', $executorId)
                ->where('isDeleted', 0)
                ->field('id,imei,memo,alive,wechatAccounts')
                ->find();
            
            if (!empty($device)) {
                // 查询关联的微信账号（通过 currentDeviceId）
                $wechatAccount = Db::table('s2_wechat_account')
                    ->where('currentDeviceId', $executorId)
                    ->field('wechatId,nickname,alias,avatar,totalFriend')
                    ->find();
                
                // 解析 wechatAccounts JSON 字段
                $wechatAccountsJson = [];
                if (!empty($device['wechatAccounts'])) {
                    $wechatAccountsJson = json_decode($device['wechatAccounts'], true);
                    if (!is_array($wechatAccountsJson)) {
                        $wechatAccountsJson = [];
                    }
                }
                
                // 优先使用 s2_wechat_account 表的数据，如果没有则使用 wechatAccounts JSON 中的第一个
                $wechatId = '';
                $nickname = '';
                $alias = '';
                $avatar = '';
                $totalFriend = 0;
                
                if (!empty($wechatAccount)) {
                    $wechatId = $wechatAccount['wechatId'] ?? '';
                    $nickname = $wechatAccount['nickname'] ?? '';
                    $alias = $wechatAccount['alias'] ?? '';
                    $avatar = $wechatAccount['avatar'] ?? '';
                    $totalFriend = intval($wechatAccount['totalFriend'] ?? 0);
                } elseif (!empty($wechatAccountsJson) && is_array($wechatAccountsJson) && count($wechatAccountsJson) > 0) {
                    $firstWechat = $wechatAccountsJson[0];
                    $wechatId = $firstWechat['wechatId'] ?? '';
                    $nickname = $firstWechat['wechatNickname'] ?? '';
                    $alias = $firstWechat['alias'] ?? '';
                    $avatar = $firstWechat['wechatAvatar'] ?? '';
                    $totalFriend = 0; // JSON 中没有 totalFriend 字段
                }
                
                $executor = [
                    'id' => $device['id'],
                    'imei' => $device['imei'] ?? '',
                    'memo' => $device['memo'] ?? '',
                    'alive' => $device['alive'] ?? 0,
                    'wechatId' => $wechatId,
                    'nickname' => $nickname,
                    'alias' => $alias,
                    'avatar' => $avatar,
                    'totalFriend' => $totalFriend
                ];
            }
        }

        // 格式化返回数据
        $result = [
            'id' => $group['id'],
            'groupName' => $group['groupName'] ?? '',
            'chatroomId' => $group['chatroomId'] ?? '',
            'groupAvatar' => $group['groupAvatar'] ?? '',
            'ownerWechatId' => $group['ownerWechatId'] ?? '',
            'ownerNickname' => $group['ownerNickname'] ?? '',
            'ownerAvatar' => $group['ownerAvatar'] ?? '',
            'ownerAlias' => $group['ownerAlias'] ?? '',
            'announce' => $group['announce'] ?? '',
            'createTime' => (!empty($group['createTime']) && is_numeric($group['createTime']) && $group['createTime'] > 0) ? date('Y-m-d H:i', intval($group['createTime'])) : '', // 格式化为"YYYY-MM-DD HH:MM"
            'memberCount' => $memberCount,
            'memberCountText' => $memberCount . '人', // 格式化为"XX人"
            'workbenchName' => $workbench->name ?? '', // 任务名称（工作台名称）
            'members' => $members, // 所有成员列表
            'executor' => $executor // 执行设备详情（当 executorId 有值时返回，格式和 deviceGroupsOptions 一样）
        ];

        return json([
            'code' => 200,
            'msg' => '获取成功',
            'data' => $result
        ]);
    }

    /**
     * 同步群最新信息（包括群成员）
     * @return \think\response\Json
     */
    public function syncGroupInfo()
    {
        $workbenchId = $this->request->param('workbenchId', 0);
        $groupId = $this->request->param('groupId', 0);

        if (empty($workbenchId)) {
            return json(['code' => 400, 'msg' => '工作台ID不能为空']);
        }

        if (empty($groupId)) {
            return json(['code' => 400, 'msg' => '群ID不能为空']);
        }

        // 验证工作台权限
        $where = [
            ['id', '=', $workbenchId],
            ['companyId', '=', $this->request->userInfo['companyId']],
            ['type', '=', self::TYPE_GROUP_CREATE],
            ['isDel', '=', 0]
        ];
        if (empty($this->request->userInfo['isAdmin'])) {
            $where[] = ['userId', '=', $this->request->userInfo['id']];
        }

        $workbench = Workbench::where($where)->find();
        if (empty($workbench)) {
            return json(['code' => 404, 'msg' => '工作台不存在或无权限']);
        }

        // 验证该群是否属于该工作台
        $groupItem = Db::name('workbench_group_create_item')
            ->where('workbenchId', $workbenchId)
            ->where('groupId', $groupId)
            ->where('status', 2) // STATUS_SUCCESS = 2
            ->find();

        if (empty($groupItem)) {
            return json(['code' => 404, 'msg' => '群不存在或不属于该工作台']);
        }

        // 查询群基本信息，获取chatroomId和wechatAccountWechatId
        $group = Db::table('s2_wechat_chatroom')
            ->where('id', $groupId)
            ->where('isDeleted', 0)
            ->field('id,chatroomId,wechatAccountWechatId')
            ->find();

        if (empty($group)) {
            return json(['code' => 404, 'msg' => '群不存在']);
        }

        $chatroomId = $group['chatroomId'] ?? '';
        $wechatAccountWechatId = $group['wechatAccountWechatId'] ?? '';

        if (empty($chatroomId)) {
            return json(['code' => 400, 'msg' => '群聊ID不存在']);
        }

        try {
            // 实例化WechatChatroomController
            $chatroomController = new \app\api\controller\WechatChatroomController();

            // 1. 同步群信息（调用getlist方法）
            $syncData = [
                'wechatChatroomId' => $chatroomId, // 使用chatroomId作为wechatChatroomId来指定要同步的群
                'wechatAccountKeyword' => $wechatAccountWechatId, // 通过群主微信ID筛选
                'isDeleted' => false,
                'pageIndex' => 1,
                'pageSize' => 100 // 获取足够多的数据
            ];
            $syncResult = $chatroomController->getlist($syncData, true, 0); // isInner = true
            $syncResponse = json_decode($syncResult, true);

            if (empty($syncResponse['code']) || $syncResponse['code'] != 200) {
                return json(['code' => 500, 'msg' => '同步群信息失败：' . ($syncResponse['msg'] ?? '未知错误')]);
            }

            // 2. 同步群成员信息（调用listChatroomMember方法）
            // wechatChatroomId 使用 s2_wechat_chatroom 表的 id（即groupId）
            // chatroomId 使用群聊ID（chatroomId）
            $wechatChatroomId = $groupId; // s2_wechat_chatroom表的id
            $memberSyncResult = $chatroomController->listChatroomMember($wechatChatroomId, $chatroomId, true); // isInner = true
            $memberSyncResponse = json_decode($memberSyncResult, true);

            if (empty($memberSyncResponse['code']) || $memberSyncResponse['code'] != 200) {
                // 成员同步失败不影响整体结果，记录警告即可
                \think\facade\Log::warning("同步群成员失败。群ID: {$groupId}, 群聊ID: {$chatroomId}, 错误: " . ($memberSyncResponse['msg'] ?? '未知错误'));
            }

            return json([
                'code' => 200,
                'msg' => '同步成功',
                'data' => [
                    'groupId' => $groupId,
                    'chatroomId' => $chatroomId,
                    'groupInfoSynced' => true,
                    'memberInfoSynced' => !empty($memberSyncResponse['code']) && $memberSyncResponse['code'] == 200
                ]
            ]);
        } catch (\Exception $e) {
            \think\facade\Log::error("同步群信息异常。群ID: {$groupId}, 错误: " . $e->getMessage());
            return json(['code' => 500, 'msg' => '同步失败：' . $e->getMessage()]);
        }
    }

    /**
     * 修改群名称、群公告
     * @return \think\response\Json
     */
    public function modifyGroupInfo()
    {
        $workbenchId = $this->request->param('workbenchId', 0);
        $groupId = $this->request->param('groupId', 0);
        $chatroomName = $this->request->param('chatroomName', '');
        $announce = $this->request->param('announce', '');

        if (empty($workbenchId)) {
            return json(['code' => 400, 'msg' => '工作台ID不能为空']);
        }

        if (empty($groupId)) {
            return json(['code' => 400, 'msg' => '群ID不能为空']);
        }

        // 至少需要提供一个修改项
        if (empty($chatroomName) && empty($announce)) {
            return json(['code' => 400, 'msg' => '请至少提供群名称或群公告中的一个参数']);
        }

        // 查询群基本信息
        $group = Db::table('s2_wechat_chatroom')
            ->where('id', $groupId)
            ->where('isDeleted', 0)
            ->field('id,chatroomId,wechatAccountWechatId,accountId,wechatAccountId')
            ->find();

        if (empty($group)) {
            return json(['code' => 404, 'msg' => '群不存在']);
        }

        $chatroomId = $group['id'] ?? '';

        if (empty($chatroomId)) {
            return json(['code' => 400, 'msg' => '群聊ID不存在']);
        }

        try {
            // 直接使用群表中的账号信息
            $executeAccountId = $group['accountId'] ?? 0;
            $executeWechatAccountId = $group['wechatAccountId'] ?? 0;
            $executeWechatId = $group['wechatAccountWechatId'] ?? '';

            // 确保 wechatId 不为空
            if (empty($executeWechatId)) {
                return json(['code' => 400, 'msg' => '无法获取微信账号ID']);
            }

            // 调用 WebSocketController 修改群信息
            // 获取系统API账号信息（用于WebSocket连接）
            $username = Env::get('api.username2', '');
            $password = Env::get('api.password2', '');
            
            if (empty($username) || empty($password)) {
                return json(['code' => 500, 'msg' => '系统API账号配置缺失']);
            }

            // 获取系统账号ID
            $systemAccountId = Db::name('users')->where('account', $username)->value('s2_accountId');
            if (empty($systemAccountId)) {
                return json(['code' => 500, 'msg' => '未找到系统账号ID']);
            }

            $webSocketController = new WebSocketController([
                'userName' => $username,
                'password' => $password,
                'accountId' => $systemAccountId
            ]);
            // 构建修改参数
            $modifyData = [
                'wechatChatroomId' => $chatroomId,
                'wechatAccountId' => $executeWechatAccountId,
            ];
            if (!empty($chatroomName)) {
                $modifyData['chatroomName'] = $chatroomName;
            }
            if (!empty($announce)) {
                $modifyData['announce'] = $announce;
            }


            $modifyResult = $webSocketController->CmdChatroomModifyInfo($modifyData);
            $modifyResponse = json_decode($modifyResult, true);
            if (empty($modifyResponse['code']) || $modifyResponse['code'] != 200) {
                return json(['code' => 500, 'msg' => '修改群信息失败：' . ($modifyResponse['msg'] ?? '未知错误')]);
            }

            // 修改成功后更新数据库
            $updateData = [
                'updateTime' => time()
            ];
            
            // 如果修改了群名称，更新数据库
            if (!empty($chatroomName)) {
                $updateData['nickname'] = $chatroomName;
            }

            // 如果修改了群公告，更新数据库
            if (!empty($announce)) {
                $updateData['announce'] = $announce;
            }
            
            // 更新数据库
            Db::table('s2_wechat_chatroom')
                ->where('id', $groupId)
                ->update($updateData);

            return json([
                'code' => 200,
                'msg' => '修改成功',
                'data' => [
                    'groupId' => $groupId,
                    'chatroomId' => $chatroomId,
                    'chatroomName' => $chatroomName,
                    'announce' => $announce
                ]
            ]);
        } catch (\Exception $e) {
            \think\facade\Log::error("修改群信息异常。群ID: {$groupId}, 错误: " . $e->getMessage());
            return json(['code' => 500, 'msg' => '修改失败：' . $e->getMessage()]);
        }
    }

    /**
     * 转移群聊到指定账号
     * @param int $groupId 群ID（s2_wechat_chatroom表的id）
     * @param string $chatroomId 群聊ID
     * @param int $toAccountId 目标账号ID（s2_company_account表的id）
     * @param int $toWechatAccountId 目标微信账号ID（s2_wechat_account表的id）
     * @return array ['success' => bool, 'msg' => string]
     */
    protected function transferChatroomToAccount($groupId, $chatroomId, $toAccountId, $toWechatAccountId)
    {
        try {
            // 查询目标账号信息
            $targetAccount = Db::table('s2_company_account')
                ->where('id', $toAccountId)
                ->field('id,userName,realName,nickname')
                ->find();

            if (empty($targetAccount)) {
                return ['success' => false, 'msg' => '目标账号不存在'];
            }

            // 查询目标微信账号信息
            $targetWechatAccount = Db::table('s2_wechat_account')
                ->where('id', $toWechatAccountId)
                ->field('id,wechatId,deviceAccountId')
                ->find();

            if (empty($targetWechatAccount)) {
                return ['success' => false, 'msg' => '目标微信账号不存在'];
            }

            // 调用 AutomaticAssign 进行群聊转移
            $automaticAssign = new \app\api\controller\AutomaticAssign();
            
            // 构建转移参数（通过 API 调用）
            $transferData = [
                'wechatChatroomId' => $chatroomId, // 使用群聊ID
                'toAccountId' => $toAccountId,
                'wechatAccountKeyword' => $targetWechatAccount['wechatId'] ?? '',
                'isDeleted' => false
            ];

            // 直接更新数据库（因为 API 可能不支持指定单个群聊ID转移）
            // 更新 s2_wechat_chatroom 表的 accountId 和 wechatAccountId
            Db::table('s2_wechat_chatroom')
                ->where('id', $groupId)
                ->update([
                    'accountId' => $toAccountId,
                    'accountUserName' => $targetAccount['userName'] ?? '',
                    'accountRealName' => $targetAccount['realName'] ?? '',
                    'accountNickname' => $targetAccount['nickname'] ?? '',
                    'wechatAccountId' => $toWechatAccountId,
                    'wechatAccountWechatId' => $targetWechatAccount['wechatId'] ?? '',
                    'updateTime' => time()
                ]);

            return ['success' => true, 'msg' => '转移成功'];
        } catch (\Exception $e) {
            \think\facade\Log::error("转移群聊异常。群ID: {$groupId}, 目标账号ID: {$toAccountId}, 错误: " . $e->getMessage());
            return ['success' => false, 'msg' => $e->getMessage()];
        }
    }

    /**
     * 退群功能（自动建群）
     * @return \think\response\Json
     */
    public function quitGroup()
    {
        $workbenchId = $this->request->param('workbenchId', 0);
        $groupId = $this->request->param('groupId', 0);

        if (empty($groupId)) {
            return json(['code' => 400, 'msg' => '群ID不能为空']);
        }

        // 查询群基本信息
        $group = Db::table('s2_wechat_chatroom')
            ->where('id', $groupId)
            ->where('isDeleted', 0)
            ->field('id,chatroomId,wechatAccountWechatId,accountId,wechatAccountId')
            ->find();

        if (empty($group)) {
            return json(['code' => 404, 'msg' => '群不存在']);
        }

        $chatroomId = $group['chatroomId'] ?? '';
        if (empty($chatroomId)) {
            return json(['code' => 400, 'msg' => '群聊ID不存在']);
        }

        try {
            // 直接使用群表中的账号信息
            $executeWechatId = $group['wechatAccountWechatId'] ?? '';

            // 确保 wechatId 不为空
            if (empty($executeWechatId)) {
                return json(['code' => 400, 'msg' => '无法获取微信账号ID']);
            }

            // 调用 WebSocketController 退群
            // 获取系统API账号信息（用于WebSocket连接）
            $username = Env::get('api.username2', '');
            $password = Env::get('api.password2', '');
            
            if (empty($username) || empty($password)) {
                return json(['code' => 500, 'msg' => '系统API账号配置缺失']);
            }

            // 获取系统账号ID
            $systemAccountId = Db::name('users')->where('account', $username)->value('s2_accountId');
            if (empty($systemAccountId)) {
                return json(['code' => 500, 'msg' => '未找到系统账号ID']);
            }

            $webSocketController = new WebSocketController([
                'userName' => $username,
                'password' => $password,
                'accountId' => $systemAccountId
            ]);

            // 使用与 modifyGroupInfo 相同的方式，但操作类型改为4（退群）
            $params = [
                "chatroomOperateType" => 4, // 4 表示退群
                "cmdType" => "CmdChatroomOperate",
                "seq" => time(),
                "wechatAccountId" => $executeWechatId,
                "wechatChatroomId" => $chatroomId
            ];
            
            // 使用反射调用 protected 的 sendMessage 方法
            $reflection = new \ReflectionClass($webSocketController);
            $method = $reflection->getMethod('sendMessage');
            $method->setAccessible(true);
            $quitResult = $method->invoke($webSocketController, $params, false);
            
            // sendMessage 返回的是数组
            if (empty($quitResult) || (isset($quitResult['code']) && $quitResult['code'] != 200)) {
                return json(['code' => 500, 'msg' => '退群失败：' . ($quitResult['msg'] ?? '未知错误')]);
            }

            // 退群成功后更新数据库
            // 将群标记为已删除
            Db::table('s2_wechat_chatroom')
                ->where('id', $groupId)
                ->update([
                    'isDeleted' => 1,
                    'deleteTime' => time(),
                    'updateTime' => time()
                ]);

            // 如果提供了 workbenchId，更新工作台建群记录的状态（标记为已退群）
            if (!empty($workbenchId)) {
                Db::name('workbench_group_create_item')
                    ->where('workbenchId', $workbenchId)
                    ->where('groupId', $groupId)
                    ->update([
                        'status' => 5, // 可以定义一个新状态：5 = 已退群
                        'updateTime' => time()
                    ]);
            }

            return json([
                'code' => 200,
                'msg' => '退群成功',
                'data' => [
                    'groupId' => $groupId,
                    'chatroomId' => $chatroomId
                ]
            ]);
        } catch (\Exception $e) {
            \think\facade\Log::error("退群异常。群ID: {$groupId}, 错误: " . $e->getMessage());
            return json(['code' => 500, 'msg' => '退群失败：' . $e->getMessage()]);
        }
    }


}