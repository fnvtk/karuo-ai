---
name: 智能纪要
description: 派对/会议录音一键转结构化纪要；飞书妙记文字+视频全命令行下载；飞书 MCP 能力整合；单条/批量妙记导出
triggers: 会议纪要、产研纪要、派对纪要、妙记、飞书妙记、飞书链接、cunkebao.feishu.cn/minutes、meetings.feishu.cn/minutes、妙记下载、第几场、指定场次、批量下载妙记、下载妙记、妙记文字、妙记视频、飞书视频、视频下载
owner: 水桥
group: 水
version: "1.4"
updated: "2026-03-11"
---

# 派对纪要生成器

> 卡人（水）的核心能力 | 一键生成毛玻璃风格派对纪要 → 截图 → **自动发送飞书群**

---

## ⚡ 执行原则（飞书相关必守）

| 原则 | 说明 |
|:---|:---|
| **飞书 APP_ID/APP_SECRET → tenant_access_token 优先** | 所有飞书操作，**第一步**先用 APP_ID + APP_SECRET 获取 tenant_access_token，再用该 token 调用 Open API。凡需权限的接口先走此路径，不可用再降级到 Cookie |
| **命令行 + API + TOKEN 优先** | 有飞书 API、有 TOKEN 的任务，一律先用命令行处理，不额外打开网页操作 |
| **先查已有经验** | 执行前查 `运营中枢/参考资料/飞书任务_命令行与API优先_经验总结.md` 与 `运营中枢/工作台/00_账号与API索引.md`（飞书 Token）；妙记 2091005/404 时查 `智能纪要/参考资料/飞书妙记下载-权限与排查说明.md` |
| **统一用命令行** | 妙记拉取、批量下载、产研日报等均提供一键命令，复用已完成过的 TOKEN/会议流程 |

飞书 TOKEN 与妙记/会议已完成流程见：`运营中枢/参考资料/飞书任务_命令行与API优先_经验总结.md`

---

## 📂 默认输出目录（强制）

| 类型 | 默认目录 | 说明 |
|:---|:---|:---|
| **文字记录（txt）** | `/Users/karuo/Documents/聊天记录/soul` | 飞书妙记导出的文字记录、聊天记录 |
| **视频（mp4）** | `/Users/karuo/Movies/soul视频/原视频` | 飞书妙记下载的原始视频 |
| **派对纪要（HTML/PNG）** | `/Users/karuo/Documents/卡若Ai的文件夹/报告/` | 生成的纪要文件 |

脚本未指定 `-o` 时使用上述默认目录。

---

## 🔑 飞书权限获取策略（统一规则）

所有飞书相关操作遵循以下优先级获取权限：

```
1. APP_ID + APP_SECRET → tenant_access_token（Open API）
   ├── 成功 → 用 Open API 操作（文档/表格/日历/群聊/消息等）
   └── 2091005 权限不足（如妙记转写正文）→ 降级到步骤 2
2. Cookie 自动获取链（Web API）
   ├── cookie_minutes.txt 第一行
   ├── 环境变量 FEISHU_MINUTES_COOKIE
   ├── 本机浏览器（browser_cookie3：Safari/Chrome/Firefox/Edge/Doubao）
   └── Cursor 浏览器 Cookie（SQLite 明文读取，详见下方）
3. user_access_token / refresh_token（Open API 用户身份）
   └── 需定期授权刷新
```

**关键经验**：
- tenant_access_token 可用于大多数 Open API（文档、表格、消息、日历），但**妙记转写正文** `GET/POST /minutes/api/export` 返回 2091005，必须用 Cookie
- 妙记视频下载 `GET /minutes/api/status` 也需要 Cookie
- Cookie 过期时的终极方案：从 **Cursor 内置浏览器** SQLite 数据库提取（明文，无需解密）

### Cursor 浏览器 Cookie 提取（逆向方案）

当所有 Cookie 均过期时，若 Cursor 浏览器曾访问过飞书页面，可从其 SQLite 数据库提取有效 Cookie：

```python
import sqlite3, shutil, tempfile, os
cookie_path = os.path.expanduser("~/Library/Application Support/Cursor/Partitions/cursor-browser/Cookies")
tmp = tempfile.mktemp(suffix=".db")
shutil.copy2(cookie_path, tmp)
conn = sqlite3.connect(tmp)
cur = conn.cursor()
cur.execute("SELECT name, value FROM cookies WHERE (host_key LIKE '%feishu%' OR host_key LIKE '%cunkebao%') AND value != ''")
rows = cur.fetchall()
conn.close()
os.unlink(tmp)
cookie_str = "; ".join([f"{name}={value}" for name, value in rows])
```

此方案已于 2026-03-11 验证成功，Cookie 为**明文存储**，无需 Keychain 解密。

---

## 🎯 核心功能

将派对录音/聊天记录快速转化为精美的毛玻璃风格文档：

