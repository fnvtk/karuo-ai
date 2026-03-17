#!/bin/bash

# MacBook手机扩展屏解决方案
# 作者：卡若
# 功能：将手机作为MacBook的扩展显示器

# 颜色定义
RED="\033[0;31m"
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查ADB连接
check_adb_connection() {
    log_info "检查ADB连接状态..."
    if adb devices | grep -q "192.168.2.15:5555.*device"; then
        log_success "ADB连接正常"
        return 0
    else
        log_error "ADB连接失败，请先连接设备"
        return 1
    fi
}

# 检查MacBook系统版本
check_macos_version() {
    log_info "检查macOS版本..."
    macos_version=$(sw_vers -productVersion)
    log_info "当前macOS版本: $macos_version"
    
    # 检查是否支持Sidecar（需要macOS 10.15+）
    if [[ $(echo "$macos_version 10.15" | tr " " "\n" | sort -V | head -n1) == "10.15" ]]; then
        log_success "系统支持Sidecar功能"
        return 0
    else
        log_warning "系统版本过低，不支持Sidecar，建议使用第三方应用"
        return 1
    fi
}

# 方案1：苹果官方Sidecar（仅支持iPad）
setup_sidecar() {
    log_info "=== 方案1：苹果官方Sidecar ==="
    log_warning "注意：Sidecar仅支持iPad，不支持iPhone"
    log_info "如果您使用iPad，请按以下步骤操作："
    echo "1. 确保iPad和Mac使用同一个Apple ID登录"
    echo "2. 确保两设备都开启了蓝牙和WiFi"
    echo "3. 在Mac上：系统偏好设置 > 显示器 > 添加显示器 > 选择iPad"
    echo "4. 或者在控制中心点击屏幕镜像图标选择iPad"
    
    read -p "您使用的是iPad吗？(y/n): " use_ipad
    if [[ $use_ipad == "y" || $use_ipad == "Y" ]]; then
        log_info "正在打开显示器设置..."
        open "x-apple.systempreferences:com.apple.preference.displays"
        log_success "请在系统设置中配置Sidecar"
    else
        log_info "跳过Sidecar配置，继续其他方案"
    fi
}

# 方案2：Duet Display（支持iPhone和Android）
setup_duet_display() {
    log_info "=== 方案2：Duet Display ==="
    log_info "Duet Display支持iPhone和Android设备作为扩展屏"
    
    # 检查Mac端是否已安装Duet
    if [[ -d "/Applications/Duet Display.app" ]]; then
        log_success "Mac端Duet Display已安装"
    else
        log_info "正在下载Mac端Duet Display..."
        log_warning "请手动访问 https://www.duetdisplay.com 下载Mac版本"
        open "https://www.duetdisplay.com"
    fi
    
    # 下载手机端APK
    log_info "正在下载Android版Duet Display..."
    duet_apk="/tmp/duet_display.apk"
    
    # 从官方或可信源下载APK
    if curl -L -o "$duet_apk" "https://apkpure.com/duet-display/com.kairos.duet/download?from=details"; then
        log_success "APK下载完成"
        
        # 安装到手机
        if check_adb_connection; then
            log_info "正在安装Duet Display到手机..."
            if adb -s 192.168.2.15:5555 install "$duet_apk"; then
                log_success "Duet Display安装成功"
                
                # 启动应用
                log_info "正在启动Duet Display..."
                adb -s 192.168.2.15:5555 shell am start -n com.kairos.duet/.MainActivity
                
                log_success "Duet Display已启动，请在Mac端也启动应用进行配对"
            else
                log_error "Duet Display安装失败"
            fi
        fi
        
        # 清理临时文件
        rm -f "$duet_apk"
    else
        log_error "APK下载失败，请手动下载安装"
        log_info "请访问Google Play或APKPure下载Duet Display"
    fi
}

# 方案3：spacedesk（免费方案）
setup_spacedesk() {
    log_info "=== 方案3：spacedesk（免费） ==="
    log_info "spacedesk是免费的扩展屏解决方案"
    
    # 检查Mac端是否已安装spacedesk
    if [[ -d "/Applications/spacedesk.app" ]]; then
        log_success "Mac端spacedesk已安装"
    else
        log_info "正在打开spacedesk官网..."
        open "https://www.spacedesk.net"
        log_warning "请下载并安装Mac版spacedesk服务端"
    fi
    
    # 下载Android客户端
    log_info "正在下载spacedesk Android客户端..."
    spacedesk_apk="/tmp/spacedesk.apk"
    
    if curl -L -o "$spacedesk_apk" "https://apkpure.com/spacedesk-multi-monitor-app/ph.spacedesk.beta/download"; then
        log_success "APK下载完成"
        
        if check_adb_connection; then
            log_info "正在安装spacedesk到手机..."
            if adb -s 192.168.2.15:5555 install "$spacedesk_apk"; then
                log_success "spacedesk安装成功"
                
                # 启动应用
                adb -s 192.168.2.15:5555 shell am start -n ph.spacedesk.beta/.MainActivity
                log_success "spacedesk已启动"
            else
                log_error "spacedesk安装失败"
            fi
        fi
        
        rm -f "$spacedesk_apk"
    else
        log_error "spacedesk APK下载失败"
    fi
}

