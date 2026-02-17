---
name: 本地模型
description: Ollama/Qwen本地AI模型部署与调用
triggers: ollama、qwen、本地AI、本地模型
owner: 火种
group: 火
version: "1.0"
updated: "2026-02-16"
---

# 本地模型管理

> **管理员**：卡火（火）  
> **口头禅**："让我想想..."  
> **职责**：管理本地AI模型，提供离线推理、代码辅助、语义搜索能力

---

## 🔥 快速开始

```python
# 所有助手都可以这样调用
import sys
sys.path.append("/Users/karuo/Documents/个人/卡若AI")
from 运营中枢.local_llm import summarize, classify, generate_questions

# 或者直接导入SDK
sys.path.append("/Users/karuo/Documents/个人/卡若AI/04_卡火（火）/本地模型/scripts")
from local_llm_sdk import summarize, check_service
```

---

## 📢 使用提醒机制

### 自动提醒

当卡若AI使用本地模型时，会**自动显示使用提醒**：

```
🔥 [本地模型] 正在使用本地AI处理...
├─ 模型：卡若-轻量 (qwen2.5:0.5b)
├─ 任务：文本摘要
├─ 状态：离线可用 | CPU控制在30%
└─ 响应预计：3-10秒
```

### 控制提醒显示

```python
from 运营中枢.local_llm import summarize

# 默认：在控制台打印提醒
result = summarize("文本内容")

# 关闭控制台打印，但返回值中仍包含提醒
result = summarize("文本内容", with_notice=True)  # 结果包含提醒前缀
```

### 获取提醒文本

```python
from 运营中枢.local_llm import get_usage_notice_text, format_response_with_notice

# 获取提醒文本
notice = get_usage_notice_text("qwen2.5:0.5b", "summarize")
# 输出: 🔥 [本地模型] 卡若-轻量 | 文本摘要 | 离线可用 | CPU≤30%

# 格式化带提醒的响应
result = get_llm().generate("问题", task_type="quick_answer")
formatted = format_response_with_notice(result)
```

### 资源控制参数

| 参数 | 值 | 说明 |
|:---|:---|:---|
| `MAX_CONCURRENT_REQUESTS` | 2 | 最大并发请求数 |
| `REQUEST_INTERVAL` | 0.5秒 | 请求间隔 |
| `MAX_INPUT_LENGTH` | 4000字符 | 最大输入长度 |
| `CPU_TARGET` | 30% | CPU使用目标 |

---

## 🖥️ 在Cursor中使用本地模型（终极方案）

### ✅ 已验证可行！

通过Cloudflare隧道，可以让Cursor使用本地Ollama模型！

### 🚀 一键启动

```bash
# 运行启动脚本
cd /Users/karuo/Documents/个人/卡若AI/04_卡火（火）/本地模型/scripts
./start_cursor_tunnel.sh
```

脚本会：
1. 启动Ollama服务（配置允许外部访问）
2. 创建Cloudflare隧道
3. 输出隧道URL

### 📋 Cursor配置步骤

1. **运行启动脚本**，获取隧道URL（类似 `https://xxx.trycloudflare.com`）

2. **打开Cursor Settings** (Cmd+,)

3. **搜索 "OpenAI"** 找到以下设置：

   | 设置项 | 填入值 |
   |:---|:---|
   | **OpenAI API Key** | `ollama`（任意值） |
   | **Override OpenAI Base URL** | `https://xxx.trycloudflare.com/v1` |

4. **在模型选择器中选择任意OpenAI模型**（如gpt-4）
   - 实际请求会被重定向到你的本地Ollama

### 当前隧道URL（需重新生成）

```
https://spoke-mainly-implies-individuals.trycloudflare.com/v1
```

**注意**：隧道URL每次启动脚本会变化，需要重新配置。

### ⚠️ 注意事项

