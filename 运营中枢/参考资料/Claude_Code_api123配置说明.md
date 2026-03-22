# Claude Code + api123.icu 配置说明

> 使用教程说明页面：<https://api123.icu/about>（图文教程在页面下方，严格按教程配置可 100% 成功）

## 一、api123.icu 使用教程（来自官网与 /about）

### 1.1 使用流程

- **兑换码**：控制台 → 钱包管理 → 兑换码充值
- **API KEY 创建**：控制台 → 令牌管理 → 添加令牌 → 创建新的令牌 → 复制密钥 → 尽情使用

### 1.2 API 配置信息

- **Base URL（不加 /v1）**：`https://api123.icu`
- **Base URL（加 /v1，按软件要求）**：`https://api123.icu/v1`

说明：Claude Code 会自动追加 `/v1/messages`，因此 Base URL 填 `https://api123.icu` 即可，不要带 `/v1`，否则会变成 `/v1/v1/messages` 导致 404。

### 1.3 支持的软件与教程

官网支持的软件配置（需教程可联系技术 QQ，好评截图可免费获取技术支持）：

| 序号 | 软件 | 说明 |
|------|------|------|
| 1 | VSCode Claude Code | 见下方官方验证教程 |
| 2 | VSCode Cline | 教程见 QZone 链接 |
| 3 | Claude Code CLI | 见 api123.icu/about |
| 4 | OpenCode（桌面版） | 教程见 QZone |
| 5 | CC Switch | 教程见 QZone |
| 6 | Cherry Studio | 教程见 QZone |
| 8 | Chatbox | 教程见 QZone |
| 9 | 酒馆 | 需教程联系技术 QQ |
| 10 | OpenClaw | 只指引中转模型配置 |

**官方验证教程（教程中的参数需替换为 api123.icu 的 Base URL 与自己的 Token）**：

