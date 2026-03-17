#!/bin/bash

# BetterDisplay + VNC 扩展屏解决方案
# 作者：卡若
# 功能：使用BetterDisplay创建虚拟显示器，通过VNC实现手机扩展屏

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

# 获取本机IP地址
get_local_ip() {
    local_ip=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
    echo "$local_ip"
}

# 启动BetterDisplay
start_betterdisplay() {
    log_info "=== 启动BetterDisplay ==="
    
    if [[ -d "/Applications/BetterDisplay.app" ]]; then
        log_success "BetterDisplay已安装"
        
        # 检查是否已运行
        if pgrep -f "BetterDisplay" > /dev/null; then
            log_info "BetterDisplay已在运行"
        else
            log_info "正在启动BetterDisplay..."
            open "/Applications/BetterDisplay.app"
            sleep 3
        fi
        
        log_info "BetterDisplay使用说明："
        echo "1. 在BetterDisplay中点击 '+' 创建虚拟显示器"
        echo "2. 设置合适的分辨率（建议1920x1080或1280x720）"
        echo "3. 启用虚拟显示器"
        echo "4. 将需要扩展的窗口拖拽到虚拟显示器上"
        
        return 0
    else
        log_error "BetterDisplay未安装"
        log_info "请访问 https://github.com/waydabber/BetterDisplay 下载安装"
        return 1
    fi
}

# 启用macOS屏幕共享
enable_screen_sharing() {
    log_info "=== 启用macOS屏幕共享 ==="
    
    # 检查屏幕共享是否已启用
    if sudo launchctl list | grep -q "com.apple.screensharing"; then
        log_success "屏幕共享服务已启用"
    else
        log_info "正在启用屏幕共享服务..."
        sudo launchctl load -w /System/Library/LaunchDaemons/com.apple.screensharing.plist 2>/dev/null
        
        if sudo launchctl list | grep -q "com.apple.screensharing"; then
            log_success "屏幕共享服务启用成功"
        else
            log_warning "屏幕共享服务启用失败，请手动在系统偏好设置中启用"
            log_info "路径：系统偏好设置 > 共享 > 屏幕共享"
        fi
    fi
    
    # 获取并显示连接信息
    local_ip=$(get_local_ip)
    log_info "Mac IP地址: $local_ip"
    log_info "VNC连接地址: vnc://$local_ip:5900"
    log_info "或者使用: $local_ip:5900"
}

# 安装VNC客户端到手机
install_vnc_to_phone() {
    log_info "=== 安装VNC客户端到手机 ==="
    
    if ! check_adb_connection; then
        return 1
    fi
    
    # 检查是否已安装VNC客户端
    if adb -s 192.168.2.15:5555 shell pm list packages | grep -q "realvnc.viewer"; then
        log_success "VNC Viewer已安装"
        adb -s 192.168.2.15:5555 shell am start -n com.realvnc.viewer.android/.app.ConnectionChooserActivity
        return 0
    fi
    
    # 尝试多个VNC客户端APK
    vnc_apps=(
        "https://apkpure.com/vnc-viewer-remote-desktop/com.realvnc.viewer.android/download?from=details"
        "https://apkpure.com/bvnc-secure-vnc-viewer/com.iiordanov.bVNC/download?from=details"
    )
    
    for vnc_url in "${vnc_apps[@]}"; do
        vnc_apk="/tmp/vnc_viewer_$(date +%s).apk"
        
        log_info "正在下载VNC客户端..."
        if curl -L -o "$vnc_apk" "$vnc_url"; then
            log_success "VNC APK下载完成"
            
            log_info "正在安装VNC客户端到手机..."
            if adb -s 192.168.2.15:5555 install "$vnc_apk"; then
                log_success "VNC客户端安装成功"
                
                # 尝试启动VNC应用
                if adb -s 192.168.2.15:5555 shell pm list packages | grep -q "realvnc.viewer"; then
                    adb -s 192.168.2.15:5555 shell am start -n com.realvnc.viewer.android/.app.ConnectionChooserActivity
                elif adb -s 192.168.2.15:5555 shell pm list packages | grep -q "iiordanov.bVNC"; then
                    adb -s 192.168.2.15:5555 shell am start -n com.iiordanov.bVNC/.bVNC
                fi
                
                rm -f "$vnc_apk"
                return 0
            else
                log_warning "VNC客户端安装失败，尝试下一个..."
                rm -f "$vnc_apk"
            fi
        else
            log_warning "VNC APK下载失败，尝试下一个..."
        fi
    done
    
    log_error "所有VNC客户端安装失败"
    log_info "请手动在手机上安装VNC客户端应用"
    return 1
}

