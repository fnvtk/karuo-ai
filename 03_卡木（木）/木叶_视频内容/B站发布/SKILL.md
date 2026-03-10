---
name: B站发布
description: >
  纯 API 命令行方式发布视频到 B站（不打开浏览器）。通过逆向 B站创作中心的 preupload 分片上传接口，
  实现 Cookie 认证 → preupload → 分片上传 → complete → add/v3 发布的完整链路。
  封面自动取视频第一帧。
triggers: B站发布、发布到B站、B站登录、B站上传、bilibili发布
owner: 木叶
group: 木
version: "1.0"
updated: "2026-03-10"
---

# B站发布 Skill（v1.0）

> **核心能力**：纯 Python 命令行，无需打开浏览器，通过 B站 preupload 系列 HTTP API 实现视频上传与发布。
> **认证方式**：Playwright 扫码登录获取 Cookie（SESSDATA、bili_jct 等），之后全程 API 操作。
> **适用场景**：Soul 派对切片批量分发、定时发布、自动化工作流。

---

## 一、纯 API 完整流程（5 步）

```
[Step 1] Cookie 认证
  Playwright 扫码登录 → bilibili_storage_state.json
  关键 Cookie: SESSDATA, bili_jct(CSRF), DedeUserID

[Step 2] 获取上传节点 (preupload)
  GET member.bilibili.com/preupload
  参数: name, size, r=upos, profile=ugcfr/pc3
  返回: upos_uri, auth, endpoint, chunk_size, biz_id

[Step 3] 初始化上传
  POST /{upos_uri}?uploads&output=json
  返回: upload_id

[Step 4] 分片上传 + 确认
  PUT /{upos_uri}?partNumber=N&uploadId=...&chunk=N&chunks=total
  POST /{upos_uri}?output=json&profile=ugcfr/pc3&uploadId=...
  body: {"parts": [{"partNumber": 1, "eTag": "etag"}]}

[Step 5] 发布视频
  POST /x/vu/web/add/v3
  body: {title, desc, tid, tag, videos: [{filename}], cover, csrf}
```

---

## 二、一键命令

```bash
cd /Users/karuo/Documents/个人/卡若AI/03_卡木（木）/木叶_视频内容/B站发布/脚本

# 1. 首次或 Cookie 过期：扫码登录
python3 bilibili_login.py

# 2. 批量发布（成片目录下所有 .mp4）
python3 bilibili_publish.py

# 3. 发布单条
python3 bilibili_publish.py --video "/path/to/video.mp4" --title "标题"
```

---

## 三、Cookie 有效期

| Cookie | 有效期 | 说明 |
|--------|--------|------|
| SESSDATA | ~6 个月 | 主认证 Cookie，过期需重新扫码 |
| bili_jct | ~6 个月 | CSRF token，提交时必带 |
| DedeUserID | ~6 个月 | 用户 ID |

B站 Cookie 有效期较长（约 6 个月），相比抖音稳定得多。

---

## 四、相关文件

| 文件 | 说明 |
|------|------|
| `脚本/bilibili_publish.py` | **主脚本**：纯 API 视频上传+发布 |
| `脚本/bilibili_login.py` | Playwright 扫码登录 |
| `脚本/bilibili_storage_state.json` | Cookie 存储（生成后自动创建） |

---

## 五、依赖

- Python 3.10+
- httpx, playwright
- ffmpeg（封面提取）
- 共享工具：`多平台分发/脚本/cookie_manager.py`、`video_utils.py`
