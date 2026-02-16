<?php
// +----------------------------------------------------------------------
// | 任务调度器配置文件
// +----------------------------------------------------------------------
// | 定义所有需要定时执行的任务及其执行频率
// +----------------------------------------------------------------------

return [
    // 任务配置格式：
    // '任务标识' => [
    //     'name'          => '任务名称',          // 必填：任务的中文名称，用于日志和显示
    //     'command'       => '命令名称',          // 必填：执行的 ThinkPHP 命令（见 application/command.php）
    //     'schedule'      => 'cron表达式',       // 必填：cron 表达式，如 '*/5 * * * *' 表示每5分钟
    //     'options'       => ['--option=value'], // 可选：命令参数（原来 crontab 里的 --xxx=yyy）
    //     'enabled'       => true,               // 可选：是否启用，默认 true
    //     'max_concurrent'=> 1,                  // 可选：单任务最大并发数（目前由调度器统一控制，可预留）
    //     'timeout'       => 3600,               // 可选：超时时间（秒），默认 3600
    //     'log_file'      => 'custom.log',       // 可选：日志文件名，默认使用任务标识
    // ]

    // ===========================
    // 高频任务（每分钟或更频繁）
    // ===========================

    // 同步微信好友列表（未删除好友），用于保持系统中好友数据实时更新
    'wechat_friends_active' => [
        'name' => '同步微信好友列表（未删除）',
        'command' => 'wechatFriends:list',
        'schedule' => '*/1 * * * *',  // 每1分钟
        'options' => ['--isDel=0'],
        'enabled' => true,
        'max_concurrent' => 1,
        'log_file' => 'crontab_wechatFriends_active.log',
    ],
    
    // 拉取"添加好友任务"列表，驱动自动加好友的任务队列
    'friend_task' => [
        'name' => '拉取添加好友任务列表',
        'command' => 'friendTask:list',
        'schedule' => '*/1 * * * *',  // 每1分钟
        'options' => [],
        'enabled' => true,
        'max_concurrent' => 1,
        'log_file' => 'crontab_friendTask.log',
    ],
    
    // 同步微信好友私聊消息列表，写入消息表，供客服工作台使用
    'message_friends' => [
        'name' => '同步微信好友私聊消息列表',
        'command' => 'message:friendsList',
        'schedule' => '*/1 * * * *',  // 每1分钟
        'options' => [],
        'enabled' => true,
        'max_concurrent' => 1,
        'log_file' => 'crontab_messageFriends.log',
    ],
    
    // 同步微信群聊消息列表，写入消息表，供群聊记录与风控分析
    'message_chatroom' => [
        'name' => '同步微信群聊消息列表',
        'command' => 'message:chatroomList',
        'schedule' => '*/1 * * * *',  // 每1分钟
        'options' => [],
        'enabled' => true,
        'max_concurrent' => 1,
        'log_file' => 'crontab_messageChatroom.log',
    ],
    
    // 客服端消息提醒任务，负责给在线客服推送新消息通知
    'kf_notice' => [
        'name' => '客服端消息提醒',
        'command' => 'kf:notice',
        'schedule' => '*/1 * * * *',  // 每1分钟
        'options' => [],
        'enabled' => true,
        'max_concurrent' => 1,
        'log_file' => 'kf_notice.log',
    ],

    // ===========================
    // 中频任务（每 2-5 分钟）
    // ===========================

    // 同步微信设备列表（未删除设备），用于设备管理与监控
    'device_active' => [
        'name' => '同步微信设备列表（未删除）',
        'command' => 'device:list',
        'schedule' => '*/5 * * * *',  // 每5分钟
        'options' => ['--isDel=0'],
        'enabled' => true,
        'max_concurrent' => 1,
        'log_file' => 'crontab_device_active.log',
    ],
    
    // 同步微信群聊列表（未删除群），用于群管理与后续任务分配
    'wechat_chatroom_active' => [
        'name' => '同步微信群聊列表（未删除）',
        'command' => 'wechatChatroom:list',
        'schedule' => '*/5 * * * *',  // 每5分钟
        'options' => ['--isDel=0'],
        'enabled' => true,
        'max_concurrent' => 1,
        'log_file' => 'crontab_wechatChatroom_active.log',
    ],
    
    // 同步微信群成员列表（群好友），维持群成员明细数据
    'group_friends' => [
        'name' => '同步微信群成员列表',
        'command' => 'groupFriends:list',
        'schedule' => '*/5 * * * *',  // 每5分钟
        'options' => [],
        'enabled' => true,
        'max_concurrent' => 1,
        'log_file' => 'crontab_groupFriends.log',
    ],
    
    // 同步"微信客服列表"，获取绑定到公司的微信号，用于工作台与分配规则
    'wechat_list' => [
        'name' => '同步微信客服列表',
        'command' => 'wechatList:list',
        'schedule' => '*/5 * * * *',  // 每5分钟
        'options' => [],
        'enabled' => true,
        'max_concurrent' => 1,
        'log_file' => 'crontab_wechatList.log',
    ],
    
    // 同步公司账号列表（企业/租户账号），供后台管理与统计
    'account_list' => [
        'name' => '同步公司账号列表',
        'command' => 'account:list',
        'schedule' => '*/5 * * * *',  // 每5分钟
        'options' => [],
        'enabled' => true,
        'max_concurrent' => 1,
        'log_file' => 'crontab_account.log',
    ],
    
    // 内容采集任务，将外部或设备内容同步到系统内容库
    'content_collect' => [
        'name' => '内容采集任务',
        'command' => 'content:collect',
        'schedule' => '*/5 * * * *',  // 每5分钟
        'options' => [],
        'enabled' => false,
        'max_concurrent' => 1,
        'log_file' => 'crontab_contentCollect.log',
    ],
    
    // 工作台：自动点赞好友/客户朋友圈，提高账号活跃度
    'workbench_auto_like' => [
        'name' => '工作台：自动点赞朋友圈',
        'command' => 'workbench:autoLike',
        'schedule' => '*/6 * * * *',  // 每6分钟
        'options' => [],
        'enabled' => true,
        'max_concurrent' => 1,
        'log_file' => 'crontab_workbench_autoLike.log',
    ],
    
    // 工作台：自动建群任务，按规则批量创建微信群
    'workbench_group_create' => [
        'name' => '工作台：自动建群任务',
        'command' => 'workbench:groupCreate',
        'schedule' => '*/5 * * * *',  // 每5分钟
        'options' => [],
        'enabled' => true,
        'max_concurrent' => 1,
        'log_file' => 'workbench_groupCreate.log',
    ],
    
    // 工作台：自动导入通讯录到系统，生成加粉/建群等任务
    'workbench_import_contact' => [
        'name' => '工作台：自动导入通讯录',
        'command' => 'workbench:import-contact',
        'schedule' => '*/5 * * * *',  // 每5分钟
        'options' => [],
        'enabled' => true,
        'max_concurrent' => 1,
        'log_file' => 'import_contact.log',
    ],

    // ===========================
    // 低频任务（每 2 分钟）
    // ===========================

    // 清洗并同步微信原始数据到存客宝业务表（数据治理任务）
    'sync_wechat_data' => [
        'name' => '同步微信原始数据到存客宝',
        'command' => 'sync:wechatData',
        'schedule' => '*/2 * * * *',  // 每2分钟
        'options' => [],
        'enabled' => true,
        'max_concurrent' => 1,
        'log_file' => 'sync_wechat_data.log',
    ],
    
    // 工作台：流量分发任务，把流量池中的线索按规则分配给微信号或员工
    'workbench_traffic_distribute' => [
        'name' => '工作台：流量分发任务',
        'command' => 'workbench:trafficDistribute',
        'schedule' => '*/2 * * * *',  // 每2分钟
        'options' => [],
        'enabled' => true,
        'max_concurrent' => 1,
        'log_file' => 'traffic_distribute.log',
    ],
    
    // 工作台：朋友圈同步任务，拉取并落库朋友圈内容
    'workbench_moments' => [
        'name' => '工作台：朋友圈同步任务',
        'command' => 'workbench:moments',
        'schedule' => '*/2 * * * *',  // 每2分钟
        'options' => [],
        'enabled' => true,
        'max_concurrent' => 1,
        'log_file' => 'workbench_moments.log',
    ],
    
    // 预防性切换好友任务，监控频繁/风控风险，自动切换加人对象，保护微信号
    'switch_friends' => [
        'name' => '预防性切换好友任务',
        'command' => 'switch:friends',
        'schedule' => '*/2 * * * *',  // 每2分钟
        'options' => [],
        'enabled' => true,
        'max_concurrent' => 1,
        'log_file' => 'switch_friends.log',
    ],

    // ===========================
    // 低频任务（每 30 分钟）
    // ===========================

    // 拉取设备通话记录（语音/电话），用于质检、统计或标签打分
    'call_recording' => [
        'name' => '拉取设备通话记录',
        'command' => 'call-recording:list',
        'schedule' => '*/30 * * * *',  // 每30分钟
        'options' => [],
        'enabled' => true,
        'max_concurrent' => 1,
        'log_file' => 'call_recording.log',
    ],

    // ===========================
    // 每日 / 每几天任务
    // ===========================

    // 每日 1:00 同步"已删除设备"列表，补齐历史状态
    'device_deleted' => [
        'name' => '同步已删除设备列表',
        'command' => 'device:list',
        'schedule' => '0 1 * * *',  // 每天1点
        'options' => ['--isDel=1'],
        'enabled' => true,
        'max_concurrent' => 1,
        'log_file' => 'crontab_device_deleted.log',
    ],
    
    // 每日 1:10 同步"已停用设备"列表，更新停用状态
    'device_stopped' => [
        'name' => '同步已停用设备列表',
        'command' => 'device:list',
        'schedule' => '10 1 * * *',  // 每天1:10
        'options' => ['--isDel=2'],
        'enabled' => true,
        'max_concurrent' => 1,
        'log_file' => 'crontab_device_stopped.log',
    ],
    
    // 每日 1:30 同步"已删除微信好友"，用于历史恢复与报表
    'wechat_friends_deleted' => [
        'name' => '同步已删除微信好友',
        'command' => 'wechatFriends:list',
        'schedule' => '30 1 * * *',  // 每天1:30
        'options' => ['--isDel=1'],
        'enabled' => true,
        'max_concurrent' => 1,
        'log_file' => 'crontab_wechatFriends_deleted.log',
    ],
    
    // 每日 1:30 同步"已删除微信群聊"，用于统计与留痕
    'wechat_chatroom_deleted' => [
        'name' => '同步已删除微信群聊',
        'command' => 'wechatChatroom:list',
        'schedule' => '30 1 * * *',  // 每天1:30
        'options' => ['--isDel=1'],
        'enabled' => true,
        'max_concurrent' => 1,
        'log_file' => 'crontab_wechatChatroom_deleted.log',
    ],
    
    // 每日 2:00 统一计算所有微信账号健康分（基础分 + 动态分）
    'wechat_calculate_score' => [
        'name' => '计算微信账号健康分',
        'command' => 'wechat:calculate-score',
        'schedule' => '0 2 * * *',  // 每天2点
        'options' => [],
        'enabled' => true,
        'max_concurrent' => 1,
        'log_file' => 'calculate_score.log',
    ],

    // 每 3 天执行的全量任务

    // 每 3 天 3:00 全量同步所有在线好友，做一次大规模校准
    'sync_all_friends' => [
        'name' => '全量同步所有在线好友',
        'command' => 'sync:allFriends',
        'schedule' => '0 3 */3 * *',  // 每3天的3点
        'options' => [],
        'enabled' => true,
        'max_concurrent' => 1,
        'log_file' => 'all_friends.log',
    ],

    // 检查未读/未回复消息并自动迁移好友（每5分钟执行一次）
    'check_unread_message' => [
        'name' => '检查未读/未回复消息并自动迁移好友',
        'command' => 'check:unread-message',
        'schedule' => '*/5 * * * *',  // 每5分钟
        'options' => ['--minutes=30'],  // 30分钟未读/未回复
        'enabled' => true,
        'max_concurrent' => 1,
        'log_file' => 'check_unread_message.log',
    ],

    // 同步部门列表，用于部门管理与权限控制
    'department_list' => [
        'name' => '同步部门列表',
        'command' => 'department:list',
        'schedule' => '*/30 * * * *',  // 每30分钟
        'options' => [],
        'enabled' => true,
        'max_concurrent' => 1,
        'log_file' => 'crontab_department.log',
    ],

    // 同步内容库，将外部内容同步到系统内容库
    'content_sync' => [
        'name' => '同步内容库',
        'command' => 'content:sync',
        'schedule' => '0 2 * * *',  // 每天2点
        'options' => [],
        'enabled' => true,
        'max_concurrent' => 1,
        'log_file' => 'crontab_content_sync.log',
    ],

    // 朋友圈采集任务，采集好友朋友圈内容
    'moments_collect' => [
        'name' => '朋友圈采集任务',
        'command' => 'moments:collect',
        'schedule' => '0 6 * * *',  // 每天6点
        'options' => [],
        'enabled' => true,
        'max_concurrent' => 1,
        'log_file' => 'crontab_moments_collect.log',
    ],

    // 分配规则列表，同步分配规则数据
    'allotrule_list' => [
        'name' => '同步分配规则列表',
        'command' => 'allotrule:list',
        'schedule' => '0 3 * * *',  // 每天3点
        'options' => [],
        'enabled' => true,
        'max_concurrent' => 1,
        'log_file' => 'crontab_allotrule_list.log',
    ],

    // 自动创建分配规则，根据规则自动创建分配任务
    'allotrule_autocreate' => [
        'name' => '自动创建分配规则',
        'command' => 'allotrule:autocreate',
        'schedule' => '0 4 * * *',  // 每天4点
        'options' => [],
        'enabled' => true,
        'max_concurrent' => 1,
        'log_file' => 'crontab_allotrule_autocreate.log',
    ],

    // 工作台：入群欢迎语任务，自动发送入群欢迎消息
    'workbench_group_welcome' => [
        'name' => '工作台：入群欢迎语任务',
        'command' => 'workbench:groupWelcome',
        'schedule' => '*/1 * * * *',  // 每1分钟
        'options' => [],
        'enabled' => true,
        'max_concurrent' => 1,
        'log_file' => 'workbench_groupWelcome.log',
    ],

    // 采集客服自己的朋友圈，同步客服账号的朋友圈内容
    'own_moments_collect' => [
        'name' => '采集客服自己的朋友圈',
        'command' => 'own:moments:collect',
        'schedule' => '*/30 * * * *',  // 每30分钟
        'options' => [],
        'enabled' => true,
        'max_concurrent' => 1,
        'log_file' => 'own_moments_collect.log',
    ],

    // 已禁用的任务（注释掉的任务）
    // 'workbench_group_push' => [
    //     'command' => 'workbench:groupPush',
    //     'schedule' => '*/2 * * * *',
    //     'options' => [],
    //     'enabled' => false,
    //     'log_file' => 'workbench_groupPush.log',
    // ],
];