1. **保持终端运行**：启动脚本后不要关闭终端
2. **URL会变**：每次重启脚本，隧道URL会变化
3. **免费限制**：Cloudflare免费隧道无SLA保证
4. **选择OpenAI模型**：在Cursor中选gpt-4，实际用的是本地qwen2.5

### 🔧 手动启动（不用脚本）

```bash
# 步骤1：启动Ollama（允许外部访问）
OLLAMA_HOST=0.0.0.0:11434 OLLAMA_ORIGINS="*" ollama serve &

# 步骤2：创建隧道
cloudflared tunnel --url http://localhost:11434

# 步骤3：复制输出的URL到Cursor设置
```

---

## 📱 其他使用方式

### 方式1：在代码/终端中调用

```python
import sys
sys.path.append("/Users/karuo/Documents/个人/卡若AI")
from 运营中枢.local_llm import summarize, generate_questions

result = summarize("你的长文本...")
```

### 方式2：命令行快速问答

```bash
ollama run qwen2.5:0.5b "解释这段代码的作用"
```

---

## 一、已安装模型清单

| 模型 | 大小 | 参数量 | 上下文 | 用途 | 状态 |
|:---|:---|:---|:---|:---|:---|
| qwen2.5:0.5b | 397MB | 494M | 32K | 轻量对话、快速响应 | ✅ 可用 |
| qwen2.5:1.5b | 986MB | 1.5B | 32K | 中等对话、代码辅助 | ✅ 可用 |
| nomic-embed-text | 274MB | 137M | 8K | 文本向量化、语义搜索 | ✅ 可用 |

**总占用**：约 1.66GB

---

## 二、模型能力说明

### 2.1 qwen2.5:0.5b（轻量版）
- **架构**：Qwen2，阿里云开发
- **量化**：Q4_K_M
- **能力**：文本生成 + 工具调用
- **适用场景**：
  - 快速问答（响应<2秒）
  - 简单文本处理
  - 批量任务（节省资源）
  - 离线时的备用AI

### 2.2 qwen2.5:1.5b（标准版）
- **架构**：Qwen2，阿里云开发
- **量化**：Q4_K_M
- **能力**：文本生成 + 工具调用
- **适用场景**：
  - 代码生成/解释
  - 复杂对话
  - 文档摘要
  - 需要更高质量输出时

### 2.3 nomic-embed-text（嵌入模型）
- **架构**：Nomic-BERT
- **量化**：F16（全精度）
- **能力**：文本向量化
- **适用场景**：
  - RAG系统（检索增强生成）
  - 语义搜索
  - 文档相似度计算
  - 知识库构建

---

## 三、调用方式

### 3.1 命令行调用

```bash
# 对话模式
ollama run qwen2.5:0.5b

# 单次问答
ollama run qwen2.5:1.5b "解释这段代码的作用"

# 查看已安装模型
ollama list

# 查看模型详情
ollama show qwen2.5:0.5b
```

### 3.2 API调用（HTTP）

**服务地址**：http://localhost:11434

#### 文本生成
```bash
curl http://localhost:11434/api/generate -d '{
  "model": "qwen2.5:0.5b",
  "prompt": "你的问题",
  "stream": false
}'
```

#### 对话模式
```bash
curl http://localhost:11434/api/chat -d '{
  "model": "qwen2.5:1.5b",
  "messages": [
    {"role": "user", "content": "你好"}
  ],
  "stream": false
}'
```

#### 文本向量化
```bash
curl http://localhost:11434/api/embeddings -d '{
  "model": "nomic-embed-text",
  "prompt": "要向量化的文本"
}'
```

### 3.3 Python调用

```python
import requests

# 配置
OLLAMA_URL = "http://localhost:11434"

def chat(prompt, model="qwen2.5:0.5b"):
    """简单对话"""
    response = requests.post(
        f"{OLLAMA_URL}/api/generate",
        json={"model": model, "prompt": prompt, "stream": False}
    )
    return response.json()["response"]

def embed(text):
    """文本向量化"""
    response = requests.post(
        f"{OLLAMA_URL}/api/embeddings",
        json={"model": "nomic-embed-text", "prompt": text}
    )
    return response.json()["embedding"]

# 使用示例
answer = chat("解释Python的装饰器")
vector = embed("这是一段需要向量化的文本")
```

