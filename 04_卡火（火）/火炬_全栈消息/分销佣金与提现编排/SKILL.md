---
name: 分销佣金与提现编排
description: 订单支付成功写佣金、inviter 校验、管理端提现审核、自动打款开关 enableAutoWithdraw、余额与流水；可复用到任意「推广员+订单」分佣系统。
triggers: 分销、佣金、分佣、提现、withdraw、推广员佣金、enableAutoWithdraw、审核提现、打款、分销订单
owner: 火炬
group: 火
version: "1.0"
updated: "2026-03-26"
---

# 分销佣金与提现编排

> **参考实现**：永平 `soul-api/internal/handler/withdraw.go`、`admin_withdrawals.go`、订单支付回调中与 `inviter_id` / 佣金写入相关逻辑；配置键与 **推广** 共用 `referral_config` 部分字段。  
> **前置**：推广员归属见 **《推广邀请与三十日绑定》**（F24）。

## 一、业务目标

- 订单 **支付成功** 且存在有效 `inviter_id` 时，按规则计入 **推广员可提现余额**（或冻结态，视产品）。  
- 推广员发起提现 → 管理端 **待审核 → 已通过/已拒绝**；可选 **自动打款**（`enableAutoWithdraw`）。

## 二、旅程（推广员侧）

1. 小程序「我的」→ 佣金/余额入口（若有）。  
2. 查看可提现金额、流水列表。  
3. 提交提现申请（金额、账户信息，字段以实际表为准）。  
4. 轮询或消息通知审核结果。

## 三、旅程（管理端）

1. 提现列表：筛选状态、时间、用户。  
2. 单条 **通过**：扣减冻结/余额，标记已打款或进入打款队列。  
3. **拒绝**：解冻、写拒绝原因。  
4. 若 `enableAutoWithdraw`：支付成功或审核通过后走自动打款适配器（微信企业付款/第三方）。

## 四、API 概要

| 区域 | 路径示例 | 说明 |
|:---|:---|:---|
| 小程序 | `GET /api/miniprogram/withdraw/balance` | 余额与汇总 |
| 小程序 | `POST /api/miniprogram/withdraw/apply` | 申请提现 |
| 小程序 | `GET /api/miniprogram/withdraw/records` | 流水 |
| 管理端 | `GET /api/admin/withdrawals` | 列表 |
| 管理端 | `POST /api/admin/withdrawals/:id/approve` | 通过 |
| 管理端 | `POST /api/admin/withdrawals/:id/reject` | 拒绝 |

（具体路径以仓库 `route` 为准，迁移时整组替换前缀。）

## 五、配置键（`referral_config` 中与分佣相关）

| 键 | 含义 |
|:---|:---|
| `commissionRate` | 佣金比例或分档规则引用 |
| `enableAutoWithdraw` | 是否自动打款 |
| `minWithdrawAmount` | 最低提现额 |
| `withdrawFeeRate` | 手续费（若有） |

**与 F24 的键**（`enabled`、`bindWindowDays` 等）同存一个 JSON 时，**版本迁移**要小心合并策略。

## 六、订单入账要点

- **触发点**：仅 **支付成功回调**（或等价确认事件），禁止下单即入账。  
- **inviter_id**：从 **ReferralBinding** 或订单快照读取；若订单已存 `inviter_id` 以订单为准防后续解绑纠纷。  
- **重复回调**：佣金写入须 **幂等**（`order_id` 唯一约束）。

## 七、Gotchas（≥10）

1. **解绑后旧订单**：已发生佣金的订单不应回滚，除非法务要求（需产品决策）。  
2. **部分退款**：是否冲减佣金、如何冲减需单独规则。  
3. **自动打款失败**：须有 **重试队列** 与 **人工兜底** 状态。  
4. **余额不足提现**：服务端二次校验，禁止前端算准即可信。  
5. **并发提现**：同一用户同时多笔 apply → 行锁或事务串行化。  
6. **审核通过重复点击**：`approve` 接口幂等。  
7. **黑名单用户**：仍可提现还是冻结，与 F24 黑名单联动。  
8. **税率/发票**：若涉及，字段与审核流单独扩展，勿硬编码在 handler。  
9. **测试环境打款**：切 sandbox key，禁止对真实 openid 打款。  
10. **日志**：打款凭证号、失败原因落库，不全量打用户银行卡号。  
11. **enableAutoWithdraw 与人工审核**：并存时定义优先级（先自动再人工 / 仅自动等）。

## 八、验收清单

- [ ] 支付成功幂等入账  
- [ ] 无 inviter 订单不产生佣金  
- [ ] 提现申请、审核、拒绝全链路  
- [ ] 自动打款开关切换后行为符合配置  
- [ ] 关键金额字段服务端校验  

## 九、互指

- **F24** 推广绑定与窗口  
- **F26** 超级个体与「链接人」统计 **不等同** 于分佣，勿混表  
