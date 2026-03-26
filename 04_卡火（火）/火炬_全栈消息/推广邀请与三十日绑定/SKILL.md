---
name: 推广邀请与三十日绑定
description: scene 解析、ReferralVisit 幂等、ReferralBinding 三十日首绑、邀请码与推广员归属、管理端开关与统计；可复用到任意带 scene 的小程序 + Gin/GORM。
triggers: 推广、邀请、邀请码、referral、scene、1001、首绑、三十日、30天、绑定推广员、推广开关、ReferralVisit、ReferralBinding
owner: 火炬
group: 火
version: "1.0"
updated: "2026-03-26"
---

# 推广邀请与三十日绑定

> **参考实现**：永平 `soul-api/internal/handler/referral.go`、`soul-api/internal/handler/db.go`（`referral_config`、模型 `ReferralVisit` / `ReferralBinding`）。  
> **协同**：佣金结算与提现见 **《分销佣金与提现编排》**（F25）；管理端开关与配置键本节列全。

## 一、业务目标

- 新用户通过带 **邀请码** 的入口进入小程序后，在 **30 天自然日窗口** 内首次完成有效行为时，将 **推广员（inviter）** 写入绑定表；窗口外或已绑定则不再改归属。  
- **访问留痕**与**绑定**分离：同一用户可多次访问，绑定只发生一次（首绑）。

## 二、旅程

1. 小程序 `onLaunch` / `onShow` 解析 `options.scene`（或等价入口参数）。  
2. 若 scene 为 **1001**（或产品约定的「直开」码）→ 不调推广接口，避免误绑。  
3. 否则提取 `inviteCode`，`POST` 记录访问（可带 `deviceId` 防刷）。  
4. 用户完成「可触发绑定」的动作（如注册成功、首次登录）→ `POST` 绑定；服务端校验 **30 日窗口** 与 **是否已有绑定**。

## 三、后端 API（命名与永平对齐，可迁移时改名）

| 方法路径 | 作用 |
|:---|:---|
| `POST /api/miniprogram/referral/visit` | 记录访问；scene=1001 直接 success 不写字段 |
| `POST /api/miniprogram/referral/bind` | 首绑推广员；需登录态 |
| `GET /api/miniprogram/referral/status` | 当前用户是否已绑、inviter 信息等 |
| `GET /api/admin/referral/list` | 管理端绑定列表 |
| `GET /api/admin/referral/visits` | 访问记录 |
| `GET/PUT /api/admin/referral/config` | 开关与参数 |

## 四、配置键 `referral_config`（JSON）

| 键 | 含义 |
|:---|:---|
| `enabled` | 总开关 |
| `bindWindowDays` | 绑定窗口天数，默认 **30** |
| `requirePhone` | 是否要求绑定手机号才算有效用户 |
| `minRegisterSeconds` | 注册后至少 N 秒才可绑（防脚本） |
| `blacklistUserIDs` | 不参与推广的用户 ID 列表 |
| `blacklistPhones` | 手机号黑名单 |

**注意**：`enableAutoWithdraw` 等属 **分销提现**，见 F25，勿与本节混淆。

## 五、数据模型要点

**ReferralVisit**

- 建议唯一约束：`(user_id, visit_date)` 或 `(user_id, invite_code, visit_date)`，实现 **每日幂等**（同用户同日多次只一行）。  
- 字段常含：`invite_code`、`inviter_id`、`scene`、`channel`、`device_id`。

**ReferralBinding**

- `user_id` **唯一**：一个被推广用户只对应一条绑定。  
- `inviter_id`、`invite_code`、`bound_at`、可选 `first_visit_at` 用于审计。

## 六、scene 与 1001

- **1001**：微信场景值「发现栏小程序主入口」等直开，**不应**写入推广归因。  
- 其他 scene：按产品规则解析出自定义 `inviteCode`（可能嵌在 scene 字符串中）。

## 七、Gotchas（≥10）

1. **scene 解析失败**：静默跳过，避免把脏数据写入 `ReferralVisit`。  
2. **未登录调 bind**：须 401 或明确错误码，禁止用匿名 user_id=0 绑成功。  
3. **重复 bind**：第二次请求须 **幂等返回成功** 且不改 `inviter_id`。  
4. **窗口计算**：用 **自然日** 还是 **精确到秒** 需在 PRD 固定；代码与文档一致。  
5. **时区**：服务器 UTC vs 业务日切，统计「30 日」要对齐。  
6. **自邀**：`inviter_id == user_id` 必须拒绝。  
7. **黑名单**：在 bind 前校验 user 与 phone。  
8. **requirePhone**：用户未绑手机时 bind 应返回可理解文案。  
9. **刷 visit**：仅靠 user_id 不够时上 `deviceId` + 频控。  
10. **管理端关 enabled**：应 **停止新 bind**，旧绑定是否保留佣金由 F25 决定。  
11. **换 inviteCode**：若允许多次访问不同码，**首绑**以谁先满足窗口为准，须在界面说明。

## 八、验收清单

- [ ] 1001 不产生 visit 记录或明确 no-op  
- [ ] 首绑成功、重复绑幂等  
- [ ] 超窗 bind 拒绝且文案正确  
- [ ] 黑名单与自邀拦截  
- [ ] 管理端 config 热更新后新请求生效  

## 九、互指

- **F25** 分销佣金、提现、订单归因  
- **F26** 超级个体统计（与推广员体系可能交叉，勿重复计佣）  
- **F01 §1.10** 若要对邀请链路单独埋点，字段勿与 `referral_*` 混名  
