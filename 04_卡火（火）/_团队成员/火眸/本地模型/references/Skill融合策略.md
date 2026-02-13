# 本地模型与各Skill融合策略

> 本文档说明各个Skill如何利用本地模型增强能力
> 更新时间：2026-01-28

---

## 一、融合原则

### 1.1 何时使用本地模型

| 条件 | 使用本地模型 | 使用云端API |
|:---|:---|:---|
| 任务复杂度 | 简单、模板化 | 复杂、创造性 |
| 隐私要求 | 敏感数据 | 非敏感 |
| 网络状态 | 离线/弱网 | 在线 |
| 批量任务 | 大批量（>10条） | 少量 |
| 质量要求 | 可接受80%质量 | 需要最高质量 |

### 1.2 资源控制策略

```python
# 已在SDK中实现
MAX_CONCURRENT_REQUESTS = 2    # 最大并发2
REQUEST_INTERVAL = 0.5         # 请求间隔0.5秒
MAX_INPUT_LENGTH = 4000        # 输入截断4000字符

# 预期CPU使用：20-30%
```

### 1.3 模型选择策略

```
任务判断 → 自动路由
  │
  ├── 摘要/提取/分类/问答 → qwen2.5:0.5b（轻量快速）
  ├── 分析/代码/写作/拆解 → qwen2.5:1.5b（质量优先）
  └── 搜索/相似度/RAG    → nomic-embed-text
```

---

## 二、各助手融合方案

### 2.1 卡人（水）- 信息流程管理者

| Skill | 融合场景 | 调用函数 | 优先级 |
|:---|:---|:---|:---|
| **智能纪要** | 自动生成会议要点摘要 | `summarize()` | ⭐⭐⭐ |
| **文档清洗** | 识别文档结构、提取关键信息 | `extract_info()` | ⭐⭐⭐ |
| **对话归档** | 对话主题分类、自动打标签 | `classify()` | ⭐⭐ |
| **任务规划** | 需求理解、任务拆解 | `analyze_task()` | ⭐⭐ |
| **需求拆解** | 生成追问问题、分析需求 | `generate_questions()` | ⭐⭐⭐ |
| **个人档案生成器** | 从对话提取关键信息 | `extract_info()` | ⭐⭐ |
| **文件整理** | 文件内容分类 | `classify()` | ⭐ |
| **飞书管理** | 内容摘要后上传 | `summarize()` | ⭐ |

**示例代码**（智能纪要）：
```python
from local_llm_sdk import summarize, extract_info

# 生成会议摘要
meeting_text = "..."
summary = summarize(meeting_text, max_words=200)

# 提取行动项
actions = extract_info(meeting_text, "待办事项和负责人")
```

### 2.2 卡火（火）- 技术研发优化者

| Skill | 融合场景 | 调用函数 | 优先级 |
|:---|:---|:---|:---|
| **智能追问** | 本地生成追问问题 | `generate_questions()` | ⭐⭐⭐ |
| **读书笔记** | 章节摘要、观点提取 | `summarize()`, `extract_info()` | ⭐⭐ |
| **卡若日记写作** | 生成初稿 | `write_draft()` | ⭐⭐ |
| **代码修复** | 解释错误信息（简单场景） | `generate()` | ⭐ |
| **全栈开发** | 代码注释生成 | `generate()` | ⭐ |

**示例代码**（智能追问）：
```python
from local_llm_sdk import generate_questions

# 生成追问问题
topic = "私域流量运营策略"
questions = generate_questions(topic, count=5)
# ['目标用户画像是什么？', '转化路径如何设计？', ...]
```

### 2.3 卡资（金）- 基础设施管理者

| Skill | 融合场景 | 调用函数 | 优先级 |
|:---|:---|:---|:---|
| **微信管理** | 聊天记录语义搜索 | `semantic_search()` | ⭐⭐⭐ |
| **项目生成** | 需求分析、模板匹配 | `classify()`, `analyze_task()` | ⭐⭐ |
| **服务器管理** | 日志摘要 | `summarize()` | ⭐ |

