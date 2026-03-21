# 卡若AI 网关

外网可访问的 API，按卡若AI 思考逻辑生成回复。其他 AI 或终端通过 POST /v1/chat 调用。

## 运行

```bash
cd /Users/karuo/Documents/个人/卡若AI/运营中枢/scripts/karuo_ai_gateway
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

可选环境变量：

- `OPENAI_API_KEY`：OpenAI 或兼容 API 的密钥，配置后使用真实 LLM 生成回复。
- `OPENAI_API_BASE`：兼容接口地址，默认 `https://api.openai.com/v1`。
- `OPENAI_MODEL`：模型名，默认 `gpt-4o-mini`。
- `OPENAI_API_BASES`：接口队列（逗号分隔），例如 `https://a.example.com/v1,https://b.example.com/v1`。
- `OPENAI_API_KEYS`：队列密钥（逗号分隔，可选）。若未配置，回退 `OPENAI_API_KEY`。
- `OPENAI_MODELS`：队列模型（逗号分隔，可选）。若未配置，回退 `OPENAI_MODEL`。
- `ALERT_EMAIL_TO`：全部接口失败时的告警收件人（默认 `zhiqun@qq.com`）。
- `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS`：SMTP 告警配置（QQ 邮箱默认 `smtp.qq.com:465`）。
- `KARUO_GATEWAY_CONFIG`：网关配置路径（默认 `config/gateway.yaml`）。
- `KARUO_GATEWAY_SALT`：部门 Key 的 salt（用于 sha256 校验；不写入仓库）。

### API Key 填写文件地址（本地）

统一在这个文件填写（已预置 V0/Cursor 项）：

- `运营中枢/scripts/karuo_ai_gateway/.env.api_keys.local`

填完后执行：

```bash
cd /Users/karuo/Documents/个人/卡若AI/运营中枢/scripts/karuo_ai_gateway
cp .env.api_keys.local .env
```

### 接口排队与自动切换（稳定性）

网关会按顺序尝试接口队列：

1. 优先使用 `OPENAI_API_BASES`（可配多个）
2. 任一接口超时/异常/非 200 时，自动切换下一接口
3. 全部失败时：发送告警邮件并返回降级回复（不中断对话）

示例：

```bash
export OPENAI_API_BASES="https://api.openai.com/v1,https://openrouter.ai/api/v1"
export OPENAI_API_KEYS="sk-xxx,sk-yyy"
export OPENAI_MODELS="gpt-4o-mini,openai/gpt-4o-mini"

export ALERT_EMAIL_TO="zhiqun@qq.com"
export SMTP_HOST="smtp.qq.com"
export SMTP_PORT="465"
export SMTP_USER="zhiqun@qq.com"
export SMTP_PASS="你的QQ邮箱授权码"
```

## 部门/科室鉴权与白名单（推荐启用）

网关支持“每部门一个 Key + 技能白名单”，用于：

- 科室/部门直接调用接口，不互相影响
- 外网暴露时避免“全能力裸奔”
- 能按部门做限流/审计日志

### 1) 准备配置文件

从示例复制一份（`gateway.yaml` 建议不要提交到仓库）：

- `config/gateway.example.yaml` → `config/gateway.yaml`

### 2) 准备 salt（只在环境变量）

在运行环境里设置：

```bash
export KARUO_GATEWAY_SALT="一个足够长的随机字符串"
```

### 3) 生成部门 Key 与 hash

```bash
python tools/generate_dept_key.py --tenant-id finance --tenant-name "财务科"
```

把输出里的 `api_key_sha256` 写入 `config/gateway.yaml` 对应 tenant；明文 `dept_key` 只出现一次，保存到部门系统的安全配置里。

### 4) 调用方式

#### 4.1 /v1/chat

```bash
curl -s -X POST "http://127.0.0.1:8000/v1/chat" \
  -H "Content-Type: application/json" \
  -H "X-Karuo-Api-Key: <dept_key>" \
  -d '{"prompt":"你的问题"}'
```

#### 4.2 /v1/skills（部门自查）

```bash
curl -s "http://127.0.0.1:8000/v1/skills" \
  -H "X-Karuo-Api-Key: <dept_key>"
```

#### 4.3 /v1/health

```bash
curl -s "http://127.0.0.1:8000/v1/health"
```

## 科室 / 终端快速自检（API 地址、鉴权、TOKEN 说明）

本机启动网关后，浏览器或 `curl` 打开（**不含密钥，可发给科室同事对照配置**）：

```bash
curl -s "http://127.0.0.1:8000/v1/gateway/info" | python3 -m json.tool
```

返回内容包括：

- 各接口完整 URL（health、chat、chat/completions、models、skills）
- 是否启用租户鉴权、请求头名称（`X-Karuo-Api-Key` 或 `Authorization: Bearer`）
- Cursor 与本网关的关系说明（见下）

### 每次调用如何看到消耗了多少 TOKEN？

- **`POST /v1/chat`**：响应 JSON 增加字段 **`usage`**（与 OpenAI 一致时为 `prompt_tokens` / `completion_tokens` / `total_tokens`），来自**上游模型接口**的返回值；若上游未返回或走降级模板回复，则 `usage` 为 `null`。
- **`POST /v1/chat/completions`**：非流式时，顶层 **`usage`** 同样透传上游；流式 SSE 仍为本网关的简化实现，**不保证**带 `usage`（建议用非流式或看 access JSONL 日志）。
- **审计**：在 `gateway.yaml` 里开启 `logging` 后，每条访问日志可带 `usage` 字段（若本次有）。

**说明**：Cursor 软件本身**没有**公开的「把 IDE 里 Composer 当 HTTP API 调」的接口；要实现「任意脚本调 AI」，应使用本网关（或直连 OpenAI 兼容 API）。Cursor 可与本网关**共用**同一上游 Key，或把 Cursor 的 **Override OpenAI Base URL** 指向本网关。

## Cursor 配置（OpenAI 兼容）

如果你希望在 Cursor 的「API Keys」里把卡若AI网关当成一个 OpenAI 兼容后端：

1. 打开 Cursor → Settings → API Keys
2. `OpenAI API Key`：填你的 **dept_key**（例如“卡若公司”的 key）
3. 打开 `Override OpenAI Base URL`：填 `http://127.0.0.1:8000`
   - 不要填 `/v1/chat`
   - Cursor 会调用：`POST /v1/chat/completions`

## 外网暴露

- **本机 + ngrok**：`ngrok http 8000`，用给出的 https 地址作为 YOUR_DOMAIN。
- **宝塔服务器**：将本服务部署到服务器，Nginx 反代 8000 端口，配置域名即 YOUR_DOMAIN。

## 执行命令（给 Cursor / 其他 AI）

将 `YOUR_DOMAIN` 换成实际域名或 ngrok 地址后执行：

```bash
curl -s -X POST "https://YOUR_DOMAIN/v1/chat" \
  -H "Content-Type: application/json" \
  -H "X-Karuo-Api-Key: <dept_key>" \
  -d '{"prompt":"你的问题"}' | jq -r '.reply'
```

方案说明：`运营中枢/参考资料/卡若AI外网化与外部调用方案.md`。
