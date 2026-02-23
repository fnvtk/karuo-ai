---
name: PPT制作
description: 用 python-pptx 创建、编辑、分析演示文稿。含美观设计规范、v0式生成流程、GitHub 项目参考。触发词：做PPT、制作PPT、生成演示文稿、编辑PPT、修改PPT、汇报PPT、绘本PPT。
group: 木
triggers: PPT、做PPT、制作PPT、演示文稿、汇报PPT、绘本PPT
owner: 木果
version: "2.0"
updated: "2026-02-23"
---

# PPT制作

> **归属**：木果（项目模板）  
> **能力来源**：python-pptx（3.1k★）、agentskills pptx（594★），融合 v0 式「规格→生成→套规范→验收」流程。

---

## 能做什么（Capabilities）

- 创建新 PPT（标题页、内容页、绘本风、汇报风）
- 添加图片（带边框、带说明）、表格、图表
- 编辑已有 PPT（修改文字、布局、备注）
- 按美观规范套用：配色、留白、图片边框
- 输出到：`/Users/karuo/Documents/卡若Ai的文件夹/报告/` 或用户指定目录

---

## 怎么用（Usage）

触发词：**做PPT、制作PPT、生成PPT、演示文稿、汇报PPT、绘本PPT**

用户说需求后，收集：主题、受众、页数/结构、风格（商用/绘本）、有无参考模板，再按流程执行。

---

## 执行流程（v0 式：规格 → 生成 → 套规范 → 验收）

借鉴卡若AI「全栈开发」与「Vercel与v0部署流水线」的生成逻辑：

| 步骤 | 动作 | 说明 |
|:---|:---|:---|
| 1 | **规格澄清** | 主题、受众、页数、风格（商用白底 / 绘本黄底）、参考 PPT |
| 2 | **设计大纲** | 标题页 + 目录/正文页结构；每页关键内容、图片分配 |
| 3 | **执行生成** | 用 python-pptx 生成 .pptx（见下方核心代码） |
| 4 | **套美观规范** | 按《PPT美观设计规范》检查：背景色、字体、图片边框、每图配说明、留白 |
| 5 | **验收** | 用《验收检查清单》自检；风格与参考一致（如有） |

**必读**：`参考资料/PPT美观设计规范.md`（配色 token、字体、图片边框、验收清单）

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
| `参考资料/PPT美观设计规范.md` | 配色、字体、图片、留白、验收清单（必读） |
| `脚本/天恩乖乖绘本.py` | 绘本风 PPT 示例（黄底、边框、图片说明） |
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
- `python-pptx`：`pip install python-pptx`（建议在 venv 中安装）
