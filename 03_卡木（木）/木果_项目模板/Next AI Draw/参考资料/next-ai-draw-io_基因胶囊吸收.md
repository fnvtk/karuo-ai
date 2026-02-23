# next-ai-draw-io · 基因胶囊吸收记录

> 按基因胶囊规范吸收外部 GitHub 项目，整合进卡若AI Next AI Draw Skill。

---

## 一、项目信息

| 项 | 内容 |
|:---|:---|
| **仓库** | https://github.com/DayuanJiang/next-ai-draw-io |
| **Stars** | 20k+ |
| **License** | Apache 2.0 |
| **技术** | Next.js、draw.io、LLM（OpenAI/Gemini/Claude） |
| **吸收日期** | 2026-02-23 |

---

## 二、能力摘要

| 能力 | 说明 |
|:---|:---|
| 自然语言→图 | 用文字描述生成 draw.io 风格图表 |
| 图片复刻 | 上传现有图，AI 复刻并优化 |
| 文档转图 | 上传 PDF/文本，生成对应图表 |
| AI 推理可见 | 支持 o1/o3、Gemini、Claude 的思考过程展示 |
| 历史版本 | 可回溯之前生成的图 |

---

## 三、基因胶囊格式

```json
{
  "version": "1.0",
  "source_type": "github",
  "source_url": "https://github.com/DayuanJiang/next-ai-draw-io",
  "absorbed_into": "03_卡木（木）/木果_项目模板/Next AI Draw/SKILL.md",
  "manifest": {
    "name": "next-ai-draw-io",
    "description": "AI-Powered Diagram Generator with draw.io",
    "triggers": ["next ai draw", "AI画图", "画图表", "架构图", "流程图"],
    "capabilities": [
      "natural_language_to_diagram",
      "image_replication",
      "document_to_diagram"
    ]
  },
  "integration": {
    "ppt_skill": "PPT 制作时可调用生成逻辑性图表",
    "output_dir": "卡若Ai的文件夹/图片/"
  }
}
```

---

## 四、使用方式

1. **在线**：https://next-ai-drawio.jiang.jp/ 或 https://next-ai-draw-io.vercel.app/
2. **自部署**：Docker / Vercel / Cloudflare Workers（见项目 README）
3. **卡若AI 内**：触发「next ai draw」「AI画图」「画图表」→ 读 Next AI Draw SKILL → 按流程生成
