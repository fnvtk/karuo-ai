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

---

## 三、卡若AI 规则与已有 API 对应关系

- **主仓库网关**：`运营中枢/scripts/karuo_ai_gateway/`，环境变量 `OPENAI_API_BASES` / `OPENAI_API_KEYS` / `OPENAI_MODELS` 支持多接口排队与故障切换，与官网「API 网关」概念一致。
- **API 稳定性规则**：`.cursor/rules/api-failover-stability.mdc` 规定接口排队、故障切换与告警，与上述网关行为一致。
- **账号与 Key**：`运营中枢/工作台/00_账号与API索引.md` 中 v0、阿里云、腾讯云等；网关 Key 建议写在 `karuo_ai_gateway/.env.api_keys.local` 或环境变量，不提交仓库。

---

## 四、官网控制台使用方式

- 打开 **卡若AI 官网 → 控制台 → API 网关**，可见与主仓库一致的平台列表（本机网关、OpenAI、OpenRouter、通义、v0、智增增）；可新增、编辑、删除，以及「设为主用」选择当前主用网关。
- **参与轮询 / 未参与轮询**：页面分两块——「参与轮询」（已填 API Key）、「未参与轮询」（未填 Key）。每个网关填写 Base URL 与 API Key（**明文显示**，便于与《00_账号与API索引》对照）；填好保存后即参与轮询。
- 网关级：名称、Base URL、API Key、优先级、重试、超时。Key 可从卡若AI 工作台《账号与API索引》复制；控制台内明文显示便于核对，不掩码。
- **模型（请求时使用）**：每个网关的「模型」下拉为**该站点实际可选的 model id**，非通用名。例如 v0 仅显示 v0-1.5-lg / v0-1.5-md / v0-1.0-md；OpenAI 显示 gpt-4o、gpt-4o-mini 等；OpenRouter 显示 openai/gpt-4o、anthropic/claude-3.5-sonnet 等；通义为 qwen-turbo、qwen-plus、qwen-max 等。按 Base URL 或网关 id 自动匹配，保证可选即可用、与各站文档一致。

---

## 五、相关文档

- 主仓库网关说明：`运营中枢/scripts/karuo_ai_gateway/README.md`
- 接口排队与故障切换规则：`运营中枢/参考资料/卡若AI_API接口排队与故障切换规则.md`
- 账号与 API 索引：`运营中枢/工作台/00_账号与API索引.md`
