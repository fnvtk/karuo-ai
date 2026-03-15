# API 网关与常用 AI 配置说明

> 官网控制台与卡若AI 主仓库对齐。控制台内 **API Key 明文显示**，便于与《00_账号与API索引》对照填写；密钥来源见工作台 `00_账号与API索引.md` 或网关 `.env`。

---

## 一、参与轮询 / 未参与轮询

- **参与轮询**：已填写 API Key 的网关，会参与故障切换与轮流调用；在控制台「API 网关」页归入「参与轮询」区块显示。
- **未参与轮询**：未填写 API Key 的网关不参与轮询；填写并保存后即参与轮询，归入「参与轮询」区块。
- **轮流/故障切换**：请求时按主用网关下已填 Key 的端点依次尝试；失败则换下一网关，直到成功或全部失败。主用网关在官网控制台通过「设为主用」选择。
- **与主仓库一致**：主仓库 `OPENAI_API_BASES` / `OPENAI_API_KEYS` 多接口排队逻辑与官网「已填 Key = 参与轮询」一致，便于卡若自动使用多个 API/模型并确保调用成功。

---

## 二、常用 AI 与 Base URL（官网控制台已预填，可直接使用与编辑）

| 名称 | Base URL | 说明 | 卡若/规则侧密钥或文档 |
|------|----------|------|------------------------|
| KaruoGatewayPrimary | `http://localhost:8000` | 本机卡若AI 网关 | 见 `运营中枢/scripts/karuo_ai_gateway/` |
| OpenAI 官方 | `https://api.openai.com/v1` | GPT 系列 | 规则/账号索引中的 OpenAI API Key |
| OpenRouter（多模型聚合） | `https://openrouter.ai/api/v1` | 可调 Claude/GPT 等，统一入口 | 需在 OpenRouter 申请 Key |
| 通义千问（DashScope） | `https://dashscope.aliyuncs.com/compatible-mode/v1` | 阿里百炼，OpenAI 兼容 | 账号索引·阿里云 / DASHSCOPE_API_KEY |
| v0（Claude） | `https://api.v0.dev/v1` | v0 Model API，模型选 v0-1.5-md / v0-1.5-lg / v0-1.0-md | 账号索引·v0.dev（URL/Secret） |
| 智增增 | `https://api.zhizengzeng.com/v1` | OpenAI 兼容 | 官网 API 清单已登记 |
| Groq（超快推理） | `https://api.groq.com/openai/v1` | Llama 3/Mixtral/Gemma，延迟极低 | cr4hsunuomlj@sharebot.net（临时邮箱注册） |
| Together AI（多模型聚合） | `https://api.together.xyz/v1` | Llama 3/Qwen/DeepSeek 等 | zhiqun1984@gmail.com（Google OAuth） |
| Cerebras（AI芯片加速推理） | `https://api.cerebras.ai/v1` | Llama 3.1/3.3 | Google OAuth 注册 |
| Cohere（NLP专家） | `https://api.cohere.com/v2` | Command A/R/Embed/Rerank，非 OpenAI 兼容需特殊适配 | zhiqun1984@gmail.com（Google OAuth） |

---

## 三、当前接口队列（2026-03-16 01:50 更新）

| 序号 | 平台 | Base URL | 模型 | 上下文 | 状态 |
|:---|:---|:---|:---|:---|:---|
| 1 | **Cohere** | `https://api.cohere.com/compatibility/v1` | command-a-03-2025 | **128K** | ✅ 主力（priority=1） |
| 2 | Cerebras | `https://api.cerebras.ai/v1` | llama3.1-8b | 8K | ✅ 备用（priority=5） |
| 3 | Ollama 本机 | `http://localhost:11434` | qwen2.5:3b | 32K | ✅ 兜底 |
| - | v0 | `https://api.v0.dev/v1` | v0-1.5-md | - | ❌ 持续 500（disabled） |
| - | Groq | `https://api.groq.com/openai/v1` | llama-3.3-70b-versatile | - | ❌ 组织受限（disabled） |
| - | Together AI | `https://api.together.xyz/v1` | Llama-3.3-70B-Instruct-Turbo | - | ❌ 额度耗尽（standby） |

