---
name: 视频号发布
description: >
  纯 API 命令行方式发布视频到微信视频号（不打开浏览器）。通过逆向视频号助手的 finder-assistant
  腾讯云上传接口，实现 Cookie 认证 → applyuploaddfs → uploadpartdfs → completepartuploaddfs → post_create 的完整链路。
triggers: 视频号发布、发布到视频号、视频号登录、视频号上传、微信视频号
owner: 木叶
group: 木
version: "3.1"
updated: "2026-03-23"
---

# 视频号发布 Skill（v3.0）

> **核心能力**：纯 API（httpx）视频号发布，零 Playwright 依赖。
> **实测**：120 场 12 条切片全部 API 直发成功，单条 5~9 秒。
> **去重**：基于 publish_log.jsonl，同一视频不重复发。
> **Cookie 有效期**：~24-48h，通过 channels_login.py 扫码刷新。

---

## 一、纯 API 完整流程（5 步）

```
[Step 1] Cookie 认证（一次性）
  Playwright 微信扫码 → channels_storage_state.json
  登录地址: https://channels.weixin.qq.com/login
  获取: cookies, localStorage (_finger_print_device_id, __ml::aid)

[Step 2] 获取上传参数
  POST /cgi-bin/mmfinderassistant-bin/helper/helper_upload_params
  返回: authKey, uin(=x-wechat-uin), appType, videoFileType, pictureFileType

[Step 3] 分片上传 (DFS 协议)
  PUT  finderassistancea.video.qq.com/applyuploaddfs
  PUT  finderassistance[b-d].video.qq.com/uploadpartdfs?PartNumber=N&UploadID=xxx
  POST finderassistancea.video.qq.com/completepartuploaddfs?UploadID=xxx

[Step 4] 发布
  POST /micro/content/cgi-bin/mmfinderassistant-bin/post/post_create
  需要: finger-print-device-id, x-wechat-uin 自定义 headers

[Step 5] 去重记录
  发布成功后写入 publish_log.jsonl
```

---

## 二、关键技术发现（2026-03-10 逆向）

### 2.1 `BlockPartLength` 必须是累计偏移量

```python
# 错误: 各分块大小
{"BlockSum": 4, "BlockPartLength": [4194304, 4194304, 4194304, 785784]}  # → 400

# 正确: 累计字节偏移
{"BlockSum": 2, "BlockPartLength": [8388608, 13368696]}  # 8MB, fileSize
```

### 2.2 `post_create` 必需的自定义 Headers

| Header | 来源 | 说明 |
|--------|------|------|
| `finger-print-device-id` | localStorage `_finger_print_device_id` | 设备指纹 |
| `x-wechat-uin` | `helper_upload_params` → `uin` | 视频号 UIN |

缺少这两个 header 会返回 `errCode: 300002`。

### 2.3 `videoClipTaskId` / `urlCdnTaskId`

这两个字段由浏览器 JS 在发布页生成，服务端会验证。需从 Playwright 会话获取后复用。
存储在 `channels_task_id.txt`。

### 2.4 `post_create` URL 格式

```
/micro/content/cgi-bin/mmfinderassistant-bin/post/post_create
  ?_aid={localStorage.__ml::aid}
  &_rid={random}
  &_pageUrl=https://channels.weixin.qq.com/micro/content/post/create
```

### 2.5 Payload 必需字段

`report`, `mode: 1`, `postFlag: 0`, `member: {}`, `reqScene: 7` 缺一不可。

---

## 三、一键命令

```bash
cd /Users/karuo/Documents/个人/卡若AI/03_卡木（木）/木叶_视频内容/视频号发布/脚本

# 1. 首次或 Cookie 过期：微信扫码登录
python3 channels_login.py

# 2. 纯 API 批量发布
python3 channels_api_publish.py
```

---

## 四、Cookie 有效期

| Cookie | 有效期 | 说明 |
|--------|--------|------|
| 视频号助手 session | ~24-48h | 过期需重新微信扫码 |
| finger_print_device_id | 持久 | localStorage，不过期 |
| videoClipTaskId | 持久 | 一次获取可复用 |

---

## 五、相关文件

| 文件 | 说明 |
|------|------|
| `REFERENCE_开放能力_数据与集成.md` | **开放能力 + 官方助手 API + 直播/数据/橱窗/留资** 整合参考（与 A 轨发布对照） |
| `credentials/README.md` | **开放平台 AppID/AppSecret** 存放约定（`.env.open_platform`，勿提交） |
| `credentials/open_platform.env.example` | 环境变量模板 |
| `脚本/channels_open_fetch.py` | **开放平台**：拉账号/直播记录/预约/罗盘 GMV（无单条短视频播放接口） |
| `脚本/channels_api_publish.py` | **主脚本**：纯 API 视频上传+发布 (v5) |
| `脚本/channels_publish.py` | 旧版 Playwright 发布（备用） |
| `脚本/channels_login.py` | Playwright 微信扫码登录 |
| `脚本/channels_storage_state.json` | Cookie + localStorage 存储 |
| `脚本/channels_task_id.txt` | videoClipTaskId 存储 |

---

## 六、腾讯官方 API 能力与授权边界（吸收自《视频号与腾讯相关 API 整理》）

- **官方文档总入口**：`https://developers.weixin.qq.com/doc/channels/api/`
- **通用基础接口**：`/cgi-bin/token`、`/cgi-bin/stable_token` 获取 `access_token`，`/cgi-bin/openapi/quota/*` 管理调用额度。
- **视频号助手服务端能力**（官方、需 AppID / AppSecret 授权）主要覆盖：
  - 直播记录与预约：`/channels/ec/finderlive/*`
  - 橱窗商品管理：`/channels/ec/window/product/*`
  - 留资组件与数据：`/channels/leads/*`
  - 罗盘达人数据、本地生活团购等：详见官方文档模块列表。
- **小程序联动**：`wx.getChannelsLiveInfo`、`wx.openChannelsLive`、`channel-live` 组件，用于获取/打开视频号直播，与短视频发布无关。

**重要边界结论：**

- 微信官方当前 **没有提供**「通过开放平台 API 直接上传 / 发布视频号短视频」的能力。
- 短视频官方发布方式只有：
  - `https://channels.weixin.qq.com` 视频号助手网页端；
  - 微信客户端内手动发布。

**本 Skill 的定位：**

- 短视频发布：基于「视频号助手网页」的 **逆向协议**（`helper_upload_params` + DFS 分片上传 + `post_create`），封装在 `channels_api_publish.py` 中，供你在本机一键调用；协议细节与风险说明见同目录脚本内注释与《视频号与腾讯相关 API 整理》。
- 官方 API：若未来微信开放短视频上传/发布接口，可在本 Skill 中新增「官方 API 模式」，与当前逆向模式并存；直播/橱窗/留资等场景建议在单独的官方 API Skill 中按业务拆分（如「视频号直播数据看板」「视频号橱窗管理」「视频号留资同步」等）。
