# 飞书日志 JSON 格式与 API 对照

> 基于实际导出文档「2026年2月 突破执行.json」整理，便于上传日志、图片、文件时与飞书 Docx API 对齐。

---

## 一、导出 JSON 整体结构

飞书 Wiki 文档导出后通常包含：

| 字段 | 说明 |
|:---|:---|
| `content` | 全文纯文本，按块顺序拼接，换行分隔 |
| `blocks` | 块数组，每项为一块的完整结构（含 block_id、block_type、parent_id 及类型专属字段） |

- **写入 API 时**：只提交「要新增的子块」，格式与导出中单块结构一致，但**不要带** `block_id`（由服务端生成）；`parent_id` 在请求 URL 中体现为在哪个 block 下插入。
- **插入接口**：`POST /docx/v1/documents/{document_id}/blocks/{block_id}/children`，body 为 `{ "children": [ 块1, 块2, ... ], "index": 插入位置 }`。

---

## 二、block_type 与块类型对照（与实际导出一致）

| block_type | 类型 | 导出字段名 | 写入 API 时 body 要点 |
|:---|:---|:---|:---|
| 1 | 页面 | `page` | 根节点，不通过 children 创建 |
| 2 | 正文 | `text` | `text.elements[].text_run.content`、可选 `text_element_style`（bold、text_color 等） |
| 3 | 一级标题 | `heading1` | `heading1.elements[].text_run.content` |
| 4 | 二级标题 | `heading2` | `heading2.elements[].text_run.content` |
| 6 | 四级标题 | `heading4` | `heading4.elements[].text_run.content`，日志日期用此 |
| 12 | 文件/图片（API 创建） | - | `file.file_token`、`file.viewType`(inline)、`file.fileName`；需先上传拿 file_token |
| 17 | 待办 | `todo` | `todo.elements[].text_run.content`、`todo.style.done`、`align` |
| 18 | 画廊 | `gallery` | `gallery.imageList[].fileToken`，单图也可用 |
| 19 | 高亮块 | `callout` | `callout.background_color`、`border_color`、`emoji_id`（如 sunrise） |
| 27 | 图片（导出） | `image` | 导出用；**写入用 12 file**，先 `drive/v1/medias/upload_all` 上传 |
| 43 | 多维表格 | `board`/`bitable` | 导出为 `board.token`；写入用 `bitable.token`。按原格式上传时由 `upload_json_to_feishu_doc.py` 新建多维表格并嵌入 |

---

## 三、日志常用块示例（与 auto_log / 脚本一致）

### 1. 四级标题（日期）

```json
{
  "block_type": 6,
  "heading4": {
    "elements": [{"text_run": {"content": "2月28日  "}}],
    "style": {"align": 1}
  }
}
```

### 2. 高亮块 [执行]

```json
{
  "block_type": 19,
  "callout": {
    "emoji_id": "sunrise",
    "background_color": 2,
    "border_color": 2,
    "elements": [{"text_run": {"content": "[执行]", "text_element_style": {"bold": true, "text_color": 7}}}]
  }
}
```

### 3. 正文（象限标题）

```json
{
  "block_type": 2,
  "text": {
    "elements": [{"text_run": {"content": "[重要紧急]", "text_element_style": {"bold": true, "text_color": 5}}}],
    "style": {"align": 1}
  }
}
```

### 4. 待办

```json
{
  "block_type": 17,
  "todo": {
    "elements": [{"text_run": {"content": "卡若（今日复盘、本月与最终目标、今日核心）"}}],
    "style": {"done": false, "align": 1}
  }
}
```

### 5. 图片（先上传再插入）

- 上传：`POST drive/v1/medias/upload_all`，`parent_type=docx_image`，`parent_node=文档 obj_token`，得 `file_token`。
- 插入块：`block_type: 12`，`file: { file_token, viewType: "inline", fileName: "xxx.png" }`。

详见 `参考资料/飞书docx插入图片_API说明.md`。

---

## 四、相关 API 一览

| 用途 | 方法 | 路径 |
|:---|:---|:---|
| 获取 Wiki 节点（拿 doc 的 obj_token） | GET | `wiki/v2/spaces/get_node?token={wiki_token}` |
| 拉取文档块列表 | GET | `docx/v1/documents/{document_id}/blocks` |
| 在指定块下追加子块 | POST | `docx/v1/documents/{document_id}/blocks/{block_id}/children` |
| 上传图片/文件 | POST | `drive/v1/medias/upload_all` |
| 批量删除块 | POST | `docx/v1/documents/{document_id}/blocks/batch_delete`（请求体格式以官方文档为准） |

---

## 五、与本仓库脚本的对应关系

| 脚本 | 说明 |
|:---|:---|
| `auto_log.py` | 按 TNTWF 构建 blocks，调用 children 插入到 2 月文档「本月最重要的任务」后 |
| `write_today_feishu_log.py` | 构建今日任务 blocks，同上插入 |
| `feishu_publish_blocks_with_images.py` | 读本地 blocks JSON + image_paths，上传图片后插入 file 块（block_type 12） |
| `write_today_log_with_image.py` | 生成对比图 → 上传 → 插入；若插入报 1770001 可改用手动拖入图片 |

**格式迭代建议**：新增或修改「写入飞书」逻辑时，以本 JSON 格式与上表 block_type 为准，与导出结构对齐，便于后续解析、回写或二次导出。

---

**版本**：2026-03-01  
**依据**：实际导出文件「2026年2月 突破执行.json」
