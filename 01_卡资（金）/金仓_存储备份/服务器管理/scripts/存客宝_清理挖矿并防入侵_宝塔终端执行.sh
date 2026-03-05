#!/bin/bash
# 存客宝：清理挖矿木马 + 防再次入侵（在宝塔面板【终端】复制整段执行）

echo "========== 1. 清理挖矿木马 =========="
f="/tmp/.esd101/.system3d"
[ -f "$f" ] && for pid in $(lsof -t "$f" 2>/dev/null); do kill -9 $pid 2>/dev/null; done
pkill -9 -f ".esd101" 2>/dev/null || true
pkill -9 -f ".system3d" 2>/dev/null || true
sleep 1
rm -rf /tmp/.esd101
# 删除 /tmp 下其他可疑隐藏目录（保留系统需要的）
for d in /tmp/.[a-zA-Z0-9]*; do [ -d "$d" ] && [ ! -L "$d" ] && rm -rf "$d" 2>/dev/null; done
echo "  已删除 /tmp/.esd101 及 /tmp 下可疑隐藏目录"

echo ""
echo "========== 2. 清除恶意持久化 =========="
crontab -l 2>/dev/null | grep -v "esd101\|system3d\|/tmp/\." | crontab - 2>/dev/null || true
for u in root www; do crontab -u $u -l 2>/dev/null | grep -v "esd101\|system3d\|/tmp/\." | crontab -u $u - 2>/dev/null; done
grep -rl "esd101\|system3d\|/tmp/\." /etc/cron.d /etc/cron.daily /etc/cron.hourly 2>/dev/null | while read f; do sed -i '/esd101\|system3d\|\/tmp\/\./d' "$f"; done
echo "  crontab 与 /etc/cron 已清理"

echo ""
echo "========== 3. 防再次入侵 =========="
chmod 1777 /tmp 2>/dev/null
systemctl is-active fail2ban &>/dev/null && echo "  fail2ban 已运行" || (systemctl start fail2ban 2>/dev/null && echo "  fail2ban 已启动" || echo "  未安装 fail2ban，建议宝塔 安全 安装")
echo "  建议：宝塔 安全 -> SSH 防爆破 开启；面板 设置 -> 强密码、改端口"

echo ""
echo "========== 4. 检查 =========="
ls -la /tmp/ | head -15
echo ""
echo "========== 完成 =========="
