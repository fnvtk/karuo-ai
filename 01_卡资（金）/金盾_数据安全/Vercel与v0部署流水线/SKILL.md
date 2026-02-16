---
name: Vercel与v0部署流水线
description: 负责部署到 Vercel 的对接（主要是前端界面）；v0 优化完成后同步到 GitHub、Vercel、本地协同，确保全部确定；任务完成反馈写入项目并反馈卡若。项目/对话名中文。
triggers: Vercel部署/v0部署/部署到v0/上帝之眼部署/Vercel v0/威宁 v0/部署流水线
owner: 金盾
group: 金
version: "1.0"
updated: "2026-02-16"
---

> **执行规则**：见 `运营中枢/技能路由/SKILL_RULES.md`。执行前必须：思考→拆解→读取本 Skill 与 references→按步执行→校验 v0 项目正确→**执行完成后将结果反馈给卡若**。

## 一、技能概述

| 属性 | 内容 |
|:---|:---|
| **负责人** | 金盾（金） |
| **职责** | **部署到 Vercel 的对接（主要是前端界面）**；Vercel 部署 + v0 项目/对话整条流水线；**v0 优化完成后同步到 GitHub、Vercel、本地协同，确保全部确定** |
| **承接** | 以后「部署到 v0」一律走本链路 |
| **前提** | 先确保 v0 项目、项目页正确，再做其它优化 |
| **命名** | v0 **项目名**与**对话名**均使用**中文**（如项目「上帝之眼」、对话「前端优化计划」），不得使用英文项目/对话名 |
| **本地前端位置** | **固定为 项目根/frontend**，不要搞错；v0 改完代码落回此处再同步 |
| **反馈** | 执行完成后将结果**反馈给卡若**；**做完任务同步后更新「同步与反馈记录」**（开发文档/8、部署/同步与反馈记录.md），项目状态可查 |
| **开发文档** | `开发文档/00_汇总索引.md`：功能迭代、需求、汇总入口 |

---

## 二、完整链路（顺序不可颠倒）

```
1. 凭证就绪 → 2. Vercel 部署 → 3. 校验线上可访问 → 4. v0 创建/关联 → 5. 校验 v0 项目正确
```

| 步骤 | 动作 | 脚本/接口 | 凭证 |
|:---|:---|:---|:---|
| 1 | 确认 .env 有 VERCEL_TOKEN、V0_API_KEY | 可从 账号与API索引 § Vercel、§ v0.dev 取 | 金盾 |
| 2 | 部署到 Vercel（创建项目/设生产公开/触发部署） | `上帝之眼/scripts/deploy-vercel.js` | VERCEL_TOKEN |
| 3 | 校验生产 URL 可访问 | 脚本内 fetch godeye-lime.vercel.app | - |
| 4 | 在 v0 上创建或关联「上帝之眼」项目 | `上帝之眼/scripts/sync-to-v0.js` | V0_API_KEY |
| 5 | 校验 v0 项目 id/name/webUrl/vercelProjectId | GET /v1/projects 或 references 内校验命令 | V0_API_KEY |
| 6 | 打开/创建「前端优化」对话（先检查再创建，中文名） | `scripts/create-v0-optimization-chat.js` [--open] | V0_API_KEY |
| 7 | 整理多条对话：保留最完善 1 条、改中文名、删其余并反馈 | `scripts/consolidate-v0-chats.js` | V0_API_KEY |
| 8 | v0 优化后同步 GitHub → Vercel → 本地拉齐，并写入任务反馈 | `scripts/sync-after-v0.js` [备注] | VERCEL_TOKEN |

---

## 三、执行命令（上帝之眼项目）

```bash
cd "/Users/karuo/Documents/开发/3、自营项目/上帝之眼"
node scripts/deploy-vercel.js
node scripts/sync-to-v0.js
```

- 若 v0 已有关联项目，sync-to-v0 会直接提示已关联并输出 webUrl。
- 执行后必须做**步骤 5**：确认 v0 项目页、名称、vercelProjectId 正确。
- **在 v0 里做前端优化对话**：运行 `node scripts/create-v0-optimization-chat.js [--open]`。脚本会**先检查**项目下是否已有「前端优化计划」对话，有则直接返回链接（不循环创建），无则新建且使用**中文名称**；打开后按对话内首条消息执行优化。
- **v0 优化完成后同步（丝滑一条龙）**：代码落回**本地 frontend**（位置固定：项目根/frontend）→ 运行 `node scripts/sync-after-v0.js "本次说明"` → 自动 push GitHub、触发 Vercel、本地 pull 拉齐 → 结果写入 `开发文档/8、部署/同步与反馈记录.md`，做完任务即反馈到项目。

---

## 四、关键路径与 ID（上帝之眼）

| 项 | 值 |
|:---|:---|
| Vercel 项目 ID | prj_7Icpm7qR1hc6X61ydY1bzxAsjLVz |
| 生产地址 | https://godeye-lime.vercel.app |
| v0 项目页 | https://v0.app/chat/projects/MvSR6KzOHAn |
| **本地前端目录（固定）** | 项目根/frontend（勿搞错） |
| 同步与反馈记录 | 上帝之眼 `开发文档/8、部署/同步与反馈记录.md` |
| 完整流程与问题 | 本目录 `references/完整流程与问题手册.md` |
| Token 管理 | 金盾 `账号密码与资料管理/Vercel_Token管理与API部署.md` |

---

## 五、常见问题（速查）

| 现象 | 处理 |
|:---|:---|
| 未设置 VERCEL_TOKEN / V0_API_KEY | 从 账号与API索引 取并写入 上帝之眼/.env |
| Vercel 创建项目失败 / Git | 在 Vercel 后台用 GitHub 连接仓库（一次性） |
| 预览/生产需登录 | 脚本已设 ssoProtection 为 preview；仍异常则检查项目设置 |
| v0 401 | 确认 V0_API_KEY 为 v0 Platform API Key 或索引中 v0 Secret |

详细列表与校验命令见 **references/完整流程与问题手册.md**。

---

## 六、协同与反馈

- **火眸**：上帝之眼业务与前端；需部署到 v0 时由本 Skill 承接，金盾执行脚本或指导执行。
- **账号与API索引**：VercEL_TOKEN、V0_API_KEY 由金盾维护，部署前从索引或 .env 确认。
- **结果反馈**：每次执行部署/同步/整理 v0 对话后，将结果汇总反馈给卡若；**v0 优化后执行 sync-after-v0 的，结果自动写入项目内「同步与反馈记录」**，确保整个项目协同、确定、可查。
