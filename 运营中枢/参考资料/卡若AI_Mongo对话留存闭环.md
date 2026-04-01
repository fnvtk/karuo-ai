# 卡若AI · Mongo 对话留存闭环（默认格式）

> **用途**：统一「Cursor 对话 → `karuo_site` → 可查可统计」的**固定顺序**，减少漏同步、重复数据与分类漂移。  
> **库**：唯一 MongoDB **27017**，库名 **`karuo_site`**；集合 **`对话记录`**、**`消息内容`**、**`项目分类`**（由脚本聚合刷新）。

---

## 一、每条对话结束前（写出复盘块之前）

按顺序执行（**由 Cursor 规则强制执行；Agent 直接跑命令，不询问**）：

1. **运行同步脚本**（**每轮仍执行**；脚本内部按 **对话ID** 节流，**同一会话 1 小时内最多写入 Mongo 一次**，不足 1 小时则打印跳过、不写库；满 1 小时则更新 `对话记录`，且 **`消息内容` 仅增量 upsert**「上次 `mongo_sync_last_at` 之后」的新气泡；**仅空白/无正文的气泡不写库**，若库中已有占位则删除）。  
   ```bash
   python3 "/Users/karuo/Documents/个人/卡若AI/01_卡资（金）/金仓_存储备份/聊天记录管理/脚本/realtime_chat_sync.py"
   ```
   - **须立即入库**（绕过 1 小时）：同路径加 **`--force`**（全量消息 upsert）。  
   - **全量补历史**：`--sync-all`（**不**应用小时节流，每条对话全量消息）。
2. **（可选）** 若本轮明确知道对话 ID：  
   `python3 .../realtime_chat_sync.py --current-conversation-id <UUID>`

3. 再写 **强制复盘**（🎯📌💡📝▶），见 `卡若复盘格式_固定规则.md`。

---

## 二、本机/新环境首次或索引报错时

1. **去重并建唯一索引**（库层防重复；大表建索引可能需数十秒～数分钟）  
   ```bash
   python3 "/Users/karuo/Documents/个人/卡若AI/01_卡资（金）/金仓_存储备份/聊天记录管理/脚本/ensure_mongo_chat_indexes.py"
   ```
2. 或使用入口：  
   `python3 .../realtime_chat_sync.py --ensure-indexes`

---

## 三、补全本地全部 Cursor 历史（按需、低频）

```bash
python3 "/Users/karuo/Documents/个人/卡若AI/01_卡资（金）/金仓_存储备份/聊天记录管理/脚本/realtime_chat_sync.py" --sync-all
```

仅补库里**尚未出现**的 `对话ID`：加 `--only-new`。

---

## 四、存储与优化要点（给 Agent 的人类可读摘要）

| 项 | 说明 |
|:---|:---|
| 不重复键 | `对话记录` 以 **`对话ID`** upsert；`消息内容` 以 **`对话ID` + `消息ID`** upsert；唯一索引见 `ensure_mongo_chat_indexes.py`。 |
| 小时节流 | `对话记录.mongo_sync_last_at`（UTC）：同一 `对话ID` **距上次成功写入不足 3600s** 则整段跳过；`--force` 或 `--sync-all` 不受此限。 |
| 增量消息 | 非 force、非 sync-all 且已有 `mongo_sync_last_at` 时，只 upsert **创建时间晚于**该时间点的气泡。 |
| 空白消息 | 正文 `strip` 后为空 **不写入** `消息内容`；若已存在则 `delete_one` 去掉占位。 |
| 分类 | `对话记录.项目` 由脚本按路径/标题/内容匹配 15 类；同步成功后会刷新 **`项目分类`** 汇总。 |
| 可视查询 | 官网控制台 **`/console/cursor-archive`**（只读 Mongo，不碰 `state.vscdb`）；命令行见 `query_chat_history.py`。 |
| 详细技能 | `01_卡资（金）/金仓_存储备份/聊天记录管理/SKILL.md`（G22） |

---

## 五、与飞书 / Gitea 的相对顺序（建议）

- **Mongo 同步** → **飞书复盘 webhook**（**仅当**用户**当轮口述**要发，见 `karuo-ai.mdc`；**默认跳过**）→ **Gitea 自动同步**（若本轮改仓库文件）→ **复盘块收尾**。  
具体以 `.cursor/rules/karuo-ai.mdc` 为准。

---

## 六、每日全库整理（低频 · 同一天只跑一次）

对 **`karuo_site`** 做键去重、对话/消息文本空白与空行规范化、**记忆条目**同质化合并，并子进程执行 **记忆.md → `记忆条目`**（`sync_memory_to_mongo.py`），最后刷新 **`项目分类`**。另会扫描官网相关集合：**`scheduled_task_executions`**、**`gateway_usage`**、**`heartbeat_learnings`** 的字符串字段（清多余空行、统一换行）。日期戳文件：`02_卡人（水）/水溪_整理归档/记忆系统/structured/last_mongo_consolidate_date.txt`（与 `collect_chat_daily` 同目录）。

```bash
python3 "/Users/karuo/Documents/个人/卡若AI/01_卡资（金）/金仓_存储备份/聊天记录管理/脚本/mongo_daily_consolidate.py"
```

- 当日已跑过会跳过；需要再跑：`--force`  
- 只看统计不写库：`--dry-run`  
- 不跑记忆.md 同步：`--skip-memory-sync`  
- 需物理删除「规范化后无正文」的占位消息时（量大、慎用）：`--purge-empty-messages`；默认**不删**，只做空白/空行规范化  
- 不扫调度/网关/心跳学习大表：`--skip-extended-collections`  
- 连接串：`MONGO_URI` / `MONGO_DB`（与 `ensure_mongo_chat_indexes.py` 一致）
