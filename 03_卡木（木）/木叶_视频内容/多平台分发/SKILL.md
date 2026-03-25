---
name: 多平台分发
description: >
  一键将视频分发到 5 个平台（抖音、B站、视频号、小红书、快手）。
  API 优先策略：视频号纯 API、B站 bilibili-api-python、抖音纯 API。
  支持定时排期（默认智能错峰；可选 legacy）、默认静默不自动弹窗登录视频号、并行分发、去重、失败自动重试。
triggers: 多平台分发、一键分发、全平台发布、批量分发、视频分发
owner: 木叶
group: 木
version: "4.6"
updated: "2026-03-25"
---

# 多平台分发 Skill（v4.6）

> **核心原则**：**统一元数据 + 稳定结果输出 + 可无人值守**。能用 API 就用 API；但**视频号优先用网页态自动化（Playwright）且默认无窗口**，避免“API 口子变/参数边界不一致”导致的不可控。
> **v4.6 视频号默认策略（本轮验证）**：**发布统一走 `视频号发布/脚本/channels_web_cli.py`，默认 headless。**需要调试才用 `--show` / `CHANNELS_HEADED=1`。终端会输出 **`=== 单条发布结果 ===`** 与 **`[批次发布结果]`**，便于复制复盘。  
> **v4.4**：默认无窗口、B 站 headless、定时 ≥5min、`--until-success`、二维码路径标记。  
> **v4.3**：默认不自动弹视频号登录。**v4.2**：智能排期与去重下标对齐。

## 〇、执行原则（第一性原理）

- **视频号两步（强制）**：① 先扫码登录并落盘 Cookie；② 再发布。**禁止**在 Cookie 未确认有效时发布。
- **视频号默认无窗口（强制偏好）**：发布用 `视频号发布/脚本/channels_web_cli.py`（默认 headless）；只在排障时用 `--show`。
- **Cookie 优先（强制）**：任何登录成功 → **必须落盘**；视频号会写入 `视频号发布/脚本/channels_storage_state.json`，并同步到 `多平台分发/cookies/视频号_cookies.json`（脚本已自动同步）。
- **默认静默（无人值守）**：批量分发默认不弹窗、不自动拉起登录，适合 Cursor 内后台跑。
- **需要扫码时**：显式跑 `python3 channels_login.py`（推荐，可配 `CHANNELS_SILENT_QR=1` 打印二维码路径）；或在分发器里用 `--auto-channels-login`（仅当你允许脚本拉起登录流程时才用）。
- **结果必须可读**：视频号发布后终端必须出现“成功/失败/原因/日志行”，用于你快速判断要不要重试/换头/重新扫码。

---

## 一、平台与实现方式

| 平台 | 实现方式 | 定时发布 | Cookie 有效期 | 120 场实测 |
|------|----------|----------|---------------|------------|
| **视频号** | **网页态自动化（Playwright，默认 headless）**：`视频号发布/脚本/channels_web_cli.py` | 平台定时（脚本注入） | ~24-48h | 12/12 成功 |
| **B站** | **bilibili-api-python** API 优先 → Playwright 兜底 | API `dtime` | ~6 个月 | 12/12 成功 |
| **小红书** | Playwright headless 自动化 | UI 定时（降级立即） | ~1-3 天 | 12/12 成功 |
| **快手** | Playwright headless 自动化 | UI 定时 | ~7-30 天 | Cookie 过期 |
| **抖音** | 纯 API（VOD + bd-ticket-guard） | API `timing_ts` | ~2-4h | 账号封禁中 |

> **关于视频号官方 API 边界**：  
> 按《视频号与腾讯相关 API 整理》结论，微信官方目前**没有开放「短视频上传/发布」接口**；本 Skill 中的视频号发布能力，属于对 `https://channels.weixin.qq.com` 视频号助手网页协议的逆向封装（DFS 上传 + `post_create`），仅在你本机使用，需自行承担协议变更与合规风险。  
> 官方可控能力（直播记录、橱窗、留资、罗盘数据、本地生活等）的服务端 API 入口为：`https://developers.weixin.qq.com/doc/channels/api/`。**整合脑图与接口速查**见同木叶的 `视频号发布/REFERENCE_开放能力_数据与集成.md`；开放平台凭证约定见 `视频号发布/credentials/README.md`（`.env.open_platform`）。

> **「视频号 API token」与成片上传**：微信公众号 **`access_token`**（`cgi-bin/token`）用于开放平台文档中的各类接口，**不能**替代本链路里的 **视频号助手网页态**。`distribute_all` → `channels_api_publish.py` 发表短视频，依赖的是 **`channels_storage_state.json`**（Cookie + `localStorage`，如 `__ml::aid`、`_finger_print_device_id`），经 `auth/auth_data` 校验通过后方可 DFS 上传与 `post_create`。`channels_token.json` 只是登录脚本写出的摘要字段，**不能单独当「发视频 token」用**。若要用 **appid+secret** 拉直播/罗盘等数据，走 `视频号发布/脚本/channels_open_fetch.py`，**与上传 127 场成片无关**。  
> **127 场全平台（静默）**（助手态与各平台 Cookie 已就绪）：`python3 distribute_all.py --video-dir "/Users/karuo/Movies/soul视频/第127场_20260318_output/成片"`

