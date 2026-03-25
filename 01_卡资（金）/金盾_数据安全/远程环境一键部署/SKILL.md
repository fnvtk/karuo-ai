---
name: 远程环境一键部署
version: "3.0"
owner: 金盾
group: 金
triggers: [远程部署, 一键部署, 装Clash, 装Cursor, 装飞书, 装龙虾, OpenClaw部署, 飞书机器人部署, 飞书不回复, 龙猫不回复, 远程装环境]
updated: "2026-03-24"
description: 跨平台一键部署 Feishu + OpenClaw（龙虾），支持本地与远程；内置飞书不回复故障排查、自动验收与回滚。
---

# 远程环境一键部署

> 一句话说明：一键在 macOS / Linux / Windows 安装 Feishu + OpenClaw（龙虾），写入机器人配置并完成健康检查；支持本地部署与 SSH 远程部署。

---

## 能做什么（Capabilities）

- 跨平台安装：Feishu 客户端 + OpenClaw CLI
- 一键配置：写入 `~/.openclaw/openclaw.json` 的 Feishu 账号（`longmao`）
- 两种模式：本地执行 / SSH 远程执行
- 上线验证：`openclaw channels status --probe --json`
- 实发验收：向指定 Feishu 群或用户发送上线通知
- 回滚策略：保留配置备份，失败可恢复上一版
- 故障闭环：针对“飞书不回复/无会话窗口/机器人在线但无回包”自动定位并给出修复动作

---

## 怎么用（Usage）

触发词：远程部署、一键部署、装飞书、装龙虾、OpenClaw部署、飞书机器人部署。

---

## 执行步骤

### 1) 准备部署变量（必填）

统一使用环境变量，不在脚本里硬编码密钥：

- `FEISHU_APP_ID`
- `FEISHU_APP_SECRET`
- `OPENCLAW_MODEL_PROVIDER`（默认 `api123-icu`）
- `OPENCLAW_MODEL_ID`（默认 `claude-sonnet-4-5-20250929`）
- `OPENCLAW_BASE_URL`（如 `https://api123.icu`）
- `OPENCLAW_API_KEY`（模型 key）
- `OPENCLAW_GATEWAY_PORT`（默认 `18789`）
- `FEISHU_TARGET_CHAT_ID`（验收发消息目标，群或用户 ID）

### 2) 选择部署模式

- 本地：在目标机器直接执行 `package/deploy_*.sh|ps1`
- 远程：在控制机通过 SSH/WinRM 调用同一脚本

### 3) 执行部署脚本

- macOS：
  - `bash package/deploy_mac.sh`
- Linux：
  - `bash package/deploy_linux.sh`
- Windows（管理员 PowerShell）：
  - `powershell -ExecutionPolicy Bypass -File package/deploy_windows.ps1`

### 4) 自动验收（脚本内置）

脚本执行后必须至少通过两项：

- `openclaw channels status --probe --json` 中 `feishu.probe.ok=true`
- `openclaw message send` 实发成功（返回 `messageId`）

### 5) 不回复问题自动排查（内置 SOP）

按以下顺序检查，命中即修复：

1. `channels status --probe --json` 是否 `probe.ok=true`
2. `directory peers/groups list` 是否为空（为空通常是机器人不在任何会话）
3. 飞书开放平台是否已“创建版本并发布”
4. `事件与回调` 是否已订阅消息事件（`im.message.receive_v1`）
5. `权限管理` 是否具备读/发消息权限（至少 `im:message`, `im:message:send`）
6. `测试企业和人员` 是否覆盖当前测试人/群
7. 用 API 实测发消息，若返回 `230002`，说明机器人不在目标会话，需先拉机器人入群

---

## 标准流程（抽象版）

```
注册飞书应用
  ├─ 配置机器人能力 + 事件与回调
  ├─ 开通权限 (im:message:send 等) 并发布版本
  ├─ 记录 AppID/AppSecret
  └─ 导出部署变量(.env)

部署目标机器
  ├─ 安装 Feishu 客户端
  ├─ 安装 OpenClaw
  ├─ 生成/更新 ~/.openclaw/openclaw.json
  ├─ 启动/重启 gateway
  ├─ 健康检查 + 实发验收
  ├─ 不回复排查（事件/权限/发布/可见范围）
  └─ 失败回滚到上一个备份配置
```

