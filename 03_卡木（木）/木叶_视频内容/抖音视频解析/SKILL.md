---
name: 抖音视频解析
description: 抖音链接 → 解析ID → 提取文案 →（按需下载视频）。默认下载完成后删除 mp4，仅保留文案；口播转写走临时目录，转写结束即清理。短链支持含连字符。
triggers: 抖音视频、抖音链接、抖音解析、抖音下载、提取抖音文案、抖音无水印
owner: 木叶
group: 木
version: "1.2"
updated: "2026-03-31"
---

# 抖音视频解析

> **输入**：抖音视频链接（短链 `v.douyin.com/xxx` 或完整 `www.douyin.com/video/xxx`，短链 path 可含 `-`）或整段「复制打开抖音…」粘贴  
> **输出**：解析出的 ID、**页面文案**（`{aweme_id}_文案.json` / `.txt`）；**默认不长期保存 mp4**（见下「存储策略」）

---

## 存储策略（重要）

| 场景 | 视频文件 | 文案/转写 | 说明 |
|------|-----------|-----------|------|
| `douyin_parse.py` **默认**（带下载） | 下载校验后 **立即删除** mp4 | 保留 `-o` 目录下 `_文案.json` / `_文案.txt` | 需存档视频时加 **`--keep-video`** |
| `douyin_parse.py --no-download` | 不下载 | 仅文案 | 最轻量 |
| `douyin_video_to_text.sh` 口播转写 | 使用 `/tmp/douyin_extract_*`，脚本结束 **`trap` 整目录删除**（含临时 mp4、临时转写中间文件） | 仅 **`卡若Ai的文件夹/导出/*_转写.txt`** 保留（若不需要可手动删） | 解析阶段对 `douyin_parse` 传 **`--keep-video`**，避免转写前被删；转写后仍由 `trap` 清缓存 |

**原则**：分析/转写完成后 **不长期占用磁盘**；只保留你明确需要的 **文案 JSON/TXT** 或 **口播转写 txt**。

---

## 核心能力

1. **解析 ID**：从链接或页面提取 `aweme_id`、`video_id`、`file_id`
2. **提取文案**：从页面 metadata 提取标题、正文、话题标签
3. **下载视频（可选）**：拉取无水印 mp4 用于校验或口播链；**默认下载后删除文件**

---

## 触发词

- 抖音视频、抖音链接
- 抖音解析、抖音下载
- 提取抖音文案、抖音无水印

---

## 执行步骤

### 用户提供抖音链接或整段分享文案时

1. **解析链接**：从文本中**自动提取**首条 `https://v.douyin.com/...`（支持「复制打开抖音…」整段粘贴）；再识别短链 / 完整链接，提取 `aweme_id`
2. **获取页面**：requests 获取页面（移动端 UA）；失败时可用 MCP 浏览器访问
3. **提取文案**：从页面 title、meta、`__vid`、`ROUTER_DATA` 等提取标题、正文、话题
4. **提取视频 URL**：从 `<source src="...">` 或 JSON 中获取 CDN/Play 链接
5. **下载视频（若未 `--no-download`）**：流式下载；**默认成功后删除 mp4**

### 一键命令（命令行粘贴链接即提取）

```bash
cd /Users/karuo/Documents/个人/卡若AI/03_卡木（木）/木叶_视频内容/抖音视频解析/脚本

# 推荐：仅页面文案，不下载视频
./douyin_caption_only.sh "https://v.douyin.com/xxx"

# 整段分享语（自动抽短链）
python3 douyin_parse.py '复制打开抖音… https://v.douyin.com/xxx-xxx/' --no-download

# 下载校验后删视频，只留文案（默认行为）
python3 douyin_parse.py "https://v.douyin.com/xxx"

# 需要把 mp4 留在 -o 目录时
python3 douyin_parse.py "https://v.douyin.com/xxx" --keep-video

# missuo 兜底（勿商用）
python3 douyin_parse.py "https://v.douyin.com/xxx" --no-download --missuo-fallback
```

- **口播转文字**：`01_卡资（金）/金盾_数据安全/存客宝副本管理/douyin_video_to_text.sh`（MLX-Whisper；临时目录自动清理；产出见上表）

---

## 相关文件

| 文件 | 说明 |
|------|------|
| `脚本/douyin_parse.py` | 解析与下载主脚本（默认删视频） |
| `参考资料/ID与文案解析规则.md` | ID、文案、视频 URL 提取规则说明 |
| `参考资料/GitHub项目参考_抖音文案与字幕.md` | 开源项目与 missuo 接口说明 |

---

## 输出目录（默认）

- **页面文案**：`-o` 目录（默认 `~/Documents/卡若Ai的文件夹/视频/`）下 `{aweme_id}_文案.json`、`_文案.txt`
- **视频**：默认不保留；`--keep-video` 时保留同目录 mp4

---

## AI 执行说明（Cursor）

当用户给出抖音链接时：

1. 读本 SKILL.md
2. 执行 `python3 douyin_parse.py "用户提供的链接"`（默认不长期存视频）
3. 若 requests 被拦截（403/超时），使用 MCP 浏览器辅助提取页面信息
4. 结果按复盘格式回复用户

---

## 依赖

- Python 3.8+
- requests
- 可选：MCP 浏览器（requests 失败时）

---

## 解析规则（简要）

| 字段 | 来源 | 示例 |
|------|------|------|
| aweme_id / __vid | URL 或 `__vid=` | 7607519346462286491 |
| video_id | `video_id=` | v02f52g10003d69l7afog65sirkjgcag |
| file_id | `file_id=` | f7a8f7b2af594e6d93f3588e7ff4ec66 |
| 文案 | 页面 title、meta、ROUTER_DATA | 标题+正文+话题 |
| 视频 URL | `<source src>` 或 play API | douyinvod.com / aweme/v1/play |
