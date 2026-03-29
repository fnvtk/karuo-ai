---
name: 飞书开放平台与 Lark 生态索引
description: GitHub 与官方文档入口总表；飞书/Lark OpenAPI、CLI、SDK、MCP、OpenClaw 通道。触发词：飞书开放平台、Lark CLI、larksuite、飞书 GitHub、飞书 SDK、飞书 MCP、open.feishu、open.larksuite、舶栈通岸
triggers: 飞书开放平台、Lark CLI、lark cli、飞书 CLI、larksuite、飞书 GitHub、飞书 SDK、Lark SDK、飞书 MCP、open.feishu、open.larksuite、飞书官方仓库、飞书生态索引、舶栈通岸、飞书 OpenAPI
owner: 水桥
group: 水
version: "1.0"
updated: "2026-03-29"
memory_palace_path: 卡若记忆宫殿/水殿/水桥厢/舶栈通岸
memory_palace_slot: 外洋文档与 GitHub 仓库归栈；新能力先记入本索引再拆到具体脚本 Skill
---

# 飞书开放平台与 Lark 生态索引（舶栈通岸）

> **掌管人**：**水桥**（卡人 · 水组）。凡飞书/Lark **开放平台、GitHub 官方与社区仓库、CLI/SDK/MCP** 的新增学习与归档，**默认归本 Skill**；落地脚本、日志、妙记、JSON 块等仍分别走 **W07/W08/W16** 等子 Skill。  
> **间名**：**舶栈通岸** — 外港来船（仓库/文档）先靠栈清点，再分拨到各线。

---

## 一、官方文档（真源）

| 用途 | URL |
|:---|:---|
| 飞书开放平台（国内） | https://open.feishu.cn/ |
| Lark 开放平台（国际） | https://open.larksuite.com/ |
| 应用权限与事件订阅 | 以控制台内「开发者后台」为准，与上两项同源体系 |

---

## 二、GitHub 组织 `larksuite`（Lark Technologies，优先维护）

> 检索日期参考：2026-03；星标与更新以仓库页为准。

| 仓库 | 说明 | 卡若侧关联 |
|:---|:---|:---|
| [**larksuite/cli**](https://github.com/larksuite/cli) | **Lark/Feishu 官方 CLI**（Go）：Messenger、Docs、Base、Sheets、Calendar、Mail、Tasks、Meetings 等 **200+ 子命令**，含 **AI Agent Skills** 向场景 | 口述「**Lark CLI**」即指本仓库；装环境、拉接口清单、自动化运维可优先查 README / Releases |
| [**larksuite/node-sdk**](https://github.com/larksuite/node-sdk) | 官方 **Node/TS SDK**（npm `@larksuiteoapi/node-sdk`）：token 维护、加解密、类型提示 | 官网、Node 服务对接 OpenAPI |
| [**larksuite/oapi-sdk-python**](https://github.com/larksuite/oapi-sdk-python) | 官方 **Python SDK** | 卡若 Python 脚本、与现有 `feishu_*` 脚本同体系时可对照 |
| [**larksuite/oapi-sdk-go**](https://github.com/larksuite/oapi-sdk-go) | 官方 **Go SDK** | 后端 Go 服务 |
| [**larksuite/lark-openapi-mcp**](https://github.com/larksuite/lark-openapi-mcp) | 飞书 **OpenAPI MCP**（TypeScript） | Cursor / Agent 通过 MCP 调飞书能力 |
| [**larksuite/openclaw-lark**](https://github.com/larksuite/openclaw-lark) | **OpenClaw 飞书/Lark Channel 官方插件** | 与主仓库 **G16 远程环境 / OpenClaw**、龙猫通道联动 |
| [**larksuite/feishu**](https://github.com/larksuite/feishu) | 历史 **Python SDK**（仓库曾标记 archived，仅作考古） | **新项勿依赖**；以 `oapi-sdk-python` 为准 |
| 其余组织内仓库 | 在 https://github.com/larksuite 浏览 | 按需补登记到本节表下「增量记录」 |

---

## 三、社区常用（非官方但高频）

| 仓库 | 说明 |
|:---|:---|
| [go-lark/lark](https://github.com/go-lark/lark) | Go 社区 SDK，机器人/消息等场景有示例 |
| （组织内其它库） | 在 [github.com/larksuite](https://github.com/larksuite) 按关键词搜 `sdk`、`mcp`、`sample` |

---

## 四、卡若 AI 内已有飞书相关 Skill（勿重复造轮子）

| 编号 | 技能 | 路径 |
|:---|:---|:---|
| W07 | 飞书管理 | 同目录 `SKILL.md` |
| W08 | 智能纪要 | `../智能纪要/SKILL.md` |
| W16 | 飞书 JSON 格式 | `飞书JSON格式_SKILL.md` |
| W11 / W11a / W13 / W14 | 运营报表、素材库、Excel、卡猫复盘 | 同目录下各 `*_SKILL.md` |
| F01e | 开发五角色与飞书里程碑 | `04_卡火（火）/火炬_全栈消息/开发五角色与飞书里程碑/SKILL.md` |
| F02a | 艾叶 IM Bridge（含飞书通道） | `04_卡火（火）/火炬_全栈消息/艾叶/SKILL.md` |
| G16 | 远程环境一键部署（飞书+OpenClaw） | `01_卡资（金）/金盾_数据安全/远程环境一键部署/SKILL.md` |

**分工**：**本索引（W07a）** 只负责 **文档与仓库地图**；写日志、调 webhook、妙记下载、block JSON 等 **执行步骤** 仍打开上表对应 SKILL。

---

## 五、Agent 执行约定

1. 用户提到「飞书 GitHub、Lark CLI、官方 SDK、MCP、OpenClaw 飞书插件」→ **先读本文件**，再打开链接核对最新 README。  
2. 需要落地代码时 → 在 **水桥** 目录下建脚本或改现有 `飞书管理/脚本/*`，并在 **W07** 或专向 SKILL 中增加一行「参见 W07a」。  
3. 新增重要仓库或官方文档变更 → **更新本节表格** + `SKILL_REGISTRY` 触发词（必要时一行 changelog）。

---

## 六、增量记录（人工维护）

| 日期 | 变更 |
|:---|:---|
| 2026-03-29 | 初版：登记 `larksuite/cli`、node/python/go SDK、MCP、openclaw-lark；指定 **水桥** 为唯一掌管人。 |