**示例代码**（微信管理-语义搜索）：
```python
from local_llm_sdk import semantic_search

# 在聊天记录中搜索相关内容
query = "讨论合作的对话"
messages = ["消息1", "消息2", "消息3", ...]
results = semantic_search(query, messages, top_k=5)
# [{"index": 2, "text": "消息3", "score": 0.85}, ...]
```

### 2.4 卡木（木）- 产品内容创造者

| Skill | 融合场景 | 调用函数 | 优先级 |
|:---|:---|:---|:---|
| **视频切片** | 转录文本摘要 | `summarize()` | ⭐⭐ |
| **网站逆向分析** | API说明生成 | `write_draft()` | ⭐ |

### 2.5 卡土（土）- 商业复制裂变者

| Skill | 融合场景 | 调用函数 | 优先级 |
|:---|:---|:---|:---|
| **技能工厂** | Skill描述生成 | `write_draft()` | ⭐ |
| **商业工具集** | 商业信息提取 | `extract_info()` | ⭐ |

---

## 三、融合实现方案

### 3.1 SDK统一入口

所有Skill通过统一SDK调用：

```python
# 在任意Skill的scripts目录中
import sys
sys.path.append("/Users/karuo/Documents/个人/卡若AI/04_卡火（火）/本地模型/scripts")

from local_llm_sdk import (
    summarize,           # 文本摘要
    extract_info,        # 信息提取
    classify,            # 文本分类
    generate_questions,  # 生成问题
    analyze_task,        # 任务分析
    write_draft,         # 写作草稿
    semantic_search,     # 语义搜索
    check_service        # 检查服务
)

# 使用前检查服务
status = check_service()
if not status["running"]:
    print("本地模型不可用，将使用云端API")
```

### 3.2 降级策略

```python
def smart_summarize(text):
    """智能摘要：本地优先，云端降级"""
    from local_llm_sdk import summarize, check_service
    
    # 检查本地服务
    if check_service()["running"]:
        result = summarize(text)
        if result:  # 本地成功
            return result
    
    # 降级到云端（Gemini）
    return call_gemini_api(text)  # 需要实现
```

### 3.3 批量任务限流

```python
from local_llm_sdk import summarize
import time

texts = ["文本1", "文本2", ..., "文本100"]
results = []

for i, text in enumerate(texts):
    result = summarize(text)
    results.append(result)
    
    # 每处理10条休息2秒，控制资源
    if (i + 1) % 10 == 0:
        time.sleep(2)
```

---

## 四、优先融合的Skill（第一批）

根据使用频率和效果，建议优先融合：

| 顺序 | Skill | 融合内容 | 预期效果 |
|:---|:---|:---|:---|
| 1 | **智能纪要** | 自动生成要点摘要 | 减少云端API调用50% |
| 2 | **智能追问** | 本地生成追问问题 | 离线可用，响应更快 |
| 3 | **需求拆解** | 任务分析与拆解 | 本地快速分析 |
| 4 | **文档清洗** | 结构识别、信息提取 | 批量处理省费用 |
| 5 | **微信管理** | 聊天语义搜索 | 隐私保护，本地搜索 |

---

## 五、资源监控

### 5.1 CPU使用监控

```bash
# 监控ollama进程CPU使用
while true; do
    ps aux | grep ollama | grep -v grep | awk '{print $3"%"}'
    sleep 5
done
```

### 5.2 建议配置

```yaml
# 保持CPU使用在30%以内的配置
concurrent_requests: 2
request_interval: 0.5s
batch_rest_every: 10
batch_rest_duration: 2s
max_input_length: 4000
```

---

## 六、效果对比

| 任务 | 本地模型 | 云端API | 推荐 |
|:---|:---|:---|:---|
| 100字摘要 | 1-2秒，免费 | 0.5秒，$0.001 | 本地 |
| 代码生成 | 质量60% | 质量95% | 云端 |
| 语义搜索 | 本地，隐私 | 需上传 | 本地 |
| 复杂写作 | 质量70% | 质量90% | 云端 |
| 批量分类 | 免费 | 成本累积 | 本地 |

---

## 变更日志

| 日期 | 变更 |
|:---|:---|
| 2026-01-28 | 初始版本：分析34个Skill，规划融合方案 |
