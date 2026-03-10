---
name: 小红书发布
description: >
  逆向小红书创作者中心内部 API 发布视频笔记（不打开浏览器）。Cookie 认证 → 获取上传 token →
  上传视频/封面到 CDN → 创建视频笔记。封面自动取视频第一帧。
triggers: 小红书发布、发布到小红书、小红书登录、小红书上传、RED发布
owner: 木叶
group: 木
version: "2.0"
updated: "2026-03-10"
---

# 小红书发布 Skill（v2.0）

> **核心能力**：Playwright headless 自动化小红书创作者中心（creator.xiaohongshu.com）。
> **定时发布**：Playwright UI「定时发布」（当前降级为立即发布，待优化 datepicker）。
> **去重**：基于 publish_log.json，同一视频不重复发。
> **119 场实测**：14/14 全部成功（含去重跳过 1 条），Cookie 有效期 ~12 个月。
> **注意**：标题限 20 字，正文无限制。

---

## 一、逆向 API 流程（3 步）

```
[Step 1] Cookie 认证
  Playwright 登录 → xiaohongshu_storage_state.json
  登录地址: https://creator.xiaohongshu.com/login
  关键 Cookie: web_session, a1

[Step 2] 上传视频 + 封面
  POST /api/media/v1/upload/web/token     → 上传凭证
  POST /api/media/v1/upload/web/video     → 上传视频
  POST /api/media/v1/upload/web/image     → 上传封面（第一帧）

[Step 3] 创建视频笔记
  POST /api/galaxy/creator/note/publish
  body: {title, desc, video_id, cover, topics}
```

---

## 二、一键命令

```bash
cd /Users/karuo/Documents/个人/卡若AI/03_卡木（木）/木叶_视频内容/小红书发布/脚本

# 1. 首次或 Cookie 过期：登录
python3 xiaohongshu_login.py

# 2. 批量发布
python3 xiaohongshu_publish.py
```

---

## 三、Cookie 有效期与注意事项

| Cookie | 有效期 | 说明 |
|--------|--------|------|
| web_session | ~1-3 天 | 主要认证，过期需重新登录 |
| a1 | ~30 天 | 设备标识 |

**小红书限制**：
- 图片最多 18 张（视频不受此限制）
- 标题最多 20 字
- 话题最多 5 个
- 发布频率建议间隔 8 秒以上

---

## 四、相关文件

| 文件 | 说明 |
|------|------|
| `脚本/xiaohongshu_publish.py` | **主脚本**：逆向 API 视频上传+发布 |
| `脚本/xiaohongshu_login.py` | Playwright 登录 |
| `脚本/xiaohongshu_storage_state.json` | Cookie 存储（生成后自动创建） |
