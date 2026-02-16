---
name: 文档清洗
description: 文档转Markdown工具。触发词：文档清洗、PDF转换、文档转Markdown、MarkItDown、OCR识别、知识库、文档处理。将PDF、PPT、Word等杂乱文档转化为AI易理解的Markdown格式，支持OCR识别图片文字。
group: 水
triggers: PDF转Markdown、文档清洗
owner: 水桥
version: "1.0"
updated: "2026-02-16"
---

# 文档清洗

将杂乱文档转化为AI易理解的Markdown格式。

## 核心能力

基于微软开源的 **MarkItDown**，支持：
- PDF → Markdown
- PPT/PPTX → Markdown
- Word/DOCX → Markdown
- Excel/XLSX → Markdown
- 图片 OCR → Markdown

## 安装

```bash
# 安装 markitdown
pip install markitdown

# 或使用 pipx（推荐）
pipx install markitdown
```

## 使用方法

### 命令行

```bash
# 转换单个文件
markitdown document.pdf > output.md

# 转换目录下所有PDF
for f in *.pdf; do markitdown "$f" > "${f%.pdf}.md"; done
```

### Python API

```python
from markitdown import MarkItDown

md = MarkItDown()

# 转换PDF
result = md.convert("document.pdf")
print(result.text_content)

# 转换带图片OCR
result = md.convert("scan.pdf", enable_ocr=True)
```

## 支持格式

| 格式 | 扩展名 | 特性 |
|------|--------|------|
| PDF | .pdf | 文本提取、OCR |
| Word | .docx | 保留结构 |
| PPT | .pptx | 幻灯片→章节 |
| Excel | .xlsx | 表格→Markdown表格 |
| 图片 | .png/.jpg | OCR识别 |
| HTML | .html | 清理转换 |
| 音频 | .mp3/.wav | 语音转文字 |

## 输出优化

### 清理模板

转换后的Markdown可能需要清理：

```python
import re

def clean_markdown(text):
    # 移除多余空行
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    # 修复表格格式
    text = re.sub(r'\|\s*\|', '| |', text)
    
    # 移除页码
    text = re.sub(r'\n\d+\n', '\n', text)
    
    return text.strip()
```

### 结构化输出

```markdown
# 文档标题

## 元信息
- 来源: [原始文件名]
- 转换时间: [时间戳]
- 页数: [页数]

## 正文内容

（转换后的内容）

## 附录
- 图片: [数量]
- 表格: [数量]
```

## 知识库构建流程

```
┌─────────────────────────────────────────────────────────┐
│                   知识库构建流程                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. 收集文档                                            │
│     PDF、Word、PPT、扫描件                              │
│         │                                               │
│         ▼                                               │
│  2. 批量转换                                            │
│     markitdown → Markdown                              │
│         │                                               │
│         ▼                                               │
│  3. 清洗优化                                            │
│     移除噪音、统一格式                                  │
│         │                                               │
│         ▼                                               │
│  4. 结构化                                              │
│     添加元信息、分类标签                                │
│         │                                               │
│         ▼                                               │
│  5. 索引入库                                            │
│     向量化存储、全文检索                                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 批量处理脚本

```bash
#!/bin/bash
# 批量转换文档
# 用法: ./convert_docs.sh /path/to/docs

INPUT_DIR=${1:-.}
OUTPUT_DIR="./markdown_output"

mkdir -p "$OUTPUT_DIR"

# 转换所有支持的格式
for file in "$INPUT_DIR"/*.{pdf,docx,pptx,xlsx}; do
    if [[ -f "$file" ]]; then
        filename=$(basename "$file")
        output="$OUTPUT_DIR/${filename%.*}.md"
        echo "转换: $filename"
        markitdown "$file" > "$output"
    fi
done

echo "✅ 完成，输出目录: $OUTPUT_DIR"
```

## 适用场景

- 构建企业知识库
- 历史文档数字化
- AI 训练数据准备
- 文档内容分析
