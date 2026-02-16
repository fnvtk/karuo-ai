#!/bin/bash
# 获取所有Android设备的IMEI和详细信息
# 作者：卡若
# 版本：1.0.0

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# 日志函数
log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }

echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║${NC}          ${GREEN}Android 设备信息获取工具${NC}                      ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}          ${BLUE}获取IMEI、序列号、设备ID等信息${NC}                ${CYAN}║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo

# 检查ADB
if ! command -v adb >/dev/null 2>&1; then
    log_error "ADB未安装，请运行: brew install android-platform-tools"
    exit 1
fi

# 重启ADB服务
log_info "重启ADB服务..."
adb kill-server >/dev/null 2>&1 || true
adb start-server >/dev/null 2>&1
sleep 2

# 获取已连接设备列表
log_info "检查已连接设备..."
DEVICES=($(adb devices | grep -v "List" | grep "device$" | awk '{print $1}'))

if [ ${#DEVICES[@]} -eq 0 ]; then
    log_warn "未发现已连接的设备"
    echo
    echo "建议："
    echo "1. 确保设备已开启USB调试"
    echo "2. 连接设备: adb connect <IP>:5555"
    echo "3. 在设备上授权这台电脑"
    exit 1
fi

log_success "发现 ${#DEVICES[@]} 台设备"
echo

# 创建报告文件
REPORT_FILE="$HOME/设备详细信息_$(date +%Y%m%d_%H%M%S).txt"
CSV_FILE="$HOME/设备信息汇总_$(date +%Y%m%d_%H%M%S).csv"

# 写入CSV表头
echo "设备ID,IP地址,品牌,型号,Android版本,API级别,CPU架构,序列号,IMEI1,IMEI2,ANDROID_ID,MAC地址,存储空间,内存大小,电池电量,屏幕分辨率" > "$CSV_FILE"

# 遍历每个设备
for i in "${!DEVICES[@]}"; do
    DEVICE="${DEVICES[$i]}"
    NUM=$((i + 1))
    
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}设备 $NUM: $DEVICE${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    {
        echo "========================================"
        echo "设备 $NUM: $DEVICE"
        echo "扫描时间: $(date '+%Y-%m-%d %H:%M:%S')"
        echo "========================================"
        echo
    } >> "$REPORT_FILE"
    
    # 基本信息
    echo -e "${BLUE}基本信息:${NC}"
    BRAND=$(adb -s "$DEVICE" shell getprop ro.product.brand 2>/dev/null | tr -d '\r' || echo "未知")
    MODEL=$(adb -s "$DEVICE" shell getprop ro.product.model 2>/dev/null | tr -d '\r' || echo "未知")
    ANDROID_VERSION=$(adb -s "$DEVICE" shell getprop ro.build.version.release 2>/dev/null | tr -d '\r' || echo "未知")
    SDK_VERSION=$(adb -s "$DEVICE" shell getprop ro.build.version.sdk 2>/dev/null | tr -d '\r' || echo "未知")
    CPU_ABI=$(adb -s "$DEVICE" shell getprop ro.product.cpu.abi 2>/dev/null | tr -d '\r' || echo "未知")
    
    echo "  品牌: $BRAND"
    echo "  型号: $MODEL"
    echo "  Android版本: $ANDROID_VERSION (API $SDK_VERSION)"
    echo "  CPU架构: $CPU_ABI"
    
    {
        echo "基本信息:"
        echo "  品牌: $BRAND"
        echo "  型号: $MODEL"
        echo "  Android版本: $ANDROID_VERSION"
        echo "  API级别: $SDK_VERSION"
        echo "  CPU架构: $CPU_ABI"
        echo
    } >> "$REPORT_FILE"
    
    # 设备标识
    echo
    echo -e "${BLUE}设备标识:${NC}"
    
    # 序列号
    SERIAL=$(adb -s "$DEVICE" shell getprop ro.serialno 2>/dev/null | tr -d '\r' || echo "未知")
    echo "  序列号: $SERIAL"
    
    # IMEI（多种方法尝试）
    IMEI1="未知"
    IMEI2="未知"
    
    # 方法1: service call
    IMEI_RAW=$(adb -s "$DEVICE" shell "service call iphonesubinfo 1" 2>/dev/null | grep -o "[0-9a-f]\{8\}" | while read hex; do echo -n "\x${hex:6:2}\x${hex:4:2}\x${hex:2:2}\x${hex:0:2}"; done | tr -d '.' | tr -d '\0' || echo "")
    if [ -n "$IMEI_RAW" ] && [ "$IMEI_RAW" != "" ]; then
        IMEI1="$IMEI_RAW"
    fi
    
    # 方法2: dumpsys
    if [ "$IMEI1" == "未知" ]; then
        IMEI1=$(adb -s "$DEVICE" shell "dumpsys iphonesubinfo" 2>/dev/null | grep "Device ID" | head -1 | cut -d'=' -f2 | tr -d ' \r' || echo "未知")
    fi
    
    # 方法3: getprop
    if [ "$IMEI1" == "未知" ]; then
        IMEI1=$(adb -s "$DEVICE" shell getprop gsm.device.imei0 2>/dev/null | tr -d '\r' || echo "未知")
    fi
    
    # 尝试获取第二个IMEI（双卡设备）
    IMEI2=$(adb -s "$DEVICE" shell "service call iphonesubinfo 2" 2>/dev/null | grep -o "[0-9a-f]\{8\}" | while read hex; do echo -n "\x${hex:6:2}\x${hex:4:2}\x${hex:2:2}\x${hex:0:2}"; done | tr -d '.' | tr -d '\0' || echo "")
    if [ -z "$IMEI2" ] || [ "$IMEI2" == "" ]; then
        IMEI2=$(adb -s "$DEVICE" shell getprop gsm.device.imei1 2>/dev/null | tr -d '\r' || echo "未知")
    fi
    
    echo "  IMEI1: $IMEI1"
    if [ "$IMEI2" != "未知" ] && [ "$IMEI2" != "" ]; then
        echo "  IMEI2: $IMEI2"
    fi
    
    # Android ID
    ANDROID_ID=$(adb -s "$DEVICE" shell settings get secure android_id 2>/dev/null | tr -d '\r' || echo "未知")
    echo "  Android ID: $ANDROID_ID"
    
    # MAC地址
    MAC=$(adb -s "$DEVICE" shell "cat /sys/class/net/wlan0/address" 2>/dev/null | tr -d '\r' || echo "未知")
    echo "  MAC地址: $MAC"
    
    {
        echo "设备标识:"
        echo "  序列号: $SERIAL"
        echo "  IMEI1: $IMEI1"
        echo "  IMEI2: $IMEI2"
        echo "  Android ID: $ANDROID_ID"
        echo "  MAC地址: $MAC"
        echo
    } >> "$REPORT_FILE"
    
    # 硬件信息
    echo
    echo -e "${BLUE}硬件信息:${NC}"
    
    # 存储空间
    STORAGE=$(adb -s "$DEVICE" shell "df /data | tail -1" 2>/dev/null | awk '{print $2}' | tr -d '\r' || echo "未知")
    STORAGE_USED=$(adb -s "$DEVICE" shell "df /data | tail -1" 2>/dev/null | awk '{print $3}' | tr -d '\r' || echo "未知")
    STORAGE_FREE=$(adb -s "$DEVICE" shell "df /data | tail -1" 2>/dev/null | awk '{print $4}' | tr -d '\r' || echo "未知")
    
    echo "  存储空间: $STORAGE KB (已用: $STORAGE_USED KB, 可用: $STORAGE_FREE KB)"
    
    # 内存
    MEM_TOTAL=$(adb -s "$DEVICE" shell "cat /proc/meminfo | grep MemTotal" 2>/dev/null | awk '{print $2}' | tr -d '\r' || echo "未知")
    MEM_FREE=$(adb -s "$DEVICE" shell "cat /proc/meminfo | grep MemFree" 2>/dev/null | awk '{print $2}' | tr -d '\r' || echo "未知")
    
    echo "  内存: $MEM_TOTAL KB (可用: $MEM_FREE KB)"
    
    # 电池
    BATTERY=$(adb -s "$DEVICE" shell "dumpsys battery | grep level" 2>/dev/null | cut -d':' -f2 | tr -d ' \r' || echo "未知")
    echo "  电池电量: $BATTERY%"
    
    # 屏幕分辨率
    RESOLUTION=$(adb -s "$DEVICE" shell "wm size" 2>/dev/null | grep "Physical size" | cut -d':' -f2 | tr -d ' \r' || echo "未知")
    echo "  屏幕分辨率: $RESOLUTION"
    
    {
        echo "硬件信息:"
        echo "  存储总容量: $STORAGE KB"
        echo "  存储已使用: $STORAGE_USED KB"
        echo "  存储可用: $STORAGE_FREE KB"
        echo "  内存总量: $MEM_TOTAL KB"
        echo "  内存可用: $MEM_FREE KB"
        echo "  电池电量: $BATTERY%"
        echo "  屏幕分辨率: $RESOLUTION"
        echo
    } >> "$REPORT_FILE"
    
    # 提取IP地址
    IP_ADDR=$(echo "$DEVICE" | cut -d':' -f1)
    
    # 写入CSV
    echo "$DEVICE,$IP_ADDR,$BRAND,$MODEL,$ANDROID_VERSION,$SDK_VERSION,$CPU_ABI,$SERIAL,$IMEI1,$IMEI2,$ANDROID_ID,$MAC,$STORAGE KB,$MEM_TOTAL KB,$BATTERY%,$RESOLUTION" >> "$CSV_FILE"
    
    echo
done

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo

log_success "设备信息获取完成！"
echo
echo "报告文件:"
echo "  详细报告: $REPORT_FILE"
echo "  CSV汇总: $CSV_FILE"
echo

# 在Finder中显示文件
if [[ "$OSTYPE" == "darwin"* ]]; then
    open -R "$REPORT_FILE"
fi

# 显示CSV内容预览
echo -e "${GREEN}CSV 数据预览:${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
head -5 "$CSV_FILE"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo

log_info "提示: 可以用Excel或Numbers打开CSV文件查看完整信息"

exit 0
