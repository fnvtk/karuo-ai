---
name: 抖音发布
description: >
  纯 API 命令行方式发布视频到抖音（不打开浏览器）。通过逆向抖音创作者中心的上传与发布接口，
  实现 Cookie 认证 → VOD 上传 → CommitUpload → bd-ticket-guard 签名 → create_v2 发布的完整链路。
  兼容存客宝/腕推等矩阵工具方案；与 Soul 竖屏成片、视频切片联动。
triggers: 抖音发布、发布到抖音、抖音登录、抖音上传、腕推抖音、纯API发布、命令行发布抖音
owner: 木叶
group: 木
version: "2.0"
updated: "2026-03-09"
---

# 抖音发布 Skill（v2.0）

> **核心能力**：纯 Python 命令行，无需打开浏览器，通过逆向抖音创作者中心内部 API 实现视频上传与发布。  
> **认证方式**：Playwright 扫码登录获取 `storage_state.json`（Cookie + localStorage 安全密钥），之后全程 API 操作。  
> **适用场景**：Soul 派对切片批量分发、定时发布、自动化工作流。

---

## 一、发布方式对比

| 方式 | 优点 | 缺点 | 推荐场景 |
|------|------|------|----------|
| **纯 API（本 Skill 主方案）** | 无浏览器窗口、速度快、可自动化 | 需逆向维护、Cookie 有效期短 | 批量自动发布 |
| 抖音开放平台 OAuth | 官方接口、稳定 | 需企业资质、审核能力、有发布上限 | 正式产品集成 |
| 推兔/腕推（webview 自动化） | 多平台支持 | 需安装桌面端、依赖 NW.js | 多平台矩阵 |
| Playwright 有头浏览器 | 简单直接 | 需显示窗口、速度慢 | 调试/备用 |

---

## 二、纯 API 完整流程（6 步）

> 流程图见：`参考资料/抖音纯API发布流程图.png`

```
[Step 1] Cookie 认证
  Playwright 扫码登录 → douyin_storage_state.json
  提取: cookies, ec_privateKey, server_cert, ticket, ts_sign(web_protect), msToken

[Step 2] 获取 VOD 上传凭证
  GET /web/api/media/upload/auth/v5/
  返回: AccessKeyID, SecretAccessKey, SessionToken

[Step 3] 申请上传地址 (ApplyUploadInner)
  GET vod.bytedanceapi.com/?Action=ApplyUploadInner
  签名: AWS4-HMAC-SHA256 (GET)
  返回: UploadHost, StoreUri, UploadID(预分配), SessionKey, Vid

[Step 4] 上传视频 (/upload/v1/ 协议)
  POST https://{host}/upload/v1/{storeUri}?uploadid={UploadID}&part_number=1&phase=transfer
  POST https://{host}/upload/v1/{storeUri}?uploadid={UploadID}&phase=finish
    body: "1:{server_crc32}"

[Step 5] 提交上传 (CommitUploadInner)  ★ 关键步骤
  POST vod.bytedanceapi.com/?Action=CommitUploadInner&SpaceName=aweme&...
  签名: AWS4-HMAC-SHA256 (POST, body hash)
  body: JSON {"SessionKey": "...", "Functions": [{"Name": "GetMeta"}]}
  返回: video_id, VideoMeta(Duration, Height, Width, Codec...)

[Step 6] 发布视频 (create_v2)
  POST /web/api/media/aweme/create_v2/
  签名: bd-ticket-guard (ECDH + HMAC)
  body: JSON {item: {common: {text, video_id, ...}, cover: {...}}}
  返回: aweme_id (视频ID) 或错误信息
```

---

## 三、一键命令

```bash
cd /Users/karuo/Documents/个人/卡若AI/03_卡木（木）/木叶_视频内容/抖音发布/脚本

# 1. 首次或 Cookie 过期时：扫码登录
python3 douyin_login.py

# 2. 批量发布（成片目录下所有 .mp4）
python3 douyin_pure_api.py

# 3. 发布单条
python3 douyin_pure_api.py --video "/path/to/video.mp4" --title "标题 #话题"
```

