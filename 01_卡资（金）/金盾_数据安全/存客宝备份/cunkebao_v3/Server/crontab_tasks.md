# 新版微信服务器定时任务配置

以下为当前 command.php 注册的所有计划任务示例，按需调整执行频率和日志路径。

```bash
# 设备列表
*/30 * * * * cd /www/wwwroot/mckb_quwanzhi_com/Server && php think device:list >> /www/wwwroot/mckb_quwanzhi_com/Server/runtime/log/device_list.log 2>&1

# 微信好友列表
*/5 * * * * cd /www/wwwroot/mckb_quwanzhi_com/Server && php think wechatFriends:list >> /www/wwwroot/mckb_quwanzhi_com/Server/runtime/log/wechat_friends_list.log 2>&1

# 微信群列表
*/30 * * * * cd /www/wwwroot/mckb_quwanzhi_com/Server && php think wechatChatroom:list >> /www/wwwroot/mckb_quwanzhi_com/Server/runtime/log/wechat_chatroom_list.log 2>&1

# 添加好友任务列表
*/30 * * * * cd /www/wwwroot/mckb_quwanzhi_com/Server && php think friendTask:list >> /www/wwwroot/mckb_quwanzhi_com/Server/runtime/log/friend_task_list.log 2>&1

# 微信客服列表
*/30 * * * * cd /www/wwwroot/mckb_quwanzhi_com/Server && php think wechatList:list >> /www/wwwroot/mckb_quwanzhi_com/Server/runtime/log/wechat_list.log 2>&1

# 公司账号列表
*/30 * * * * cd /www/wwwroot/mckb_quwanzhi_com/Server && php think account:list >> /www/wwwroot/mckb_quwanzhi_com/Server/runtime/log/account_list.log 2>&1

# 微信好友消息列表
*/30 * * * * cd /www/wwwroot/mckb_quwanzhi_com/Server && php think message:friendsList >> /www/wwwroot/mckb_quwanzhi_com/Server/runtime/log/message_friends_list.log 2>&1

# 微信群聊消息列表
*/30 * * * * cd /www/wwwroot/mckb_quwanzhi_com/Server && php think message:chatroomList >> /www/wwwroot/mckb_quwanzhi_com/Server/runtime/log/message_chatroom_list.log 2>&1

# 部门列表
*/30 * * * * cd /www/wwwroot/mckb_quwanzhi_com/Server && php think department:list >> /www/wwwroot/mckb_quwanzhi_com/Server/runtime/log/department_list.log 2>&1

# 同步内容库
0 2 * * * cd /www/wwwroot/mckb_quwanzhi_com/Server && php think content:sync >> /www/wwwroot/mckb_quwanzhi_com/Server/runtime/log/content_sync.log 2>&1

# 微信群好友列表
*/30 * * * * cd /www/wwwroot/mckb_quwanzhi_com/Server && php think groupFriends:list >> /www/wwwroot/mckb_quwanzhi_com/Server/runtime/log/group_friends_list.log 2>&1

# 获取通话记录
*/30 * * * * cd /www/wwwroot/mckb_quwanzhi_com/Server && php think call-recording:list >> /www/wwwroot/mckb_quwanzhi_com/Server/runtime/log/call_recording.log 2>&1


# 分配规则列表
0 3 * * * cd /www/wwwroot/mckb_quwanzhi_com/Server && php think allotrule:list >> /www/wwwroot/mckb_quwanzhi_com/Server/runtime/log/allot_rule_list.log 2>&1

# 自动创建分配规则
0 4 * * * cd /www/wwwroot/mckb_quwanzhi_com/Server && php think allotrule:autocreate >> /www/wwwroot/mckb_quwanzhi_com/Server/runtime/log/allot_rule_autocreate.log 2>&1

# 内容采集任务
0 5 * * * cd /www/wwwroot/mckb_quwanzhi_com/Server && php think content:collect >> /www/wwwroot/mckb_quwanzhi_com/Server/runtime/log/content_collect.log 2>&1

# 朋友圈采集任务
0 6 * * * cd /www/wwwroot/mckb_quwanzhi_com/Server && php think moments:collect >> /www/wwwroot/mckb_quwanzhi_com/Server/runtime/log/moments_collect.log 2>&1

# 工作台自动点赞任务
0 7 * * * cd /www/wwwroot/mckb_quwanzhi_com/Server && php think workbench:autoLike >> /www/wwwroot/mckb_quwanzhi_com/Server/runtime/log/workbench_auto_like.log 2>&1

# 工作台朋友圈同步任务
0 8 * * * cd /www/wwwroot/mckb_quwanzhi_com/Server && php think workbench:moments >> /www/wwwroot/mckb_quwanzhi_com/Server/runtime/log/workbench_moments.log 2>&1

# 同步微信数据到存客宝
0 9 * * * cd /www/wwwroot/mckb_quwanzhi_com/Server && php think sync:wechatData >> /www/wwwroot/mckb_quwanzhi_com/Server/runtime/log/sync_wechat_data.log 2>&1

# 工作台群发消息
*/2 * * * * cd /www/wwwroot/mckb_quwanzhi_com/Server && php think workbench:groupPush >> /www/wwwroot/mckb_quwanzhi_com/Server/runtime/log/workbench_groupPush.log 2>&1

# 工作台建群
*/5 * * * * cd /www/wwwroot/mckb_quwanzhi_com/Server && php think workbench:groupCreate >> /www/wwwroot/mckb_quwanzhi_com/Server/runtime/log/workbench_groupCreate.log 2>&1

# 工作台通讯录导入
*/5 * * * * cd /www/wwwroot/mckb_quwanzhi_com/Server && php think workbench:import-contact >> /www/wwwroot/mckb_quwanzhi_com/Server/runtime/log/import_contact.log 2>&1

# 工作台流量分发
0 9 * * * cd /www/wwwroot/mckb_quwanzhi_com/Server && php think workbench:trafficDistribute >> /www/wwwroot/mckb_quwanzhi_com/Server/runtime/log/traffic_distribute.log 2>&1



# 预防性切换好友
*/2 * * * * cd /www/wwwroot/mckb_quwanzhi_com/Server && php think switch:friends >> /www/wwwroot/mckb_quwanzhi_com/Server/runtime/log/switch_friends.log 2>&1

# 消息提醒
*/1 * * * * cd /www/wwwroot/mckb_quwanzhi_com/Server && php think kf:notice >> /www/wwwroot/mckb_quwanzhi_com/Server/runtime/log/kf_notice.log 2>&1

# 客服评分
0 2 * * * cd /www/wwwroot/mckb_quwanzhi_com/Server && php think wechat:calculate-score >> /www/wwwroot/mckb_quwanzhi_com/Server/runtime/log/calculate_score.log 2>&1





```

