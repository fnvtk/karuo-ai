# 卡若AI 记忆系统 v3.0

> 四层记忆架构：短期（STM）+ 当日工作台（CURRENT_STATE）+ 长期（LTM）+ 结构化（Structured）  
> 吸收 OpenClaw memory-final 设计：任务结果卡、检索顺序、冲突检测、归档规范。

---

## 架构说明

| 层级 | 存储位置 | 说明 |
|:---|:---|:---|
| **短期记忆（STM）** | Cursor/平台 对话上下文 | 单次对话有效，由平台自动管理 |
| **当日工作台** | `记忆系统/CURRENT_STATE.md` | 每次对话启动时优先读取；可覆盖更新（非仅追加）；字段：今日目标/进行中/阻塞/下一步≤3；compaction 或新会话时的第一恢复点 |
| **长期记忆（LTM）** | `/Users/karuo/Documents/个人/1、卡若：本人/记忆.md` | 卡若的长期偏好、规则、日期记录、人脉、原则、方法论；**单文件、无子目录** |
| **结构化记忆** | `记忆系统/structured/` | 技能索引、Agent 成果、每日摘要、幂等游标、健康、watchdog、任务结果卡 |

---

## 记忆检索顺序（强制）

当需要从记忆中查找信息时，按以下顺序检索：

1. **当日工作台** `CURRENT_STATE.md` — 当前进行中的目标与上下文
2. **任务结果卡** `structured/tasks/YYYY-MM-DD.md` — 近期子任务/并行线程的结果
3. **长期记忆** `个人/1、卡若：本人/记忆.md` — 持久偏好与规则
4. **结构化摘要** `structured/daily_digest.md` + `structured/agent_results.json` — 每日成果
5. **对话归档** `水溪_整理归档/对话归档/YYYY-MM-DD/` — 原始对话记录（仅在前 4 层未找到时）
6. **归档** `archive/YYYY/MM/` — 历史日日志（仅审计/回溯）

---

## 结构化记忆文件

| 文件 | 用途 |
|:---|:---|
| `structured/skills_registry.json` | SKILL 结构化索引，供程序化路由 |
| `structured/agent_results.json` | Agent 对话成果追踪表 |
| `structured/daily_digest.md` | 每日自动生成的成果摘要 |
| `structured/processed_sessions.json` | 对话采集幂等游标（避免重复归档） |
| `structured/memory_health.json` | 记忆采集健康指标（扫描/新增/跳过/脱敏） |
| `structured/watchdog_report.json` | 记忆系统巡检结果（告警前置状态） |
| `structured/weekly_report_*.md` | 每周优化审计报告 |
| `structured/tasks/YYYY-MM-DD.md` | **任务结果卡**（仅结果，多线程/子任务完成后写入） |
| `structured/tasks/TEMPLATE.md` | 任务结果卡字段模板 |
| `structured/memory-conflict-report.json` | 写入长期记忆前的冲突检测报告 |

---

## 自动化脚本

| 脚本 | 用途 | 频率 |
|:---|:---|:---|
| `collect_chat_daily.py` | 每日对话归档（幂等去重 + 脱敏） | 每日 |
| `collect_daily.py` | 扫描当日活跃 Agent，生成摘要 | 每日 |
| `weekly_optimize.py` | SKILL 质量审计 + 经验库整理 + 日日志归档到 `archive/YYYY/MM/` | 每周 |
| `memory_watchdog.py` | 记忆系统健康巡检（连续 2 次异常才告警） | 每 2 小时 |
| `memory_conflict_check.py` | **写入长期记忆前冲突检测**：扫描已有规则/偏好是否与新内容冲突 | 写入前 |

### 使用方式

```bash
cd /Users/karuo/Documents/个人/卡若AI/02_卡人（水）/水溪_整理归档/记忆系统

# 每日收集
python collect_chat_daily.py
python collect_daily.py

# 每周优化
python weekly_optimize.py

# 健康巡检
python memory_watchdog.py

# 冲突检测（写入长期记忆前）
python memory_conflict_check.py "要写入的新内容"
python memory_conflict_check.py --file /path/to/content.txt
```

---

## 当日工作台（CURRENT_STATE）

- **文件**：`记忆系统/CURRENT_STATE.md`
- **用途**：每次对话启动时优先读取，了解当前进行中上下文；compaction 后首选恢复点。
- **字段**：今日目标 / 进行中 / 阻塞 / 下一步（≤3）。
- **更新**：可覆盖更新，保持精简；每次对话结束时若有进展可更新此文件。

---

## 任务结果卡

- **目录**：`structured/tasks/`
- **格式**：每个子任务/并行线程完成后，追加到 `structured/tasks/YYYY-MM-DD.md`。
- **字段**：goal / boundary / acceptance / key_actions / artifact_paths / status / next_step。
- **模板**：`structured/tasks/TEMPLATE.md`。
- **用途**：仅记录**结果**，不记录过程（过程留对话归档供审计）；检索时优先于对话归档。

---

## 冲突检测

- **脚本**：`memory_conflict_check.py`
- **时机**：在写入长期记忆（`记忆.md`）前执行，扫描已有规则/路由/偏好是否与新内容冲突。
- **输出**：`structured/memory-conflict-report.json`（含冲突数量、具体冲突条目、状态 clean/conflict）。
- **原则**：有冲突时提示用户确认再写入；无冲突则安全写入。

---

## 归档

- **目录**：`archive/YYYY/MM/`
- **时机**：每周精炼时，将已合并入周报的日日志移至归档。
- **检索**：归档内容不参与日常检索，仅供审计与回溯（检索顺序第 6 层）。

---

## 与其他模块的关系

- **SKILL_REGISTRY.md**（根目录）：技能主索引，人类可读版本
- **skills_registry.json**：与 SKILL_REGISTRY 一致，机器可读版本
- **_经验库/**：经验沉淀的持久存储
- **记忆**：卡若个人长期记忆，路径固定为 `个人/1、卡若：本人/记忆.md`（单文件、无子目录）
- **CURRENT_STATE.md**：当日工作台，对话启动首选读取
- **参考资料**：`运营中枢/参考资料/OpenClaw记忆功能学习与卡若AI对照.md`
