# 视频号：开放能力 × 助手 Web API × 本项目集成参考

> 用途：把**视频号助手后台「开放能力」**、**微信开放平台「视频号助手 API」**与木叶现有**短视频纯 API 发布**放在一张图里，便于排需求、写脚本、对接运营数据。  
> 官方总入口：<https://developers.weixin.qq.com/doc/channels/api/>  
> 接口列表页：<https://developers.weixin.qq.com/doc/channels/api/channels/index.html>

---

## 一、两条轨道（不要混用）

| 轨道 | 凭证 | 典型用途 | 本项目落点 |
|------|------|----------|------------|
| **A. 视频号助手网页（逆向/会话）** | `channels_storage_state.json`、`channels_token.json`、扫码 Cookie | **短视频上传与发布**（DFS + `post_create`） | `脚本/channels_api_publish.py`、`channels_login.py` |
| **B. 开放平台「视频号助手 API」** | **AppID + AppSecret** → `access_token` / `stable_token` | **直播记录、预约、橱窗、留资、大屏、罗盘**等官方服务端接口 | 见下文「官方接口清单」；凭证见 `credentials/README.md` |

**边界（务必对齐多平台分发 Skill）：**  
微信**未开放**「用开放平台 API 直接上传/发布短视频」；短视频自动化目前只可走 **A 轨**。  
**B 轨**负责经营数据、带货、留资、直播场次等**合规官方能力**。

**无法规避助手 Cookie 的原因（结论）：** 官方接口列表页当前**无**「上传视频 / 发表动态 / 创建短视频」路径；社区答复亦明确**不支持**接口直发视频号 Feed。  
**缓解重复扫码（工程侧）**：`channels_login.py` 默认启用 **Playwright 持久化用户目录**（`~/.soul-channels-playwright-profile`），同机同账号在腾讯会话有效期内通常**无需每次扫码**；禁用：`CHANNELS_PERSISTENT_LOGIN=0` 或 `--no-persistent`。  
占位与自检脚本：`脚本/channels_open_platform_publish.py`。

---

## 二、助手后台「开放能力」能联想到的产品动作（想象力清单）

以下需在后台开通对应权限；是否开放以微信后台与文档为准。

### 2.1 直播全链路

| 阶段 | 可设想动作 | 依赖的官方能力方向 |
|------|------------|-------------------|
| 播前 | 把「直播预约」同步到飞书日历 / 派对排期表 | 直播预约记录 API |
| 播中 | 电商直播间指标看板（内部大屏，非替代微信客户端开播） | 直播大屏（**仅电商直播间**） |
| 播后 | 场次列表与 Soul 第 N 场对齐、自动写运营报表 | 直播记录 API |
| 转化 | 留资进多维表 / Mongo，再分给私域跟进 | 留资组件 + 留资直播数据 API |
| 带货 | 排品脚本：按策略上下架橱窗 | 橱窗管理 API |
| 复盘 | 周/月带货与人群报告自动生成 | 罗盘达人版 API |

### 2.2 与小程序/私域联动（另一条文档线）

- 同主体或关联主体小程序：`wx.getChannelsLiveInfo`、`wx.openChannelsLive`、`wx.reserveChannelsLive`、`channel-live` 等（打开/预约/内嵌直播），与 **A/B 轨互补**。
- 文档：<https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/channels-live>

### 2.3 当前**未**在官方「助手 API」里直接等价的能力（预期管理）

- 用 HTTP **代替手机/OBS 发起推流、开关播**（一般仍走客户端）。
- **实时弹幕/评论流**全量拉取（若有，以单独公告/文档为准，勿与下表混为一谈）。

---

## 三、视频号助手 API（官方）— 与直播/经营强相关的路径速查

摘自接口列表页（路径以文档最新版为准）。

### 3.1 直播基础信息

| 说明 | 路径 |
|------|------|
| 获取当前直播记录 | `/channels/ec/finderlive/getfinderliverecordlist` |
| 获取当前直播预约记录 | `/channels/ec/finderlive/getfinderlivenoticerecordlist` |

### 3.2 橱窗管理（带货）

