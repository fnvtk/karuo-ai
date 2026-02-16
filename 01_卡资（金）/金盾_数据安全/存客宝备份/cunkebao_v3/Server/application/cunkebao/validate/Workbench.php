<?php

namespace app\cunkebao\validate;

use think\Validate;

class Workbench extends Validate
{
    // 工作台类型定义
    const TYPE_AUTO_LIKE = 1;      // 自动点赞
    const TYPE_MOMENTS_SYNC = 2;    // 朋友圈同步
    const TYPE_GROUP_PUSH = 3;      // 群消息推送
    const TYPE_GROUP_CREATE = 4;    // 自动建群
    const TYPE_TRAFFIC_DISTRIBUTION = 5;    // 流量分发
    const TYPE_IMPORT_CONTACT = 6;    // 流量分发
    const TYPE_GROUP_WELCOME = 7;    // 入群欢迎语

    /**
     * 验证规则
     */
    protected $rule = [
        'name' => 'require|max:100',
        'type' => 'require|in:1,2,3,4,5,6,7',
        //'autoStart' => 'require|boolean',
        // 自动点赞特有参数
        'interval' => 'requireIf:type,1|number|min:1',
        'maxLikes' => 'requireIf:type,1|number|min:1',
        'startTime' => 'requireIf:type,1|dateFormat:H:i',
        'endTime' => 'requireIf:type,1|dateFormat:H:i',
        'contentTypes' => 'requireIf:type,1|array|contentTypeEnum:text,image,video',
        //'targetGroups' => 'requireIf:type,1|array',
        // 朋友圈同步特有参数
        //'syncInterval' => 'requireIf:type,2|number|min:1',
        'syncCount' => 'requireIf:type,2|number|min:1',
        'syncType' => 'requireIf:type,2|in:1,2,3,4',
        'startTime' => 'requireIf:type,2|dateFormat:H:i',
        'endTime' => 'requireIf:type,2|dateFormat:H:i',
        'accountGroups' => 'requireIf:type,2|in:1,2',
        'contentGroups' => 'requireIf:type,2|array',
        // 群消息推送特有参数
        'pushType' => 'requireIf:type,3|in:0,1', // 推送方式 0定时 1立即
        'targetType' => 'requireIf:type,3|in:1,2', // 推送目标类型：1=群推送，2=好友推送
        'groupPushSubType' => 'checkGroupPushSubType|in:1,2', // 群推送子类型：1=群群发，2=群公告（仅当targetType=1时有效）
        'maxPerDay' => 'requireIf:type,3|number|min:1',
        'pushOrder' => 'requireIf:type,3|in:1,2', // 1最早 2最新
        'isLoop' => 'requireIf:type,3|in:0,1',
        'status' => 'requireIf:type,3|in:0,1',
        'wechatGroups' => 'checkGroupPushTarget|array|min:1', // 当targetType=1时必填
        'wechatFriends' => 'checkFriendPushTarget|array', // 当targetType=2时可选（可以为空）
        'ownerWechatId' => 'checkFriendPushService', // 当targetType=2且未选择好友/流量池时必填
        'contentGroups' => 'checkContentGroups|array', // 群推送时必填，但群公告时可以为空
        // 群公告特有参数
        'announcementContent' => 'checkAnnouncementContent|max:5000', // 群公告内容（当groupPushSubType=2时必填）
        'enableAiRewrite' => 'checkEnableAiRewrite|in:0,1', // 是否启用AI智能话术改写
        'aiRewritePrompt' => 'checkAiRewritePrompt|max:500', // AI改写提示词（当enableAiRewrite=1时必填）
        // 自动建群特有参数
        'groupNameTemplate' => 'requireIf:type,4|max:50',
        'maxGroupsPerDay' => 'requireIf:type,4|number|min:1',
        'groupSizeMin' => 'requireIf:type,4|number|min:1|max:50',
        'groupSizeMax' => 'requireIf:type,4|number|min:1|max:50',
        // 流量分发特有参数
        'distributeType' => 'requireIf:type,5|in:1,2',
        'maxPerDay' => 'requireIf:type,5|number|min:1',
        'timeType' => 'requireIf:type,5|in:1,2',
        'accountGroups' => 'requireIf:type,5|array|min:1',
        // 入群欢迎语特有参数
        'wechatGroups' => 'requireIf:type,7|array|min:1', // 入群欢迎语必须选择群组
        'interval' => 'requireIf:type,7|number|min:1', // 间隔时间
        'startTime' => 'requireIf:type,7|dateFormat:H:i', // 开始时间
        'endTime' => 'requireIf:type,7|dateFormat:H:i', // 结束时间
        'messages' => 'requireIf:type,7|array|min:1', // 欢迎消息列表
         // 通用参数
         'deviceGroups' => 'requireIf:type,1,2,5,7|array',
        'trafficPools' => 'checkFriendPushPools',
    ];