---

## 二、一键命令

```bash
cd /Users/karuo/Documents/个人/卡若AI/03_卡木（木）/木叶_视频内容/多平台分发/脚本

# 定时排期：默认智能错峰（条数自适应 + 尽量避开本地 0–7 点）
python3 distribute_all.py

# 旧版：固定 30–120min 随机间隔
python3 distribute_all.py --legacy-schedule

# 立即全部发布（不排期）
python3 distribute_all.py --now

# 只发指定平台
python3 distribute_all.py --platforms 视频号 B站

# 自定义视频目录
python3 distribute_all.py --video-dir "/path/to/videos/"

# 检查 Cookie / 重试失败
python3 distribute_all.py --check
python3 distribute_all.py --retry

# 视频号 Cookie 失效且希望脚本自动弹窗扫码（默认不弹窗）
python3 distribute_all.py --platforms 视频号 --auto-channels-login --video-dir "/path/to/成片"

# 强制静默（即使写了 --auto-channels-login 也不弹窗）：NO_AUTO_CHANNELS_LOGIN=1
# 独立跑视频号脚本且允许自动登录：CHANNELS_AUTO_LOGIN=1 python3 ../视频号发布/脚本/channels_api_publish.py

# 视频号仅要二维码到对话：无窗口，终端会打印 SOUL_QR_IMAGE_FOR_CHAT 路径
cd ../视频号发布/脚本 && CHANNELS_SILENT_QR=1 python3 channels_login.py

# 全平台直到全部成功（间隔 90s，无限轮；加 --until-success-max-rounds 20 可封顶）
python3 distribute_all.py --video-dir "/path/to/成片" --until-success

# 仅查看断点：各平台已成功/待传（不执行上传）；加 --resume-report-detail 列出文件名
python3 distribute_all.py --resume-report --resume-report-detail --video-dir "/path/to/成片"

# -----------------------------
# 视频号（推荐：统一走网页 CLI，默认无窗口）
cd ../视频号发布/脚本

# 1) 先确认登录态（Cookie + API 预检）
python3 channels_web_cli.py check

# 2) Cookie 过期就扫码（默认会打印指引；无窗口二维码模式）
CHANNELS_SILENT_QR=1 python3 channels_login.py

# 3) 单条发布：会输出「=== 单条发布结果 ===」
python3 channels_web_cli.py publish-one --video "/path/to/成片/xxx.mp4" --immediate

# 4) 目录批量发布：会输出汇总表 +「[批次发布结果]」
python3 channels_web_cli.py publish-dir --video-dir "/path/to/成片" --min-gap 10 --max-gap 25

# 仅排障时开窗口（有头）
python3 channels_web_cli.py publish-one --video "/path/to/成片/xxx.mp4" --immediate --show
```

---

## 三、定时排期（v4.2 默认智能错峰）

### 3.1 默认规则（`schedule_generator.generate_smart_schedule`）
- **第 1 条**：立即（`first_delay=0`）；视频号侧 2 分钟内仍视为立即（`_scheduled_ts_for_channels`）
- **间隔与总跨度**：随条数 `n` 自适应（`suggest_stagger_params`）：条数越多略缩短单条间隔、允许更长总跨度（如 8 条约 28–48h 量级，具体随机）
- **凌晨规避**：本地时间 0–7 点附近的点会挪到当日/次日 12:xx（`refine_avoid_late_night`）；关闭：`SCHEDULE_NO_NIGHT_REFINE=1`
- **回退旧逻辑**：`python3 distribute_all.py --legacy-schedule`（仍可用 `--min-gap` / `--max-gap` / `--max-hours`）
- **去重对齐**：排期与 `videos` 列表下标一致；中间已发布的文件跳过，其余仍按原文件名顺序对应原定时间

### 3.2 独立跑 `channels_api_publish.py` 时
- 与上相同的 `generate_smart_schedule` → Unix 定时，与分发器一致

### 3.3 各平台定时实现

| 平台 | 定时方式 | 参数 |
|------|----------|------|
| B站 | API `meta.dtime` | Unix 时间戳（秒） |
| 视频号 | API `postTimingInfo.postTime`（秒级 Unix）；首条若时间过近则立即发 | `channels_api_publish._scheduled_ts_for_channels` |
| 抖音 | API `timing_ts` | Unix 时间戳 |
| 快手 | Playwright UI | `schedule_helper.py` |
| 小红书 | Playwright UI | `schedule_helper.py` |

---

## 四、元数据自动生成（v4.0 新增）

`video_metadata.py` 根据文件名自动生成各平台差异化内容：

