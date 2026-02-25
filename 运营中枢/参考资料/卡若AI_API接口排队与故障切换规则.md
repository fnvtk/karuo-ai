# 卡若AI API 接口排队与故障切换规则

## 1. 本机已识别的 AI 接口配置入口

- 网关代码入口：`运营中枢/scripts/karuo_ai_gateway/main.py`
- 网关说明文档：`运营中枢/scripts/karuo_ai_gateway/README.md`
- 网关配置样例：`运营中枢/scripts/karuo_ai_gateway/config/gateway.example.yaml`

当前支持的接口变量（不含明文密钥）：

- 单接口：`OPENAI_API_BASE` / `OPENAI_API_KEY` / `OPENAI_MODEL`
- 队列接口：`OPENAI_API_BASES` / `OPENAI_API_KEYS` / `OPENAI_MODELS`
- 告警邮箱：`ALERT_EMAIL_TO` / `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS`

---

## 2. 规则目标

1. 任一接口超时或异常，自动切换到下一个接口。
2. 只要队列中有一个接口可用，必须返回正常回复。
3. 全部接口不可用时，自动发邮件到 `zhiqun@qq.com`，并返回降级回复，不能空响应。

---

## 3. 可直接使用的配置模板

```bash
# 1) 接口队列（按顺序）
export OPENAI_API_BASES="https://api.openai.com/v1,https://openrouter.ai/api/v1,https://your-backup-api/v1"

# 2) 对应密钥（顺序与上面一致；可先只填一个，会回退到 OPENAI_API_KEY）
export OPENAI_API_KEYS="sk-main,sk-backup,sk-third"

# 3) 对应模型（可选，不填则回退 OPENAI_MODEL）
export OPENAI_MODELS="gpt-4o-mini,openai/gpt-4o-mini,gpt-4o-mini"

# 4) 单接口兜底（建议保留）
export OPENAI_API_BASE="https://api.openai.com/v1"
export OPENAI_API_KEY="sk-main"
export OPENAI_MODEL="gpt-4o-mini"

# 5) 全挂告警邮件
export ALERT_EMAIL_TO="zhiqun@qq.com"
export SMTP_HOST="smtp.qq.com"
export SMTP_PORT="465"
export SMTP_USER="zhiqun@qq.com"
export SMTP_PASS="你的QQ邮箱授权码"
```

---

## 4. 执行逻辑（网关内置）

1. 读取 `OPENAI_API_BASES` 队列。
2. 按顺序逐个请求上游接口。
3. 某个接口成功（HTTP 200）即返回结果，不再继续重试后续接口。
4. 失败（超时/异常/非 200）则自动切到下一接口。
5. 若全部失败：
   - 发送告警邮件（默认带 300 秒冷却，避免刷屏）；
   - 返回可读降级回复，保证前端有响应。

---

## 5. 验证清单

1. 停掉第一个接口或改错第一个 key，确认仍能正常回复（证明切换生效）。
2. 同时让全部接口不可用，确认收到 `zhiqun@qq.com` 告警。
3. 查看网关响应：不应出现空白回复或长时间卡死。

