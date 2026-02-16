# 飞书妙记与 Soul 批量下载 · 命令行 API 优先（已整理）

**日期**：2026-02-16  
**归属**：水桥 · 智能纪要

## 经验摘要

- 飞书相关任务：**优先命令行 + API + TOKEN**，先查 references 与 00_账号与API，不额外打开网页。
- 飞书 TOKEN：应用凭证在智能纪要脚本内置（或 `FEISHU_APP_ID` / `FEISHU_APP_SECRET`）；用户 access_token 在 `00_账号与API索引.md` § 六。
- 妙记单条/批量：开放平台有 `GET /minutes/v1/minutes/{id}`、transcripts、speakers；**无妙记列表接口**，列表需 Cookie 或手动/控制台收集链接。
- Soul 全部视频文本「直到全部完成」：先拿到链接（Cookie 写 `cookie_minutes.txt` 或控制台脚本复制到 `urls_soul_party.txt`），再执行 `python3 run_soul_minutes_download_all.py`，用 API 批量下载至完成。

## 详细说明与一键命令

见：`运营中枢/参考资料/飞书任务_命令行与API优先_经验总结.md`

## 技能与入口

- 智能纪要 SKILL：`02_卡人（水）/_团队成员/水桥/智能纪要/SKILL.md`（已加「执行原则」）
- 交互流程：`卡若AI交互流程与强制执行条件.md` 已增加「有 API、有 TOKEN 则命令行优先、先查经验」
