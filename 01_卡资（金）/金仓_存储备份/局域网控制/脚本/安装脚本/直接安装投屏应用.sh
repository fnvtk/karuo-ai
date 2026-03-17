#!/bin/bash

# 直接安装投屏应用到手机
# 作者: 卡若
# 版本: 1.0.0

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} 🎉 $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_progress() {
    echo -e "${YELLOW}[PROGRESS]${NC} $1"
}

echo "📱 直接安装投屏应用到手机"
echo "作者: 卡若 | 版本: 1.0.0"
echo "========================================"
echo

# 检查ADB
if ! command -v adb &> /dev/null; then
    log_error "ADB工具未安装，请先安装Android SDK Platform Tools"
    exit 1
fi

log_info "ADB工具已安装: $(adb version | head -n1)"

# 连接设备
DEVICE_IP="192.168.2.15"
log_progress "连接Android设备: $DEVICE_IP"

# 重启ADB服务
adb kill-server
adb start-server

# 连接设备
log_info "正在连接设备..."
adb connect $DEVICE_IP:5555

# 检查连接状态
if ! adb devices | grep -q "$DEVICE_IP:5555.*device"; then
    log_error "设备连接失败，请检查:"
    echo "1. 设备IP是否正确: $DEVICE_IP"
    echo "2. 设备是否开启了无线调试"
    echo "3. 设备和电脑是否在同一网络"
    exit 1
fi

log_success "设备连接成功！"

# 创建下载目录
mkdir -p "./apk_downloads"

# 投屏应用安装函数
install_app() {
    local app_name="$1"
    local package_name="$2"
    local download_url="$3"
    local apk_file="./apk_downloads/${app_name}.apk"
    
    echo
    log_info "处理 $app_name..."
    
    # 检查是否已安装
    if adb shell pm list packages | grep -q "$package_name"; then
        log_success "$app_name 已安装，跳过"
        return 0
    fi
    
    # 下载APK
    log_info "正在下载 $app_name..."
    if curl -L -o "$apk_file" "$download_url" --connect-timeout 30 --max-time 300; then
        # 检查文件大小
        file_size=$(stat -f%z "$apk_file" 2>/dev/null || echo "0")
        if [ "$file_size" -lt 1000000 ]; then  # 小于1MB可能是错误页面
            log_error "$app_name 下载文件异常（大小: ${file_size}字节），跳过安装"
            rm -f "$apk_file"
            return 1
        fi
        
        log_success "$app_name 下载完成（大小: ${file_size}字节）"
        
        # 安装APK
        log_info "正在安装 $app_name..."
        if adb install "$apk_file"; then
            log_success "$app_name 安装成功！"
            rm -f "$apk_file"  # 删除APK文件
        else
            log_error "$app_name 安装失败"
            return 1
        fi
    else
        log_error "$app_name 下载失败"
        return 1
    fi
}

# 安装投屏应用
log_progress "开始安装投屏应用..."

# scrcpy (开源免费)
install_app "scrcpy" "" "https://github.com/Genymobile/scrcpy/releases/latest/download/scrcpy-android.apk" || true

# Vysor (免费版本)
install_app "Vysor" "com.koushikdutta.vysor" "https://github.com/koush/vysor.io/releases/latest/download/vysor.apk" || true

# AnyDesk (官方)
install_app "AnyDesk" "com.anydesk.anydeskandroid" "https://download.anydesk.com/anydesk.apk" || true

# TeamViewer QuickSupport
install_app "TeamViewer" "com.teamviewer.quicksupport.market" "https://download.teamviewer.com/download/TeamViewerQS.apk" || true

echo
log_success "投屏应用安装完成！"
echo
echo "📋 已安装的应用:"
adb shell pm list packages | grep -E "(vysor|anydesk|teamviewer|letsview|mirror)" | sed 's/package:/• /' || echo "• 请手动检查已安装应用"

echo
echo "🎯 使用指南:"
echo "1. 在手机上打开任意投屏应用"
echo "2. 按照应用提示进行配置"
echo "3. 在MacBook上安装对应的客户端软件"
echo "4. 建立连接开始投屏"
echo
echo "💡 推荐使用顺序:"
echo "1. AnyDesk - 功能全面，支持控制"
echo "2. TeamViewer - 稳定可靠"
echo "3. Vysor - 专为Android设计"
echo
echo "📞 如需帮助，联系卡若: 微信 28533368"
echo

log_success "脚本执行完成！"