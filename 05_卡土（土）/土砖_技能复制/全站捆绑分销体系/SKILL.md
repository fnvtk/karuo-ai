---
name: 全站捆绑分销体系
description: 将「30天捆绑 + 全站消费分销」机制提取为可复用 SCALE，支持套用到其他网站/小程序。触发词：全站捆绑、30天捆绑、分销体系、消费捆绑、referral、复用到其他项目。
group: 土
triggers: 全站捆绑、30天捆绑、分销体系、消费捆绑、referral、复用到其他项目、捆绑机制、分销机制
owner: 土砖
version: "1.0"
updated: "2026-03-08"
---

# 全站捆绑分销体系

> **归属**：土砖（技能复制）  
> **来源**：一场soul的创业实验-永平 实战提炼  
> **用途**：可复用到任意有「全站消费 + 分销」需求的网站、小程序、付费内容项目。

---

## 能做什么（Capabilities）

- **提取**：从实战项目提炼 30 天捆绑 + 分销的完整规格（SCALE）
- **复用**：按 SCALE 快速套用到新项目（数据库、API、定时任务、提现）
- **查阅**：快速定位核心规则、表结构、接口逻辑、复用 checklist
- **打包**：本 Skill 已导出为基因胶囊，可 `unpack` 继承到其他 Agent/项目

---

## 怎么用（Usage）

**触发词**：全站捆绑、30天捆绑、分销体系、消费捆绑、referral、复用到其他项目、捆绑机制、分销机制

**典型场景**：
1. 「新项目要做分销，参考永平的 30 天捆绑机制」
2. 「帮我把分销体系做成可复用的 scale」
3. 「全站消费捆绑，类似 soul 那套，怎么设计」

---

## 核心规格（SCALE 摘要）

### 30 天捆绑规则

| 规则 | 说明 |
|:---|:---|
| 动态绑定 | 用户点击谁的链接即绑定谁，可随时切换 |
| 佣金归属 | 购买时佣金给当前绑定推荐人 |
| 30 天有效 | 绑定日起 30 天，同一推荐人再次点击可续期 |
| 自动解绑 | 30 天到期且无购买 → 自动解绑 |

### 关键表

- `referral_bindings`：referee_id、referrer_id、status(active/cancelled/expired)、expiry_date、purchase_count、total_commission
- `users`：referral_code、pending_earnings
- `orders`：referrer_id、referral_code

### 关键接口

- `POST /api/referral/bind`：绑定/切换/续期
- 下单时：先查 binding → 写 orders.referrer_id
- 支付回调：查 binding → 分佣（90%）→ 累加 purchase_count
- 定时任务：每天解绑 purchase_count=0 且过期的记录

---

## 执行步骤（Steps）

### 1. 查 SCALE 文档

**主文档**：`开发/3、自营项目/一场soul的创业实验-永平/开发文档/9、手册/全站捆绑分销体系-SCALE.md`

含：核心理念、数据库设计、API 逻辑、概念区分、提现流程、**复用 checklist**。

### 2. 套用到新项目

1. 按 SCALE 建表（referral_bindings、users/orders 扩展、withdrawals）
2. 配置 referral_config（分成比例、bindingDays、minWithdrawAmount）
3. 实现 bind 接口（动态切换 + 30 天）
4. 下单/支付逻辑：写 referrer_id、分佣、累加
5. 配置定时任务：每天解绑过期无购买
6. 前端：分享链接 ref=邀请码，登录后调 bind

### 3. 参考源项目文档

| 文档 | 路径 |
|:---|:---|
| 新分销逻辑设计方案 | 开发文档/8、部署/新分销逻辑设计方案.md |
| 邀请码分销规则说明 | 开发文档/8、部署/邀请码分销规则说明.md |
| 分销与绑定流程图 | 开发文档/8、部署/分销与绑定流程图.md |
| 分销提现流程图 | 开发文档/8、部署/分销提现流程图.md |

---

## 相关文件（Files）

| 文件 | 说明 |
|:---|:---|
| `开发/3、自营项目/一场soul的创业实验-永平/开发文档/9、手册/全站捆绑分销体系-SCALE.md` | 主 SCALE 文档 |
| `开发文档/8、部署/新分销逻辑设计方案.md` | 详细设计 |
| `开发文档/8、部署/分销与绑定流程图.md` | 流程图 |
| 基因胶囊 | `卡若Ai的文件夹/导出/基因胶囊/全站捆绑分销体系_*/` |

---

## 依赖（Dependencies）

- 前置技能：无
- 外部工具：无
- 源项目：一场soul的创业实验-永平（soul-api、miniprogram）

---

## 基因胶囊

本 Skill 已打包为基因胶囊，可 `unpack` 继承到其他 Agent 或项目：

```bash
cd /Users/karuo/Documents/个人/卡若AI
python3 "05_卡土（土）/土砖_技能复制/基因胶囊/脚本/gene_capsule.py" unpack 全站捆绑分销体系_*.json
```
