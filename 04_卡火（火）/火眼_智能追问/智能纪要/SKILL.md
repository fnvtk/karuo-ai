---
name: 智能纪要
description: 派对/会议纪要·聊天结构长图内驱
triggers: 派对纪要、会议纪要、智能会议图片、长图纪要
owner: 火眼
group: 火
version: "1.1"
updated: "2026-02-18"
---

# 智能纪要（聊天结构 → 长图）

> 纪要产出**一律按「聊天结构」**生成**智能会议长图**用的内驱，不按文档/脚本结构，不先出 HTML，**直接生成可做长图的内容**。

---

## ⚠️ 产出规范（必守）

| 要求 | 说明 |
|:---|:---|
| **结构** | 用**聊天结构**（对话/时间线/谁说了什么/重点提炼），不用文档式六大区块脚本结构 |
| **输出** | 直接生成**长图内驱**（内容骨架），用于智能会议图片；**不生成 HTML**，**不依赖 Python 脚本**生成正文 |
| **形式** | 类似 STMA 长图：一屏一屏、气泡/时间线式，适合直接做成一张长图 |

---

## 📐 聊天结构·长图内驱格式

每次总结按下面结构**直接输出**（Agent 在对话中给出即可，无需跑脚本）：

```
【标题】
日期｜主题（例：2月17日｜过年第一个红包发给谁×人生三贵人）

【元信息】
时长 | 人数 | 场次/地点

【聊天流】（按时间或话题顺序，一条一条）
[时间] 谁 / 标签： 一句话摘要或金句
→ 重点： 结论/启示（可选）

[时间] 谁 / 标签： …
→ 重点： …

【金句/结论】（3～5 条，可单独列出）
· …

【下次/行动】
· …
```

- **谁/标签**：可用 用户观点 / AI思考 / 专家洞察 / 主持人 / 群友 等，与 101 场信号一致（红=AI思考，蓝=用户观点，紫=专家，绿=提问）。
- **重点**：每条后可跟「→ 重点：」提炼，便于长图里做黄框强调。

---

## 🎯 核心功能

将派对/会议内容快速转化为**聊天结构长图内驱**：

- **聊天结构纪要**：时间线 + 谁说了什么 + 重点/金句，直接可做长图
- **不依赖**：不先出 HTML、不依赖 Python 生成正文，由 Agent 理解后直接产出内驱
- **可选后续**：内驱可交给截图/发飞书等脚本做长图与推送

---

## 🤖 Agent 约定

当用户要求「会议纪要 / 派对纪要 / 智能会议图片 / 长图纪要」时：

1. **直接**按「聊天结构·长图内驱格式」在对话中产出内容，不生成 HTML 文件，不依赖 Python 生成正文。
2. 内驱 = 标题 + 元信息 + 聊天流（时间 + 谁/标签 + 摘要 + → 重点）+ 金句/结论 + 下次/行动。
3. 后续若需 PNG 长图，可另用截图脚本或用户自行将内驱贴入模板；本条 SKILL 只约束「内容按聊天结构、直接给长图内驱」。

---

## 🔥 最佳操作流程（可选）

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  📄 聊天记录.txt                                                │
│        │                                                        │
│        ▼                                                        │
│  ┌──────────────────┐                                          │
│  │ parse_chatlog.py │ ← AI智能解析提取关键信息                   │
│  └────────┬─────────┘                                          │
│           │                                                     │
│           ▼                                                     │
│  📋 meeting.json（结构化数据）                                   │
│           │                                                     │
│           ▼                                                     │
│  ┌───────────────────────┐                                     │
│  │ generate_meeting.py   │ ← 渲染毛玻璃HTML模板                  │
│  └────────┬──────────────┘                                     │
│           │                                                     │
│           ▼                                                     │
│  🎨 meeting.html（精美派对纪要）                                 │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────┐                                           │
│  │ screenshot.py   │ ← Playwright截图生成PNG                    │
│  └────────┬────────┘                                           │
│           │                                                     │
│           ▼                                                     │
│  🖼️ meeting.png（高清长图）                                     │
│           │                                                     │
│           ▼                                                     │
│  ┌────────────────────┐                                        │
│  │ send_to_feishu.py  │ ← 上传图片+发送飞书群                    │
│  └────────┬───────────┘                                        │
│           │                                                     │
│           ▼                                                     │
│  📤 飞书群消息（图片+富文本摘要）                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 快速使用

### 方法1: 从飞书妙记生成（**推荐**）

```bash
# 步骤1: 在飞书妙记页面导出文字记录
# 点击右上角 "..." → "导出文字记录" → 下载txt文件

# 步骤2: 一键生成会议纪要
python3 scripts/fetch_feishu_minutes.py --file "导出的文字记录.txt" --generate
```

