# 飞书 JSON 格式全手册

> 基于项目 52 个 `.feishu.json` 实际文件 + 6 个脚本验证 + 飞书开放平台官方文档。  
> **版本：2.0** | **更新：2026-03-12**  
> 来源：卡若AI 水桥 · 飞书管理

---

## 零、标准操作流程（SOP · 强制）

**以后所有飞书相关文档，均按本手册格式写、转、传。**

### SOP-A：写新文档 → 上传飞书

```
1. 先在本地写 Markdown（推荐）
   ↓
2. 转成 .feishu.json：
   python3 脚本/md_to_feishu_json.py /path/to/文章.md
   ↓
3. 上传到飞书 Wiki：
   python3 脚本/upload_json_to_feishu_doc.py /path/to/文章.feishu.json --parent <wiki_token> --title "标题"
   ↓
4. 验证：打开飞书链接检查格式
```

### SOP-B：Markdown 直传（不经 JSON）

```
python3 脚本/feishu_article_unified_publish.py --parent <token> --title "标题" --md /绝对路径/文章.md
```

### SOP-C：批量目录上传

```
python3 脚本/batch_upload_json_to_feishu_wiki.py /本地目录 --wiki-parent <token>
```

### SOP-D：飞书导出 JSON 按原格式回传

```
python3 脚本/upload_json_to_feishu_doc.py /path/to/导出.json
```

### Token 出问题时

```bash
python3 脚本/feishu_token_cli.py get-access-token
python3 脚本/feishu_token_cli.py set-march-token <新token>
```

---

## 一、JSON 文件顶层结构

```json
{
  "title": "文档标题.md",
  "source": "相对来源路径/文档标题.md",
  "children": [ 块1, 块2, ... ]
}
```

| 字段 | 说明 |
|:---|:---|
| `title` | 上传后显示的文档标题 |
| `source` | 本地来源路径（可选，追踪用） |
| `children` | 块数组，顺序即文档顺序 |

**写入 API 时**：只传 `children`；块内不带 `block_id`（服务端生成）。

---

## 二、block_type 完整对照表（v2.0 · 已验证）

### 2.1 已验证可写入的块类型（生产代码验证）

| block_type | 类型 | JSON 字段名 | 说明 | 验证来源 |
|:---|:---|:---|:---|:---|
| 1 | 页面根节点 | `page` | 根节点，不通过 children 创建 | 导出 |
| 2 | **正文** | `text` | 最常用，支持富文本 | 脚本+导出 |
| 3 | 一级标题 | `heading1` | `#` | md_to_feishu_json.py |
| 4 | 二级标题 | `heading2` | `##` | 脚本+导出 |
| 5 | 三级标题 | `heading3` | `###` | 脚本+导出 |
| 6 | 四级标题 | `heading4` | `####`，日志日期专用 | 脚本+导出 |
| 7 | 五级标题 | `heading5` | `#####` | API 文档 |
| 8 | 六级标题 | `heading6` | `######` | API 文档 |
| 9-11 | 七~九级标题 | `heading7`~`heading9` | 极少用 | API 文档 |
| 14 | **代码块** | `code` | 支持多语言高亮 | 脚本+导出 |
| 17 | **待办** | `todo` | 可勾选任务 | 脚本+导出 |
| 19 | **高亮块/标注** | `callout` | 带颜色背景区块 | 脚本+导出 |
| 22 | **分割线** | `divider` | 水平线 | 脚本+导出 |
| 24 | **分栏** | `grid` | 多列布局容器 | smart_write_wiki.py |
| 25 | **分栏列** | `grid_column` | grid 的子列 | smart_write_wiki.py |
| 30 | 电子表格 | `sheet` | 文档内表格，9×9 上限 | md_to_feishu_json.py |

### 2.2 图片/文件/媒体相关

| block_type | 类型 | JSON 字段名 | 说明 |
|:---|:---|:---|:---|
| 12 | **文件/图片（写入）** | `file` | 先 upload_all 拿 file_token，再插入 |
| 18 | **画廊** | `gallery` | 多图显示，单图也可用 |
| 27 | 图片（导出） | `image` | 导出时出现；**写入用 12 file** |

