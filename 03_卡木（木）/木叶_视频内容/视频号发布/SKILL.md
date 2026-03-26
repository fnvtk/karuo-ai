---
name: 视频号发布
description: >
  纯 API 命令行方式发布视频到微信视频号（不打开浏览器）。通过逆向视频号助手的 finder-assistant
  腾讯云上传接口，实现 Cookie 认证 → applyuploaddfs → uploadpartdfs → completepartuploaddfs → post_create 的完整链路。
triggers: 视频号发布、发布到视频号、视频号登录、视频号上传、微信视频号
owner: 木叶
group: 木
version: "3.2"
updated: "2026-03-24"
---

# 视频号发布 Skill（v3.2）

> **核心能力**：发布链路纯 **httpx**；**登录**阶段用 Playwright（默认持久化 Chromium，减少重复扫码）。
> **实测**：120 场 12 条切片全部 API 直发成功，单条 5~9 秒。
> **去重**：基于 publish_log.jsonl，同一视频不重复发。
> **Cookie 有效期**：~24-48h，过期需刷新。`channels_login.py` 默认 **持久化 Chromium 用户目录**（`~/.soul-channels-playwright-profile`），同机同账号在腾讯会话未失效时**通常不必每次扫码**；`CHANNELS_PERSISTENT_LOGIN=0` 或 `--no-persistent` 可关。  
> **开放平台 access_token**：**不能**替代助手 Cookie 发短视频（官方助手 API 列表无上传发表接口），见 `REFERENCE_开放能力_数据与集成.md` 与 `脚本/channels_open_platform_publish.py`。

---

## 一、纯 API 完整流程（5 步）

```
[Step 1] Cookie 认证（助手态）
  Playwright（默认持久化 profile，减少重复扫码）→ channels_storage_state.json
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

**优先（纯接口、无网页控件）**：`channels_api_publish.py` — 全 **httpx**，走 `helper_upload_params` → DFS 分片 → `post_clip_video` → `post_create`。Cookie 仍须由 `channels_login.py` 写入 `channels_storage_state.json`（**localStorage 须含 `finder_raw`**，否则 `post_create` 会 300002）。

```bash
cd /Users/karuo/Documents/个人/卡若AI/03_卡木（木）/木叶_视频内容/视频号发布/脚本

# 1. 首次或 Cookie 过期：微信扫码登录（建议进一次发表页以注入 rawKeyBuff）
python3 channels_login.py --playwright-only

# 2. 纯 API 批量发（推荐）
python3 channels_api_publish.py --video-dir "/path/to/成片或切片目录"
# 或环境变量：CHANNELS_VIDEO_DIR=/path/to/dir python3 channels_api_publish.py
# 试跑前 2 条：python3 channels_api_publish.py --video-dir "..." --limit 2
```

**备选（Playwright 点页面、F12 注入定时）**：需要页面控件或接口失败再排错时用：

```bash
python3 channels_web_cli.py publish-dir \
  --video-dir "<视频目录>" \
  --min-gap 10 --max-gap 25 \
  --start-after-min 5 --interval-min 15 \
  --skip-list-verify --max-attempts 5
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

---

## 七、当前默认执行规范（2026-03-24 更新）

- **强制无界面**：`channels_web_cli.py` 默认强制 `headless=True`，即使传 `--show` 也忽略（仅打印提示）。
- **定时来源唯一**：计划发布时间只走「计划发布控件 + post_create 注入」，**不再写入描述文本**。
- **间隔策略**：默认 `--min-gap 10 --max-gap 25`，即每条发布定时间隔在 **10~25 分钟**。
- **真实提交间隔**：每条视频在排期时间前 2 分钟才开始上传提交（`cmd_publish_dir` 内 `asyncio.sleep` 等到目标时刻），避免密集提交触发平台"同质化内容"检测。
- **发布判定**：`post_create/post_publish` 命中 + `errCode=0` 作为成功主判据（可选列表核验）。

---

## 八、实战接口与参数清单（F12 抓包口径）

> 抓包文件：`/tmp/channels_netlogs/*.jsonl`（每条视频单独一份）。

### 8.1 关键接口（发布链路）

1) 获取上传参数  
- `POST /cgi-bin/mmfinderassistant-bin/helper/helper_upload_params`  
- 关键返回：`authKey`、`uin`、上传域参数

2) 分片上传（腾讯 DFS）  
- `PUT https://finderassistance*.video.qq.com/applyuploaddfs`  
- `PUT https://finderassistance*.video.qq.com/uploadpartdfs?PartNumber=N&UploadID=...`  
- `POST https://finderassistance*.video.qq.com/completepartuploaddfs?UploadID=...`

3) 正式发布  
- `POST /micro/content/cgi-bin/mmfinderassistant-bin/post/post_create`  
- 关键 URL 参数：`_aid`、`_rid`、`_pageUrl`

4) 发布后核验（可选）  
- `POST /cgi-bin/mmfinderassistant-bin/post/post_list`

5) 已发布内容删除（重发前清理）  
- `POST /cgi-bin/mmfinderassistant-bin/post/post_delete`  
- 最小参数：`{"objectId":"export/..."}`  
- 实测：`errCode=0` 即删除成功。

### 8.2 关键请求头（发布必须）

- `cookie`：来自 `channels_storage_state.json`（登录态）  
- `finger-print-device-id`：设备指纹（localStorage）  
- `x-wechat-uin`：来自 upload params 的 `uin`  
- `content-type: application/json`

### 8.3 关键 payload 字段（post_create）

