# kr宝塔 SSH 登录方式与故障排查

> 当一种方式失败时，依次尝试其他方式。终极备选：**宝塔面板 → 终端**（无需 SSH）。

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

## 四、终极备选：宝塔面板终端

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

## 六、IP 封禁处理（多方案 + 优化命令）

### 6.1 腾讯云 API 重启（解除 fail2ban 内存封禁）

重启会清空 fail2ban 等进程内存，封禁自动解除。本机执行：

```bash
python3 "01_卡资（金）/金仓_存储备份/服务器管理/scripts/腾讯云_宝塔服务器重启.py"
```

### 6.2 宝塔终端解封（SSH 不可用时用面板终端）

在**宝塔面板 → 终端**粘贴执行。将 `你的公网IP` 替换为本机公网 IP（如 211.156.92.72，可从 https://ip.sb 或本机 `curl ifconfig.me` 获取）：

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
