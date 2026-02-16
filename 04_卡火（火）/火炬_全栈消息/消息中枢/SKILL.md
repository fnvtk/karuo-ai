---
name: 消息中枢
description: 多通道消息整合 AI 助手平台。使用本技能当需要：(1) 整合多通道消息（WhatsApp/Telegram/Slack/Discord/iMessage 等）(2) 搭建本地 Gateway 控制平面 (3) 开发自定义 Skills 技能 (4) 实现浏览器自动化 (5) 构建语音交互助手 (6) 跨设备 AI 节点控制
---

# 消息中枢

## 概述

Moltbot（原 Clawdbot）是一个**个人 AI 助手平台**，你可以在自己的设备上运行，通过你已经使用的通道（WhatsApp、Telegram、Slack、Discord 等）与你交互。

**核心理念**：本地优先、单用户、快速响应、始终在线。

## 源代码位置

```
/Users/karuo/Documents/开发/4、小工具/clawdbot/
```

## 核心架构

```
WhatsApp / Telegram / Slack / Discord / Signal / iMessage / WebChat
               │
               ▼
┌───────────────────────────────────┐
│            Gateway                │
│       (WebSocket 控制平面)         │
│     ws://127.0.0.1:18789          │
└──────────────┬────────────────────┘
               │
               ├─ Pi Agent (RPC 调用)
               ├─ CLI (moltbot ...)
               ├─ WebChat UI
               ├─ macOS App
               └─ iOS / Android Nodes
```

## 关键能力

### 1. 多通道消息整合

支持 15+ 消息通道：
- **核心通道**：WhatsApp、Telegram、Slack、Discord、Google Chat、Signal、iMessage
- **扩展通道**：Microsoft Teams、Matrix、Zalo、BlueBubbles、WebChat

### 2. Gateway 控制平面

本地运行的 WebSocket 服务器，统一管理：
- 会话（Sessions）
- 通道（Channels）
- 工具（Tools）
- 事件（Events）
- 定时任务（Cron）

### 3. Skills 技能系统

可扩展的模块化能力系统：
```
skills/
├── SKILL.md          # 必需：技能定义
├── scripts/          # 可选：可执行脚本
├── references/       # 可选：参考文档
└── assets/           # 可选：资源文件
```

### 4. 浏览器控制

CDP 控制 Chrome/Chromium：
- 快照（Snapshots）
- 操作（Actions）
- 上传（Uploads）
- 配置文件（Profiles）

### 5. Canvas 可视化工作区

A2UI - Agent 驱动的可视化界面：
- 推送/重置内容
- Eval 执行
- 快照捕获

### 6. 语音交互

- **Voice Wake**：始终在线语音唤醒
- **Talk Mode**：连续对话模式
- 支持 macOS/iOS/Android

### 7. 跨设备节点系统

通过 `node.invoke` 执行设备本地操作：
- `system.run` - 运行本地命令
- `system.notify` - 发送通知
- `camera.*` - 相机控制
- `screen.record` - 屏幕录制
- `location.get` - 位置获取

## 技术栈

| 层级 | 技术 |
|:---|:---|
| 语言 | TypeScript (ESM) |
| 运行时 | Node.js 22+ |
| 包管理 | pnpm / bun |
| 测试 | Vitest |
| 格式化 | Oxlint / Oxfmt |
| 构建 | tsc |

## 快速开始

### 安装

```bash
# 全局安装
npm install -g moltbot@latest
# 或
pnpm add -g moltbot@latest

# 引导安装
moltbot onboard --install-daemon
```

### 启动 Gateway

```bash
moltbot gateway --port 18789 --verbose
```

### 发送消息

```bash
moltbot message send --to +1234567890 --message "Hello from Moltbot"
```

### 调用 Agent

```bash
moltbot agent --message "Ship checklist" --thinking high
```

## 配置文件

位置：`~/.clawdbot/moltbot.json`

```json5
{
  agent: {
    model: "anthropic/claude-opus-4-5"
  },
  channels: {
    whatsapp: {
      allowFrom: ["+86xxxxxxxxxx"]
    },
    telegram: {
      botToken: "YOUR_BOT_TOKEN"
    },
    discord: {
      token: "YOUR_DISCORD_TOKEN"
    }
  }
}
```

## 聊天命令

在 WhatsApp/Telegram/Slack 等通道中发送：

| 命令 | 功能 |
|:---|:---|
| `/status` | 查看会话状态 |
| `/new` 或 `/reset` | 重置会话 |
| `/compact` | 压缩会话上下文 |
| `/think <level>` | 设置思考级别（off/minimal/low/medium/high/xhigh） |
| `/verbose on/off` | 开关详细模式 |
| `/usage off/tokens/full` | 设置用量显示 |

## Skills 开发指南

### SKILL.md 结构

```markdown
---
name: my-skill
description: 技能描述。用于触发判断，需要清晰说明何时使用此技能。
---

# 技能名称

## 用法
...

## 示例
...
```

### 渐进式加载

1. **元数据（name + description）** - 始终在上下文中（~100字）
2. **SKILL.md 正文** - 技能触发时加载（<5k字）
3. **资源文件** - 按需加载

## 目录结构

```
src/
├── agents/       # Agent 运行时
├── channels/     # 通道适配器
├── cli/          # CLI 命令
├── gateway/      # Gateway 核心
├── browser/      # 浏览器控制
├── memory/       # 记忆/嵌入
├── media/        # 媒体处理
├── telegram/     # Telegram 集成
├── discord/      # Discord 集成
├── slack/        # Slack 集成
└── ...
```

## 安全模型

- **默认**：工具在宿主机上为 main 会话运行
- **沙箱模式**：非 main 会话在 Docker 沙箱中运行
- **DM 配对**：未知发送者需要配对码验证

## 常用开发命令

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm gateway:watch

# 类型检查/构建
pnpm build

# 格式化/检查
pnpm lint && pnpm format

# 测试
pnpm test

# macOS 打包
scripts/package-mac-app.sh
```

## 调试技巧

```bash
# 运行诊断
moltbot doctor

# 查看通道状态
moltbot channels status --probe

# 查看日志
tail -n 120 /tmp/moltbot-gateway.log

# macOS 统一日志
./scripts/clawlog.sh
```

## 相关文档

- [官方文档](https://docs.molt.bot)
- [架构概述](https://docs.molt.bot/concepts/architecture)
- [配置参考](https://docs.molt.bot/gateway/configuration)
- [Skills 指南](https://docs.molt.bot/tools/skills)
- [安全指南](https://docs.molt.bot/gateway/security)

## 扩展阅读

详细参考文档见 `references/` 目录：
- `架构详解.md` - 完整架构说明
- `skills开发指南.md` - Skills 开发详细指南
- `通道配置.md` - 各通道配置说明
- `CLI命令速查.md` - CLI 命令速查表
