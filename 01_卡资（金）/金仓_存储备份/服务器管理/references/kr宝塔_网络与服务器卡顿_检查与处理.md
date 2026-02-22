# kr宝塔 · 网络卡 / 服务器卡 · 检查与处理

> 适用：43.139.27.93（kr宝塔，2核4G）。SSH 端口 22022，密钥见 Steam/README_密钥与登录.md。

---

## 一、本机侧快速检查（无需登录服务器）

```bash
# 1. 网络连通
ping -c 3 43.139.27.93

# 2. SSH 端口是否可达
nc -zv -w 5 43.139.27.93 22022

# 3. 宝塔面板端口（若需）
nc -zv -w 5 43.139.27.93 9988
```

- 若 **ping 丢包或延迟高** → 网络问题（运营商/云厂商/本地网络）。
- 若 **端口不通** → 安全组/防火墙未放行 22022 或 9988。

---

## 二、SSH 登录与服务器内诊断

### 2.1 登录

```bash
# 密钥路径（私钥权限须为 600）
chmod 600 "/Users/karuo/Documents/开发/4、小工具/服务器管理/Steam/id_ed25519"
ssh -p 22022 -i "/Users/karuo/Documents/开发/4、小工具/服务器管理/Steam/id_ed25519" root@43.139.27.93
```

若 **Connection closed by remote host**：可能是服务器负载过高或 sshd 限流，稍后重试或从宝塔面板「终端」登录执行下列命令。

### 2.2 服务器内一键诊断（登录后执行）

```bash
echo "=== 负载 ===" && uptime
echo "=== 内存 ===" && free -m
echo "=== 磁盘 ===" && df -h / /www
echo "=== 连接数(ESTABLISHED) ===" && ss -ant state established | wc -l
echo "=== 连接汇总 ===" && ss -s
echo "=== CPU TOP5 ===" && ps aux --sort=-%cpu | head -6
echo "=== 内存 TOP5 ===" && ps aux --sort=-%mem | head -6
```

### 2.3 针对「网络卡」的检查

- **连接数是否过多**：`ss -ant state established | wc -l` 若上千需关注。
- **Nginx/应用日志**：看是否有大量请求或慢请求。
- **带宽/流量**：宝塔面板「监控」或 `vnstat`（若已装）。

### 2.4 针对「服务器卡」的检查

| 现象       | 检查命令/位置           | 处理思路                     |
|------------|--------------------------|------------------------------|
| CPU 高     | `top` 或 `ps aux --sort=-%cpu` | 结束异常进程或优化程序       |
| 内存不足   | `free -m`                | 关停非必要服务、加 swap 或升配 |
| 磁盘满     | `df -h`、`du -sh /www/*` | 清日志、删临时文件、扩容     |
| 磁盘 I/O 高| `iostat -x 1 3`（若已装）| 减少写操作、查大文件/日志    |
| 连接数爆炸 | `ss -s`、`ss -ant`       | 限流、查攻击或异常客户端     |

---

## 三、常见处理动作（登录后执行）

```bash
# 清理系统日志（慎用，仅当磁盘紧张时）
# find /var/log -name "*.log" -mtime +7 -delete

# 重载 Nginx
nginx -s reload

# 查看宝塔/Node 相关进程
ps aux | grep -E 'nginx|node|pm2'

# 若使用 PM2，查看列表
pm2 list
```

---

## 四、宝塔 API 远程检查（需白名单）

若本机 IP 已加入 kr宝塔 的「API 白名单」，可用卡若AI 脚本批量看 CPU/内存/磁盘：

```bash
python3 "/Users/karuo/Documents/个人/卡若AI/01_卡资（金）/金仓_存储备份/服务器管理/脚本/快速检查服务器.py"
```

未加白名单前会报「IP校验失败」，需在 kr宝塔 面板：**设置 → API 接口 → 接口密钥 → 将本机公网 IP 加入白名单**。

---

## 五、带宽使用情况（近期已查）

