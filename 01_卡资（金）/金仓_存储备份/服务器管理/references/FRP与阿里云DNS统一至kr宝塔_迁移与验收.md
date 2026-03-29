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
| **临时 TCP 桥** | `frp-legacy-bridge.service`：`socat` 将 kr 公网端口转发到 **存客宝** 同端口，保障 **DNS 已改但各 NAS frpc 尚未重启** 期间的 TCP 业务（**不含 3000/8080/7000**；**3000** 与 kr 上 cunkebao 冲突） |
| **Nginx** | `/www/server/panel/vhost/nginx/open.quwanzhi.com-frphttp.conf`：`open.quwanzhi.com:80` → `http://42.194.245.239:8080`（frpc 仍挂在存客宝 frps 时）；**全部 frpc 指向 kr 后**应改为 `http://127.0.0.1:8088` 并 **停用桥接服务** |

### 10.2 与存客宝 frps 的配置差异（必读本节）

| 原（存客宝） | 现（kr） | 原因 |
|:---|:---|:---|
| `vhostHTTPPort = 8080` | **8088** | kr **8080** 已被 soul-api 占用 |
| Gitea `remotePort = 3000` | **13000**（frpc 内已改） | kr **3000** 已被 Next/cunkebao 占用；外网请用 **`http://open.quwanzhi.com:13000`** |

### 10.3 你必须完成的两步（否则请勿停存客宝 frps）

1. **DSM → 容器**：重启 **`nas-frpc`**（挂载 `/volume1/docker/frpc/frpc.toml`），使 **serverAddr=43.139.27.93** 与 **Gitea remotePort=13000** 生效。  
2. **验证** `curl -s http://open.quwanzhi.com:11401/api/tags` 与 `http://open.quwanzhi.com:13000` 正常后，在 **kr 宝塔 SSH** 执行：  
   `systemctl stop frp-legacy-bridge && systemctl disable frp-legacy-bridge`  
   再将 Nginx 中 `open.quwanzhi.com` 反代改为 **`127.0.0.1:8088`**，`nginx -s reload`。  

最后在**存客宝**停止旧 frps：`systemctl stop frps && systemctl disable frps`（或等价进程），避免双 frps 与端口混淆。

### 10.4 家里 NAS（Station）

`opennas2.quwanzhi.com` 等解析已指向 kr；**家里 frpc** 须同样把 `server_addr` / `serverAddr` 改为 **`43.139.27.93`**，并在切流前协调 **先停 kr 上 `frp-legacy-bridge`** 再重启 frpc，避免端口占用冲突。详见 §二 顺序。
