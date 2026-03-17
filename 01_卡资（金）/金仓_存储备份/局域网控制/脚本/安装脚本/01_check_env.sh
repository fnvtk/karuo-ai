#!/bin/bash
# 环境检测脚本 - 检查ADB、网络、设备连接
# 作者：卡若
# 日期：$(date +%Y-%m-%d)

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 加载配置
if [ -f "config/env.sample" ]; then
    source config/env.sample
else
    log_warn "配置文件不存在，使用默认值"
    TARGET_IP="192.168.1.100"
    PACKAGE_NAME="com.tencent.mm"
fi

log_info "开始环境检测..."

# 1. 检查ADB工具
log_info "检查ADB工具..."
if command -v adb >/dev/null 2>&1; then
    ADB_VERSION=$(adb version | head -1)
    log_info "ADB已安装: $ADB_VERSION"
else
    log_error "ADB未安装，请先安装Android SDK Platform Tools"
    log_info "安装方法：brew install android-platform-tools"
    exit 1
fi

# 2. 检查网络连通性
log_info "检查网络连通性到 $TARGET_IP..."
if ping -c 3 -W 3000 "$TARGET_IP" >/dev/null 2>&1; then
    log_info "网络连通正常"
else
    log_error "无法连接到目标设备 $TARGET_IP"
    log_info "请检查："
    log_info "1. 设备IP是否正确"
    log_info "2. 设备和电脑是否在同一局域网"
    log_info "3. 设备防火墙设置"
    exit 1
fi

# 3. 检查ADB服务
log_info "检查ADB服务状态..."
adb kill-server >/dev/null 2>&1 || true
adb start-server >/dev/null 2>&1

# 4. 尝试连接设备
log_info "尝试连接设备 $TARGET_IP:5555..."
adb connect "$TARGET_IP:5555" >/dev/null 2>&1

# 等待连接稳定
sleep 2

# 5. 检查设备连接状态
log_info "检查设备连接状态..."
DEVICE_STATUS=$(adb devices | grep "$TARGET_IP" | awk '{print $2}' || echo "offline")

if [ "$DEVICE_STATUS" = "device" ]; then
    log_info "设备连接成功"
else
    log_error "设备连接失败，状态: $DEVICE_STATUS"
    log_info "请检查："
    log_info "1. 设备是否开启USB调试"
    log_info "2. 设备是否开启无线ADB调试"
    log_info "3. 是否已授权此电脑的ADB连接"
    
    # 显示当前连接的设备
    log_info "当前ADB设备列表："
    adb devices
    exit 1
fi

# 6. 获取设备基本信息
log_info "获取设备信息..."
ANDROID_VERSION=$(adb shell getprop ro.build.version.release 2>/dev/null || echo "未知")
DEVICE_MODEL=$(adb shell getprop ro.product.model 2>/dev/null || echo "未知")
CPU_ABI=$(adb shell getprop ro.product.cpu.abilist 2>/dev/null || echo "未知")
AVAILABLE_SPACE=$(adb shell df /data 2>/dev/null | tail -1 | awk '{print $4}' || echo "未知")

log_info "设备型号: $DEVICE_MODEL"
log_info "Android版本: $ANDROID_VERSION"
log_info "CPU架构: $CPU_ABI"
log_info "可用空间: $AVAILABLE_SPACE KB"

# 7. 检查开发者选项
log_info "检查开发者选项..."
DEV_OPTIONS=$(adb shell settings get global development_settings_enabled 2>/dev/null || echo "0")
if [ "$DEV_OPTIONS" = "1" ]; then
    log_info "开发者选项已启用"
else
    log_warn "开发者选项未启用，可能影响某些功能"
fi

# 8. 检查未知来源安装权限
log_info "检查未知来源安装权限..."
UNKNOWN_SOURCES=$(adb shell settings get secure install_non_market_apps 2>/dev/null || echo "0")
if [ "$UNKNOWN_SOURCES" = "1" ]; then
    log_info "允许安装未知来源应用"
else
    log_warn "未允许安装未知来源应用，将在安装时自动设置"
fi

# 9. 检查存储空间
log_info "检查存储空间..."
if [ "$AVAILABLE_SPACE" != "未知" ] && [ "$AVAILABLE_SPACE" -lt 1048576 ]; then
    log_warn "可用存储空间不足1GB，可能影响应用安装"
fi

# 10. 保存设备信息到日志
DEVICE_INFO_FILE="logs/device_info_$(date +%Y%m%d_%H%M%S).txt"
cat > "$DEVICE_INFO_FILE" << EOF
设备信息检测报告
生成时间: $(date)
目标IP: $TARGET_IP
设备型号: $DEVICE_MODEL
Android版本: $ANDROID_VERSION
CPU架构: $CPU_ABI
可用空间: $AVAILABLE_SPACE KB
连接状态: $DEVICE_STATUS
开发者选项: $DEV_OPTIONS
未知来源: $UNKNOWN_SOURCES
EOF

log_info "设备信息已保存到: $DEVICE_INFO_FILE"
log_info "环境检测完成！设备已就绪，可以进行下一步操作。"

exit 0