# 唯一 MongoDB 约定

> **强制**：全机只使用**一个** MongoDB 实例，不新建多余 MongoDB 容器。所有网站、玩值电竞、卡若ai网站等应用的库均存放在该唯一实例中。  
> **卡若AI 执行时必须遵守**：新生成的数据、配置、业务库**一律只放在该唯一 MongoDB**，不新建实例、不单独起 27018 等端口；涉及官网/控制台/网站项目时，先读本文再落库。

---

## 容器分组约定（必守）

| 分组 | 用途 | 编排位置 |
|:---|:---|:---|
| **datacenter** | 所有**数据库相关** Docker 服务（MongoDB、Redis、MySQL、向量库等） | 卡若AI `01_卡资（金）/金仓_存储备份/datacenter/docker-compose.yml`，或 数据中台 系统基座 |
| **website** | 网站类服务（神射手、玩值电竞 Web、卡若ai网站、玩值大屏、Soul 创业实验等），不在此分组内建数据库 | 神射手目录 `docker-compose.yml`（主站）；其余见 **`website分组清单.md`** |

以后新增数据库类服务一律放入 **datacenter** 分组；新增网站类服务放入 **website** 分组（各 compose 设 `name: website`），通过外部网络 `datacenter_network` 连接 datacenter 内容器。**全量 website 项目列表**见工作台 **`website分组清单.md`**。

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
| **karuo_site** | 卡若ai网站（官网与控制台全量数据）；**卡若 AI 主库**：记忆条目、**对话记录**、**消息内容**（聊天记录一律存此库、实时调用；MongoDB 不可用时记忆降级 记忆.md、聊天降级 fallback/recent_chats_fallback.json） |
| 其他业务库 | 按需在该实例下新建，不另起 MongoDB 容器 |

---

## 网站服务连接方式

- **website 编排**（神射手目录 `docker-compose.yml`）：神射手、玩值电竞 Web 等通过加入外部网络 **`datacenter_network`** 连接唯一 MongoDB。
- **连接串**：无认证时 `mongodb://datacenter_mongodb:27017`；**有认证时**（推荐）`mongodb://admin:admin123@datacenter_mongodb:27017/?authSource=admin`，账号密码见《00_账号与API索引》二、本机 MongoDB。
- 不在 website 或其它应用编排中新建 mongodb 服务。

---

## 数据恢复与正确挂载（必读）

**唯一数据目录**：宿主机 `/Users/karuo/数据库/mongodb/data`（约 225GB）。数据必须通过**宿主机路径挂载**，不能改用 Docker 命名卷，否则会看到“空库”。

**正确启动方式**（恢复或日常启动）：

```bash
cd "/Users/karuo/Documents/开发/2、私域银行/数据中台/系统基座/config"
docker compose -f docker-compose-mongodb.yml up -d mongodb
```

**错误原因说明**：若用其他编排或 `docker run` 启动了同名容器且未挂载上述路径，而是用了 Docker 卷（如 `mongodb_data`），则容器内是空库，宿主机上的 200+GB 数据不会出现在库里。**务必只用数据中台这份 compose 起 datacenter_mongodb**。

**验证数据已挂载**：`docker inspect datacenter_mongodb` 中应看到 `"/Users/karuo/数据库/mongodb/data" -> "/data/db"`。

---

## 版本记录

| 日期 | 变更 |
|:---|:---|
| 2026-02-26 | 初始约定；website 仅含 shensheshou + wanzhi-web，统一连 datacenter_mongodb 27017 |
| 2026-02-26 | 新增 datacenter 分组约定；所有数据库相关 Docker 项目归入 datacenter，website 通过 datacenter_network 连接 |
| 2026-02-27 | website 分组扩展：卡若ai网站、玩值大屏、Soul 创业实验归入 website；详见 `website分组清单.md` |
| 2026-03-01 | 新增库 karuo_site；强制约定：新生成数据/配置一律只放唯一 MongoDB，不新建实例、不单独 27018 |
| 2026-03-19 | 恢复 225GB 数据：因容器曾用错误卷挂载导致“空库”；补充「数据恢复与正确挂载」说明，强制用数据中台 compose 启动 |
