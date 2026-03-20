# 聊天记录管理 SKILL

```yaml
id: G22
name: 聊天记录管理
member: 金仓
trigger:
  - 聊天记录
  - 对话存储
  - 聊天归档
  - 聊天导出
  - 聊天导入
  - 清理聊天
  - 对话查询
  - 历史对话
  - state.vscdb
  - cursor聊天
  - 对话迁移
  - 聊天分类
  - 上下文召回
  - 历史召回
  - 自动归档
version: 2.1
updated: 2026-03-20
heat: 🔴 热
```

## 一句话

卡若 AI 聊天记录一律存 **MongoDB**（karuo_site），实时从库读取/召回；**每次对话结束自动同步并优化迭代**（智能分类+标签+摘要）+ 上下文召回 + 查询导出；**MongoDB 不可用时从本地 fallback 读取最近对话**。

---

## Capabilities

| 能力 | 说明 |
|:---|:---|
| **实时同步与优化迭代** | 每次对话结束时自动同步到MongoDB，智能项目分类、标签提取、摘要生成 |
| **自动归档** | 批量扫描新增对话并归档（备选方案） |
| **上下文召回** | 新建对话时从 MongoDB 匹配相关历史对话，注入上下文；MongoDB 不可用时从 fallback/recent_chats_fallback.json 召回 |
| **批量迁移** | 从 Cursor state.vscdb + agent-transcripts 批量导入 |
| **全文检索** | 按项目、时间、关键词搜索历史对话 |
| **导入导出** | JSON 格式导出/导入，跨实例迁移 |
| **安全清理** | 确认 MongoDB 已备份后清理 state.vscdb 释放空间 |

---

## MongoDB 存储结构

数据库: `karuo_site` | 集合全中文

### 集合: `对话记录`

| 字段 | 类型 | 说明 |
|:---|:---|:---|
| 对话ID | string | 唯一标识 |
| 名称 | string | 对话名称 |
| 项目 | string | 自动分类的项目 |
| 标签 | array | 用户自定义标签 |
| 创建时间 | datetime | |
| 更新时间 | datetime | |
| 消息数量 | int | |
| 是否Agent | bool | |
| 首条消息 | string | 第一条用户消息摘要 |
| 来源 | string | state.vscdb / agent-transcript / 手动归档 |
| 关联文件 | array | 涉及的文件路径 |

### 集合: `消息内容`

| 字段 | 类型 | 说明 |
|:---|:---|:---|
| 对话ID | string | 关联对话 |
| 消息ID | string | 唯一标识 |
| 类型 | int | 1=用户, 2=AI |
| 角色 | string | 用户/AI |
| 内容 | string | 消息文本 |
| 创建时间 | datetime | |
| 工具调用数 | int | |
| 代码块数 | int | |

### 集合: `项目分类`

| 字段 | 类型 | 说明 |
|:---|:---|:---|
| 名称 | string | 项目名 |
| 对话数 | int | |

### 项目分类规则（15 类）

卡若AI、Soul创业、存客宝、玩值电竞、数据处理、神射手、上帝之眼、服务器、设备管理、**群晖NAS**、飞书、**微信管理**、工具维护、个人、开发 → 其余归「未分类」。关键词持续扩展见各脚本内 `项目分类规则`，定期可执行 `query_chat_history.py --reclassify` 优化未分类数量。

---

## Usage

### 对话结束时 — 实时同步（推荐）

```bash
# 实时同步当前对话（每次对话结束自动调用，智能优化）
python3 脚本/realtime_chat_sync.py

# 指定对话ID同步
python3 脚本/realtime_chat_sync.py --current-conversation-id <对话ID>

# 优化分类规则（分析未分类对话，建议新关键词）
python3 脚本/realtime_chat_sync.py --optimize-classification

# 查看统计
python3 脚本/realtime_chat_sync.py --stats
```

### 对话结束时 — 批量归档（备选）

```bash
# 增量扫描 state.vscdb 新对话
python3 脚本/auto_archive.py --scan-new

# 手动归档指定对话
python3 脚本/auto_archive.py --id "对话ID" --name "名称" --project "项目" --summary "摘要"
```

