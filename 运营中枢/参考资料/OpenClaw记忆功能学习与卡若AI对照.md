# OpenClaw 记忆功能学习与卡若AI 对照

> 学习对象：OpenClaw 官方 Memory 文档 + codesfly/openclaw-memory-final（生产级）；对照卡若AI 记忆系统，提炼可借鉴点。  
> 更新：2026-03-03

---

## 一、OpenClaw 官方记忆（docs.openclaw.ai）

### 1.1 存储形态

- **纯 Markdown，文件为唯一真相源**；模型只「记住」写入磁盘的内容。
- **两层**：
  - **长期**：`MEMORY.md`（可选），持久事实与决策。
  - **日志**：`memory/YYYY-MM-DD.md`，按日追加、会话启动时读「今天+昨天」。

### 1.2 工具

- **memory_get**：按文件/行范围精确读取。
- **memory_search**：语义检索（基于索引片段）；文件不存在时优雅降级返回空，不抛错。

### 1.3 何时写入

- 用户说「记住」→ 必须落盘，不留在内存。
- 日常笔记、运行上下文 → `memory/YYYY-MM-DD.md`。
- 决策、偏好、持久事实 → `MEMORY.md`。

### 1.4 自动 memory flush（ compaction 前）

- 会话接近自动压缩时，触发**静默 agent 轮**，提醒模型在压缩前把该持久化的写入记忆。
- 可配置：`memoryFlush.enabled`、`softThresholdTokens`、提示词（含 `NO_REPLY` 避免对用户可见）。

### 1.5 向量检索

- 可对 `MEMORY.md` 与 `memory/*.md` 建小向量索引，支持语义查询。
- 默认按可用 Key 自动选择：Mistral / Voyage / Gemini / OpenAI / local；支持 Ollama、sqlite-vec 加速。
- **QMD 后端（实验）**：`memory.backend = "qmd"`，本地 BM25 + 向量 + 重排，Markdown 仍为真相源，检索交给 QMD 侧车。

---

## 二、openclaw-memory-final（生产级，codesfly）

