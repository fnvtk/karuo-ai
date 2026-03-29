# 双 NAS 区分：公司 CKB vs 家里 Station（防选错）

> **用途**：明确区分公司 NAS（存客宝/CKB）与家里 NAS（Station），记录各自的 IP、域名、访问环境，以及针对不同 NAS 的命令用法，防止选错目标。  
> **总索引**：`卡若AI_NAS与关联主机矩阵.md`（NAS + frp 关联电脑端口 + Agent 边界）。  
> **维护**：金仓 | 2026-02-06

---

## 一、两套 NAS 总览

| 项目 | 公司 NAS（CKB / 存客宝） | 家里 NAS（Station） |
|:-----|:-------------------------|:--------------------|
| **场景** | 公司局域网、外网访问 | 家庭局域网，**家里优先访问** |
| **用途** | 存客宝、卡若AI 网关、MongoDB、Qdrant、宝塔中控等 | 家庭存储、DiskStation |
| **内网 IP** | 192.168.1.201 | **192.168.110.29** |
| **外网域名** | **open.quwanzhi.com** | **opennas2.quwanzhi.com** |
| **DSM 端口** | 5000 | 5000 |
| **DSM 内网访问** | http://192.168.1.201:5000 | **http://192.168.110.29:5000** |
| **卡若AI Executor** | 8081（公司/外网） | （家里 NAS 未部署卡若AI 时无） |
| **Git 仓库（卡若AI）** | 见下方「CKB NAS Git」 | 家里 Station 无 |

### 1.1 CKB NAS Git（卡若AI，用外网域名管理，只传 NAS）

| 项目 | 说明 |
|:-----|:-----|
| **Git 地址（open.quwanzhi.com）** | **ssh://fnvtk@open.quwanzhi.com:22201/volume1/git/github/fnvtk/karuo-ai.git** |
| **类 GitHub 网页访问（Gitea）** | **http://192.168.1.201:3000** 或 **http://open.quwanzhi.com:3000**（见 CKB_NAS_Gitea_类GitHub访问.md） |
| **同步** | 在卡若AI 根目录执行 `git push` 或 `scripts/push-to-ckb-nas.sh` |
| **详细说明** | `references/卡若AI同步到CKB_NAS_Git.md` |

---

## 二、家里 NAS（Station）信息记录

| 项 | 值 | 备注 |
|:---|:---|:-----|
| **内网 IP** | 192.168.110.29 | 家庭局域网 |
| **DSM 访问** | http://192.168.110.29:5000 | 登录页截图可见 |
| **品牌/型号** | Synology DiskStation | 登录界面显示 |
| **默认账号** | admin | 登录表单预填 |
| **外网域名** | **opennas2.quwanzhi.com** | frpc 内网穿透，经 **kr 宝塔 frps（43.139.27.93）** 中转（迁移与 DNS 见 `服务器管理/references/FRP与阿里云DNS统一至kr宝塔_迁移与验收.md`） |

> **防选错**：家里在 192.168.**110**.29，公司 CKB 在 192.168.**1**.201；网段不同，留意 110 vs 1。

### 2.1 当前资源状态（2026-02-14 更新）

| 资源 | 当前状态 | 备注 |
|:-----|:---------|:-----|
| **CPU 负载** | 1.6（已修复） | 之前异常 udevd 占 31% 已杀掉 |
| **RAM** | 67MB/497MB，342MB 可用 | 之前 udevd 吃 295MB 已修复 |
| **磁盘** | 4.6TB/5.4TB（84%），885GB 可用 | 清理 core dump 后恢复 |

### 2.2 家里 NAS 内网穿透（frpc → opennas2.quwanzhi.com）

| 项目 | 说明 |
|:-----|:-----|
| **frps 服务器** | **43.139.27.93:7000**（与 frpc 中 `server_addr` 一致；端口以实际 frps 配置为准） |
| **frpc 版本** | 0.51.3（ARM） |
| **frpc 路径** | `/volume1/homes/admin/frpc/` |
| **配置文件** | `/volume1/homes/admin/frpc/frpc.ini` |
| **自启方式** | crontab 每 5 分钟检活 |
| **切到 kr frps（存客宝 frps 已停后必做）** | 外网 **22202/5002** 会全断，须在**家庭内网**执行仓库脚本 **`群晖NAS管理/scripts/家里Station_frpc切kr_内网执行.sh`**（或手工改 `frpc.ini` 中 `server_addr = 43.139.27.93` 后跑 `start_frpc.sh`）。本机 SSH 可先用 **`ssh diskstation-home`**（`~/.ssh/config` 已配兼容算法）。 |

