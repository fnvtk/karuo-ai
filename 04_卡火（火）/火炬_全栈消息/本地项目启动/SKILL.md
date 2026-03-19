---
name: 本地项目启动
version: "1.0"
owner: 火炬
group: 火
triggers: 本地运行、启动玩值电竞、玩值电竞App、指定端口、项目端口、项目注册、运行项目、Docker部署、部署到Docker、docker部署、更新同步到Docker、同步到doc、Docker跑最新、更新同步、同步到Docker、本地最新
updated: "2026-02-26"
---

# 本地项目启动

按「项目与端口注册表」用**指定端口**启动本地项目，避免多项目都用 3000 冲突。涉及 **Docker 部署** 时须同时遵守「唯一 MongoDB」与「容器分组」约定（见下）。

---

## 触发条件

用户说以下关键词时激活：
- 本地运行、启动玩值电竞、玩值电竞App
- 指定端口、项目端口、项目注册、运行项目
- **Docker 部署**：Docker部署、部署到Docker、docker部署、部署到 doc 等
- **同步到 Docker**：更新同步到Docker、同步到 doc、Docker 跑最新、每次更新后运行 Docker 等

---

## Docker 部署约定（涉及 Docker 时必守）

凡涉及**部署到 Docker、Docker 相关**的操作，执行前必须确认并遵守：

1. **datacenter 分组（数据库）**
   - 所有**数据库相关** Docker 项目（MongoDB、Redis、MySQL、向量库等）一律归入 **datacenter** 分组。
   - 编排位置：卡若AI `01_卡资（金）/金仓_存储备份/datacenter/docker-compose.yml`（project name: datacenter）；网络名 **datacenter_network**。
   - 全机只使用一个 MongoDB 实例：**datacenter_mongodb**（宿主机端口 **27017**），不在 website 或其他编排中新建 mongodb 服务。
   - 详见：`运营中枢/工作台/唯一MongoDB约定.md` 与 金仓 `datacenter/README.md`。

2. **website 分组（网站）**
   - 网站类服务（玩值电竞 web、神射手、卡若ai网站、玩值大屏、Soul 创业实验等）归入 **website** 编排，不单独为某站新建独立 MongoDB；各站 compose 均设 **`name: website`**，在 Docker Desktop 中统一显示为 website 分组。
   - 编排位置：神射手目录 `docker-compose.yml`（主站）；**全量 website 项目**见工作台 **`website分组清单.md`**；端口以 **《项目与端口注册表》** 为准。
   - website 内服务通过外部网络 **datacenter_network** 连接 datacenter 内数据库，例如 **`MONGODB_URI=mongodb://datacenter_mongodb:27017`**。

执行 Docker 部署或修改 compose 时，先对照上述两条检查，不符合则修正后再部署。

3. **本地与 Docker 同步（特别注意）**
   - **每次本地更新了代码/内容后**，要让 Docker 里跑的是**当前本地最新文件**，部署/运行时必须**带 `--build`** 重新构建镜像再启动，否则容器内仍是旧镜像。
   - 命令形式：在对应编排目录执行 **`docker compose up -d --build`**（例如 website 在神射手目录）。
   - **所有项目一律如此**：只要涉及「更新后部署到 Docker」「在 Docker 上运行」，一律用 `--build` 保证容器内是本地最新更改。

---

## 注册表位置（唯一数据源）

**路径**：`运营中枢/工作台/项目与端口注册表.md`

表内字段：项目名、项目路径、端口、启动命令。新增/改项目只改该表并让项目 dev 脚本带 `-p 端口`（或等价配置）。

---

## 执行步骤

### 1. 读注册表
- 打开 `运营中枢/工作台/项目与端口注册表.md`
- 按用户说的项目名（如「玩值电竞」「玩值电竞App」）找到对应行，得到：**项目路径**、**端口**、**启动命令**

### 2. 启动项目
- **玩值电竞网站**：一律用 **Docker**，不用 pnpm dev。在神射手目录执行 `docker compose up -d --build`，访问 http://localhost:3001。若 Docker 未就绪，先启动 Docker Desktop，就绪后再执行上述命令。
- **其他项目**：在项目路径下执行启动命令（端口已在各项目自己的 dev 脚本里固定，无需再传）；后台运行：`cd "<项目路径>" && <启动命令>`，并说明「已用端口 xxx 启动，访问 http://localhost:xxx」。

### 3. 未在表中的项目
- 告知「该项目尚未注册」；若要注册：在注册表加一行，并在该项目里把 dev 改为固定端口（如 Next.js：`next dev -p 3001`），再执行启动。

### 4. 若为 Docker 部署
- 先读 **《Docker 部署约定》**（本节上文）：确认数据库类服务归入 **datacenter** 分组、网站类归入 **website**，且 website 通过 datacenter_network 连接 datacenter_mongodb。
- **本地与 Docker 同步**：每次本地有代码/内容更新后，要让 Docker 跑最新必须带 **`--build`**。执行：在神射手目录 **`docker compose up -d --build`**（玩值电竞等 website 项目）；其他编排同理，一律用 `up -d --build` 保证容器内是本地最新。
- 再按注册表与项目内 docker/README 执行；若需先起数据库，在卡若AI 金仓 `datacenter` 目录执行 `docker compose -p datacenter up -d`。

---

## 一键命令示例（玩值电竞网站 → 仅用 Docker）

```bash
cd "/Users/karuo/Documents/开发/2、私域银行/神射手" && docker compose up -d --build
```

- 玩值电竞网站**不用 pnpm dev**，一律在神射手目录用 Docker 启动；访问：http://localhost:3001
- **不要在玩值电竞App 目录执行 docker compose up**，玩值已并入 website 编排，仅神射手目录起一份，避免重复
- 若仅需本机开发调试（非对外访问），可在玩值电竞App 目录 `pnpm dev`，但对外/正式访问以 Docker 为准

---

## 输出格式

```
[本地项目启动] 执行完成
├─ 项目：玩值电竞App
├─ 端口：3001
├─ 本地：http://localhost:3001
└─ 已后台启动，修改代码会自动热更新
```

**玩值电竞App 部署/运行/访问时**：若用户问的是玩值电竞的**部署、运行、访问**（含 Docker、数据库、启动），回复**须以卡若复盘格式收尾**：
- 目标·结果·达成率（一行，≤30 字）
- 过程（可选）
- 下一步（结合本次与项目目标）
详见 `运营中枢/参考资料/卡若复盘格式_固定规则.md`。

---

## 安全原则

- 不修改注册表以外的系统或项目配置，除非用户明确要求新增/改绑定
- 启动前不安装依赖（用户若需要可先说「安装依赖再启动」）

---

## 版本记录

| 日期 | 版本 | 变更 |
|:---|:---|:---|
| 2026-02-26 | 1.0 | 初始版本；玩值电竞App 绑定 3001，注册表 + Skill 联动 |
| 2026-02-26 | 1.1 | 新增 Docker 部署约定：唯一 MongoDB + 容器分组；触发词增加 Docker部署、部署到Docker |
| 2026-02-26 | 1.2 | 新增 datacenter 分组：所有数据库相关 Docker 归入 datacenter，website 通过 datacenter_network 连接；Skill 与唯一MongoDB约定同步 |
| 2026-02-26 | 1.3 | 新增「本地与 Docker 同步」：每次更新后部署须带 --build，Docker 跑本地最新；所有项目一致 |
