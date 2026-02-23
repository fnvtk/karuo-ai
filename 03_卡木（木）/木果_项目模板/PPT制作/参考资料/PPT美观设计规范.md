# PPT 美观设计规范 · 卡若AI

> **定位**：PPT 生成 = python-pptx 能力 + **本美观规范**；生成初版后套用设计 token，提升可读性与专业感。  
> **参考**：v0 前端工作流（规格→生成→套规范→验收）、GitHub python-pptx、agentskills pptx、小学绘本 PPT 设计最佳实践。

---

## 一、设计原则（KISS + 风格延续）

| 原则 | 说明 |
|:---|:---|
| **KISS** | 简洁即美，单页信息量适中，避免堆砌 |
| **风格延续** | 封面与内页视觉统一（配色、字体、留白） |
| **留白** | 四周 ≥0.5 英寸，版心外留呼吸感 |
| **图素优先** | 高质量图片胜过千言，每图配简短说明 |

---

## 二、配色规范（Token）

### 通用商用/汇报

| 用途 | RGB | 说明 |
|:---|:---|:---|
| 背景 | `#FFFFFF` 或 `#F8F9FA` | 白/浅灰 |
| 标题 | `#1A1A2E` ~ `#2C3E50` | 深色 |
| 正文 | `#333333` ~ `#555555` | 中灰 |
| 强调 | `#3498DB` ~ `#2E86AB` | 蓝系 |
| 图片边框 | `#BDC3C7` ~ `#95A5A6` | 浅灰 2~3pt |

### 小学绘本/童趣风

| 用途 | RGB | 说明 |
|:---|:---|:---|
| 背景 | `#FFFAE6` ~ `#FFF8DC` | 暖黄/奶油 |
| 标题 | `#8B5A2B` ~ `#A0522D` | 棕色 |
| 正文 | `#3C2D1E` ~ `#4A3728` | 深棕 |
| 图片边框 | `#B48C64` ~ `#C9A66B` | 暖棕 3pt |
| 强调 | `#DAa520` ~ `#DAA520` | 金黄 |

### python-pptx 代码

```python
from pptx.dml.color import RGBColor
BG_YELLOW = RGBColor(255, 250, 230)
TITLE_BROWN = RGBColor(139, 90, 43)
TEXT_DARK = RGBColor(60, 45, 30)
BORDER = RGBColor(180, 140, 100)
pic.line.color.rgb = BORDER
pic.line.width = Pt(3)
```

---

## 三、字体与间距

| 元素 | 字号 | 字重 | 行距 |
|:---|:---|:---|:---|
| 封面主标题 | 40~48pt | Bold | 1.2 |
| 封面副标题 | 22~26pt | Regular | 1.0 |
| 页内标题 | 26~30pt | Bold | 1.1 |
| 正文 | 18~22pt | Regular | 1.4~1.6 |
| 图片说明 | 11~13pt | Regular | 1.0 |

### 段落间距

- 标题与正文：`space_after = Pt(6~8)`
- 正文段落间：`space_after = Pt(6~10)`

---

## 四、图片规范

| 规范 | 说明 |
|:---|:---|
| 边框 | 2~3pt，颜色与主题一致 |
| 说明 | 每张图下方或侧边配 1 行说明（「📷 这张图：…」） |
| 留白 | 图与文字间距 ≥0.3 英寸 |
| 比例 | 保持原图比例，width 或 height 二选一控制 |

### python-pptx 加边框

```python
pic = slide.shapes.add_picture(img_path, left, top, width=width)
pic.line.color.rgb = RGBColor(180, 140, 100)
pic.line.width = Pt(3)
```

---

## 五、版式布局

### 左文右图（常用）

- 文字区：0.5~6.5 英寸宽
- 图片区：6.6~12.8 英寸宽
- 标题区：0.4 英寸高

### 上下分割

- 标题 0.4 英寸
- 内容区 1.2 英寸起
- 底部留白 ≥0.5 英寸

---

## 六、验收检查清单

- [ ] 背景色统一，符合主题（商用白/绘本黄）
- [ ] 标题与正文字号、颜色符合规范
- [ ] 所有图片有边框
- [ ] 每张图有说明文字
- [ ] 四周留白 ≥0.5 英寸
- [ ] 单页文字 ≤7 行（不含标题）
- [ ] 风格与参考 PPT 一致（如有）

---

## 七、外部参考

| 来源 | 链接 | 说明 |
|:---|:---|:---|
| python-pptx | https://github.com/scanny/python-pptx | 3.1k★ 官方库 |
| python-pptx 文档 | https://python-pptx.readthedocs.io/ | Quickstart、API |
| agentskills pptx | https://agentskills.me/skill/pptx | 594★，python-pptx 示例 |
| PPTAgent | https://github.com/icip-cas/PPTAgent | 1.3k★，超越文生 PPT |

---

*总结：生成初版后按本规范做一次「配色+边框+留白+图片说明」检查，与 v0 前端「出稿→套毛玻璃→验收」逻辑一致。*
