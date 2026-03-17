#!/bin/bash
# 快速安装投屏应用到Android设备
# 作者：卡若
# 功能：通过Google Play商店和APK快速安装投屏应用

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

echo "📱 快速投屏应用安装工具"
echo "作者: 卡若 | 版本: 2.0.0"
echo "========================================"
echo

# 设备IP
DEVICE_IP="192.168.2.2"

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

# 从百度手机助手下载并安装应用
download_and_install_baidu_app() {
    local app_name="$1"
    local apk_file="./apk_downloads/${app_name}.apk"
    
    log_info "下载 $app_name..."
    
    # 检查应用是否已安装
    case "$app_name" in
        "LetsView")
            package_name="com.letsview.letsview"
            download_url="https://github.com/letsview/letsview-android/releases/latest/download/letsview.apk"
            ;;
        "ApowerMirror")
            package_name="com.apowersoft.mirror"
            download_url="https://download.apowersoft.com/down.php?softid=apowermirror-android"
            ;;
        "Vysor")
            package_name="com.koushikdutta.vysor"
            download_url="https://nuts.vysor.io/download/android"
            ;;
        "AnyDesk")
            package_name="com.anydesk.anydeskandroid"
            download_url="https://download.anydesk.com/anydesk.apk"
            ;;
        "TeamViewer")
            package_name="com.teamviewer.teamviewer.market.mobile"
            download_url="https://download.teamviewer.com/download/TeamViewerQS.apk"
            ;;
        *)
            log_error "未知应用: $app_name"
            return 1
            ;;
    esac
    
    if adb shell pm list packages | grep -q "$package_name"; then
        log_success "$app_name 已安装"
        return 0
    fi
    
    # 下载APK文件
    log_info "正在从百度手机助手下载 $app_name..."
    
    # 使用curl下载，如果失败则使用wget
    if command -v curl >/dev/null 2>&1; then
        if curl -L -o "$apk_file" "$download_url" --connect-timeout 30 --max-time 300; then
            log_success "$app_name 下载完成"
        else
            log_error "$app_name 下载失败"
            return 1
        fi
    elif command -v wget >/dev/null 2>&1; then
        if wget -O "$apk_file" "$download_url" --timeout=30; then
            log_success "$app_name 下载完成"
        else
            log_error "$app_name 下载失败"
            return 1
        fi
    else
        log_error "未找到下载工具(curl或wget)"
        return 1
    fi
    
    # 安装APK
    if [ -f "$apk_file" ]; then
        log_info "正在安装 $app_name..."
        if adb install -r "$apk_file" 2>/dev/null; then
            log_success "$app_name 安装成功！"
            # 删除已安装的APK文件
            rm -f "$apk_file"
        else
            log_error "$app_name 安装失败"
            return 1
        fi
    else
        log_error "APK文件不存在: $apk_file"
        return 1
    fi
    
    return 0
}

# 通过百度手机助手下载安装应用
install_from_baidu() {
    log_progress "通过百度手机助手下载投屏应用..."
    echo
    
    # 创建下载目录
    mkdir -p "./apk_downloads"
    
    # 投屏应用列表
    local apps=("LetsView" "ApowerMirror" "Vysor" "AnyDesk" "TeamViewer")
    
    # 下载并安装每个应用
    for app_name in "${apps[@]}"; do
        download_and_install_baidu_app "$app_name"
        echo
    done
}

# 安装本地APK文件（备用方案）
install_local_apks() {
    log_progress "检查本地APK文件..."
    
    # 检查是否有本地APK文件
    local apk_found=false
    
    for apk_file in *.apk; do
        if [ -f "$apk_file" ]; then
            apk_found=true
            log_info "发现APK文件: $apk_file"
            
            if adb install -r "$apk_file" 2>/dev/null; then
                log_success "$apk_file 安装成功！"
            else
                log_warn "$apk_file 安装失败"
            fi
        fi
    done
    
    if [ "$apk_found" = false ]; then
        log_info "未发现本地APK文件，跳过本地安装"
    fi
    
    echo
}

# 启用投屏相关权限
enable_permissions() {
    log_progress "配置投屏应用权限..."
    
    # 常见投屏应用包名
    local packages=("com.letsview.letsview" "com.apowersoft.mirror" "com.koushikdutta.vysor" "com.anydesk.anydeskandroid")
    
    for package in "${packages[@]}"; do
        if adb shell pm list packages | grep -q "$package"; then
            log_info "配置 $package 权限..."
            
            # 授予必要权限
            adb shell pm grant "$package" android.permission.RECORD_AUDIO 2>/dev/null || true
            adb shell pm grant "$package" android.permission.CAMERA 2>/dev/null || true
            adb shell pm grant "$package" android.permission.WRITE_EXTERNAL_STORAGE 2>/dev/null || true
            adb shell pm grant "$package" android.permission.READ_EXTERNAL_STORAGE 2>/dev/null || true
            
            log_success "$package 权限配置完成"
        fi
    done
    
    echo
}