    /**
     * 错误信息
     */
    protected $message = [
        'name.require' => '请输入任务名称',
        'name.max' => '任务名称最多100个字符',
        'type.require' => '请选择工作台类型',
        'type.in' => '工作台类型错误',
        'autoStart.require' => '请选择是否自动启动',
        'autoStart.boolean' => '自动启动参数必须为布尔值',
        // 自动点赞相关提示
        'interval.requireIf' => '请设置点赞间隔',
        'interval.number' => '点赞间隔必须为数字',
        'interval.min' => '点赞间隔必须大于0',
        'maxLikes.requireIf' => '请设置每日最大点赞数',
        'maxLikes.number' => '每日最大点赞数必须为数字',
        'maxLikes.min' => '每日最大点赞数必须大于0',
        'startTime.requireIf' => '请设置开始时间',
        'startTime.dateFormat' => '开始时间格式错误',
        'endTime.requireIf' => '请设置结束时间',
        'endTime.dateFormat' => '结束时间格式错误',
        'contentTypes.requireIf' => '请选择点赞内容类型',
        'contentTypes.array' => '点赞内容类型必须是数组',
        'contentTypes.contentTypeEnum' => '点赞内容类型只能是text、image、video',
        // 朋友圈同步相关提示
       /* 'syncInterval.requireIf' => '请设置同步间隔',
        'syncInterval.number' => '同步间隔必须为数字',
        'syncInterval.min' => '同步间隔必须大于0',*/
        'syncCount.requireIf' => '请设置同步数量',
        'syncCount.number' => '同步数量必须为数字',
        'syncCount.min' => '同步数量必须大于0',
        'syncType.requireIf' => '请选择同步类型',
        'syncType.in' => '同步类型错误',
        'startTime.requireIf' => '请设置发布开始时间',
        'startTime.dateFormat' => '发布开始时间格式错误',
        'endTime.requireIf' => '请设置发布结束时间',
        'endTime.dateFormat' => '发布结束时间格式错误',
        'accountGroups.requireIf' => '请选择账号类型',
        'accountGroups.in' => '账号类型错误',
        'contentGroups.checkContentGroups' => '群群发时必须选择内容库',
        'contentGroups.array' => '内容库格式错误',
        // 群消息推送相关提示
        'pushType.requireIf' => '请选择推送方式',
        'startTime.requireIf' => '请设置推送开始时间',
        'startTime.dateFormat' => '推送开始时间格式错误',
        'endTime.requireIf' => '请设置推送结束时间',
        'endTime.dateFormat' => '推送结束时间格式错误',
        'maxPerDay.requireIf' => '请设置每日最大推送数',
        'maxPerDay.number' => '每日最大推送数必须为数字',
        'maxPerDay.min' => '每日最大推送数必须大于0',
        'pushOrder.requireIf' => '请选择推送顺序',
        'pushOrder.in' => '推送顺序错误',
        'isLoop.requireIf' => '请选择是否循环推送',
        'isLoop.in' => '循环推送参数错误',
        'targetType.requireIf' => '请选择推送目标类型',
        'targetType.in' => '推送目标类型错误，只能选择群推送或好友推送',
        'wechatGroups.requireIf' => '请选择推送群组',
        'wechatGroups.checkGroupPushTarget' => '群推送时必须选择推送群组',
        'wechatGroups.array' => '推送群组格式错误',
        'wechatGroups.min' => '至少选择一个推送群组',
        'groupPushSubType.checkGroupPushSubType' => '群推送子类型错误',
        'groupPushSubType.in' => '群推送子类型只能是群群发或群公告',
        'announcementContent.checkAnnouncementContent' => '群公告必须输入公告内容',
        'announcementContent.max' => '公告内容最多5000个字符',
        'enableAiRewrite.checkEnableAiRewrite' => 'AI智能话术改写参数错误',
        'enableAiRewrite.in' => 'AI智能话术改写参数只能是0或1',
        'aiRewritePrompt.checkAiRewritePrompt' => '启用AI智能话术改写时，必须输入改写提示词',
        'aiRewritePrompt.max' => '改写提示词最多500个字符',
        'wechatFriends.requireIf' => '请选择推送好友',
        'wechatFriends.checkFriendPushTarget' => '好友推送时必须选择推送好友',
        'wechatFriends.array' => '推送好友格式错误',
        'deviceGroups.requireIf' => '请选择设备',
        'deviceGroups.array' => '设备格式错误',
        'ownerWechatId.checkFriendPushService' => '好友推送需选择客服或提供好友/流量池',
        // 自动建群相关提示
        'groupNameTemplate.requireIf' => '请设置群名称前缀',
        'groupNameTemplate.max' => '群名称前缀最多50个字符',
        'maxGroupsPerDay.requireIf' => '请设置最大建群数量',
        'maxGroupsPerDay.number' => '最大建群数量必须为数字',
        'maxGroupsPerDay.min' => '最大建群数量必须大于0',
        'groupSizeMin.requireIf' => '请设置每个群的人数',
        'groupSizeMin.number' => '每个群的人数必须为数字',
        'groupSizeMin.min' => '每个群的人数必须大于0',
        'groupSizeMin.max' => '每个群的人数最大50人',
        'groupSizeMax.requireIf' => '请设置每个群的人数',
        'groupSizeMax.number' => '每个群的人数必须为数字',
        'groupSizeMax.min' => '每个群的人数必须大于0',
        'groupSizeMax.max' => '每个群的人数最大50人',
        // 流量分发相关提示
        'distributeType.requireIf' => '请选择流量分发类型',
        'distributeType.in' => '流量分发类型错误',
        'maxPerDay.requireIf' => '请设置每日最大流量',
        'maxPerDay.number' => '每日最大流量必须为数字',
        'maxPerDay.min' => '每日最大流量必须大于0',
        'timeType.requireIf' => '请选择时间类型',

        // 通用提示
        'deviceGroups.require' => '请选择设备',
        'deviceGroups.array' => '设备格式错误',
        'targetGroups.require' => '请选择目标用户组',
        'targetGroups.array' => '目标用户组格式错误',
        'accountGroups.requireIf' => '流量分发时必须选择分发账号',
        'accountGroups.array' => '分发账号格式错误',
        'accountGroups.min' => '至少选择一个分发账号',
        'trafficPools.checkFriendPushPools' => '好友推送时请选择好友或流量池',
    ];

