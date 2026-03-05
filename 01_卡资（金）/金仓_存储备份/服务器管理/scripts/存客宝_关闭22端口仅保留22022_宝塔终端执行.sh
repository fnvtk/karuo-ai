#!/bin/bash
# 存客宝：关闭 22 端口，仅保留 22022（防暴力破解入口）
# 在宝塔面板【终端】复制整段执行。执行后 SSH 仅用：ssh -p 22022 root@42.194.245.239

echo "=== 关闭 22 端口，仅保留 22022 ==="
CFG="/etc/ssh/sshd_config"
[ -f "$CFG" ] && cp "$CFG" "$CFG.bak.$(date +%Y%m%d%H%M)"
sed -i '/^Port /d' "$CFG"
sed -i '/^#Port /d' "$CFG"
echo "Port 22022" >> "$CFG"
iptables -C INPUT -p tcp --dport 22 -j DROP 2>/dev/null || iptables -A INPUT -p tcp --dport 22 -j DROP
systemctl restart sshd 2>/dev/null || service sshd restart 2>/dev/null
echo "完成。SSH 仅用: ssh -p 22022 root@42.194.245.239"