---

## 四、典型应用场景

### 场景1：离线代码助手
```bash
# 当没有网络时，用本地模型辅助编码
ollama run qwen2.5:1.5b "写一个Python快速排序函数"
```

### 场景2：批量文本处理
```python
# 批量处理大量文本，节省API费用
texts = ["文本1", "文本2", "文本3"]
results = [chat(f"总结：{t}", model="qwen2.5:0.5b") for t in texts]
```

### 场景3：本地RAG系统
```python
# 构建知识库语义搜索
documents = ["文档1内容", "文档2内容", "文档3内容"]
vectors = [embed(doc) for doc in documents]
# 存储vectors到向量数据库（如Chroma、Milvus）
```

### 场景4：快速原型验证
```bash
# 在接入云端API前，先用本地模型验证prompt效果
ollama run qwen2.5:1.5b "按ISSMA框架写一篇私域运营文章"
```

---

## 五、性能基准

在MacBook Pro (Apple Silicon) 上测试：

| 模型 | 首次加载 | 响应速度 | 内存占用 |
|:---|:---|:---|:---|
| qwen2.5:0.5b | ~3秒 | ~50 tokens/s | ~500MB |
| qwen2.5:1.5b | ~5秒 | ~30 tokens/s | ~1.2GB |
| nomic-embed-text | ~2秒 | ~100ms/文本 | ~400MB |

---

## 六、服务管理

### 启动服务
```bash
ollama serve  # 默认端口11434
```

### 检查状态
```bash
curl http://localhost:11434/api/tags
```

### 停止服务
```bash
# macOS
pkill ollama
```

### 安装新模型
```bash
ollama pull llama3.2:1b   # 拉取新模型
ollama pull deepseek-r1:1.5b  # 推理模型
```

### 删除模型
```bash
ollama rm qwen2.5:0.5b
```

---

## 七、与云端API能力对比

### 7.1 总体能力对比

| 维度 | 🔥 卡若-轻量 | 🔥 卡若-标准 | Opus 4.5 | Sonnet 4.5 |
|:---|:---|:---|:---|:---|
| **参数量** | 494M | 1.5B | ~1000B+ | ~100B+ |
| **智能水平** | ⭐⭐ (20%) | ⭐⭐⭐ (35%) | ⭐⭐⭐⭐⭐ (100%) | ⭐⭐⭐⭐ (85%) |
| **代码能力** | 简单代码 | 中等代码 | 复杂系统级 | 复杂代码 |
| **中文理解** | 良好 | 很好 | 优秀 | 优秀 |
| **响应速度** | ~50 tokens/s | ~30 tokens/s | 网络依赖 | 网络依赖 |
| **费用** | 🆓 免费 | 🆓 免费 | 💰 $15/M | 💰 $3/M |
| **离线可用** | ✅ | ✅ | ❌ | ❌ |
| **隐私** | ✅ 完全本地 | ✅ 完全本地 | ⚠️ 上传云端 | ⚠️ 上传云端 |

### 7.2 任务适用性对比

| 任务类型 | 🔥 卡若-轻量 | 🔥 卡若-标准 | Opus 4.5 |
|:---|:---|:---|:---|
| 简单问答 | ✅ 推荐 | ✅ 可用 | 杀鸡用牛刀 |
| 文本摘要 | ✅ 推荐 | ✅ 推荐 | 高质量需求时 |
| 代码解释 | ⚠️ 简单代码 | ✅ 推荐 | 复杂代码 |
| 代码生成 | ❌ 不推荐 | ⚠️ 简单代码 | ✅ 推荐 |
| 复杂推理 | ❌ | ⚠️ 有限 | ✅ 推荐 |
| 长文写作 | ❌ | ⚠️ 一般 | ✅ 推荐 |
| 多轮对话 | ✅ 可用 | ✅ 可用 | ✅ 最佳 |
| 批量处理 | ✅ 强烈推荐 | ✅ 推荐 | 成本高 |
| 离线环境 | ✅ 唯一选择 | ✅ 唯一选择 | ❌ |