    /**
     * 验证场景
     */
    protected $scene = [
        'create' => ['name', 'type', 'autoStart', 'deviceGroups', 'targetGroups',
            'interval', 'maxLikes', 'startTime', 'endTime', 'contentTypes',
            'syncCount', 'syncType', 'accountGroups',
            'pushType', 'targetType', 'groupPushSubType', 'startTime', 'endTime', 'maxPerDay', 'pushOrder', 'isLoop', 'status', 'wechatGroups', 'wechatFriends', 'trafficPools', 'ownerWechatId', 'contentGroups',
            'announcementContent', 'enableAiRewrite', 'aiRewritePrompt',
            'groupNameTemplate', 'maxGroupsPerDay', 'groupSizeMin', 'groupSizeMax',
            'distributeType', 'timeType', 'accountGroups',
            'messages',
        ],
        'update_status' => ['id', 'status'],
        'update' => ['name', 'type', 'autoStart', 'deviceGroups', 'targetGroups',
            'interval', 'maxLikes', 'startTime', 'endTime', 'contentTypes',
            'syncCount', 'syncType', 'accountGroups',
            'pushType', 'targetType', 'groupPushSubType', 'startTime', 'endTime', 'maxPerDay', 'pushOrder', 'isLoop', 'status', 'wechatGroups', 'wechatFriends', 'trafficPools', 'ownerWechatId', 'contentGroups',
            'announcementContent', 'enableAiRewrite', 'aiRewritePrompt',
            'groupNameTemplate', 'maxGroupsPerDay', 'groupSizeMin', 'groupSizeMax',
            'distributeType', 'timeType', 'accountGroups',
            'messages',
        ]
    ];