---

## 四、关键技术细节

### 4.1 AWS4-HMAC-SHA256 签名

VOD API（`vod.bytedanceapi.com`）使用 AWS4 签名。**GET 和 POST 的签名方式不同**：

| 项目 | GET 请求 | POST 请求 |
|------|----------|-----------|
| Canonical Request 首行 | `GET` | `POST` |
| Signed Headers | `x-amz-date;x-amz-security-token` | `content-type;x-amz-date;x-amz-security-token` |
| Payload Hash | `sha256("")` 空字符串 | `sha256(实际body)` |

```python
# POST 签名的 canonical request 构造
canonical = f"POST\n/\n{qs}\n"
           f"content-type:text/plain;charset=UTF-8\n"
           f"x-amz-date:{amz_date}\n"
           f"x-amz-security-token:{token}\n\n"
           f"content-type;x-amz-date;x-amz-security-token\n"
           f"{sha256(body)}"
```

### 4.2 bd-ticket-guard 签名（create_v2 专用）

`create_v2` 接口使用字节跳动私有安全签名：

1. 从 `localStorage` 取 `ec_privateKey`（ECDH P-256）和 `server_cert`（X.509 证书内的公钥）
2. 生成临时 ECDH 密钥对 → 与服务端公钥做密钥交换 → 得到 `shared_secret`
3. 从 `s_sdk_sign_data_key/web_protect` 取 `ticket` 和 `ts_sign`（`ts.2.{hex}` 格式）
4. 用 `shared_secret` 对 `ts_sign` 前32字节做 XOR 得到新 `ts_sign`
5. HMAC-SHA256(`shared_secret`, `"{ticket},{path},{timestamp}"`) 得到 `req_sign`
6. 组装 5 个 `bd-ticket-guard-*` 请求头

### 4.3 CommitUploadInner 请求格式（★ 最关键）

```
方法: POST（不是 GET！）
URL:  https://vod.bytedanceapi.com/?Action=CommitUploadInner
        &SpaceName=aweme&Version=2020-11-19&app_id=2906&user_id={uid}
Headers:
  authorization: AWS4-HMAC-SHA256 ...（POST 签名）
  content-type: text/plain;charset=UTF-8
  x-amz-date: {yyyymmddTHHMMSSZ}
  x-amz-security-token: {token}
Body (JSON):
  {"SessionKey": "...", "Functions": [{"Name": "GetMeta"}]}
```

**注意**：
- `SessionKey` 和 `Functions` 在 **POST body** 中，不在 URL query string
- `Functions` 必须是 **JSON 数组**，不是 JSON 字符串（`json.dumps`）
- URL query string 只放 `Action`, `Version`, `SpaceName`, `app_id`, `user_id`
- `Content-Type` 是 `text/plain;charset=UTF-8`（不是 `application/json`）

### 4.4 上传协议选择

`ApplyUploadInner` 返回的 `SDKParam` 指示客户端行为：

| 参数 | 值 | 含义 |
|------|-----|------|
| `enable_omit_initupload` | 1 | 跳过 init 阶段，使用预分配 UploadID |
| `enable_post_method` | 0 | 上传使用 POST（v1 协议），不是 PUT |
| `slice_size` | 1024 | 分片大小 1MB（单位 KB） |

上传协议为 `/upload/v1/` POST 协议：

```
# transfer 阶段
POST /upload/v1/{storeUri}?uploadid={UploadID}&part_number=1&phase=transfer
Content-Type: application/octet-stream
Content-CRC32: {hex_crc32}
Body: 文件二进制

# finish 阶段（单 chunk）
POST /upload/v1/{storeUri}?uploadid={UploadID}&phase=finish
Content-Type: text/plain
Body: "1:{server_returned_crc32}"

# finish 阶段（多 chunk）★ 必须用逗号分隔，不是换行！
Body: "1:{crc32_1},2:{crc32_2},3:{crc32_3}"
```

