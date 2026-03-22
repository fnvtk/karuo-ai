---
name: kalu-party-soul-website-dev
description: >
  卡路创业派对 · 网站开发（永平仓库）。汇总 Cursor Agent「网站-*」：soul-api、soul-admin、miniprogram、
  用户管理、内容管理、数据统计、部署、GitHub、全站修复、超级个体与 CKB 等。
  当用户提到 永平、Soul网站、soul-api、管理端、soul-admin、小程序开发、用户管理、内容管理、
  全站修复、超级个体、链接人与事、部署 soul、github 上传网站 时激活。
---

# 卡路 · 网站开发（永平三端）

> **仓库根**：`/Users/karuo/Documents/开发/3、自营项目/一场soul的创业实验-永平`  
> **原则**：小程序只调 `/api/miniprogram/*`；管理端只调 `/api/admin/*`、`/api/db/*`。变更后过 `change-checklist`。

## 触发词

永平、Soul API、Soul 管理端、soul-admin、小程序、miniprogram、网站开发、用户管理、内容管理、  
数据统计、全站修复、超级个体、链接人与事、存客宝对接、部署、GitHub、devlop、三端联调

## 一、在永平仓库内必读 Skill（相对仓库根 `.cursor/skills/`）

| 场景 | 文件 |
|:---|:---|
| 后端 Go / Gin / GORM | `api-dev/SKILL.md` |
| 管理端 React / Vite | `admin-dev/SKILL.md` |
| 微信小程序 | `miniprogram-dev/SKILL.md` |
| 跨端需求 / 分工 | `role-flow-control/SKILL.md` |
| 改完自检 | `change-checklist/SKILL.md` |
| 运营报表 / 飞书派对收尾（若在永平触发） | `karuo-party/SKILL.md` |
| 服务器 / 宝塔 / SSH | `security-server-ops/SKILL.md` |
| MySQL 直连脚本 | `mysql-direct/SKILL.md` |
| 会议 / 散会文档 | `team-meeting/SKILL.md`、`assistant-doc-sync/SKILL.md` |

## 二、与 Cursor Agent「网站-*」对齐

| Agent 习惯名 | 主要目录 / 说明 |
|:---|:---|
| 网站-程序开发 / 网站-用户管理 / 网站-数据统计 | `soul-api/` + `soul-admin/` 对应页面 |
| 网站-内容管理 | `soul-admin/src/pages/content/ContentPage.tsx` + `soul-api` book/db |
| 网站-小程序 / 小程序上传 | `miniprogram/` + 提审清单 `开发文档/小程序提审自检清单_*.md` |
| 网站-上传到 GitHub | 永平仓库 git + 卡若侧 G02；注意 `devlop` 与远端同步策略 |
| 网站-部署 | `soul-api/master.py`、`soul-admin` 构建产物；见全站修复报告部署节 |
| 超级个体资料页 | `miniprogram/pages/member-detail/` + `soul-api` user/vip/person |

## 三、开发文档（永平）

| 类型 | 路径 |
|:---|:---|
| 需求（含已完成） | `开发文档/1、需求/` |
| 全站修复报告 | `开发文档/全站修复报告_20260321.md` |
| 提审自检 | `开发文档/小程序提审自检清单_20260321.md` |
| 飞书推送复盘（示例） | `开发文档/飞书推送_*.md` |

## 四、线上入口（验收 / 联调）

- 管理端：`https://souladmin.quwanzhi.com/`（路径见各 Route：`/content`、`/users`、`/dashboard` …）  
- API：`https://soulapi.quwanzhi.com/health`  
- C 端：微信小程序「**卡若创业派对**」

## 五、硬规则

- 编辑 **miniprogram/** → 遵守 `miniprogram-dev`；**soul-admin/** → `admin-dev`；**soul-api/** → `api-dev`。  
- **忽略** 永平 `.cursor/` 外无关全局规则（见 `soul-project-boundary.mdc`）。  
- 敏感配置不写进 Skill 正文。

## 六、与「玉宁运营」边界

- **不写书稿、不跑切片、不填运营报表** → 若用户同时要做，先拆给 `kalu-party-yuning-ops`。  
- **接口/字段/页面** 才在本 Skill 落地。
