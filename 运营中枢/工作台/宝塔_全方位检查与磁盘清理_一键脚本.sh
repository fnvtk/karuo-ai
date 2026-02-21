#!/bin/bash
# 宝塔服务器 全方位检查 + 磁盘清理 · 卡若AI 生成
# 用法：在宝塔面板【终端】复制整段粘贴执行
# 适用：存客宝 42.194.245.239、kr宝塔 43.139.27.93

echo "=============================================="
echo "  宝塔服务器 · 全方位检查 + 磁盘清理"
echo "  卡若AI 生成 | $(date '+%Y-%m-%d %H:%M:%S')"
echo "=============================================="

# ========== 一、检查阶段 ==========
echo ""
echo "【一】检查阶段"
echo "--- 1.1 系统负载与内存 ---"
uptime
free -h

echo ""
echo "--- 1.2 磁盘使用（清理前）---"
df -h

echo ""
echo "--- 1.3 根目录各分区占用 Top12 ---"
du -h --max-depth=1 / 2>/dev/null | sort -hr | head -15

echo ""
echo "--- 1.4 /www 子目录占用 ---"
du -sh /www/* 2>/dev/null | sort -hr

echo ""
echo "--- 1.5 网站日志大小 ---"
du -sh /www/wwwlogs/* 2>/dev/null || echo "(无或不可读)"
ls -la /www/wwwlogs/*.log 2>/dev/null | head -20

echo ""
echo "--- 1.6 宝塔日志与备份 ---"
du -sh /www/server/panel/logs/ 2>/dev/null || true
du -sh /www/backup/ 2>/dev/null || true

echo ""
echo "--- 1.7 /var/log 占用 ---"
du -sh /var/log/* 2>/dev/null | sort -hr | head -10

echo ""
echo "--- 1.8 /tmp 与 大文件(>100M) ---"
du -sh /tmp /var/tmp 2>/dev/null || true
find / -xdev -type f -size +100M 2>/dev/null | head -15

echo ""
echo "--- 1.9 Docker 未用资源（如有）---"
docker system df 2>/dev/null || echo "(Docker 未安装或未运行)"

echo ""
echo "=============================================="
echo "【二】清理阶段"
echo "=============================================="

# 2.1 系统日志
echo "[1/8] 系统 journalctl 保留3天..."
journalctl --vacuum-time=3d 2>/dev/null || true

echo "[2/8] /var/log 7天前 .log 截断、.gz 删除..."
find /var/log -type f -name "*.log" -mtime +7 -exec truncate -s 0 {} \; 2>/dev/null || true
find /var/log -type f -name "*.gz" -mtime +7 -delete 2>/dev/null || true

echo "[3/8] apt 缓存..."
apt-get clean 2>/dev/null || true
apt-get autoremove -y 2>/dev/null || true

echo "[4/8] /tmp /var/tmp..."
rm -rf /tmp/* 2>/dev/null || true
rm -rf /var/tmp/* 2>/dev/null || true

echo "[5/8] 宝塔 request 日志截断..."
for f in /www/server/panel/logs/request/*.log; do [ -f "$f" ] && truncate -s 0 "$f"; done 2>/dev/null || true

echo "[6/8] 网站访问日志截断..."
truncate -s 0 /www/wwwlogs/*.log 2>/dev/null || true

echo "[7/8] 大于50M的网站日志单独截断（保险）..."
find /www/wwwlogs -name "*.log" -size +50M -exec truncate -s 0 {} \; 2>/dev/null || true

echo "[8/8] Docker  prune（如有且确认）..."
# docker system prune -f 2>/dev/null || true   # 默认注释，按需开启

echo ""
echo "=============================================="
echo "【三】清理后状态"
echo "=============================================="
df -h
echo ""
echo "--- 释放空间概览 ---"
echo "请对比上方「清理前」与「清理后」的 df -h 输出。"
echo ""
echo "⚠️ 请到宝塔面板【文件】→【回收站】手动清空回收站以进一步释放空间。"
echo ""
echo "=============================================="
echo "  完成 | $(date '+%Y-%m-%d %H:%M:%S')"
echo "=============================================="
