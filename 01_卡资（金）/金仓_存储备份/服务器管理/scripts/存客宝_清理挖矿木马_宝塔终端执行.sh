#!/bin/bash
# 存客宝 42.194.245.239 清理 Linux.Risk.Miner.Jcnw 挖矿木马
# 在宝塔面板【终端】复制整段粘贴执行
# 腾讯云告警：/tmp/.esd101/.system3d

echo "========== 存客宝 挖矿木马清理 =========="
echo ""

f="/tmp/.esd101/.system3d"
echo "[1] 结束占用该文件的进程"
if [ -f "$f" ]; then
  for pid in $(lsof -t "$f" 2>/dev/null); do kill -9 $pid 2>/dev/null && echo "  已结束 PID $pid"; done
fi
pkill -9 -f ".esd101" 2>/dev/null && echo "  已结束 .esd101 相关进程" || true
pkill -9 -f ".system3d" 2>/dev/null && echo "  已结束 .system3d 相关进程" || true
sleep 1

echo ""
echo "[2] 删除恶意文件及目录"
rm -rf /tmp/.esd101 2>/dev/null && echo "  已删除 /tmp/.esd101" || echo "  目录不存在或已删"

echo ""
echo "[3] 检查 /tmp 下隐藏目录"
ls -la /tmp/ | head -20

echo ""
echo "[4] 检查 crontab 可疑项"
crontab -l 2>/dev/null | grep -v "^#" || echo "  无"
grep -r "\.esd101\|\.system3d\|/tmp/\." /etc/cron* 2>/dev/null || echo "  无"

echo ""
echo "[5] 当前高 CPU 进程（前 8）"
ps aux --sort=-%cpu | head -10

echo ""
echo "========== 完成 =========="
echo "建议：腾讯云控制台 → 主机安全 → 入侵检测 → 文件查杀，确认处置并开启防护。"
