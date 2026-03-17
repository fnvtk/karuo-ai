#!/bin/bash
# scrcpy投屏快速启动脚本
# 作者：卡若
# 功能：快速启动scrcpy投屏连接到设备

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
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

log_success() {
    echo -e "${PURPLE}[SUCCESS]${NC} 🎉 $1"
}

echo "📱 scrcpy投屏快速启动工具"
echo "作者: 卡若 | 版本: 1.0.0"
echo "========================================"
echo

# 检查scrcpy是否安装
if ! command -v scrcpy &> /dev/null; then
    log_error "scrcpy未安装，请先安装scrcpy"
    exit 1
fi

# 检查adb是否安装
if ! command -v adb &> /dev/null; then
    log_error "adb未安装，请先安装android-platform-tools"
    exit 1
fi

# 重启ADB服务
log_info "重启ADB服务..."
adb kill-server
adb start-server

# 显示已连接设备
echo
log_info "当前连接的设备:"
adb devices

# 默认设备IP
DEFAULT_IP="192.168.2.15"

# 询问用户是否使用默认IP
echo
read -p "是否连接默认设备 ${DEFAULT_IP}? (Y/n): " use_default
use_default=${use_default:-Y}

if [[ $use_default =~ ^[Yy]$ ]]; then
    device_ip=$DEFAULT_IP
else
    read -p "请输入设备IP地址: " device_ip
fi

if [ -n "$device_ip" ]; then
    log_info "正在连接设备: $device_ip:5555"
    adb connect "$device_ip:5555"
    
    # 等待连接建立
    sleep 2
    
    # 检查连接状态
    if adb devices | grep -q "$device_ip.*device"; then
        log_success "设备连接成功！"
        
        # 启动scrcpy
        log_info "启动投屏..."
        echo "按Ctrl+C可随时退出投屏"
        echo
        
        # 使用高质量设置启动scrcpy
        scrcpy --max-size 1920 --video-bit-rate 8M --max-fps 60 --stay-awake --window-title "投屏: $device_ip" --show-touches
    else
        log_error "设备连接失败，请检查:"
        echo "1. 设备是否开启了无线调试"
        echo "2. 设备和MacBook是否在同一WiFi网络"
        echo "3. 设备IP地址是否正确"
    fi
else
    log_warn "未输入设备IP，尝试使用USB连接..."
    
    # 使用USB连接启动scrcpy
    scrcpy --max-size 1920 --video-bit-rate 8M --max-fps 60 --stay-awake --show-touches
fi

echo
log_info "投屏已结束"