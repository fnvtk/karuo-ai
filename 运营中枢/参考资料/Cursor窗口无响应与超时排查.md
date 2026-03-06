# Cursor 窗口无响应 / 超时自动关闭 · 排查与处理

> 当出现「The window is not responding」弹窗时的处理清单。已按本清单在用户设置中做了部分优化。  
> 若伴随**自动关闭/闪退**，另见：`Cursor闪退排查_20260304.md`（日志分析、渲染进程崩溃、Agent 嵌套事务等）。

---

## 一、已做的配置优化（settings.json）

以下项已写入 **Cursor 用户设置**，用于减轻卡顿与无响应：

| 配置项 | 作用 |
|:---|:---|
| `cursor.general.enableCodebaseIndexing` = false | 关闭代码库索引，减轻后台负载 |
| `cursor.general.disableHttp2` = true | 禁用 HTTP/2，改用 HTTP/1.1，减少代理/网络导致的超时与无响应（兼容模式） |
| `files.watcherExclude` | 排除 node_modules、.git、dist、build、.next、.cursor 等，减少文件监视导致的卡顿 |
| `search.exclude` | 搜索时排除上述目录，减轻索引与搜索压力 |
| `typescript.tsserver.maxTsServerMemory` = 4096 | 限制 TS 语言服务内存，避免单进程占满导致假死 |

---

## 二、未响应时的「自动切换」怎么实现

**Cursor 本身没有「请求超时后自动换模型」的配置**；要的是「API 层自动切换」，做法如下。

- **推荐：让 Cursor 走带故障切换的网关**  
  - 在 **karuo_ai_gateway** 里配置 `OPENAI_API_BASES` 接口队列（如本机 Trae `http://127.0.0.1:8765/v1` + 备用接口）。  
  - Cursor 的 Override OpenAI Base URL 指向网关（如 `http://127.0.0.1:18080` 或 `http://kr-ai.quwanzhi.com:18080`），API Key 用网关约定 Key。  
  - 这样当当前接口超时/未响应时，**由网关自动切下一个接口**，无需在 Cursor 里手动换模型。  
  - 配置与验证见：`运营中枢/参考资料/卡若AI_API接口排队与故障切换规则.md`。

- **可选：仅减轻无响应（不实现自动切换）**  
  - 在 Cursor 设置 → Network 中确认已启用 **HTTP Compatibility Mode**（与 settings 中 `cursor.general.disableHttp2` 等效）。  
  - 若某模型经常卡死，可在 Cursor 里**手动**切换为其他已配置模型（如从 max 换到 trae-gpt-4o）。

---

## 三、建议在 Cursor 界面里手动检查

1. **网络（若经常在请求 AI 时卡死）**  
   - **Cursor 设置 → Network**  
   - 确认 **HTTP Compatibility Mode** 已开（与 `cursor.general.disableHttp2` 一致）；部分网络/代理下可减少超时与无响应。

2. **MCP / 工具（若卡死与 Agent、工具调用相关）**  
   - **Cursor 设置 → Tools & MCP**  
   - 暂时关闭不用的 MCP 或工具，观察是否还会出现「窗口无响应」。

3. **模型与 API**  
   - 若某模型或自建 API 经常超时，可先切换到其他模型测试。  
   - 第三方 Base URL / Key 异常也会导致长时间等待后弹窗无响应。

---

## 四、仍出现无响应时

- **先点「Keep Waiting」**：有时是短暂卡顿，等几十秒会恢复。  
- **再试「Reopen」**：会重启该窗口；若勾选「Don't restore editors」则不再恢复上次打开的标签，启动更快。  
- **定期清理**：关闭不用的聊天标签、少开大仓库多根目录，有助减轻内存与 IPC 压力。  
- **看日志**：`~/Library/Application Support/Cursor/logs/main.log`，搜 `ERROR` / `WARN` 排查扩展或网络问题。

---

## 五、原因简述（社区常见）

- 扩展宿主进程崩溃或 IPC 阻塞（如 16s 超时）。  
- 文件监视 / 搜索对超大目录（如未排除的 node_modules）导致 CPU 或 I/O 飙高。  
- 多个聊天或 Agent 同时跑、工具/MCP 超时，导致界面线程被占。  
- 网络或代理导致请求长时间挂起，进而触发「无响应」检测。

上述设置与步骤可在不重装 Cursor 的前提下，优先尝试；若问题依旧，可结合 main.log 与 Cursor 官方论坛/Issues 进一步排查。
