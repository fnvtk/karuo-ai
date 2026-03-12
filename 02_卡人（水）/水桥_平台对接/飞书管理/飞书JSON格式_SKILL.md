---
name: 飞书JSON格式
description: 飞书文档 JSON 格式速查、编写、上传与翻译；各 block_type 格式写法、Markdown 转换对照、标准操作流程一站式参考
triggers: 飞书json、飞书json格式、飞书block、飞书块格式、飞书文档格式、json上传飞书、飞书格式怎么写、block_type、飞书块类型、飞书写入格式、飞书上传json、飞书文档block、飞书高亮块、飞书代码块、飞书待办块、飞书标题块、飞书分割线、飞书callout、飞书多维表格json、飞书列表、飞书表格、飞书分栏、更新飞书JSON格式
owner: 水桥
group: 水
version: "2.0"
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
- **表格策略**：根据行列数自动选择 sheet/TSV 回退方案
- **API 对照**：提供飞书 Docx API 路径、参数、错误排查

---

## 怎么用（Usage）

触发词：飞书json、飞书block、block_type、飞书格式怎么写、飞书文档格式、json上传飞书、飞书callout、飞书高亮块、飞书待办、飞书代码块、飞书多维表格、飞书列表、飞书表格、飞书分栏

---

## 强制操作流程（SOP · 以后所有飞书文档按此执行）

### 流程 A：写文档 → 转 JSON → 上传

```
1. 本地写 Markdown
   ↓
2. 转 .feishu.json：
   python3 脚本/md_to_feishu_json.py /path/to/文章.md
   ↓
3. 上传飞书 Wiki：
   python3 脚本/upload_json_to_feishu_doc.py /path/to/文章.feishu.json --parent <wiki_token> --title "标题"
   ↓
4. 打开飞书链接验证格式
```

### 流程 B：Markdown 直传（不经 JSON）

```bash
python3 /Users/karuo/Documents/个人/卡若AI/02_卡人（水）/水桥_平台对接/飞书管理/脚本/feishu_article_unified_publish.py \
  --parent <wiki_node_token> --title "标题" --md /绝对路径/文章.md
```

### 流程 C：批量目录上传

```bash
python3 /Users/karuo/Documents/个人/卡若AI/02_卡人（水）/水桥_平台对接/飞书管理/脚本/batch_upload_json_to_feishu_wiki.py \
  /本地目录 --wiki-parent <token>
```

### 流程 D：飞书导出 JSON 回传

```bash
python3 /Users/karuo/Documents/个人/卡若AI/02_卡人（水）/水桥_平台对接/飞书管理/脚本/upload_json_to_feishu_doc.py \
  /path/to/导出.json --parent <token> --title "标题"
```

### 流程 E：AI 直接生成 blocks 写入

```
1. 用户描述文档内容
   ↓
2. AI 按下方「格式速查卡」生成 children 数组
   ↓
3. 调用 feishu_wiki_create_doc.py 或 API 写入
```

---

## 执行步骤（Steps）

### 场景 A：生成飞书 JSON blocks

1. 理解用户内容需求
2. 按「格式速查卡」选择对应块类型
3. 输出完整 `children` 数组，可直接写入

### 场景 B：Markdown → 飞书 blocks

1. 解析标题层级（`#`→3，`##`→4，`###`→5，`####`→6）
2. 按「转换规则表」逐段转换
3. 输出 `.feishu.json`（`title + source + children`）

### 场景 C：内容涉及表格时的决策

```
Markdown 表格
├── 行列 ≤ 9×9 → 优先 sheet(30) 空表格 + 写入单元格
├── 行列 > 9×9 → 用 text(2) TSV 回退
└── API 失败 → 用 text(2) TSV 回退（保底）
```

---

## 格式速查卡（完整块类型）

### 1. 正文（block_type: 2）

```json
// 普通正文
{"block_type": 2, "text": {"elements": [{"text_run": {"content": "文字内容"}}]}}

// 加粗 + 红色
{"block_type": 2, "text": {"elements": [{"text_run": {"content": "[重要紧急]", "text_element_style": {"bold": true, "text_color": 5}}}], "style": {"align": 1}}}

// 超链接
{"block_type": 2, "text": {"elements": [{"text_run": {"content": "点击查看", "text_element_style": {"link": {"url": "https://..."}}}}]}}

// 无序列表（正文块 + • 前缀，推荐）
{"block_type": 2, "text": {"elements": [{"text_run": {"content": "• 第一项要点"}}]}}
{"block_type": 2, "text": {"elements": [{"text_run": {"content": "• 第二项要点"}}]}}
{"block_type": 2, "text": {"elements": [{"text_run": {"content": "  • 子项缩进"}}]}}

// 有序列表（正文块 + 数字前缀，推荐）
{"block_type": 2, "text": {"elements": [{"text_run": {"content": "1）需求分析"}}]}}
{"block_type": 2, "text": {"elements": [{"text_run": {"content": "2）方案设计"}}]}}

// 表格 TSV 回退（制表符分隔）
{"block_type": 2, "text": {"elements": [{"text_run": {"content": "产品\t价格\t分润\n:---\t:---\t:---\n书籍小程序\t9.9元起\t90%"}}]}}
```

