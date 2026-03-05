#!/bin/bash
# 存客宝 42.194.245.239：清理挖矿木马 + 防再次入侵
# 本机执行：sshpass -p 'Zhiqun1984' ssh -o StrictHostKeyChecking=no -p 22 root@42.194.245.239 'bash -s' < 本脚本
# 或先 scp 到服务器再 ssh 执行

set -e
echo "========== 1. 清理挖矿木马 =========="
f="/tmp/.esd101/.system3d"
[ -f "$f" ] && for pid in $(lsof -t "$f" 2>/dev/null); do kill -9 $pid 2>/dev/null; done || true
pkill -9 -f ".esd101" 2>/dev/null || true
pkill -9 -f ".system3d" 2>/dev/null || true
sleep 1
rm -rf /tmp/.esd101 /tmp/.* 2>/dev/null || true
echo "  已删除 /tmp/.esd101 及 /tmp 下隐藏目录"

echo ""
echo "========== 2. 清除恶意持久化 =========="
# 清理 root 与 www 的 crontab 中的恶意项
for u in root www; do
  crontab -u $u -l 2>/dev/null | grep -v "esd101\|system3d\|/tmp/\." | crontab -u $u - 2>/dev/null || true
done
# 清理 /etc/cron.* 中的恶意脚本
sed -i '/\.esd101\|\.system3d\|\/tmp\/\./d' /etc/cron.d/* /etc/cron.daily/* /etc/cron.hourly/* 2>/dev/null || true
echo "  crontab 与 /etc/cron 已清理"

echo ""
echo "========== 3. 防再次入侵加固 =========="
# 3.1 /tmp 禁止执行（noexec），需重启后生效，这里仅创建说明
grep -q "tmpfs.*noexec" /etc/fstab 2>/dev/null && echo "  /tmp noexec 已存在" || echo "  建议：fstab 中 /tmp 加 noexec 后 reboot"
# 3.2 确保 fail2ban 或宝塔 SSH 防护开启
if command -v fail2ban-client &>/dev/null; then
  fail2ban-client status sshd &>/dev/null && echo "  fail2ban sshd 已运行" || systemctl start fail2ban 2>/dev/null && echo "  fail2ban 已启动" || true
fi
# 3.3 限制 /tmp 下新建可执行文件（可选：chmod 1777 已存在则保持）
chmod 1777 /tmp 2>/dev/null && echo "  /tmp 权限 1777"
# 3.4 宝塔面板：安全 -> 防火墙已放行必要端口前提下，可开启「SSH 防爆破」
echo "  建议：宝塔 安全 -> SSH 防爆破 开启；面板 设置 -> 修改默认端口与强密码"

echo ""
echo "========== 4. 检查结果 =========="
ls -la /tmp/ | head -12
echo ""
crontab -l 2>/dev/null | grep -v "^#" || echo "  root crontab 无任务"
echo ""
echo "========== 完成 =========="
