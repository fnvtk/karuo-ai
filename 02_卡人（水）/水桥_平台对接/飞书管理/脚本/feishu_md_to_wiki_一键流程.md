# Markdown → 飞书 JSON → 直接上传图片 · 一键流程

> 按飞书文档格式：本地先转 JSON，再以 JSON 直接上传图片到 Wiki 文档。

---

## 流程说明

| 步骤 | 操作 | 说明 |
|:---|:---|:---|
| 1 | 本地转 JSON | `md_to_feishu_json.py` 将 Markdown 转为飞书 docx blocks JSON |
| 2 | 写入 image_paths | JSON 内含 `image_paths` 数组（相对路径），供上传脚本读取 |
| 3 | 直接上传图片 | 上传脚本按 `image_paths` 上传到文档素材，并写入 blocks |

---

## 基因胶囊文章 · 一键命令

```bash
cd /Users/karuo/Documents/个人/卡若AI

# Step 1: Markdown → 飞书 JSON（含图片占位与 image_paths）
python3 "02_卡人（水）/水桥_平台对接/飞书管理/脚本/md_to_feishu_json.py" \
  "/Users/karuo/Documents/个人/2、我写的日记/火：开发分享/卡若：基因胶囊——AI技能可遗传化的实现与落地.md" \
  "/Users/karuo/Documents/个人/2、我写的日记/火：开发分享/卡若_基因胶囊_AI技能可遗传化_feishu_blocks.json" \
  --images "assets/基因胶囊_概念与流程.png,assets/基因胶囊_完整工作流程图.png"

# Step 2: 按 JSON 直接上传图片并创建/更新飞书文档
python3 "02_卡人（水）/水桥_平台对接/飞书管理/脚本/feishu_wiki_gene_capsule_article.py"
```

---

## JSON 格式规范（飞书 docx blocks）

```json
{
  "description": "由 xxx.md 转换的飞书 docx blocks",
  "image_paths": ["assets/图1.png", "assets/图2.png"],
  "children": [
    {"block_type": 3, "heading1": {...}},
    {"block_type": 2, "text": {"elements": [{"text_run": {"content": "【配图 1：待上传】"}}]}},
    {"block_type": 4, "heading2": {...}}
  ]
}
```

- `image_paths`：相对文章目录的图片路径，按 `【配图 1】`、`【配图 2】` 顺序对应
- `children`：飞书 blocks 数组，`block_type` 2=文本、3=一级标题、4=二级、18=gallery（图片）
- 上传时脚本会将 `【配图 N】` 替换为 gallery 块（若 API 支持）或保留文本说明

---

## 注意事项

- 图片块（block_type 18 gallery）若飞书 API 报 `invalid param`，会退化为文本说明，图片仍上传至文档素材，用户可手动「插入 → 图片 → 文档素材」插入
- `image_paths` 建议用相对路径，便于 JSON 迁移
