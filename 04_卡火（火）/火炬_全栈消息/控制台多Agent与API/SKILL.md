# 控制台多 Agent 与 API（间名 **枢门 Agent**）

> **成员**：火炬（卡火）  
> **触发词**：**控制台 Agent、多 Agent API、agent chat、L0 工具、/api/agent/chat、karuo-agent、工具循环、list_skills 工具**  
> **真源代码**：卡若ai网站 `site/src/lib/agent-*.ts`、`site/src/app/api/agent/chat/route.ts`  
> **架构说明**：卡若ai网站 `开发文档/2、架构/Agent与三入口架构.md`

## 何时使用

- 要在 **官网/控制台体系** 内做「模型 + 多轮工具」而非单次补全。
- 要从 **CLI 或 HTTP** 调用与 Web 同一套 Agent 状态（Mongo `agent_sessions`）。

## 能力边界（当前）

- **已上线 L0**：只读工具 `list_skills`、`list_workflows`；`fetch_allowed_url` 仅当服务端设置 `KARUO_AGENT_FETCH_ALLOWLIST`（主机白名单，逗号分隔）。
- **鉴权**：`POST /api/agent/chat` 使用网关 Key（CLI/外部）；**控制台对话**走 `POST /api/chat/sessions/:id/agent`，服务端读库调网关，**无需**浏览器传 Key。
- **控制台 UI**：`ChatPanel` 输入区上方勾选 **Agent L0**（`localStorage` 记忆）；有附件时自动仍走流式。
- **斜杠（仅控制台，首行解析）**：`/help`、`/agent on|off|reset|status`、`/skill list`、`/workflow list`；与附件同条发送会提示先移除附件。见 `site/src/lib/console-slash-commands.ts`。
- **未做**：L1 写操作、L2 OpenClaw/exec、工具批准卡片、Coordinator、MCP、Agent SSE、Todo UI。

## CLI

```bash
# 配置一次：~/.karuo/agent.json 写入 baseUrl、apiKey
node /path/to/卡若ai网站/site/scripts/karuo-agent.mjs config https://你的域名 你的网关Key

node .../karuo-agent.mjs chat "当前有哪些技能？"
```

## 与 OpenClaw / Claude Code

- **OpenClaw（龙虾）**：仍走现有 `gateway-router` 与 `gw-openclaw-amiao`；Agent 层不替代网关，仅在上游选模型时可能命中 OpenClaw。**exec 高危** 见 `运营中枢/工作台/阿猫Mac_OpenClaw配置情况分析.md`。
- **Claude Code**：行为对标「工具循环 + Coordinator」路线图；**禁止**将 source map 还原源码 vendoring 进产物。

## 里程碑文档

每合并功能：勾选 `卡若ai网站/开发文档/10、项目管理/里程碑-文档-SKILL同步检查表.md`。
