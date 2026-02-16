# Moltbot CLI 命令速查表

## 安装与更新

```bash
# 安装
npm install -g moltbot@latest
pnpm add -g moltbot@latest

# 更新
moltbot update --channel stable|beta|dev

# 卸载
npm uninstall -g moltbot
```

## 引导安装

```bash
# 完整引导（推荐）
moltbot onboard --install-daemon

# 单独安装守护进程
moltbot daemon install
```

## Gateway 操作

```bash
# 启动 Gateway
moltbot gateway
moltbot gateway --port 18789 --verbose
moltbot gateway run --bind loopback --port 18789 --force

# 后台启动
nohup moltbot gateway run > /tmp/moltbot-gateway.log 2>&1 &

# 重启
moltbot gateway restart

# 停止
moltbot gateway stop

# 唤醒
moltbot gateway wake --text "消息" --mode now
```

## 通道管理

```bash
# 登录通道
moltbot channels login

# 查看状态
moltbot channels status
moltbot channels status --probe  # 深度探测

# 列出通道
moltbot channels list
```

## 消息发送

```bash
# 发送消息
moltbot message send --to +1234567890 --message "Hello"

# 发送到群组
moltbot message send --to group:xxx --message "Hello group"

# 带媒体
moltbot message send --to +1234567890 --message "看图" --media /path/to/image.jpg
```

## Agent 调用

```bash
# 基本调用
moltbot agent --message "你的问题"

# 指定思考级别
moltbot agent --message "复杂问题" --thinking high

# 可选级别：off | minimal | low | medium | high | xhigh
```

## 配对管理

```bash
# 查看待配对
moltbot pairing list

# 批准配对
moltbot pairing approve <channel> <code>

# 拒绝配对
moltbot pairing reject <channel> <code>
```

## 配置管理

```bash
# 查看配置
moltbot config get
moltbot config get agent.model

# 设置配置
moltbot config set agent.model "anthropic/claude-opus-4-5"
moltbot config set gateway.mode local

# 编辑配置文件
moltbot config edit
```

## 诊断与调试

```bash
# 运行诊断
moltbot doctor

# 查看版本
moltbot --version
moltbot version

# 查看帮助
moltbot --help
moltbot <command> --help
```

## 会话管理

```bash
# 列出会话
moltbot sessions list

# 重置会话
moltbot sessions reset

# 压缩会话
moltbot sessions compact
```

## 节点管理

```bash
# 列出节点
moltbot nodes list

# 节点信息
moltbot nodes describe <node-id>

# 调用节点
moltbot nodes invoke <node-id> <action>
```

## Skills 管理

```bash
# 列出技能
moltbot skills list

# 安装技能
moltbot skills install <skill-name>

# 卸载技能
moltbot skills uninstall <skill-name>
```

## 浏览器控制

```bash
# 启动浏览器
moltbot browser start

# 打开 URL
moltbot browser open "https://example.com"

# 截图
moltbot browser snapshot
```

## 定时任务

```bash
# 列出任务
moltbot cron list

# 添加任务
moltbot cron add --schedule "0 9 * * *" --message "早安"

# 删除任务
moltbot cron remove <job-id>
```

## 开发模式

```bash
# 从源码运行（在仓库目录）
pnpm install
pnpm ui:build
pnpm build

# 开发监视模式
pnpm gateway:watch

# 运行 CLI
pnpm moltbot ...
```

## 测试命令

```bash
# 单元测试
pnpm test

# 带覆盖率
pnpm test:coverage

# E2E 测试
pnpm test:e2e

# 实时测试（需要真实 API Key）
CLAWDBOT_LIVE_TEST=1 pnpm test:live
```

## 实用组合

### 快速重启 Gateway

```bash
pkill -9 -f moltbot-gateway || true
nohup moltbot gateway run --bind loopback --port 18789 --force > /tmp/moltbot-gateway.log 2>&1 &
```

### 检查状态

```bash
moltbot channels status --probe && ss -ltnp | grep 18789
```

### 查看日志

```bash
# Gateway 日志
tail -f /tmp/moltbot-gateway.log

# macOS 统一日志
./scripts/clawlog.sh

# 跟踪日志
./scripts/clawlog.sh --follow
```

## 环境变量

| 变量 | 用途 |
|:---|:---|
| `TELEGRAM_BOT_TOKEN` | Telegram Bot Token |
| `DISCORD_BOT_TOKEN` | Discord Bot Token |
| `SLACK_BOT_TOKEN` | Slack Bot Token |
| `SLACK_APP_TOKEN` | Slack App Token |
| `ANTHROPIC_API_KEY` | Anthropic API Key |
| `OPENAI_API_KEY` | OpenAI API Key |

## 常见问题

### Gateway 无法启动

```bash
# 检查端口占用
lsof -i :18789

# 强制启动
moltbot gateway run --force
```

### 通道连接失败

```bash
# 重新登录
moltbot channels login

# 检查凭证
ls ~/.clawdbot/credentials/
```

### 配置问题

```bash
# 检查配置
moltbot doctor

# 重置配置
rm ~/.clawdbot/moltbot.json
moltbot onboard
```
