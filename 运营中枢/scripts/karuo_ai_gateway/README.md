# 卡若AI 网关

外网可访问的 API，按卡若AI 思考逻辑生成回复。其他 AI 或终端通过 POST /v1/chat 调用。

## 与 Cursor 的关系（重要）

- **Cursor 编辑器没有公开的「本机 HTTP 接口」**让第三方直接调用它内置的 Agent/对话；无法把「Cursor 当成一个可被 curl 调用的后端」。
- **推荐接法**：在本机（或服务器）运行本网关，在 Cursor → Settings → **Override OpenAI Base URL** 填网关地址（如 `http://127.0.0.1:18080`），**OpenAI API Key** 填你在 `gateway.yaml` 里为部门生成的 **dept_key**。这样 Cursor 会请求本网关的 `POST /v1/chat/completions`，网关再按队列调用你配置的 **上游** OpenAI 兼容接口（`OPENAI_API_*`）。
- **TOKEN 消耗**：网关会在上游返回 `usage` 时，把它写进 JSON 响应，并可用 `GET /v1/usage/summary` 查看**本网关进程内**按租户累计的 token（单 worker、重启清零）。**Cursor 订阅自带的用量**仍以 Cursor 客户端/官网为准，与网关统计是两套数据。

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

#### 4.4 /v1/usage/summary（TOKEN 累计）

本机默认脚本常用端口为 **18080**（见 `start_local_gateway.sh`），请按实际端口替换。

未启用 `gateway.yaml` 时（本机裸跑）：

```bash
curl -s "http://127.0.0.1:18080/v1/usage/summary"
```

启用多租户时（与调用聊天接口相同的 Key）：

```bash
curl -s "http://127.0.0.1:18080/v1/usage/summary" \
  -H "X-Karuo-Api-Key: <dept_key>"
```

`POST /v1/chat` 与 `POST /v1/chat/completions` 的 JSON 里，若上游返回了 `usage`，会附带 `usage` 字段（OpenAI 标准：`prompt_tokens` / `completion_tokens` / `total_tokens`）。

## 给其他 AI 当网关用（怎么操作）

目标：**任意其他 AI、脚本、低代码、自家服务**都通过 HTTP 调你这台机器（或服务器）上的网关，走同一套卡若逻辑 + 同一批上游模型。

**说明**：**不能把 Cursor 里「正在进行的对话」自动变成一个 URL**。其他系统每次调用都要带「当前问题」；多轮时把历史拼进 `prompt`，或用下面的 `chat/completions` 传 `messages`（网关会取最后一条有效 user 文本）。

### 第一步：启动网关

```bash
cd /Users/karuo/Documents/个人/卡若AI/运营中枢/scripts/karuo_ai_gateway
bash start_local_gateway.sh 18080
# 或：.venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 18080
```

记下 **`http://本机IP或域名:端口`**，这就是其他 AI 要填的 **Base URL 的根**（不要带 `/v1/chat`）。

### 第二步：配置上游模型（真正花钱的那一层）

在 `.env` 或环境里设好 `OPENAI_API_KEY`（及可选 `OPENAI_API_BASE` / `OPENAI_MODEL`，或 `OPENAI_API_BASES` 队列）。详见上文「可选环境变量」。  
网关负责：鉴权、技能匹配、卡若人设 system prompt、故障切换；**回答内容来自这些上游接口**。

### 第三步（推荐）：科室 Key + `gateway.yaml`

1. `config/gateway.example.yaml` → `config/gateway.yaml`
2. `export KARUO_GATEWAY_SALT="随机长串"`
3. `python tools/generate_dept_key.py --tenant-id myai --tenant-name "我的其它AI"`，把 hash 写入 yaml，**明文 dept_key 只给调用方**

其他 AI 调用时带：`X-Karuo-Api-Key: <dept_key>` 或 `Authorization: Bearer <dept_key>`。

若暂不启用 `gateway.yaml`，本机部分场景可无 Key 调用（仅适合内网自用时注意风险）。

### 第四步：其他 AI 发请求（两种形态，二选一）

**形态 A — 最简单：`POST /v1/chat`**

```bash
curl -s -X POST "http://127.0.0.1:18080/v1/chat" \
  -H "Content-Type: application/json" \
  -H "X-Karuo-Api-Key: <dept_key>" \
  -d '{"prompt":"请用卡若风格回答：……"}'
```

响应 JSON 里看 **`reply`**；有上游 `usage` 时还有 **`usage`**。

**形态 B — OpenAI 兼容（很多「自定义 Base URL」的客户端都能用）**

- Base URL：`http://127.0.0.1:18080`（不要多写 `/v1` 路径后缀，由客户端自动拼）
- API Key：填 **dept_key**
- 客户端会请求：`POST /v1/chat/completions`，body 里带 `messages`

多轮时把多轮写进 `messages`；网关会从里面对话中提取**最后一条有效 user 内容**再送给上游（复杂上下文建议你在业务侧拼成一条 `prompt` 用形态 A，更可控）。

### 第五步：要给外网其他 AI 用

本机需可被访问：内网穿透（如 ngrok）或服务器 + Nginx 反代，HTTPS 域名见上文「外网暴露」。**务必启用科室 Key**，勿裸奔。

### 和「Cursor 里那段对话」的关系

- 其他 AI **不会自动读到** Cursor 侧边栏上下文。
- 做法：**复制本轮要点**进 `prompt`，或从你方已同步的归档（如 Mongo 对话库 / 控制台）取出摘要再作为 `prompt` 发给网关。

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