- **派对纪要**（分享人、分享项目、重点片段、干货提炼、项目推进）
- **复盘总结**（目标回顾、过程复盘、反思改进、下一步）
- **一键截图** → 输出高清PNG图片
- **自动发送** → 图片+摘要推送飞书群
- **上传运营报表** → 纪要图写入飞书运营报表「今日总结」对应场次列（2 月/3 月表）

---

## 📤 智能纪要图片上传到运营报表（与飞书管理联动）

生成派对智能纪要图后，可**上传到飞书运营报表**「今日总结」行、对应场次列，与 飞书管理 → 运营报表 Skill 联动。

### 流程概览

```
派对 txt → 智能提取 JSON → 生成 HTML（苹果薄玻璃）→ 截图 PNG → 上传到运营报表「今日总结」列
```

### 命令速查（以 115 场为例）

| 步骤 | 命令 | 说明 |
|:---|:---|:---|
| 1 | 从 txt 智能提炼并手写/生成 `output/soul_115场_20260304_meeting.json` | 见本 Skill 内容智能提取规范 |
| 2 | `python3 脚本/generate_meeting.py --input output/soul_115场_20260304_meeting.json --output "/Users/karuo/Documents/卡若Ai的文件夹/报告/soul_115场_智能纪要_20260304.html"` | HTML 导出到报告目录 |
| 3 | `python3 脚本/screenshot.py "<报告目录>/soul_115场_智能纪要_20260304.html" --output "<报告目录>/soul_115场_智能纪要_20260304.png"` | 截图 PNG |
| 4 | 飞书管理脚本：`python3 feishu_write_minutes_to_sheet.py --party-image "<报告目录>/soul_115场_智能纪要_20260304.png" --sheet-id bJR5sA --date-col 4` | 3 月 115 场 → 3 月表第 4 列 |

- **2 月表**：不传 `--sheet-id`/`--date-col` 时，脚本默认写 2 月表 19/20 日列（见飞书管理/运营报表_SKILL）。
- **3 月某场**：`--sheet-id bJR5sA`（3 月），`--date-col` = 当月日期（如 4 日填 `4`）。
- 报表结构、Token、校验等详见：`02_卡人（水）/水桥_平台对接/飞书管理/运营报表_SKILL.md`。

---

## 🔥 最佳操作流程

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  📄 聊天记录.txt                                                │
│        │                                                        │
│        ▼                                                        │
│  ┌──────────────────┐                                          │
│  │ parse_chatlog.py │ ← AI智能解析提取关键信息                   │
│  └────────┬─────────┘                                          │
│           │                                                     │
│           ▼                                                     │
│  📋 meeting.json（结构化数据）                                   │
│           │                                                     │
│           ▼                                                     │
│  ┌───────────────────────┐                                     │
│  │ generate_meeting.py   │ ← 渲染毛玻璃HTML模板                  │
│  └────────┬──────────────┘                                     │
│           │                                                     │
│           ▼                                                     │
│  🎨 meeting.html（精美派对纪要）                                 │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────┐                                           │
│  │ screenshot.py   │ ← Playwright截图生成PNG                    │
│  └────────┬────────┘                                           │
│           │                                                     │
│           ▼                                                     │
│  🖼️ meeting.png（高清长图）                                     │
│           │                                                     │
│           ▼                                                     │
│  ┌────────────────────┐                                        │
│  │ send_to_feishu.py  │ ← 上传图片+发送飞书群                    │
│  └────────┬───────────┘                                        │
│           │                                                     │
│           ▼                                                     │
│  📤 飞书群消息（图片+富文本摘要）                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📌 产研团队会议纪要日报（命令行一步到位）

**流程**：抓取当天产研会议（飞书 API 或本地 txt）→ **仅当时长 ≥5 分钟** → 生成总结 md → 转 HTML → 截图 PNG → **带图**发会议纪要飞书群。全程命令行，无需打开网页。

### 一键命令

```bash
# 从本地已导出的文字记录（推荐：妙记页导出后直接跑）
python3 scripts/daily_chanyan_to_feishu.py --file "产研团队 第20场 20260128 许永平.txt"

# 从飞书妙记链接拉取（需应用有妙记权限）
python3 scripts/daily_chanyan_to_feishu.py "https://cunkebao.feishu.cn/minutes/obcnjnsx2mz7vj5q843172p8"

# 从 config 或环境变量读取最新链接（适合每日 cron）
echo "https://cunkebao.feishu.cn/minutes/xxx" > config/latest_minutes_url.txt
python3 scripts/daily_chanyan_to_feishu.py
# 或：export CHANYAN_MINUTES_URL="https://..."
#     python3 scripts/daily_chanyan_to_feishu.py
```

### 规则

