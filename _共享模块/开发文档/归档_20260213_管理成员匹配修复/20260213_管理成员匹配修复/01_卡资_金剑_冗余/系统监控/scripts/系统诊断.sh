#!/bin/bash
# 系统快速诊断脚本
# 使用方法: chmod +x 系统诊断.sh && ./系统诊断.sh

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║           🖥️  系统诊断报告                            ║"
echo "║           $(date '+%Y-%m-%d %H:%M:%S')                          ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# 1. 系统信息
echo "📋 系统信息"
echo "=========================================="
sw_vers | awk -F: '{printf "%-20s %s\n", $1":", $2}'
echo "处理器:              $(sysctl -n machdep.cpu.brand_string 2>/dev/null || echo 'Apple Silicon')"
echo ""

# 2. 运行时间和负载
echo "⏱️  运行时间和负载"
echo "=========================================="
uptime
echo ""

# 3. 内存状态
echo "🧠 内存状态"
echo "=========================================="
# 获取物理内存
TOTAL_MEM=$(sysctl -n hw.memsize 2>/dev/null)
TOTAL_GB=$(echo "scale=1; $TOTAL_MEM / 1024 / 1024 / 1024" | bc)
echo "物理内存:            ${TOTAL_GB} GB"

# 内存压力
PRESSURE=$(memory_pressure 2>/dev/null | grep "System-wide" | awk '{print $NF}')
echo "内存压力:            $PRESSURE"
echo ""

# 4. 磁盘空间
echo "💾 磁盘空间"
echo "=========================================="
df -h /System/Volumes/Data | awk 'NR==1{print "文件系统\t\t大小\t已用\t可用\t使用率"} NR==2{print $1"\t"$2"\t"$3"\t"$4"\t"$5}'
echo ""

# 5. CPU 占用 TOP5
echo "🔥 CPU 占用 TOP5"
echo "=========================================="
printf "%-12s %8s %s\n" "用户" "CPU%" "进程"
echo "----------------------------------------"
ps aux | sort -nrk 3 | head -6 | tail -5 | awk '{printf "%-12s %7s%% %s\n", $1, $3, $11}'
echo ""

# 6. 内存占用 TOP5
echo "📦 内存占用 TOP5"
echo "=========================================="
printf "%-12s %8s %s\n" "用户" "内存%" "进程"
echo "----------------------------------------"
ps aux | sort -nrk 4 | head -6 | tail -5 | awk '{printf "%-12s %7s%% %s\n", $1, $4, $11}'
echo ""

# 7. 监听端口
echo "🌐 监听端口 (开发相关)"
echo "=========================================="
for port in 3000 3306 5173 8000 8080 27017 6379 5432; do
    PROC=$(lsof -i :$port -sTCP:LISTEN 2>/dev/null | awk 'NR==2{print $1}')
    if [ -n "$PROC" ]; then
        echo "   :$port → $PROC"
    fi
done
echo ""

# 8. Docker 状态（如果安装）
if command -v docker &> /dev/null; then
    echo "🐳 Docker 状态"
    echo "=========================================="
    RUNNING=$(docker ps -q 2>/dev/null | wc -l | tr -d ' ')
    TOTAL=$(docker ps -aq 2>/dev/null | wc -l | tr -d ' ')
    IMAGES=$(docker images -q 2>/dev/null | wc -l | tr -d ' ')
    echo "   运行中容器: $RUNNING / $TOTAL"
    echo "   镜像数量:   $IMAGES"
    echo ""
fi

# 9. 网络状态
echo "📡 网络状态"
echo "=========================================="
WIFI_NAME=$(/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -I 2>/dev/null | grep ' SSID' | awk '{print $2}')
if [ -n "$WIFI_NAME" ]; then
    echo "   WiFi: $WIFI_NAME"
fi
EXTERNAL_IP=$(curl -s --connect-timeout 3 ip.sb 2>/dev/null || echo "获取失败")
echo "   外网IP: $EXTERNAL_IP"
echo ""

# 10. 健康评估
echo "📊 健康评估"
echo "=========================================="

# 检查磁盘
DISK_AVAIL=$(df /System/Volumes/Data | awk 'NR==2{print $4}' | tr -d 'Gi')
if [ "$DISK_AVAIL" -lt 50 ]; then
    echo "   ⚠️  磁盘空间不足 (<50GB)"
elif [ "$DISK_AVAIL" -lt 100 ]; then
    echo "   ⚡ 磁盘空间一般 (50-100GB)"
else
    echo "   ✅ 磁盘空间充足 (>100GB)"
fi

# 检查内存压力
if [ "$PRESSURE" = "normal" ]; then
    echo "   ✅ 内存压力正常"
elif [ "$PRESSURE" = "warn" ]; then
    echo "   ⚠️  内存压力警告"
else
    echo "   🔴 内存压力严重"
fi

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║           ✅ 诊断完成                                 ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