### 4.5 SecurityKeys 加载注意事项

`localStorage` 中 `s_sdk_sign_data_key` 有两个变体：

| 键名 | 用途 | ticket 格式 | ts_sign 格式 |
|------|------|------------|-------------|
| `s_sdk_sign_data_key/web_protect` | ✅ bd-ticket-guard 签名 | `hash.{base64}` | `ts.2.{hex}` |
| `s_sdk_sign_data_key/token` | ❌ 不用于此场景 | `{base64}` | `#{base64}` |

**必须读取 `/web_protect` 版本**，否则 `compute_ticket_guard` 会因非 hex 格式崩溃。

---

## 五、踩坑经验与解决方案汇总

### 5.1 CommitUploadInner 30515 "payload not found"

**现象**：上传成功（transfer + finish 均返回 2000），但 CommitUploadInner 返回 `CodeN=30515, Message="payload not found error"`。

**根因**：CommitUploadInner 必须用 **POST 方法**，`SessionKey` 和 `Functions` 放在 JSON body 中。使用 GET + query string 参数虽然签名通过（返回 200），但服务端无法解析 SessionKey。

**排查过程**：
1. 最初用 GET 方法，SessionKey 在 URL query string → 30515
2. 尝试不同的 URL 编码方式 → 仍然 30515
3. 尝试 PUT 直传 vs `/upload/v1/` 协议 → 仍然 30515
4. 用无头浏览器捕获真实请求 → 发现是 **POST + JSON body**
5. 改为 POST 后，`Functions` 用 `json.dumps` 字符串 → 30402 "cannot unmarshal string into []ds.Function"
6. `Functions` 改为直接 JSON 数组 → **成功**

**教训**：ByteDance VOD API 文档不公开，必须通过浏览器抓包验证。GET 和 POST 的行为差异不在错误信息中体现。

### 5.2 finish 阶段 4019 "Mismatch Part List"

**现象**：`/upload/v1/` 协议的 finish 阶段返回 `code=4019, message="Mismatch Part List"`。

**根因**：
- **单 chunk**：body 为 `1:{crc32}`（换行也行）→ 可以成功
- **多 chunk**：body 必须用**逗号分隔**，如 `1:{crc32_1},2:{crc32_2},3:{crc32_3}`
- 用 `\n` 或 `\r\n` 分隔多 chunk 都会返回 4019

**关键**：
- crc32 值使用**服务端返回的** `data.crc32`，不是客户端计算的
- partNumber 从 1 开始（不是 0）
- 多 chunk 分隔符是**逗号**（`,`），不是换行（`\n`）

### 5.3 SecurityKeys 读取错误的 sign 数据

**现象**：`compute_ticket_guard` 在 `bytes.fromhex(ts_hex)` 处崩溃，因为 ts_sign 不是 hex 格式。

**根因**：`s_sdk_sign_data_key` 有两个 localStorage 条目（`/web_protect` 和 `/token`），循环时后者覆盖前者。`/token` 的 ts_sign 是 base64 格式，不兼容。

**修复**：匹配条件加 `and "web_protect" in name`。

### 5.4 Cookie 过期 / "用户未登录"

**现象**：`create_v2` 返回 `status_code=8, status_msg="用户未登录"`。

**原因**：抖音 Cookie 有效期约 2-4 小时，过期后需要重新扫码登录。

**处理**：
- 运行 `python3 douyin_login.py` 重新扫码
- 存储状态文件 `douyin_storage_state.json` 自动更新
- 建议：在批量发布脚本中加入 Cookie 有效性检查

### 5.5 create_v2 返回 403 空响应