### 7.3 使用建议

```
选择模型决策树：
  │
  ├── 离线/无网络 → 卡若-轻量 或 卡若-标准
  │
  ├── 隐私敏感数据 → 卡若-轻量 或 卡若-标准
  │
  ├── 批量任务（>10条）→ 卡若-轻量（免费）
  │
  ├── 简单任务 → 卡若-轻量
  │     ├── 快速问答
  │     ├── 文本摘要
  │     └── 信息提取
  │
  ├── 中等任务 → 卡若-标准
  │     ├── 代码解释
  │     ├── 文档理解
  │     └── 简单代码生成
  │
  └── 复杂任务 → Opus 4.5
        ├── 复杂代码生成
        ├── 系统架构设计
        ├── 深度分析
        └── 创意写作
```

### 7.4 实测对比示例

**测试任务**：解释Python装饰器

| 模型 | 响应时间 | 答案质量 | 费用 |
|:---|:---|:---|:---|
| 🔥 卡若-轻量 | 2秒 | 基本正确，简洁 | 免费 |
| 🔥 卡若-标准 | 5秒 | 正确，有示例 | 免费 |
| Opus 4.5 | 3秒 | 详细，多角度，最佳实践 | ~$0.01 |

---

## 八、推荐使用策略

```
任务判断 → 选择模型
  │
  ├── 简单/批量/离线 → qwen2.5:0.5b（快且省资源）
  ├── 代码/复杂对话 → qwen2.5:1.5b（质量更高）
  ├── 语义搜索/RAG → nomic-embed-text
  └── 高质量要求 → 使用云端API（Gemini/OpenAI）
```

---

## 九、快速脚本

### scripts/ollama_helper.py

```python
#!/usr/bin/env python3
"""Ollama本地模型快速调用工具"""

import requests
import sys

OLLAMA_URL = "http://localhost:11434"

def quick_ask(prompt, model="qwen2.5:0.5b"):
    """快速问答"""
    try:
        r = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={"model": model, "prompt": prompt, "stream": False},
            timeout=60
        )
        return r.json().get("response", "无响应")
    except Exception as e:
        return f"错误: {e}"

def list_models():
    """列出已安装模型"""
    try:
        r = requests.get(f"{OLLAMA_URL}/api/tags")
        models = r.json().get("models", [])
        for m in models:
            print(f"- {m['name']} ({m['details']['parameter_size']})")
    except Exception as e:
        print(f"错误: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法: python ollama_helper.py '你的问题'")
        print("      python ollama_helper.py --list")
        sys.exit(1)
    
    if sys.argv[1] == "--list":
        list_models()
    else:
        print(quick_ask(" ".join(sys.argv[1:])))
```

---

## 十、注意事项

1. **内存管理**：同时运行多个大模型会占用大量内存，建议一次只加载一个
2. **首次加载**：模型首次运行需要加载到内存，耗时较长
3. **服务状态**：确保`ollama serve`在后台运行
4. **模型更新**：定期检查是否有新版本 `ollama pull <模型名>`

---

---

## 十一、与各Skill融合

### 已融合的Skill

| 助手 | Skill | 使用场景 | 调用函数 |
|:---|:---|:---|:---|
| 卡人 | 智能纪要 | 会议要点摘要 | `summarize()` |
| 卡人 | 文档清洗 | 结构识别、信息提取 | `extract_info()` |
| 卡人 | 对话归档 | 对话主题分类 | `classify()` |
| 卡人 | 需求拆解 | 生成追问问题 | `generate_questions()` |
| 卡火 | 智能追问 | 本地生成追问 | `generate_questions()` |
| 卡火 | 读书笔记 | 章节摘要 | `summarize()` |
| 卡资 | 微信管理 | 语义搜索聊天 | `semantic_search()` |