| 条件 | 行为 |
|------|------|
| 时长 **≥ 5 分钟** | 生成总结 + 图片，并发送到飞书会议纪要群（文字 + 图） |
| 时长 **< 5 分钟** | 跳过发飞书，直接退出 |

### 飞书群与参数

- 默认发到会议纪要群 Webhook：`14a7e0d3-864d-4709-ad40-0def6edba566`
- 指定其他群：`--webhook "https://open.feishu.cn/open-apis/bot/v2/hook/xxx"`
- 修改最低时长：`--min-minutes 10`（默认 5）

---

## 🚀 快速使用

### 方法1: 从飞书妙记生成（**推荐**）

```bash
# 步骤1: 在飞书妙记页面导出文字记录
# 点击右上角 "..." → "导出文字记录" → 下载txt文件

# 步骤2: 一键生成会议纪要
python3 scripts/fetch_feishu_minutes.py --file "导出的文字记录.txt" --generate
```

### 方法2: 从聊天记录生成

```bash
# 解析 → HTML → 截图 → 发送飞书（全自动）
python3 scripts/full_pipeline.py "/path/to/聊天记录.txt"

# 完成后自动打开浏览器查看
python3 scripts/full_pipeline.py "/path/to/聊天记录.txt" --open
```

### 可选参数

```bash
# 只生成不发飞书
python3 scripts/full_pipeline.py "聊天记录.txt" --no-feishu

# 只生成HTML不截图
python3 scripts/full_pipeline.py "聊天记录.txt" --no-screenshot

# 指定自定义Webhook
python3 scripts/full_pipeline.py "聊天记录.txt" --webhook "https://..."
```

### 分步执行

```bash
# 步骤1：解析聊天记录 → JSON
python3 scripts/parse_chatlog.py "/path/to/聊天记录.txt"

# 步骤2：JSON → HTML
python3 scripts/generate_meeting.py --input "xxx_meeting.json"

# 步骤3：HTML → PNG截图
python3 scripts/screenshot.py output/xxx.html

# 步骤4：发送飞书群
python3 scripts/send_to_feishu.py --json "xxx_meeting.json"
```

---

## 📥 飞书妙记下载：成功链路与避坑（必读）

> **识别规则**：用户发 **飞书链接、飞书妙记、cunkebao.feishu.cn/minutes、meetings.feishu.cn/minutes、下载第几场、批量下载妙记** 等，一律按本 Skill 处理；**执行完毕后必须用复盘格式回复**（见 `运营中枢/参考资料/卡若复盘格式_固定规则.md`）。

### 强制：全自动、禁止要求用户手动操作

| 规则 | 说明 |
|:---|:---|
| **禁止在流程中要求用户「复制 Cookie」「打开网页」「F12 点选」等** | 执行方（AI/脚本）必须优先用自动方式完成；仅在自动方式均不可用且必须一次性配置时，才可说明「需一次性配置 xxx 后重跑」，且之后同范围再次执行视为全自动。 |
| **Cookie 获取顺序（全自动）** | 1）脚本同目录 **cookie_minutes.txt** 第一行（可为空，由 AI 或用户一次性写入）；2）环境变量 **FEISHU_MINUTES_COOKIE**；3）**本机浏览器自动读取**（browser_cookie3：Safari/Chrome/Firefox/Edge；或 Doubao 浏览器 Cookie 解密）。不得首先提示用户去复制。 |
| **批量场次（如 90～102）** | 脚本先尝试从 **已保存列表缓存**（如 `soul_minutes_90_102_list.txt`）加载，有则只做导出、不拉列表；无则拉列表 → 筛选 → 导出；若导出因 Cookie 不足失败，**自动保存列表到缓存**，下次配置好 Cookie 后重跑即只做导出，无需用户再指定范围或手动整理链接。 |

### 成功下载链路（可实现下载的完整路径）

| 步骤 | 动作 | 说明 |
|:---|:---|:---|
| 1 | 获取 Cookie（全自动优先） | 顺序：cookie_minutes.txt → 环境变量 → **本机浏览器**（Safari/Chrome/Firefox/Edge/Doubao）。仅在以上皆无时方可说明需一次性从 list 请求复制到 cookie_minutes.txt。 |
| 2 | bv_csrf_token | 导出接口 200 通常需 **36 位**；列表接口可无。脚本已支持无 bv 时仍尝试请求（cunkebao/meetings 双域）。 |
| 3 | 列表拉取 | `GET meetings.feishu.cn 或 cunkebao.feishu.cn/minutes/api/space/list?size=50&space_name=1`，分页 timestamp；返回 list 含 object_token、topic、create_time。 |
| 4 | 导出 | `POST meetings.feishu.cn 或 cunkebao.feishu.cn/minutes/api/export`，params：object_token、format=2、add_speaker、add_timestamp；请求头：cookie、referer（同域）。 |
| 5 | 列表缓存 | 若本次拉列表成功但部分/全部导出失败，脚本将匹配到的场次列表写入 `脚本/soul_minutes_{from}_{to}_list.txt`；下次执行同范围时**优先从该文件加载、仅做导出**，无需再拉列表。 |