- `mode`（发布模式）  
- `postFlag`  
- `reqScene`  
- `member`  
- `report`  
- 文案/话题字段（由描述生成）  
- 定时字段（由注入逻辑写入 `scheduled_time` / `create_time` 等）

---

## 九、全流程问题与经验总结（2026-03-24 批量重发 78 场）

### 9.1 典型问题

1) **动作成功但不出发布回执**  
- 现象：页面动作全通过，却没有 `post_create`。  
- 根因：拦截弹窗（"将此次编辑保留/不保存"）吞掉最终提交。

2) **原创弹窗确认后仍未真正发布**  
- 现象：点了"声明原创"，仍未触发发布接口。  
- 根因：部分页面流转下，声明按钮只关闭弹窗，不等于最终提交。

3) **截图导致流程中断**  
- 现象：`TargetClosedError`。  
- 根因：页面切换瞬间截图异常抛错。

4) **密集提交触发"同质化内容"警告**  
- 现象：所有视频在 3-5 分钟内全部提交完毕，微信视频号发来"作品优化建议"通知，提示"多次发表情景、文案、元素等近似的同质化内容"。  
- 根因：虽然每条设了不同的定时发布时间，但实际上传提交时间全挤在一起，平台检测的是提交时间而非定时时间。  
- 修复：`cmd_publish_dir` 改为每条在排期时间前 2 分钟才开始上传。

### 9.2 已落地修复

- 增加"拦截弹窗清理"逻辑，优先点击"不保存"。  
- 在"声明原创"后强制再点一次"发表"。  
- 若未捕获发布回执，触发"自愈补点击"（声明原创+发表）。  
- 截图改为容错模式，截图失败不终止主流程。  
- 增加动作级检查点：每一步都记录状态并落图。  
- 增加网络抓包落盘：请求/响应/参数全量记录。  
- **真实提交间隔**：等到排期时间前 2 分钟才上传（避免密集提交被平台检测）。  
- 间隔默认值改为 10~25 分钟（之前 10~120 过宽导致跨度过长）。

### 9.3 运行建议（稳定优先）

- 批量命令：  
  ```bash
  python3 channels_web_cli.py publish-dir \
    --video-dir "<目录>" \
    --min-gap 10 --max-gap 25 \
    --start-after-min 5 --interval-min 15 \
    --skip-list-verify --max-attempts 5
  ```
- 遇到 `Cookie 过期`：先 `python3 channels_login.py` 再续跑。  
- 若后台再次改版：先看 `/tmp/channels_netlogs/*.jsonl` 中是否仍有 `post_create errCode=0`。

### 9.4 间隔策略演进（三版迭代）

| 版本 | 排期间隔 | 实际提交 | 结果 |
|------|---------|---------|------|
| v1 | 参数被忽略（走smart默认） | 连续提交（10秒间隔） | 间隔不受控 |
| v2 | 10-120分钟（已修） | 连续提交（10秒间隔） | 微信"同质化"警告 |
| v3（当前） | 10-25分钟 | 等到排期前2分钟才提交 | 正常运行 |

**关键教训**：视频号平台检测的是**实际提交/上传时间**，不是定时发布时间。排期只控制何时公开，但密集上传本身就会触发同质化检测。


## 十、定时失效根因与最终修复（2026-03-24）

### 10.1 根因结论（实测）

- 仅注入 `postTimingInfo/postInfo.postTime` 不足以保证视频号按定时发布。
- **视频号实际生效字段是 `effectiveTime`（unix 秒）**。
- 当 `post_create` 请求体里 `effectiveTime` 未按目标时间设置时，会表现为“看似定时、实际立即发布”。

### 10.2 最终修复

1. 在 `channels_publish.py` 的 `_inject_timing_payload()` 中强制注入：
   - `effectiveTime = schedule_ts`
   - `postTimingInfo = { timing: 1, postTime: schedule_ts }`（兼容保留）
2. 发布后新增强校验日志：
   - `定时注入命中次数`
   - `定时字段写入命中`
3. 使用 `post_list` 回查每条内容的 `effectiveTime` 与目标发布时间是否一致。

### 10.3 本次78场复发后台核验结果

- 10/10 成功发布。
- 10/10 在 `post_list` 可见 `effectiveTime`（均为未来时间点）。
- 示例：
  - `AI时代用对工具` → `effectiveTime=2026-03-24 18:34:31`
  - `这个客户从2018年一直跟我下单` → `effectiveTime=2026-03-24 21:00:29`

### 10.4 F12抓包接口清单（本轮实测）

- `POST /cgi-bin/mmfinderassistant-bin/helper/helper_upload_params`
- `POST /micro/content/cgi-bin/mmfinderassistant-bin/post/get-finder-post-trace-key`
- `POST /micro/content/cgi-bin/mmfinderassistant-bin/post/post_clip_video`
- `POST /micro/content/cgi-bin/mmfinderassistant-bin/post/post_clip_video_result`
- `POST /micro/content/cgi-bin/mmfinderassistant-bin/post/post_create`  （定时核心）
- `POST /micro/content/cgi-bin/mmfinderassistant-bin/post/post_list`
- `POST /micro/content/cgi-bin/mmfinderassistant-bin/post/check_finder_comm_face`
- `POST /micro/content/cgi-bin/mmfinderassistant-bin/helper/helper_search_location`
- `POST /cgi-bin/mmfinderassistant-bin/post/post_delete`

### 10.5 定时成功判定标准（以后固定）

必须同时满足：
1. `post_create` 返回 `errCode=0`
2. 注入日志显示 `定时字段写入命中 >= 1`
3. `post_list` 中对应内容存在且 `effectiveTime` 为目标时间（允许秒级偏差）

任一不满足即判失败，不允许继续批量发下一条。