### 2. 标题（block_type: 3-11）

```json
{"block_type": 3, "heading1": {"elements": [{"text_run": {"content": "一级大标题"}}]}}
{"block_type": 4, "heading2": {"elements": [{"text_run": {"content": "📋 二级标题"}}]}}
{"block_type": 5, "heading3": {"elements": [{"text_run": {"content": "三级标题"}}]}}
{"block_type": 6, "heading4": {"elements": [{"text_run": {"content": "3月12日  "}}], "style": {"align": 1}}}
{"block_type": 7, "heading5": {"elements": [{"text_run": {"content": "五级标题"}}]}}
{"block_type": 8, "heading6": {"elements": [{"text_run": {"content": "六级标题"}}]}}
```

### 3. 高亮块 callout（block_type: 19）

```json
// 蓝色 [执行]
{"block_type": 19, "callout": {"emoji_id": "sunrise", "background_color": 2, "border_color": 2,
  "elements": [{"text_run": {"content": "[执行] 本月目标", "text_element_style": {"bold": true, "text_color": 7}}}]}}

// 橙色 [警告]
{"block_type": 19, "callout": {"emoji_id": "warning", "background_color": 4, "border_color": 4,
  "elements": [{"text_run": {"content": "注意：Token 2小时过期"}}]}}

// 绿色 [完成]
{"block_type": 19, "callout": {"emoji_id": "white_check_mark", "background_color": 3, "border_color": 3,
  "elements": [{"text_run": {"content": "已完成：运营报表写入成功"}}]}}

// 红色 [紧急]
{"block_type": 19, "callout": {"emoji_id": "fire", "background_color": 6, "border_color": 6,
  "elements": [{"text_run": {"content": "紧急：需立即处理"}}]}}
```

**callout 颜色对照**：1=白 2=蓝 3=绿 4=橙 5=黄 6=红 7=紫

**常用 emoji_id**：sunrise🌅 warning⚠️ white_check_mark✅ bulb💡 fire🔥 star⭐ rocket🚀 dart🎯 memo📝 quote

### 4. 代码块（block_type: 14）

```json
{"block_type": 14, "code": {
  "elements": [{"text_run": {"content": "流量入口\n  ↓\n存客宝AI分层\n  ↓\n精准变现"}}],
  "style": {"language": 1}
}}
```

**language**：1=纯文本 2=Python 3=JS 4=Java 5=Go 6=Shell 7=TypeScript 8=SQL 19=JSON 20=YAML

### 5. 待办（block_type: 17）

```json
{"block_type": 17, "todo": {"elements": [{"text_run": {"content": "Soul 派对→突破500在线 🎬 (0%)"}}], "style": {"done": false, "align": 1}}}
{"block_type": 17, "todo": {"elements": [{"text_run": {"content": "运营报表已写入"}}], "style": {"done": true, "align": 1}}}
```

### 6. 分割线（block_type: 22）

```json
{"block_type": 22, "divider": {}}
```

### 7. 图片文件（block_type: 12）

```bash
# 第一步：上传拿 file_token
POST drive/v1/medias/upload_all  (form-data: file_name, parent_type=docx_image, parent_node=obj_token, size, file)
```

```json
// 第二步：插入 file 块
{"block_type": 12, "file": {"file_token": "xxx", "view_type": "inline", "file_name": "chart.png"}}

// 或画廊块（多图）
{"block_type": 18, "gallery": {"image_list": [{"file_token": "xxx"}], "gallery_style": {"align": "center"}}}
```

### 8. 分栏（block_type: 24 + 25）

```json
// 创建两栏容器
{"block_type": 24, "grid": {"column_size": 2}}
// 子列（API 自动生成，内容插入到各列下）
{"block_type": 25, "grid_column": {"width_ratio": 50}}
```

### 9. 电子表格（block_type: 30）

```json
{"block_type": 30, "sheet": {"row_size": 5, "column_size": 4}}
```

> 最大 9×9，创建后通过 sheets API 写入单元格

