# 宝塔 SSH 登录方式与故障排查

> 当一种方式失败时，依次尝试其他方式。终极备选：**宝塔面板 → 终端**（无需 SSH）。
> **存客宝 SSH 修复**：在存客宝宝塔终端执行 `scripts/存客宝_SSH修复_宝塔终端执行.sh` 内容。  
> **存客宝已关闭 22 端口**：仅保留 22022，防暴力破解。连接用：`ssh -p 22022 root@42.194.245.239`。

## 启动 SSH 并保证连接成功（kr宝塔 43.139.27.93）

按顺序执行即可：

**① 安全组放行 22、22022**（在卡若AI 项目根目录执行）：

```bash
cd "/Users/karuo/Documents/个人/卡若AI"
.venv_tencent/bin/python3 "01_卡资（金）/金仓_存储备份/服务器管理/scripts/腾讯云_kr宝塔安全组放行SSH.py"
```

**② 在服务器上启动 sshd**（二选一）：

- **能连上 SSH 时**：`ssh -p 22022 root@43.139.27.93` 登录后执行  
  `systemctl enable sshd && systemctl start sshd && systemctl status sshd`
- **连不上时**：用 **宝塔面板终端**：打开 https://43.139.27.93:9988 → 登录 → 终端 → 执行上述三条命令。

**③ 测试连接**：

```bash
ssh -p 22022 -o StrictHostKeyChecking=no root@43.139.27.93
# 密码：Zhiqun1984（首字母大写 Z）
```

若仍失败，见下方「Connection closed 原因与处理」和「终极备选：宝塔面板终端」。

---

## 零、SSH IP 被封禁防护（2026-02-23 已配置）

**问题**：sshpass/密钥连接被 `Connection closed by remote host`，原因是外部暴力破解（19,690 次错误尝试）占满 sshd 连接池。

**已部署防护（kr宝塔 43.139.27.93）**：

| 措施 | 配置 | 说明 |
|------|------|------|
| iptables 白名单 | `211.156.92.72` → ACCEPT | 当前公网 IP 永不被封 |
| iptables 速率限制 | 5 分钟内同 IP 超 10 次 → DROP | 自动封禁暴力破解 |
| sshd MaxStartups | `30:50:100` | 连接池增大 |
| sshd MaxAuthTries | `10` | 单次连接允许更多尝试 |
| 宝塔 SSH 防护 | `ssh_check.pl = true` | 宝塔面板级防护 |

**公网 IP 变化时**需更新白名单（通过 TAT 或宝塔终端）：

```bash
NEW_IP=$(curl -s ifconfig.me)
iptables -I INPUT 1 -s $NEW_IP -p tcp --dport 22022 -j ACCEPT
iptables -I INPUT 2 -s $NEW_IP -p tcp --dport 22 -j ACCEPT
iptables-save > /etc/sysconfig/iptables
```

---

## 一、凭证汇总（经实测）

| 方式 | 端口 | 账号 | 密码/密钥 | 说明 |
|------|------|------|-----------|------|
| **密钥** | 22022 或 22 | root | id_ed25519 | 最稳定，优先用 |
| **密码** | 22022 或 22 | root | **Zhiqun1984**（大写 Z） | 小写 zhiqun1984 会失败 |
| 面板 | - | ckb | zhiqun1984 | 仅用于宝塔 Web 登录，不是 SSH |

> ⚠️ ckb 是宝塔面板账号，**SSH 需用 root**。密码必须 **Zhiqun1984**（首字母大写）。

---

## 二、多种登录命令（任选其一）

### 2.1 密钥登录（推荐）

```bash
ssh -p 22022 -o StrictHostKeyChecking=no \
  -i "/Users/karuo/Documents/开发/4、小工具/服务器管理/Steam/id_ed25519" \
  root@43.139.27.93
```

若 22022 被限流，可试 22：

```bash
ssh -p 22 -o StrictHostKeyChecking=no \
  -i "/Users/karuo/Documents/开发/4、小工具/服务器管理/Steam/id_ed25519" \
  root@43.139.27.93
```

### 2.2 密码登录

```bash
sshpass -p 'Zhiqun1984' ssh -p 22022 -o StrictHostKeyChecking=no \
  -o PubkeyAuthentication=no -o PreferredAuthentications=password \
  root@43.139.27.93
```

### 2.3 封装脚本（自动尝试多种方式）

```bash
bash "01_卡资（金）/金仓_存储备份/服务器管理/scripts/kr宝塔_SSH登录.sh" "你的命令"
# 示例
bash "01_卡资（金）/金仓_存储备份/服务器管理/scripts/kr宝塔_SSH登录.sh" "whoami"
```

### 2.4 ~/.ssh/config 配置（可选）

```
Host kr-baota
  HostName 43.139.27.93
  Port 22022
  User root
  IdentityFile /Users/karuo/Documents/开发/4、小工具/服务器管理/Steam/id_ed25519
  PreferredAuthentications publickey,password
  ConnectTimeout 10
```

配置后可直接：`ssh kr-baota`

---

## 三、Connection closed 原因与处理

| 现象 | 可能原因 | 处理 |
|------|----------|------|
| Permission denied | 密码错误或账号无权限 | 用 **Zhiqun1984**（大写 Z），账号用 **root** |
| Connection closed by remote host | fail2ban 限流、sshd 限连接、负载高 | 等 5～10 分钟再试；换端口 22/22022；用**宝塔面板终端** |
| 端口不通 | 安全组/防火墙 | 在腾讯云放行 22、22022 |

---

## 四、防封禁·一次配置永久有效

