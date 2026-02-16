---
name: 智能纪要
description: 派对/会议录音一键转结构化纪要并发飞书
triggers: 会议纪要、产研纪要、派对纪要、妙记
owner: 水桥
group: 水
version: "1.0"
updated: "2026-02-16"
---

# 派对纪要生成器

> 卡人（水）的核心能力 | 一键生成毛玻璃风格派对纪要 → 截图 → **自动发送飞书群**

---

## ⚡ 执行原则（飞书相关必守）

| 原则 | 说明 |
|:---|:---|
| **命令行 + API + TOKEN 优先** | 有飞书 API、有 TOKEN 的任务，一律先用命令行处理，不额外打开网页操作 |
| **先查已有经验** | 执行前查 `运营中枢/参考资料/飞书任务_命令行与API优先_经验总结.md` 与 `运营中枢/工作台/00_账号与API索引.md`（飞书 Token） |
| **统一用命令行** | 妙记拉取、批量下载、产研日报等均提供一键命令，复用已完成过的 TOKEN/会议流程 |

飞书 TOKEN 与妙记/会议已完成流程见：`运营中枢/参考资料/飞书任务_命令行与API优先_经验总结.md`

---

## 🎯 核心功能

将派对录音/聊天记录快速转化为精美的毛玻璃风格文档：

- **派对纪要**（分享人、分享项目、重点片段、干货提炼、项目推进）
- **复盘总结**（目标回顾、过程复盘、反思改进、下一步）
- **一键截图** → 输出高清PNG图片
- **自动发送** → 图片+摘要推送飞书群

---

## 🔥 最佳操作流程

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

## 📌 产研团队会议纪要日报（命令行一步到位）

**流程**：抓取当天产研会议（飞书 API 或本地 txt）→ **仅当时长 ≥5 分钟** → 生成总结 md → 转 HTML → 截图 PNG → **带图**发会议纪要飞书群。全程命令行，无需打开网页。

### 一键命令

```bash
# 从本地已导出的文字记录（推荐：妙记页导出后直接跑）
python3 scripts/daily_chanyan_to_feishu.py --file "产研团队 第20场 20260128 许永平.txt"

# 从飞书妙记链接拉取（需应用有妙记权限）
python3 scripts/daily_chanyan_to_feishu.py "https://cunkebao.feishu.cn/minutes/obcnjnsx2mz7vj5q843172p8"

# 从 config 或环境变量读取最新链接（适合每日 cron）
echo "https://cunkebao.feishu.cn/minutes/xxx" > config/latest_minutes_url.txt
python3 scripts/daily_chanyan_to_feishu.py
# 或：export CHANYAN_MINUTES_URL="https://..."
#     python3 scripts/daily_chanyan_to_feishu.py
```

### 规则

| 条件 | 行为 |
|------|------|
| 时长 **≥ 5 分钟** | 生成总结 + 图片，并发送到飞书会议纪要群（文字 + 图） |
| 时长 **< 5 分钟** | 跳过发飞书，直接退出 |

### 飞书群与参数

- 默认发到会议纪要群 Webhook：`14a7e0d3-864d-4709-ad40-0def6edba566`
- 指定其他群：`--webhook "https://open.feishu.cn/open-apis/bot/v2/hook/xxx"`
- 修改最低时长：`--min-minutes 10`（默认 5）

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

### 批量下载多场妙记 TXT（如「派对」「受」100 场）

飞书没有「妙记列表」API，需先拿到**妙记链接列表**，再批量拉取 TXT。

**步骤 1：得到 URL 列表文件 `urls.txt`**

- **方式 A（推荐）**：在飞书客户端或网页打开 **视频会议 → 妙记**，在列表里用搜索框输入「派对」或「受」（或「soul 派对」），得到筛选结果后，逐条点开每条记录，复制浏览器地址栏链接（形如 `https://cunkebao.feishu.cn/minutes/xxxxx`），每行一个粘贴到 `urls.txt`。
- **方式 B**：若列表页支持「复制链接」或导出，可一次性整理成每行一个 URL 的文本。

**步骤 2：批量下载 TXT**

```bash
cd /Users/karuo/Documents/个人/卡若AI/02_卡人（水）/_团队成员/水桥/智能纪要/scripts

# 从 urls.txt 批量下载，TXT 保存到默认 output 目录
python3 batch_download_minutes_txt.py --list urls.txt

# 指定输出目录（如 soul 派对 100 场）
python3 batch_download_minutes_txt.py --list urls.txt --output ./soul_party_100_txt

# 已下载过的跳过，避免重复
python3 batch_download_minutes_txt.py --list urls.txt --output ./soul_party_100_txt --skip-existing

# 先试跑前 3 条
python3 batch_download_minutes_txt.py --list urls.txt --limit 3
```

**说明**：脚本内部调用飞书妙记 API 拉取文字记录；若某条无「妙记文字记录」权限，该条会保存为仅含标题+时长的占位 TXT，可后续在妙记页手动「导出文字记录」后替换。

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

## 📋 纪要结构

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
| **`daily_chanyan_to_feishu.py`** | ⭐ 产研会议日报：≥5分钟则总结+图发飞书（全命令行） | requests, playwright |
| **`full_pipeline.py`** | ⭐ 完整流程（推荐） | requests, playwright |
| **`fetch_feishu_minutes.py`** | ⭐ 飞书妙记 → 会议纪要 / 导出并发飞书 | requests |
| `parse_chatlog.py` | 解析聊天记录 → JSON | 无 |
| `generate_meeting.py` | JSON → HTML | 无 |
| `md_to_summary_html.py` | 总结 md → HTML（产研纪要截图用） | 无 |
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
│   ├── daily_chanyan_to_feishu.py  # ⭐ 产研会议日报（≥5分钟→总结+图发飞书）
│   ├── full_pipeline.py            # 完整流程（推荐）
│   ├── fetch_feishu_minutes.py     # 飞书妙记导出/发飞书
│   ├── parse_chatlog.py            # 解析聊天记录
│   ├── generate_meeting.py         # 生成HTML
│   ├── md_to_summary_html.py       # 总结md→HTML（产研截图）
│   ├── generate_review.py          # 生成复盘HTML
│   ├── screenshot.py               # 截图工具
│   └── send_to_feishu.py           # 飞书发送（含凭证）
├── config/
│   └── latest_minutes_url.txt     # 可选：最新妙记链接（日报用）
├── templates/
│   ├── meeting.html                # 派对纪要模板
│   └── review.html                 # 复盘总结模板
├── output/                         # 输出目录
└── SKILL.md                        # 本文档
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
| **2026-01-29** | 📌 产研会议日报：daily_chanyan_to_feishu.py，飞书 API/本地 txt → 仅≥5分钟 → 总结+图发飞书，全命令行 |
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
