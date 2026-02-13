# 经典案例：WhatsApp 智能助手

> **场景**：搭建一个 WhatsApp 私人 AI 助手，随时随地通过微信对话
> **耗时**：约 10 分钟
> **难度**：⭐⭐（简单）

---

## 目标效果

```
你（WhatsApp）: 帮我查一下今天厦门的天气
AI 助手: 今天厦门天气晴，气温 18-25°C，适合外出...

你（WhatsApp）: 记住我明天下午3点有个会议
AI 助手: 好的，已记录：明天下午3点的会议...
```

---

## 准备工作

### 1. 检查环境

```bash
# 检查 Node.js 版本（需要 22+）
node -v
# 输出: v22.x.x

# 如果版本过低，升级 Node.js
brew install node@22
```

### 2. 准备手机

- 确保 WhatsApp 已安装并登录
- 手机和电脑在同一网络（扫码用）

---

## 操作流程

### 第一步：安装消息中枢

```bash
# 全局安装 Moltbot
npm install -g moltbot@latest

# 验证安装
moltbot --version
# 输出: moltbot/2026.x.x
```

**预期输出**：
```
added 1 package in 30s
```

---

### 第二步：运行引导向导

```bash
moltbot onboard --install-daemon
```

**引导过程**：

```
🦞 Welcome to Moltbot!

? Select your AI provider: (Use arrow keys)
❯ Anthropic (Claude)
  OpenAI (GPT)
  
? Enter your Anthropic API key: **********************

? Install as system service? (Y/n) Y

✔ Configuration saved
✔ Daemon installed
✔ Ready to start!
```

---

### 第三步：登录 WhatsApp

```bash
moltbot channels login
```

**操作**：
1. 终端会显示一个二维码
2. 打开手机 WhatsApp → 设置 → 链接的设备
3. 点击「链接设备」
4. 扫描终端中的二维码

**成功输出**：
```
✔ WhatsApp connected!
  Phone: +86138xxxxxxxx
  Status: Online
```

---

### 第四步：配置白名单

编辑配置文件：

```bash
# 打开配置文件
code ~/.clawdbot/moltbot.json

# 或使用 vim
vim ~/.clawdbot/moltbot.json
```

**添加配置**：

```json5
{
  "agent": {
    "model": "anthropic/claude-opus-4-5"
  },
  "channels": {
    "whatsapp": {
      "allowFrom": ["+86138xxxxxxxx"],  // 改成你的手机号
      "dmPolicy": "pairing"  // 配对模式，安全
    }
  }
}
```

---

### 第五步：启动 Gateway

```bash
# 启动（前台，可以看日志）
moltbot gateway --port 18789 --verbose

# 或后台启动
nohup moltbot gateway run --bind loopback --port 18789 > /tmp/moltbot-gateway.log 2>&1 &
```

**成功输出**：
```
🦞 Moltbot Gateway starting...
  Port: 18789
  Channels: whatsapp
  Model: anthropic/claude-opus-4-5

✔ WhatsApp connected
✔ Gateway ready at ws://127.0.0.1:18789
```

---

### 第六步：测试对话

打开 WhatsApp，给自己发送消息：

```
你: 你好，你是谁？
```

**等待 3-5 秒**，AI 会回复：

```
AI: 你好！我是你的个人 AI 助手。我可以帮你：
- 回答问题
- 执行任务
- 管理日程
- ...
有什么我可以帮你的吗？
```

---

## 验证成功

### 检查状态

```bash
moltbot channels status --probe
```

**输出**：
```
┌──────────┬──────────┬────────────────┐
│ Channel  │ Status   │ Account        │
├──────────┼──────────┼────────────────┤
│ whatsapp │ ✔ Online │ +86138xxxxxxxx │
└──────────┴──────────┴────────────────┘
```

### 检查日志

```bash
tail -f /tmp/moltbot-gateway.log
```

---

## 进阶用法

### 使用聊天命令

在 WhatsApp 中发送：

| 命令 | 效果 |
|:---|:---|
| `/status` | 查看会话状态 |
| `/new` | 开始新对话 |
| `/think high` | 设置高思考模式 |

### 添加更多通道

编辑 `~/.clawdbot/moltbot.json`：

```json5
{
  "channels": {
    "whatsapp": { /* ... */ },
    "telegram": {
      "botToken": "YOUR_BOT_TOKEN",
      "allowFrom": ["YOUR_USER_ID"]
    }
  }
}
```

重启 Gateway：
```bash
moltbot gateway restart
```

---

## 常见问题

### Q1: 二维码扫不了？

```bash
# 重新生成
moltbot channels login --refresh
```

### Q2: 消息不回复？

```bash
# 检查状态
moltbot doctor

# 查看日志
tail -n 50 /tmp/moltbot-gateway.log
```

### Q3: 连接断开？

```bash
# 重新登录
moltbot channels login
```

---

## 完整命令速查

```bash
# 安装
npm install -g moltbot@latest

# 引导
moltbot onboard --install-daemon

# 登录 WhatsApp
moltbot channels login

# 启动
moltbot gateway --port 18789 --verbose

# 检查状态
moltbot channels status --probe
moltbot doctor

# 停止
pkill -f moltbot-gateway

# 重启
moltbot gateway restart
```

---

## 下一步

1. **添加 Telegram**：见 `references/通道配置.md`
2. **开发自定义 Skill**：见 `references/skills开发指南.md`
3. **部署到服务器**：联系卡资（金）协助

---

> **技能负责人**：卡火（火）- 火炬
> **协作**：卡资（金）- 服务器部署
