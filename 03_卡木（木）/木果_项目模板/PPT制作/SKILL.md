---
name: PPT制作
description: 用 python-pptx 或 v0/React 毛玻璃风格生成大气美观 PPT。支持：规格→v0/React 出稿→截图→导出 PPT；苹果毛玻璃风格、组件完善。触发词：做PPT、制作PPT、复盘PPT、毛玻璃PPT。
group: 木
triggers: PPT、做PPT、制作PPT、演示文稿、汇报PPT、绘本PPT、复盘PPT、毛玻璃PPT
owner: 木果
version: "3.0"
updated: "2026-02-23"
---

# PPT制作

> **归属**：木果（项目模板）  
> **能力来源**：python-pptx、agentskills pptx、**v0/React 苹果毛玻璃风格**（先出好看页面 → 截图 → 导出 PPT）。

---

## 能做什么（Capabilities）

- **方式一（推荐）**：v0/React 毛玻璃风格 → 生成 HTML 页面 → 截图 → 组装 PPT（大气美观、组件完善）
- **方式二**：直接用 python-pptx 创建（标题页、内容页、绘本风、汇报风）
- 添加图片（带边框、带说明）、表格、图表
- 按美观规范：苹果毛玻璃、配色、留白
- 输出到：`/Users/karuo/Documents/卡若Ai的文件夹/报告/` 或用户指定目录

---

## 怎么用（Usage）

触发词：**做PPT、制作PPT、生成PPT、演示文稿、汇报PPT、绘本PPT**

用户说需求后，收集：主题、受众、页数/结构、风格（商用/绘本）、有无参考模板，再按流程执行。

---

## 执行流程

### 流程 A：v0/React 毛玻璃 → 截图 → 导出 PPT（大气美观，推荐）

| 步骤 | 动作 | 说明 |
|:---|:---|:---|
| 1 | **规格澄清** | 主题、页数、内容（如复盘格式） |
| 2 | **v0 或 React 出稿** | 用 v0.dev 或手写 HTML/React，按《苹果毛玻璃风格与自适应规范》生成页面；每页一个 section，1280×720 |
| 3 | **截图** | playwright 截取每页为 PNG（`脚本/毛玻璃截图转PPT.py`） |
| 4 | **组装 PPT** | 用 python-pptx 将 PNG 按序插入幻灯片 |
| 5 | **验收** | 毛玻璃风格、组件完善、无错位 |

**相关文件**：
- `脚本/复盘PPT_毛玻璃.html`：复盘格式毛玻璃示例
- `脚本/毛玻璃截图转PPT.py`：截图 + 组装
- 毛玻璃规范：`开发文档/4、前端/苹果毛玻璃风格与自适应规范.md`

### 流程 B：直接 python-pptx 生成

| 步骤 | 动作 | 说明 |
|:---|:---|:---|
| 1 | **规格澄清** | 主题、受众、页数、风格（商用/绘本） |
| 2 | **设计大纲** | 标题页 + 正文页结构 |
| 3 | **执行生成** | 用 python-pptx 生成 .pptx |
| 4 | **套美观规范** | 按《PPT美观设计规范》检查 |
| 5 | **验收** | 用《验收检查清单》自检 |

**必读**：`参考资料/PPT美观设计规范.md`

---

## 执行步骤（Steps）

1. **澄清需求**：主题、受众、页数、风格、有无模板或参考
2. **设计大纲**：标题页 + 正文页结构，每页文字与图片规划
3. **执行生成**：用 python-pptx 代码生成 .pptx
4. **套美观规范**：背景色、标题/正文字体、图片边框 + 说明、留白
5. **输出**：保存到指定目录，告知路径

---

## 美观度核心（必须执行）

生成后必须套用以下规范（详见《PPT美观设计规范》）：

- **背景**：商用用白/浅灰；绘本用暖黄 `#FFFAE6`
- **图片**：2~3pt 边框，每张图配说明文字（如「📷 这张图：…」）
- **留白**：四周 ≥0.5 英寸，版心外有呼吸感
- **字体**：标题 26~30pt Bold，正文 18~22pt，单页 ≤7 行
- **风格延续**：封面与内页配色、字体统一

---

## 核心代码（python-pptx）

### 创建演示文稿

```python
from pptx import Presentation
from pptx.util import Inches, Pt

prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)

# 标题页（空白布局 + 自定义）
blank = prs.slide_layouts[6]
slide = prs.slides.add_slide(blank)
tb = slide.shapes.add_textbox(Inches(0.5), Inches(2), Inches(12.3), Inches(1.2))
tb.text_frame.paragraphs[0].text = "标题"
tb.text_frame.paragraphs[0].font.size = Pt(44)
tb.text_frame.paragraphs[0].font.bold = True

prs.save('output.pptx')
```

### 添加图片（带边框）

```python
from pptx.dml.color import RGBColor

pic = slide.shapes.add_picture('image.png', Inches(1), Inches(1), width=Inches(5))
pic.line.color.rgb = RGBColor(180, 140, 100)
pic.line.width = Pt(3)
```

### 设置背景色

```python
background = slide.background
background.fill.solid()
background.fill.fore_color.rgb = RGBColor(255, 250, 230)
```

---

## 相关文件

| 文件 | 说明 |
|:---|:---|
| `参考资料/PPT美观设计规范.md` | 配色、字体、图片、留白、验收清单 |
| `脚本/复盘PPT_毛玻璃.html` | 复盘格式毛玻璃 HTML 模板（苹果风格） |
| `脚本/毛玻璃截图转PPT.py` | playwright 截图 + python-pptx 组装 |
| `脚本/天恩乖乖绘本.py` | 绘本风 PPT 示例（黄底、边框） |
| 毛玻璃规范 | 开发文档 `4、前端/苹果毛玻璃风格与自适应规范.md` |
| 输出目录 | `/Users/karuo/Documents/卡若Ai的文件夹/报告/` |

---

## 外部参考（GitHub 与学习资源）

| 来源 | 链接 | 说明 |
|:---|:---|:---|
| python-pptx | https://github.com/scanny/python-pptx | 3.1k★ 官方库，创建/读取/更新 .pptx |
| python-pptx 文档 | https://python-pptx.readthedocs.io/ | Quickstart、API、用例 |
| agentskills pptx | https://agentskills.me/skill/pptx | 594★，Coding 示例 |
| PPTAgent | https://github.com/icip-cas/PPTAgent | 1.3k★，超越文生 PPT |

---

## 依赖

- Python 3.9+
- `python-pptx`：`pip install python-pptx`
- **毛玻璃截图流程**：`playwright`（`pip install playwright && playwright install chromium`）
