# 存客宝 API 完整索引

> **来源**：Apifox 项目 #6037107（[在线文档](https://s.apifox.cn/5989e076-dca9-4345-9025-f6f9a698d1f3)）
> **基地址**：`https://ckbapi.quwanzhi.com`
> **认证**：JWT Bearer Token（登录后获取）
> **响应格式**：`{ code: 200, msg: "success", data: {} }`
> **更新**：2026-03-15

---

## 一、私域操盘手端

### 1.1 登录相关

| 接口 | 方法 | 路径 | 说明 |
|:---|:---|:---|:---|
| 用户名密码登录 | POST | `/v1/auth/login` | account + password + typeId，返回 JWT token + member 信息 |
| 获取短信验证码 | POST | `/v1/auth/sms` | 发送手机短信验证码 |
| 手机号登录 | POST | `/v1/auth/mobile` | 手机号 + 验证码登录 |

### 1.2 设备管理

| 接口 | 方法 | 路径 | 说明 |
|:---|:---|:---|:---|
| 获取设备列表 | GET | `/v1/devices` | 分页，支持状态/关键词筛选 |
| 统计设备数量 | GET | `/v1/devices/count` | 返回设备总数 |
| 设备详情 | GET | `/v1/devices/{id}` | 单台设备信息 |
| 添加设备 | POST | `/v1/devices` | name + device_id + group_id |
| 删除设备 | DELETE | `/v1/devices/{id}` | 删除单台设备 |
| 刷新设备 | POST | `/v1/devices/{id}/refresh` | 刷新设备在线状态 |
| 设备关联微信账号 | POST | `/v1/devices/{id}/bindWechat` | 设备↔微信绑定 |
| 设备配置 | POST | `/v1/devices/{id}/config` | 配置设备参数 |
| 设备操作记录 | GET | `/v1/devices/{id}/logs` | 操作审计日志 |
| 检查设备是否更换微信 | GET | `/v1/devices/{id}/checkWechat` | 检测微信变更 |

### 1.3 微信相关

| 接口 | 方法 | 路径 | 说明 |
|:---|:---|:---|:---|
| 在线微信号数量 | GET | `/v1/wechats/online/count` | 统计在线数 |
| 微信号数量 | GET | `/v1/wechats/count` | 统计总数 |
| 在线微信号列表 | GET | `/v1/wechats/online` | 在线列表 |
| 刷新微信状态 | POST | `/v1/wechats/{id}/refresh` | 刷新在线状态 |
| 微信客服号详情 | GET | `/v1/wechats/{id}` | 详情 + 关联设备 |
| 好友转移 | POST | `/v1/wechats/friends/transfer` | from → to 批量转移 |
| 概览数据 + 健康分 | GET | `/v1/wechats/{id}/overview` | 好友数/群数/健康分/活跃度 |
| 微信朋友圈 | GET | `/v1/wechats/{id}/moments` | 该账号发布的朋友圈 |
| 朋友圈导出 | GET | `/v1/wechats/{id}/moments/export` | 导出朋友圈数据 |

### 1.4 工作台

| 接口 | 方法 | 路径 | 说明 |
|:---|:---|:---|:---|
| 创建任务 | POST | `/v1/workbench/tasks` | 群发/点赞/建群/朋友圈等任务 |
| 任务列表 | GET | `/v1/workbench/tasks` | 分页查询工作台任务 |
| 任务详情 | GET | `/v1/workbench/tasks/{id}` | 单个任务详情 |
| 更新任务 | PUT | `/v1/workbench/tasks/{id}` | 修改任务内容 |
| 更新任务状态 | PUT | `/v1/workbench/tasks/{id}/status` | 启用/暂停/完成 |
| 拷贝任务 | POST | `/v1/workbench/tasks/{id}/copy` | 复制任务 |
| 删除任务 | DELETE | `/v1/workbench/tasks/{id}` | 删除任务 |
| 点赞记录 | GET | `/v1/workbench/like-records` | 自动点赞执行记录 |
| 朋友圈发布记录 | GET | `/v1/workbench/moments-records` | 朋友圈发布记录 |
| 获取设备标签 | GET | `/v1/workbench/device-tags` | 当前设备标签 |
| 京东联盟导购媒体 | GET | `/v1/workbench/jd/media` | 京东联盟媒体列表 |
| 京东联盟广告位 | GET | `/v1/workbench/jd/adzone` | 京东联盟广告位 |
| 流量分发记录 | GET | `/v1/workbench/traffic-records` | 流量分发日志 |
| 通讯录导入记录 | GET | `/v1/workbench/contact-import` | 通讯录导入日志 |
| 群发统计 | GET | `/v1/workbench/mass-send/stats` | 群发汇总数据 |
| 群发记录 | GET | `/v1/workbench/mass-send/records` | 群发详细记录 |
| 常用功能列表 | GET | `/v1/workbench/common-features` | 常用功能快捷入口 |

