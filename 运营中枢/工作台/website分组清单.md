# Docker website 分组清单

> 所有**对外提供 Web 页面的 Docker 项目**统一归入 **website** 分组，便于在 Docker Desktop 中归类查看、统一启动约定。
> 与「唯一 MongoDB 约定」中 website 分组一致；数据库类服务归 **datacenter**，不在此表。

---

## 分组约定

- **website**：网站类服务（前端/站点），不在此分组内建数据库；需连 MongoDB 时用唯一实例 `datacenter_mongodb`（宿主机 27017）。
- 各网站项目在各自 `docker-compose.yml` 中设置 **`name: website`**，这样在 Docker Desktop 中会显示在同一 **website** 项目下。

---

## 已归入 website 的项目

| 项目名 | 容器名 | 端口 | 编排位置 | 说明 |
|:---|:---|:--:|:---|:---|
| 神射手 | website-shensheshou | **3117** | `开发/2、私域银行/神射手/docker-compose.yml` | 与玩值电竞同文件启动 |
| 玩值电竞 Web | website-wanzhi-web | **3001** | 同上 | 同上 |
| 存客宝 Web | cunkebao-web | **3100** | `开发/2、私域银行/cunkebao_v3/docker-compose.yml` | 独立编排（不设 name: website）；同编排含触客宝+后端+MySQL+Redis |
| 触客宝 Web | touchkebao-web | **3101** | 同上 | 同上 |
| 卡若ai网站 | website-karuo-site | **3102** | `开发/3、自营项目/卡若ai网站/docker-compose.yml` | 独立编排，name: website（端口与存客宝错开，见端口登记） |
| 玩值大屏 | website-wz-screen | **3034** | `开发/3、自营项目/玩值大屏/docker-compose.yml` | 独立编排，name: website |
| Soul 创业实验 | website-soul-book | **3000** | `开发/3、自营项目/一场soul的创业实验-react/docker-compose.yml` | 独立编排，name: website（本地） |

---

## 统一启动方式

- **神射手 + 玩值电竞**（主站）：在神射手目录执行  
  `docker compose up -d` 或 `docker compose up -d --build`  
  两站会出现在 Docker Desktop 的 **website** 分组下。
- **存客宝 + 触客宝**：在存客宝项目目录执行  
  `cd 开发/2、私域银行/cunkebao_v3 && docker compose up -d`（或 `--build` 拉取最新）  
  存客宝 http://localhost:3100 、触客宝 http://localhost:3101 ；同编排内含后端 8082、MySQL 3307、Redis 6380。
- **其他网站**：在各自项目目录执行  
  `docker compose up -d`  
  因已设置 `name: website`，容器同样会归在 **website** 分组下。

---

## 不归入 website 的 Docker 项目

以下为**非纯网站**（含数据库/中台/工具），保持各自 project name，不设为 website：

| 类型 | 项目示例 | 分组/说明 |
|:---|:---|:---|
| 数据库/中间件 | datacenter（MongoDB 等）、上帝之眼（MySQL/Redis/InfluxDB） | datacenter 或独立项目名 |
| 工具/隧道 | frp、clawdbot、工作手机 SDK | 独立 compose |

**说明**：存客宝 cunkebao_v3 虽含后端+MySQL+Redis，**文档上归入 website 分类**（存客宝 Web 3100、触客宝 Web 3101）；编排独立（不设 name: website，避免与现有数据卷/容器冲突），仍在 `开发/2、私域银行/cunkebao_v3/docker-compose.yml`。

---

## 版本记录

| 日期 | 变更 |
|:---|:---|
| 2026-02-27 | 初版；列出神射手、玩值电竞、卡若ai网站、玩值大屏、Soul 创业实验；约定 name: website 统一归类 |
| 2026-02-28 | 存客宝 Web（3100）、触客宝 Web（3101）归入 website 分类（文档）；编排独立保留数据卷；卡若ai网站端口改为 3102 与存客宝错开；统一启动方式补充存客宝/触客宝 |