# 检查单个应用是否已安装
check_app_installed() {
    local app_name="$1"
    local package_name="$2"
    
    if adb shell pm list packages | grep -q "$package_name"; then
        echo "✅ $app_name - 已安装"
        return 0
    else
        return 1
    fi
}

# 显示已安装的应用
show_installed_apps() {
    log_info "检查设备上的投屏相关应用..."
    echo
    
    echo "📱 已安装的投屏应用:"
    
    local installed_count=0
    
    # 检查各种投屏应用
    if check_app_installed "LetsView" "com.letsview.letsview"; then
        ((installed_count++))
    fi
    
    if check_app_installed "ApowerMirror" "com.apowersoft.mirror"; then
        ((installed_count++))
    fi
    
    if check_app_installed "Vysor" "com.koushikdutta.vysor"; then
        ((installed_count++))
    fi
    
    if check_app_installed "AnyDesk" "com.anydesk.anydeskandroid"; then
        ((installed_count++))
    fi
    
    if check_app_installed "TeamViewer" "com.teamviewer.teamviewer.market.mobile"; then
        ((installed_count++))
    fi
    
    if check_app_installed "Chrome Remote Desktop" "com.google.chromeremotedesktop"; then
        ((installed_count++))
    fi
    
    if [ $installed_count -eq 0 ]; then
        echo "❌ 未发现已安装的投屏应用"
    else
        log_success "发现 $installed_count 个投屏应用已安装"
    fi
    
    echo
}

# 启动投屏应用
launch_apps() {
    log_progress "启动投屏应用..."
    
    # 优先启动LetsView
    if adb shell pm list packages | grep -q "com.letsview.letsview"; then
        log_info "启动LetsView..."
        adb shell am start -n com.letsview.letsview/.MainActivity 2>/dev/null || log_warn "LetsView启动失败"
        sleep 2
    fi
    
    # 启动ApowerMirror
    if adb shell pm list packages | grep -q "com.apowersoft.mirror"; then
        log_info "启动ApowerMirror..."
        adb shell am start -n com.apowersoft.mirror/.MainActivity 2>/dev/null || log_warn "ApowerMirror启动失败"
        sleep 2
    fi
    
    log_success "投屏应用启动完成！"
    echo
}

# 显示使用指南
show_usage_guide() {
    echo "📖 投屏应用使用指南"
    echo "========================================"
    echo
    
    echo "🎯 推荐使用顺序:"
    echo "1. LetsView - 免费跨平台，操作简单"
    echo "   • 支持无线投屏和控制"
    echo "   • 支持多设备同时连接"
    echo "   • 支持屏幕录制和截图"
    echo
    
    echo "2. ApowerMirror - 功能丰富，支持录屏"
    echo "   • 高清画质投屏"
    echo "   • 支持游戏模式"
    echo "   • 支持文件传输"
    echo
    
    echo "3. Vysor - 专业工具，延迟低"
    echo "   • 专业级投屏控制"
    echo "   • 低延迟操作"
    echo "   • 支持键盘鼠标控制"
    echo
    
    echo "4. AnyDesk - 远程控制，适合办公"
    echo "   • 远程桌面控制"
    echo "   • 文件传输功能"
    echo "   • 跨平台支持"
    echo
    
    echo "📱 快速开始:"
    echo "1. 在Android设备上打开已安装的投屏应用"
    echo "2. 在MacBook上下载对应的客户端或使用网页版"
    echo "3. 确保两设备在同一WiFi网络"
    echo "4. 按照应用提示完成连接"
    echo
    
    echo "💻 MacBook端下载链接:"
    echo "• LetsView: https://letsview.com/download"
    echo "• ApowerMirror: https://www.apowersoft.com/phone-mirror"
    echo "• Vysor: Chrome扩展商店搜索'Vysor'"
    echo "• AnyDesk: https://anydesk.com/download"
    echo "• 百度手机助手: https://shouji.baidu.com/"
    echo
    
    echo "🚨 故障排除:"
    echo "• 连接失败: 检查WiFi网络，重启应用"
    echo "• 画面延迟: 关闭其他网络应用，靠近路由器"
    echo "• 无法控制: 检查应用权限设置"
    echo "• 黑屏问题: 重启投屏应用，检查屏幕权限"
    echo
}

# 主函数
main() {
    log_info "开始快速安装投屏应用到Android设备..."
    echo
    
    # 检查ADB工具
    check_adb
    
    # 连接设备
    if ! connect_device; then
        exit 1
    fi
    
    # 通过百度手机助手下载安装
    install_from_baidu
    
    # 安装本地APK文件（如果有）
    install_local_apks
    
    # 配置应用权限
    enable_permissions
    
    # 显示已安装应用
    show_installed_apps
    
    # 启动投屏应用
    launch_apps
    
    echo
    log_success "🎉 投屏应用安装配置完成！"
    echo
    
    # 显示使用指南
    show_usage_guide
    
    echo
    log_info "🚀 现在可以在Android设备上使用投屏应用连接到MacBook！"
}

# 运行主函数
main "$@"