- **仓库**：[https://github.com/codesfly/openclaw-memory-final](https://github.com/codesfly/openclaw-memory-final)  
- **最新**：v0.4.2（2026-03），Node 22+，可选 QMD 索引。

### 2.1 设计目标

- **可靠性**：自愈、避免静默失败。
- **幂等**：同一会话状态不重复写入日记忆块。
- **成本可控**：避免不必要的向量 embed（每日 qmd update，每周才 qmd embed）。
- **可审计**：决策与状态可追溯。

### 2.2 分层 Pipeline


| 层级                     | 说明                                                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **短期工作台**              | `memory/CURRENT_STATE.md`，当日工作台，compaction/重置后首选恢复点；可每轮覆盖（非仅追加）。建议字段：今日目标/进行中/阻塞/下一步≤3。                             |
| **日记忆日志**              | `memory/YYYY-MM-DD.md`，主会话 + 子 Agent 产出经「每日蒸馏」写入，仅追加。                                                               |
| **任务结果卡**              | `memory/tasks/YYYY-MM-DD.md`，**仅结果**的子 Agent 任务卡；主会话整理，子 Agent 原始过程保留在隔离历史供审计。                                      |
| **每日蒸馏 Daily Sync**    | 23:00 本地时间；近 26h 会话；过滤 <2 条用户消息的会话；写入日日志；**幂等游标**（last user message fingerprint）防重。                                 |
| **每周精炼 Weekly Tidy**   | 周日 22:00；合并近 7 日日志进长期记忆；约束 `MEMORY.md`（如 80 行/5KB）；写周报 `memory/weekly/YYYY-MM-DD.md`；归档日日志到 `memory/archive/YYYY/`。 |
| **Watchdog**           | 每 2h 的 :15；检测禁用/陈旧/错误；**仅当连续 2 次异常才告警**（低噪）。                                                                        |
| **Retrieval Watchdog** | 每 30 分钟；检索健康检查，2-hit 确认异常。                                                                                          |
| **QMD 夜间维护**           | 每日 03:20；`qmd update`；仅当待处理积压超阈值时 `qmd embed`。                                                                      |


### 2.3 多 Agent 记忆模型

- 主会话 = **记忆策展人**：整合持久结果与决策。
- 子 Agent：只执行；原始过程留在隔离会话历史，可审计。
- **共享交接层**：`memory/tasks/YYYY-MM-DD.md`，仅结果的任务卡。
- **检索顺序**：先任务卡 → 再语义记忆搜索 → 最后按需钻取原始会话。

### 2.4 任务卡字段（建议）

- goal / boundary / acceptance / key actions / artifact paths / final status / next step

### 2.5 Context Budget + 动态画像

- `memory/context-profiles.json` 定义按画像的上下文来源。
- 注入前**硬预算**：单文件上限（默认 20000 字符）、总上限（默认 80000 字符）。
- 按优先级（如 main/ops/btc/quant）组 context pack，控制 prompt 膨胀与延迟。

### 2.6 冲突检测

- 持久化前扫描长期记忆中的路由/规则漂移，避免静默覆盖（`memory_conflict_check.py` → `memory-conflict-report.json`）。

### 2.7 状态文件（摘要）

- `processed-sessions.json`：幂等游标。
- `memory-watchdog-state.json`：异常计数与 last3 快照。
- `context-budget-state.json`：预算检查结果。
- `memory-retrieval-watchdog-state.json`：检索健康状态。

---

## 三、卡若AI 记忆系统现状（简要）


| 层级      | 位置                         | 说明                                        |
| ------- | -------------------------- | ----------------------------------------- |
| **短期**  | Cursor 对话上下文               | 单次对话有效                                    |
| **长期**  | `个人/1、卡若：本人/记忆.md`         | 单文件，偏好/规则/人脉/原则                           |
| **结构化** | `水溪_整理归档/记忆系统/structured/` | 技能索引、Agent 成果、每日摘要、幂等游标、健康、watchdog 报告、周报 |


**自动化**：`collect_chat_daily.py`（每日、幂等+脱敏）、`collect_daily.py`（每日摘要）、`weekly_optimize.py`（每周 SKILL 审计+经验整理）、`memory_watchdog.py`（每 2h、连续 2 次异常才告警）。

---

## 四、可借鉴点（卡若AI 学习清单）


| OpenClaw / memory-final       | 卡若AI 可借鉴                                                                  |
| ----------------------------- | ------------------------------------------------------------------------- |
| **CURRENT_STATE 短期工作台**       | 可选：在 `记忆系统/` 或工作台增加「当日工作台」单文件（今日目标/进行中/阻塞/下一步≤3），compaction 或新会话时优先读。     |
| **任务结果卡（仅结果）**                | 多线程/子任务执行时，将每个子任务的结果写成「任务卡」到 `structured/tasks/YYYY-MM-DD.md`，检索时先任务卡再其他。 |
| **检索顺序**                      | 明确：先查任务卡/结构化结果 → 再查长期记忆/经验库 → 最后按需查原始对话归档。                                |
| **Context budget**            | 若未来做「记忆注入」到 prompt，先做单文件与总字符上限，避免一次性灌入过多记忆。                               |
| **Compaction 前 memory flush** | 若平台支持「压缩前回调」，可在压缩前提醒写入 `记忆.md` 或当日工作台。                                    |
| **冲突检测**                      | 写入长期记忆或规则前，扫描已有规则/路由是否与新内容冲突，生成简单 conflict 报告。                            |
| **QMD / 向量检索**                | 长期可选：对 `记忆.md` 或结构化摘要做本地向量索引（如 QMD 或现有嵌入），支持语义检索；当前卡若AI 以文件与关键词为主，可后续迭代。  |
| **周报与归档**                     | 已有 weekly_report；可明确「周报 + 日日志归档到 archive/YYYY/」的目录规范，与 memory-final 对齐。   |


---

## 五、参考链接

- OpenClaw Memory 概念：[https://docs.openclaw.ai/concepts/memory](https://docs.openclaw.ai/concepts/memory)  
- openclaw-memory-final：[https://github.com/codesfly/openclaw-memory-final](https://github.com/codesfly/openclaw-memory-final)  
- openclaw-memory-final 架构：[https://github.com/codesfly/openclaw-memory-final/blob/main/docs/architecture.md](https://github.com/codesfly/openclaw-memory-final/blob/main/docs/architecture.md)  
- 卡若AI 记忆系统：`02_卡人（水）/水溪_整理归档/记忆系统/README.md`

