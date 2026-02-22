# 抖音视频 ID 与文案解析规则

> 用于从抖音页面/HTML 中提取 aweme_id、video_id、file_id、文案、视频 URL。

---

## 一、链接格式

| 格式 | 示例 | 说明 |
|------|------|------|
| 短链 | `https://v.douyin.com/SpVK8mlOUUo/` | 需 resolve 到完整链接 |
| 完整链接 | `https://www.douyin.com/video/7607519346462286491` | 可直接提取 aweme_id |

---

## 二、ID 解析规则

| 字段 | 来源 | 正则/位置 | 示例 |
|------|------|----------|------|
| **aweme_id** | URL `/video/(\d+)` 或 `__vid=` | `r"/video/(\d+)"` | `7607519346462286491` |
| **video_id** | HTML `video_id=` | `r'video_id["\']?\s*[:=]\s*["\']?([a-zA-Z0-9_]+)'` | `v02f52g10003d69l7afog65sirkjgcag` |
| **file_id** | HTML `file_id=` | `r'file_id["\']?\s*[:=]\s*["\']?([a-f0-9]{32})'` | `f7a8f7b2af594e6d93f3588e7ff4ec66` |

---

## 三、文案提取规则

| 字段 | 来源 | 说明 |
|------|------|------|
| **title** | `<title>` 或 ROUTER_DATA | 页面标题，通常含标题+正文 |
| **desc** | ROUTER_DATA 或 title 后半部分 | 正文描述 |
| **hashtags** | 正文/标题中的 `#xxx` | 话题标签 |

---

## 四、视频 URL 提取

| 来源 | 说明 |
|------|------|
| **play_addr.url_list**（优先） | ROUTER_DATA 中的 `play_addr.url_list`，格式为 `aweme.snssdk.com/aweme/v1/play/...`，带 Referer 可 302 到真实 CDN |
| `<source src="...">` | 备选，可能返回封面图，需校验 Content-Type |
| 无水印 | 将 URL 中的 `playwm` 替换为 `play` |
| 下载需 | `Referer: https://www.douyin.com/`，否则 CDN 返回 403 或封面图 |

---

## 五、Play API 格式（备用）

```
https://www.douyin.com/aweme/v1/play/
  ?file_id=xxx
  &video_id=xxx
  &sign=xxx
  &uifid=xxx
  ...
```

需 sign、uifid 等动态参数，CDN 直链或 ROUTER_DATA 更稳定。
