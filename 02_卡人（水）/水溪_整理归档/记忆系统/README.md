# 卡若AI 记忆系统 v2.0

> 三层记忆架构：短期（STM）+ 长期（LTM）+ 结构化（Structured）

---

## 架构说明

| 层级 | 存储位置 | 说明 |
|:---|:---|:---|
| **短期记忆（STM）** | Cursor 对话上下文 | 由 Cursor 自动管理，单次对话有效 |
| **长期记忆（LTM）** | `/Users/karuo/Documents/个人/1、卡若：本人/记忆.md` + `1、卡若：本人/记忆/` | 卡若的长期偏好、规则、日期记录、人脉、原则、方法论（**强制**：仅认此目录，不随意更改） |
| **结构化记忆** | `02_卡人（水）/水溪_整理归档/记忆系统/structured/` | 技能注册表、Agent 成果追踪、每日摘要 |

---

## 结构化记忆文件

| 文件 | 用途 |
|:---|:---|
| `structured/skills_registry.json` | 全部 38 个 SKILL 的结构化索引，供程序化路由 |
| `structured/agent_results.json` | Agent 对话成果追踪表 |
| `structured/daily_digest.md` | 每日自动生成的成果摘要 |
| `structured/processed_sessions.json` | 对话采集幂等游标（避免重复归档） |
| `structured/memory_health.json` | 记忆采集健康指标（扫描/新增/跳过/脱敏） |
| `structured/watchdog_report.json` | 记忆系统巡检结果（告警前置状态） |
| `structured/weekly_report_*.md` | 每周优化审计报告 |

---

## 自动化脚本

| 脚本 | 用途 | 频率 |
|:---|:---|:---|
| `collect_chat_daily.py` | 每日对话归档（幂等去重 + 脱敏） | 每日 |
| `collect_daily.py` | 扫描当日活跃 Agent，生成摘要 | 每日 |
| `weekly_optimize.py` | SKILL 质量审计 + 经验库整理 | 每周 |
| `memory_watchdog.py` | 记忆系统健康巡检（连续2次异常才告警） | 每2小时 |

### 使用方式

```bash
# 每日收集
cd /Users/karuo/Documents/个人/卡若AI/02_卡人（水）/水溪_整理归档/记忆系统
python collect_chat_daily.py
python collect_daily.py

# 每周优化
python weekly_optimize.py

# 仅审计 SKILL 质量
python weekly_optimize.py --audit

# 健康巡检
python memory_watchdog.py
```

---

## 与其他模块的关系

- **SKILL.md**（根目录）：技能主索引，人类可读版本
- **skills_registry.json**：与 SKILL.md 内容一致，机器可读版本
- **_经验库/**：经验沉淀的持久存储
- **记忆**：卡若个人的长期记忆（偏好、规则、人脉等），路径固定为 `个人/1、卡若：本人/记忆.md` 与 `个人/1、卡若：本人/记忆/`