### 方法2: 从聊天记录生成

```bash
# 解析 → HTML → 截图 → 发送飞书（全自动）
python3 scripts/full_pipeline.py "/path/to/聊天记录.txt"

# 完成后自动打开浏览器查看
python3 scripts/full_pipeline.py "/path/to/聊天记录.txt" --open
```

### 可选参数

```bash
# 只生成不发飞书
python3 scripts/full_pipeline.py "聊天记录.txt" --no-feishu

# 只生成HTML不截图
python3 scripts/full_pipeline.py "聊天记录.txt" --no-screenshot

# 指定自定义Webhook
python3 scripts/full_pipeline.py "聊天记录.txt" --webhook "https://..."
```

### 分步执行

```bash
# 步骤1：解析聊天记录 → JSON
python3 scripts/parse_chatlog.py "/path/to/聊天记录.txt"

# 步骤2：JSON → HTML
python3 scripts/generate_meeting.py --input "xxx_meeting.json"

# 步骤3：HTML → PNG截图
python3 scripts/screenshot.py output/xxx.html

# 步骤4：发送飞书群
python3 scripts/send_to_feishu.py --json "xxx_meeting.json"
```

---

## 📥 飞书妙记导出

### 导出步骤

1. 打开飞书妙记页面（如 `cunkebao.feishu.cn/minutes/xxx`）
2. 点击右上角 **"..."** 菜单
3. 选择 **"导出文字记录"**
4. 下载txt文件到本地

### 一键生成会议纪要

```bash
# 从导出文件生成（自动发送飞书群）
python3 scripts/fetch_feishu_minutes.py --file "产研团队_20260128.txt" --generate

# 指定标题
python3 scripts/fetch_feishu_minutes.py --file "导出.txt" --title "产研团队第20场" --generate
```

### 支持的文件格式

- **飞书妙记导出的txt文件**（推荐）
- **Soul派对聊天记录**
- **其他会议文字记录**

---

## 📤 飞书集成配置

### 已配置凭证（**无需额外设置**）

| 配置项 | 值 |
|:---|:---|
| **APP_ID** | `cli_a48818290ef8100d` |
| **APP_SECRET** | `dhjU0qWd5AzicGWTf4cTqhCWJOrnuCk4` |
| **默认Webhook** | `34b762fc-5b9b-4abb-a05a-96c8fb9599f1` |

### 发送能力

| 消息类型 | 状态 | 说明 |
|:---|:---|:---|
| **图片消息** | ✅ 已支持 | 自动上传+发送PNG |
| **富文本摘要** | ✅ 已支持 | 分享人+干货提炼 |
| **文本通知** | ✅ 已支持 | 简单文本 |

### 单独发送命令

```bash
# 发送图片
python3 scripts/send_to_feishu.py --image output/meeting.png

# 发送文本
python3 scripts/send_to_feishu.py --text "派对纪要已生成"

# 从JSON发送完整摘要
python3 scripts/send_to_feishu.py --json "meeting.json"
```

---

## 📋 纪要结构（默认：聊天结构）

**优先使用**：聊天结构长图内驱（见上），不按下面文档式六模块写正文。

若需文档式（如走 Python 模板），可参考：

| 序号 | 模块 | 内容 | 图标 |
|:---|:---|:---|:---|
| **1** | 派对分享人 | 嘉宾姓名、角色、分享话题 | 🎤 |
| **2** | 分享项目 | 核心项目/模式拆解 | 📌 |
| **3** | 重点片段 | 时间戳+核心观点+**洞察** | 🔥 |
| **4** | 干货提炼 | 单行对齐的**要点总结** | ⚡ |
| **5** | 项目推进 | **下一步行动项** | 🚀 |

---

## 📊 数据格式

### 派对纪要 JSON 示例

```json
{
  "title": "1月28日｜猎头行业×电动车民宿×金融视角",
  "subtitle": "Soul派对第85场",
  "date": "2026-01-28",
  "time": "06:55",
  "duration": "2小时47分钟52秒",
  "participants_count": "600+",
  "location": "Soul派对早场",
  
  "speakers": [
    {
      "name": "卡若",
      "role": "派对主持人·融资运营",
      "topics": "电动车×民宿撮合·不良资产收购"
    }
  ],
  
  "modules": [...],
  "highlights": [...],
  "takeaways": [...],
  "actions": [...]
}
```

---

## 🛠️ 脚本说明

