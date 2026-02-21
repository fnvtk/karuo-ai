#!/bin/bash
# 存客宝 每日定时清理 · 卡若AI 生成（凌晨 3:30 低峰执行）
# 配置到 crontab: 30 3 * * * /root/存客宝_每日定时清理.sh >> /var/log/ckb_daily_clean.log 2>&1

# 临时目录
rm -rf /tmp/* 2>/dev/null || true
rm -rf /var/tmp/* 2>/dev/null || true
# 系统日志保留 3 天
journalctl --vacuum-time=3d 2>/dev/null || true
# 7 天前的压缩日志删除
find /var/log -type f -name "*.gz" -mtime +7 -delete 2>/dev/null || true
# apt 缓存
apt-get clean 2>/dev/null || true
# 宝塔 request 日志截断
for f in /www/server/panel/logs/request/*.log; do [ -f "$f" ] && truncate -s 0 "$f"; done 2>/dev/null || true
# 网站日志截断（每天轮转，避免单文件过大）
truncate -s 0 /www/wwwlogs/*.log 2>/dev/null || true

echo "[$(date '+%Y-%m-%d %H:%M')] 每日清理完成"
df -h / | tail -1
