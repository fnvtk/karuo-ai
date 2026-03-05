# v0 API 接口与对接说明

> 用于在应用内调用 v0 的 AI 能力（与 OpenAI Chat Completions 兼容）。密钥见《00_账号与API索引》v0.dev 一节。

---

## 一、接口与认证

| 项 | 值 |
|----|-----|
| **Base URL** | `https://api.v0.dev/v1` |
| **Chat 补全** | `POST https://api.v0.dev/v1/chat/completions` |
| **认证** | Header：`Authorization: Bearer <你的API Key>` |
| **环境变量** | `V0_API_KEY` 或 `V0_SECRET`（Key 从账号索引复制） |

---

## 二、模型名称（请求体里的 `model`）

- `v0-1.5-lg` — 大模型，效果更好
- `v0-1.5-md` — 中模型，平衡速度与质量（推荐默认）
- `v0-1.0-md` — 旧版中模型（legacy）

---

## 三、请求格式（兼容 OpenAI）

与 OpenAI Chat Completions 一致，直接按下面格式发 POST 即可。

**请求体示例：**

```json
{
  "model": "v0-1.5-md",
  "messages": [
    { "role": "system", "content": "你是一个前端组件助手。" },
    { "role": "user", "content": "生成一个带毛玻璃效果的登录卡片，Next.js + Tailwind。" }
  ],
  "stream": false,
  "max_tokens": 4096
}
```

**流式（stream: true）：** 支持 SSE 流式返回，格式与 OpenAI 一致。

---

## 四、对接方式示例

### 1. cURL

**英文或简单内容**（可直接内联）：

```bash
curl -X POST "https://api.v0.dev/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 你的V0_API_KEY" \
  -d '{"model":"v0-1.5-md","messages":[{"role":"user","content":"Hello"}],"max_tokens":2048}'
```

**含中文等非 ASCII 时**：若在 shell 里用 `-d '...中文...'` 易出现 500，请二选一：

- **方式 A**：请求体写入 UTF-8 文件，用 `-d @文件` 发送：
  ```bash
  echo '{"model":"v0-1.5-lg","messages":[{"role":"user","content":"你好"}],"max_tokens":256}' > req.json
  curl -X POST "https://api.v0.dev/v1/chat/completions" \
    -H "Content-Type: application/json; charset=utf-8" \
    -H "Authorization: Bearer 你的V0_API_KEY" \
    -d @req.json
  ```
- **方式 B**：在 JSON 里用 Unicode 转义（如 `\u4f60\u597d` 表示「你好」），再内联 `-d '...'`。

### 2. JavaScript / Node（fetch）

```javascript
const res = await fetch('https://api.v0.dev/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.V0_API_KEY}`,
  },
  body: JSON.stringify({
    model: 'v0-1.5-md',
    messages: [{ role: 'user', content: '写一个 React 按钮组件' }],
    max_tokens: 2048,
  }),
});
const data = await res.json();
console.log(data.choices[0].message.content);
```

### 3. 使用 OpenAI 兼容客户端（如 openai npm 包）

把 `baseURL` 设为 `https://api.v0.dev/v1`，`apiKey` 设为 v0 的 Secret 即可：

```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'https://api.v0.dev/v1',
  apiKey: process.env.V0_API_KEY,
});

const completion = await openai.chat.completions.create({
  model: 'v0-1.5-md',
  messages: [{ role: 'user', 'content': '写一个 React 按钮组件' }],
  max_tokens: 2048,
});
```

### 4. 环境变量（推荐）

在项目 `.env` 或 `.env.local` 中配置，避免把 Key 写进代码：

```bash
V0_API_KEY=v1:你的Secret
# 或
V0_BASE_URL=https://api.v0.dev/v1  # 可选，默认即此地址
```

---

## 五、响应格式

与 OpenAI 一致，例如：

```json
{
  "id": "...",
  "object": "chat.completion",
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "content": "生成的代码或文本..."
    },
    "finish_reason": "stop"
  }],
  "usage": { "prompt_tokens": 10, "completion_tokens": 100, "total_tokens": 110 }
}
```

流式时按 SSE 逐条返回 `data: {...}`，格式与 OpenAI streaming 相同。

---

## 六、官方文档与 SDK

- **Platform API（项目/对话/部署）**：<https://v0.dev/docs/v0-platform-api>
- **Model API（本说明对应的接口）**：<https://v0.dev/docs/v0-model-api>
- **v0 SDK（TypeScript）**：`pnpm add v0-sdk`，自动读 `V0_API_KEY`，见 <https://github.com/vercel/v0-sdk>

---

## 七、常见问题：Key 有效但 Completions 返回 500

若 **GET https://api.v0.dev/v1/models** 返回 200（说明 Key 有效），但 **POST …/chat/completions** 返回 500、`{"success":false,"error":"Unknown error"}`：
- 多为 v0 账号侧问题：未开通 Model API 所需套餐、额度用尽或未开启 usage-based billing。
- 处理：登录 [v0.app](https://v0.app) → 检查 Billing（Premium/Team）、Usage（额度）、并开启 usage-based billing。

---

## 八、与卡若AI 的用法

- 在**卡若AI 官网控制台 → API 网关**中可添加 v0：Base URL 填 `https://api.v0.dev/v1`，API Key 填《00_账号与API索引》里 v0.dev 的 Secret，模型选 `v0-1.5-md` 或 `v0-1.5-lg`，设为主用后对话等会走该网关。
- 环境变量回退：未配置网关时，官网可读 `V0_API_KEY` / `V0_SECRET` 和可选 `V0_BASE_URL`。详见《API网关与常用AI配置说明》。