kr宝塔 为腾讯云广州 CVM（实例 ID: ins-aw0tnqjo），带宽 5M。可用脚本查看近 24 小时监控：

```bash
# 需安装 tencentcloud-sdk-python-monitor，建议用 scripts 下 .venv_tx
/Users/karuo/Documents/个人/卡若AI/01_卡资（金）/金仓_存储备份/服务器管理/scripts/.venv_tx/bin/python \
  "/Users/karuo/Documents/个人/卡若AI/01_卡资（金）/金仓_存储备份/服务器管理/scripts/kr宝塔_腾讯云带宽与CPU近24h.py"
```

**最近一次查询结论**（近 24h）：
- **公网出带宽**：平均 2.95 Mbps，**最大 5.1 Mbps**（已接近/顶满 5M 上限）
- **公网入带宽**：平均 4.4 Mbps，最大 11.54 Mbps

**带宽卡的主要原因**：出带宽经常顶满 5M，易造成访问慢、请求排队。建议：升级带宽（腾讯云控制台或工单）、或在 Nginx/应用侧做限速与缓存，减少无效外网出流量。

---

## 六、直接处理「带宽卡」——在宝塔面板终端执行

以下整段复制到 **kr宝塔 宝塔面板 → 终端** 执行，用于排查并做基础限流。

### 6.1 一键诊断（连接数 + 端口分布 + TOP 进程）

```bash
echo "=== 连接数(ESTABLISHED) ===" && ss -ant state established | wc -l
echo "=== 各端口连接数 TOP ===" && ss -antn state established | awk '{print $4}' | cut -d: -f2 | sort | uniq -c | sort -rn | head -15
echo "=== 连接汇总 ===" && ss -s
echo "=== CPU TOP5 ===" && ps aux --sort=-%cpu | head -6
echo "=== 内存 TOP5 ===" && ps aux --sort=-%mem | head -6
```

### 6.2 按 IP 统计连接数（查是否单 IP 占满）

```bash
ss -antn state established | awk '{print $5}' | cut -d: -f1 | sort | uniq -c | sort -rn | head -20
```

若某 IP 连接数异常多，可在宝塔「安全」或防火墙里对该 IP 限连接数或临时封禁。

### 6.3 Nginx 限速（可选，减轻带宽打满）

在对应站点的 Nginx 配置里增加（或让宝塔「网站」→「设置」→「配置文件」里加）：

```nginx
# 在 server 块内
limit_conn_zone $binary_remote_addr zone=perip:10m;
limit_conn perip 20;           # 单 IP 最多 20 并发连接
limit_rate 500k;               # 单连接限速 500KB/s，可按需改
```

改完后 `nginx -t && nginx -s reload`。

### 6.4 列出占满带宽的程序 / 端口 / 网站及占用比例

在服务器上运行**带宽占用排查脚本**，会输出：监听端口与进程、按端口/进程的连接数占比（≈ 带宽占比）、Nginx 站点、Node/PM2 进程、以及若已安装 nethogs 的实时带宽占比。

在 kr宝塔 **宝塔面板 → 终端** 执行脚本。两种方式任选：

- **方式一**：把脚本上传到服务器后执行  
  `bash /路径/kr宝塔_带宽占用排查.sh`
- **方式二**：在本机打开脚本，全文复制到宝塔终端粘贴执行  
  脚本路径：`01_卡资（金）/金仓_存储备份/服务器管理/scripts/kr宝塔_带宽占用排查.sh`脚本会列出：
- **【1】监听端口与进程**：可能占带宽的服务（Nginx、Node、宝塔、SSH 等）
- **【2】按端口连接数占比**：各端口当前连接数及占比（近似该端口占用带宽比例）
- **【3】按进程连接数占比**：各 PID 连接数及占比（近似该程序占用带宽比例）
- **【4】Nginx 站点**：端口 → 域名/网站
- **【5】Node/PM2 进程**：常见占带宽应用
- **【6】实时带宽**：若已安装 nethogs，采样 5 秒得到各进程实时 KB/s 占比

