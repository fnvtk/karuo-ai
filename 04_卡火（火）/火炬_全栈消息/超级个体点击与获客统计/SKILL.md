---
name: 超级个体点击与获客统计
description: user_tracks 中「链接头像_」前缀、avatar_click/btn_click 兼容、persons 与 ckb_lead_records 去重获客数、VIP 列表聚合、super_individual_shared_plan、webhook 映射与 cron 同步；可复用到「人物卡片+留资归因」类小程序。
triggers: 超级个体、VIP卡片、链接头像、clickCount、leadCount、获客人数、vip-members、AdminSuperIndividualStats、super_individual_shared_plan、super_individual_webhook
owner: 火炬
group: 火
version: "1.0"
updated: "2026-03-26"
---

# 超级个体点击与获客统计

> **参考实现**：永平 `vip_members_admin.go`（`batchSuperIndividualClicks` / `batchSuperIndividualLeads`）、`admin_dashboard.go`（`AdminSuperIndividualStats`）、`db_person.go`（`super_individual_shared_plan`）、`cron.go`（`sync-vip-ckb-plans` 等）。  
> **边界**：**点击量 ≠ 留资人数**；通用埋点规范见 **《全栈开发》§1.10**。留资写入 CKB 见 **F27**。

## 一、业务目标

- 首页（或列表）展示 **VIP/超级个体** 卡片，用户点头像产生可聚合的 **点击次数**。  
- 用户通过该人物链路完成留资后，在管理端对该 **user_id（人物绑定用户）** 展示 **去重后的获客人数（leads）**。  
- 可选：按用户配置 **飞书 Webhook**，用于通知（键 `super_individual_webhook_map`）。

## 二、点击统计口径（与代码一致）

**表**：`user_tracks`

**条件**：

- `action IN ('avatar_click', 'btn_click')`（历史兼容 `btn_click`）  
- `target LIKE '链接头像_%'`（SQL 中 `_` 需转义为 `\_`）  
- **人物 user_id** = `SUBSTRING(target, 6)`（即去掉前缀「链接头像」共 5 个 UTF-8 字符后的子串——**以永平实现为准**，若产品改前缀须同步改 SQL 与小程序 `trackClick` 的 `target`）

**聚合**：按 `user_id` `COUNT(*)`。

参考 SQL（摘自实现）：

```sql
SELECT
  SUBSTRING(target, 6) AS user_id,
  COUNT(*) AS clicks
FROM user_tracks
WHERE action IN ('avatar_click', 'btn_click')
  AND target LIKE '链接头像\\_%'
  AND SUBSTRING(target, 6) IN (?)
GROUP BY user_id
```

## 三、获客（留资）人数口径

**表**：`persons` + `ckb_lead_records`

- `persons.user_id`：人物绑定的超级个体用户 ID。  
- `ckb_lead_records.target_person_id`：留资指向的人物 `person_id`。  
- **去重**：`COUNT(DISTINCT l.user_id)` — 同一访客多条留资只计 1。

```sql
SELECT p.user_id AS user_id, COUNT(DISTINCT l.user_id) AS leads
FROM persons p
INNER JOIN ckb_lead_records l ON l.target_person_id = p.person_id
WHERE p.user_id IN ?
GROUP BY p.user_id
```

## 四、管理端 / DB 接口

| 入口 | 作用 |
|:---|:---|
| `GET /api/db/vip-members` | VIP 列表 + `clickCount` + `leadCount` + `webhookUrl` |
| `PUT /api/db/vip-members/webhook` | 按 `userId` 写 webhook 映射 |
| `GET /api/admin/super-individual/stats` | 看板级汇总（实现见 `admin_dashboard.go`） |

## 五、配置键

| 键 | 说明 |
|:---|:---|
| `super_individual_shared_plan` | JSON：共用存客宝 **planId + apiKey**；新建人物时不为每人单独建计划（见 `createPersonWithSharedSuperIndividualPlan`） |
| `super_individual_webhook_map` | `userId -> webhookUrl` |

## 六、小程序侧约定

- 点头像必须调 `trackClick`，`target` 形如 **`链接头像_` + 人物对应 users.id**（与后端 `SUBSTRING` 规则一致）。  
- 若改用 `person_id`，须改后端 SQL，**禁止**只改一端。

## 七、Gotchas（≥10）

1. **前缀字符数**：「链接头像」占 5 个 rune，与 `SUBSTRING(target, 6)` 强绑定。  
2. **`btn_click` 噪声**：非头像按钮若误用同前缀，点击量会虚高。  
3. **留资未写 target_person_id**：`leadCount` 为 0，问题在 F27 链路。  
4. **person 未创建**：VIP 用户无 `persons` 行 → leads 永远 0。  
5. **DISTINCT l.user_id**：留资表 `user_id` 为空则不计入，需小程序登录态一致。  
6. **共享 plan 配错**：所有人写到同一计划或写入失败，cron 需监控。  
7. **Webhook URL**：校验 `http` 前缀；删除 key 时 map 需持久化更新。  
8. **列表 limit**：`vip-members` 默认 200、最大 500，排序与小程序 `VipMembers` 需一致。  
9. **与 F25 分佣**：超级个体 ≠ 推广员；佣金勿用 `clickCount` 推算。  
10. **看板与列表**：`AdminSuperIndividualStats` 与 `batchSuperIndividualLeads` 口径应保持一致，改一处同步改另一处。  
11. **迁移项目**：若表名或字段改名，优先封装 Raw SQL 到一处。

## 八、验收清单

- [ ] 真机点头像后 `user_tracks` 行符合 target 规范  
- [ ] `GET /api/db/vip-members` 中 click/lead 与 SQL 手工核对一致  
- [ ] 共享 plan 关闭时，新建人物行为符合产品（独立计划或报错）  
- [ ] Webhook 可增删改  

## 九、互指

- **F01 §1.10**：`trackClick` 字段与命名  
- **F27**：`ckb_lead_records` 写入、`POST /api/miniprogram/ckb/lead`  
- **G15**：存客宝开放 API  
