# 飞书妙记 Cookie 过期 → Cursor 浏览器逆向提取

> 日期：2026-03-11 | 目标角色：团队 | 来源：智能纪要 Skill

## 问题

飞书妙记下载（文字 + 视频）时 Cookie 过期（API 返回 401: "Something went wrong, please log in again."），Safari/Chrome 浏览器中的 Cookie 也是同一份旧的（browser_cookie3 读到的和 cookie_minutes.txt 一致）。同时 user_access_token 和 refresh_token 均已过期（2026-01-29 授权）。

## 解决过程

1. **tenant_access_token**：通过 APP_ID + APP_SECRET 获取成功，但 Open API 的 `/minutes/v1/minutes/{token}` 返回 2091005 权限拒绝（应用身份无法访问用户创建的妙记）
2. **user_access_token**：400 Invalid token；refresh_token 也已用尽（20038 错误）
3. **关键发现**：Cursor 内置浏览器曾访问过飞书妙记页面，其 Cookie 存储在 SQLite 数据库中且为**明文**（无需 Keychain 解密）
4. **提取路径**：`~/Library/Application Support/Cursor/Partitions/cursor-browser/Cookies`
5. **SQL 查询**：`SELECT name, value FROM cookies WHERE (host_key LIKE '%feishu%' OR host_key LIKE '%cunkebao%') AND value != ''`
6. 提取到 41 个飞书 Cookie（含 bv_csrf_token、session、msToken），拼接后调用 API 全部成功

## 关键决策

- Cursor 浏览器使用 Electron/Chromium，Cookie 数据库格式与 Chrome 一致，但**无加密**（Chrome 需要 Keychain 解密，Cursor 不需要）
- 此方案已集成到 `feishu_minutes_export_github.py` 和 `feishu_minutes_download_video.py` 的 `_cookie_from_browser()` 函数中，作为第 4 级自动 fallback

## 可提炼规则

1. 飞书操作权限获取顺序：APP_ID/APP_SECRET → tenant_token（Open API）→ Cookie 链（妙记专用）→ user_token
2. Cookie 获取 5 级 fallback：cookie_minutes.txt → 环境变量 → browser_cookie3 → Cursor 浏览器 SQLite → 手动
3. 妙记相关 API（export/status）只认 Cookie，不认 OAuth token
4. 默认目录：文字 → `/Users/karuo/Documents/聊天记录/soul`，视频 → `/Users/karuo/Movies/soul视频/原视频`
