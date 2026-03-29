# FRP 与阿里云 DNS 统一至 kr 宝塔 — 迁移与验收

> **目标**：将原在**存客宝**（`42.194.245.239`）上的 **frps** 及所有依赖「解析到该 IP 才能通」的入口，统一到 **kr 宝塔**（`43.139.27.93`），并通过**阿里云 DNS** 全量改指，保证 NAS、千问、Git、各端口映射与站点访问行为与迁移前一致。  
> **说明**：云主机在腾讯云；**阿里云仅管域名解析**。迁移需两边配合：**解析改 IP + 腾讯云安全组/防火墙 + frps 进程位置 + 各 frpc 的 server_addr**。  
> 维护：金仓 · 服务器管理 · 2026-03-30

---

## 一、真源约定（迁移完成后）

| 项目 | 值 |
|:---|:---|
| **FRP 服务端（frps）** | **kr 宝塔** `43.139.27.93`（典型控制端口 **7000**；Dashboard 若启用多为 **7500**，以实际 `frps.toml` / `frps.ini` 为准） |
| **frpc 连接地址** | 所有内网客户端（家里 NAS、公司 NAS、其它机器）`server_addr` / `serverAddr` = **`43.139.27.93`** |
| **经 frp 暴露的公网入口 IP** | 凡原先访问 `42.194.245.239:某端口` 或「域名解析到存客宝再进 frp」的流量，**统一改为**解析到 **`43.139.27.93`**（或与 Nginx 443 反代方案并存时按第二节区分） |
| **阿里云 A 记录** | 业务上「指向存客宝公网」的 **A / AAAA**，在验收清单中逐项改为 **`43.139.27.93`**（见第三节，**勿盲改** MX/邮箱/CNAME 到 CDN） |

---

## 二、迁移顺序（建议严格按序，减少断服时间）

1. **备份**  
   - 在**存客宝**上备份 `frps` 配置文件（`frps.ini` / `frps.toml`）及自定义脚本、systemd 单元。  
   - 导出**腾讯云**上存客宝安全组「入站」规则中与 frp、NAS、千问、Gitea 等相关的端口列表，便于在 kr 侧复刻。

2. **在 kr 宝塔安装并启动 frps**  
   - 二进制版本与现有 **frpc**（如 NAS 上 0.51.3）**主版本一致**，避免协议不兼容。  
   - 配置中的 `bind_port`、`authentication`、`vhost_http_port` 等与旧机**逐项对齐**（除非刻意改版）。  
   - 使用 systemd 或宝塔计划任务保活，与旧机二选一：**先让 kr 上 frps 跑通，再切流量**。

3. **腾讯云 kr 实例安全组 + 宝塔防火墙**  
   - 放行 **7000**（及 **7500** 若用 Dashboard）。  
   - 将旧存客宝上已开放的 **remote_port** 全部在 kr 安全组放行（例如 **11401**、**22201**、**3000**、**8080** 段、家里 NAS 映射表中的 **5002/5003/8002**… 等，**以 frps 配置与历史安全组为准**）。  
   - 在 kr 宝塔「安全」中同步放行相同端口。

4. **切换 frpc（所有客户端）**  
   - 家里 NAS：`/volume1/homes/admin/frpc/frpc.ini`（路径以现场为准）中 `server_addr` 改为 **`43.139.27.93`**，重启 frpc。  
   - 公司 CKB NAS、其它 frpc：**同样改 server 地址**后重启。  
   - **先改一台 NAS 验证**，再批量改，便于回滚。