```python
from video_metadata import VideoMeta
meta = VideoMeta.from_filename("AI最大的缺点是上下文太短.mp4")

meta.title("B站")          # 优化后的标题
meta.description("B站")    # 标题 + 标签 + 品牌标记
meta.tags_str("B站")       # AI工具,效率提升,Soul派对,...
meta.bilibili_meta()       # B站投稿完整 meta（含 tid/tag/desc）
meta.title_short()         # 小红书短标题（≤20字）
meta.hashtags("视频号")    # … + #小程序卡若创业派对 #公众号卡若-4点起床的男人
```

### 4.1 内容结构
- **标题**：手工优化标题库优先，否则从文件名智能提取
- **简介**：标题 + 换行 + 话题标签；**视频号**固定追加 `#小程序卡若创业派对` `#公众号卡若-4点起床的男人`
- **标签**：基于关键词匹配（AI/创业/副业/Soul 等 12 类）+ 通用标签
- **分区**：B站 tid=160（生活>日常）
- **风控过滤**：`content_filter.py` 自动替换敏感词（70+ 映射，严格/宽松分级）

---

## 五、商品链接/小黄车（调研结果）

| 平台 | 功能 | 实现方式 | 状态 |
|------|------|----------|------|
| B站 | 花火计划商品链接 | 需企业认证 + 品牌合作授权 | 需手动配置 |
| 视频号 | 挂小程序 | 视频号主页 > 设置 > 服务菜单 > 小程序 | 需手动配置 |
| 抖音 | 小黄车 | 需开通橱窗（粉丝 ≥1000） | 账号封禁 |
| 快手 | 商品卡片 | 需开通快手小店 | 需手动配置 |
| 小红书 | 商品笔记 | 需开通小红书店铺 | 需手动配置 |

**当前做法**：在描述中统一添加 `#小程序 卡若创业派对` 引导用户搜索。

---

## 六、Cookie 管理

`cookie_manager.py` 统一管理：
- 中央存储：`多平台分发/cookies/{平台}_cookies.json`
- **视频号双路径**：`sync_channels_cookie_files()`；登录脚本写 legacy 后 **copy** 到 `cookies/视频号_cookies.json`
- **登录页只在 Cursor 内打开**：`channels_login.py` v7 用 `cursor://vscode.simple-browser/show?url=…` 唤起 **Simple Browser**，**不**用系统默认浏览器。
- **不落盘会话**：在 Cursor 已开 `--remote-debugging-port`（默认脚本连 `CHANNELS_CDP_URL=http://127.0.0.1:9223`）时，Playwright **CDP 附着** Cursor，从 Simple Browser 上下文导出 `storage_state`；**无 CDP** 时回退 Chromium；默认 **持久化用户目录** `~/.soul-channels-playwright-profile`（`CHANNELS_PERSISTENT_LOGIN=0` / `--no-persistent` 可关），减少重复扫码。
- **无 Cookie 发片**：微信助手 API **无**官方「access_token 上传短视频」接口，见 `视频号发布/脚本/channels_open_platform_publish.py` 与 `REFERENCE_开放能力_数据与集成.md`。
- **`distribute_all.py`**：默认**不**自动跑 `channels_login.py`；仅 `--auto-channels-login` 且 Cookie 无效时才调起。历史参数 `--no-auto-channels-login` 仍接受（无效果，与默认一致）。
- API 预检：各平台 auth API

---

## 七、去重机制

- 日志：`publish_log.json`（JSON Lines）
- 去重键：`(平台名, 视频文件名)`
- 双保险：调度器层 + 平台层
- `--no-dedup` 跳过，`--retry` 重跑失败

---

## 八、目录结构

```
木叶_视频内容/
├── 多平台分发/              ← 本 Skill（调度器 + 共享工具）
│   ├── SKILL.md
│   └── 脚本/
│       ├── distribute_all.py      # 主调度器 v4
│       ├── video_metadata.py      # 统一元数据生成器（v4 新增）
│       ├── schedule_generator.py  # 定时排期（v4: 第1条立即发）
│       ├── schedule_helper.py     # Playwright 定时 UI 辅助
│       ├── publish_result.py      # 统一 PublishResult + 去重
│       ├── title_generator.py     # 标题生成（被 video_metadata 取代）
│       ├── content_filter.py      # 敏感词过滤（70+ 映射）
│       ├── cookie_manager.py      # Cookie 统一管理（5 平台 API 预检）
│       ├── video_utils.py         # 视频处理（封面、元数据）
│       └── publish_log.json       # 发布日志
├── 抖音发布/                ← 纯 API（账号封禁中）
├── B站发布/                 ← bilibili-api-python API
├── 视频号发布/              ← 纯 API（DFS 协议，v5）
├── 小红书发布/              ← Playwright headless
└── 快手发布/                ← Playwright headless
```

---

## 九、依赖

- Python 3.10+
- httpx, bilibili-api-python, playwright, Pillow
- ffmpeg/ffprobe（系统已安装）
- `playwright install chromium`
