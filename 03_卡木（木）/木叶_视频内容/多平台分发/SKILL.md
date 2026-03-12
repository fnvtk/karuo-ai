---
name: 多平台分发
description: >
  一键将视频分发到 5 个平台（抖音、B站、视频号、小红书、快手）。
  API 优先策略：视频号纯 API、B站 bilibili-api-python、抖音纯 API。
  支持定时排期（第1条立即发，后续 30-120 分钟随机间隔）、并行分发、去重、失败自动重试。
triggers: 多平台分发、一键分发、全平台发布、批量分发、视频分发
owner: 木叶
group: 木
version: "4.0"
updated: "2026-03-11"
---

# 多平台分发 Skill（v4.0）

> **核心原则**：API 发布为主，Playwright 为辅。确保确定性地分发到各平台。
> **v4.0 变更**：视频号已切换为纯 API、统一元数据生成器、定时排期优化、简介/标签/分区自动填充。

---

## 一、平台与实现方式

| 平台 | 实现方式 | 定时发布 | Cookie 有效期 | 120 场实测 |
|------|----------|----------|---------------|------------|
| **视频号** | **纯 API**（DFS 上传 + post_create） | API 原生支持 | ~24-48h | 12/12 成功 |
| **B站** | **bilibili-api-python** API 优先 → Playwright 兜底 | API `dtime` | ~6 个月 | 12/12 成功 |
| **小红书** | Playwright headless 自动化 | UI 定时（降级立即） | ~1-3 天 | 12/12 成功 |
| **快手** | Playwright headless 自动化 | UI 定时 | ~7-30 天 | Cookie 过期 |
| **抖音** | 纯 API（VOD + bd-ticket-guard） | API `timing_ts` | ~2-4h | 账号封禁中 |

> **关于视频号官方 API 边界**：  
> 按《视频号与腾讯相关 API 整理》结论，微信官方目前**没有开放「短视频上传/发布」接口**；本 Skill 中的视频号发布能力，属于对 `https://channels.weixin.qq.com` 视频号助手网页协议的逆向封装（DFS 上传 + `post_create`），仅在你本机使用，需自行承担协议变更与合规风险。  
> 官方可控能力（直播记录、橱窗、留资、罗盘数据、本地生活等）的服务端 API 入口为：`https://developers.weixin.qq.com/doc/channels/api/`，如需做直播/橱窗/留资集成，可基于该文档在单独 Skill 中扩展。

---

## 二、一键命令

```bash
cd /Users/karuo/Documents/个人/卡若AI/03_卡木（木）/木叶_视频内容/多平台分发/脚本

# 定时排期：第1条立即，后续 30-120min 随机间隔
python3 distribute_all.py

# 立即全部发布
python3 distribute_all.py --now

# 只发指定平台
python3 distribute_all.py --platforms 视频号 B站

# 自定义视频目录
python3 distribute_all.py --video-dir "/path/to/videos/"

# 检查 Cookie / 重试失败
python3 distribute_all.py --check
python3 distribute_all.py --retry
```

---

## 三、定时排期（v4.0 优化）

### 3.1 排期规则
- **第 1 条**：立即发布（`first_delay=0`）
- **第 2 条起**：前一条 + random(30, 120) 分钟
- 若总跨度 > 24h，自动按比例压缩
- 12 条视频典型跨度 ~10-14h

### 3.2 各平台定时实现

| 平台 | 定时方式 | 参数 |
|------|----------|------|
| B站 | API `meta.dtime` | Unix 时间戳（秒） |
| 视频号 | API 暂不支持原生定时 | 描述中标注时间/手动设置 |
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
meta.hashtags("视频号")    # #AI工具 #效率提升 ... #小程序 卡若创业派对
```

### 4.1 内容结构
- **标题**：手工优化标题库优先，否则从文件名智能提取
- **简介**：标题 + 换行 + 话题标签 + `#小程序 卡若创业派对`
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
- 自动迁移：旧路径 → 中央存储（首次使用时）
- API 预检：5 平台各自 auth API 校验有效性
- 防重复登录：有效 Cookie 不触发重新获取

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
