---
name: 飞书JSON格式
description: 飞书文档 JSON 格式速查、编写、上传与翻译；各 block_type 格式写法、Markdown 转换对照、API 路径一站式参考
triggers: 飞书json、飞书json格式、飞书block、飞书块格式、飞书文档格式、json上传飞书、飞书格式怎么写、block_type、飞书块类型、飞书写入格式、飞书上传json、飞书文档block、飞书高亮块、飞书代码块、飞书待办块、飞书标题块、飞书分割线、飞书callout、飞书多维表格json
owner: 水桥
group: 水
version: "1.0"
updated: "2026-03-12"
---

# 飞书 JSON 格式 Skill

> 搞定了，清清爽爽。—— 卡人（水）

---

## 能做什么（Capabilities）

- **速查 block_type**：根据需求快速输出对应格式的完整 JSON 块
- **Markdown 翻译**：把任意 Markdown 内容转成飞书 blocks 数组
- **上传文档**：利用现有脚本将 JSON 或 Markdown 上传到飞书 Wiki
- **格式排版**：对文档内容进行飞书风格的结构化整理
- **API 对照**：提供飞书 Docx API 路径、参数、错误排查

---

## 怎么用（Usage）

触发词：飞书json、飞书block、block_type、飞书格式怎么写、飞书文档格式、json上传飞书、飞书callout、飞书高亮块、飞书待办、飞书代码块、飞书多维表格

---

## 执行步骤（Steps）

### 场景 A：生成飞书 JSON blocks

1. 理解用户要写的内容（标题层级、正文、表格、代码、高亮块等）
2. 查本 SKILL 的「格式速查卡」对应条目
3. 输出完整 `children` 数组，可直接传给写入 API

### 场景 B：Markdown → 飞书 blocks

1. 解析 Markdown 标题层级（`#`→3，`##`→4，`###`→5，`####`→6）
2. 按下方「转换规则表」逐段转换
3. 输出 `.feishu.json` 格式（`title + source + children`）

### 场景 C：上传到飞书

```bash
# 上传单个 JSON（自动判断文档/多维表格）
python3 /Users/karuo/Documents/个人/卡若AI/02_卡人（水）/水桥_平台对接/飞书管理/脚本/upload_json_to_feishu_doc.py /path/to/xxx.json

# 指定父节点和标题
python3 .../upload_json_to_feishu_doc.py /path/xxx.json --parent <wiki_node_token> --title "文档标题"

# Markdown 直接上传
python3 .../feishu_article_unified_publish.py --parent <token> --title "标题" --md /绝对路径/文章.md

# 批量目录上传
python3 .../batch_upload_json_to_feishu_wiki.py /本地目录 --wiki-parent <token>
```

---

## 格式速查卡（核心块类型）

### 1. 正文块（最常用）

```json
// 普通正文
{"block_type": 2, "text": {"elements": [{"text_run": {"content": "文字内容"}}]}}

// 加粗 + 红色
{"block_type": 2, "text": {
  "elements": [{"text_run": {"content": "[重要紧急]", "text_element_style": {"bold": true, "text_color": 5}}}],
  "style": {"align": 1}
}}

// 超链接
{"block_type": 2, "text": {
  "elements": [{"text_run": {"content": "点击查看", "text_element_style": {"link": {"url": "https://..."}}}]}
}}

// 表格回退（TSV 正文，实际项目常用）
{"block_type": 2, "text": {
  "elements": [{"text_run": {"content": "产品\t价格\t分润\n:---\t:---\t:---\n书籍小程序\t9.9元起\t90%"}}]
}}
```

### 2. 标题块

```json
{"block_type": 3, "heading1": {"elements": [{"text_run": {"content": "一级标题"}}]}}
{"block_type": 4, "heading2": {"elements": [{"text_run": {"content": "📋 二级标题"}}]}}
{"block_type": 5, "heading3": {"elements": [{"text_run": {"content": "三级标题"}}]}}
// 四级标题（日志日期专用）
{"block_type": 6, "heading4": {"elements": [{"text_run": {"content": "3月12日  "}}], "style": {"align": 1}}}
```

### 3. 高亮块 callout

```json
// 蓝色 [执行]
{"block_type": 19, "callout": {"emoji_id": "sunrise", "background_color": 2, "border_color": 2,
  "elements": [{"text_run": {"content": "[执行] 本月目标：日活突破500", "text_element_style": {"bold": true, "text_color": 7}}}]}}

// 橙色 [警告]
{"block_type": 19, "callout": {"emoji_id": "warning", "background_color": 4, "border_color": 4,
  "elements": [{"text_run": {"content": "注意：Token 2小时过期"}}]}}

// 绿色 [完成]
{"block_type": 19, "callout": {"emoji_id": "white_check_mark", "background_color": 3, "border_color": 3,
  "elements": [{"text_run": {"content": "已完成：运营报表写入成功"}}]}}
```

**callout background_color 对照**：1=白、2=蓝、3=绿、4=橙、5=黄、6=红、7=紫

### 4. 代码块

