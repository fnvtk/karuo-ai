---
name: 多平台分发
description: >
  一键将视频分发到 5 个平台（抖音、B站、视频号、小红书、快手）。
  支持定时排期（30-120分钟随机间隔）、并行分发、去重、失败自动重试。
  封面统一用视频第一帧，Cookie 统一管理防重复获取。
triggers: 多平台分发、一键分发、全平台发布、批量分发、视频分发
owner: 木叶
group: 木
version: "3.0"
updated: "2026-03-10"
---

# 多平台分发 Skill（v3.0）

> **核心能力**：一条命令将成片目录下的所有视频同时发布到 5 个主流平台。
> **平台覆盖**：抖音、B站、视频号、小红书、快手。
> **技术路线**：抖音纯 API（逆向 VOD），B站 bilibili-api-python API，视频号/小红书/快手 Playwright 自动化。
> **全链路**：定时排期 → 并行分发 → 去重 → 失败重试 → Cookie 预警 → 结果日志。

---

## 一、平台与实现方式

| 平台 | 实现方式 | 定时发布 | Cookie 有效期 | 119 场实测 |
|------|----------|----------|---------------|------------|
| **抖音** | 纯 API（VOD + bd-ticket-guard） | API timing_ts | ~2-4h | Cookie 过期需重新登录 |
| **B站** | bilibili-api-python API 优先 → Playwright 兜底 | API dtime | ~6 个月 | 13/13 成功 |
| **视频号** | Playwright headless 自动化 | UI 定时（降级立即） | ~12 个月 | 13/13 成功 |
| **小红书** | Playwright headless 自动化 | UI 定时（降级立即） | ~12 个月 | 14/14 成功 |
| **快手** | Playwright headless 自动化 | UI 定时成功 | ~21 天 | 12/12 成功（含重试） |

---

## 二、一键命令

```bash
cd /Users/karuo/Documents/个人/卡若AI/03_卡木（木）/木叶_视频内容/多平台分发/脚本

# 定时排期并行分发（默认 30-120 分钟随机间隔）
python3 distribute_all.py

# 立即发布（不排期）
python3 distribute_all.py --now

# 自定义排期间隔
python3 distribute_all.py --min-gap 30 --max-gap 120 --max-hours 24

# 只发指定平台
python3 distribute_all.py --platforms 抖音 B站

# 检查 Cookie + 重试失败
python3 distribute_all.py --check
python3 distribute_all.py --retry

# 分发单条 / 自定义目录
python3 distribute_all.py --video "/path/to/video.mp4"
python3 distribute_all.py --video-dir "/path/to/videos/"

# 跳过去重 / 串行调试
python3 distribute_all.py --no-dedup
python3 distribute_all.py --serial
```

---

## 三、首次使用流程

```
1. 安装依赖
   pip3 install httpx playwright cryptography Pillow
   playwright install chromium

2. 逐个平台登录（只需首次）
   python3 ../抖音发布/脚本/douyin_login.py
   python3 ../B站发布/脚本/bilibili_login.py
   python3 ../视频号发布/脚本/channels_login.py
   python3 ../小红书发布/脚本/xiaohongshu_login.py
   python3 ../快手发布/脚本/kuaishou_login.py

3. 检查 Cookie 状态
   python3 distribute_all.py --check

4. 一键分发
   python3 distribute_all.py
```

---

## 四、Cookie 管理

### 4.1 统一管理器

`cookie_manager.py` 提供：
- 加载 Playwright storage_state.json
- 检查 Cookie 有效期（ok / warning / expiring_soon / expired）
- 提供 cookie_str / cookie_dict
- 批量检查所有平台状态

### 4.2 有效期对比

| 平台 | Cookie 有效期 | 建议刷新频率 |
|------|-------------|-------------|
| 抖音 | ~2-4h | 每次使用前 |
| B站 | ~6 个月 | 半年一次 |
| 视频号 | ~24-48h | 每天 |
| 小红书 | ~1-3 天 | 2-3 天 |
| 快手 | ~7-30 天 | 每周 |

### 4.3 防重复获取

Cookie 文件保存后自动记录时间戳，`cookie_manager.py` 通过文件修改时间判断年龄。
若 Cookie 仍有效，不会触发重新登录。

---

## 五、视频处理

### 5.1 封面提取

`video_utils.py` 使用 ffmpeg 提取视频第一帧（0.5s 处）作为封面：

```python
from video_utils import extract_cover
cover_path = extract_cover("/path/to/video.mp4")
```

### 5.2 视频元数据

```python
from video_utils import get_video_info
info = get_video_info("/path/to/video.mp4")
# {'duration': 180.5, 'width': 1080, 'height': 1920, ...}
```

---

## 六、定时排期

### 6.1 排期逻辑（schedule_generator.py）
- 相邻视频随机间隔 30-120 分钟
- 若总跨度 > 24h，按比例自动压缩
- 15 条视频典型跨度 ~16-18h

### 6.2 各平台定时支持

| 平台 | 定时方式 | 状态 |
|------|----------|------|
| 抖音 | API `timing_ts`（Unix 时间戳） | 已实现 |
| B站 | API `dtime`（Unix 时间戳） | 已实现 |
| 快手 | Playwright UI「定时发布」 | 已实现，成功率高 |
| 视频号 | Playwright UI「定时发布」 | 已实现，UI 匹配待优化 |
| 小红书 | Playwright UI「定时发布」 | 已实现，UI 匹配待优化 |

定时失败时自动降级为立即发布，不影响视频发出。