### 2.3 复杂/高级块

| block_type | 类型 | JSON 字段名 | 说明 |
|:---|:---|:---|:---|
| 31 | 表格 | `table` | ⚠️ 带 cells 接口报 9499，慎用 |
| 43 | 多维表格 | `board`/`bitable` | 须 bitable:app 权限 |
| 26 | 内嵌 | `iframe` | API 不支持写入，导出可见 |
| 29 | 思维笔记 | `mindnote` | API 不支持写入 |
| 34 | 引用容器 | `quote_container` | 引用嵌套容器 |
| 20 | 会话卡片 | `chat_card` | 群聊卡片 |

### 2.4 列表块（重要说明）

飞书 DocX API 定义了原生列表块类型，但**当前脚本采用正文块 + 前缀符号的方式实现列表**（更稳定）：

| 方案 | block_type | 实现方式 | 稳定性 |
|:---|:---|:---|:---|
| **当前方案（推荐）** | 2 (text) | 无序用 `• ` 前缀，有序用 `1）2）` 前缀 | ✅ 稳定 |
| 原生无序列表 | 12 (bullet) | `"bullet": {"elements": [...]}` | ⚠️ 未验证 |
| 原生有序列表 | 13 (ordered) | `"ordered": {"elements": [...]}` | ⚠️ 未验证 |

> **原因**：bullet(12) 和 file(12) 可能存在 API 版本差异。当前生产代码中 block_type 12 = file，用于图片/文件上传，已验证稳定。列表统一用 text(2) + 前缀实现，确保兼容性。

---

## 三、各 Block 类型详细 JSON 格式

### 3.1 正文块（block_type: 2）—— 最常用

**最简版**：
```json
{"block_type": 2, "text": {"elements": [{"text_run": {"content": "这是一段正文。"}}]}}
```

**带样式版（加粗 + 颜色）**：
```json
{
  "block_type": 2,
  "text": {
    "elements": [
      {"text_run": {"content": "[重要紧急]", "text_element_style": {"bold": true, "text_color": 5}}},
      {"text_run": {"content": " 今日必须完成的核心任务"}}
    ],
    "style": {"align": 1}
  }
}
```

**超链接**：
```json
{
  "block_type": 2,
  "text": {
    "elements": [
      {"text_run": {"content": "项目链接：", "text_element_style": {"bold": true}}},
      {"text_run": {"content": "点击查看", "text_element_style": {"link": {"url": "https://cunkebao.feishu.cn/wiki/xxx"}}}}
    ]
  }
}
```

**无序列表（正文块模拟，推荐）**：
```json
{"block_type": 2, "text": {"elements": [{"text_run": {"content": "• 第一项要点"}}]}}
{"block_type": 2, "text": {"elements": [{"text_run": {"content": "• 第二项要点"}}]}}
{"block_type": 2, "text": {"elements": [{"text_run": {"content": "  • 子项（两空格缩进）"}}]}}
```

**有序列表（正文块模拟，推荐）**：
```json
{"block_type": 2, "text": {"elements": [{"text_run": {"content": "1）第一步：需求分析"}}]}}
{"block_type": 2, "text": {"elements": [{"text_run": {"content": "2）第二步：方案设计"}}]}}
{"block_type": 2, "text": {"elements": [{"text_run": {"content": "3）第三步：代码实现"}}]}}
```

**表格（TSV 正文回退，生产常用）**：
```json
{
  "block_type": 2,
  "text": {
    "elements": [{
      "text_run": {
        "content": "产品\t价格\t分润\n:---\t:---\t:---\n书籍小程序\t9.9元起\t90%\n会员群\t365元起\t平台收入"
      }
    }]
  }
}
```

---

### 3.2 标题块（block_type: 3-11）

字段名 = `heading1`~`heading9`，结构完全相同：

