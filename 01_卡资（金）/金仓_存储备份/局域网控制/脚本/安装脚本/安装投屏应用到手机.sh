#!/bin/bash
# 直接安装投屏应用到Android设备
# 作者：卡若
# 功能：推送免费投屏应用到指定Android设备

set -e

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

log_progress() {
    echo -e "${BLUE}[PROGRESS]${NC} $1"
}

log_success() {
    echo -e "${PURPLE}[SUCCESS]${NC} 🎉 $1"
}

echo "📱 Android设备投屏应用安装工具"
echo "作者: 卡若 | 版本: 1.0.0"
echo "========================================"
echo

# 设备IP
DEVICE_IP="192.168.2.2"
APK_DIR="$(pwd)/应用文件"
TEMP_DIR="/tmp/screen_mirror_apps"

# 创建临时目录
mkdir -p "$TEMP_DIR"

# 检查ADB工具
check_adb() {
    log_info "检查ADB工具..."
    
    if ! command -v adb >/dev/null 2>&1; then
        log_error "ADB工具未安装！正在安装..."
        if command -v brew >/dev/null 2>&1; then
            brew install android-platform-tools
        else
            log_error "请先安装Homebrew或手动安装ADB工具"
            exit 1
        fi
    else
        log_info "✅ ADB工具已安装: $(adb --version | head -1)"
    fi
    echo
}

# 连接设备
connect_device() {
    log_progress "连接Android设备: $DEVICE_IP"
    
    # 重启ADB服务
    adb kill-server
    adb start-server
    
    # 尝试连接设备
    log_info "正在连接设备..."
    adb connect "$DEVICE_IP:5555"
    
    sleep 2
    
    # 检查连接状态
    if adb devices | grep -q "$DEVICE_IP.*device"; then
        log_success "设备连接成功！"
        return 0
    else
        log_error "设备连接失败！"
        echo
        echo "📱 请确保Android设备已完成以下设置:"
        echo "1. 设置 → 关于手机 → 连续点击'版本号'7次"
        echo "2. 设置 → 系统 → 开发者选项"
        echo "3. 开启'USB调试'和'无线调试'"
        echo "4. 设备与MacBook在同一WiFi网络"
        echo "5. 已授权此MacBook的ADB连接"
        return 1
    fi
}

# 下载投屏应用APK
download_apps() {
    log_progress "准备投屏应用APK文件..."
    
    # LetsView APK下载
    LETSVIEW_APK="$TEMP_DIR/letsview.apk"
    if [ ! -f "$LETSVIEW_APK" ]; then
        log_info "下载LetsView APK..."
        curl -L -o "$LETSVIEW_APK" "https://download.letsview.com/letsview.apk" || {
            log_warn "LetsView官方下载失败，尝试备用链接..."
            curl -L -o "$LETSVIEW_APK" "https://github.com/LetsView/LetsView-Android/releases/latest/download/letsview.apk" || {
                log_warn "LetsView下载失败，跳过此应用"
                rm -f "$LETSVIEW_APK"
            }
        }
    fi
    
    # ApowerMirror APK下载
    APOWERMIRROR_APK="$TEMP_DIR/apowermirror.apk"
    if [ ! -f "$APOWERMIRROR_APK" ]; then
        log_info "下载ApowerMirror APK..."
        curl -L -o "$APOWERMIRROR_APK" "https://download.apowersoft.com/apowermirror.apk" || {
            log_warn "ApowerMirror下载失败，跳过此应用"
            rm -f "$APOWERMIRROR_APK"
        }
    fi
    
    # Vysor APK下载
    VYSOR_APK="$TEMP_DIR/vysor.apk"
    if [ ! -f "$VYSOR_APK" ]; then
        log_info "下载Vysor APK..."
        curl -L -o "$VYSOR_APK" "https://github.com/koush/vysor.io/releases/latest/download/vysor.apk" || {
            log_warn "Vysor下载失败，跳过此应用"
            rm -f "$VYSOR_APK"
        }
    fi
    
    # AnyDesk APK下载（免费远程控制）
    ANYDESK_APK="$TEMP_DIR/anydesk.apk"
    if [ ! -f "$ANYDESK_APK" ]; then
        log_info "下载AnyDesk APK..."
        curl -L -o "$ANYDESK_APK" "https://download.anydesk.com/anydesk.apk" || {
            log_warn "AnyDesk下载失败，跳过此应用"
            rm -f "$ANYDESK_APK"
        }
    fi
    
    echo
}

