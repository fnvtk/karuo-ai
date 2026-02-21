#!/bin/bash
# 在 kr宝塔 宝塔面板 → 终端 执行，将本机 IP 永久加入 fail2ban 白名单
# 用法：bash 本脚本 或 复制内容到终端执行
# 不传参数时从 https://ip.sb 获取；也可传参：bash 本脚本 211.156.92.72

IP="${1:-$(curl -s --connect-timeout 5 ip.sb 2>/dev/null || curl -s ifconfig.me 2>/dev/null || echo '')}"
if [ -z "$IP" ]; then
  echo "❌ 无法获取公网 IP，请手动传入: bash $0 你的公网IP"
  exit 1
fi
echo "=== 将 $IP 永久加入 fail2ban 白名单 ==="
mkdir -p /etc/fail2ban/jail.d
# 追加到已有 ignoreip 或新建（保留 127.0.0.1/8 ::1）
if [ -f /etc/fail2ban/jail.d/99-allow-ckb-ip.conf ]; then
  cur=$(grep ignoreip /etc/fail2ban/jail.d/99-allow-ckb-ip.conf 2>/dev/null | head -1)
  if echo "$cur" | grep -q "$IP"; then
    echo "  $IP 已在白名单中"
  else
    sed -i "s/ignoreip = \(.*\)/ignoreip = \1 $IP/" /etc/fail2ban/jail.d/99-allow-ckb-ip.conf 2>/dev/null || \
    echo -e "[DEFAULT]\nignoreip = 127.0.0.1/8 ::1 $IP" > /etc/fail2ban/jail.d/99-allow-ckb-ip.conf
    echo "  已添加 $IP"
  fi
else
  echo -e "[DEFAULT]\nignoreip = 127.0.0.1/8 ::1 $IP" > /etc/fail2ban/jail.d/99-allow-ckb-ip.conf
  echo "  已创建 99-allow-ckb-ip.conf"
fi
systemctl restart fail2ban 2>/dev/null || service fail2ban restart 2>/dev/null
fail2ban-client set sshd unbanip "$IP" 2>/dev/null
fail2ban-client set ssh-iptables unbanip "$IP" 2>/dev/null
echo "✅ 完成。$IP 今后不会被 fail2ban 封禁。"