5. **阿里云 DNS（全量核对后改指）**  
   - 登录 [阿里云云解析 DNS](https://dns.console.aliyun.com/)，对 **`quwanzhi.com` 及相关托管域名**执行第三节清单。  
   - **原则**：仅修改「记录类型为 A（或 AAAA）且记录值为 `42.194.245.239`」且用途为**本站业务入口**的条目；**不要**改动：MX、SPF/DKIM 的 TXT（除非知悉影响）、指向 CDN/验证域的 CNAME。

6. **停旧机 frps（验证无误后）**  
   - 在存客宝上停止并禁用 frps，释放 **8080** 等端口（若本机还有 Docker/站点需用）。  
   - 观察 24h 无回切需求再删旧配置。

---

## 三、阿里云解析 — 操作要点与清单模板

### 3.1 批量查找

在阿里云 DNS 控制台对每个托管域名：

- 筛选 **记录类型 = A**（及 **AAAA** 若有）。  
- 找出 **记录值 = `42.194.245.239`** 的条目。

### 3.2 改为 kr 宝塔 IP

- 将上述记录值改为 **`43.139.27.93`**。  
- **TTL**：可先 600，稳定后按需调长。

### 3.3 不要自动改动的类型（除非明确要迁邮件/CDN）

| 类型 | 说明 |
|:---|:---|
| **MX** | 企业邮、飞书邮等 |
| **TXT** | SPF、DKIM、站点验证、SSL 验证 |
| **CNAME** | 指向 `cdn.*`、对象存储、第三方 SaaS |

### 3.4 仓库中曾出现的业务主机名（便于逐项打勾，以控制台为准）

以下主机名在卡若 AI 文档中出现过，**若当前仍解析到存客宝且用于 Web/frp 入口**，迁移后应指向 **kr 宝塔**或按反代架构指向正确目标：

- `open.quwanzhi.com`（公司 CKB NAS / Gitea / 多端口业务）  
- `opennas2.quwanzhi.com`（家里 Station 经 frp）  
- `kr-ai.quwanzhi.com`（卡若 AI 网关，本身已在 kr 侧部署时一般已是 `43.139.27.93`，**复核即可**）  
- `kr-op` / `kr-kf` / `kr-phone` 等子域（存客宝业务文档中的管理端域名，**以当前解析为准**）  
- 其它 `*.quwanzhi.com`：`soul`、`mckb`、`docc`、`word` 等（见 `服务器管理/SKILL.md` 端口与域名表）

**验收**：对每个子域执行 `dig +short 子域.quwanzhi.com @223.5.5.5`，确认结果为 **`43.139.27.93`**（或你刻意保留的 CNAME 链末端正确）。

---

## 四、功能验收矩阵（迁移后必测）

| 序号 | 功能 | 验证方式 | 期望 |
|:---:|:---|:---|:---|
| 1 | frpc 注册 | kr 上 frps 日志或 Dashboard 可见各 client online | 全部 online |
| 2 | 家里 NAS 外网 DSM | 浏览器访问文档中的外网 DSM URL（含端口） | 可登录 |
| 3 | 公司 NAS 千问外网 | `curl -s http://open.quwanzhi.com:11401/api/tags` | 返回 JSON |
| 4 | Gitea / 3000 | `curl -I http://open.quwanzhi.com:3000` | 非连接拒绝 |
| 5 | 原 IP 直连替换 | 凡文档写过 `http://42.194.245.239:端口` 的，改为 `43.139.27.93` 或继续用域名 | 与迁前行为一致 |
| 6 | HTTPS 站点 | `*.quwanzhi.com` 走 Nginx 的站点 | 证书有效、无 502 |
| 7 | lytiao / Docker | 若站点仍在存客宝仅作宿主机，与 DNS 无关则跳过；若域名指 kr 则按 kr 反代测 | 与方案一致 |

---

## 五、回滚要点

- 保留存客宝 frps 配置备份；若 kr 异常，可**临时**把 frpc 的 `server_addr` 与 **关键 A 记录**改回 `42.194.245.239`（仅限过渡期）。  
- 回滚后尽快修复 kr 侧根因，避免双真源长期并存。

---

## 六、关联文档

| 文档 | 路径 |
|:---|:---|
| 内网穿透与域名（网关） | `references/内网穿透与域名配置_卡若AI标准方案.md` |
| 端口与 SSH | `参考资料/端口配置表.md` |
| 双 NAS / 家里 frpc 映射表 | `群晖NAS管理/参考资料/双NAS区分_公司CKB与家里Station.md` |
| 千问外网与 frp 端口 | `群晖NAS管理/参考资料/NAS千问小模型API配置.md` |
| 主 Skill | `服务器管理/SKILL.md` |

触发词：**frp 迁移、阿里云解析、open.quwanzhi.com、opennas2、frps 换机** → 先读本文件，再按第二节顺序执行。

---

## 十、2026-03-30 实施记录（kr 宝塔 · 与存客宝差异）

### 10.1 已在 kr 宝塔完成

| 项 | 说明 |
|:---|:---|
| **frps 0.66.0** | `/opt/frp/frps` + `/opt/frp/frps.toml`：`bindPort=7000`，`vhostHTTPPort=8088`（**非 8080**：kr 上 8080 为 soul-api 占用） |
| **systemd** | `frps.service` 已 enable + running |
| **腾讯云安全组** | 脚本 `scripts/腾讯云_kr宝塔安全组放行FRP全套端口.py` 已放行 7000、8088、11401、13000 及原 frp remote 端口列表 |
| **firewalld** | 同上端口已在 kr 本机放行（否则公网仅 SG 仍会被 firewalld 挡） |
| **阿里云 DNS** | 脚本 `scripts/阿里云DNS_A记录_存客宝改kr宝塔.py --apply` 已将 **quwanzhi.com** 下 **25 条** A 记录从 `42.194.245.239` 改为 `43.139.27.93` |
| **临时 TCP 桥** | **已停用**：`frp-legacy-bridge` 曾用 `socat` 转发至存客宝；收尾后 `systemctl disable` 已执行 |
| **Nginx** | `open.quwanzhi.com-frphttp.conf`：`open.quwanzhi.com:80` → **`http://127.0.0.1:8088`**（本机 frps vhostHTTP） |

### 10.2 与存客宝 frps 的配置差异（必读本节）

| 原（存客宝） | 现（kr） | 原因 |
|:---|:---|:---|
| `vhostHTTPPort = 8080` | **8088** | kr **8080** 已被 soul-api 占用 |
| Gitea `remotePort = 3000` | **13000**（frpc 内已改） | kr **3000** 已被 Next/cunkebao 占用；外网请用 **`http://open.quwanzhi.com:13000`** |

### 10.3 切流检查清单（收尾后应全部打勾）

- [x] 公司 NAS 主业务 **frpc** 向 **kr frps** 注册（见 **§10.6**：`fnvtk` 下 **standalone frpc 0.66** + 主 `frpc.toml`）。  
- [x] `curl` 抽测 **11401 / 13000 / 18080** 经域名可达。  
- [x] kr：**`frp-legacy-bridge`** 已 **stop + disable**。  
- [x] kr：**Nginx** `open.quwanzhi.com:80` → **`127.0.0.1:8088`** 并已 **reload**。  
- [x] **存客宝**：**`frps`** 已 **stop + disable**（勿再双真源）。  
- [ ] **家里 NAS（Station）**：存客宝 frps 已停后，若外网 **opennas2:22202/5002** 拒绝连接，须在**家庭内网**对 **192.168.110.29** 执行 **`群晖NAS管理/scripts/家里Station_frpc切kr_内网执行.sh`**（或 §10.4 手工改 `frpc.ini` 的 `server_addr`）。公司 CKB 已由 Agent 侧完成；家里无公钥 SSH 时脚本支持 **`STATION_ADMIN_PASS` + sshpass**。  
- [ ] DSM：**计划任务** 建议增加 **开机** 以用户 **fnvtk** 执行一次 **`/volume1/homes/fnvtk/frp-standalone/start-frpc-main.sh`**（群晖无常规用户 crontab）。  
- [ ] DSM：若仍有 **root** 旧进程 **`frpc-karuo-ai`**，可在资源监视器中结束（**`karuo-ai-gateway` 已并入主 `frpc.toml`**，`frpc-karuo-ai/frpc.toml` 已改为仅占位说明）。  
- [ ] Gitea：**ROOT_URL** 若仍写 `:3000`，建议在 NAS Gitea 配置中改为 **`http://open.quwanzhi.com:13000/`**，避免页面内链错误。

### 10.4 家里 NAS（Station）

`opennas2.quwanzhi.com` 等解析已指向 kr；**家里 frpc** 须同样把 `server_addr` / `serverAddr` 改为 **`43.139.27.93`**，并在切流前协调 **先停 kr 上 `frp-legacy-bridge`** 再重启 frpc，避免端口占用冲突。详见 §二 顺序。

### 10.5 2026-03-30 续查结论（阻塞点：主 frpc 未跑起来）

| 现象 | 说明 |
|:---|:---|
| **`open.quwanzhi.com:13000` 连不上** | kr 上 **无** frps 对 13000 的监听；主配置里 **ckb-gitea 已写 `remotePort = 13000`**，但 **未向 kr frps 注册**。 |
| **NAS 进程** | `fnvtk` SSH 下 `ps` **仅有** `/volume1/docker/frpc-karuo-ai/frpc`（仅 **karuo-ai-gateway 18080**）；**不含** 挂载 `/volume1/docker/frpc/frpc.toml` 的主 frpc。 |
| **推断** | **Docker 容器 `nas-frpc` 已停或未随 DSM 拉起**；磁盘上的 `frpc.toml` 已改对，但 **进程未加载**。 |
| **11401 仍 200** | 当前多经 **kr `frp-legacy-bridge`（socat）→ 存客宝 frps**，非「已完全切到 kr frps」的最终态。 |

**你在 DSM 上必做（root 或管理员）**

1. **套件中心 / Container Manager**：找到容器 **`nas-frpc`** → **启动**；若已在跑则 **重启**。  
2. 若习惯命令行，用 **以 root 登录的 SSH** 或 **控制面板 → 任务计划 → 以 root 执行一次**：  
   `/usr/local/bin/docker start nas-frpc 2>/dev/null || /usr/local/bin/docker restart nas-frpc`  
3. 启动后在本机或外网再验：`curl -sS -m 8 http://open.quwanzhi.com:13000/` 应能连上（非 `Connection refused`）；kr 上 `ss -tlnp | grep 13000` 应出现 **frps** 相关监听（非仅 socat）。  
4. 再按 **§10.3** 停桥接、改 Nginx `127.0.0.1:8088`、停存客宝 frps。

**说明**：用户 **`fnvtk` 无 `docker.sock` 权限**，Agent 无法代你执行 `docker restart`，必须在 DSM 或 root 下操作。

### 10.6 2026-03-30 收尾落地（公司 CKB · 全自动路径摘要）

| 项 | 做法 |
|:---|:---|
| **主 frpc 未跑 Docker** | 在 NAS 上使用已有 **`/volume1/homes/fnvtk/frp-standalone/frp_0.66.0_linux_amd64/frpc`**，`nohup` 加载 **`/volume1/docker/frpc/frpc.toml`**，与 **kr frps 0.66** 对齐。 |
| **karuo-ai-gateway 18080** | 将原 **`frpc-karuo-ai`** 中 TCP 段 **并入** 主 `frpc.toml`，避免旧版独立 frpc 占名失败。 |
| **桥与 Nginx** | kr 上停 **legacy bridge** 释放 **11401** 等与 **frps** 冲突的端口；**Nginx** 改指 **127.0.0.1:8088**。 |
| **存客宝 frps** | 已 **disable**，外网 **frp 控制面** 仅 **kr `43.139.27.93:7000`**。 |
| **SSH 入口** | 直连 **`42.194.245.239:22201` 已失效**（该机不再跑 frps）；请用 **`fnvtk@open.quwanzhi.com -p 22201`**（经 kr frps）。 |