### 1.5 内容库

| 接口 | 方法 | 路径 | 说明 |
|:---|:---|:---|:---|
| 创建内容库 | POST | `/v1/contents` | title + content + type + images |
| 内容库列表 | GET | `/v1/contents` | 分页 + 分类筛选 |
| 内容库详情 | GET | `/v1/contents/{id}` | 单条内容 |
| 素材列表 | GET | `/v1/contents/{id}/materials` | 库下素材 |
| 素材删除 | DELETE | `/v1/contents/materials/{id}` | 删除素材 |
| AI 改写 | POST | `/v1/contents/ai-rewrite` | AI 改写内容 |
| AI 改写保存 | POST | `/v1/contents/ai-rewrite/save` | 保存改写结果 |
| 导入 Excel（含图片） | POST | `/v1/contents/import-excel` | multipart |

### 1.6 好友

| 接口 | 方法 | 路径 | 说明 |
|:---|:---|:---|:---|
| 好友列表 | GET | `/v1/friends` | 分页 + tag + keyword |
| 好友转移 | POST | `/v1/friends/transfer` | 批量转移好友 |

### 1.7 群

| 接口 | 方法 | 路径 | 说明 |
|:---|:---|:---|:---|
| 群列表 | GET | `/v1/groups` | 分页查询群聊 |
| 群好友列表 | GET | `/v1/groups/{id}/members` | 群成员列表 |

### 1.8 场景获客

| 接口 | 方法 | 路径 | 说明 |
|:---|:---|:---|:---|
| 获取小程序码 | GET | `/v1/scenarios/qrcode` | 生成获客小程序码 |
| 已获客/已添加用户 | GET | `/v1/scenarios/users` | 获客用户列表 |
| 计划任务列表 | GET | `/v1/scenarios/plans` | 获客计划管理 |

**对外线索上报接口**（第三方调用）：

| 接口 | 方法 | 路径 | 说明 |
|:---|:---|:---|:---|
| 线索上报 | POST | `/v1/api/scenarios` | apiKey + sign 签名鉴权，上报线索+画像 |

### 1.9 数据统计

| 接口 | 方法 | 路径 | 说明 |
|:---|:---|:---|:---|
| 今日数据 | GET | `/v1/statistics/today` | 今日获客/好友/消息数 |
| 基础信息统计 | GET | `/v1/statistics/overview` | 综合数据概览 |
| 获客场景统计 | GET | `/v1/statistics/scenarios` | 各渠道获客数据 |
| 折线统计图 | GET | `/v1/statistics/trends` | 时间序列趋势 |
| 添加好友折线图 | GET | `/v1/statistics/friend-trends` | 好友增长趋势 |
| 用户数据统计 | GET | `/v1/statistics/users` | 用户维度统计 |

### 1.10 流量池

| 接口 | 方法 | 路径 | 说明 |
|:---|:---|:---|:---|
| 用户列表 | GET | `/v1/traffic-pool/users` | 流量池内用户列表 |
| 用户旅程 | GET | `/v1/traffic-pool/users/{id}/journey` | 用户行为轨迹 |
| 用户标签 | GET | `/v1/traffic-pool/users/{id}/tags` | 用户标签 |
| 用户详情 | GET | `/v1/traffic-pool/users/{id}` | 用户完整信息 |
| 流量池列表 | GET | `/v1/traffic-pool/pools` | 流量池管理 |
| 流量池添加 | POST | `/v1/traffic-pool/pools` | 创建流量池 |
| 流量池编辑 | PUT | `/v1/traffic-pool/pools/{id}` | 编辑流量池 |
| 流量池删除 | DELETE | `/v1/traffic-pool/pools/{id}` | 删除流量池 |
| 用户加入流量池 | POST | `/v1/traffic-pool/users/add` | 批量加入 |

### 1.11 用户相关

| 接口 | 方法 | 路径 | 说明 |
|:---|:---|:---|:---|
| 编辑用户信息 | PUT | `/v1/users/profile` | 修改个人资料 |
| 修改密码 | PUT | `/v1/users/password` | 修改登录密码 |