---

## 输出格式

```
[龙虾一键部署] 执行完成
├─ 平台：macOS / Linux / Windows
├─ Feishu：已安装（或已存在）
├─ OpenClaw：已安装（或已存在）
├─ 机器人：longmao 已写入并启用
├─ 探针：feishu.probe.ok = true
├─ 实发：messageId = xxxxx
├─ 排查：事件/权限/发布/测试范围 = 通过
└─ 回滚点：~/.openclaw/openclaw.json.bak.YYYYMMDD_HHMMSS
```

---

## 配套脚本

| 脚本 | 用途 |
|:---|:---|
| package/deploy_windows.ps1 | Windows 一键部署（Feishu + OpenClaw） |
| package/deploy_mac.sh | macOS 一键部署（Feishu + OpenClaw） |
| package/deploy_linux.sh | Linux 一键部署（Feishu + OpenClaw） |
| package/一键部署.bat | Windows 一键启动入口 |
| package/setup_mac.command | Mac 一键启动入口 |
| package/README.txt | 快速手册与变量说明 |

---

## 相关文件（Files）

- 技能文档：`01_卡资（金）/金盾_数据安全/远程环境一键部署/SKILL.md`
- 脚本目录：`01_卡资（金）/金盾_数据安全/远程环境一键部署/package/`
- 工作台记录：`运营中枢/工作台/阿猫Mac_OpenClaw配置情况分析.md`

---

## 安全原则

- 不在脚本中写死任何账号、密码、Token、API Key
- 所有凭据仅通过环境变量或本机安全存储注入
- 每次改配置先备份 `openclaw.json`
- 失败必须可回滚，且保留验证日志

---

## 常见故障一针见血（Troubleshooting）

| 现象 | 直接结论 | 直接处理 |
|:---|:---|:---|
| 飞书里能看到机器人，但发消息没回复 | 飞书事件未生效或权限/发布缺失 | 开通消息权限 + 添加 `im.message.receive_v1` + 创建版本并发布 |
| `probe.ok=true` 但 `directory peers/groups list` 为空 | 机器人未进入任何会话 | 在目标群添加“龙猫”机器人或私聊先发起一次会话 |
| 发消息报 `230002 Bot/User can NOT be out of the chat` | 机器人不在该群/会话 | 先把机器人拉进群，再复测 |
| 切换新 AppID 后完全不回 | 新应用未完成测试范围 | 在“测试企业和人员”加入测试人和测试群并发布 |
| 之前能用，突然不回 | 配置切换后异常或发布失效 | 回滚 `openclaw.json` 备份并重启 gateway |
| 网关日志 `403` / Cloudflare `1010`，或模型单轮 `output=0` | api123 拦截默认 UA / 上下文顶满 | 在 `models.providers.<id>.headers` 增加 `User-Agent: curl/8.x`；必要时清理飞书会话 jsonl 或调低 `agents.defaults.contextTokens` |

---

## 依赖（Dependencies）

- 前置技能：`02_卡人（水）/水桥_平台对接/飞书管理/SKILL.md`（飞书能力）
- 外部工具：
  - macOS：`brew`（可选）
  - Linux：`curl`、`python3`
  - Windows：`winget`（优先）
  - 通用：`openclaw`

---

## 版本记录

| 日期 | 版本 | 变更 |
|:---|:---|:---|
| 2026-03-24 | 3.0 | 新增“飞书不回复”闭环排查 SOP、故障矩阵与一针见血修复策略；一键部署升级为部署+排错一体化 |
| 2026-03-24 | 2.0 | 升级为跨平台 Feishu + OpenClaw 一键部署，支持本地/远程、验收与回滚，移除明文凭据写死方案 |
| 2026-02-14 | 1.0 | 初始版本：Clash Verge Rev + Cursor 一键部署 |
