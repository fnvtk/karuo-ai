#!/bin/bash
# 存客宝 42.194.245.239 磁盘清理 · 卡若AI 生成
# 用法：在宝塔【终端】粘贴执行，或 bash 本脚本

echo "========== 存客宝 卡若AI 一次性清理 =========="
echo "--- 清理前 ---"
df -h /
echo ""

# 1. 系统日志
echo "[1/7] 系统旧日志..."
journalctl --vacuum-time=3d 2>/dev/null || true
find /var/log -type f -name "*.log" -mtime +7 -exec truncate -s 0 {} \; 2>/dev/null || true
find /var/log -type f -name "*.gz" -mtime +7 -delete 2>/dev/null || true

# 2. apt
echo "[2/7] apt 缓存..."
apt-get clean 2>/dev/null || true
apt-get autoremove -y 2>/dev/null || true

# 3. 临时目录
echo "[3/7] /tmp /var/tmp..."
rm -rf /tmp/* 2>/dev/null || true
rm -rf /var/tmp/* 2>/dev/null || true

# 4. 宝塔 request 日志
echo "[4/7] 宝塔 request 日志..."
for f in /www/server/panel/logs/request/*.log; do [ -f "$f" ] && truncate -s 0 "$f"; done 2>/dev/null || true

# 5. 网站访问日志（直接清空释放空间）
echo "[5/7] 网站日志..."
truncate -s 0 /www/wwwlogs/*.log 2>/dev/null || true

# 6. 宝塔备份目录中 7 天前的旧备份（可选，按需开启）
# find /www/backup -type f -mtime +7 -delete 2>/dev/null || true

# 7. 回收站需在面板【文件】→【回收站】手动清空
echo "[6/7] 临时与日志已清理。"
echo "[7/7] 请到面板【文件】→【回收站】清空回收站。"
echo ""
echo "--- 清理后 ---"
df -h /
echo "========== 完成 =========="