**端口映射表：**

| 服务 | NAS 本地端口 | 外网端口 | 外网地址 |
|:-----|:------------|:---------|:---------|
| **SSH** | 22 | **22202** | `ssh admin@opennas2.quwanzhi.com -p 22202` |
| **DSM HTTP** | 5000 | **5002** | http://opennas2.quwanzhi.com:5002 |
| **DSM HTTPS** | 5001 | **5003** | https://opennas2.quwanzhi.com:5003 |
| **Web HTTP** | 80 | **8002** | http://opennas2.quwanzhi.com:8002 |
| **Web HTTPS** | 443 | **4432** | https://opennas2.quwanzhi.com:4432 |
| **FTP** | 21 | **2102** | opennas2.quwanzhi.com:2102 |
| **SVN** | 3690 | **36902** | opennas2.quwanzhi.com:36902 |
| **rsync** | 873 | **8732** | opennas2.quwanzhi.com:8732 |
| **MariaDB** | 3306 | **33062** | opennas2.quwanzhi.com:33062 |
| **Telnet** | 23 | **2302** | opennas2.quwanzhi.com:2302 |
| **DSM（HTTP域名）** | 5000 | **80** | http://opennas2.quwanzhi.com |
| **SMB 文件共享** | 445 | **4452** | smb://opennas2.quwanzhi.com:4452/共享 |

> SMB 需在 frpc.ini 中手动添加 `[home-nas-smb]` 段，见 `家里DiskStation_外网挂载1TB到Finder侧栏.md`。

---

## 三、访问选择规则

| 你的位置 | 优先访问 | 说明 |
|:---------|:---------|:-----|
| **公司 / 公司局域网** | 公司 CKB NAS（192.168.1.201 / open.quwanzhi.com） | 存客宝、卡若AI 网关、飞书/企微回调、发消息等 |
| **家里 / 家庭局域网** | 家里 Station NAS（192.168.110.29） | 家庭存储、DSM 管理 |
| **外网** | 公司 CKB（open.quwanzhi.com）/ 家里（opennas2.quwanzhi.com） | 两台均经 frp 对外 |

---

## 四、针对不同 NAS 的命令

### 4.1 发消息给 NAS AI（仅公司 CKB 有）

发消息给「卡若AI」执行任务，**仅公司 CKB NAS** 部署了 Gateway + Executor，**家里 Station 没有**。

| 目标 | 命令 / 入口 |
|:-----|:------------|
| **公司 CKB** | `./send_message_to_nas.sh "你的指令"`（默认 open.quwanzhi.com）；或 `NAS_TARGET=ckb ./send_message_to_nas.sh "..."` |
| **家里 Station** | 暂无 AI 网关；DSM 内网 http://192.168.110.29:5000 / 外网 http://opennas2.quwanzhi.com:5002 |

### 4.2 DSM 管理

| 目标 | 操作 |
|:-----|:-----|
| **公司 CKB** | 浏览器打开 http://192.168.1.201:5000 |
| **家里 Station** | 浏览器打开 **http://192.168.110.29:5000** |

### 4.3 SSH（若已配置）

| 目标 | 示例 |
|:-----|:-----|
| **公司 CKB** | `ssh fnvtk@192.168.1.201` 或 `ssh fnvtk@open.quwanzhi.com`（若 22201 等已映射） |
| **家里 Station** | `ssh admin@192.168.110.29`（内网）或 `ssh -p 22202 admin@opennas2.quwanzhi.com`（外网） |

---

## 五、相关文档

- **类 GitHub 网页访问（Gitea）**：`references/CKB_NAS_Gitea_类GitHub访问.md` — 用 HTTP 像 GitHub 一样浏览仓库
- **NAS AI 应用与执行路线**：`references/NAS_AI应用与发送到NAS的执行路线.md` — 针对公司 CKB NAS 的发消息、执行流程
- **外网发消息与截图**：`references/外网向NAS发消息与界面截图说明.md` — 外网用 open.quwanzhi.com 发消息（公司 CKB）

---

*版本：v2.1 | 2026-03-30 — frps 真源与文档统一为 kr 宝塔 43.139.27.93；阿里云 A 记录需与 `FRP与阿里云DNS统一至kr宝塔_迁移与验收.md` 同步验收*