### SDK便捷函数速查

```python
from 运营中枢.local_llm import *

# 文本摘要（智能纪要、读书笔记）
summary = summarize("长文本...", max_words=100)

# 信息提取（个人档案、微信管理）
info = extract_info("文本", "联系方式")

# 文本分类（对话归档、文件整理）
category = classify("文本", ["工作", "生活", "学习"])

# 生成问题（智能追问、需求拆解）
questions = generate_questions("私域运营", count=5)

# 任务分析（任务规划）
steps = analyze_task("搭建私域系统")

# 写作草稿（卡若日记）
draft = write_draft("今天的感悟", style="轻松")

# 语义搜索（微信管理）
results = semantic_search("合作", messages_list, top_k=5)

# 检查服务状态
status = check_service()
```

### 融合原则

```
使用本地模型的条件：
├── 简单任务（摘要、分类、提取）
├── 隐私敏感（聊天记录分析）
├── 批量处理（>10条）
├── 离线环境
└── 可接受80%质量

使用云端API的条件：
├── 复杂任务（代码生成、深度分析）
├── 需要最高质量
└── 创造性写作
```

### 资源控制

```yaml
# 已内置的资源控制
最大并发: 2
请求间隔: 0.5秒
输入截断: 4000字符
预期CPU: 20-30%
```

---

## 十二、目录结构

```
本地模型/
├── SKILL.md                    # 本文件
├── scripts/
│   ├── ollama_helper.py        # 命令行工具
│   └── local_llm_sdk.py        # 统一SDK（⭐核心）
└── references/
    └── Skill融合策略.md        # 各Skill融合方案详解
```

---

## 十三、高级功能（基于Ollama官方最佳实践）

### 13.1 流式响应（Streaming）

**适用场景**：长文本生成、实时对话、用户体验优化

```python
from 运营中枢.local_llm import stream_generate

def on_chunk(chunk: str):
    """实时输出每个chunk"""
    print(chunk, end='', flush=True)

# 流式生成
full_text = stream_generate(
    "写一篇关于AI的文章",
    task_type="write_draft",
    callback=on_chunk
)
```

**优势**：
- 实时反馈，提升用户体验
- 适合长文本生成（用户无需等待）
- 降低感知延迟

---

### 13.2 工具调用（Function Calling）

**适用场景**：需要调用外部工具、API、数据库查询

```python
from 运营中枢.local_llm import function_calling

# 定义工具
tools = [{
    "type": "function",
    "function": {
        "name": "get_weather",
        "description": "获取天气信息",
        "parameters": {
            "type": "object",
            "properties": {
                "city": {"type": "string", "description": "城市名"}
            },
            "required": ["city"]
        }
    }
}]

# 实现函数
def get_weather(city: str) -> str:
    return f"{city}的天气是晴天，25°C"

# 调用
result = function_calling(
    "北京天气怎么样？",
    tools,
    {"get_weather": get_weather}
)

print(result["response"])  # 模型会调用get_weather并返回结果
```

**支持的模型**：Qwen 3, Qwen2.5, Llama 3.1+, Devstral

**融合场景**：
- **iPhone管理**：调用系统API获取设备状态
- **微信管理**：调用数据库查询聊天记录
- **服务器管理**：调用SSH执行命令

---

### 13.3 结构化输出（Structured Output）

**适用场景**：需要固定格式的输出、数据提取、API响应

```python
from 运营中枢.local_llm import structured_output

# 定义JSON Schema
schema = {
    "type": "object",
    "properties": {
        "name": {"type": "string"},
        "age": {"type": "integer"},
        "skills": {
            "type": "array",
            "items": {"type": "string"}
        }
    },
    "required": ["name", "age"]
}

# 提取结构化数据
result = structured_output(
    "张三，25岁，会Python和JavaScript",
    schema,
    temperature=0  # 建议0，确保格式稳定
)

print(result["data"])  # {"name": "张三", "age": 25, "skills": ["Python", "JavaScript"]}
```