```json
{"block_type": 3, "heading1": {"elements": [{"text_run": {"content": "一级大标题"}}]}}
{"block_type": 4, "heading2": {"elements": [{"text_run": {"content": "📋 二级标题"}}]}}
{"block_type": 5, "heading3": {"elements": [{"text_run": {"content": "三级标题"}}]}}
{"block_type": 6, "heading4": {"elements": [{"text_run": {"content": "3月12日  "}}], "style": {"align": 1}}}
{"block_type": 7, "heading5": {"elements": [{"text_run": {"content": "五级标题"}}]}}
{"block_type": 8, "heading6": {"elements": [{"text_run": {"content": "六级标题"}}]}}
```

---

### 3.3 代码块（block_type: 14）

```json
{
  "block_type": 14,
  "code": {
    "elements": [{"text_run": {"content": "SOUL派对（流量入口）\n  ↓\n触客宝自动接待\n  ↓\n存客宝AI分层"}}],
    "style": {"language": 1}
  }
}
```

**language 枚举值**：

| 值 | 语言 | 值 | 语言 |
|:---|:---|:---|:---|
| 1 | PlainText（流程图/ASCII 用此） | 2 | Python |
| 3 | JavaScript | 4 | Java |
| 5 | Go | 6 | Shell/Bash |
| 7 | TypeScript | 8 | SQL |
| 9 | C++ | 10 | C |
| 11 | Ruby | 12 | Rust |
| 13 | Swift | 14 | Kotlin |
| 15 | PHP | 16 | CSS |
| 17 | HTML | 18 | Markdown |
| 19 | JSON | 20 | YAML |

---

### 3.4 待办块（block_type: 17）

```json
{"block_type": 17, "todo": {
  "elements": [{"text_run": {"content": "Soul 派对→本月突破500在线 🎬 (0%)"}}],
  "style": {"done": false, "align": 1}
}}

{"block_type": 17, "todo": {
  "elements": [{"text_run": {"content": "运营报表已写入飞书"}}],
  "style": {"done": true, "align": 1}
}}
```

---

### 3.5 高亮块/标注（block_type: 19）

```json
// 蓝色 [执行]
{"block_type": 19, "callout": {
  "emoji_id": "sunrise", "background_color": 2, "border_color": 2,
  "elements": [{"text_run": {"content": "[执行]", "text_element_style": {"bold": true, "text_color": 7}}}]
}}

// 橙色 [警告]
{"block_type": 19, "callout": {
  "emoji_id": "warning", "background_color": 4, "border_color": 4,
  "elements": [{"text_run": {"content": "注意：Token 2小时过期"}}]
}}

// 绿色 [完成]
{"block_type": 19, "callout": {
  "emoji_id": "white_check_mark", "background_color": 3, "border_color": 3,
  "elements": [{"text_run": {"content": "已完成：运营报表写入成功"}}]
}}

// 红色 [紧急]
{"block_type": 19, "callout": {
  "emoji_id": "fire", "background_color": 6, "border_color": 6,
  "elements": [{"text_run": {"content": "紧急：服务器宕机需立即处理"}}]
}}
```

**background_color / border_color 枚举**：

| 值 | 颜色 | 常用场景 |
|:---|:---|:---|
| 1 | 白色/无 | 普通引用 |
| 2 | 蓝色 | [执行]、信息提示 |
| 3 | 绿色 | [完成]、成功 |
| 4 | 橙色 | [警告]、注意 |
| 5 | 黄色 | 重点提醒 |
| 6 | 红色 | [紧急]、错误 |
| 7 | 紫色 | 思考、创意 |

**常用 emoji_id**：`sunrise`🌅、`warning`⚠️、`white_check_mark`✅、`bulb`💡、`fire`🔥、`star`⭐、`quote`引用、`rocket`🚀、`dart`🎯、`memo`📝

---

### 3.6 分割线（block_type: 22）

```json
{"block_type": 22, "divider": {}}
```

---

### 3.7 图片/文件块（block_type: 12，写入专用）

```json
{"block_type": 12, "file": {
  "file_token": "上传后返回的 file_token",
  "view_type": "inline",
  "file_name": "进度图表.png"
}}
```

