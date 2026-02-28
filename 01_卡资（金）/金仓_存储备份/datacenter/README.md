# datacenter 分组

> **约定**：所有**数据库相关**的 Docker 项目统一放在 **datacenter** 分组下，不在 website 或其他编排中新建数据库服务。卡若AI Skill（本地项目启动、群晖NAS 等）均按此执行。

---

## 分组说明

| 项目 | 说明 |
|:---|:---|
| **Docker 项目名** | `datacenter`（`docker compose -p datacenter`） |
| **网络名** | `datacenter_network`（应用通过此网络连接数据库容器） |
| **编排文件** | 本目录 `docker-compose.yml`（或沿用 数据中台 系统基座 的编排，见下） |

---

## 当前服务（本分组内）

- **datacenter_mongodb**：MongoDB 6.0，端口 27017，数据目录见 compose 卷配置。
- **datacenter_mysql**：MariaDB 10.6（存客宝用），宿主机端口 **3307**，库名 `cunkebao`，数据目录 **`/Users/karuo/数据库/mysql/cunkebao`**。存客宝编排通过 `datacenter_network` 连接此容器，不再自建 MySQL。首次启动前请确保数据目录存在（`mkdir -p /Users/karuo/数据库/mysql/cunkebao`）；建表脚本若需从存客宝项目引入，见 compose 内 init 卷挂载路径（按本机 cunkebao_v3 位置调整）。
- 后续新增 Redis、向量库等数据库类服务时，一律加入本 compose，保持 `name: datacenter`、网络 `datacenter_network`。

---

## 启动方式

在**本目录**执行（卡若AI 仓库内）：

```bash
cd "01_卡资（金）/金仓_存储备份/datacenter"
docker compose -p datacenter up -d
```

若本机已在「数据中台 / 系统基座」下启动过 MongoDB，则网络 `datacenter_network` 已存在；website 编排中的服务通过 `networks: datacenter_network: external: true` 接入该网络，用容器名 `datacenter_mongodb` 连接。

---

## 与 website 的关系

- **website** 分组：网站类服务（神射手、玩值电竞 Web 等），不在此分组内建数据库。
- **datacenter** 分组：仅数据库及相关管理服务（MongoDB、mongo-express 等）。
- website 内服务通过加入外部网络 `datacenter_network` 访问 datacenter 内容器。

---

## 版本记录

| 日期 | 变更 |
|:---|:---|
| 2026-02-26 | 新建 datacenter 分组约定；Skill 与唯一MongoDB约定同步更新 |
| 2026-02-28 | 新增 datacenter_mysql（存客宝），端口 3307，数据目录 数据库/mysql/cunkebao |