| 脚本 | 功能 | 依赖 |
|:---|:---|:---|
| **`full_pipeline.py`** | ⭐ 完整流程（推荐） | requests, playwright |
| **`fetch_feishu_minutes.py`** | ⭐ 飞书妙记 → 会议纪要 | requests |
| `parse_chatlog.py` | 解析聊天记录 → JSON | 无 |
| `generate_meeting.py` | JSON → HTML | 无 |
| `screenshot.py` | HTML → PNG截图 | playwright |
| `send_to_feishu.py` | 发送到飞书群 | requests |

### 安装依赖

```bash
# 基础依赖
pip3 install requests

# 截图功能
pip3 install playwright
playwright install chromium
```

---

## 🎨 样式特点

- **毛玻璃效果**：`backdrop-filter: blur(16px)` + 半透明背景
- **渐变色块**：每个模块有独特的渐变色（蓝、绿、紫、橙、红）
- **流程图**：顶部展示派对完整流程
- **数字序号**：每个模块有圆形数字标识
- **重点加粗**：关键信息使用 `<strong>` 标签突出
- **响应式布局**：适配手机、平板、电脑

---

## 📁 目录结构

```
智能纪要/
├── scripts/
│   ├── full_pipeline.py      # ⭐ 完整流程（推荐）
│   ├── parse_chatlog.py      # 解析聊天记录
│   ├── generate_meeting.py   # 生成HTML
│   ├── generate_review.py    # 生成复盘HTML
│   ├── screenshot.py         # 截图工具
│   └── send_to_feishu.py     # 飞书发送（含凭证）
├── templates/
│   ├── meeting.html          # 派对纪要模板
│   └── review.html           # 复盘总结模板
├── output/                   # 输出目录
└── SKILL.md                  # 本文档
```

---

## 🔗 与其他技能协作

| 场景 | 协作流程 |
|:---|:---|
| 派对录音转纪要 | 飞书妙记 → JSON提取 → **派对纪要生成** → **飞书群** |
| 项目复盘 | 需求拆解 → 执行跟踪 → **复盘总结生成** → **飞书群** |
| 商业计划 | 卡土算账 → 数据整理 → **商业计划书生成** |

---

## 📝 更新日志

| 日期 | 更新 |
|:---|:---|
| **2026-02-18** | 📐 纪要一律按**聊天结构**生成**长图内驱**；不按文档/脚本结构，不先出 HTML，直接产出可做智能会议图片的内容；补充 Agent 约定与内驱格式说明 |
| **2026-01-28** | 🤖 融合本地模型：支持离线智能摘要、信息提取 |
| **2026-01-28** | ✅ 配置飞书凭证，支持自动发送图片 |
| 2026-01-28 | 新增飞书群集成：send_to_feishu.py + full_pipeline.py |
| 2026-01-28 | 优化模板：增加流程图、调整模块名称、统一单行对齐 |
| 2026-01-28 | 创建技能，支持派对纪要和复盘总结 |

---

## 🤖 本地模型融合

### 功能增强

智能纪要现支持使用本地模型（Ollama）进行智能摘要和信息提取：

```python
# 导入本地模型SDK
import sys
sys.path.append("/Users/karuo/Documents/个人/卡若AI")
from 运营中枢.local_llm import summarize, extract_info, check_service

# 检查本地模型服务
status = check_service()
if not status["running"]:
    print("本地模型不可用，将使用云端API")

# 生成会议摘要（200字以内）
meeting_text = "很长的会议记录文本..."
summary = summarize(meeting_text, max_words=200)

# 提取关键信息
speakers = extract_info(meeting_text, "发言人姓名和角色")
actions = extract_info(meeting_text, "待办事项和负责人")
highlights = extract_info(meeting_text, "核心观点和金句")
```

### 使用场景

| 场景 | 本地模型 | 云端API |
|:---|:---|:---|
| 快速生成摘要 | ✅ 推荐（1-2秒） | 可选 |
| 提取发言人信息 | ✅ 推荐 | 可选 |
| 提取待办事项 | ✅ 推荐 | 可选 |
| 批量处理多场派对 | ✅ 强烈推荐（免费） | 成本累积 |
| 生成完整TDD文档 | 不推荐 | ✅ 推荐 |

### 集成到流程

可以在 `parse_chatlog.py` 中调用本地模型辅助提取：

```python
# parse_chatlog.py 中添加
from 运营中枢.local_llm import summarize, extract_info, check_service

def smart_extract(text):
    """智能提取：本地优先"""
    if check_service()["running"]:
        return {
            "summary": summarize(text, 150),
            "speakers": extract_info(text, "发言人"),
            "actions": extract_info(text, "行动项")
        }
    else:
        # 降级到原有逻辑或云端API
        return fallback_extract(text)
```

### 资源控制

- **并发限制**：最多2个并发请求
- **请求间隔**：0.5秒
- **CPU使用**：控制在30%以内
- **自动限流**：SDK已内置，无需手动处理
