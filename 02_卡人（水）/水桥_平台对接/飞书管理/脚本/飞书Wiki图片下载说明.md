# 飞书 Wiki 页面图片下载（命令行 + Token）

## 脚本

`feishu_wiki_download_images.py`：从指定飞书 Wiki 页面 URL 下载该页面内所有图片，**仅用命令行 + 飞书 Token**，不使用 MCP。

## 用法

```bash
cd "/Users/karuo/Documents/个人/卡若AI/02_卡人（水）/水桥_平台对接/飞书管理/脚本"

# 方式一：环境变量传入 Token（推荐）
export FEISHU_TOKEN="t-xxx"   # 或 user_access_token: u-xxx
python3 feishu_wiki_download_images.py "https://xxx.feishu.cn/wiki/节点token" -o ./输出目录

# 方式二：使用同目录 .feishu_tokens.json（与 feishu_wiki_create_doc 一致，需先完成飞书授权）
python3 feishu_wiki_download_images.py "https://xxx.feishu.cn/wiki/节点token" -o ./输出目录

# 遍历当前节点下所有子页面（docx/sheet），汇总下载（适合目录/表格节点）
python3 feishu_wiki_download_images.py "https://xxx.feishu.cn/wiki/节点token" -o ./输出目录 --all-pages
```

## 支持的页面类型

- **docx**：新版文档（会拉取文档 blocks 中的图片/文件）
- **sheet**：电子表格（会尝试浮动图片 + 单元格附件中的 file_token）
- **doc**：旧版文档暂不支持，需在飞书内另存为新版后再用本脚本

## 说明

- 若该节点是「目录/表格」且未发现图片，说明图片可能在子页面；请打开具体带图片的文档页，复制其 Wiki URL 再运行本脚本。
- 依赖：`pip install requests`。
- 下载使用系统 `curl`，请求头带 `Authorization: Bearer <token>`。