# 方案4：使用BetterDisplay + VNC
setup_betterdisplay_vnc() {
    log_info "=== 方案4：BetterDisplay + VNC ==="
    log_info "使用已安装的BetterDisplay创建虚拟显示器，通过VNC连接"
    
    # 检查BetterDisplay
    if [[ -d "/Applications/BetterDisplay.app" ]]; then
        log_success "BetterDisplay已安装"
        
        # 启动BetterDisplay
        log_info "正在启动BetterDisplay..."
        open "/Applications/BetterDisplay.app"
        
        # 启用屏幕共享
        log_info "正在启用macOS屏幕共享..."
        sudo launchctl load -w /System/Library/LaunchDaemons/com.apple.screensharing.plist 2>/dev/null || true
        
        # 获取本机IP
        local_ip=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
        log_info "Mac IP地址: $local_ip"
        
        # 安装VNC客户端到手机
        log_info "正在下载VNC Viewer到手机..."
        vnc_apk="/tmp/vnc_viewer.apk"
        
        if curl -L -o "$vnc_apk" "https://apkpure.com/vnc-viewer-remote-desktop/com.realvnc.viewer.android/download"; then
            if check_adb_connection; then
                adb -s 192.168.2.15:5555 install "$vnc_apk"
                adb -s 192.168.2.15:5555 shell am start -n com.realvnc.viewer.android/.app.ConnectionChooserActivity
                
                log_success "VNC Viewer已安装并启动"
                log_info "请在手机VNC Viewer中连接到: $local_ip:5900"
            fi
            rm -f "$vnc_apk"
        fi
        
        log_info "使用说明："
        echo "1. 在BetterDisplay中创建虚拟显示器"
        echo "2. 在手机VNC Viewer中连接到Mac"
        echo "3. 将窗口拖拽到虚拟显示器上"
        
    else
        log_error "BetterDisplay未安装"
    fi
}

# 主菜单
show_menu() {
    echo "==========================================="
    echo "    MacBook手机扩展屏解决方案"
    echo "==========================================="
    echo "1. 苹果官方Sidecar（仅iPad）"
    echo "2. Duet Display（推荐，支持iPhone/Android）"
    echo "3. spacedesk（免费方案）"
    echo "4. BetterDisplay + VNC（已有应用）"
    echo "5. 检查系统信息"
    echo "6. 退出"
    echo "==========================================="
}

# 检查系统信息
check_system_info() {
    log_info "=== 系统信息检查 ==="
    
    # Mac信息
    echo "Mac信息："
    echo "  系统版本: $(sw_vers -productVersion)"
    echo "  芯片: $(sysctl -n machdep.cpu.brand_string)"
    echo "  内存: $(sysctl -n hw.memsize | awk '{print $1/1024/1024/1024 "GB"}')"
    
    # 网络信息
    local_ip=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
    echo "  IP地址: $local_ip"
    
    # 已安装的相关应用
    echo "\n已安装的显示相关应用："
    ls -la /Applications/ | grep -i -E '(display|screen|mirror|vnc|duet|space)' | awk '{print "  " $9}'
    
    # ADB连接状态
    echo "\nADB连接状态："
    adb devices
    
    # 手机信息（如果连接）
    if check_adb_connection; then
        echo "\n手机信息："
        echo "  设备型号: $(adb -s 192.168.2.15:5555 shell getprop ro.product.model)"
        echo "  Android版本: $(adb -s 192.168.2.15:5555 shell getprop ro.build.version.release)"
        echo "  屏幕分辨率: $(adb -s 192.168.2.15:5555 shell wm size | cut -d' ' -f3)"
    fi
}

# 主程序
main() {
    while true; do
        show_menu
        read -p "请选择方案 (1-6): " choice
        
        case $choice in
            1)
                check_macos_version
                setup_sidecar
                ;;
            2)
                setup_duet_display
                ;;
            3)
                setup_spacedesk
                ;;
            4)
                setup_betterdisplay_vnc
                ;;
            5)
                check_system_info
                ;;
            6)
                log_info "退出程序"
                exit 0
                ;;
            *)
                log_error "无效选择，请重新输入"
                ;;
        esac
        
        echo "\n按回车键继续..."
        read
    done
}

# 运行主程序
main