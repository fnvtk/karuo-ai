---
name: 多平台分发
description: >
  一键将视频分发到 5 个平台（抖音、B站、视频号、小红书、快手）。
  自动检测各平台 Cookie 状态，跳过未登录/过期的平台。
  封面统一用视频第一帧，Cookie 统一管理防重复获取。
triggers: 多平台分发、一键分发、全平台发布、批量分发、视频分发
owner: 木叶
group: 木
version: "1.0"
updated: "2026-03-10"
---

# 多平台分发 Skill（v1.0）

> **核心能力**：一条命令将成片目录下的所有视频同时发布到 5 个主流平台。
> **平台覆盖**：抖音、B站、视频号、小红书、快手。
> **技术路线**：B站/视频号 用 HTTP API 直传（推兔逆向），抖音用纯 API（逆向 VOD），小红书/快手用逆向 creator API。
> **Cookie 管理**：统一 cookie_manager.py 管理有效期，防止重复登录。

---

## 一、平台与实现方式

| 平台 | 实现方式 | API 来源 | Cookie 有效期 |
|------|----------|----------|---------------|
| **抖音** | 纯 API（VOD + bd-ticket-guard） | 独立逆向 | ~2-4h |
| **B站** | HTTP API（preupload 分片） | 推兔逆向 + 社区知识 | ~6 个月 |
| **视频号** | HTTP API（finder-assistant 分片） | 推兔逆向 | ~24-48h |
| **小红书** | 逆向 creator API | creator.xiaohongshu.com | ~1-3 天 |
| **快手** | 逆向 creator API | cp.kuaishou.com | ~7-30 天 |

---

## 二、一键命令

```bash
cd /Users/karuo/Documents/个人/卡若AI/03_卡木（木）/木叶_视频内容/多平台分发/脚本

# 检查所有平台 Cookie 状态
python3 distribute_all.py --check

# 分发到所有已登录的平台
python3 distribute_all.py

# 只分发到指定平台
python3 distribute_all.py --platforms 抖音 B站

# 分发单条视频
python3 distribute_all.py --video "/path/to/video.mp4"

# 自定义视频目录
python3 distribute_all.py --video-dir "/path/to/videos/"
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

## 六、目录结构

```
木叶_视频内容/
├── 多平台分发/          ← 本 Skill（调度器 + 共享工具）
│   ├── SKILL.md
│   └── 脚本/
│       ├── distribute_all.py    # 一键分发调度器
│       ├── cookie_manager.py    # Cookie 统一管理
│       ├── video_utils.py       # 视频处理（封面、元数据）
│       └── requirements.txt
├── 抖音发布/            ← 已有，纯 API
├── B站发布/             ← 新增，HTTP API（preupload）
├── 视频号发布/          ← 新增，HTTP API（finder-assistant）
├── 小红书发布/          ← 新增，逆向 creator API
└── 快手发布/            ← 新增，逆向 creator API
```

---

## 七、相关文件

| 文件 | 说明 |
|------|------|
| `脚本/distribute_all.py` | **主调度器**：一键分发到所有平台 |
| `脚本/cookie_manager.py` | Cookie 统一管理（有效期检查、防重复） |
| `脚本/video_utils.py` | 视频处理（封面提取、元数据） |
| `脚本/requirements.txt` | 依赖清单 |

---

## 八、万推（Web 版视频分发系统）

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