### 1.12 AI

| 接口 | 方法 | 路径 | 说明 |
|:---|:---|:---|:---|
| OpenAI 文本生成 | POST | `/v1/ai/openai/text` | 调用 OpenAI 生成文本 |
| 文本生成 | POST | `/v1/ai/text` | 通用文本生成 |
| 豆包图片生成 | POST | `/v1/ai/doubao/image` | 豆包模型图片→文本 |
| 图片生成 | POST | `/v1/ai/image` | AI 图片生成 |

### 1.13 算力

| 接口 | 方法 | 路径 | 说明 |
|:---|:---|:---|:---|
| 套餐列表 | GET | `/v1/computing/packages` | 算力套餐 |
| 购买套餐 | POST | `/v1/computing/purchase` | 购买算力 |
| 订单详情 | GET | `/v1/computing/orders/{id}` | 查询订单 |
| 算力明细 | GET | `/v1/computing/details` | 消耗明细 |
| 订单列表 | GET | `/v1/computing/orders` | 全部订单 |
| 算力统计 | GET | `/v1/computing/stats` | 汇总统计 |
| 分配 Token | POST | `/v1/computing/allocate` | 管理员分配 Token |

---

## 二、AI 知识库

| 接口 | 方法 | 说明 |
|:---|:---|:---|
| 保存统一提示词 | POST | 设置全局 AI 系统提示词 |
| 初始化 AI 功能 | POST | 每次启用 AI 需先调用 |
| 发布并应用 AI 工具 | POST | 发布 AI 配置到生产 |
| 知识库类型 - 列表 | GET | CRUD 知识库分类 |
| 知识库类型 - 添加 | POST | |
| 知识库类型 - 编辑 | PUT | |
| 知识库类型 - 删除 | DELETE | |
| 知识库类型 - 修改状态 | PUT | 启用/禁用 |
| 知识库 - 列表 | GET | CRUD 知识库条目 |
| 知识库 - 添加 | POST | |
| 知识库 - 删除 | DELETE | |

---

## 三、门店相关 & 分销渠道

### 3.1 门店账号管理

| 接口 | 方法 | 说明 |
|:---|:---|:---|
| 获取账号列表 | GET | 门店账号列表 |
| 创建账号 | POST | 新增门店账号 |
| 编辑账号 | PUT | 修改门店信息 |
| 删除账号 | DELETE | 删除门店账号 |
| 禁用/启用账号 | PUT | 状态切换 |

### 3.2 分销渠道

| 接口 | 方法 | 说明 |
|:---|:---|:---|
| 渠道列表 | GET | 分销渠道列表 |
| 渠道添加 | POST | 新增渠道 |
| 编辑渠道 | PUT | 修改渠道 |
| 删除渠道 | DELETE | |
| 禁用/启用 | PUT | 状态切换 |
| 生成渠道二维码 | POST | 生成渠道专属二维码 |
| 渠道统计 | GET | 渠道业绩数据 |
| 渠道收益统计（全局） | GET | 全局收益汇总 |
| 渠道收益明细列表 | GET | 收益明细 |
| 审核提现申请 | POST | 管理员审核 |
| 标记已打款 | PUT | 打款确认 |
| 验证 Token | POST | 渠道端 Token 校验 |
| 创建提现申请 | POST | 渠道方提现 |
| 修改密码 | PUT | 渠道用户改密 |

---

## 四、触客宝（Touchkebao）

### 4.1 登录

| 接口 | 方法 | 说明 |
|:---|:---|:---|
| 用户名密码登录 | POST | 触客宝端登录 |

### 4.2 好友/群/聊天

| 接口 | 方法 | 说明 |
|:---|:---|:---|
| 好友列表 | GET | 触客宝好友列表 |
| 好友详情 | GET | 好友详细信息 |
| 群列表 | GET | 群聊列表 |
| 群详情 | GET | 群信息 |
| 群好友 | GET | 群成员 |
| 聊天记录列表 | GET | 群/好友聊天记录 |
| 标记已读 | PUT | 消息已读 |
| 聊天记录详情 | GET | 单条聊天详情 |
| 单条消息发送状态 | GET | 消息送达状态 |
| AI 群公告 | POST | AI 生成群公告 |
| 修改用户信息 | PUT | 编辑好友备注/标签 |
| 添加好友任务记录 | GET | 添加好友日志 |