- [VSCode 中 Claude Code for VS Code 接入](https://docs.ksyun.com/documents/44928)
- [Windows11 Claude Code 配置中转方案](https://blog.csdn.net/qq_42320804/article/details/153137741)
- [MacOS 上高效使用 Claude Code](https://blog.csdn.net/Trb201013/article/details/150266782)
- OpenCode 桌面版 / OpenClaw / Chatbox / Cherry Studio / Cline / CC Switch：<https://user.qzone.qq.com/1326508153/2>

### 1.4 官网能力概览（api123.icu 首页）

UnifiedLLM API 网关：更好价格、更稳、无需订阅，只需把模型的 Base URL 替换为 api123.icu。支持的接口包括：`/v1/chat/completions`、`/v1/messages`、`/v1/responses`、`/v1/embeddings`、`/v1/audio/*`、`/v1/images/*`、`/v1/rerank`、`/v1beta/models` 等。支持 30+ 厂商。

---

## 二、当前配置位置（Claude Code）

- **配置文件**：`~/.claude/settings.json`
- **默认模型**：`claude-sonnet-4-6`

### api123.icu 支持的全部模型（2026-03-18 查询）

| 模型 ID | 类型 |
|---------|------|
| `claude-sonnet-4-6` | Sonnet（默认） |
| `claude-sonnet-4-5-20250929` | Sonnet 4.5 |
| `claude-sonnet-4-5-20250929-thinking` | Sonnet 4.5 思考版 |
| `claude-opus-4-6` | Opus |
| `claude-opus-4-6-thinking` | Opus 思考版 |
| `claude-opus-4-5-20251101-thinking` | Opus 4.5 思考版 |
| `claude-haiku-4-5-20251001` | Haiku（最便宜） |

在 Claude Code 里输入 `/model` 可以切换模型。

- **Base URL**：`https://api123.icu`（不带 `/v1`）
- **鉴权**：同时配置 `ANTHROPIC_API_KEY`（x-api-key）与 `ANTHROPIC_AUTH_TOKEN`（Bearer），兼容不同中转要求

## 若仍出现 401「无效的令牌」

1. **核对密钥**：登录 [api123.icu](https://api123.icu) → 控制台 → 令牌管理 → 确认令牌有效并重新复制（无首尾空格）。
2. **余额/套餐**：确认账号有可用额度或已开通对应套餐。
3. **切换 Base URL**：可尝试改为不带 `/v1` 的 `https://api123.icu`，保存后重启 Claude Code 再试。
4. **官方教程**：按 [api123.icu/about](https://api123.icu/about) 的「Claude Code CLI」教程逐步检查（可联系技术 QQ 获取图文教程）。

## 若出现 503 / model_not_found（No available channel for model … under group default）

说明中转端当前对「默认分组」没有该模型通道或通道暂时不可用。**优先用一键脚本修复**：

- **一键修复（推荐）**：在终端执行  
  `bash "卡若AI/运营中枢/参考资料/scripts/fix_claude_503.sh"`  
  （本机或阿猫 Mac 均可；iCloud 同步后路径可能为 `婼瑄/卡若AI/...`）  
  执行后**完全退出 Claude Code**（esc 或 Cmd+C），再重新打开终端执行 `claude`。

若不用脚本，可手动：

1. **切到备选模型**：在 `~/.claude/settings.json` 里把 `model` 和 `env.ANTHROPIC_MODEL` 改为 api123 支持的其它模型，例如：
   - `claude-sonnet-4-5-20250929`（Sonnet 4.5）
   - `claude-haiku-4-5-20251001`（Haiku，成本低）
   保存后**完全退出 Claude Code 再重新打开**。
2. **确认 api123 控制台**：登录 api123.icu 查看当前套餐/分组下哪些模型可用，若 `claude-sonnet-4-6` 未开通可改用上列备选或联系客服开通。
3. **临时用官方源排查**：若需确认是否为中转问题，可临时把 Base URL 与 Key 改回 Anthropic 官方，仅作对比测试。

---

## 三、卡若AI网站接入信息

卡若AI网站（localhost:3102）已配好 api123.icu 作为主用渠道，可作为统一 API 入口给其他客户端使用：

- **Base URL**：`http://localhost:3102/v1`（本机）或 `https://kr-ai.quwanzhi.com/v1`（远程）
- **API Key**：`kr_aK6KHdVRpv6YPF12H9LJcAAJNkbJmfyM`（阿猫+Claude Code 通用）
- **Model**：`claude-sonnet-4-6`（或 `karuo-ai`）
- **兼容协议**：OpenAI Chat Completions

---

## 四、阿猫 Mac：默认 API 设为 api123.icu（直连，替换 Open Cloud）

阿猫 Mac 地址：`macbook.quwanzhi.com:22203`，用户 `kr`。以下为**默认 API / 默认 TOKEN**，让阿猫直接使用 api123.icu 访问，无需经 Open Cloud 或 kr-ai 网关。

### 4.1 api123.icu 直连配置（阿猫 Mac 默认）

| 项 | 值 |
|----|-----|
| **Base URL** | `https://api123.icu`（Claude Code 等不加 `/v1`）或 `https://api123.icu/v1`（部分客户端需带 `/v1`，按软件要求） |
| **API Key / Token** | **勿写入仓库**；在 [api123.icu](https://api123.icu) 控制台生成，仅写入本机 `~/.claude/settings.json` 或 `export ANTHROPIC_API_KEY` |
| **默认模型** | `claude-sonnet-4-6` |

### 4.2 在阿猫 Mac 上设置默认 API（替换 Open Cloud）

**一键脚本**（iCloud 同步后可在阿猫 Mac 上直接运行）：  
`卡若AI/运营中枢/工作台/阿猫Mac_设置api123为默认API.sh` → 终端执行 `bash "脚本路径"`，会写入/合并 `~/.claude/settings.json`，重启 Cursor/Claude Code 后生效。

1. **Cursor / Claude Code（VSCode 插件）**  
   - 打开设置（或 `~/.claude/settings.json`），将 **Base URL** 设为 `https://api123.icu`，**API Key** 设为上表 Token，保存后重启。  
   - 若之前用的是「Open Cloud」或其它默认源，直接改为上述 Base URL + Token 即可作为默认。

2. **LobeChat**  
   - 设置 → 模型服务商 → 自定义（OpenAI）→ API 代理地址填 `https://api123.icu` 或 `https://api123.icu/v1`（按界面说明），API Key 填上表 Token，自定义模型填 `claude-sonnet-4-6`。

3. **其他客户端（OpenCode、Chatbox、Cline 等）**  
   - 按 [api123.icu/about](https://api123.icu/about) 对应软件教程，把 Base URL 和 API Key 替换为上述值即可。

按上述配置后，阿猫在本机即可直接使用 api123.icu 作为默认 API 访问，无需再走 Open Cloud。

### 4.3 可选：仍走卡若AI 网关时（LobeChat）

若阿猫希望继续走 kr-ai 网关（统一计费/管控），可使用：

- **API 代理地址**：`https://kr-ai.quwanzhi.com/v1`
- **API Key**：`kr_aK6KHdVRpv6YPF12H9LJcAAJNkbJmfyM`
- **自定义模型**：`claude-sonnet-4-6`

---

## 五、参考

- api123.icu 首页：<https://api123.icu>
- api123.icu 使用说明与教程：<https://api123.icu/about>
- 密钥创建：控制台 → 令牌管理 → 添加令牌 → 创建新令牌 → 复制密钥
