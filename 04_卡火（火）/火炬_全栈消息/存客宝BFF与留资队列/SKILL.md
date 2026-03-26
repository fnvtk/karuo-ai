---
name: 存客宝BFF与留资队列
description: 小程序只打自家 BFF；POST /api/miniprogram/ckb/lead；ckb_lead_records 队列表、push_status 与重试 cron；getCkbLeadApiKey 优先级；与 persons/target_person_id、source 归因；开放 API 细节归 G15。
triggers: 存客宝留资、ckb/lead、submitCkbLead、soulBridge、留资队列、ckb_lead_records、retry-ckb-leads、push_status、链接卡若、article_mention、index_lead
owner: 火炬
group: 火
version: "1.0"
updated: "2026-03-26"
---

# 存客宝BFF与留资队列

> **参考实现**：永平 `miniprogram/utils/soulBridge.js`（`submitCkbLead`）、`soul-api/internal/handler/ckb.go`（`CKBLead`、`getCkbLeadApiKey`、`RetryFailedCkbLeads`）、`internal/model/ckb_lead.go`、`router` 中 `miniprogram.POST("/ckb/lead")` 与 `cron` 的 `retry-ckb-leads`。  
> **边界**：存客宝 **开放 API、设备、计划全表** 见金组 **G15**；本节仅 **BFF 编排 + 本地队列表 + 重试**。  
> **协同**：`#linkTag` 的 `tagType==='ckb'` 见 **F23**；超级个体获客统计见 **F26**。

## 一、业务目标

- C 端 **不直连** 存客宝公网 API（避免密钥暴露在小程序包与前端）。  
- 每次留资 **先落库**（可追溯、可重试、可运营导出），再异步或同步推送 CKB。  
- 推送失败可 **cron 批量重试**，并记录 `ckb_error`。

## 二、小程序桥：`submitCkbLead`

**文件**：`miniprogram/utils/soulBridge.js`

**前置校验**（顺序重要）：

1. `targetUserId` 与 `targetMemberId` **至少其一**（文章 `@` 用 user；会员详情无 token 时用 memberId 走全局计划）。  
2. 已登录；否则 Modal 引导去「我的」。  
3. 手机号：本地 `userInfo` / `profile` 拉取 / storage；须 `1[3-9]\\d{9}`。  
4. 可选 `wechatId` 一并提交。

**请求**：

- `POST /api/miniprogram/ckb/lead`  
- Body 字段（与后端对齐）：`userId`（当前用户）、`phone`、`wechatId`、`name`、`targetUserId`、`targetNickname`、`targetMemberId`、`targetMemberName`、`source`

**成功反馈**：若返回 `skipped` / `alreadySubmitted`，Toast「无需重复提交」类文案，并仍可 `setStorageSync('lead_last_submit_ts', ...)`。

## 三、后端：`CKBLead` 要点

**路由**：`POST /api/miniprogram/ckb/lead`（仅 miniprogram 组）

**典型分支**（语义级，以仓库为准）：

- 解析 `targetUserId` → 查 `persons`，得到 `target_person_id` 与对应 CKB **plan/apiKey**（或走 **共享计划** `super_individual_shared_plan`）。  
- **无 targetUserId**（如首页「链接卡若」）：用 `getCkbLeadApiKey()` 全局 key。  
- **幂等**：同一 `userId + source` 或业务定义的唯一键，可返回 `skipped: true`。  
- 创建 `CkbLeadRecord`：`push_status=pending`，填 `params` JSON，再调 CKB HTTP；成功 `success`，失败 `failed` + `ckb_error`。

## 四、`getCkbLeadApiKey` 优先级（永平实现注释）

1. `system_config` / `site_settings` 中的 `ckbLeadApiKey`  
2. 环境变量 `CKB_LEAD_API_KEY`  
3. 代码内兜底（若有，生产应禁用）

## 五、表 `ckb_lead_records`（模型字段摘要）

| 字段 | 用途 |
|:---|:---|
| `user_id` | 留资用户（访客） |
| `target_person_id` | 被链接的人物，**F26 leadCount** 关联用 |
| `source` | `article_mention`、`index_link_button`、`index_lead` 等 |
| `params` | 原始 JSON 备查 |
| `push_status` | `pending` / `success` / `failed` |
| `retry_count`、`next_retry_at`、`last_push_at` | 重试调度 |
| `ckb_error` | 最近一次错误摘要 |

## 六、Cron 与运营

- **`/api/cron/retry-ckb-leads`**：`RetryFailedCkbLeads`，限制条数，避免一次打满。  
- 管理端列表 / 单条重试：见 `db_ckb_leads.go` 等。  
- 可选 Webhook：`ckb_lead_webhook_url`（若有配置）。

## 七、Gotchas（≥10）

1. **未登录提交**：必须挡在桥里，避免匿名脏数据。  
2. **手机号正则**：与 profile 不同步时先拉 `/user/profile`。  
3. **target 双轨**：`targetUserId` 与 `targetMemberId` 后端解析路径不同，勿混测。  
4. **person 不存在**：应明确错误，勿静默丢单。  
5. **共享 plan 未配**：超级个体链路会整段失败，需监控。  
6. **重复提交**：产品要定义「同用户同人物同 source」是否允许多条。  
7. **push 超时**：须落 `failed` 而非无限 pending。  
8. **cron 鉴权**：`/api/cron/*` 须密钥或内网，防公网刷。  
9. **PII 日志**：phone 不全量打 access log。  
10. **与 F23 ckb 标签**：两处入口应共用 `CKBLead`，避免一套写表一套漏写。  
11. **G15 变更**：CKB 接口字段升级时先改 BFF 再改小程序展示字段。

## 八、验收清单

- [ ] `@mention`、会员详情、首页按钮三条路径各通一条  
- [ ] 失败记录 cron 可恢复为 success  
- [ ] `target_person_id` 正确时 F26 `leadCount` 可增长  
- [ ] 密钥只存在于服务端配置  

## 九、互指

- **F23** `linkTag` / `tagType==='ckb'`  
- **F26** `COUNT(DISTINCT l.user_id)` 获客口径  
- **G15** 存客宝开放 API  
- **F01 §1.10** 留资按钮若同时 `trackClick`，字段语义与 lead 表分开  
