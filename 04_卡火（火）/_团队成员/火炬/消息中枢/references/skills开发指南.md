# Skills 开发指南

## Skills 是什么？

Skills 是模块化、自包含的能力包，通过提供专业知识、工作流和工具来扩展 AI 助手的能力。

**核心价值**：将通用 AI 转变为具有程序性知识的专业 Agent。

## 目录结构

```
skill-name/
├── SKILL.md          # 必需：技能定义
├── scripts/          # 可选：可执行脚本
│   ├── main.py
│   └── helper.sh
├── references/       # 可选：参考文档
│   ├── api-docs.md
│   └── schema.md
└── assets/           # 可选：资源文件
    ├── template.html
    └── logo.png
```

## SKILL.md 格式

### 1. Frontmatter（必需）

```yaml
---
name: skill-name
description: |
  技能描述。这是触发机制，需要清晰说明：
  1. 这个技能做什么
  2. 何时使用这个技能
  3. 具体的触发场景
---
```

**重要**：`description` 是唯一决定技能是否被触发的字段。

### 2. Body（必需）

```markdown
# 技能名称

## 快速开始
简洁的使用说明...

## 核心功能
### 功能1
...

### 功能2
...

## 示例
```

## 设计原则

### 1. 简洁是关键

上下文窗口是公共资源。每段内容都要问：
- "AI 真的需要这个解释吗？"
- "这段文字值得消耗 token 吗？"

**偏好简洁示例而非冗长解释。**

### 2. 设置适当的自由度

| 自由度 | 何时使用 | 形式 |
|:---|:---|:---|
| **高** | 多种方法都有效、决策依赖上下文 | 文本指导 |
| **中** | 有首选模式、允许一些变化 | 伪代码/参数化脚本 |
| **低** | 操作脆弱、一致性关键 | 具体脚本/少参数 |

### 3. 渐进式披露

三级加载系统：

1. **元数据**（name + description）- 始终在上下文（~100字）
2. **SKILL.md 正文** - 技能触发时加载（<5k字）
3. **资源文件** - 按需加载（无限制）

## 资源类型

### scripts/（脚本）

**何时使用**：
- 同样的代码反复重写
- 需要确定性可靠性

**示例**：
```python
# scripts/rotate_pdf.py
import sys
from PyPDF2 import PdfReader, PdfWriter

def rotate_pdf(input_path, output_path, degrees):
    reader = PdfReader(input_path)
    writer = PdfWriter()
    
    for page in reader.pages:
        page.rotate(degrees)
        writer.add_page(page)
    
    with open(output_path, "wb") as f:
        writer.write(f)

if __name__ == "__main__":
    rotate_pdf(sys.argv[1], sys.argv[2], int(sys.argv[3]))
```

### references/（参考文档）

**何时使用**：
- AI 工作时需要参考的文档
- 数据库模式
- API 文档
- 公司政策

**示例**：
```markdown
<!-- references/api-docs.md -->
# API 文档

## 端点

### GET /users
获取用户列表

### POST /users
创建新用户
```

### assets/（资产文件）

**何时使用**：
- 最终输出中使用的文件
- 模板
- 图片
- 字体

## 渐进式披露模式

### 模式1：高层指导 + 引用

```markdown
# PDF 处理

## 快速开始
使用 pdfplumber 提取文本：
[代码示例]

## 高级功能
- **表单填充**：见 [FORMS.md](references/FORMS.md)
- **API 参考**：见 [REFERENCE.md](references/REFERENCE.md)
```

### 模式2：按领域组织

```
bigquery-skill/
├── SKILL.md (概述和导航)
└── references/
    ├── finance.md (收入、账单指标)
    ├── sales.md (机会、管道)
    └── product.md (API使用、功能)
```

### 模式3：条件详情

```markdown
# DOCX 处理

## 创建文档
使用 docx-js 创建新文档。见 [DOCX-JS.md](references/DOCX-JS.md)。

## 编辑文档
简单编辑直接修改 XML。

**跟踪更改**：见 [REDLINING.md](references/REDLINING.md)
```

## 创建流程

### 步骤1：理解技能

收集具体示例：
- "这个技能应该支持什么功能？"
- "用户会说什么来触发它？"
- "有什么典型的使用场景？"

### 步骤2：规划内容

分析每个示例：
1. 如何从头执行
2. 哪些脚本/引用/资产会有帮助

### 步骤3：初始化技能

```bash
# 使用初始化脚本
scripts/init_skill.py my-skill --path skills/public --resources scripts,references
```

### 步骤4：实现技能

1. 创建资源文件（scripts/references/assets）
2. 测试脚本确保无 bug
3. 编写 SKILL.md

### 步骤5：打包技能

```bash
scripts/package_skill.py path/to/skill-folder
```

### 步骤6：迭代优化

基于实际使用反馈持续改进。

## 命名规范

- 只使用小写字母、数字和连字符
- 名称少于 64 字符
- 偏好动词开头的短语
- 工具相关时加命名空间（如 `gh-address-comments`）

## 避免的内容

不要创建这些文件：
- README.md
- INSTALLATION_GUIDE.md
- QUICK_REFERENCE.md
- CHANGELOG.md

技能只包含 AI 完成任务所需的信息。

## 示例：完整技能

```
pdf-processor/
├── SKILL.md
├── scripts/
│   ├── rotate_pdf.py
│   ├── extract_text.py
│   └── merge_pdfs.py
└── references/
    └── pdfplumber-api.md
```

**SKILL.md**：
```markdown
---
name: pdf-processor
description: |
  处理 PDF 文件：旋转、提取文本、合并。
  使用时机：用户需要操作 PDF 文件、提取 PDF 内容、合并多个 PDF
---

# PDF 处理器

## 旋转 PDF
```bash
python scripts/rotate_pdf.py input.pdf output.pdf 90
```

## 提取文本
```bash
python scripts/extract_text.py input.pdf > output.txt
```

## 合并 PDF
```bash
python scripts/merge_pdfs.py output.pdf input1.pdf input2.pdf
```

## 高级用法
见 [pdfplumber-api.md](references/pdfplumber-api.md)
```
