# 卡若AI 共享模块

> 所有五位AI助手都可以使用的公共能力

---

## 📦 模块列表

| 模块 | 说明 | 管理员 |
|:---|:---|:---|
| `task_router` | 🧠 智能任务路由（自动选择本地/高级模型） | 卡若AI |
| `local_llm` | 本地Ollama模型调用SDK | 卡火（火） |

---

## 🧠 task_router - 智能任务路由（重要！）

### 核心功能

**每次对话自动判断**：根据任务难度选择本地模型或高级模型

```
用户任务 → 难度评估 → 模型选择
     │
     ├── ≤3分（简单）→ 🔥 本地模型（免费、快速）
     └── >3分（复杂）→ 🚀 高级模型（Claude/Opus）
```

### 快速开始

```python
import sys
sys.path.append("/Users/karuo/Documents/个人/卡若AI")
from _共享模块.task_router import auto_route, should_use_local_model

# 一键自动路由
result = auto_route("帮我总结这段文字")
print(result)
# {'score': 1, 'use_local': True, 'model': 'qwen2.5:0.5b', ...}

# 判断是否使用本地模型
use_local, model = should_use_local_model("帮我写系统架构")
# (False, 'Claude/Opus（高级模型）')
```

### 难度评估标准（5分制）

| 难度 | 分数 | 模型选择 | 典型任务 |
|:---|:---|:---|:---|
| 简单 | 1-2分 | 🔥 qwen2.5:0.5b | 摘要、分类、提取、问答 |
| 中等 | 3分 | 🔥 qwen2.5:1.5b | 代码解释、任务拆解 |
| 复杂 | 4-5分 | 🚀 Claude/Opus | 代码生成、架构设计、深度分析 |

### 本地模型适用场景

```
✅ 文本摘要、信息提取、文本分类
✅ 生成追问问题、任务拆解
✅ 简单代码解释（非生成）
✅ 批量处理（>10条）
✅ 数据分析决策（如商品选择）
✅ 离线/隐私敏感场景
```

### 高级模型适用场景

```
🚀 复杂代码生成/系统架构
🚀 深度分析、长推理链
🚀 创意写作、商业方案
🚀 多步骤复杂任务
```

---

## 🤖 local_llm - 本地模型SDK

### 快速开始

```python
import sys
sys.path.append("/Users/karuo/Documents/个人/卡若AI")
from _共享模块.local_llm import (
    summarize,           # 文本摘要
    extract_info,        # 信息提取
    classify,            # 文本分类
    generate_questions,  # 生成问题
    analyze_task,        # 任务分析
    write_draft,         # 写作草稿
    semantic_search,     # 语义搜索
    check_service,       # 检查服务
)
```

### 功能速查

| 函数 | 用途 | 示例 |
|:---|:---|:---|
| `summarize(text, max_words)` | 生成摘要 | `summarize("长文本...", 100)` |
| `extract_info(text, info_type)` | 提取信息 | `extract_info("文本", "联系方式")` |
| `classify(text, categories)` | 文本分类 | `classify("文本", ["工作", "生活"])` |
| `generate_questions(topic, count)` | 生成问题 | `generate_questions("私域运营", 5)` |
| `analyze_task(task_desc)` | 任务拆解 | `analyze_task("搭建会员系统")` |
| `write_draft(topic, style)` | 写作草稿 | `write_draft("今日感悟", "轻松")` |
| `semantic_search(query, docs, top_k)` | 语义搜索 | `semantic_search("合作", msgs, 5)` |
| `check_service()` | 检查状态 | `check_service()` |

### 已安装模型

| 模型 | 大小 | 用途 |
|:---|:---|:---|
| qwen2.5:0.5b | 397MB | 轻量对话、快速响应 |
| qwen2.5:1.5b | 986MB | 代码辅助、复杂对话 |
| nomic-embed-text | 274MB | 文本向量化、语义搜索 |

### 资源控制

SDK已内置资源控制，无需手动处理：

- **最大并发**：2个请求
- **请求间隔**：0.5秒
- **CPU使用**：控制在30%以内

---

## 📁 目录结构

```
_共享模块/
├── README.md               # 本文件
├── task_router/
│   └── __init__.py         # 🧠 智能任务路由模块
├── local_llm/
│   └── __init__.py         # 本地模型SDK入口
└── memory/
    └── __init__.py         # 记忆管理模块
```

---

## 🔗 详细文档

- 完整SDK文档：`04_卡火（火）/_团队成员/火种/本地模型/SKILL.md`
- Skill融合策略：`04_卡火（火）/_团队成员/火种/本地模型/references/Skill融合策略.md`
- 工作台规则：`.cursor/rules/karuo-ai.mdc`

---

## 📝 更新日志

| 日期 | 变更 |
|:---|:---|
| 2026-01-29 | 🧠 新增 task_router 模块：智能任务难度评估与模型自动分配 |
| 2026-01-28 | 创建共享模块目录，添加local_llm |
