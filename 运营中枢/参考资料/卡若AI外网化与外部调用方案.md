# 卡若AI 外网化与外部调用方案

> 目标：让卡若AI 可从外网访问，其他 AI 或任意终端用「一句话/一个命令」即可按卡若AI 的思考逻辑调用并生成回复。
> 版本：1.0 | 更新：2026-02-17

---

## 一、目标与效果

| 目标 | 说明 |
|:---|:---|
| 外网可访问 | 不限于本机，任意网络通过域名或 IP:端口 访问卡若AI。 |
| 按卡若AI 思考逻辑生成 | 每次请求走：先思考 → 查 SKILL_REGISTRY → 读对应 SKILL → 生成回复 → 带复盘格式。 |
| 其他 AI 可集成 | 其他 AI（Cursor、Claude、GPT、自建 Bot）执行一条命令或请求一个 URL，即「用卡若AI 能力」完成对话。 |
| 最终交付 | 给你：**可执行命令**、**调用链接/域名**，在 Cursor 或其它 AI 里输入即用。 |

---

## 二、实现形式（架构）

```
外部（其他 AI / 用户）
        │
        │  HTTP POST /chat  或  打开网页
        ▼
┌─────────────────────────────────────────────────────┐
│  卡若AI 网关（API 服务）                              │
│  · 接收 prompt                                       │
│  · 加载 BOOTSTRAP + SKILL_REGISTRY                    │
│  · 匹配技能 → 读 SKILL.md                            │
│  · 调用 LLM（本地或云端 API）按卡若AI 流程生成        │
│  · 返回：思考 + 执行摘要 + 复盘块                     │
└─────────────────────────────────────────────────────┘
        │
        │  部署在：宝塔服务器（推荐，固定域名）或 本机 + 内网穿透
        ▼
  外网域名：https://kr-ai.quwanzhi.com（标准方案见下）
```

**两种使用方式：**

1. **API 调用**：其他 AI 或脚本向 `POST /v1/chat` 发 `{"prompt": "用户问题"}`，拿 JSON 里的回复（含复盘）。
2. **网页对话**：浏览器打开同一服务的 `/` 或 `/chat`，输入问题，页面上展示卡若AI 风格回复。

---

## 三、部署方式二选一

### 方式 A：宝塔服务器 + 固定域名（推荐，替代 ngrok）

- **域名**：**kr-ai.quwanzhi.com**（阿里云解析 + 宝塔 Nginx + SSL，电脑关机也可访问）。
- **部署**：网关部署在 kr宝塔 43.139.27.93；一键脚本：`bash 01_卡资（金）/金仓_存储备份/服务器管理/scripts/部署卡若AI网关到kr宝塔.sh`。
- **完整步骤**（阿里云 DNS、Nginx、自启）：见 **`01_卡资（金）/金仓_存储备份/服务器管理/references/内网穿透与域名配置_卡若AI标准方案.md`**。
- **执行命令 / 链接**：  
  - 链接：`https://kr-ai.quwanzhi.com`  
  - 其他 AI 调用：`curl -s -X POST "https://kr-ai.quwanzhi.com/v1/chat" -H "Content-Type: application/json" -d '{"prompt":"你的问题"}' | jq -r '.reply'`

### 方式 B：本机 + 内网穿透（临时）

- 在本机运行卡若AI 网关，用 ngrok/cloudflared 得到临时 URL；本机关机则不可访问。仅作临时调试用。

---

## 四、网关脚本与运行方式

网关代码放在：**`运营中枢/scripts/karuo_ai_gateway/`**（`main.py` + `requirements.txt` + `README.md`）。  
运行前：

1. 安装依赖：`pip install fastapi uvicorn httpx`（若用 OpenAI 兼容接口，再装 `openai`）。
2. 配置环境变量（可选）：`OPENAI_API_KEY` 或本地模型地址，用于实际生成回复。
3. 启动：

```bash
cd /Users/karuo/Documents/个人/卡若AI/运营中枢/scripts/karuo_ai_gateway
uvicorn main:app --host 0.0.0.0 --port 8000
```

