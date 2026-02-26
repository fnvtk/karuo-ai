# 唯一 MongoDB 约定

> **强制**：全机只使用**一个** MongoDB 实例，不新建多余 MongoDB 容器。所有网站、玩值电竞等应用的库均存放在该唯一实例中。

---

## 容器分组约定（必守）

| 分组 | 用途 | 编排位置 |
|:---|:---|:---|
| **datacenter** | 所有**数据库相关** Docker 服务（MongoDB、Redis、MySQL、向量库等） | 卡若AI `01_卡资（金）/金仓_存储备份/datacenter/docker-compose.yml`，或 数据中台 系统基座 |
| **website** | 网站类服务（神射手、玩值电竞 Web 等），不在此分组内建数据库 | 神射手目录 `docker-compose.yml`（project name: website） |

以后新增数据库类服务一律放入 **datacenter** 分组；新增网站类服务放入 **website** 分组，通过外部网络 `datacenter_network` 连接 datacenter 内容器。

---

## 唯一实例

| 项目 | 说明 |
|:---|:---|
| **容器名** | `datacenter_mongodb` |
| **镜像** | mongo:6.0 |
| **宿主机端口** | **27017** |
| **所属分组** | **datacenter**（见上表） |
| **编排位置** | 卡若AI `金仓_存储备份/datacenter/docker-compose.yml`；或 数据中台 `系统基座/config/docker-compose-mongodb.yml` |
| **网络** | `datacenter_network`（website 内服务通过此网络连接） |
| **数据目录** | 宿主机 `/Users/karuo/数据库/mongodb/data`（见 compose 卷配置） |

---

## 库与用途

所有业务库只建在上述唯一 MongoDB 内，例如：

| 库名 | 用途 |
|:---|:---|
| **KR / KR_*** | 神射手 用户资产、估值等 |
| **wanzhi_esports** | 玩值电竞 App（网站、API） |
| 其他业务库 | 按需在该实例下新建，不另起 MongoDB 容器 |

---

## 网站服务连接方式

- **website 编排**（神射手目录 `docker-compose.yml`）：神射手、玩值电竞 Web 等通过加入外部网络 **`datacenter_network`** 连接唯一 MongoDB。
- **连接串**：无认证时 `mongodb://datacenter_mongodb:27017`；**有认证时**（推荐）`mongodb://admin:admin123@datacenter_mongodb:27017/?authSource=admin`，账号密码见《00_账号与API索引》二、本机 MongoDB。
- 不在 website 或其它应用编排中新建 mongodb 服务。

---

## 版本记录

| 日期 | 变更 |
|:---|:---|
| 2026-02-26 | 初始约定；website 仅含 shensheshou + wanzhi-web，统一连 datacenter_mongodb 27017 |
| 2026-02-26 | 新增 datacenter 分组约定；所有数据库相关 Docker 项目归入 datacenter，website 通过 datacenter_network 连接 |