    /**
     * 自定义验证规则
     */
    protected function contentTypeEnum($value, $rule, $data)
    {
        $allowTypes = explode(',', $rule);
        foreach ($value as $type) {
            if (!in_array($type, $allowTypes)) {
                return false;
            }
        }
        return true;
    }

    /**
     * 验证群推送目标（当targetType=1时，wechatGroups必填）
     */
    protected function checkGroupPushTarget($value, $rule, $data)
    {
        // 如果是群消息推送类型
        if (isset($data['type']) && $data['type'] == self::TYPE_GROUP_PUSH) {
            // 如果targetType=1（群推送），则wechatGroups必填
            $targetType = isset($data['targetType']) ? intval($data['targetType']) : 1; // 默认1
            if ($targetType == 1) {
                // 检查值是否存在且有效
                if (!isset($value) || $value === null || $value === '') {
                    return false;
                }
                if (!is_array($value) || count($value) < 1) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * 验证好友推送目标（当targetType=2时，wechatFriends可选，可以为空）
     */
    protected function checkFriendPushTarget($value, $rule, $data)
    {
        // 如果是群消息推送类型
        if (isset($data['type']) && $data['type'] == self::TYPE_GROUP_PUSH) {
            // 如果targetType=2（好友推送），wechatFriends可以为空数组
            $targetType = isset($data['targetType']) ? intval($data['targetType']) : 1; // 默认1
            if ($targetType == 2) {
                // 如果提供了值，则必须是数组
                if (isset($value) && $value !== null && $value !== '') {
                    if (!is_array($value)) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    /**
     * 验证好友推送时设备必填（当targetType=2时，deviceGroups必填）
     */
    protected function checkFriendPushService($value, $rule, $data)
    {
        if (isset($data['type']) && $data['type'] == self::TYPE_GROUP_PUSH) {
            $targetType = isset($data['targetType']) ? intval($data['targetType']) : 1; // 默认1
            if ($targetType == 2) {
                if ($value !== null && $value !== '' && !is_array($value)) {
                    return false;
                }

                $hasFriends = isset($data['wechatFriends']) && is_array($data['wechatFriends']) && count($data['wechatFriends']) > 0;
                $hasPools = isset($data['trafficPools']) && is_array($data['trafficPools']) && count($data['trafficPools']) > 0;
                $hasServices = is_array($value) && count(array_filter($value, function ($item) {
                    if (is_array($item)) {
                        return !empty($item['ownerWechatId'] ?? $item['wechatId'] ?? $item['id']);
                    }
                    return $item !== null && $item !== '';
                })) > 0;

                if (!$hasFriends && !$hasPools && !$hasServices) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * 验证好友推送时是否选择好友或流量池（至少其一）
     */
    protected function checkFriendPushPools($value, $rule, $data)
    {
        if (isset($data['type']) && $data['type'] == self::TYPE_GROUP_PUSH) {
            $targetType = isset($data['targetType']) ? intval($data['targetType']) : 1; // 默认1
            if ($targetType == 2) {
                $hasFriends = isset($data['wechatFriends']) && !empty($data['wechatFriends']);
                $hasPools = isset($value) && $value !== null && $value !== '' && is_array($value) && count($value) > 0;
                if (!$hasFriends && !$hasPools) {
                    return false;
                }
                if (isset($value) && $value !== null && $value !== '') {
                    if (!is_array($value)) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    /**
     * 验证群推送子类型（当targetType=1时，groupPushSubType必填且只能是1或2）
     */
    protected function checkGroupPushSubType($value, $rule, $data)
    {
        // 如果是群消息推送类型
        if (isset($data['type']) && $data['type'] == self::TYPE_GROUP_PUSH) {
            // 如果targetType=1（群推送），则groupPushSubType必填
            $targetType = isset($data['targetType']) ? intval($data['targetType']) : 1; // 默认1
            if ($targetType == 1) {
                // 检查值是否存在且有效
                if (!isset($value) || !in_array(intval($value), [1, 2])) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * 验证群公告内容（当groupPushSubType=2时，announcementContent必填）
     */
    protected function checkAnnouncementContent($value, $rule, $data)
    {
        // 如果是群消息推送类型
        if (isset($data['type']) && $data['type'] == self::TYPE_GROUP_PUSH) {
            // 如果targetType=1且groupPushSubType=2（群公告），则announcementContent必填
            $targetType = isset($data['targetType']) ? intval($data['targetType']) : 1; // 默认1
            $groupPushSubType = isset($data['groupPushSubType']) ? intval($data['groupPushSubType']) : 1; // 默认1
            if ($targetType == 1 && $groupPushSubType == 2) {
                // 检查值是否存在且有效
                if (!isset($value) || $value === null || trim($value) === '') {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * 验证AI智能话术改写（当enableAiRewrite=1时，aiRewritePrompt必填）
     */
    protected function checkEnableAiRewrite($value, $rule, $data)
    {
        // 如果是群消息推送类型且是群公告
        if (isset($data['type']) && $data['type'] == self::TYPE_GROUP_PUSH) {
            $targetType = isset($data['targetType']) ? intval($data['targetType']) : 1; // 默认1
            $groupPushSubType = isset($data['groupPushSubType']) ? intval($data['groupPushSubType']) : 1; // 默认1
            if ($targetType == 1 && $groupPushSubType == 2) {
                // 检查值是否存在且有效
                if (!isset($value) || !in_array(intval($value), [0, 1])) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * 验证AI改写提示词（当enableAiRewrite=1时，aiRewritePrompt必填）
     */
    protected function checkAiRewritePrompt($value, $rule, $data)
    {
        // 如果是群消息推送类型且是群公告
        if (isset($data['type']) && $data['type'] == self::TYPE_GROUP_PUSH) {
            $targetType = isset($data['targetType']) ? intval($data['targetType']) : 1; // 默认1
            $groupPushSubType = isset($data['groupPushSubType']) ? intval($data['groupPushSubType']) : 1; // 默认1
            $enableAiRewrite = isset($data['enableAiRewrite']) ? intval($data['enableAiRewrite']) : 0; // 默认0
            if ($targetType == 1 && $groupPushSubType == 2 && $enableAiRewrite == 1) {
                // 如果启用AI改写，提示词必填
                if (!isset($value) || $value === null || trim($value) === '') {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * 验证内容库（群推送时必填，但群公告时可以为空）
     */
    protected function checkContentGroups($value, $rule, $data)
    {
        // 如果是群消息推送类型
        if (isset($data['type']) && $data['type'] == self::TYPE_GROUP_PUSH) {
            $targetType = isset($data['targetType']) ? intval($data['targetType']) : 1; // 默认1
            $groupPushSubType = isset($data['groupPushSubType']) ? intval($data['groupPushSubType']) : 1; // 默认1
            
            // 群公告（groupPushSubType=2）时，内容库可以为空，不需要验证
            if ($targetType == 1 && $groupPushSubType == 2) {
                // 群公告时允许为空，不进行验证
                return true;
            }
            
            // 其他情况（群群发、好友推送），内容库必填
            if (!isset($value) || $value === null || $value === '') {
                return false;
            }
            if (!is_array($value) || count($value) < 1) {
                return false;
            }
        }
        return true;
    }
} 