| 说明 | 路径 |
|------|------|
| 上架到橱窗 | `/channels/ec/window/product/add` |
| 橱窗商品详情 | `/channels/ec/window/product/get` |
| 橱窗商品列表 | `/channels/ec/window/product/list/get` |
| 下架 | `/channels/ec/window/product/off` |

### 3.3 留资组件

| 说明 | 路径 |
|------|------|
| 按直播场次取留资详情 | `/channels/leads/get_leads_info_by_request_id` |
| 按时间取留资详情 | `/channels/leads/get_leads_info_by_component_id` |
| 留资 request_id 列表 | `/channels/leads/get_leads_request_id` |
| 留资组件直播推广记录 | `/channels/leads/get_leads_component_promote_record` |
| 留资组件 ID 列表 | `/channels/leads/get_leads_component_id` |

### 3.4 留资相关直播数据

| 说明 | 路径 |
|------|------|
| 视频号账号信息 | `/channels/finderlive/get_finder_attr_by_appid` |
| 留资直播数据详情 | `/channels/finderlive/get_finder_live_data_list` |
| 账号留资数量 | `/channels/finderlive/get_finder_live_leads_data` |

### 3.5 直播大屏

| 说明 | 路径 |
|------|------|
| 大屏直播列表（文档注明：仅电商直播间） | `/channels/livedashboard/getlivelist` |
| 大屏数据 | `/channels/livedashboard/getlivedata` |

### 3.6 罗盘达人版（带货复盘）

| 说明 | 路径 |
|------|------|
| 电商概览 | `/channels/ec/compass/finder/overall/get` |
| 带货商品数据 | `/channels/ec/compass/finder/product/data/get` |
| 带货商品列表 | `/channels/ec/compass/finder/product/list/get` |
| 带货人群数据 | `/channels/ec/compass/finder/sale/profile/data/get` |

### 3.7 通用基础

- 取 token：`/cgi-bin/token`、`/cgi-bin/stable_token`（服务端长期跑任务建议了解 stable_token 策略）。
- 额度：`/cgi-bin/openapi/quota/*`（以文档为准）。

---

## 四、A 轨：短视频「上传/发布」在本项目中的真实步骤（非开放平台）

与 `SKILL.md` 一致，便于和 B 轨对照：

1. `channels_login.py` → 落盘 `channels_storage_state.json`（及中央 Cookie 同步，见多平台分发 Skill）。
2. `helper_upload_params` → DFS `applyuploaddfs` / `uploadpartdfs` / `completepartuploaddfs`。
3. `post_create`（需 `finger-print-device-id`、`x-wechat-uin` 等）。
4. 去重：`多平台分发/脚本/publish_log.jsonl`（若走 distribute 链路）。

---

## 五、推荐集成顺序（给「smart / 运营自动化」排期用）

1. **已有**：A 轨短视频发布 + 分发日志（保持现状）。  
2. **先做低风险**：`getfinderliverecordlist` + `getfinderlivenoticerecordlist` → 写入飞书运营表或本地 JSONL。  
3. **有留资组件时**：接 `/channels/leads/*` 与 `get_finder_live_*`。  
4. **带货号**：橱窗 + 罗盘 + 大屏（确认账号类型是否电商直播）。  
5. **小程序**：与永平/soul 小程序需求单独立评审（主体绑定条件）。

---

## 六、凭证与操作约定

- **开放平台 AppID / AppSecret**：只放在 `credentials/.env.open_platform`（已被仓库根 `.gitignore` 的 `.env.*` 规则忽略），**永不提交 Git**。  
- **网页会话**：继续用 `脚本/channels_storage_state.json` 等；轮换策略见 `视频号发布/SKILL.md`。  
- 详细变量名与加载方式：`credentials/README.md`。

---

## 七、相关文件索引

| 文件 | 作用 |
|------|------|
| `视频号发布/SKILL.md` | A 轨发布流程与边界 |
| `视频号发布/REFERENCE_开放能力_数据与集成.md` | 本文：B 轨 + 集成脑图 |
| `视频号发布/credentials/README.md` | TOKEN 与环境变量约定 |
| `多平台分发/SKILL.md` | 全平台分发与视频号 Cookie 策略 |
| `脚本/channels_api_publish.py` | A 轨主脚本 |

---

*文档版本：2026-03-23 · 木叶*