### 4.3 客服 & 待办

| 接口 | 方法 | 说明 |
|:---|:---|:---|
| 客服列表 | GET | 客服账号列表 |
| 待办事项列表 | GET | 待办项管理 |
| 待办事项添加 | POST | |
| 待办事项处理 | PUT | 标记完成 |
| 跟进提醒列表 | GET | 跟进提醒 |
| 跟进提醒添加 | POST | |
| 跟进提醒处理 | PUT | |

### 4.4 AI 配置

| 接口 | 方法 | 说明 |
|:---|:---|:---|
| AI 全局配置设置 | POST | 设置全局 AI 参数 |
| AI 全局配置列表 | GET | 获取 AI 配置 |
| AI 好友配置批量设置 | POST | 批量配置好友 AI |
| AI 好友配置获取 | GET | 获取好友 AI 配置 |
| AI 好友配置设置 | POST | 单好友 AI 配置 |
| AI 对话 | POST | 触发 AI 对话 |
| 获取用户 tokens | GET | Token 余额 |

### 4.5 内容管理

#### 问答库

| 接口 | 方法 | 说明 |
|:---|:---|:---|
| 列表/添加/详情/删除/更新 | CRUD | 问答库管理 |

#### 素材管理 v1

| 接口 | 方法 | 说明 |
|:---|:---|:---|
| 列表/获取所有/添加/详情/删除/更新 | CRUD | 素材管理 |

#### 违禁词管理

| 接口 | 方法 | 说明 |
|:---|:---|:---|
| 列表/添加/详情/删除/更新/修改状态 | CRUD | 违禁词过滤 |

#### 关键词管理

| 接口 | 方法 | 说明 |
|:---|:---|:---|
| 列表/添加/详情/删除/更新/修改状态 | CRUD | 关键词回复 |

#### 内容管理 v2 — 朋友圈定时发布

| 接口 | 方法 | 说明 |
|:---|:---|:---|
| 列表/添加/编辑/删除 | CRUD | 朋友圈定时发布 |

### 4.6 快捷聊天

| 接口 | 方法 | 说明 |
|:---|:---|:---|
| 快捷语列表 | GET | 快捷回复语 |
| 快捷语分组 - 添加/编辑/删除 | CRUD | 分组管理 |
| 快捷语 - 添加/编辑/删除 | CRUD | 快捷语管理 |

### 4.7 消息中心

| 接口 | 方法 | 说明 |
|:---|:---|:---|
| 列表 | GET | 系统消息列表 |
| 单条标记已读 | PUT | |
| 全部标记已读 | PUT | |

### 4.8 自动问候

| 接口 | 方法 | 说明 |
|:---|:---|:---|
| 获取规则列表 | GET | 自动问候规则 |
| 创建规则 | POST | |
| 规则详情 | GET | |
| 删除规则 | DELETE | |
| 修改启用状态 | PUT | |
| 更新规则 | PUT | |
| 复制规则 | POST | |

### 4.9 AI 智能推送

| 接口 | 方法 | 说明 |
|:---|:---|:---|
| 推送列表 | GET | AI 推送任务 |
| 添加推送 | POST | |
| 推送详情 | GET | |
| 更新推送 | PUT | |
| 删除推送 | DELETE | |
| 修改推送状态 | PUT | |
| 统计概览 | GET | 推送效果统计 |

### 4.10 分组 & 信息修改

| 接口 | 方法 | 说明 |
|:---|:---|:---|
| 分组列表/新增/更新/删除 | CRUD | 好友/群分组 |
| 移动好友或群的分组 | PUT | 批量移动 |
| 修改用户备注 | PUT | 备注修改 |
| 修改用户标签 | PUT | 标签修改 |
| 用户迁移 | POST | 跨账号迁移 |
| 记录聊天消息 | POST | WSS 消息落库 |
| 更新发送状态 | PUT | 消息送达状态 |
| 置顶 | PUT | 置顶聊天 |

---

## 五、底层接口（代理服务器通信层）

### 5.1 微信群

| 接口 | 方法 | 说明 |
|:---|:---|:---|
| 获取微信群成员列表 | GET | 底层群成员同步 |
| 获取微信群聊列表 | GET | 底层群列表同步 |
| 发送群消息 | POST | WebSocket 下发群消息 |

### 5.2 微信好友