```json
{"block_type": 14, "code": {
  "elements": [{"text_run": {"content": "流量入口\n  ↓\n存客宝AI分层\n  ↓\n精准变现"}}],
  "style": {"language": 1}
}}
```

**language 常用值**：1=纯文本/流程图，2=Python，3=JS，6=Shell，8=SQL

### 5. 待办

```json
// 未完成
{"block_type": 17, "todo": {"elements": [{"text_run": {"content": "Soul 派对→本月突破500在线 🎬 (0%)"}}],
  "style": {"done": false, "align": 1}}}

// 已完成
{"block_type": 17, "todo": {"elements": [{"text_run": {"content": "运营报表已写入飞书"}}],
  "style": {"done": true, "align": 1}}}
```

### 6. 分割线

```json
{"block_type": 22, "divider": {}}
```

### 7. 图片（两步走）

```bash
# 第一步：上传图片拿 file_token
POST drive/v1/medias/upload_all
form-data: file_name=chart.png, parent_type=docx_image, parent_node=<obj_token>, size=<bytes>, file=<binary>
# 返回: data.file_token
```

```json
// 第二步：插入 file 块
{"block_type": 12, "file": {"file_token": "xxx", "view_type": "inline", "file_name": "chart.png"}}

// 或 gallery 块（多图）
{"block_type": 18, "gallery": {"image_list": [{"file_token": "xxx"}], "gallery_style": {"align": "center"}}}
```

---

## Markdown → 飞书 Block 转换规则

| Markdown | 飞书 block_type | 字段名 |
|:---|:---|:---|
| `# 标题` | 3 | heading1 |
| `## 标题` | 4 | heading2 |
| `### 标题` | 5 | heading3 |
| `#### 标题` | 6 | heading4 |
| 普通段落 | 2 | text |
| `> 引用` | 19 | callout（background_color:2） |
| `---` | 22 | divider |
| ` ```代码``` ` | 14 | code（language:1） |
| `**加粗**` | 2 | text_element_style.bold=true |
| `![图](路径)` | 12 | file（先 upload_all） |
| Markdown 表格 | 2 | TSV 正文回退（接口不支持带内容表格块） |
| `- [ ]` 未完成 | 17 | todo.style.done=false |
| `- [x]` 已完成 | 17 | todo.style.done=true |

---

## text_element_style 样式参数

```json
{
  "text_element_style": {
    "bold": true,
    "italic": true,
    "strikethrough": true,
    "underline": true,
    "inline_code": true,
    "text_color": 5,         // 1黑 2深灰 3深橙 4橙 5红 6玫红 7紫 8浅蓝 9深蓝 10绿
    "background_color": 2,   // 行内高亮
    "link": {"url": "https://..."}
  }
}
```

---

## API 速查

| 用途 | 方法 | 路径 |
|:---|:---|:---|
| 获取 Wiki 节点 | GET | `wiki/v2/spaces/get_node?token={wiki_token}` |
| 拉取文档块列表 | GET | `docx/v1/documents/{doc_id}/blocks` |
| 追加子块（写入内容） | POST | `docx/v1/documents/{doc_id}/blocks/{block_id}/children` |
| 批量删除块 | POST | `docx/v1/documents/{doc_id}/blocks/batch_delete` |
| 上传图片/文件 | POST | `drive/v1/medias/upload_all` |
| 创建 Wiki 子节点 | POST | `wiki/v2/spaces/{space_id}/nodes` |
| 创建多维表格 | POST | `bitable/v1/apps` |

**追加子块请求体格式**：
```json
{"children": [块1, 块2, ...], "index": 0}
```
> `index: 0` = 最前，`-1` 或不传 = 末尾，单次 ≤ 50 块

---

## 错误排查

| 错误码 | 原因 | 解决 |
|:---|:---|:---|
| 9499 | 带 cells 的 table 块不支持 | 改用 TSV 正文回退 |
| 1770001 | 字段名/格式错误 | 确认字段名正确；图片先上传再用 token |
| 1770013 | file_token 文档关联错误 | upload_all 时 parent_node 用正确的 obj_token |
| token 过期 | access_token 2 小时有效期 | `python3 脚本/feishu_token_cli.py get-access-token` |
| 多维表格权限不足 | 未开通 bitable:app | 后台开通后 `python3 脚本/feishu_force_reauth.py` |

---

## 相关文件（Files）

- **全量手册**：`参考资料/飞书JSON格式全手册.md`
- **API 对照**：`参考资料/飞书日志JSON格式与API对照.md`
- **图片 API**：`参考资料/飞书docx插入图片_API说明.md`
- **上传脚本**：`脚本/upload_json_to_feishu_doc.py`
- **批量上传**：`脚本/batch_upload_json_to_feishu_wiki.py`
- **统一发布**：`脚本/feishu_article_unified_publish.py`
- **项目 JSON 样本**：`/Users/karuo/Documents/1、金：项目/3、自营项目/soul创业实验/飞书格式/`（52 个文件）

---

## 依赖（Dependencies）

- 前置技能：W07 飞书管理（Token 授权、写入日志）
- 外部工具：python3、飞书开放平台 access_token
