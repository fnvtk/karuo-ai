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

### 6.4 腾讯云控制台可做

- **升级带宽**：云服务器 → 选择实例 ins-aw0tnqjo → 更多 → 网络/带宽 → 调整带宽。
- **流量/带宽告警**：云监控 → 告警策略，对「公网出带宽」设阈值（如 4 Mbps）便于提前发现打满。

---

## 七、本次诊断结果摘要（2026-02-20）

- **本机 → kr宝塔**：ping 正常，22022 端口可达。
- **SSH**：曾出现 Connection closed by remote host，建议用宝塔面板终端执行上述命令。
- **带宽**：近 24h 公网出带宽最大 5.1 Mbps，已顶满 5M，是「带宽卡」的主要原因；已提供腾讯云脚本与宝塔终端处理步骤。

---

**下一步**：在 kr宝塔 面板终端执行「六、6.1」诊断；若连接数或单 IP 异常，按 6.2/6.3 限流；长期可升级带宽或设告警。
