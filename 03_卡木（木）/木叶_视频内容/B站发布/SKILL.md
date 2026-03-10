---
name: B站发布
description: >
  bilibili-api-python 纯 API 优先 + Playwright 兜底。支持定时排期（dtime）、去重、封面自动提取。
  119 场实测 13/13 全部成功（含重试 2 条）。
triggers: B站发布、发布到B站、B站登录、B站上传、bilibili发布
owner: 木叶
group: 木
version: "2.0"
updated: "2026-03-10"
---

# B站发布 Skill（v2.0）

> **核心能力**：bilibili-api-python 纯 API 优先，失败时自动降级到 Playwright 可见浏览器。
> **定时发布**：API `dtime` 参数（Unix 时间戳），Playwright 兜底无定时。
> **去重**：基于 publish_log.json，同一视频不重复发。
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