> 两步走：① `POST drive/v1/medias/upload_all`（form-data: file_name, parent_type=docx_image, parent_node=obj_token, size, file=binary）→ 拿 file_token ② 插入此块

**view_type 枚举**：`preview`（预览）、`card`（卡片）、`inline`（行内）

---

### 3.8 画廊块（block_type: 18）

```json
{"block_type": 18, "gallery": {
  "image_list": [
    {"file_token": "xxx_file_token_1"},
    {"file_token": "xxx_file_token_2"}
  ],
  "gallery_style": {"align": "center"}
}}
```

> 一行最多 6 张图。`align`: `center`（默认）、`left`、`right`

---

### 3.9 分栏布局（block_type: 24 + 25）

**分栏容器 grid**：
```json
{"block_type": 24, "grid": {"column_size": 2}}
```

**分栏列 grid_column**（须作为 grid 的子块插入）：
```json
{"block_type": 25, "grid_column": {"width_ratio": 50}}
```

**完整用法（两栏布局）**：
```
1. 先创建 grid 块 → 拿到 grid_block_id
2. API 自动生成 column_size 个 grid_column 子块
3. 在每个 grid_column 下插入内容块
```

```python
# 创建分栏（脚本 smart_write_wiki.py 中的实际写法）
grid_block = {"block_type": 24, "grid": {"column_size": 2}}
# 插入后拿到 grid_id，再查询其子块拿到两个 column_id
# 然后在 column_id 下分别插入左右内容
```

---

### 3.10 电子表格（block_type: 30）

```json
{"block_type": 30, "sheet": {"row_size": 5, "column_size": 4}}
```

> 创建空表格，最大 9×9。创建后通过电子表格 API 写入单元格内容。  
> **限制**：不能在创建时直接带内容。

---

### 3.11 表格块（block_type: 31，⚠️ 限制）

```json
// 创建空表格（可行）
{"block_type": 31, "table": {"property": {"row_size": 3, "column_size": 4}}}

// 带 cells 创建（⚠️ 返回 9499 报错）
{"block_type": 31, "table": {"property": {"row_size": 3, "column_size": 4}, "cells": [...]}}
```

**表格处理策略（决策树）**：

```
Markdown 表格
├── 行列 ≤ 9×9 → 优先用 sheet(30) 创建空表格 + 写入单元格
├── 行列 > 9×9 → 用 text(2) TSV 回退
└── sheet 失败 → 用 text(2) TSV 回退（保底方案）
```

**TSV 回退格式（稳定，推荐兜底）**：
```json
{"block_type": 2, "text": {
  "elements": [{"text_run": {
    "content": "文档名称\t路径\t核心内容\t状态\n:---\t:---\t:---\t:---\n品牌定位画布\t金/品牌定位.md\t一句话定位\t✅ 完成\n人物画像\t金/人物画像.md\tABCD用户画像\t✅ 完成"
  }}]
}}
```

---

### 3.12 多维表格（block_type: 43）

```json
// 导出格式
{"block_type": 43, "board": {"token": "bascnXXXXXXXX"}}

// 写入格式（嵌入文档内）
{"block_type": 43, "bitable": {"token": "bascnXXXXXXXX"}}
```

> ⚠️ 须开通 **bitable:app** 用户身份权限。独立多维表格链接为 `https://cunkebao.feishu.cn/base/{app_token}`。

---

## 四、text_element_style 样式完整参数

```json
{
  "text_element_style": {
    "bold": true,
    "italic": true,
    "strikethrough": true,
    "underline": true,
    "inline_code": true,
    "text_color": 5,
    "background_color": 2,
    "link": {"url": "https://..."}
  }
}
```

**text_color 枚举**：

| 值 | 颜色 | 场景 |
|:---|:---|:---|
| 1 | 黑色（默认） | 正文 |
| 2 | 深灰 | 次要信息 |
| 3 | 深橙 | |
| 4 | 橙色 | 不重要紧急 |
| 5 | **红色** | **重要紧急标注** |
| 6 | 玫红 | |
| 7 | 紫色 | 执行标注 |
| 8 | 浅蓝 | |
| 9 | 深蓝 | |
| 10 | **绿色** | **重要不紧急标注** |

