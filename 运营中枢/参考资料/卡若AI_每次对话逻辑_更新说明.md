# 卡若AI · 每次对话逻辑（更新后）

> 记忆接入 MongoDB 后的完整流程说明。**流程图**：同目录下 **`卡若AI_每次对话逻辑_流程图.png`**（图片格式，以后流程图均按此形式提供，不再使用 HTML）。

---

## 一、整体逻辑概览

每次对话遵循：**启动 → 记忆与上下文加载 → 技能匹配 → 思考与拆解 → 执行与验证 → 记忆写入与同步 → 收尾**。记忆来源在「记忆.md」基础上增加了 **MongoDB 记忆条目**，可在对话中按分类/标签/关键词/最近 N 条快速调取。

---

## 二、对话开始（启动与上下文）

| 步骤 | 动作 | 说明 |
|:---|:---|:---|
| 1 | 读 BOOTSTRAP.md | 身份、团队、MAX Mode、执行流程、记忆检索顺序 |
| 2 | 读 SKILL_REGISTRY.md | 热技能速查 → 未命中则全表查技能路径 |
| 3 | 读 记忆.md | 唯一记忆源：`1、卡若：本人/记忆.md`，以卡若角色参与 |
| 4 | 可选读 CURRENT_STATE.md | 当日工作台状态 |
| 5 | 按需调取 MongoDB 记忆 | 若需补充历史/偏好/规则：`query_memory.py --最近 20` 或 `--关键词 xxx`、`--分类 固定偏好` |

---

## 三、记忆检索顺序（更新后）

当需要「回忆」时，按以下顺序查找（先命中先使用）：

1. **CURRENT_STATE.md** — 当日工作台
2. **任务结果卡** structured/tasks/
3. **记忆.md** — 长期偏好与沉淀（权威源）
4. **MongoDB 记忆条目**（karuo_site.记忆条目）— 按分类/标签/日期/关键词/最近 N 条调取（`query_memory.py`）；**MongoDB 不可用时自动降级为读 记忆.md**
5. daily_digest + agent_results
6. **对话归档** — 一律从 **MongoDB**（karuo_site.对话记录、消息内容）实时读取；上下文召回用 `context_recall.py`。**MongoDB 不可用时使用最近对话本地 fallback**（聊天记录管理/fallback/recent_chats_fallback.json）
7. archive/

---

## 四、技能匹配与执行

| 步骤 | 动作 |
|:---|:---|
| 1 | 用户需求 → 热技能速查匹配；未命中 → 读 SKILL_REGISTRY 全文 |
| 2 | 命中技能 → 读对应 SKILL.md，按 Steps 执行 |
| 3 | MAX Mode：先思考、拆解、展示计划，再执行；至少两轮验证 |
| 4 | 对话中可随时按需执行 `query_memory.py` 调取记忆（不改变检索顺序，仅补充上下文） |

---

## 五、记忆写入与同步（更新后）

| 时机 | 动作 |
|:---|:---|
| 写入前 | `memory_conflict_check.py "新内容"` 冲突检测 |
| 写入 | 写入 **记忆.md**（MemoryManager）；可选：跑 `sync_memory_to_mongo.py` 将 记忆.md 同步到 MongoDB |
| 同步 | 新条目进入 记忆.md 后，执行一次 `sync_memory_to_mongo.py` 即可在 MongoDB 中按分类/关键词查询 |

---

## 六、对话结束

- 强制复盘（🎯📌💡📝▶ 五块，带日期时间）
- **聊天归档**：`auto_archive.py --scan-new` 将本轮对话写入 **MongoDB**（对话记录/消息内容），并同步写入本地 fallback，供数据库不可用时召回。
- 可选：sync_memory_to_mongo、Gitea 同步、飞书复盘发群等

---

## 七、MongoDB 记忆相关命令速查

| 目的 | 命令 |
|:---|:---|
| 记忆.md → MongoDB | `python3 02_卡人（水）/水溪_整理归档/记忆系统/sync_memory_to_mongo.py` |
| 最近 N 条 | `python3 …/query_memory.py --最近 20` |
| 按分类 | `python3 …/query_memory.py --分类 固定偏好` |
| 按标签 | `python3 …/query_memory.py --标签 规则` |
| 按关键词 | `python3 …/query_memory.py --关键词 飞书` |
| 按日期 | `python3 …/query_memory.py --日期 2026-03-15` |
| 统计 | `python3 …/query_memory.py --stats` |

---

## 八、数据库与降级

- **卡若 AI 调用的数据库**：唯一 MongoDB（27017），库名 **karuo_site**，含：记忆条目、对话记录、消息内容等。聊天记录不存 Cursor 本地库为主，以 MongoDB 为主存储并支持实时调用。
- **记忆**：query_memory 连不上 MongoDB 时，自动输出 记忆.md 最近若干行。
- **聊天**：context_recall 连不上 MongoDB 时，从 `聊天记录管理/fallback/recent_chats_fallback.json` 做关键词匹配召回最近对话。

## 九、流程图文件

- **流程图**：同目录 **`卡若AI_每次对话逻辑_流程图.png`**（图片格式）。
- **约定**：卡若AI 流程图一律使用**图片格式（PNG）**提供，不使用 HTML。
