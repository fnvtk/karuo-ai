---
name: 存客宝
description: 存客宝私域系统全栈管理——API调用、数据库操作、设备管理、微信自动化、AI数字员工、触客宝、场景获客、流量池、分销渠道。
triggers: 存客宝、cunkebao、私域、获客、工作手机、场景获客、流量池、触客宝、touchkebao、AI数字员工、分销渠道、微信管理、存客宝API、存客宝数据库
owner: 金盾
group: 金
version: "2.0"
updated: "2026-03-15"
---

# 存客宝（CunKeBao）

卡若私域银行核心产品。负责存客宝全栈系统的 API 调用、数据库操作、开发部署与运维。

---

## 能做什么（Capabilities）

1. **API 调用**：200+ 接口，覆盖登录、设备、微信、工作台、内容库、好友、群、场景获客、数据统计、流量池、AI、算力、触客宝、门店、分销渠道、Coze 集成
2. **数据库操作**：MySQL（用户/设备/订单/流量池）+ MongoDB（好友/消息/朋友圈/内容/日志）+ Redis（缓存/队列）
3. **WebSocket 实时通信**：设备控制、消息收发、朋友圈操作、添加好友、建群
4. **自动化任务**：自动点赞、朋友圈同步、群消息推送、自动建群、入群欢迎语、通讯录导入、流量分发
5. **AI 能力**：AI 改写、AI 对话、AI 群公告、AI 智能推送、知识库管理、Coze 集成
6. **触客宝（客服端）**：聊天、好友管理、快捷回复、问答库、违禁词、关键词、自动问候、分组管理
7. **门店 & 分销**：门店账号管理、流量采购、供应链采购、算力管理、分销渠道、渠道收益
8. **部署运维**：宝塔管理、Nginx 配置、SSL、服务器安全、磁盘清理、数据库备份

---

## 怎么用（Usage）

**触发词**：存客宝、cunkebao、私域、获客、工作手机、场景获客、流量池、触客宝、AI数字员工、分销渠道、微信管理、存客宝API、存客宝数据库

**典型场景**：
- "调用存客宝 API 获取设备列表" → 查 API 索引 → 调用接口
- "存客宝数据库有哪些表" → 查数据库架构
- "帮我用存客宝 API 上报一条线索" → 生成签名 → 调用 /v1/api/scenarios
- "触客宝 AI 配置怎么设置" → 查触客宝 AI 配置接口
- "存客宝服务器出问题了" → 查服务器管理脚本

---

## 执行步骤（Steps）

### 1. 确认需求类型

| 类型 | 动作 |
|:---|:---|
| API 调用 | 查 `参考资料/存客宝API完整索引.md` 找到接口 → 构造请求 |
| 数据库查询 | 查下方数据库表索引 → 构造 SQL/MongoDB 查询 |
| 部署运维 | 查 `金仓_存储备份/服务器管理/` 相关脚本 |
| 开发相关 | 查 `存客宝备份/cunkebao_doc/` 相关文档 |
| AI / 触客宝 | 查 API 索引第四节（触客宝）或第二节（AI 知识库） |

### 2. API 调用流程

```
1. 登录获取 Token
   POST /v1/auth/login { account, password, typeId: 1 }
   → 拿到 data.token

2. 后续请求带 Authorization: Bearer {token}

3. 对外接口（/v1/api/scenarios）需要 apiKey + sign 签名
   签名算法见 `存客宝对接规范.md`
```

### 3. 验证结果

- HTTP 200 + `code: 200` = 成功
- 其它 code 查错误码表（见 API 索引）

---

## 系统架构速览