---

## 五、style 对齐参数

```json
"style": {"align": 1}
```

| 值 | 对齐方式 |
|:---|:---|
| 1 | 左对齐（默认） |
| 2 | 居中 |
| 3 | 右对齐 |

适用于：`text.style`、`heading*.style`、`todo.style`

---

## 六、Markdown → 飞书 Block 转换规则（完整版）

| Markdown 写法 | 飞书 block_type | 字段名 | 备注 |
|:---|:---|:---|:---|
| `# 标题` | 3 | heading1 | |
| `## 标题` | 4 | heading2 | |
| `### 标题` | 5 | heading3 | |
| `#### 标题` | 6 | heading4 | |
| `##### 标题` | 7 | heading5 | |
| `###### 标题` | 8 | heading6 | |
| 普通段落 | 2 | text | |
| `**加粗**` | 2 | text + bold=true | elements 拆分 |
| `*斜体*` | 2 | text + italic=true | |
| `~~删除线~~` | 2 | text + strikethrough=true | |
| `` `行内代码` `` | 2 | text + inline_code=true | |
| `[链接](url)` | 2 | text + link.url | |
| `> 引用` | 19 | callout（蓝色） | |
| `---` | 22 | divider | |
| ` ```代码``` ` | 14 | code | language 自动识别 |
| `![图](路径)` | 12 | file（先 upload_all） | 失败保底为文字 |
| `- 无序列表` | 2 | text（`• ` 前缀） | 正文块模拟 |
| `1. 有序列表` | 2 | text（`1）` 前缀） | 正文块模拟 |
| `- [ ]` 未完成 | 17 | todo + done=false | |
| `- [x]` 已完成 | 17 | todo + done=true | |
| Markdown 表格 | 30 或 2 | sheet 或 TSV 回退 | ≤9×9 用 sheet |

---

## 七、日志 TNTWF 格式对应 Block 结构

```json
[
  {"block_type": 6, "heading4": {"elements": [{"text_run": {"content": "3月12日  "}}], "style": {"align": 1}}},
  {"block_type": 19, "callout": {"emoji_id": "sunrise", "background_color": 2, "border_color": 2,
    "elements": [{"text_run": {"content": "[执行]", "text_element_style": {"bold": true, "text_color": 7}}}]}},
  {"block_type": 2, "text": {
    "elements": [{"text_run": {"content": "[重要紧急]", "text_element_style": {"bold": true, "text_color": 5}}}],
    "style": {"align": 1}}},
  {"block_type": 17, "todo": {
    "elements": [{"text_run": {"content": "Soul 派对→本月突破500在线 🎬 (0%)"}}],
    "style": {"done": false, "align": 1}}},
  {"block_type": 2, "text": {
    "elements": [{"text_run": {"content": "[重要不紧急]", "text_element_style": {"bold": true, "text_color": 10}}}],
    "style": {"align": 1}}},
  {"block_type": 22, "divider": {}}
]
```

---

## 八、完整文档示例

```json
{
  "title": "商业模式总览.md",
  "source": "材料/商业模式总览.md",
  "children": [
    {"block_type": 4, "heading2": {"elements": [{"text_run": {"content": "一、项目背景"}}]}},
    {"block_type": 5, "heading3": {"elements": [{"text_run": {"content": "市场痛点"}}]}},
    {"block_type": 2, "text": {"elements": [{"text_run": {
      "content": "痛点\t描述\n:---\t:---\n资源分散\t80%创业者缺乏有效渠道\n匹配低效\t有效链接率<5%"}}]}},
    {"block_type": 22, "divider": {}},
    {"block_type": 4, "heading2": {"elements": [{"text_run": {"content": "二、商业模式"}}]}},
    {"block_type": 14, "code": {"elements": [{"text_run": {
      "content": "SOUL派对（流量入口）\n  ↓\n触客宝自动接待\n  ↓\n存客宝AI分层（ABCD）\n  ↓\n精准变现"}}],
      "style": {"language": 1}}},
    {"block_type": 19, "callout": {"emoji_id": "bulb", "background_color": 2, "border_color": 2,
      "elements": [{"text_run": {"content": "核心模式：云阿米巴——不占股、分现钱、稳流量"}}]}},
    {"block_type": 2, "text": {"elements": [{"text_run": {"content": "• 产品一：书籍小程序 9.9元起"}}]}},
    {"block_type": 2, "text": {"elements": [{"text_run": {"content": "• 产品二：会员群 365元起"}}]}},
    {"block_type": 17, "todo": {"elements": [{"text_run": {"content": "完成产品矩阵报价表"}}],
      "style": {"done": false, "align": 1}}}
  ]
}
```