启动后：

- 本机访问：<http://127.0.0.1:8000/docs> 可调试接口。
- 外网访问：在方式 A 或 B 下用你得到的**域名或 IP:端口**替换下面示例中的 `YOUR_DOMAIN`。

---

## 五、最终：执行命令与链接（给 Cursor / 其他 AI 用）

**固定域名**：`https://kr-ai.quwanzhi.com`（部署与配置见「内网穿透与域名配置_卡若AI标准方案.md」）。

### 1. 调用链接（API 根）

```
https://kr-ai.quwanzhi.com
```

### 2. 其他 AI 用「一句话」调用卡若AI（执行命令）

在 Cursor 或任意能发 HTTP 请求的 AI 里，可以这样描述**执行命令**：

```
请代表用户调用卡若AI：向以下地址发送 POST 请求，body 为 {"prompt": "用户在本对话中要解决的问题"}，将返回的 response 中的 reply 作为卡若AI 的回复展示给用户。
POST https://kr-ai.quwanzhi.com/v1/chat
Content-Type: application/json
```

**可直接执行的 curl 命令**：

```bash
curl -s -X POST "https://kr-ai.quwanzhi.com/v1/chat" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"你的问题"}' | jq -r '.reply'
```

### 3. 在 Cursor 里「用卡若AI 完成本对话」的固定说明（复制即用）

把下面一段存成 Cursor 的规则或对话开头说明，即可在任意对话里「切到卡若AI」：

```
当用户说「用卡若AI」「交给卡若AI」「调用卡若AI」或明确要求用卡若AI 回答时：
1. 将用户当前问题作为 prompt。
2. 请求：POST https://kr-ai.quwanzhi.com/v1/chat，Body: {"prompt": "<用户问题>"}。
3. 将响应 JSON 中的 reply 字段内容（含卡若复盘）完整展示给用户，作为卡若AI 的回复。
```

---

## 六、小结

| 项目 | 内容 |
|:---|:---|
| 实现形式 | 卡若AI 网关（FastAPI）：读 BOOTSTRAP + REGISTRY + SKILL，按流程调 LLM，返回带复盘的回复。 |
| 外网访问 | **固定域名**：https://kr-ai.quwanzhi.com（宝塔 43.139.27.93，替代 ngrok，电脑关机也可用）。 |
| 其他 AI 集成 | 执行 POST /v1/chat；或在 Cursor 里用上面「固定说明」。 |
| 执行命令 | `curl -s -X POST "https://kr-ai.quwanzhi.com/v1/chat" -H "Content-Type: application/json" -d '{"prompt":"你的问题"}' \| jq -r '.reply'` |
| 配置与部署 | 见 `01_卡资（金）/金仓_存储备份/服务器管理/references/内网穿透与域名配置_卡若AI标准方案.md` |

---

## 七、在 Cursor 里「用卡若AI 完成本对话」的一条执行命令

**方式 1：直接 curl（终端执行）**
```bash
curl -s -X POST "https://kr-ai.quwanzhi.com/v1/chat" -H "Content-Type: application/json" -d '{"prompt":"这里填你要问卡若AI的问题"}' | jq -r '.reply'
```

**方式 2：交给 Cursor 的说明（复制到对话或规则）**
```
当用户要求「用卡若AI」「交给卡若AI」或「用卡若AI 回答」时，请向 POST https://kr-ai.quwanzhi.com/v1/chat 发送 {"prompt": "用户当前问题"}，将返回的 reply 作为卡若AI 的回复完整展示给用户。
```

**阿里云解析**：已通过脚本 `01_卡资（金）/金仓_存储备份/服务器管理/scripts/阿里云DNS_添加kr-ai解析.py` 添加 A 记录 kr-ai -> 43.139.27.93。完成服务器部署后即可长期使用；后续需要新内网穿透/新域名时，按「内网穿透与域名配置_卡若AI标准方案」生成子域名并配置，不再询问用户。