```
客户端（5端）
├── Cunkebao（React 18） — 主管理后台
├── Touchkebao（React 18）— 客服聊天
├── SuperAdmin（Next.js 14）— 超管后台
├── Store（UniApp）— 门店端
└── aiApp/ckApp（UniApp）— 移动端

后端（3服务）
├── Server（ThinkPHP 5.1）— 主业务 API
├── Moncter（Webman/PHP 8.1）— 监控/数据/MCP
└── WebSocket（GatewayWorker）— 实时通信

数据层
├── MySQL（用户/设备/订单/流量池/配置）
├── MongoDB（好友/消息/朋友圈/内容/日志）
└── Redis（缓存/任务队列）
```

**API 基地址**：`https://ckbapi.quwanzhi.com`
**WebSocket**：`wss://s2.siyuguanli.com:9993`

---

## 数据库表索引

### MySQL 核心表

| 表名 | 说明 | 关键字段 |
|:---|:---|:---|
| `users` | 系统用户 | id, username, account, password, isAdmin, companyId, typeId |
| `devices` | 设备 | id, name, device_id, status, online_status, group_id |
| `wechats` | 微信账号 | id, wxid, nickname, device_id, health_score |
| `orders` | 订单 | id, user_id, amount, status, type |
| `traffic_pools` | 流量池 | id, name, rules |
| `traffic_tags` | 流量标签 | id, name, pool_id |
| `traffic_pool`（用户） | 流量池用户 | id, trafficPoolId, phone, wechatId, portrait |
| `scenarios` | 获客场景 | id, apiKey, name, config |
| `workbench_tasks` | 工作台任务 | id, type, status, config, wechat_id |
| `content_categories` | 内容分类 | id, name |
| `distribution_channels` | 分销渠道 | id, name, qrcode, status |
| `computing_packages` | 算力套餐 | id, name, tokens, price |
| `system_config` | 系统配置 | key, value（含 oss_config 等） |
| `departments` | 部门 | id, name, company_id |
| `permissions` | 权限 | id, role_id, resource |

### MongoDB 核心集合

| 集合 | 说明 |
|:---|:---|
| `wechat_friends` | 微信好友信息（头像、昵称、标签、备注） |
| `wechat_messages` | 聊天消息记录 |
| `wechat_moments` | 朋友圈内容 |
| `wechat_chatrooms` | 群聊信息 |
| `content_library` | 内容库素材 |
| `task_logs` | 任务执行日志 |
| `portrait_data` | 用户画像数据 |

### KR 数据库（Moncter 管辖）

共 25 个库，关键库：`KR_存客宝`、`KR_存客宝_四表重构KR_KR版`、`KR_卡套私域`。
完整列表见 `存客宝备份/cunkebao_v3/Moncter/数据库列表.md`。

---

## 功能模块清单

| 模块 | 核心功能 | API 分类 |
|:---|:---|:---|
| **登录认证** | 账密登录、短信登录、JWT Token | 登录相关 |
| **设备管理** | 设备增删改查、状态刷新、微信绑定 | 设备 |
| **微信管理** | 微信号列表、好友管理、健康分、朋友圈 | 微信相关 |
| **工作台** | 自动点赞、朋友圈同步、群发、自动建群、流量分发 | 工作台 |
| **内容库** | 素材管理、AI 改写、Excel 导入 | 内容库 |
| **好友 & 群** | 好友列表/转移、群列表/成员 | 好友 / 群 |
| **场景获客** | 小程序码、获客计划、线索上报（对外 API） | 场景获客 |
| **数据统计** | 今日数据、趋势图、获客场景统计 | 数据统计 |
| **流量池** | 用户管理、标签、旅程、池管理 | 流量池 |
| **AI** | 文本生成、图片生成、AI 知识库、Coze | AI / AI知识库 / Coze |
| **算力** | 套餐购买、Token 分配、明细统计 | 算力 |
| **触客宝** | 客服聊天、快捷回复、问答库、AI 推送、自动问候 | 触客宝 |
| **门店端** | 门店登录、Agent、流量/供应链/算力采购 | 门店端 |
| **分销渠道** | 渠道管理、二维码、收益、提现 | 分销渠道 |
| **底层通信** | WebSocket 设备控制、好友/群/消息同步 | 底层接口 |