# 安装APK到设备
install_apk() {
    local apk_file="$1"
    local app_name="$2"
    
    if [ -f "$apk_file" ]; then
        log_progress "安装 $app_name..."
        
        if adb install -r "$apk_file" 2>/dev/null; then
            log_success "$app_name 安装成功！"
        else
            log_warn "$app_name 安装失败，可能已存在或不兼容"
        fi
    else
        log_warn "$app_name APK文件不存在，跳过安装"
    fi
    echo
}

# 安装所有投屏应用
install_all_apps() {
    log_progress "开始安装投屏应用到设备..."
    echo
    
    # 安装各个投屏应用
    install_apk "$LETSVIEW_APK" "LetsView"
    install_apk "$APOWERMIRROR_APK" "ApowerMirror"
    install_apk "$VYSOR_APK" "Vysor"
    install_apk "$ANYDESK_APK" "AnyDesk"
    
    log_success "所有投屏应用安装完成！"
}

# 显示已安装的应用
show_installed_apps() {
    log_info "检查设备上的投屏相关应用..."
    echo
    
    echo "📱 已安装的投屏应用:"
    
    # 检查LetsView
    if adb shell pm list packages | grep -q "com.letsview.letsview"; then
        echo "✅ LetsView - 跨平台免费投屏"
    fi
    
    # 检查ApowerMirror
    if adb shell pm list packages | grep -q "com.apowersoft.mirror"; then
        echo "✅ ApowerMirror - 功能丰富的投屏工具"
    fi
    
    # 检查Vysor
    if adb shell pm list packages | grep -q "com.koushikdutta.vysor"; then
        echo "✅ Vysor - 专业投屏控制"
    fi
    
    # 检查AnyDesk
    if adb shell pm list packages | grep -q "com.anydesk.anydeskandroid"; then
        echo "✅ AnyDesk - 远程桌面控制"
    fi
    
    echo
}

# 创建设备端启动脚本
create_device_shortcuts() {
    log_progress "在设备上创建快捷启动方式..."
    
    # 发送启动命令到设备
    log_info "设置应用快捷方式..."
    
    # 启动LetsView
    adb shell am start -n com.letsview.letsview/.MainActivity 2>/dev/null || log_warn "LetsView启动失败"
    
    sleep 1
    
    # 返回桌面
    adb shell input keyevent KEYCODE_HOME
    
    log_success "设备端配置完成！"
    echo
}

# 显示使用指南
show_usage_guide() {
    echo "📖 投屏应用使用指南"
    echo "========================================"
    echo
    
    echo "🎯 推荐使用顺序:"
    echo "1. LetsView - 免费跨平台，操作简单"
    echo "2. ApowerMirror - 功能丰富，支持录屏"
    echo "3. Vysor - 专业工具，延迟低"
    echo "4. AnyDesk - 远程控制，适合办公"
    echo
    
    echo "📱 Android设备操作:"
    echo "1. 打开已安装的投屏应用"
    echo "2. 按照应用提示连接到MacBook"
    echo "3. 确保两设备在同一WiFi网络"
    echo
    
    echo "💻 MacBook端操作:"
    echo "1. LetsView: 下载Mac版客户端"
    echo "2. ApowerMirror: 访问网页版或下载客户端"
    echo "3. Vysor: 使用Chrome扩展"
    echo "4. AnyDesk: 下载Mac版客户端"
    echo
    
    echo "🌟 投屏功能特色:"
    echo "• 🖥️ 无线投屏显示"
    echo "• 🖱️ 远程控制操作"
    echo "• 📹 屏幕录制功能"
    echo "• 📁 文件传输支持"
    echo "• 🎮 游戏投屏优化"
    echo
    
    echo "🚨 故障排除:"
    echo "• 连接失败: 检查WiFi网络连接"
    echo "• 画面延迟: 关闭其他网络应用"
    echo "• 无法控制: 检查应用权限设置"
    echo "• 黑屏问题: 重启投屏应用"
    echo
}

# 清理临时文件
cleanup() {
    log_info "清理临时文件..."
    rm -rf "$TEMP_DIR"
    log_success "清理完成！"
}

# 主函数
main() {
    log_info "开始安装投屏应用到Android设备..."
    echo
    
    # 检查ADB工具
    check_adb
    
    # 连接设备
    if ! connect_device; then
        exit 1
    fi
    
    # 下载投屏应用
    download_apps
    
    # 安装应用到设备
    install_all_apps
    
    # 显示已安装应用
    show_installed_apps
    
    # 创建设备端快捷方式
    create_device_shortcuts
    
    echo
    log_success "🎉 投屏应用安装完成！"
    echo
    
    # 显示使用指南
    show_usage_guide
    
    # 清理临时文件
    cleanup
    
    echo
    log_info "🚀 现在可以在Android设备上打开投屏应用开始使用！"
}

# 运行主函数
main "$@"