---

## 七、去重机制

- 基于 `publish_log.json`（JSON Lines 格式）记录每次发布结果
- 去重键：`(平台名, 视频文件名)`
- 双保险：调度器层（distribute_all.py）+ 平台层（各 publish_one）
- 独立运行单平台脚本也有去重
- `--no-dedup` 跳过去重，`--retry` 重跑失败任务

---

## 八、目录结构

```
木叶_视频内容/
├── 多平台分发/            ← 本 Skill（调度器 + 共享工具）
│   ├── SKILL.md
│   └── 脚本/
│       ├── distribute_all.py      # 主调度器 v3
│       ├── schedule_generator.py  # 定时排期生成器
│       ├── schedule_helper.py     # Playwright 定时发布辅助
│       ├── publish_result.py      # 统一发布结果 + 去重
│       ├── title_generator.py     # 智能标题生成
│       ├── cookie_manager.py      # Cookie 统一管理
│       ├── video_utils.py         # 视频处理（封面、元数据）
│       └── publish_log.json       # 发布结果日志（自动生成）
├── 抖音发布/              ← 纯 API（VOD + bd-ticket-guard）
├── B站发布/               ← bilibili-api-python API + Playwright 兜底
├── 视频号发布/            ← Playwright headless
├── 小红书发布/            ← Playwright headless
└── 快手发布/              ← Playwright headless
```

---

## 九、相关文件

| 文件 | 说明 |
|------|------|
| `脚本/distribute_all.py` | **主调度器 v3**：定时排期 + 并行分发 + 去重 + 重试 |
| `脚本/schedule_generator.py` | 排期生成（30-120min 间隔，超 24h 压缩） |
| `脚本/schedule_helper.py` | Playwright 定时发布 UI 交互辅助 |
| `脚本/publish_result.py` | 统一 PublishResult + 日志 + 去重 |
| `脚本/title_generator.py` | 智能标题（字典优先 → 文件名自动） |
| `脚本/cookie_manager.py` | Cookie 统一管理（有效期检查、防重复） |
| `脚本/video_utils.py` | 视频处理（封面提取、元数据） |

---

## 十、踩坑经验（119 场全量分发）

### 10.1 视频号/小红书定时发布 UI 匹配失败
- **现象**：`schedule_helper.py` 找到了「定时发布」文字但日期时间 input 未匹配到
- **原因**：这两个平台的日期选择器是自定义组件（非原生 `input[type="date"]`），需要点击日历格子
- **影响**：定时功能降级为立即发布，视频仍正常发出
- **待优化**：研究各平台 datepicker 的具体 DOM 结构，用 JS 直接操作 React state

### 10.2 快手「未找到上传控件」
- **现象**：部分视频上传时 `input[type="file"]` 元素未出现
- **原因**：快手页面加载时偶发 JS 渲染延迟，或上次草稿弹窗阻塞了上传区
- **解决**：脚本已加「放弃草稿」逻辑，重试后全部成功

### 10.3 B站 API 偶发超时后 Playwright 兜底也失败
- **现象**：2 条视频 API 超时后降级到 Playwright，但 Playwright 也找不到上传控件
- **原因**：B站创作中心在短时间内连续打开浏览器可能触发人机验证
- **解决**：重试时纯 API 直接成功（5.3-5.7s），Playwright 只在 API 彻底不可用时才需要

### 10.4 抖音 Cookie 过期（全局）
- **现象**：Cookie 检查显示有效（expiry > now），但 API 返回「Cookie 已过期」
- **原因**：抖音 API 的 `user_info` 接口在 Cookie 过期前约 1-2h 就开始拒绝
- **解决**：重新运行 `python3 douyin_login.py` 扫码登录

### 10.5 并行分发的 Playwright 资源竞争
- **现象**：多个 Playwright 同时运行时 CPU 飙高、偶发超时
- **影响**：视频号/小红书/快手 三路 Playwright 并行，部分上传时间从 2s 涨到 5s
- **建议**：服务器部署时限制并发数（如最多 3 个 Playwright 同时）

---

## 十一、万推（Web 版视频分发系统）

卡若AI 的多平台分发能力已整合到万推项目（`/Users/karuo/Documents/开发/3、自营项目/万推/`），提供 Web GUI + API 接口：

| 组件 | 说明 |
|------|------|
| **万推后端** | FastAPI，`backend/main.py`，端口 8000 |
| **万推前端** | Vue 3 毛玻璃风格，`frontend/index.html` |
| **直连发布器** | `backend/direct_publisher.py`，Playwright 操作 5 平台创作者中心 |
| **uploader 体系** | `backend/uploader/` 下 5 平台独立 uploader |
| **Cookie 自动获取** | `backend/cookie_fetcher.py`，打开浏览器让用户扫码 |

### 启动万推

```bash
cd /Users/karuo/Documents/开发/3、自营项目/万推/backend
pip3 install -r requirements.txt
playwright install chromium
python3 main.py
# 访问 http://localhost:8000
```

### 万推与卡若AI脚本的关系

- 卡若AI `distribute_all.py`：命令行一键分发，适合自动化流水线
- 万推 Web 界面：用户手动管理账号和分发，适合日常运营
- 两者共享 Playwright + Cookie 方案，互为补充

---

## 九、依赖

- Python 3.10+
- httpx, playwright, playwright-stealth, cryptography, Pillow
- biliup（B站上传 API）
- ffmpeg/ffprobe（系统已安装）
- Playwright chromium（`playwright install chromium`）