| 接口 | 方法 | 说明 |
|:---|:---|:---|
| 获取微信好友列表 | GET | 底层好友同步 |
| 添加好友 | POST | WebSocket 添加好友 |
| 添加好友任务列表 | GET | 添加好友任务日志 |
| 发送消息 | POST | WebSocket 发送私聊 |

### 5.3 朋友圈

| 接口 | 方法 | 说明 |
|:---|:---|:---|
| 朋友圈发布记录 | GET | 底层发布记录 |
| 获取朋友圈 | GET | 抓取好友朋友圈 |
| 获取朋友圈素材地址 | GET | 朋友圈图片/视频 URL |
| 获取微信客服 | GET | 微信客服列表 |

### 5.4 登录 & 聊天记录

| 接口 | 方法 | 说明 |
|:---|:---|:---|
| 登录 | POST | 底层代理登录 |
| 重新获取 Token | POST | Token 刷新 |
| 获取商户基本信息 | GET | 商户数据 |
| 退出登录 | POST | |
| 获取验证码 | GET | |
| 获取微信消息 | GET | 聊天记录同步 |
| 获取微信群消息 | GET | 群聊记录同步 |

### 5.5 设备 & 部门 & 账号

| 接口 | 方法 | 说明 |
|:---|:---|:---|
| 添加/获取设备列表 | POST/GET | 底层设备 |
| 设备分组 CRUD | POST/GET/PUT | |
| 更新设备通讯录 | PUT | 同步通讯录 |
| 创建/修改/获取/删除部门 | CRUD | 公司部门 |
| 设置权限 | POST | 权限分配 |
| 获取公司账号列表 | GET | 账号管理 |
| 创建账号（+部门） | POST | |

### 5.6 分配规则

| 接口 | 方法 | 说明 |
|:---|:---|:---|
| 获取/新增/删除/编辑分配规则 | CRUD | 流量分发规则 |
| 自动创建分配规则 | POST | 系统自动生成 |

---

## 六、门店端（新版）

| 接口 | 方法 | 说明 |
|:---|:---|:---|
| 账号密码登录 | POST | 门店登录 |
| 免密登录（设备 ID） | POST | 设备绑定免密 |
| 发送短信验证码 | POST | |
| 手机验证码登录 | POST | |
| Agent 模块列表 | GET | 获取 Agent 模块 |
| 更新模块状态 | PUT | 启停 Agent |
| 流量套餐 CRUD | GET/POST | 流量采购 |
| 供应链套餐 CRUD | GET/POST/PUT | 供应商采购 |
| 算力套餐 CRUD | GET/POST | 算力管理 |
| 获取/更新用户资料 | GET/PUT | 个人中心 |
| 获取设备和微信信息 | GET | |
| 获取动态记录 | GET | |
| 客户列表/详情/更新 | GET/PUT | 客户管理 |

---

## 七、Coze 集成

| 接口 | 方法 | 说明 |
|:---|:---|:---|
| 查看会话列表 | GET | Coze 会话管理 |
| 创建会话 | POST | |
| 创建对话 | POST | 发送消息给 Coze |
| 查看对话详情 | GET | |
| 查看对话明细 | GET | |
| 查看空间列表 | GET | Coze 工作空间 |
| 获取智能体列表 | GET | Coze Agents |
| 对话列表 | GET | |

---

## 八、其它

| 接口 | 方法 | 说明 |
|:---|:---|:---|
| 文件上传 | POST | 通用文件/图片上传 |
| 测试支付 | POST | 支付测试 |
| 检测 APP 更新 | GET | 版本检测 |
| 对外接口生成 TOKEN | POST | 第三方调用 Token |

---

## WebSocket 命令类型（实时通信）

通过 WSS 连接到 `wss://s2.siyuguanli.com:9993`。

| 命令 | 说明 |
|:---|:---|
| `CmdSignIn` | 登录认证（accessToken + accountId） |
| `CmdHeartbeat` | 心跳保活（30s 间隔） |
| `CmdFetchMoment` | 获取朋友圈 |
| `CmdSendMsg` | 发送消息 |
| `CmdCreateChatroom` | 创建群聊 |
| `CmdAddFriend` | 添加好友 |

---

## 签名算法（对外接口）

用于 `/v1/api/scenarios` 等对外接口：

1. 移除 `sign`、`apiKey`、`portrait`
2. 移除 null/空字符串
3. 按键名 ASCII 升序
4. 只取值拼接（无分隔符）
5. 第一次 MD5
6. `sign = MD5(firstMd5 + apiKey)`

详见 `存客宝对接规范.md`。
