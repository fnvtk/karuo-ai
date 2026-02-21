#!/bin/bash
# 宝塔服务器 IP 封禁解封 · 多方案 + 优化命令
# 用法：在宝塔面板【终端】粘贴执行；或 SSH 登录后执行
# 本机公网 IP：用 curl ifconfig.me 获取，或替换下面的 MY_IP

MY_IP="${1:-$(curl -s --connect-timeout 3 ifconfig.me 2>/dev/null || echo '211.156.92.72')}"

echo "========== 宝塔 IP 封禁解封（本机 IP: $MY_IP）=========="

# 1. 检查 fail2ban 状态
echo ""
echo "[1] fail2ban 状态"
if command -v fail2ban-client &>/dev/null; then
    fail2ban-client status sshd 2>/dev/null || echo "  sshd jail 未启用或无"
    fail2ban-client status 2>/dev/null | head -20
else
    echo "  fail2ban 未安装"
fi

# 2. 解封本机 IP
echo ""
echo "[2] 解封本机 IP: $MY_IP"
if command -v fail2ban-client &>/dev/null; then
    for jail in sshd ssh-iptables; do
        if fail2ban-client status "$jail" &>/dev/null; then
            fail2ban-client set "$jail" unbanip "$MY_IP" 2>/dev/null && echo "  ✅ $jail 已解封 $MY_IP" || echo "  ⚠️ $jail 解封失败或未封"
        fi
    done
else
    echo "  需先安装 fail2ban: apt install fail2ban -y"
fi

# 3. 宝塔防火墙（若启用）
echo ""
echo "[3] 宝塔防火墙封禁检查"
if [ -x /usr/bin/bt ]; then
    /usr/bin/bt 14 2>/dev/null | grep -E "$MY_IP|封禁" | head -5 || true
    echo "  若本机 IP 在封禁列表，请到面板【安全】→【系统防火墙】解除"
fi

# 4. iptables 直查（如有）
echo ""
echo "[4] iptables 含 DROP/REJECT 的规则数"
iptables -L -n 2>/dev/null | grep -c -E "DROP|REJECT" || echo "  0 或无权限"

echo ""
echo "========== 完成 =========="
echo "建议：重启服务器可清空 fail2ban 内存封禁；或仅解封后等 10 分钟再试 SSH"
