---
name: 视频号发布
description: >
  纯 API 命令行方式发布视频到微信视频号（不打开浏览器）。通过逆向视频号助手的 finder-assistant
  腾讯云上传接口，实现 Cookie 认证 → applyuploaddfs → uploadpartdfs → completepartuploaddfs → 发布的完整链路。
triggers: 视频号发布、发布到视频号、视频号登录、视频号上传、微信视频号
owner: 木叶
group: 木
version: "1.0"
updated: "2026-03-10"
---

# 视频号发布 Skill（v1.0）

> **核心能力**：纯 Python 命令行，通过逆向视频号助手（finder-assistant）的腾讯云上传接口实现视频上传与发布。
> **认证方式**：Playwright 微信扫码登录获取 Cookie，之后全程 API 操作。
> **API 来源**：推兔（TuiTool）逆向分析，server.min.bin 中明确使用 finder-assistant 系列接口。

---

## 一、纯 API 完整流程（4 步）

```
[Step 1] Cookie 认证
  Playwright 微信扫码 → channels_storage_state.json
  登录地址: https://channels.weixin.qq.com/login

[Step 2] 申请上传 (applyuploaddfs)
  POST finder-assistant.mp.video.tencent-cloud.com/applyuploaddfs
  参数: fileName, fileSize, fileType
  返回: UploadID（分片标识）

[Step 3] 分片上传 (uploadpartdfs)
  POST /uploadpartdfs?PartNumber=N&UploadID=xxx
  body: 视频二进制分片

[Step 4] 完成上传 + 发布
  POST /completepartuploaddfs?UploadID=xxx
  POST /cgi-bin/mmfinderassistant-bin/helper/helper_video_publish
```

---

## 二、一键命令

```bash
cd /Users/karuo/Documents/个人/卡若AI/03_卡木（木）/木叶_视频内容/视频号发布/脚本

# 1. 首次或 Cookie 过期：微信扫码登录
python3 channels_login.py

# 2. 批量发布
python3 channels_publish.py
```

---

## 三、Cookie 有效期

| Cookie | 有效期 | 说明 |
|--------|--------|------|
| 视频号助手 session | ~24-48h | 过期需重新微信扫码 |

视频号 Cookie 有效期较短，建议每天使用前检查。

---

## 四、推兔实现参考

推兔 server.min.bin 中的视频号上传链路：
- `applyuploaddfs`（申请上传）
- `uploadpartdfs?PartNumber=&UploadID=`（分片）
- `completepartuploaddfs?UploadID=`（完成）

与官方"视频号助手"上传链路一致，属于腾讯内部接口。

---

## 五、相关文件

| 文件 | 说明 |
|------|------|
| `脚本/channels_publish.py` | **主脚本**：纯 API 视频上传+发布 |
| `脚本/channels_login.py` | Playwright 微信扫码登录 |
| `脚本/channels_storage_state.json` | Cookie 存储（生成后自动创建） |
