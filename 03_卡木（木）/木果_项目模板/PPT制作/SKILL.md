---
name: PPT制作
description: 用 python-pptx 创建、编辑、分析演示文稿。触发词：做PPT、制作PPT、生成演示文稿、编辑PPT、修改PPT、汇报PPT、商业计划书PPT。
group: 木
triggers: PPT、做PPT、制作PPT、演示文稿、汇报PPT
owner: 木果
version: "1.0"
updated: "2026-02-23"
---

# PPT制作

> **归属**：木果（项目模板）  
> **能力来源**：agentskills pptx（python-pptx），高星级技能，卡若AI 继承后可直接生成 .pptx 文件。

---

## 能做什么（Capabilities）

- 创建新 PPT（标题页、内容页、要点页）
- 添加图片、表格、图表
- 编辑已有 PPT（修改文字、布局、备注）
- 输出到：`/Users/karuo/Documents/卡若Ai的文件夹/报告/`

---

## 怎么用（Usage）

触发词：**做PPT、制作PPT、生成PPT、演示文稿、汇报PPT、商业计划书PPT**

用户说需求后，收集：主题、页数/结构、关键内容，再按步骤执行。

---

## 执行步骤（Steps）

1. **澄清需求**：主题、受众、页数、有无模板或参考
2. **设计大纲**：标题页 + 目录 + 正文页结构
3. **执行生成**：用下方 python-pptx 代码生成 .pptx
4. **输出**：保存到 `卡若Ai的文件夹/报告/`，并告知路径

---

## 核心代码（python-pptx）

### 创建演示文稿

```python
from pptx import Presentation
from pptx.util import Inches, Pt

prs = Presentation()

# 标题页
title_slide_layout = prs.slide_layouts[0]
slide = prs.slides.add_slide(title_slide_layout)
slide.shapes.title.text = "标题"
slide.placeholders[1].text = "副标题"

# 内容页（要点）
bullet_slide_layout = prs.slide_layouts[1]
slide = prs.slides.add_slide(bullet_slide_layout)
slide.shapes.title.text = "要点标题"
tf = slide.shapes.placeholders[1].text_frame
tf.text = "第一点"
p = tf.add_paragraph()
p.text = "第二点"
p.level = 1

prs.save('output.pptx')
```

### 添加图片

```python
blank_layout = prs.slide_layouts[6]
slide = prs.slides.add_slide(blank_layout)
slide.shapes.add_picture('image.png', Inches(1), Inches(1), width=Inches(5))
```

### 添加表格

```python
rows, cols = 3, 4
table = slide.shapes.add_table(rows, cols, Inches(1), Inches(2), Inches(6), Inches(1.5)).table
table.cell(0, 0).text = "表头"
table.cell(1, 0).text = "数据"
```

### 编辑已有 PPT

```python
prs = Presentation('existing.pptx')
slide = prs.slides[0]
slide.shapes.title.text = "新标题"
prs.save('modified.pptx')
```

---

## 最佳实践

- 用 Inches() 或 Pt() 控制尺寸
- 正文文字精简，多用视觉元素
- 使用 slide_layouts 保持风格统一
- 生成过程多次 save 防丢失

---

## 相关文件

| 文件 | 说明 |
|:---|:---|
| 输出目录 | `/Users/karuo/Documents/卡若Ai的文件夹/报告/` |

---

## 依赖

- Python 3.9+
- `python-pptx`：`pip install python-pptx`