---

## 定时任务

| 命令 | 说明 |
|:---|:---|
| `sync:wechatData` | 同步微信数据 |
| `sync:allFriends` | 同步所有好友 |
| `workbench:autoLike` | 自动点赞 |
| `workbench:moments` | 朋友圈同步 |
| `workbench:groupPush` | 群消息推送 |
| `workbench:groupCreate` | 自动建群 |
| `workbench:groupWelcome` | 入群欢迎语 |
| `content:collect` | 内容采集 |
| `moments:collect` | 朋友圈采集 |
| `wechat:calculate-score` | 健康分计算 |
| `wechat:update-score` | 健康分更新 |
| `scheduler:run` | 多进程并发调度器 |

---

## 风控机制

- **消息间隔**：3-8 秒随机
- **每日上限**：200 条/微信号
- **同好友间隔**：≥60 秒
- **健康分**：基础 100 分，扣分（失败-2、删除-5、举报-20、异常-50）加分（互动+1/天、增长+2/10人、活跃+5/周）
- **健康分 < 60 预警**，< 40 限制，< 20 停用

---

## 相关文件（Files）

| 文件 | 路径 | 说明 |
|:---|:---|:---|
| **API 完整索引** | `参考资料/存客宝API完整索引.md` | 200+ 接口按模块分类速查 |
| **文档索引** | `参考资料/存客宝文档索引.md` | cunkebao_doc 结构导航 |
| **对接规范** | `04_卡火/火炬/全栈开发/开发模板/5、接口/存客宝对接规范.md` | 签名算法 + SDK 封装 |
| **技术架构** | `03_卡木/木根/网站逆向分析/参考资料/存客宝技术架构.md` | WebSocket/风控/分发算法 |
| **系统架构** | `存客宝备份/cunkebao_doc/2、架构/系统架构.md` | 5端+3服务架构图 |
| **核心业务链路** | `存客宝备份/cunkebao_doc/2、架构/核心业务链路.md` | 建群/群发/朋友圈流程 |
| **数据库** | `存客宝备份/cunkebao_doc/2、架构/数据库.md` | 数据库连接信息 |
| **对外 API 文档** | `存客宝备份/cunkebao_v3/Server/public/doc/api_v1.md` | 线索上报接口完整文档 |
| **数据库列表** | `存客宝备份/cunkebao_v3/Moncter/数据库列表.md` | 25 个 KR 数据库清单 |
| **服务器脚本** | `金仓_存储备份/服务器管理/scripts/存客宝_*.sh/.py` | 部署/安全/清理/诊断脚本 |
| **Apifox 在线文档** | [链接](https://s.apifox.cn/5989e076-dca9-4345-9025-f6f9a698d1f3) | Apifox 项目 #6037107 |

---

## 依赖（Dependencies）

- **前置技能**：服务器管理（G07）、数据库管理（G13/G17）
- **联动技能**：全栈开发（F01）、Vercel 部署（G19）、代码修复（F05）
- **外部工具**：php、composer、node、nginx、mysql、mongodb、redis
- **服务器**：存客宝腾讯云服务器（宝塔面板管理）

---

## 快速调用示例

### 登录获取 Token

```bash
curl -X POST https://ckbapi.quwanzhi.com/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"account":"13800138000","password":"123456","typeId":1}'
```

### 获取设备列表

```bash
curl -X GET "https://ckbapi.quwanzhi.com/v1/devices?page=1&limit=20" \
  -H "Authorization: Bearer {token}"
```

### 上报线索（对外接口）

```python
from ckb_client import CunKeBaoClient  # 见对接规范
ckb = CunKeBaoClient(api_key='YOUR_KEY')
ckb.report_lead(phone='13800000000', name='张三', source='抖音')
```