核心逻辑来源：[GitHub bingsanyu/feishu_minutes](https://github.com/bingsanyu/feishu_minutes)。

### 避坑清单

| 坑 | 原因 | 处理 |
|:---|:---|:---|
| 2091005 permission deny | 应用身份(tenant_access_token)无法访问用户创建的妙记 | 用 **Cookie**（list 请求复制）或用户 token；不依赖应用单点打通 |
| 401 / Something went wrong | Cookie 缺 bv_csrf_token 或过期 | 从 **list?size=20&space_name=** 请求重拷完整 Cookie，保证 36 位 bv_csrf_token |
| 404 page not found | 开放平台 transcript 接口路径/权限 | 改用 Cookie + meetings.feishu.cn 导出接口（见上表） |
| 已存在仍重复下 | 未做本地「已有完整 txt 则跳过」 | 脚本已对 soul 目录 ≥500 行且含「说话人」的 txt 跳过 |

详细权限与排查：`智能纪要/参考资料/飞书妙记下载-权限与排查说明.md`。

### 指定第几节下载（单条）

- **指定妙记链接或 object_token**，下载**单场**文字记录到指定目录。

```bash
SCRIPT_DIR="/Users/karuo/Documents/个人/卡若AI/02_卡人（水）/水桥_平台对接/智能纪要/脚本"
OUT="/Users/karuo/Documents/聊天记录/soul"

# 方式一：GitHub 同款（推荐，需 cookie_minutes.txt 含 bv_csrf_token）
python3 "$SCRIPT_DIR/feishu_minutes_export_github.py" "https://cunkebao.feishu.cn/minutes/obcnxrkz6k459k669544228c" -o "$OUT"

# 方式二：指定 object_token
python3 "$SCRIPT_DIR/feishu_minutes_export_github.py" -t obcnxrkz6k459k669544228c -o "$OUT"

# 方式三：通用 Cookie（含自动读浏览器）
python3 "$SCRIPT_DIR/fetch_single_minute_by_cookie.py" "https://cunkebao.feishu.cn/minutes/obcnxrkz6k459k669544228c" -o "$OUT"
```

### 下载指定妙记空间内「全部」或指定场次（批量）

- **按场次筛选**：如 90～102 场，脚本拉列表后筛「第N场」再逐条导出；**Cookie 全自动**（文件 → 环境变量 → 本机浏览器）；已有列表缓存则**只做导出**，不要求用户任何手动操作。
- **输出目录**：默认 `/Users/karuo/Documents/聊天记录/soul`；已存在且为完整文字记录（含说话人、足够长）则跳过。
- **场次范围参数**：`--from 90 --to 102`（含首含尾）。

```bash
SCRIPT_DIR="/Users/karuo/Documents/个人/卡若AI/02_卡人（水）/水桥_平台对接/智能纪要/脚本"

# 90～102 场（全自动：Cookie 优先浏览器/文件，有缓存则只导出）
python3 "$SCRIPT_DIR/download_soul_minutes_101_to_103.py" --from 90 --to 102

# 101～103 场（默认）
bash "$SCRIPT_DIR/download_101_to_103.sh"
# 或
python3 "$SCRIPT_DIR/download_soul_minutes_101_to_103.py"
```

- **按 URL 列表批量**：先得到 `urls_soul_party.txt`（每行一条妙记链接），再：

```bash
cd "$SCRIPT_DIR"
python3 batch_download_minutes_txt.py --list urls_soul_party.txt --output "/Users/karuo/Documents/聊天记录/soul"
```

- **一键 104 场**（单 token 优先，已有完整 txt 则直接成功）：

```bash
bash "$SCRIPT_DIR/download_104_to_soul.sh"
```

### 手动导出（无 Cookie 时兜底）

1. 打开妙记页（如 `cunkebao.feishu.cn/minutes/xxx`）
2. 右上角「…」→「导出文字记录」
3. 将下载的 txt 放到目标目录（如 soul）

---

## 📹 妙记视频下载（全命令行）

与文字导出共用 Cookie（cookie_minutes.txt）。通过 status API 获取视频下载链接，流式下载为 mp4。

**默认输出目录**：`/Users/karuo/Movies/soul视频/原视频`

```bash
SCRIPT_DIR="/Users/karuo/Documents/个人/卡若AI/02_卡人（水）/水桥_平台对接/智能纪要/脚本"

# 下载指定妙记的视频（默认输出到 /Users/karuo/Movies/soul视频/原视频）
python3 "$SCRIPT_DIR/feishu_minutes_download_video.py" "https://cunkebao.feishu.cn/minutes/obcnc53697q9mj6h1go6v25e"

# 指定输出目录
python3 "$SCRIPT_DIR/feishu_minutes_download_video.py" obcnc53697q9mj6h1go6v25e -o ~/Downloads/
```

**核心 API**：`GET meetings.feishu.cn/minutes/api/status?object_token=xxx` 或 `cunkebao.feishu.cn/minutes/api/status`，返回 `data.video_info.video_download_url`。

---

## 🔗 飞书 MCP 能力整合

| 方案 | 来源 | 功能 | 妙记文字/视频 |
|:---|:---|:---|:---|
| **@larksuiteoapi/lark-mcp** | 飞书官方 | 文档、多维表格、日历、群聊、消息等 OpenAPI | ❌ 无妙记专用 |
| **DarkNoah/feishu-mcp** | GitHub | 多维表格 CRUD | ❌ 无妙记 |
| **本 Skill** | 智能纪要脚本 | Cookie + 导出/status API | ✅ 文字+视频 |

**Cursor 配置飞书官方 MCP**（文档/表格等）：

```json
{
  "mcpServers": {
    "lark-mcp": {
      "command": "npx",
      "args": ["-y", "@larksuiteoapi/lark-mcp", "mcp", "-a", "<app_id>", "-s", "<app_secret>"]
    }
  }
}
```

妙记文字/视频下载：MCP 暂无专用能力，**必须用本 Skill 的 Cookie + 脚本方案**。

---

## 🔧 飞书统一认证工具（feishu_auth_helper.py）

一个脚本统管所有飞书 Token / Cookie，替代手动操作：

```bash
SCRIPT_DIR="/Users/karuo/Documents/个人/卡若AI/02_卡人（水）/水桥_平台对接/智能纪要/脚本"

# 获取 tenant_access_token（Open API 用）
python3 "$SCRIPT_DIR/feishu_auth_helper.py" tenant

# 自动获取最佳 Cookie（5 级 fallback，自动选最佳来源）
python3 "$SCRIPT_DIR/feishu_auth_helper.py" cookie

# 从 Cursor 浏览器刷新 cookie_minutes.txt
python3 "$SCRIPT_DIR/feishu_auth_helper.py" refresh-cookie

# 综合测试（tenant + Cookie 对指定妙记）
python3 "$SCRIPT_DIR/feishu_auth_helper.py" test --token obcnc53697q9mj6h1go6v25e

# 生成用户授权链接（重新授权 user_access_token）
python3 "$SCRIPT_DIR/feishu_auth_helper.py" auth-url

# 授权码换 token
python3 "$SCRIPT_DIR/feishu_auth_helper.py" exchange --code AUTH_CODE
```

### 通用 Cookie 提取工具（cursor_cookie_util.py）

可复用于任何需要从 Cursor 浏览器提取 Cookie 的场景：

```bash
python3 "$SCRIPT_DIR/cursor_cookie_util.py" feishu    # 飞书
python3 "$SCRIPT_DIR/cursor_cookie_util.py" github    # GitHub
python3 "$SCRIPT_DIR/cursor_cookie_util.py" --domain .example.com  # 自定义
```

```python
from cursor_cookie_util import get_cursor_cookies
cookie = get_cursor_cookies(domains=[".feishu.cn"])
```

---

## 📋 妙记文字 + 视频完整解决方案（一键表）

| 需求 | 脚本 | 一键命令 |
|:---|:---|:---|
| **104 场文字** | 导出104到soul.sh | `bash "$SCRIPT_DIR/导出104到soul.sh"` |
| **104 场视频** | feishu_minutes_download_video.py | `python3 "$SCRIPT_DIR/feishu_minutes_download_video.py" obcnyg5nj2l8q281v32de6qz -o "$OUT"` |
| **90～102 场文字** | download_soul_minutes_101_to_103.py | `python3 "$SCRIPT_DIR/download_soul_minutes_101_to_103.py" --from 90 --to 102` |
| **企业 TOKEN 文字** | fetch_feishu_minutes.py --tenant-only | `python3 "$SCRIPT_DIR/fetch_feishu_minutes.py" -t obcnyg5nj2l8q281v32de6qz --tenant-only -o "$OUT"` |
| **视频 + AI 切片发群** | 飞书管理/feishu_video_clip.py | 见 `02_卡人（水）/水桥_平台对接/飞书管理/SKILL.md` |

**前置**：`cookie_minutes.txt` 第一行粘贴 list 请求的 Cookie（含 bv_csrf_token），或配置 FEISHU_MINUTES_COOKIE 环境变量。

---

## 🛠️ 核心代码与 API（供迭代复用）

### 文字导出接口

```python
# POST meetings.feishu.cn/minutes/api/export 或 cunkebao.feishu.cn/minutes/api/export
params = {"object_token": "obcnyg5nj2l8q281v32de6qz", "format": 2, "add_speaker": "true", "add_timestamp": "false"}
headers = {"Cookie": cookie, "Referer": "https://cunkebao.feishu.cn/minutes/", "bv-csrf-token": bv_csrf_token}
r = requests.post(url, params=params, headers=headers)
# 200 时 r.text 即为文字记录正文
```

### 视频下载接口

```python
# GET .../minutes/api/status?object_token=xxx&language=zh_cn
r = requests.get(status_url, headers=headers)
data = r.json()
video_url = data["data"]["video_info"]["video_download_url"]
# 再 requests.get(video_url, stream=True) 流式下载
```

### Cookie 获取顺序（5 级自动 fallback）

1. cookie_minutes.txt 第一行  
2. 环境变量 FEISHU_MINUTES_COOKIE  
3. 本机浏览器（browser_cookie3：Safari/Chrome/Firefox/Edge；或 Doubao Cookie 解密）
4. **Cursor 内置浏览器 Cookie**（SQLite 明文，路径 `~/Library/Application Support/Cursor/Partitions/cursor-browser/Cookies`，查询 `host_key LIKE '%feishu%'`，无需解密 · 2026-03-11 验证成功）
5. 手动兜底：从 list 请求复制到 cookie_minutes.txt（仅当 1～4 均失效时）

---

### 执行完毕回复规范

每次完成**飞书妙记相关**的下载/导出/批量任务后，**必须用「卡若复盘」格式**收尾：  
目标·结果·达成率 → 过程 → 反思 → 总结 → 下一步；见 `运营中枢/参考资料/卡若复盘格式_固定规则.md`。

---

## 📥 飞书妙记导出（与纪要生成联动）

### 从已导出 txt 生成会议纪要

```bash
# 从导出文件生成（自动发送飞书群）
python3 scripts/fetch_feishu_minutes.py --file "产研团队_20260128.txt" --generate

# 指定标题
python3 scripts/fetch_feishu_minutes.py --file "导出.txt" --title "产研团队第20场" --generate
```

### 支持的文件格式

- **飞书妙记导出的txt文件**（推荐）
- **Soul派对聊天记录**
- **其他会议文字记录**

---

## 📤 飞书集成配置

### 已配置凭证（**无需额外设置**）

| 配置项 | 值 |
|:---|:---|
| **APP_ID** | `cli_a48818290ef8100d` |
| **APP_SECRET** | `dhjU0qWd5AzicGWTf4cTqhCWJOrnuCk4` |
| **默认Webhook** | `34b762fc-5b9b-4abb-a05a-96c8fb9599f1` |

### 发送能力

| 消息类型 | 状态 | 说明 |
|:---|:---|:---|
| **图片消息** | ✅ 已支持 | 自动上传+发送PNG |
| **富文本摘要** | ✅ 已支持 | 分享人+干货提炼 |
| **文本通知** | ✅ 已支持 | 简单文本 |

### 单独发送命令

```bash
# 发送图片
python3 scripts/send_to_feishu.py --image output/meeting.png

# 发送文本
python3 scripts/send_to_feishu.py --text "派对纪要已生成"

# 从JSON发送完整摘要
python3 scripts/send_to_feishu.py --json "meeting.json"
```

---

## 📋 纪要结构

| 序号 | 模块 | 内容 | 图标 |
|:---|:---|:---|:---|
| **1** | 派对分享人 | 嘉宾姓名、角色、分享话题 | 🎤 |
| **2** | 分享项目 | 核心项目/模式拆解 | 📌 |
| **3** | 重点片段 | 时间戳+核心观点+**洞察** | 🔥 |
| **4** | 干货提炼 | 单行对齐的**要点总结** | ⚡ |
| **5** | 项目推进 | **下一步行动项** | 🚀 |

---

## 📊 数据格式

### 派对纪要 JSON 示例

```json
{
  "title": "1月28日｜猎头行业×电动车民宿×金融视角",
  "subtitle": "Soul派对第85场",
  "date": "2026-01-28",
  "time": "06:55",
  "duration": "2小时47分钟52秒",
  "participants_count": "600+",
  "location": "Soul派对早场",
  
  "speakers": [
    {
      "name": "卡若",
      "role": "派对主持人·融资运营",
      "topics": "电动车×民宿撮合·不良资产收购"
    }
  ],
  
  "modules": [...],
  "highlights": [...],
  "takeaways": [...],
  "actions": [...]
}
```

---

## 🛠️ 脚本说明

| 脚本 | 功能 | 依赖 |
|:---|:---|:---|
| **`feishu_minutes_export_github.py`** | ⭐ 妙记文字导出（GitHub 同款，Cookie/浏览器） | requests |
| **`feishu_minutes_download_video.py`** | ⭐ 妙记视频下载（status API → mp4） | requests |
| **`导出104到soul.sh`** | ⭐ 104 场文字一键导出到 soul | feishu_minutes_export_github |
| **`download_soul_minutes_101_to_103.py`** | 批量场次文字（--from/--to） | requests |
| **`fetch_feishu_minutes.py`** | 应用/用户 token 拉取 + 纪要生成 | requests |
| **`daily_chanyan_to_feishu.py`** | 产研会议日报：≥5分钟则总结+图发飞书 | requests, playwright |
| **`full_pipeline.py`** | 完整流程（聊天记录→纪要→截图→发飞书） | requests, playwright |
| `fetch_single_minute_by_cookie.py` | 单条妙记（Cookie/浏览器） | requests |
| `parse_chatlog.py` | 解析聊天记录 → JSON | 无 |
| `generate_meeting.py` | JSON → HTML | 无 |
| `md_to_summary_html.py` | 总结 md → HTML（产研纪要截图用） | 无 |
| `screenshot.py` | HTML → PNG截图 | playwright |
| `send_to_feishu.py` | 发送到飞书群 | requests |

### 安装依赖

```bash
# 基础依赖
pip3 install requests

# 截图功能
pip3 install playwright
playwright install chromium
```

---

## 🎨 样式特点（强制）— 苹果薄玻璃

- **一律使用「苹果薄玻璃」风格**：浅底 `#f5f5f7`，玻璃层高透（`rgba(255,255,255,0.5~0.6)`）、轻 blur（`blur(16~20px) saturate(1.1)`）、**多层柔和阴影**（如 0 1px 2px、0 4px 12px、0 8px 24px + `inset 0 1px 0` 顶缘高光）、细边框 `rgba(0,0,0,0.04)`。不用渐变彩底或固定模板。
- **内容智能提取**：从派对 txt 智能提炼分享人、项目、重点片段、干货、行动项，**不使用固定关键词模板**。
- **薄玻璃色块**：颜色变体（glass-blue 等）为淡色叠层（opacity 0.08/0.03），边框淡（0.14），不抢戏。
- **流程与结构**：顶部流程图（开场→分享→干货→对接→总结）、五块（分享人、分享项目、重点片段、干货提炼、项目推进）与步骤保持一致；数字徽章、字体层级、响应式布局统一。

---

## 📁 导出位置（强制）

**派对纪要 HTML 导出到外部，不落在 Skill 内：**

- **路径**：`/Users/karuo/Documents/卡若Ai的文件夹/报告/`
- 运行 `generate_meeting.py --input xxx.json` 时，未指定 `--output` 则写入上述目录；指定 `--output` 可写任意路径。

---

## 📁 目录结构

```
智能纪要/
├── 脚本/                           # 飞书妙记下载与产研日报（本 Skill 主用）
│   ├── feishu_minutes_export_github.py   # ⭐ 妙记文字单条导出（GitHub 同款）
│   ├── feishu_minutes_download_video.py  # ⭐ 妙记视频下载（status API）
│   ├── 导出104到soul.sh            # ⭐ 104 场文字一键导出
│   ├── 妙记104_企业TOKEN命令行.sh   # 企业 token 导出 104（数据范围需全部）
│   ├── fetch_single_minute_by_cookie.py  # 单条导出（Cookie/浏览器）
│   ├── download_soul_minutes_101_to_103.py # 批量场次文字（--from/--to）
│   ├── download_101_to_103.sh      # 一键 101～103
│   ├── download_104_to_soul.sh     # 一键 104 场
│   ├── cookie_minutes.txt          # Cookie 配置（可选；无则自动读浏览器）
│   ├── soul_minutes_90_102_list.txt  # 场次列表缓存
│   ├── fetch_feishu_minutes.py     # 应用/用户 token 拉取
│   ├── fetch_minutes_list_by_cookie.py   # 列表拉取 → urls_soul_party.txt
│   └── batch_download_minutes_txt.py      # 按 URL 列表批量下载
├── scripts/                        # 纪要生成与飞书发送
│   ├── daily_chanyan_to_feishu.py  # ⭐ 产研会议日报（≥5分钟→总结+图发飞书）
│   ├── full_pipeline.py            # 完整流程（推荐）
│   ├── fetch_feishu_minutes.py     # 飞书妙记导出/发飞书
│   ├── parse_chatlog.py            # 解析聊天记录
│   ├── generate_meeting.py         # 生成HTML
│   ├── md_to_summary_html.py       # 总结md→HTML（产研截图）
│   ├── screenshot.py               # 截图工具
│   └── send_to_feishu.py           # 飞书发送（含凭证）
├── config/
│   └── latest_minutes_url.txt     # 可选：最新妙记链接（日报用）
├── templates/
│   ├── meeting.html                # 派对纪要模板
│   └── review.html                 # 复盘总结模板
├── 参考资料/
│   └── 飞书妙记下载-权限与排查说明.md
│   # 用户侧方案说明：聊天记录/soul/飞书妙记104场_全命令行下载方案.md
├── output/                         # 输出目录
└── SKILL.md                        # 本文档
```

---

## 🔗 与其他技能协作

| 场景 | 协作流程 |
|:---|:---|
| 派对录音转纪要 | 飞书妙记 → JSON提取 → **派对纪要生成** → **飞书群** |
| 项目复盘 | 需求拆解 → 执行跟踪 → **复盘总结生成** → **飞书群** |
| 商业计划 | 卡土算账 → 数据整理 → **商业计划书生成** |

---

## 📝 更新日志

| 日期 | 更新 |
|:---|:---|
| **2026-03-11** | 📌 **默认目录+飞书权限策略大更新**：文字记录默认 `聊天记录/soul`、视频默认 `Movies/soul视频/原视频`；飞书操作统一先走 APP\_ID/APP\_SECRET → tenant\_access\_token，妙记不可用再降级 Cookie；Cookie 获取链新增第 4 级：Cursor 浏览器 SQLite 明文提取（已验证）；脚本默认路径同步更新 |
| **2026-03-04** | 📌 **上传运营报表**：新增「智能纪要图片上传到运营报表」流程；与飞书管理/运营报表 Skill 联动；命令速查（JSON→HTML→截图→feishu_write_minutes_to_sheet --party-image --sheet-id --date-col）；导出目录为卡若Ai的文件夹/报告 |
| **2026-02-20** | 📌 **全能力整合**：Feishu MCP（官方 @larksuiteoapi/lark-mcp、DarkNoah/feishu-mcp）；妙记**视频下载**（feishu_minutes_download_video.py）；妙记**文字+视频**完整解决方案表；核心 API 与代码片段；导出104到soul.sh、妙记104_企业TOKEN命令行.sh；触发词增补：妙记文字、妙记视频、飞书视频、视频下载 |
| **2026-02-19** | 📌 飞书妙记下载：**强制全自动、禁止要求用户手动操作**；Cookie 优先 cookie_minutes.txt → 环境变量 → 本机浏览器（Safari/Chrome/Firefox/Edge/Doubao）；批量支持 --from/--to（如 90～102）；列表缓存 soul_minutes_{from}_{to}_list.txt，重跑只做导出；双域导出（meetings + cunkebao）；执行完毕用复盘格式回复 |
| **2026-01-29** | 📌 产研会议日报：daily_chanyan_to_feishu.py，飞书 API/本地 txt → 仅≥5分钟 → 总结+图发飞书，全命令行 |
| **2026-01-28** | 🤖 融合本地模型：支持离线智能摘要、信息提取 |
| **2026-01-28** | ✅ 配置飞书凭证，支持自动发送图片 |
| 2026-01-28 | 新增飞书群集成：send_to_feishu.py + full_pipeline.py |
| 2026-01-28 | 优化模板：增加流程图、调整模块名称、统一单行对齐 |
| 2026-01-28 | 创建技能，支持派对纪要和复盘总结 |

---

## 🤖 本地模型融合

### 功能增强

智能纪要现支持使用本地模型（Ollama）进行智能摘要和信息提取：

```python
# 导入本地模型SDK
import sys
sys.path.append("/Users/karuo/Documents/个人/卡若AI")
from 运营中枢.local_llm import summarize, extract_info, check_service

# 检查本地模型服务
status = check_service()
if not status["running"]:
    print("本地模型不可用，将使用云端API")

# 生成会议摘要（200字以内）
meeting_text = "很长的会议记录文本..."
summary = summarize(meeting_text, max_words=200)

# 提取关键信息
speakers = extract_info(meeting_text, "发言人姓名和角色")
actions = extract_info(meeting_text, "待办事项和负责人")
highlights = extract_info(meeting_text, "核心观点和金句")
```

### 使用场景

| 场景 | 本地模型 | 云端API |
|:---|:---|:---|
| 快速生成摘要 | ✅ 推荐（1-2秒） | 可选 |
| 提取发言人信息 | ✅ 推荐 | 可选 |
| 提取待办事项 | ✅ 推荐 | 可选 |
| 批量处理多场派对 | ✅ 强烈推荐（免费） | 成本累积 |
| 生成完整TDD文档 | 不推荐 | ✅ 推荐 |

### 集成到流程

可以在 `parse_chatlog.py` 中调用本地模型辅助提取：

```python
# parse_chatlog.py 中添加
from 运营中枢.local_llm import summarize, extract_info, check_service

def smart_extract(text):
    """智能提取：本地优先"""
    if check_service()["running"]:
        return {
            "summary": summarize(text, 150),
            "speakers": extract_info(text, "发言人"),
            "actions": extract_info(text, "行动项")
        }
    else:
        # 降级到原有逻辑或云端API
        return fallback_extract(text)
```

### 资源控制

- **并发限制**：最多2个并发请求
- **请求间隔**：0.5秒
- **CPU使用**：控制在30%以内
- **自动限流**：SDK已内置，无需手动处理
