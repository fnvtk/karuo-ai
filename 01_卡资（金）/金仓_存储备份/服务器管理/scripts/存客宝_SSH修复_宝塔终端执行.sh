#!/bin/bash
# 存客宝 42.194.245.239 SSH 修复 · 在宝塔面板【终端】复制整段粘贴执行
# 修复后：root 密码 Zhiqun1984，支持密钥与密码登录

PUBKEY="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBY/abEb3JpB/CP3jFqN9KqXspSGgAzHzYlsQzXLmPOt karuo@example.com"
MY_IP="140.245.37.56"

echo "========== 存客宝 SSH 修复 =========="

# 1. 添加公钥
mkdir -p /root/.ssh
chmod 700 /root/.ssh
grep -qF "$PUBKEY" /root/.ssh/authorized_keys 2>/dev/null || echo "$PUBKEY" >> /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys
echo "[1/5] 公钥已写入"

# 2. 允许密码登录
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak.$(date +%s)
sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication yes/' /etc/ssh/sshd_config
sed -i 's/^#*PermitRootLogin.*/PermitRootLogin yes/' /etc/ssh/sshd_config
grep -q "^PasswordAuthentication" /etc/ssh/sshd_config || echo "PasswordAuthentication yes" >> /etc/ssh/sshd_config
grep -q "^PermitRootLogin" /etc/ssh/sshd_config || echo "PermitRootLogin yes" >> /etc/ssh/sshd_config
echo "[2/5] sshd 已允许密码与 root 登录"

# 3. 重置 root 密码
echo "root:Zhiqun1984" | chpasswd
echo "[3/5] root 密码已设为 Zhiqun1984"

# 4. 解封 IP
for j in sshd ssh-iptables; do
  fail2ban-client set "$j" unbanip "$MY_IP" 2>/dev/null && echo "  ✅ $j 已解封 $MY_IP"
done
echo "[4/5] IP 解封已执行"

# 5. 重载 sshd
systemctl reload sshd 2>/dev/null || systemctl reload ssh 2>/dev/null || service sshd reload 2>/dev/null
echo "[5/5] sshd 已重载"
echo ""
echo "========== 完成 =========="
echo "本机测试: sshpass -p 'Zhiqun1984' ssh -p 22022 -o PubkeyAuthentication=no root@42.194.245.239 'whoami'"
echo "或密钥: ssh -p 22022 -i Steam/id_ed25519 root@42.194.245.239"
