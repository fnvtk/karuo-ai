---
name: 快手发布
description: >
  逆向快手创作者服务平台内部 API 发布视频（不打开浏览器）。Cookie 认证 → 获取上传 token →
  上传视频/封面 → 发布作品。封面自动取视频第一帧。
triggers: 快手发布、发布到快手、快手登录、快手上传、kuaishou发布
owner: 木叶
group: 木
version: "2.0"
updated: "2026-03-10"
---

# 快手发布 Skill（v2.0）

> **核心能力**：Playwright headless 自动化快手创作者中心（cp.kuaishou.com）。
> **定时发布**：Playwright UI 交互设置「定时发布」，成功率高。
> **去重**：基于 publish_log.json，同一视频不重复发。
> **119 场实测**：12/12 成功（含重试 3 条「未找到上传控件」→ 重试全过）。

---

## 一、逆向 API 流程（3 步）

```
[Step 1] Cookie 认证
  Playwright 快手扫码 → kuaishou_storage_state.json
  登录地址: https://cp.kuaishou.com/article/publish/video
  关键 Cookie: kuaishou.server.web_st, kuaishou.server.web_ph

[Step 2] 上传视频 + 封面
  POST /rest/cp/creator/media/pc/upload/token  → 上传凭证
  POST /rest/cp/creator/media/pc/upload/video  → 上传视频
  POST /rest/cp/creator/media/pc/upload/image  → 上传封面

[Step 3] 发布作品
  POST /rest/cp/creator/pc/publish/single
  body: {caption, videoId, cover, type, publishType}
```

---

## 二、一键命令

```bash
cd /Users/karuo/Documents/个人/卡若AI/03_卡木（木）/木叶_视频内容/快手发布/脚本

# 1. 首次或 Cookie 过期：快手扫码登录
python3 kuaishou_login.py

# 2. 批量发布
python3 kuaishou_publish.py
```

---

## 三、Cookie 有效期

| Cookie | 有效期 | 说明 |
|--------|--------|------|
| kuaishou.server.web_st | ~7-30 天 | 主认证 |
| kuaishou.server.web_ph | ~7-30 天 | 辅助认证 |

快手 Cookie 有效期中等，建议每周检查一次。

---

## 四、相关文件

| 文件 | 说明 |
|------|------|
| `脚本/kuaishou_publish.py` | **主脚本**：逆向 API 视频上传+发布 |
| `脚本/kuaishou_login.py` | Playwright 快手扫码登录 |
| `脚本/kuaishou_storage_state.json` | Cookie 存储（生成后自动创建） |