### 新建对话时 — 上下文召回

```bash
# 根据用户输入匹配历史对话
python3 脚本/context_recall.py "用户的问题关键词"

# 限定项目 + 详细内容
python3 脚本/context_recall.py "部署问题" --project "存客宝" --detail

# JSON 格式输出（供程序调用）
python3 脚本/context_recall.py "飞书日志" --json
```

### 查询

```bash
python3 脚本/query_chat_history.py --stats
python3 脚本/query_chat_history.py --search "关键词"
python3 脚本/query_chat_history.py --project "Soul创业"
python3 脚本/query_chat_history.py --since 2026-03-01
python3 脚本/query_chat_history.py --conversation <对话ID>
python3 脚本/query_chat_history.py --list
python3 脚本/query_chat_history.py --reclassify
python3 脚本/query_chat_history.py --tag <对话ID> "标签"
```

### 迁移

```bash
python3 脚本/migrate_cursor_to_mongo.py --full                   # 全量
python3 脚本/migrate_cursor_to_mongo.py                          # 增量
python3 脚本/migrate_cursor_to_mongo.py --full --include-transcripts  # 全量+transcripts
```

### 导入导出

```bash
python3 脚本/export_import_chats.py export -o ~/备份/chats.json
python3 脚本/export_import_chats.py export --project "卡若AI" -o ~/备份/karuo.json
python3 脚本/export_import_chats.py import -i ~/备份/chats.json
```

### 安全清理

```bash
python3 脚本/cleanup_statedb.py --days 30                        # dry-run
python3 脚本/cleanup_statedb.py --days 30 --execute --backup --vacuum  # 实际执行
```

---

## 自动触发规则

### 对话结束时（写入 Cursor rules）

每次对话最后一步（强制执行）：
1. `python3 脚本/realtime_chat_sync.py` - 实时同步当前对话到MongoDB，自动优化分类、提取标签、生成摘要
2. 如需要扫描所有新对话：`python3 脚本/auto_archive.py --scan-new`

### 新建对话时（写入 Cursor rules）

对话开始时，如果用户问题与历史对话可能相关：
1. `python3 脚本/context_recall.py "用户问题关键词" --limit 3`
2. 将召回结果作为参考上下文

### 实时同步与优化迭代

**核心机制**：`realtime_chat_sync.py` 在每次对话结束时自动调用，实现：
- ✅ 实时写入MongoDB（对话记录+消息内容）
- ✅ 智能项目分类（基于文件路径、名称、内容的多维度匹配）
- ✅ 自动标签提取（基于关键词和项目类型）
- ✅ 对话摘要生成（提取用户前3条消息关键信息）
- ✅ 分类规则优化（定期分析未分类对话，建议新关键词）

---

## Files

| 文件 | 功能 |
|:---|:---|
| `SKILL.md` | 技能说明 |
| `脚本/migrate_cursor_to_mongo.py` | 批量迁移 |
| `脚本/query_chat_history.py` | 查询工具 |
| `脚本/realtime_chat_sync.py` | **实时同步与优化迭代**（每次对话结束自动调用，智能分类+标签+摘要） |
| `脚本/auto_archive.py` | 自动归档（批量扫描新增对话） |
| `脚本/context_recall.py` | 上下文召回（Mongo 不可用时读 fallback） |
| `脚本/chat_fallback.py` | 本地 fallback 读写（MongoDB 不可用时最近对话） |
| `fallback/recent_chats_fallback.json` | 最近 N 条对话摘要（由 realtime_chat_sync 写入） |
| `脚本/export_import_chats.py` | 导入导出 |
| `脚本/cleanup_statedb.py` | 安全清理 |
| `脚本/export_chat_by_name.py` | 按名称导出：从 MongoDB 导出指定名称的 Agent 对话为 Markdown，输出到 `导出/` |

## Dependencies

- Python 3.10+, pymongo, SQLite3（系统自带）
- MongoDB 6.0+（本机唯一实例 27017）