**核心**：将本机 IP 加入 fail2ban 白名单，今后连接不再触发封禁。

| 方式 | 何时用 | 命令 |
|------|--------|------|
| **A. SSH 可用时** | 能连上后立刻做 | `bash scripts/宝塔_永久白名单fail2ban_终端执行.sh 140.245.37.56`（IP 换成你的） |
| **B. 腾讯云重启** | SSH 完全不通时 | `python3 scripts/腾讯云_宝塔服务器重启.py`（重启清空封禁，等 2～3 分钟再连） |
| **C. 宝塔终端** | 重启后仍不通 | 登录面板 → 终端 → 粘贴执行 `scripts/宝塔_永久白名单fail2ban_终端执行.sh` 内容 |

建议：重启解封后，**第一时间**执行 A 或 C，将当前 IP 加入白名单。

---

## 五、终极备选：宝塔面板终端

**无需 SSH**，在浏览器中完成操作：

1. 打开 https://43.139.27.93:9988
2. 登录：ckb / zhiqun1984
3. 左侧 → **终端**
4. 直接执行命令，或粘贴 `references/宝塔面板终端_Node批量启动指南.md` 中的脚本

---

## 五、Node 批量启动（SSH 成功后）

```bash
cd "/Users/karuo/Documents/个人/卡若AI"
sshpass -p 'Zhiqun1984' ssh -p 22022 -o StrictHostKeyChecking=no -o PubkeyAuthentication=no root@43.139.27.93 \
  'python3 -' < "01_卡资（金）/金仓_存储备份/服务器管理/scripts/kr宝塔_node项目批量修复.py"
```

或使用封装脚本（自动尝试 22022/22、密钥/密码）：

```bash
cd "/Users/karuo/Documents/个人/卡若AI"
bash "01_卡资（金）/金仓_存储备份/服务器管理/scripts/kr宝塔_SSH登录.sh" "python3 -" < \
  "01_卡资（金）/金仓_存储备份/服务器管理/scripts/kr宝塔_node项目批量修复.py"
```

## 七、IP 封禁处理（多方案 + 优化命令）

### 6.0 腾讯云 TAT 解封（免 SSH 顶配）

用腾讯云 SecretId/SecretKey 在 kr宝塔 上执行解封 + Node 批量启动，**无需 SSH**。

```bash
cd "/Users/karuo/Documents/个人/卡若AI"
./01_卡资（金）/金仓_存储备份/服务器管理/scripts/.venv_tx/bin/python \
  "01_卡资（金）/金仓_存储备份/服务器管理/scripts/腾讯云_TAT_解封SSH并批量启动Node.py" 211.156.92.72
```

凭证从 `00_账号与API索引.md` 读取。将 `211.156.92.72` 换成你的公网 IP。依赖：`pip install tencentcloud-sdk-python-tat`。

### 6.1 腾讯云 API 重启（解除 fail2ban 内存封禁）

重启会清空 fail2ban 等进程内存，封禁自动解除。本机执行：

```bash
python3 "01_卡资（金）/金仓_存储备份/服务器管理/scripts/腾讯云_宝塔服务器重启.py"
```

### 6.2 永久白名单（防今后再封）

SSH 恢复后**务必执行**，将本机 IP 加入 ignoreip：

```bash
# 本机执行（需先 SSH 通）
sshpass -p 'Zhiqun1984' ssh -p 22022 root@43.139.27.93 'bash -s' < scripts/宝塔_永久白名单fail2ban_终端执行.sh 140.245.37.56
```

或在宝塔面板 → 终端，复制 `scripts/宝塔_永久白名单fail2ban_终端执行.sh` 内容执行，参数传你的公网 IP。

### 6.3 宝塔终端解封（SSH 不可用时用面板终端）

在**宝塔面板 → 终端**粘贴执行。将 `你的公网IP` 替换为本机公网 IP（如 140.245.37.56，可从 https://ip.sb 或本机 `curl ifconfig.me` 获取）：

**优化单行（同时解封 sshd + ssh-iptables）：**

```bash
IP="你的公网IP"; for j in sshd ssh-iptables; do fail2ban-client set "$j" unbanip "$IP" 2>/dev/null && echo "✅ $j 已解封 $IP"; done
```

**分步执行：**

```bash
fail2ban-client status sshd
fail2ban-client set sshd unbanip 你的公网IP
fail2ban-client set ssh-iptables unbanip 你的公网IP
```

**一键脚本**：`scripts/宝塔_IP封禁解封与优化命令.sh`，在服务器上执行 `bash 脚本路径 你的公网IP`

---

## 七.5 域名无法访问（lkdie / lytiao）

当 lkdie.com、lytiao.com 出现 502 或 ERR_CONNECTION_CLOSED 时，详见：

`references/宝塔_域名无法访问_lkdie_lytiao_诊断与修复.md`

简要：在宝塔面板终端执行 `nginx -t && nginx -s reload`；www.lytiao.com 需在面板新增站点或添加 redirect 配置。

---

## 八、存客宝 SSH 修复（Permission denied 时）

存客宝若密码/密钥均 Permission denied，需在**存客宝宝塔面板 → 终端**执行修复：

1. 打开 https://42.194.245.239:9988 → 登录 ckb/zhiqun1984 → 左侧「终端」
2. 复制 `scripts/存客宝_SSH修复_宝塔终端执行.sh` 的**全部内容**，粘贴到终端执行

脚本会：添加本机公钥、允许密码登录、`PermitRootLogin yes`、重置 root 密码为 Zhiqun1984、解封 IP 140.245.37.56、重载 sshd。执行完成后本机即可 SSH。
