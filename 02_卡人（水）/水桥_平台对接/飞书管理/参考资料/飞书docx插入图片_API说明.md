# 飞书 Docx 文档插入图片 · API 说明

> 便于以后在日志/文档中直接插入图片。两步：先上传素材，再创建块。

---

## 一、两步流程

### 1. 上传图片（获取 file_token）

- **接口**：`POST https://open.feishu.cn/open-apis/drive/v1/medias/upload_all`
- **Content-Type**：`multipart/form-data`
- **必填字段**：
  - `file_name`：文件名，如 `chart.png`
  - `parent_type`：固定 `docx_image`（表示挂到某 docx 下）
  - `parent_node`：目标文档的 **doc_token**（即 wiki 节点对应的 `obj_token`）
  - `size`：文件大小（字节数，字符串）
  - `file`：图片二进制
- **返回**：`data.file_token`，后续创建块时使用。
- **限制**：单文件 ≤ 20MB；上传接口约 5 QPS。

### 2. 在文档中插入图片块

- **接口**：`POST https://open.feishu.cn/open-apis/docx/v1/documents/{document_id}/blocks/{block_id}/children`
- **说明**：在 `block_id`（通常用文档根 `document_id` 作为父块）下插入子块；`index` 为插入位置（从 0 起）。
- **Body** 示例：
  - **图片块（file）**：`block_type = 12`
    ```json
    {
      "children": [{
        "block_type": 12,
        "file": {
          "file_token": "上传返回的 file_token",
          "view_type": "inline",
          "file_name": "chart.png"
        }
      }],
      "index": 3
    }
    ```
  - **画廊块（gallery）**：`block_type = 18`，单图也可用
    ```json
    {
      "children": [{
        "block_type": 18,
        "gallery": {
          "image_list": [{"file_token": "xxx"}],
          "gallery_style": {"align": "center"}
        }
      }],
      "index": 3
    }
    ```

- **常见错误**：
  - **1770001 invalid param**：多为请求体字段名/格式不符合（如需用 snake_case 或 camelCase，需以实际文档为准）。
  - **1770013**：图片/文件关联关系不正确，需先上传素材再使用返回的 `file_token`。

---

## 二、本仓库脚本参考

- **上传**：`脚本/feishu_publish_blocks_with_images.py` 中 `upload_image_to_doc()`
- **file 块**：同上，`_make_file_block(file_token, filename)`
- **gallery 块**：同上，`_make_gallery_block(file_token)`
- **今日日志+图**：`脚本/write_today_log_with_image.py`（生成对比图 → 上传 → 插入；若插入报 1770001，可先手动拖入图片）

---

## 三、手动插入图片

若 API 插入一直报错（如 1770001），可：

1. 对比图已由 `write_today_log_with_image.py` 生成并复制到 **`参考资料/昨日今日完成度对比.png`**。
2. 打开对应飞书文档（2 月日志），在今日日志处直接拖入该图片或粘贴。

---

**版本**：2026-02-26