> **重要**：Cohere 128K 上下文适合长对话；Cerebras 8K 上下文过小，仅作备用。路由引擎已支持 priority 字段排序。

### Key 健康检查

```bash
python3 运营中枢/scripts/karuo_ai_gateway/key_health_check.py          # 一次性
python3 运营中枢/scripts/karuo_ai_gateway/key_health_check.py --watch 300  # 守护
```

### Key 来源

- Groq / Cerebras / Cohere / Together AI：由「全网AI自动注册」SKILL（M02a）通过浏览器自动化注册获取
- v0：手动配置
- 新 Key 接入：编辑 `.env.api_keys.local` → 健康检查 → 复制到 `.env` → 重启网关

## 四、卡若AI 规则与已有 API 对应关系

- **主仓库网关**：`运营中枢/scripts/karuo_ai_gateway/`，环境变量 `OPENAI_API_BASES` / `OPENAI_API_KEYS` / `OPENAI_MODELS` 支持多接口排队与故障切换，与官网「API 网关」概念一致。
- **API 稳定性规则**：`.cursor/rules/api-failover-stability.mdc` 规定接口排队、故障切换与告警，与上述网关行为一致。
- **Key 健康检查**：`运营中枢/scripts/karuo_ai_gateway/key_health_check.py` 定期检测各 Key 可用性、响应延迟和额度，状态存入 `key_status.json`。
- **账号与 Key**：`运营中枢/工作台/00_账号与API索引.md` 中 v0、阿里云、腾讯云等；网关 Key 建议写在 `karuo_ai_gateway/.env.api_keys.local` 或环境变量，不提交仓库。

---

## 四、让前端跑通 API 的两种方式

- **方式一（推荐）**：在卡若AI 官网 **控制台 → API 网关** 中，至少配置一个网关并填写 API Key、选择模型（如 v0 的 Key 从《00_账号与API索引》v0.dev 一节复制 Secret，模型选 v0-1.5-md），并将该网关「设为主用」。首页对话、技能 AI 等均走该网关。
- **方式二（环境变量回退）**：未配置网关或数据库不可用时，官网会读取环境变量作为备用网关，与卡若AI《00_账号与API索引》对齐：
  - **v0**：`V0_API_KEY` 或 `V0_SECRET`（值为索引中的 Secret），可选 `V0_BASE_URL`（默认 `https://api.v0.dev/v1`）。
  - **OpenAI**：`OPENAI_API_KEY` 或 `CHAT_API_KEY`，可选 `OPENAI_API_BASE`、`OPENAI_MODEL`（默认 gpt-4o-mini）。
  - 在网站项目根目录配置 `.env.local` 后重启，前端即可直接使用对话等 API 而无需先打开控制台。

## 五、官网控制台使用方式

- 打开 **卡若AI 官网 → 控制台 → API 网关**，可见与主仓库一致的平台列表（本机网关、OpenAI、OpenRouter、通义、v0、智增增）；可新增、编辑、删除，以及「设为主用」选择当前主用网关。
- **参与轮询 / 未参与轮询**：页面分两块——「参与轮询」（已填 API Key）、「未参与轮询」（未填 Key）。每个网关填写 Base URL 与 API Key（**明文显示**，便于与《00_账号与API索引》对照）；填好保存后即参与轮询。
- 网关级：名称、Base URL、API Key、优先级、重试、超时。Key 可从卡若AI 工作台《账号与API索引》复制；控制台内明文显示便于核对，不掩码。
- **模型（请求时使用）**：每个网关的「模型」下拉为**该站点实际可选的 model id**，非通用名。例如 v0 仅显示 v0-1.5-lg / v0-1.5-md / v0-1.0-md；OpenAI 显示 gpt-4o、gpt-4o-mini 等；OpenRouter 显示 openai/gpt-4o、anthropic/claude-3.5-sonnet 等；通义为 qwen-turbo、qwen-plus、qwen-max 等。按 Base URL 或网关 id 自动匹配，保证可选即可用、与各站文档一致。

---

## 六、相关文档

- 主仓库网关说明：`运营中枢/scripts/karuo_ai_gateway/README.md`
- 接口排队与故障切换规则：`运营中枢/参考资料/卡若AI_API接口排队与故障切换规则.md`
- 账号与 API 索引：`运营中枢/工作台/00_账号与API索引.md`