**现象**：`create_v2` 返回 HTTP 403 且响应体为空。

**原因**：缺少 `bd-ticket-guard-*` 安全头或 `msToken` / `x-secsdk-csrf-token`。

**修复**：确保请求包含：
- 5 个 `bd-ticket-guard-*` 头（ECDH + HMAC 计算）
- `msToken` query 参数
- `x-secsdk-csrf-token` 头（格式 `000100000001{passport_csrf_token[:32]}`）

### 5.6 账号级限制 "视频投稿功能已封禁"

**现象**：`create_v2` 返回 `status_code=-20, status_msg="视频投稿功能已封禁"`。

**原因**：抖音账号被平台封禁投稿功能，与 API 无关。

**处理**：检查抖音 APP 的 消息 → 系统通知 查看原因和解封时间；或换号发布。

### 5.7 httpx vs requests 的 URL 编码差异

**现象**：用 `httpx` 的 `params=dict` 参数时，URL 编码可能与 AWS4 签名不一致。

**解决**：手动构建 query string（`"&".join(f"{k}={v}" for k, v in sorted(...))`），直接拼接到 URL 中（`f"{VOD_HOST}/?{qs}"`），不依赖 HTTP 库的 params 编码。

---

## 六、关键数据结构

### 6.1 ApplyUploadInner 返回结构

```json
{
  "Result": {
    "UploadAddress": null,
    "InnerUploadAddress": {
      "UploadNodes": [{
        "Vid": "v0300fg10000...",
        "UploadHost": "tos-nc2-slb1.douyin.com",
        "SessionKey": "eyJhY2NvdW50VH...(base64 JSON)",
        "StoreInfos": [{
          "StoreUri": "tos-cn-v-0015c005/oXXXXXX",
          "Auth": "SpaceKey/aweme/0/:version:v2:eyJhb...(JWT)",
          "UploadID": "48f691646e17421fba96aaf4cb5d877a"
        }]
      }]
    },
    "SDKParam": { "enable_omit_initupload": 1, "enable_post_method": 0, ... }
  }
}
```

- `UploadAddress` 在 `IsInner=1` 时为 `null`，只有 `InnerUploadAddress`
- `UploadID` 是预分配的，transfer 阶段直接使用
- `SessionKey` 是 base64 编码的 JSON，包含 `extra`（含上传参数）、`token`（嵌套 JWT）、`metaConfig` 等

### 6.2 SessionKey 解码后结构

```json
{
  "accountType": "space",
  "extra": "edge_node=hl&file_size=3033345.000000&host=tos-d-x-hl.douyin.com&...",
  "fileType": "video",
  "metaConfig": "{\"accurate\":false,\"need_poster\":true,...}",
  "token": "eyJob3N0Ijoi...(嵌套 JWT)"
}
```

### 6.3 create_v2 请求体结构

```json
{
  "item": {
    "common": {
      "text": "标题 #话题",
      "caption": "标题 #话题",
      "visibility_type": 0,
      "creation_id": "{random}{timestamp}",
      "media_type": 4,
      "video_id": "v0300fg10000...",
      "download": 1,
      "timing": 0
    },
    "cover": {
      "poster": "",
      "poster_delay": 0
    }
  }
}
```

---

## 七、未来变数与应对

### 7.1 可能的变化

| 变化 | 影响 | 应对 |
|------|------|------|
| bd-ticket-guard 签名算法升级 | create_v2 返回 403/空响应 | 用无头浏览器抓包分析新算法 |
| CommitUploadInner 参数变化 | 30515 或新错误码 | 抓包对比浏览器请求 |
| Cookie 验证加强 | 登录频率增加 | 考虑 refresh token 机制 |
| /upload/v1/ 协议变更 | 上传失败 | 查看 SDKParam 参数适配 |
| VOD API 版本升级（当前 2020-11-19） | API 不兼容 | 抓包获取新版本号 |
| 创作者中心 URL/域名变更 | 请求 404 | 更新 BASE URL |
| msToken 生成方式变化 | 签名失败 | 研究新的 token 生成逻辑 |

