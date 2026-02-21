#!/bin/bash
# 存客宝 42.194.245.239 磁盘清理 · 卡若AI 生成
# 在宝塔面板【终端】中粘贴本脚本内容执行，或上传后 bash 本脚本

set -e
echo "========== 存客宝 卡若AI 磁盘清理 =========="
echo "--- 清理前 ---"
df -h /
echo ""
echo "--- 大目录 TOP15 ---"
du -sh /www/* /var/log /tmp 2>/dev/null | sort -rh | head -15
echo ""

# 1. 清理系统日志（保留结构）
echo "[1/6] 清理系统旧日志..."
journalctl --vacuum-time=3d 2>/dev/null || true
find /var/log -type f -name "*.log" -mtime +7 -exec truncate -s 0 {} \; 2>/dev/null || true
find /var/log -type f -name "*.gz" -mtime +7 -delete 2>/dev/null || true

# 2. 清理 apt 缓存（Ubuntu）
echo "[2/6] 清理 apt 缓存..."
apt-get clean 2>/dev/null || true
apt-get autoremove -y 2>/dev/null || true

# 3. 清理临时目录
echo "[3/6] 清理 /tmp /var/tmp..."
rm -rf /tmp/* 2>/dev/null || true
rm -rf /var/tmp/* 2>/dev/null || true

# 4. 宝塔面板日志截断（不删文件）
echo "[4/6] 截断宝塔 request 日志..."
for f in /www/server/panel/logs/request/*.log; do [ -f "$f" ] && truncate -s 0 "$f"; done 2>/dev/null || true

# 5. 网站日志截断（会清空当前日志内容，慎选）
echo "[5/6] 检查网站日志大小..."
du -sh /www/wwwlogs/ 2>/dev/null || true
# 若需清空网站日志，取消下一行注释：
# truncate -s 0 /www/wwwlogs/*.log 2>/dev/null || true

# 6. 回收站（需在面板【文件】里手动清空，此处仅提示）
echo "[6/6] 请在面板【文件】→【回收站】中清空回收站以释放空间。"
echo ""
echo "--- 清理后 ---"
df -h /
echo ""
echo "--- 大目录 TOP15 ---"
du -sh /www/* /var/log /tmp 2>/dev/null | sort -rh | head -15
echo "========== 清理完成 =========="
