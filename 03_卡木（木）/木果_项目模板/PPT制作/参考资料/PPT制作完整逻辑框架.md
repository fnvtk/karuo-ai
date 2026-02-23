# PPT 制作完整逻辑框架

> **v0 思考形式**：先定结构 → 再定内容 → 配图逻辑 → 生成 → 套规范 → 验收

---

## 一、GitHub 参考（AI PPT + 配图）

| 项目 | 星级 | 能力 |
|:---|:---|:---|
| [veasion/AiPPT](https://github.com/veasion/AiPPT) | 1.7k★ | 主题/文件/网址生成，图表、动画、3D |
| [OfficeAIWork/PptGPT](https://github.com/officeaiwork/pptgpt) | - | 智能配图、润色、思维导图 |
| [chatbookai/ai-to-pptx](https://github.com/chatbookai/ai-to-pptx) | 404★ | ChatGPT+Gemini 大纲，导出 PPTX/PNG |
| [haesleinhuepf/prompting-pptx](https://github.com/haesleinhuepf/prompting-pptx) | - | ChatGPT + DALL-E 生成配图 |
| [scanny/python-pptx](https://github.com/scanny/python-pptx) | 3.1k★ | 底层库，创建/读取/更新 .pptx |

**配图逻辑**：每页内容 → 提炼关键词 → 生成与主题相关的逻辑性配图 → 插入幻灯片

---

## 二、v0 式结构思考（做 PPT 前必过）

1. **主题**：这次 PPT 讲什么？一句话概括。
2. **受众**：给谁看？决定风格（商用/绘本/汇报）。
3. **页数**：封面 + 目录(可选) + 正文页 + 结尾。
4. **每页结构**：左文右图 / 上标题下内容 / 满图+标题。
5. **配图规划**：每页需要什么图？与内容逻辑相关。
6. **风格**：苹果毛玻璃 / 商用白底 / 绘本黄底。

---

## 三、配图生成逻辑

| 内容主题 | 配图建议 | 生成提示词方向 |
|:---|:---|:---|
| 人物/人设 | 抽象肖像、职业形象 | minimal portrait, professional, soft gradient |
| 架构/团队 | 组织图、流程图风格 | diagram, flowchart, clean vector |
| 能力/技能 | 图标集合、模块化 | icons, modules, modern flat |
| 数据/成果 | 图表、增长曲线 | chart, growth, minimal infographic |
| 理念/模式 | 概念图、隐喻图 | concept, metaphor, abstract |

**原则**：配图需与当页文字**逻辑呼应**，不堆砌无关图。

---

## 四、执行流程（完整）

```
1. 澄清需求（主题、受众、页数、风格）
2. v0 式结构思考（每页标题+要点+配图规划）
3. 生成配图（AI 绘图 / 素材库 / 占位）
4. v0/React 或 HTML 出稿（毛玻璃风格）
5. 截图 或 直接 python-pptx 组装
6. 套美观规范 → 验收
```

---

## 五、与卡若AI 前端对齐

- **毛玻璃规范**：`开发文档/4、前端/苹果毛玻璃风格与自适应规范.md`
- **v0 使用**：`开发文档/4、前端/v0使用步骤.md`
- **组件**：GlassCard、GlassSection、rounded-2xl、backdrop-blur-xl
