## 04 模型与 Provider 配置

> [OpenClaw 控制台使用手册](README.md) > 模型与 Provider 配置

---

## 4.1 当前默认模型与 Provider（本机状态）

根据 `clawdbot/references/Claw中Ollama配置说明.md`，当前本机默认配置为：

| 项 | 值 |
|----|----|
| 主模型 | `ollama/qwen2.5:3b` |
| Provider | 内置 `ollama`（本机 `http://localhost:11434`） |
| 认证方式 | `auth.profiles["ollama:local"]`，`mode: "api_key"` |
| 配置文件 | `~/.openclaw/openclaw.json` |

本机已存在模型：`qwen2.5:1.5b`、`qwen2.5:3b`、`nomic-embed-text:latest`，默认用 `qwen2.5:3b`。

---

## 4.2 在控制面板中切换 Ollama 模型

1. 打开 `http://127.0.0.1:18789/config`。
2. 左侧进入「配置」→「Models」。
3. 在「代理默认模型」处选择或填写其中一种：
   - `ollama/qwen2.5:3b`（当前默认）
   - `ollama/qwen2.5:1.5b`
   - `ollama/nomic-embed-text:latest`（一般用于嵌入，不建议当主对话模型）
4. 保存配置，新建的会话将使用新模型。

> 注意：如果在会话中没有立刻感知到变化，请新建会话再测试。

---

## 4.3 确保 Ollama 服务运行

如果模型调用失败，首先确认 Ollama 是否在本机运行：

```bash
curl -s http://localhost:11434/api/tags
```

预期结果：返回一个包含模型列表的 JSON。如果无返回或报错：

- 尝试从启动项中打开 Ollama 应用；
- 或在菜单中选择「Open Ollama」并确认服务已启动。

---

## 4.4 配置 v0/Claude 作为备选 Provider（可选）

当你希望在本地模型之外，保留一个云端模型作为后备时，可以添加 v0 Provider：

1. 在控制面板「配置」→「Models」中新增一个 Provider：
   - 基础 URL：`https://api.v0.dev/v1`
   - 模型 ID：`v0-1.5-md` 或 `v0-1.5-lg`（不要再使用 `v0-1.0-md`）
   - API 密钥：你的 v0 secret。
2. 将该 Provider 标记为 **fallback**，而主 Provider 仍保持为 `ollama` 的 `qwen2.5:3b`。

数据流将变为：

- 正常情况下优先使用本机 `ollama/qwen2.5:3b`。
- 当本机调用失败时，由网关自动尝试 fallback Provider（如 v0，对接 Claude 等）。

---

## 4.5 常见配置错误与排查

| 症状 | 可能原因 | 排查建议 |
|------|----------|----------|
| 所有对话都报超时或 500 | Ollama 未启动，或 baseUrl 配错 | 使用 `curl` 测本机接口；检查 `~/.openclaw/openclaw.json` 中的 Provider 配置。 |
| 仅部分会话报错 | 某个 Provider 或模型配置不完整 | 在「配置 → Models」中检查该 Provider 的 baseUrl、API Key、模型 ID。 |
| 使用量统计中 Provider 一直是 unknown | 会话未正确记录 Provider 字段 | 升级 OpenClaw 版本或检查日志，确认请求是否被中间层改写。 |

---

上一篇：[03 界面与基础操作](03-界面与基础操作.md) | 下一篇：[05 飞书与 Cloud Boot 集成](05-飞书与CloudBoot集成.md)

返回 [章节目录](README.md)

