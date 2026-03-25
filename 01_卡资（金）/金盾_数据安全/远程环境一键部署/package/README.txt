================================================
卡若AI · Feishu + OpenClaw（龙虾）一键部署包
版本: 3.0
================================================

[目标]
在任意新机器（macOS / Linux / Windows）完成：
1) 安装 OpenClaw
2) 配置 Feishu 机器人（龙猫）
3) 启动网关并做健康检查
4) 可选：发一条上线验证消息

================================================
[必须先设置的环境变量]
================================================

FEISHU_APP_ID
FEISHU_APP_SECRET
OPENCLAW_BASE_URL
OPENCLAW_API_KEY

可选：
OPENCLAW_MODEL_PROVIDER  (默认 api123-icu)
OPENCLAW_MODEL_ID        (默认 claude-sonnet-4-5-20250929)
FEISHU_TARGET_CHAT_ID    (设置后脚本会自动实发一条验证消息)

================================================
[执行方式]
================================================

macOS:
  bash deploy_mac.sh

Linux:
  bash deploy_linux.sh

Windows (PowerShell 管理员):
  powershell -ExecutionPolicy Bypass -File deploy_windows.ps1
或双击:
  一键部署.bat

================================================
[远程部署]
================================================

macOS/Linux:
  ssh <user>@<host> 'export FEISHU_APP_ID=... FEISHU_APP_SECRET=... OPENCLAW_BASE_URL=... OPENCLAW_API_KEY=...; bash -s' < deploy_linux.sh

Windows:
  使用 WinRM/远程 PowerShell 调用 deploy_windows.ps1，并传入同名环境变量。

================================================
[验收标准]
================================================

1) openclaw channels status --probe --json
   - channels.feishu.probe.ok = true
2) 若设置 FEISHU_TARGET_CHAT_ID：
   - message send 返回 messageId

================================================
[飞书不回复排查（必看）]
================================================

1) 开放平台顶部若提示“版本发布后生效”，必须先发布版本
2) 事件与回调 -> 添加事件：im.message.receive_v1
3) 权限管理 -> 开通并生效：im:message / im:message:send
4) 测试企业和人员 -> 加入当前测试人和测试群
5) 若接口报错 code=230002：
   - 结论：机器人不在目标会话
   - 处理：先把机器人拉进群，再重试

================================================
[快速诊断命令]
================================================

openclaw channels status --probe --json
openclaw directory peers list --channel feishu --account longmao --limit 20 --json
openclaw directory groups list --channel feishu --account longmao --limit 20 --json

================================================
[安全要求]
================================================

- 不要在脚本中写死密钥
- 执行完成后清理终端历史中的敏感变量
- 每次改配置前脚本会备份 ~/.openclaw/openclaw.json

================================================