# 显示连接指南
show_connection_guide() {
    log_info "=== 连接指南 ==="
    
    local_ip=$(get_local_ip)
    
    echo "完整连接步骤："
    echo "1. 确保BetterDisplay已创建虚拟显示器"
    echo "2. 确保Mac屏幕共享已启用"
    echo "3. 在手机VNC客户端中添加新连接："
    echo "   - 地址：$local_ip"
    echo "   - 端口：5900"
    echo "   - 用户名：$(whoami)"
    echo "   - 密码：Mac登录密码"
    echo "4. 连接成功后，将窗口拖拽到虚拟显示器"
    echo "5. 手机上就能看到扩展屏内容了"
    
    echo "\n故障排除："
    echo "- 如果连接失败，检查防火墙设置"
    echo "- 确保Mac和手机在同一WiFi网络"
    echo "- 尝试重启屏幕共享服务"
    echo "- 检查系统偏好设置 > 共享 > 屏幕共享是否启用"
}

# 测试连接
test_connection() {
    log_info "=== 测试连接 ==="
    
    local_ip=$(get_local_ip)
    
    # 测试VNC端口
    if nc -z "$local_ip" 5900 2>/dev/null; then
        log_success "VNC服务正在运行 (端口5900)"
    else
        log_error "VNC服务未运行，请检查屏幕共享设置"
    fi
    
    # 测试ADB连接
    if check_adb_connection; then
        device_info=$(adb -s 192.168.2.15:5555 shell getprop ro.product.model)
        log_info "连接的设备：$device_info"
    fi
    
    # 显示网络信息
    echo "\n网络信息："
    echo "Mac IP：$local_ip"
    echo "手机IP：192.168.2.15"
    echo "VNC端口：5900"
}

# 一键配置
quick_setup() {
    log_info "=== 一键配置BetterDisplay扩展屏 ==="
    
    # 1. 启动BetterDisplay
    if start_betterdisplay; then
        sleep 2
        
        # 2. 启用屏幕共享
        enable_screen_sharing
        sleep 1
        
        # 3. 安装VNC到手机
        install_vnc_to_phone
        sleep 1
        
        # 4. 显示连接指南
        show_connection_guide
        
        # 5. 测试连接
        test_connection
        
        log_success "配置完成！请按照连接指南操作"
    else
        log_error "BetterDisplay启动失败，无法继续配置"
    fi
}

# 主菜单
show_menu() {
    echo "==========================================="
    echo "    BetterDisplay扩展屏解决方案"
    echo "==========================================="
    echo "1. 一键配置（推荐）"
    echo "2. 启动BetterDisplay"
    echo "3. 启用屏幕共享"
    echo "4. 安装VNC到手机"
    echo "5. 显示连接指南"
    echo "6. 测试连接"
    echo "7. 退出"
    echo "==========================================="
}

# 主程序
main() {
    while true; do
        show_menu
        read -p "请选择操作 (1-7): " choice
        
        case $choice in
            1)
                quick_setup
                ;;
            2)
                start_betterdisplay
                ;;
            3)
                enable_screen_sharing
                ;;
            4)
                install_vnc_to_phone
                ;;
            5)
                show_connection_guide
                ;;
            6)
                test_connection
                ;;
            7)
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