**说明**：无 nethogs 时，用「连接数占比」近似「带宽占比」；精确带宽以 nethogs 或宝塔「监控」为准。

### 6.5 可能占满带宽的程序 / 端口 / 网站清单（kr宝塔 当前）

以下为服务器上**正在监听**的程序与端口，均可能产生带宽占用。实时「带宽占比」需在宝塔终端运行上面脚本或 `nethogs -t`。

| 类型 | 程序/进程 | 监听端口 | 说明 / 对应网站 |
|------|-----------|----------|------------------|
| Web 入口 | nginx | 80, 443, 888, 19999 | 所有 HTTPS/HTTP 流量经此转发；站点见下表 |
| Node 应用 | next-server | 3000, 3001, 3005, 3015, 3031, 3036, 3043, 3045, 3050, 3055, 3081, 3305 | 多个 Next.js 站点（soul、zhiji、dlm、word、wzdj、玩值大屏、神射手、AITOUFA 等） |
| 后端 API | soul-api | 8080, 8081 | soul 相关接口 |
| 网关/内网 | python3 | 8000(127.0.0.1) | 卡若AI 网关等 |
| 面板/系统 | BT-Panel | 9988 | 宝塔面板 |
| 面板/系统 | sshd | 22022 | SSH |
| 数据库/缓存 | redis-server | 6379 | Redis |
| 数据库/缓存 | mongod | 27017 | MongoDB |
| 其他 | pure-ftpd, master(25), containerd, dockerd | 21, 25, 2375, 37455 | FTP、邮件、Docker |

**端口 → 网站/域名（部分）**：80/443 上由 Nginx 按 `server_name` 分发到不同站点，例如：soul.quwanzhi.com、kr-ai.quwanzhi.com、soulapi.quwanzhi.com、www.quwanzhi.com、ckb.quwanzhi.com、dlm.quwanzhi.com、word.quwanzhi.com、wzdj.quwanzhi.com、zp.quwanzhi.com、zhiji.quwanzhi.com、wz-screen.quwanzhi.com、ai-tf.quwanzhi.com、kr_wb.quwanzhi.com、discuzq.quwanzhi.com、www.lkdie.com、feishu.lkdie.com 等（完整列表见 Nginx 配置目录 `/www/server/panel/vhost/nginx/`）。

**带宽占比**：当前瞬时连接数较少时，无法单次采样得到稳定占比。请在服务器上运行 **6.4 的脚本** 或执行 `nethogs -t` 采样 10～30 秒，即可得到各进程的实时带宽占比（KB/s 或 %）。

### 6.6 502 Bad Gateway 修复（含 soul、wzdj、word）

**Node 项目 502**（如 wzdj.quwanzhi.com、word.quwanzhi.com）：

```bash
# 本机执行，免 SSH
./01_卡资（金）/金仓_存储备份/服务器管理/scripts/.venv_tx/bin/python \
  "01_卡资（金）/金仓_存储备份/服务器管理/scripts/腾讯云_TAT_修复502_Node项目.py" wzdj word
```

若 word 仍 502，在宝塔 **Node 项目** 中查看 word 的启动日志，可能是 MODULE_NOT_FOUND 或 Node 版本不匹配，按 `references/Node项目未启动_MODULE_NOT_FOUND修复指南.md` 修正启动命令。

**含 soul 的 502**：

**原因**：Nginx 能通，但上游（Node/后端）无响应或挂掉，导致 502。

**方式一：宝塔 API（需本机 IP 已加入 kr宝塔 API 白名单）**

```bash
python3 "/Users/karuo/Documents/个人/卡若AI/01_卡资（金）/金仓_存储备份/服务器管理/scripts/kr宝塔_宝塔API_修复502.py"
```

脚本会：重启 Nginx、并尝试重启名称含 soul 的 Node 项目。若报「IP校验失败」，请到 kr宝塔 面板 **设置 → API 接口** 将当前公网 IP 加入白名单后重试。

**方式二：在 kr宝塔 宝塔面板终端执行（不依赖 API 白名单）**

