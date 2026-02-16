# 账号与 API 及接口手册

> **用途**：集中存放 v0、Vercel、Word（Microsoft Graph）的账号/凭证索引与**全部接口**说明，便于调用时查阅，无需每次查官方文档。  
> **维护**：金盾；凭证实际值见「账号与API索引」或项目 `.env`，本手册只写接口与用法。

---

## 一、账号与凭证索引

| 服务 | 环境变量/存放 | 用途 | 获取处 |
|------|----------------|------|--------|
| **v0.dev** | `V0_API_KEY` | v0 Platform API + Model API 鉴权 | 账号与API索引 § v0.dev；或 https://v0.app/chat/settings/keys |
| **Vercel** | `VERCEL_TOKEN` | Vercel REST API 部署、项目创建/更新 | 账号与API索引 § Vercel；上帝之眼/.env |
| **Word / Microsoft 365** | 按需（Azure AD / Graph 应用） | Microsoft Graph 访问 OneDrive/Word 文档 | 账号与API索引 § Microsoft/Word（若有）；需配置 Azure 应用与权限 |

- **v0 请求头**：`Authorization: Bearer <V0_API_KEY>`
- **v0 模型**：`v0-1.5-md`（日常/UI）、`v0-1.5-lg`（复杂推理）、`v0-1.0-md`（兼容）

---

## 二、v0 全部接口（Platform API + Model API）

**Base URL**：`https://api.v0.dev`

### 2.1 Platform API（REST）

| 方法 | 路径 | 功能 | 说明 |
|------|------|------|------|
| GET | `/v1/projects` | 列出项目 | 返回当前账号下所有 v0 项目 |
| POST | `/v1/projects` | 创建项目 | body: `name`, 可选 `description`, `icon`, `environmentVariables`, `instructions`, `vercelProjectId`, `privacy` |
| GET | `/v1/projects/:id` | 获取项目 | 返回项目详情、chats 等 |
| PUT | `/v1/projects/:id` | 更新项目 | 修改名称、描述等 |
| DELETE | `/v1/projects/:id` | 删除项目 | - |
| POST | `/v1/chats` | 创建对话 | **create**：body 含 `message`，可选 `system`, `projectId`, `attachments`, `chatPrivacy`, `modelConfiguration`, `responseMode`(sync/async/experimental_stream) 等 |
| POST | `/v1/chats` | 初始化对话（带文件） | **init**：body 含 `type: 'files'`, `files: [{ name, content }]`, `projectId`，可选 `initialContext`；无 token 消耗，推荐已有代码时用 |
| GET | `/v1/chats/:id` | 获取对话 | 含 messages、latestVersion 等 |
| GET | `/v1/chats/:id/messages` | 获取消息列表 | - |
| POST | `/v1/chats/:id/messages` | 发送消息 | - |
| PATCH | `/v1/chats/:id` | 更新对话 | 如改名 |
| DELETE | `/v1/chats/:id` | 删除对话 | - |
| POST | `/v1/deployments` | 创建部署 | body: `projectId`, `chatId`, `versionId`；触发部署到 Vercel |

**SDK**：`pnpm add v0-sdk`，默认读 `V0_API_KEY`；或 `createClient({ apiKey })`。

**限额（参考）**：项目 100/账号，对话 1000/项目，消息 10000/对话，单文件 ≤3MB，部署 50/项目；API 请求 10000/日等。

### 2.2 v0 Model API（OpenAI 兼容）

| 方法 | 路径 | 功能 | 说明 |
|------|------|------|------|
| POST | `/v1/chat/completions` | 对话补全 | 与 OpenAI Chat Completions 格式兼容；支持 stream |

**请求头**：`Authorization: Bearer <V0_API_KEY>`，`Content-Type: application/json`

**请求体**：
- `model`（必填）：`v0-1.5-md` | `v0-1.5-lg` | `v0-1.0-md`
- `messages`（必填）：`[{ "role": "user"|"assistant"|"system", "content": "..." }]`，content 可为字符串或多模态数组（含图片 base64）
- `stream`（可选）：`true` 时 SSE 流式返回
- `tools` / `tool_choice`（可选）：工具调用
- `max_completion_tokens`（可选）：默认 4000

**上下文/输出限制**：v0-1.0-md / v0-1.5-md 上下文 128k，输出 64k；v0-1.5-lg 上下文 512k，输出 64k。