**融合场景**：
- **智能追问**：结构化输出追问问题列表
- **读书笔记**：结构化输出五行框架笔记
- **iPhone管理**：结构化输出设备信息

---

### 13.4 多模态支持（图像+文本）

**适用场景**：图像理解、OCR、图像描述、视觉问答

```python
from 运营中枢.local_llm import multimodal_chat

# 需要先安装视觉模型
# ollama pull llava:7b

result = multimodal_chat(
    "这张图片里有什么？",
    images=["/path/to/image.jpg"],
    model="llava:7b"
)

print(result["response"])
```

**支持的模型**：llava:7b, llava:13b, llava:34b, llama3.2（多模态版本）

**融合场景**：
- **iPhone管理**：识别截图中的设备信息
- **读书笔记**：识别书籍封面、图表
- **文档清洗**：OCR识别图片中的文字

---

### 13.5 RAG最佳实践（检索增强生成）

**核心思路**：向量数据库 + 语义搜索 + 本地模型生成

```python
from 运营中枢.local_llm import embed, semantic_search, generate

# 1. 构建知识库（向量化）
documents = [
    "卡若AI是个人数字管家",
    "本地模型支持离线使用",
    "Ollama提供本地LLM能力"
]

# 2. 向量化存储（实际项目中应使用Chroma/Milvus）
vectors = [embed(doc)["embedding"] for doc in documents]

# 3. 语义搜索
query = "卡若AI是什么？"
results = semantic_search(query, documents, top_k=2)

# 4. 使用检索结果生成回答
context = "\n".join([r["text"] for r in results])
prompt = f"基于以下上下文回答问题：\n\n{context}\n\n问题：{query}"
answer = generate(prompt, task_type="quick_answer")
```

**RAG最佳实践**：

1. **文档分块**：将长文档分成有意义的段落（200-500字）
2. **元数据过滤**：添加时间、类别等元数据，先过滤再搜索
3. **重排序**：使用相似度分数+元数据相关性综合排序
4. **上下文管理**：限制检索结果数量，确保在模型上下文窗口内

**融合场景**：
- **微信管理**：RAG搜索聊天记录，生成摘要
- **读书笔记**：RAG搜索历史笔记，关联相关内容
- **智能追问**：RAG搜索历史对话，避免重复问题

---

### 13.6 异步调用（Async）

**适用场景**：并发处理多个请求、Web服务、批量任务

```python
import asyncio
from ollama import AsyncClient

async def async_chat():
    client = AsyncClient()
    response = await client.chat(
        'qwen2.5:1.5b',
        messages=[{'role': 'user', 'content': '你好'}]
    )
    return response['message']['content']

# 并发处理
async def batch_process():
    tasks = [async_chat() for _ in range(5)]
    results = await asyncio.gather(*tasks)
    return results

# 运行
results = asyncio.run(batch_process())
```

**注意**：需要安装 `ollama` Python包（`pip install ollama`）

---

## 十四、与相关Skill的融合方案

### 14.1 iPhone管理 + 本地模型

**融合点**：
1. **设备状态分析**：使用本地模型分析设备日志，识别异常
2. **截图识别**：使用多模态模型识别截图中的设备信息
3. **自动化决策**：使用工具调用，根据设备状态自动执行操作