### 10. 多维表格（block_type: 43）

```json
{"block_type": 43, "bitable": {"token": "bascnXXX"}}
```

> 须 bitable:app 权限

---

## Markdown → 飞书 Block 转换规则（完整版）

| Markdown | block_type | 字段名 | 备注 |
|:---|:---|:---|:---|
| `# 标题` | 3 | heading1 | |
| `## 标题` | 4 | heading2 | |
| `### 标题` | 5 | heading3 | |
| `#### 标题` | 6 | heading4 | |
| `##### 标题` | 7 | heading5 | |
| `###### 标题` | 8 | heading6 | |
| 普通段落 | 2 | text | |
| `**加粗**` | 2 | bold=true | elements 拆分 |
| `*斜体*` | 2 | italic=true | |
| `~~删除线~~` | 2 | strikethrough=true | |
| `` `代码` `` | 2 | inline_code=true | |
| `[链接](url)` | 2 | link.url | |
| `> 引用` | 19 | callout 蓝色 | |
| `---` | 22 | divider | |
| ` ```代码``` ` | 14 | code | 自动识别 language |
| `![图](路径)` | 12 | file | 先 upload_all |
| `- 无序` | 2 | `• ` 前缀 | 正文块模拟 |
| `1. 有序` | 2 | `1）` 前缀 | 正文块模拟 |
| `- [ ]` | 17 | done=false | |
| `- [x]` | 17 | done=true | |
| 表格 ≤9×9 | 30 | sheet | |
| 表格 >9×9 | 2 | TSV 正文 | 保底方案 |

---

## text_element_style 参数

```json
{
  "bold": true, "italic": true, "strikethrough": true, "underline": true, "inline_code": true,
  "text_color": 5,         // 1黑 2深灰 3深橙 4橙 5红 6玫红 7紫 8浅蓝 9深蓝 10绿
  "background_color": 2,
  "link": {"url": "https://..."}
}
```

---

## API 速查

| 用途 | 方法 | 路径 |
|:---|:---|:---|
| 获取 Wiki 节点 | GET | `wiki/v2/spaces/get_node?token={wiki_token}` |
| 获取文档块 | GET | `docx/v1/documents/{doc_id}/blocks` |
| **追加子块** | POST | `docx/v1/documents/{doc_id}/blocks/{block_id}/children` |
| 批量删除块 | POST | `docx/v1/documents/{doc_id}/blocks/batch_delete` |
| **上传图片/文件** | POST | `drive/v1/medias/upload_all` |
| 创建 Wiki 子节点 | POST | `wiki/v2/spaces/{space_id}/nodes` |
| 创建多维表格 | POST | `bitable/v1/apps` |
| 写入表格单元格 | PUT | `sheets/v2/spreadsheets/{token}/values` |

**追加子块请求体**：`{"children": [块1, 块2, ...], "index": 0}`  
> `index: 0` = 最前，不传 = 末尾。**单次 ≤ 50 块**

---

## 错误排查

| 错误码 | 原因 | 解决 |
|:---|:---|:---|
| 9499 | table(31) 带 cells 不支持 | TSV 正文(2) 或 sheet(30) |
| 1770001 | 字段名/格式错误 | 确认字段名；图片先上传再插入 |
| 1770013 | file_token 关联错误 | parent_node 用正确的 obj_token |
| token 过期 | 2小时有效期 | `python3 脚本/feishu_token_cli.py get-access-token` |
| 多维表格权限不足 | 未开通 bitable:app | `python3 脚本/feishu_force_reauth.py` |
| 块数 > 50 | 单次写入上限 | 分批，每批 ≤ 50 |
| sheet >9×9 | 电子表格上限 | 改用 TSV 正文(2) 回退 |

---

## 相关文件（Files）

- **全量手册**：`参考资料/飞书JSON格式全手册.md`（v2.0，含完整枚举+SOP+决策树）
- **API 对照**：`参考资料/飞书日志JSON格式与API对照.md`
- **图片 API**：`参考资料/飞书docx插入图片_API说明.md`
- **转换脚本**：`脚本/md_to_feishu_json.py`
- **上传脚本**：`脚本/upload_json_to_feishu_doc.py`
- **批量上传**：`脚本/batch_upload_json_to_feishu_wiki.py`
- **统一发布**：`脚本/feishu_article_unified_publish.py`
- **项目样本**：`/Users/karuo/Documents/1、金：项目/3、自营项目/soul创业实验/飞书格式/`（52 个文件）

---

## 依赖（Dependencies）

- 前置技能：W07 飞书管理（Token 授权、写入日志）
- 外部工具：python3、飞书开放平台 access_token
