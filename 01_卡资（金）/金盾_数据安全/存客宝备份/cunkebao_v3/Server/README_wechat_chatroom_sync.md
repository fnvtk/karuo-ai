# 微信群聊同步功能

本功能用于自动同步微信群聊数据，支持分页获取群聊列表以及群成员信息，并将数据保存到数据库中。

## 功能特点

1. 支持分页获取微信群聊列表
2. 自动获取每个群聊的成员信息
3. 支持通过关键词筛选群聊
4. 支持按微信账号筛选群聊
5. 可选择是否包含已删除的群聊
6. 使用队列处理，支持大量数据的同步
7. 支持失败重试机制
8. 提供命令行和HTTP接口两种触发方式

## 数据表结构

本功能使用以下数据表：

1. **wechat_chatroom** - 存储微信群聊信息
2. **wechat_chatroom_member** - 存储微信群聊成员信息

## 使用方法

### 1. HTTP接口触发

```
GET/POST /api/wechat_chatroom/syncChatrooms
```

**参数:**
- `pageIndex`: 起始页码，默认0
- `pageSize`: 每页大小，默认100
- `keyword`: 群名关键词，可选
- `wechatAccountKeyword`: 微信账号关键词，可选
- `isDeleted`: 是否包含已删除群聊，可选

**示例:**
```
/api/wechat_chatroom/syncChatrooms?pageSize=50
```

### 2. 命令行触发

```bash
php think sync:wechat:chatrooms [选项]
```

**选项:**
- `-p, --pageIndex`: 起始页码，默认0
- `-s, --pageSize`: 每页大小，默认100
- `-k, --keyword`: 群名关键词，可选
- `-a, --account`: 微信账号关键词，可选
- `-d, --deleted`: 是否包含已删除群聊，可选

**示例:**
```bash
# 基本用法
php think sync:wechat:chatrooms

# 指定页大小和关键词
php think sync:wechat:chatrooms -s 50 -k "测试群"

# 指定账号关键词
php think sync:wechat:chatrooms --account "张三"
```

### 3. 定时任务配置

可以将命令添加到系统的定时任务(crontab)中，实现定期自动同步：

```
# 每天凌晨3点执行微信群聊同步
0 3 * * * cd /path/to/your/project && php think sync:wechat:chatrooms
```

## 队列消费者配置

为了处理同步任务，需要启动队列消费者：

```bash
# 启动微信群聊队列消费者
php think queue:work --queue wechat_chatrooms
```

建议在生产环境中使用supervisor等工具来管理队列消费者进程。

## 同步过程

1. 触发同步任务，将初始页任务加入队列
2. 队列消费者处理任务，获取当前页的群聊列表
3. 如果当前页有数据且数量等于页大小，则将下一页任务加入队列
4. 对每个获取到的群聊，添加获取群成员的任务
5. 所有数据会自动保存到数据库中

## 调试与日志

同步过程的日志会记录在应用的日志目录中，可以通过查看日志了解同步状态和错误信息。

## 注意事项

1. 页大小建议设置为合理值(50-100)，过大会导致请求超时
2. 当数据量较大时，建议增加队列消费者的数量
3. 确保系统授权信息正确，否则无法获取数据
4. 数据同步是增量的，会自动更新已存在的记录 