**示例（curl）**：
```bash
curl https://api.v0.dev/v1/chat/completions \
  -H "Authorization: Bearer $V0_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"v0-1.5-md","messages":[{"role":"user","content":"Create a Next.js AI chatbot"}]}'
```

---

## 三、Word / Microsoft Graph 相关接口

通过 Microsoft Graph 访问 OneDrive/SharePoint 中的 Word（.docx）等文件。需 Azure AD 应用注册与权限（如 `Files.Read`、`Files.ReadWrite`）。

### 3.1 寻址方式

- **按 ID**：`/me/drive/items/{item-id}` 或 `/drives/{drive-id}/items/{item-id}`
- **按路径**：`/me/drive/root:/path/to/file.docx` 或 `/drives/{drive-id}/root:/{path}`

### 3.2 常用端点

| 方法 | 路径/资源 | 功能 |
|------|-----------|------|
| GET | `/me/drive/root/children` | 列出根目录子项 |
| GET | `/me/drive/items/{id}` | 获取 DriveItem 元数据 |
| GET | `/me/drive/items/{id}/content` | 下载文件原始内容（如 .docx 二进制） |
| GET | `/me/drive/items/{id}/content?format={format}` | 按格式下载（如转 PDF 等，见 Graph 文档） |
| GET | `/me/drive/root:/{path}:/content` | 按路径下载文件内容 |
| POST | `/me/drive/root/children` | 上传/创建文件或文件夹 |
| PATCH | `/me/drive/items/{id}` | 更新项（重命名、移动等） |
| DELETE | `/me/drive/items/{id}` | 删除项 |

### 3.3 Word 文档说明

- 使用 `/content` 获取的是完整 .docx 文件流（含嵌入对象），并非纯文本。
- 需要纯文本时，可用 Graph 的「按格式下载」或本地用库解析 .docx。
- 权限：至少 `Files.Read`；写入需 `Files.ReadWrite`。

**Graph 根地址**：`https://graph.microsoft.com/v1.0`（或 beta）。

---

## 四、GitHub 相关（v0 文档中可获取的能力）

- **v0 与 GitHub**：项目可从 GitHub 仓库初始化（`chats.init` 的 `type: 'repo'`, `repo: { url }`）；发布时可 Open PR（v0 分支 → 目标仓库 main）。
- **上帝之眼**：主源为 **fnvtk/godeye** 的 **main**；v0 连接该仓库后，以 main 覆盖 v0 当前状态，默认发布方式为 Open PR。
- **v0 SDK / 示例**：GitHub 上可搜 `vercel/v0-sdk`、v0 官方示例与 MCP 集成文档。

---

## 五、本流水线常用脚本与接口对应

| 脚本 | 使用的接口/能力 |
|------|------------------|
| `deploy-vercel.js` | Vercel REST API（项目、部署） |
| `sync-to-v0.js` | v0 POST /v1/projects（创建/关联），vercelProjectId 绑定 |
| `sync-local-to-v0-api.js` | 本地 push main；v0 项目/对话 init 或 Pull from main |
| `create-v0-optimization-chat.js` | v0 GET /v1/projects/:id（chats），POST /v1/chats（创建对话，中文名） |
| `consolidate-v0-chats.js` | v0 GET chats，PATCH 改名，DELETE 删对话 |
| `sync-after-v0.js` | Git push + Vercel 部署 + 本地 pull，写同步与反馈记录 |

校验 v0 项目示例（GET /v1/projects）：
```bash
# 在上帝之眼目录且 .env 有 V0_API_KEY 时
node -e "
require('fs').readFileSync('.env','utf8').split('\n').forEach(l=>{
  const m=l.match(/V0_API_KEY\s*=\s*(.+)/); if(m) process.env.V0_API_KEY=m[1].trim();
});
(async ()=>{
  const r=await fetch('https://api.v0.dev/v1/projects',{headers:{Authorization:'Bearer '+process.env.V0_API_KEY}});
  const d=await r.json();
  const p=(d.data||[]).find(x=>x.name==='上帝之眼'||x.vercelProjectId==='prj_7Icpm7qR1hc6X61ydY1bzxAsjLVz');
  console.log(p?'v0 项目正确': '未找到', p?JSON.stringify({id:p.id,name:p.name,webUrl:p.webUrl,vercelProjectId:p.vercelProjectId},null,2):'');
})();
"
```

---

**文档版本**：2025-02；接口以各平台官方文档为准，本手册便于本地与脚本调用时速查。