```bash
# 1. 重载 Nginx
nginx -t && nginx -s reload

# 2. 重启 soul 相关 Node/PM2（按你实际项目名调整）
pm2 list
pm2 restart soul       # 或 souladmin、soul-api 等
# 若用宝塔「Node 项目」管理，请在面板里对该站点点击「重启」
```

**方式三：SSH**（当连接可用时）

```bash
ssh -p 22022 -i "服务器管理/Steam/id_ed25519" root@43.139.27.93 "nginx -s reload; pm2 restart soul"
```

修复后刷新 soul.quwanzhi.com/admin 或 souladmin.quwanzhi.com 查看是否恢复。

**souladmin.quwanzhi.com 500 Internal Server Error**（域名由 Admin 点区域管制）：

- **原因**：后端 Node 未运行或崩溃。soul.quwanzhi.com/admin 已停用，现用 souladmin.quwanzhi.com。
- **处理**：仅用宝塔 API 修复。本机执行 `kr宝塔_宝塔API_修复502.py`（需先将当前公网 IP 加入 kr宝塔 面板「设置 → API 接口」白名单）；或 TAT 执行 `腾讯云_TAT_kr宝塔_修复souladmin_500.py`（服务器内调 127.0.0.1 无需白名单）。

### 6.7 腾讯云控制台可做

- **升级带宽**：云服务器 → 选择实例 ins-aw0tnqjo → 更多 → 网络/带宽 → 调整带宽。
- **流量/带宽告警**：云监控 → 告警策略，对「公网出带宽」设阈值（如 4 Mbps）便于提前发现打满。

---

## 七、负载 100% 详细分析

见独立文档：`references/kr宝塔_负载100_原因分析与处理.md`

**要点**：负载由 Node 项目 MODULE_NOT_FOUND 崩溃循环导致；修正 site.db 启动命令后可批量启动。TAT 诊断：`scripts/腾讯云_TAT_kr宝塔_负载诊断.py`。

---

## 八、本次诊断结果摘要（2026-02-20）

- **本机 → kr宝塔**：ping 正常，22022 端口可达。
- **SSH**：曾出现 Connection closed by remote host，建议用宝塔面板终端执行上述命令。
- **负载**：TAT 诊断显示负载已降至 0.5，Node 进程数为 0（全停）；根因是 Node 崩溃循环。
- **带宽**：近 24h 公网出带宽最大 5.1 Mbps，已顶满 5M，是「带宽卡」的主要原因；已提供腾讯云脚本与宝塔终端处理步骤。

---

**下一步**：在 kr宝塔 面板终端执行「六、6.1」诊断；若连接数或单 IP 异常，按 6.2/6.3 限流；长期可升级带宽或设告警。

---

## 九、高负载 / CPU 满 / 磁盘满 · 已执行处理（卡若AI 默认自动）

当负载 100%、CPU 99%、磁盘 89% 时，已通过 SSH 自动执行：

1. **结束高 CPU 进程**：多次结束占用约 35～39% CPU 的 `npm start`（会被宝塔 Node 项目自动拉起，需在面板中停用或重启对应项目）。
2. **清理磁盘**：删除 `/www/wwwlogs` 下 7 天前 `.log`；截断大于 50M 的网站日志；清理 `/tmp` 7 天前文件；删除 `/var/log` 7 天前 `.log`；截断 `/var/log/oneav/oneav.log`。网站日志由约 2G 降至约 258M，磁盘由约 89% 降至约 87%（约 10G 可用）。
3. **负载与 CPU 来源**：当前负载主要来自多个 `next-server`（Node 站点）及反复被拉起的 `npm start`。要持续降压需在宝塔「网站」→「Node 项目」中停用或合并非必要项目，或升级为 4 核。

**一键再执行（在服务器终端）**：
```bash
find /www/wwwlogs -name '*.log' -mtime +7 -type f -delete
find /www/wwwlogs -name '*.log' -type f -size +50M -exec truncate -s 0 {} \;
find /tmp -type f -mtime +7 -delete
find /var/log -name '*.log' -mtime +7 -type f -delete
```