## 说明

- 所有命令都在 `/www/wwwroot/mckb_quwanzhi_com/Server` 目录下执行
- 默认只获取未删除（活跃）的设备、微信好友和群聊
- 已注释的命令（以#开头）是获取已删除或已停用数据的任务，可根据需要取消注释启用
- 每个命令的执行结果都会记录到对应的日志文件中
- 日志文件名格式包含了数据状态（如 `_active`, `_deleted`, `_stopped`）
- 日志文件位于 `/www/wwwroot/mckb_quwanzhi_com/Server/runtime/log/` 目录下
- 大部分任务每5分钟执行一次（`*/5 * * * *` 表示每小时的第0,5,10,15...55分钟执行）
- 设备列表的未删除设备任务每天凌晨1点执行一次（`0 1 * * *`）
- 自动创建分配规则每小时整点执行一次（`0 * * * *`）
- 内容采集任务每5分钟执行一次（`*/5 * * * *`）

## 检查定时任务

使用以下命令查看当前配置的 crontab 任务：

```bash
crontab -l
```

```bash
- 本地: php think worker:server
- 线上: php think worker:server -d   (自带守护进程，无需搭配Supervisor 之类的工具)
- php think worker:server stop    php think worker:server status
```



# 设备列表 - 未删除设备（每半小时执行）
*/5 * * * * cd /www/wwwroot/mckb_quwanzhi_com/Server && php think device:list --isDel=0 >> /www/wwwroot/mckb_quwanzhi_com/Server/runtime/log/crontab_device_active.log 2>&1
# 设备列表 - 已删除设备（每天1点执行）
0 1 * * * cd /www/wwwroot/mckb_quwanzhi_com/Server && php think device:list --isDel=1 >> /www/wwwroot/mckb_quwanzhi_com/Server/runtime/log/crontab_device_deleted.log 2>&1
# 设备列表 - 已停用设备（每天1:10执行）
10 1 * * * cd /www/wwwroot/mckb_quwanzhi_com/Server && php think device:list --isDel=2 >> /www/wwwroot/mckb_quwanzhi_com/Server/runtime/log/crontab_device_stopped.log 2>&1
# 微信好友列表 - 未删除好友（每1分钟执行）
*/1 * * * * cd /www/wwwroot/mckb_quwanzhi_com/Server && php think wechatFriends:list --isDel=0 >> /www/wwwroot/mckb_quwanzhi_com/Server/runtime/log/crontab_wechatFriends_active.log 2>&1
# 微信好友列表 - 已删除好友（每天1:30分执行）
30 1 * * * cd /www/wwwroot/mckb_quwanzhi_com/Server && php think wechatFriends:list --isDel=1 >> /www/wwwroot/mckb_quwanzhi_com/Server/runtime/log/crontab_wechatFriends_deleted.log 2>&1
# 微信群列表 - 未删除群（每5分钟执行）
*/5 * * * * cd /www/wwwroot/mckb_quwanzhi_com/Server && php think wechatChatroom:list --isDel=0 >> /www/wwwroot/mckb_quwanzhi_com/Server/runtime/log/crontab_wechatChatroom_active.log 2>&1
# 微信群列表 - 已删除群（每天1:30分执行）
30 1 * * * cd /www/wwwroot/mckb_quwanzhi_com/Server && php think wechatChatroom:list --isDel=1 >> /www/wwwroot/mckb_quwanzhi_com/Server/runtime/log/crontab_wechatChatroom_deleted.log 2>&1
# 微信群好友列表（没5分钟执行）
*/5 * * * * cd /www/wwwroot/mckb_quwanzhi_com/Server && php think groupFriends:list >> /www/wwwroot/mckb_quwanzhi_com/Server/runtime/log/crontab_groupFriends.log 2>&1
# 添加好友任务列表(每1分钟执行)
*/1 * * * * cd /www/wwwroot/mckb_quwanzhi_com/Server && php think friendTask:list >> /www/wwwroot/mckb_quwanzhi_com/Server/runtime/log/crontab_friendTask.log 2>&1
# 微信客服列表（每5分钟执行）
*/5 * * * * cd /www/wwwroot/mckb_quwanzhi_com/Server && php think wechatList:list >> /www/wwwroot/mckb_quwanzhi_com/Server/runtime/log/crontab_wechatList.log 2>&1
# 公司账号列表（每5分钟执行）
*/5 * * * * cd /www/wwwroot/mckb_quwanzhi_com/Server && php think account:list >> /www/wwwroot/mckb_quwanzhi_com/Server/runtime/log/crontab_account.log 2>&1
# 微信好友消息列表（每30分钟执行）
*/1 * * * * cd /www/wwwroot/mckb_quwanzhi_com/Server && php think message:friendsList >> /www/wwwroot/mckb_quwanzhi_com/Server/runtime/log/crontab_messageFriends.log 2>&1
# 微信群聊消息列表（每30分钟执行）
*/1 * * * * cd /www/wwwroot/mckb_quwanzhi_com/Server && php think message:chatroomList >> /www/wwwroot/mckb_quwanzhi_com/Server/runtime/log/crontab_messageChatroom.log 2>&1
# 获取通话记录
*/30 * * * * cd /www/wwwroot/mckb_quwanzhi_com/Server && php think call-recording:list >> /www/wwwroot/mckb_quwanzhi_com/Server/runtime/log/call_recording.log 2>&1
# 清洗微信数据
*/2 * * * * cd /www/wwwroot/mckb_quwanzhi_com/Server && php think sync:wechatData >> /www/wwwroot/mckb_quwanzhi_com/Server/runtime/log/sync_wechat_data.log 2>&1
# 内容采集任务（每5分钟执行）
*/5 * * * * cd /www/wwwroot/mckb_quwanzhi_com/Server && php think content:collect >> /www/wwwroot/mckb_quwanzhi_com/Server/runtime/log/crontab_contentCollect.log 2>&1
# 工作台任务_自动点赞（每10分钟执行）
*/6 * * * * cd /www/wwwroot/mckb_quwanzhi_com/Server && php think workbench:autoLike >> /www/wwwroot/mckb_quwanzhi_com/Server/runtime/log/crontab_workbench_autoLike.log 2>&1
# 每3天的3点同步所有好友
0 3 */3 * * cd /www/wwwroot/mckb_quwanzhi_com/Server && php think sync:allFriends >> /www/wwwroot/mckb_quwanzhi_com/Server/runtime/log/all_friends.log 2>&1
# 工作台流量分发
*/2 * * * * cd /www/wwwroot/mckb_quwanzhi_com/Server && php think workbench:trafficDistribute >> /www/wwwroot/mckb_quwanzhi_com/Server/runtime/log/traffic_distribute.log 2>&1
# 工作台朋友圈同步任务
*/2 * * * * cd /www/wwwroot/mckb_quwanzhi_com/Server && php think workbench:moments >> /www/wwwroot/mckb_quwanzhi_com/Server/runtime/log/workbench_moments.log 2>&1
# 工作台群发消息
#*/2 * * * * cd /www/wwwroot/mckb_quwanzhi_com/Server && php think workbench:groupPush >> /www/wwwroot/mckb_quwanzhi_com/Server/runtime/log/workbench_groupPush.log 2>&1
# 预防性切换好友
*/2 * * * * cd /www/wwwroot/mckb_quwanzhi_com/Server && php think switch:friends >> /www/wwwroot/mckb_quwanzhi_com/Server/runtime/log/switch_friends.log 2>&1
# 工作台建群
*/5 * * * * cd /www/wwwroot/mckb_quwanzhi_com/Server && php think workbench:groupCreate >> /www/wwwroot/mckb_quwanzhi_com/Server/runtime/log/workbench_groupCreate.log 2>&1
# 工作台通讯录导入
*/5 * * * * cd /www/wwwroot/mckb_quwanzhi_com/Server && php think workbench:import-contact >> /www/wwwroot/mckb_quwanzhi_com/Server/runtime/log/import_contact.log 2>&1
# 工作台入群欢迎语
*/1 * * * * cd /www/wwwroot/mckb_quwanzhi_com/Server && php think workbench:groupWelcome >> /www/wwwroot/mckb_quwanzhi_com/Server/runtime/log/workbench_groupWelcome.log 2>&1
# 消息提醒
*/1 * * * * cd /www/wwwroot/mckb_quwanzhi_com/Server && php think kf:notice >> /www/wwwroot/mckb_quwanzhi_com/Server/runtime/log/kf_notice.log 2>&1
# 客服评分
0 2 * * * cd /www/wwwroot/mckb_quwanzhi_com/Server && php think wechat:calculate-score >> /www/wwwroot/mckb_quwanzhi_com/Server/runtime/log/calculate_score.log 2>&1
# 采集客服自己的朋友圈
*/30 * * * * cd /www/wwwroot/mckb_quwanzhi_com/Server && php think own:moments:collect >> /www/wwwroot/mckb_quwanzhi_com/Server/runtime/log/own_moments_collect.log 2>&1
# 检查未读/未回复消息并自动迁移好友
*/5 * * * * cd /www/wwwroot/mckb_quwanzhi_com/Server && php think check:unread-message --minutes=30 >> /www/wwwroot/mckb_quwanzhi_com/Server/runtime/log/check_unread_message.log 2>&1


# 每分钟执行一次调度器（调度器内部会自动判断哪些任务需要执行）
* * * * * cd /www/wwwroot/mckb_quwanzhi_com/Server && php think scheduler:run >> /www/wwwroot/mckb_quwanzhi_com/Server/runtime/log/scheduler.log 2>&1
