# API 网关与常用 AI 配置说明

> 官网控制台与卡若AI 主仓库对齐：每个网关可配置**多个 API 端点**，勾选「参与轮询」的端点用于故障切换与轮流调用，确保调用成功。密钥从 `运营中枢/工作台/00_账号与API索引.md` 或网关 `.env` 配置，此处不写明文。

---

## 一、网关定义与「多 API 轮询」

- **网关**：一条网关可包含**多个 API 端点**（Base URL）。每个端点可单独勾选**是否参与轮询**；仅勾选「参与轮询」的端点会参与故障切换与轮流调用。
- **轮流/故障切换**：请求时按主用网关下「参与轮询」的端点依次尝试；失败则换下一端点或下一网关，直到成功或全部失败。主用网关在官网控制台通过「切为主用」选择。
- **与主仓库一致**：主仓库 `OPENAI_API_BASES` / `OPENAI_API_KEYS` 多接口排队逻辑与官网「多端点 + 参与轮询」一致，便于卡若自动使用多个 API/模型并确保调用成功。

---

## 二、常用 AI 与 Base URL（官网控制台已预填，可直接使用与编辑）

| 名称 | Base URL | 说明 | 卡若/规则侧密钥或文档 |
|------|----------|------|------------------------|
| KaruoGatewayPrimary | `http://localhost:8000` | 本机卡若AI 网关 | 见 `运营中枢/scripts/karuo_ai_gateway/` |
| OpenAI 官方 | `https://api.openai.com/v1` | GPT 系列 | 规则/账号索引中的 OpenAI API Key |
| OpenRouter（多模型聚合） | `https://openrouter.ai/api/v1` | 可调 Claude/GPT 等，统一入口 | 需在 OpenRouter 申请 Key |
| 通义千问（DashScope） | `https://dashscope.aliyuncs.com/compatible-mode/v1` | 阿里百炼，OpenAI 兼容 | 账号索引·阿里云 / DASHSCOPE_API_KEY |
| v0（Claude） | `https://api.v0.dev/v1` | v0 接口，模型 claude-opus | 账号索引·v0.dev（URL/Secret/模型） |
| 智增增 | `https://api.zhizengzeng.com/v1` | OpenAI 兼容 | 官网 API 清单已登记 |

---

## 三、卡若AI 规则与已有 API 对应关系

- **主仓库网关**：`运营中枢/scripts/karuo_ai_gateway/`，环境变量 `OPENAI_API_BASES` / `OPENAI_API_KEYS` / `OPENAI_MODELS` 支持多接口排队与故障切换，与官网「API 网关」概念一致。
- **API 稳定性规则**：`.cursor/rules/api-failover-stability.mdc` 规定接口排队、故障切换与告警，与上述网关行为一致。
- **账号与 Key**：`运营中枢/工作台/00_账号与API索引.md` 中 v0、阿里云、腾讯云等；网关 Key 建议写在 `karuo_ai_gateway/.env.api_keys.local` 或环境变量，不提交仓库。

---

## 四、官网控制台使用方式

- 打开 **卡若AI 官网 → 控制台 → API 网关**，可见预填的上述网关（与主仓库、已有 API 一致）；可新增、编辑、删除，以及「切为主用」选择当前主用网关。
- **每个网关可配置多个 API 端点**：点击网关行左侧箭头展开，可添加/删除端点、填写每个端点的 URL，并**勾选「参与轮询」**。仅勾选参与轮询的端点会用于故障切换与轮流调用，便于卡若自动使用多个 API 确保调用成功。
- 网关级：名称、优先级、重试次数、超时；端点级：URL、是否参与轮询。密钥在调用侧或主仓库网关 `.env` 中配置。

---

## 五、相关文档

- 主仓库网关说明：`运营中枢/scripts/karuo_ai_gateway/README.md`
- 接口排队与故障切换规则：`运营中枢/参考资料/卡若AI_API接口排队与故障切换规则.md`
- 账号与 API 索引：`运营中枢/工作台/00_账号与API索引.md`
