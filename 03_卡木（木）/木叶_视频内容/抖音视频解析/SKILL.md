---
name: 抖音视频解析
description: 抖音链接 → 解析ID → 提取文案 → 下载视频。输入任一抖音视频链接，自动解析aweme_id/video_id/file_id、提取标题与文案、下载无水印视频。
triggers: 抖音视频、抖音链接、抖音解析、抖音下载、提取抖音文案、抖音无水印
owner: 木叶
group: 木
version: "1.1"
updated: "2026-03-31"
---

# 抖音视频解析

> **输入**：抖音视频链接（短链 `v.douyin.com/xxx` 或完整 `www.douyin.com/video/xxx`）  
> **输出**：解析出的 ID、文案（标题/正文/话题）、下载的视频文件

---

## 核心能力

1. **解析 ID**：从链接或页面提取 `aweme_id`、`video_id`、`file_id`
2. **提取文案**：从页面 metadata 提取标题、正文、话题标签
3. **下载视频**：获取无水印视频并保存到本地

---

## 触发词

- 抖音视频、抖音链接
- 抖音解析、抖音下载
- 提取抖音文案、抖音无水印

---

## 执行步骤

### 用户提供抖音链接或整段分享文案时

1. **解析链接**：从文本中**自动提取**首条 `https://v.douyin.com/.../`（支持「复制打开抖音…」整段粘贴）；再识别短链 / 完整链接，提取 `aweme_id`
2. **获取页面**：requests 获取页面（移动端 UA）；失败时可用 MCP 浏览器访问
3. **提取文案**：从页面 title、meta、`__vid`、`ROUTER_DATA` 等提取标题、正文、话题
4. **提取视频 URL**：从 `<source src="...">` 或 JSON 中获取 CDN/Play 链接
5. **下载视频**：requests 流式下载，优先无水印链接（`playwm`→`play`）

### 一键命令（命令行粘贴链接即提取）

```bash
# 推荐：仅要页面文案，不下载视频（粘贴链接→终端输出文案+保存 .txt）
cd /Users/karuo/Documents/个人/卡若AI/03_卡木（木）/木叶_视频内容/抖音视频解析/脚本
./douyin_caption_only.sh "https://v.douyin.com/xxx"

# 整段抖音分享语也可（自动抽短链）
python3 douyin_parse.py '复制打开抖音，看看【xxx】… https://v.douyin.com/AbCdEf/' --no-download

# 页面被拦截时可选：missuo 公开接口兜底（GitHub: missuo/DouyinParsing，勿商用）
python3 douyin_parse.py "https://v.douyin.com/xxx" --no-download --missuo-fallback

# 或用 Python 直接调
python3 douyin_parse.py "https://v.douyin.com/xxx" --no-download

# 解析并下载视频
python3 douyin_parse.py "https://v.douyin.com/xxx"

# 指定输出目录
python3 douyin_parse.py "https://v.douyin.com/xxx" -o /path/to/output
```

- **仅文案**：`douyin_caption_only.sh` 或 `--no-download`，不下载视频。
- **视频内语音转文字**：用 `01_卡资（金）/金盾_数据安全/存客宝副本管理/douyin_video_to_text.sh`（需下载后 Whisper 转写）。

---

## 相关文件

| 文件 | 说明 |
|------|------|
| `脚本/douyin_parse.py` | 解析与下载主脚本 |
| `参考资料/ID与文案解析规则.md` | ID、文案、视频 URL 提取规则说明 |
| `参考资料/GitHub项目参考_抖音文案与字幕.md` | 开源项目与 missuo 接口说明 |

---

## 输出目录

- **视频文件**：`/Users/karuo/Documents/卡若Ai的文件夹/视频/`（或 `-o` 指定）
- **文案 JSON**：同目录下 `{aweme_id}_文案.json`

---

## AI 执行说明（Cursor）

当用户给出抖音链接时：

1. 读本 SKILL.md
2. 执行 `python3 douyin_parse.py "用户提供的链接"`
3. 若 requests 被拦截（403/超时），使用 MCP 浏览器：
   - `browser_navigate` 到链接
   - `browser_snapshot` 获取页面 title（含文案）
   - 从 snapshot 或页面源码提取 `__vid`、`video_id`、`file_id`、`<source src>`
   - 将提取结果传给脚本或手动拼装下载 URL
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
