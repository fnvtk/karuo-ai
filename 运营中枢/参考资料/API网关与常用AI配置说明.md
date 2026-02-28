# API 网关与常用 AI 配置说明

> 卡若AI 网关采用「多 API 轮流」：按优先级主备、故障切换；官网控制台可配置多条网关并一键切主用。密钥从 `运营中枢/工作台/00_账号与API索引.md` 或网关 `.env` 配置，此处不写明文。

---

## 一、网关定义与「轮流」含义

- **网关**：一条配置 = 一个 AI 接口的 Base URL（及优先级、重试、超时）。多个网关组成列表，按 **priority** 排序，**主用（active）** 仅一个，其余为备用（standby）。
- **轮流/故障切换**：请求时先走主用；失败（超时/4xx/5xx）则按优先级依次尝试备用，直到成功或全部失败。主用可在官网控制台通过「切为主用」直接选择。
- **多 API 轮询**：同一供应商（如 OpenAI）若有多条 Key 或多个端点，可新增多条网关（如 OpenAI-1、OpenAI-2），设不同 priority，即可实现主备轮询；密钥在调用侧或网关 `.env` 中按 base 对应配置。

---

## 二、常用 AI 与 Base URL（官网控制台已预填）

| 名称 | Base URL | 说明 | 卡若/规则侧密钥或文档 |
|------|----------|------|------------------------|
| KaruoGatewayPrimary | `http://localhost:8000` | 本机卡若AI 网关 | 见 `运营中枢/scripts/karuo_ai_gateway/` |
| OpenAI 官方 | `https://api.openai.com/v1` | GPT 系列 | 规则/账号索引中的 OpenAI API Key |
| OpenRouter（多模型聚合） | `https://openrouter.ai/api/v1` | 可调 Claude/GPT 等，统一入口 | 需在 OpenRouter 申请 Key |
| 通义千问（DashScope） | `https://dashscope.aliyuncs.com/compatible-mode/v1` | 阿里百炼，OpenAI 兼容 | 账号索引·阿里云 / DASHSCOPE_API_KEY |
| v0（Claude） | `https://api.v0.dev/v1` | v0 接口，模型 claude-opus | 账号索引·v0.dev（URL/Secret/模型） |
| 智增增 | `https://api.zhizengzeng.com/v1` | OpenAI 兼容 | 官网 API 清单已登记 |
| 文心一言（千帆） | `https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop` | 百度千帆（非标准 OpenAI，需 token） | 千帆控制台 API Key/Secret |

说明：文心千帆为百度原生接口，认证方式与 OpenAI 不同；若需 OpenAI 兼容调用，可改用支持千帆的代理或第三方兼容 base_url。

---

## 三、卡若AI 规则与已有 API 对应关系

- **主仓库网关**：`运营中枢/scripts/karuo_ai_gateway/`，环境变量 `OPENAI_API_BASES` / `OPENAI_API_KEYS` / `OPENAI_MODELS` 支持多接口排队与故障切换，与官网「API 网关」概念一致。
- **API 稳定性规则**：`.cursor/rules/api-failover-stability.mdc` 规定接口排队、故障切换与告警，与上述网关行为一致。
- **账号与 Key**：`运营中枢/工作台/00_账号与API索引.md` 中 v0、阿里云、腾讯云等；网关 Key 建议写在 `karuo_ai_gateway/.env.api_keys.local` 或环境变量，不提交仓库。

---

## 四、官网控制台使用方式

- 打开 **卡若AI 官网 → 控制台 → API 网关**，可见预填的上述网关；可新增、编辑、删除，以及「切为主用」选择当前使用的端点。
- 每个网关可设：名称、Base URL、优先级、重试次数、超时；同一供应商可配置多条（多 Base URL/多 Key），通过优先级与主备切换实现轮流与故障切换。

---

## 五、相关文档

- 主仓库网关说明：`运营中枢/scripts/karuo_ai_gateway/README.md`
- 接口排队与故障切换规则：`运营中枢/参考资料/卡若AI_API接口排队与故障切换规则.md`
- 账号与 API 索引：`运营中枢/工作台/00_账号与API索引.md`
