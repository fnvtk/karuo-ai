---
name: soul-party-project
description: >
  水岸·项目管理中枢（Cursor 入口）。统管卡若AI旗下所有独立项目，每个项目一个目录，
  含人设、技能映射、凭证、流程。当前管理项目：卡若创业派对。
  当用户提到 项目管理、水岸、项目总览、卡若创业派对、Soul运营、派对全流程、
  新建项目、管理项目 时自动激活。
---

# 水岸 · 项目管理中枢（Cursor 入口）

> **负责人**：水岸（卡人·水组）  
> **完整 SKILL**：`/Users/karuo/Documents/个人/卡若AI/02_卡人（水）/水岸_项目管理/SKILL.md`

## 交互默认（与卡若中枢一致）

- **零提问、直接做**：项目调度、派对运营、文档同步等，**禁止**反问「是否执行」；先读对应 `SKILL.md` / README → **直接落地**（命令、改文件、推飞书）。缺信息：查项目目录与配置；仅密钥/验证码/不可逆操作无法代劳时**一句**说明。
- 细则：`.cursor/rules/karuo-ai.mdc`；Soul 永平仓库另见 `.cursor/rules/soul-project-boundary.mdc`、`soul-karuo-dialogue.mdc`。

## 触发词

项目管理、水岸、项目总览、管理项目、新建项目、项目列表、项目进度、
卡若创业派对、Soul项目管理、派对全流程、Soul运营

## 使用方式

当触发词命中时，**必须先 Read 完整 SKILL.md**：

```
/Users/karuo/Documents/个人/卡若AI/02_卡人（水）/水岸_项目管理/SKILL.md
```

若涉及具体项目（如卡若创业派对），再读对应项目 README：

```
/Users/karuo/Documents/个人/卡若AI/02_卡人（水）/水岸_项目管理/卡若创业派对/README.md
```

## 当前项目清单

| # | 项目名 | 目录 | 状态 |
|:--|:---|:---|:---|
| P01 | 卡若创业派对 | `卡若创业派对/` | 🟢 运营中 |

## 水岸能力

- 跨组调度五行团队（金/水/木/火/土）所有成员的技能
- 每个项目独立目录，含人设、技能、凭证、流程
- 新建项目自动按模板生成 README.md
- 项目进度汇总与追踪

## 派对闭环 · 复盘发群（与 karuo-party 对齐）

当**卡若创业派对 / Soul 运营**相关任务形成**完整闭环**时：除在 Cursor 内用**卡若复盘五块**收尾外，应按永平仓库 **`.cursor/skills/karuo-party/SKILL.md` §九** 将同文推送到飞书群机器人（`msg_type: text` + `content.text`）；Webhook 用环境变量 **`FEISHU_PARTY_CLOSURE_WEBHOOK`**，勿把完整 hook 写入公开文档。