### 7.2 万推/推兔的参考价值

通过逆向万推（推兔.app）发现：
- **B 站 / 视频号**：推兔用 HTTP API 直传（preupload 分片、finder-assistant 分片）
- **抖音 / 快手 / 小红书**：推兔用 **webview + 页面内注入自动化**，不是纯 API
- 这意味着抖音纯 API 方案是**更深层的逆向**，需持续维护

### 7.3 降级策略

当纯 API 方案失效时，按以下优先级降级：

1. **无头 Playwright**：`headless=True`，命令行操作、无可见窗口
2. **有头 Playwright**：弹出浏览器窗口，人工辅助
3. **抖音开放平台 OAuth**：需企业资质，但最稳定
4. **手动上传**：使用脚本生成的标题/描述，手动在创作者中心发布

---

## 八、调试方法

### 8.1 用无头浏览器捕获真实请求

当 API 行为不确定时，用 headless Playwright 上传一个视频并监听所有网络请求：

```python
async def on_request(req):
    if "CommitUploadInner" in req.url or "upload/v1" in req.url:
        print(f"[REQ] {req.method} {req.url[:150]}")
        print(f"  body: {req.post_data[:300] if req.post_data else 'None'}")
        print(f"  headers: {dict(req.headers)}")

page.on("request", on_request)
```

### 8.2 解码 SessionKey

```python
import base64, json
sk = "eyJhY2NvdW50VHlwZSI6..."
pad = sk + "=" * (4 - len(sk) % 4) if len(sk) % 4 else sk
print(json.dumps(json.loads(base64.b64decode(pad)), indent=2, ensure_ascii=False))
```

### 8.3 验证 Cookie 有效性

```python
resp = requests.get("https://creator.douyin.com/web/api/media/user/info/",
    headers={"Cookie": cookie_str, "User-Agent": UA})
data = resp.json()
print(f"有效: {data.get('status_code') == 0}, 用户: {data.get('user_info',{}).get('nickname')}")
```

---

## 九、相关文件

| 文件 | 说明 |
|------|------|
| `脚本/douyin_pure_api.py` | **主脚本**：纯 API 视频上传+发布（v2.0） |
| `脚本/douyin_login.py` | Playwright 扫码登录，生成 storage_state.json |
| `脚本/douyin_storage_state.json` | Cookie + localStorage 安全密钥存储 |
| `脚本/douyin_batch_publish.py` | 旧版批量发布脚本（OAuth 方式） |
| `参考资料/抖音开放平台_登录与发布流程.md` | 开放平台 OAuth 方式文档 |
| `参考资料/抖音纯API发布流程图.png` | 完整 6 步流程图 |

---

## 十、与其他平台的通用模式

本方案揭示的 ByteDance 平台上传模式可推广：

| 步骤 | 抖音 | 西瓜视频 | 头条号 | 通用模式 |
|------|------|----------|--------|----------|
| 认证 | Cookie + bd-ticket-guard | Cookie + bd-ticket-guard | Cookie + bd-ticket-guard | Playwright 登录获取 |
| 上传申请 | ApplyUploadInner | ApplyUploadInner | ApplyUploadInner | VOD API + AWS4 签名 |
| 文件上传 | /upload/v1/ POST | /upload/v1/ POST | /upload/v1/ POST | TOS 分片上传 |
| 提交上传 | CommitUploadInner POST | CommitUploadInner POST | CommitUploadInner POST | VOD API + POST body |
| 发布 | create_v2 | 各自创建接口 | 各自创建接口 | bd-ticket-guard 签名 |

所有字节系平台（抖音、西瓜、头条）共用同一套 VOD 上传基础设施，区别主要在最终的发布接口（create_v2 等）和 `SpaceName`。