**示例代码**：
```python
from 运营中枢.local_llm import multimodal_chat, function_calling

# 识别截图中的设备信息
def analyze_device_screenshot(image_path: str):
    result = multimodal_chat(
        "识别这张截图中的iPhone型号、iOS版本、电池电量",
        images=[image_path],
        model="llava:7b"
    )
    return result["response"]

# 工具调用：根据状态自动操作
tools = [{
    "type": "function",
    "function": {
        "name": "connect_iphone_network",
        "description": "连接iPhone网络",
        "parameters": {
            "type": "object",
            "properties": {
                "method": {"type": "string", "enum": ["usb", "hotspot"]}
            }
        }
    }
}]

def auto_connect_iphone():
    status = get_iphone_status()  # 获取设备状态
    result = function_calling(
        f"根据以下状态决定如何连接iPhone：{status}",
        tools,
        {"connect_iphone_network": connect_iphone_network}
    )
    return result["response"]
```

---

### 14.2 智能追问 + 本地模型

**融合点**：
1. **本地生成追问**：使用本地模型生成追问问题，降低API成本
2. **结构化输出**：使用结构化输出，确保追问问题格式统一
3. **历史关联**：使用RAG搜索历史对话，避免重复问题

**示例代码**：
```python
from 运营中枢.local_llm import structured_output, semantic_search

# 结构化输出追问问题
def generate_structured_questions(topic: str):
    schema = {
        "type": "object",
        "properties": {
            "questions": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "question": {"type": "string"},
                        "category": {"type": "string"},
                        "priority": {"type": "integer"}
                    }
                }
            }
        }
    }
    
    prompt = f"针对「{topic}」生成5个追问问题，按CRITIC模型分类"
    result = structured_output(prompt, schema)
    return result["data"]["questions"]

# RAG搜索历史对话
def avoid_duplicate_questions(new_question: str, history: List[str]):
    results = semantic_search(new_question, history, top_k=3)
    if results and results[0]["score"] > 0.8:
        return None  # 问题重复，不生成
    return new_question
```

---

### 14.3 读书笔记 + 本地模型

**融合点**：
1. **章节摘要**：使用本地模型生成章节摘要
2. **五行结构提取**：使用结构化输出，提取五行框架内容
3. **多模态识别**：识别书籍封面、图表、公式

**示例代码**：
```python
from 运营中枢.local_llm import summarize, structured_output, multimodal_chat

# 章节摘要
def summarize_chapter(chapter_text: str):
    return summarize(chapter_text, max_words=200)

# 五行结构提取
def extract_wuxing_structure(book_text: str):
    schema = {
        "type": "object",
        "properties": {
            "金": {"type": "object", "properties": {"定位": "string", "角色": "string"}},
            "水": {"type": "object", "properties": {"经历": "array", "路径": "string"}},
            "木": {"type": "object", "properties": {"方法": "array", "工具": "array"}},
            "火": {"type": "object", "properties": {"认知": "array", "判断": "string"}},
            "土": {"type": "object", "properties": {"系统": "string", "沉淀": "string"}}
        }
    }
    
    prompt = f"从以下书籍内容中提取五行结构：\n\n{book_text}"
    result = structured_output(prompt, schema)
    return result["data"]

# 识别书籍封面
def identify_book_cover(image_path: str):
    result = multimodal_chat(
        "识别这本书的标题、作者、出版社",
        images=[image_path],
        model="llava:7b"
    )
    return result["response"]
```

---

## 变更日志

| 日期 | 变更内容 |
|:---|:---|
| 2026-01-28 | 🚀 **重大更新**：添加流式响应、工具调用、结构化输出、多模态支持 |
| 2026-01-28 | 📚 添加RAG最佳实践和融合方案（iPhone管理、智能追问、读书笔记） |
| 2026-01-28 | 📢 添加使用提醒机制：调用本地模型时自动显示模型、任务、状态信息 |
| 2026-01-28 | 🎉 **终极方案**：通过Cloudflare隧道实现Cursor集成本地模型 |
| 2026-01-28 | 添加一键启动脚本 `start_cursor_tunnel.sh` |
| 2026-01-28 | 添加与Opus等云端模型的能力对比 |
| 2026-01-28 | 创建统一SDK，支持所有Skill调用 |
| 2026-01-28 | 分析34个Skill，规划融合策略 |
| 2026-01-28 | 初始创建，记录3个已安装模型 |
