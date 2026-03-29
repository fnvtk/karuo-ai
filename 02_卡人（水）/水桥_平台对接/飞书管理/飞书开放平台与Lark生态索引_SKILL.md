---
name: 飞书开放平台与 Lark 生态索引
description: Lark CLI 本机安装、19 Agent Skills、OpenAPI 与 GitHub 真源；卡若侧归栈。触发词：飞书开放平台、Lark CLI、lark-cli、卡罗维拉、舶栈通岸、安装飞书命令行
triggers: 飞书开放平台、Lark CLI、lark cli、飞书 CLI、larksuite、飞书 GitHub、飞书 SDK、Lark SDK、飞书 MCP、open.feishu、open.larksuite、飞书官方仓库、飞书生态索引、舶栈通岸、飞书 OpenAPI、卡罗维拉、安装 Lark CLI、lark-cli 安装、飞书命令行
owner: 水桥
group: 水
version: "1.1"
updated: "2026-03-29"
memory_palace_path: 卡若记忆宫殿/水殿/水桥厢/舶栈通岸
memory_palace_slot: Lark CLI 与官方 Agent Skills 已落本机；卡若文档吸收要点，执行命令对齐 README
---

# 飞书开放平台与 Lark 生态索引（舶栈通岸）

> **掌管人**：**水桥**。飞书/Lark **开放平台、CLI、官方 Agent Skills、SDK/MCP** 归本 Skill；写日志、妙记、JSON 块等仍走 **W07 / W08 / W16**。

---

## A. 本机安装（卡若 Mac · 已执行 2026-03-29）

```bash
# 1) CLI（全局）
npm install -g @larksuite/cli

# 2) 官方 19 个 Agent Skills → ~/.agents/skills/lark-*（含 Cursor symlink）
npx --yes skills add larksuite/cli -y -g
```

- **验证**：`lark-cli --version` → 当前 `1.0.0`（以本机为准）。  
- **首次使用（需浏览器）**：`lark-cli config init` 或 `lark-cli config init --new` → `lark-cli auth login --recommend` → `lark-cli auth status`。  
- **安全**：官方 README 强调 Agent 代操风险；私用机器人、慎改默认安全项。全文：<https://github.com/larksuite/cli/blob/main/README.md> 与中译 <https://github.com/larksuite/cli/blob/main/README.zh.md>。

### A.1 本机 Agent Skills 目录（与官方同步）

安装后技能位于 **`~/.agents/skills/`**，前缀均为 `lark-`（与 `npx skills` 输出一致）：

`lark-base`、`lark-calendar`、`lark-contact`、`lark-doc`、`lark-drive`、`lark-event`、`lark-im`、`lark-mail`、`lark-minutes`、`lark-openapi-explorer`、`lark-shared`、`lark-sheets`、`lark-skill-maker`、`lark-task`、`lark-vc`、`lark-whiteboard`、`lark-wiki`、`lark-workflow-meeting-summary`、`lark-workflow-standup-report`。

**说明**：Cursor / Codex 等会从上述目录加载；**卡若仓库**仍以本 `SKILL.md` 为 **五行体系内摘要**；细节以各目录内 `SKILL.md` 为准。

### A.2 官方 19 Skill 语义（吸收自上游 README）

| Skill ID | 用途摘要 |
|:---|:---|
| `lark-shared` | 应用配置、登录、身份切换、权限范围、安全规则（其它 Skill 常依赖） |
| `lark-calendar` | 日程、忙闲、时间建议 |
| `lark-im` | 消息收发、群、搜索、媒体、表情 |
| `lark-doc` | 云文档 Markdown 读写 |
| `lark-drive` | 云空间上传下载、权限、评论 |
| `lark-sheets` | 电子表格读写追加导出 |
| `lark-base` | 多维表格、字段、记录、视图、仪表盘 |
| `lark-task` | 任务与清单、子任务、提醒 |
| `lark-mail` | 邮箱浏览、收发、草稿 |
| `lark-contact` | 按姓名/邮箱/手机搜人、资料 |
| `lark-wiki` | 知识库空间与节点 |
| `lark-event` | 事件订阅 WebSocket、路由 |
| `lark-vc` | 会议记录、妙记类摘要/待办 |
| `lark-whiteboard` | 白板/图表 DSL |
| `lark-minutes` | 妙记元数据与 AI 产物 |
| `lark-openapi-explorer` | 从官方文档探索底层 API |
| `lark-skill-maker` | 自定义 Skill 框架 |
| `lark-workflow-meeting-summary` |  workflow：会议纪要汇总 |
| `lark-workflow-standup-report` | workflow：日程与待办汇总 |

### A.3 三层命令（吸收）

1. **快捷**：`+` 前缀，例 `lark-cli calendar +agenda`、`lark-cli im +messages-send --chat-id "oc_xxx" --text "Hello"`。  
2. **API 命令**：`lark-cli <域> <资源> <方法> --params '{...}'`。  
3. **裸 API**：`lark-cli api GET/POST /open-apis/...`。  
4. **常用 flag**：`--format json|pretty|table|ndjson|csv`、`--page-all`、`--dry-run`、`--as user|bot`。

---

## 一、官方文档（真源）

| 用途 | URL |
|:---|:---|
| 飞书开放平台 | https://open.feishu.cn/ |
| Lark 开放平台 | https://open.larksuite.com/ |

---

## 二、GitHub `larksuite` 核心仓库

| 仓库 | 说明 |
|:---|:---|
| [larksuite/cli](https://github.com/larksuite/cli) | **Lark CLI** + `skills/` 目录即上表 19 项来源 |
| [larksuite/node-sdk](https://github.com/larksuite/node-sdk) | Node SDK `@larksuiteoapi/node-sdk` |
| [larksuite/oapi-sdk-python](https://github.com/larksuite/oapi-sdk-python) | Python SDK |
| [larksuite/lark-openapi-mcp](https://github.com/larksuite/lark-openapi-mcp) | OpenAPI MCP |
| [larksuite/openclaw-lark](https://github.com/larksuite/openclaw-lark) | OpenClaw 飞书通道 |

---

## 三、卡若内其它飞书 Skill（执行仍走专向）

| 编号 | 技能 | 路径 |
|:---|:---|:---|
| W07 | 飞书管理 | 同目录 `SKILL.md` |
| W08 | 智能纪要 | `../智能纪要/SKILL.md` |
| W16 | 飞书 JSON | `飞书JSON格式_SKILL.md` |
| F01e / F02a / G16 | 里程碑、艾叶、OpenClaw 部署 | 见 SKILL_REGISTRY |

---

## 四、Agent 约定

1. 要装 CLI / 补技能：执行 **§A** 两条命令；已装则跳过。  
2. 要调飞书 API：优先 **`lark-cli`** + 官方 `~/.agents/skills/lark-*`；与现有 **Python `feishu_*` 脚本** 可并存，勿混用 token 文件前先看各脚本说明。  
3. 上游变更：改 README 或 skills 后，更新 **§A** 与 **增量记录**。

---

## 五、增量记录

| 日期 | 变更 |
|:---|:---|
| 2026-03-29 | 初版索引 + 指定水桥。 |
| 2026-03-29 | **本机安装** `@larksuite/cli`；`npx skills add larksuite/cli -g` 装入 19 项；**吸收** README 技能表与三层命令进本文。 |
