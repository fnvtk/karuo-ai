---
name: 飞书视频和文字下载
description: 飞书妙记单条/批量下载视频（mp4）与文字（txt），纯 API+Cookie，不打开浏览器。含 Cookie 获取链、默认输出目录、查找最早长视频。
triggers: 飞书视频下载、飞书文字下载、妙记下载视频、妙记导出文字、飞书妙记下载、下载飞书视频、下载飞书文字、飞书视频和文字下载
owner: 水桥
group: 水
version: "1.0"
updated: "2026-03-12"
parent_skill: 智能纪要
---

# 飞书视频和文字下载

> **基因能力**：从飞书妙记链接或 object_token，命令行下载**视频（mp4）**与**文字（txt）**，无需打开浏览器。  
> 归属：水桥 · 智能纪要子能力，可独立打包为基因胶囊复用。

---

## 一、默认输出目录

| 类型 | 默认目录 |
|:---|:---|
| **文字（txt）** | `/Users/karuo/Documents/聊天记录/soul` |
| **视频（mp4）** | `/Users/karuo/Movies/soul视频/原视频` |

脚本未指定 `-o`/`--output` 时使用上表；解包到其他环境时可修改为本地路径。

---

## 二、权限：Cookie 获取链（5 级）

妙记**文字导出**与**视频下载**均依赖 Web Cookie（Open API 的 tenant_token 无法访问妙记正文/视频）。

1. **cookie_minutes.txt** 第一行（脚本同目录或 `智能纪要/脚本/`）
2. **环境变量** `FEISHU_MINUTES_COOKIE`
3. **本机浏览器**（browser_cookie3：Safari/Chrome/Firefox/Edge）
4. **Cursor 内置浏览器**：SQLite 明文  
   `~/Library/Application Support/Cursor/Partitions/cursor-browser/Cookies`  
   查询 `host_key LIKE '%feishu%' OR host_key LIKE '%cunkebao%'`
5. **手动兜底**：浏览器 F12 → 飞书妙记 list 请求 → 复制 Cookie 到 cookie_minutes.txt

---

## 三、命令行用法

### 3.1 脚本根路径（本基因默认）

```text
SCRIPT_DIR="/Users/karuo/Documents/个人/卡若AI/02_卡人（水）/水桥_平台对接/智能纪要/脚本"
```

解包到其他项目时，将上述路径改为本地「智能纪要/脚本」所在路径。

### 3.2 下载视频（单条）

```bash
# 链接或 object_token 均可
python3 "$SCRIPT_DIR/feishu_minutes_download_video.py" "https://cunkebao.feishu.cn/minutes/obcnc53697q9mj6h1go6v25e"
python3 "$SCRIPT_DIR/feishu_minutes_download_video.py" obcnc53697q9mj6h1go6v25e -o ~/Downloads/
```

- 输出：默认 `原视频/` 下，文件名含标题与日期。
- 依赖：`requests`；Cookie 见第二节。

### 3.3 导出文字（单条）

```bash
# 导出为 txt（同上，需 Cookie）
python3 "$SCRIPT_DIR/feishu_minutes_export_github.py" "https://cunkebao.feishu.cn/minutes/obcnc53697q9mj6h1go6v25e" -o "/Users/karuo/Documents/聊天记录/soul"
```

- 输出：默认 `聊天记录/soul` 下 txt 文件。

### 3.4 批量文字（按场次范围）

```bash
python3 "$SCRIPT_DIR/download_soul_minutes_101_to_103.py" --from 90 --to 102
```

### 3.5 查找「最早且时长≥1小时且有画面」的妙记

```bash
python3 "$SCRIPT_DIR/find_oldest_long_video_minute.py"
python3 "$SCRIPT_DIR/find_oldest_long_video_minute.py" --max-status 200
python3 "$SCRIPT_DIR/find_oldest_long_video_minute.py" --list-only
```

- 使用 list API 的 `duration`（毫秒）筛 ≥1 小时，再按 create_time 从早到晚用 status API 筛有 `video_download_url`，输出最早一条的 object_token、标题、日期、时长。

---

## 四、核心 API（供二次开发）

| 能力 | 方法 | 说明 |
|:---|:---|:---|
| **列表** | `GET /minutes/api/space/list?size=50&space_name=1&last_time={ts}` | 分页用 `last_time` 为上一页最后一条的 create_time |
| **文字** | `POST /minutes/api/export` | params: object_token, format=2, add_speaker=true；Header: Cookie + Referer + bv-csrf-token |
| **视频** | `GET /minutes/api/status?object_token=xxx` | 返回 `data.video_info.video_download_url`，再 GET 该 URL 流式下载 |

- 域名：`cunkebao.feishu.cn` 或 `meetings.feishu.cn`（同一套 Cookie）。
- list 条目含 `duration`（毫秒）、`create_time`、`topic`、`object_token`。

---

## 五、脚本清单（依赖父目录 智能纪要/脚本）

| 脚本 | 功能 |
|:---|:---|
| `feishu_minutes_download_video.py` | 单条妙记视频下载（status → mp4） |
| `feishu_minutes_export_github.py` | 单条妙记文字导出（export → txt） |
| `feishu_auth_helper.py` | tenant_token / Cookie 测试、refresh-cookie |
| `cursor_cookie_util.py` | 从 Cursor 浏览器提取 Cookie（feishu/github） |
| `download_soul_minutes_101_to_103.py` | 批量场次文字（--from/--to） |
| `find_oldest_long_video_minute.py` | 查找最早、时长≥1h、有视频的妙记 |

---

## 六、解包后使用（继承本基因）

1. 将本基因 **unpack** 到目标项目的 `智能纪要/飞书视频文字下载/` 或任意目录。
2. 确保目标环境存在「智能纪要/脚本」或等价脚本目录，并安装 `requests`。
3. 把本 SKILL 中 `SCRIPT_DIR` 改为目标环境中的脚本路径。
4. 配置 Cookie：cookie_minutes.txt 或 FEISHU_MINUTES_COOKIE 或 Cursor Cookie 提取。

---

## 七、相关文档

- 父技能：`02_卡人（水）/水桥_平台对接/智能纪要/SKILL.md`
- 权限与排查：`智能纪要/参考资料/飞书妙记下载-权限与排查说明.md`
- 账号与 API 索引：`运营中枢/工作台/00_账号与API索引.md`