---

## 九、API 接口速查

| 用途 | 方法 | 路径 |
|:---|:---|:---|
| 获取 Wiki 节点 | GET | `wiki/v2/spaces/get_node?token={wiki_token}` |
| 获取文档块列表 | GET | `docx/v1/documents/{doc_id}/blocks` |
| **追加子块（写入）** | POST | `docx/v1/documents/{doc_id}/blocks/{block_id}/children` |
| 批量删除块 | POST | `docx/v1/documents/{doc_id}/blocks/batch_delete` |
| 创建 Wiki 子节点 | POST | `wiki/v2/spaces/{space_id}/nodes` |
| **上传图片/文件** | POST | `drive/v1/medias/upload_all` |
| 创建多维表格 | POST | `bitable/v1/apps` |
| 写入电子表格单元格 | PUT | `sheets/v2/spreadsheets/{token}/values` |

**追加子块请求体**：
```json
{"children": [块1, 块2, ...], "index": 0}
```
> `index: 0` = 最前；不传 = 末尾。**单次 ≤ 50 块**，超出分批。

---

## 十、脚本速查

| 脚本 | 用途 | 命令 |
|:---|:---|:---|
| `md_to_feishu_json.py` | Markdown → .feishu.json | `python3 脚本/md_to_feishu_json.py /path/xxx.md` |
| `upload_json_to_feishu_doc.py` | JSON 按格式上传 | `python3 脚本/upload_json_to_feishu_doc.py /path/xxx.json` |
| `batch_upload_json_to_feishu_wiki.py` | 批量目录上传 | `python3 脚本/batch_upload_json_to_feishu_wiki.py /目录 --wiki-parent <token>` |
| `feishu_article_unified_publish.py` | Markdown 直传 | `python3 脚本/feishu_article_unified_publish.py --parent <t> --title "标题" --md /路径.md` |
| `feishu_wiki_create_doc.py` | 创建 Wiki 子文档 | `python3 脚本/feishu_wiki_create_doc.py --parent <t> --title "标题"` |
| `smart_write_wiki.py` | 智能写入（含分栏） | 脚本内调用 |

---

## 十一、错误排查

| 问题 | 原因 | 解决 |
|:---|:---|:---|
| 9499 `Invalid parameter: cells` | table(31) 带 cells 不支持 | 改用 TSV 正文(2) 或 sheet(30) |
| 1770001 `invalid param` | 字段名/格式错误 | 确认字段名正确；图片先上传再用 token |
| 1770013 | file_token 关联错误 | upload_all 时 parent_node 用正确 obj_token |
| token 过期 | access_token 有效期 2 小时 | `python3 脚本/feishu_token_cli.py get-access-token` |
| 多维表格权限不足 | 未开通 bitable:app | `python3 脚本/feishu_force_reauth.py` |
| 块数 > 50 写入失败 | 单次限制 50 块 | 分批写入，每批 ≤ 50 |
| sheet 超 9×9 报错 | 电子表格创建上限 | 改用 TSV 正文(2) 回退 |
| 写入串月 | wiki_token 路由错误 | 写前校验文档标题含目标月份 |

---

**版本**：2.0 | **整理**：卡若AI 水桥 | **更新**：2026-03-12  
**数据来源**：52 个 `.feishu.json` + 6 个脚本 + 飞书开放平台 API 文档
