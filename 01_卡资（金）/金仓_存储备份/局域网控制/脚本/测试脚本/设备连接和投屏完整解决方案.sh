#!/bin/bash

# 设备连接和投屏完整解决方案脚本
# 功能：设备连接、应用管理、投屏实现
# 作者：卡若
# 日期：2025年1月

# 颜色定义
RED="\033[0;31m"
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

# 设备信息
DEVICE_IP="192.168.2.15"
DEVICE_PORT="5555"
DEVICE_ADDRESS="${DEVICE_IP}:${DEVICE_PORT}"

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

# 检查设备网络连通性
check_device_network() {
    log_info "检查设备网络连通性..."
    if ping -c 3 $DEVICE_IP > /dev/null 2>&1; then
        log_success "设备 $DEVICE_IP 网络连通正常"
        return 0
    else
        log_error "设备 $DEVICE_IP 网络不通，请检查网络连接"
        return 1
    fi
}

# 尝试连接ADB
connect_adb() {
    log_info "尝试连接ADB..."
    
    # 先断开可能存在的连接
    adb disconnect $DEVICE_ADDRESS > /dev/null 2>&1
    
    # 尝试连接
    if adb connect $DEVICE_ADDRESS | grep -q "connected"; then
        log_success "ADB连接成功"
        return 0
    else
        log_warning "ADB连接失败，可能需要重新配置设备"
        return 1
    fi
}

# 显示设备配置指南
show_device_config_guide() {
    echo -e "\n${YELLOW}=== Android设备ADB配置指南 ===${NC}"
    echo "1. 进入设备设置 → 关于设备/关于手机"
    echo "2. 连续点击'版本号'或'内部版本号' 7次，开启开发者选项"
    echo "3. 返回设置 → 开发者选项"
    echo "4. 开启'USB调试'"
    echo "5. 开启'无线调试'或'网络ADB调试'"
    echo "6. 如果有'仅充电模式下允许ADB调试'，请开启"
    echo "7. 重启设备后重新运行此脚本"
    echo -e "${YELLOW}================================${NC}\n"
}

# 获取设备信息
get_device_info() {
    log_info "获取设备信息..."
    
    echo "========== 设备信息 =========="
    echo "Android版本: $(adb -s $DEVICE_ADDRESS shell getprop ro.build.version.release 2>/dev/null || echo '未知')"
    echo "设备型号: $(adb -s $DEVICE_ADDRESS shell getprop ro.product.model 2>/dev/null || echo '未知')"
    echo "设备品牌: $(adb -s $DEVICE_ADDRESS shell getprop ro.product.brand 2>/dev/null || echo '未知')"
    echo "芯片架构: $(adb -s $DEVICE_ADDRESS shell getprop ro.product.cpu.abi 2>/dev/null || echo '未知')"
    echo "API级别: $(adb -s $DEVICE_ADDRESS shell getprop ro.build.version.sdk 2>/dev/null || echo '未知')"
    echo "=============================="
}

# 检查已安装应用
check_installed_apps() {
    log_info "检查已安装的投屏相关应用..."
    
    echo "========== 已安装应用 =========="
    
    # 检查RustDesk
    if adb -s $DEVICE_ADDRESS shell pm list packages | grep -q "com.carriez.flutter_hbb"; then
        echo "✓ RustDesk (com.carriez.flutter_hbb)"
        RUSTDESK_INSTALLED=true
    else
        echo "✗ RustDesk 未安装"
        RUSTDESK_INSTALLED=false
    fi
    
    # 检查AnyDesk
    if adb -s $DEVICE_ADDRESS shell pm list packages | grep -q "com.anydesk.anydeskandroid"; then
        echo "✓ AnyDesk (com.anydesk.anydeskandroid)"
        ANYDESK_INSTALLED=true
    else
        echo "✗ AnyDesk 未安装"
        ANYDESK_INSTALLED=false
    fi
    
    # 检查其他应用
    echo "\n其他应用:"
    adb -s $DEVICE_ADDRESS shell pm list packages | grep -E "(uni.app|lebo|cast|screen|mirror)" | while read line; do
        package=$(echo $line | cut -d':' -f2)
        echo "✓ $package"
    done
    
    echo "=============================="
}

# 卸载AnyDesk
uninstall_anydesk() {
    if [ "$ANYDESK_INSTALLED" = true ]; then
        log_info "卸载AnyDesk..."
        if adb -s $DEVICE_ADDRESS shell pm uninstall com.anydesk.anydeskandroid; then
            log_success "AnyDesk卸载成功"
        else
            log_error "AnyDesk卸载失败"
        fi
    else
        log_info "AnyDesk未安装，无需卸载"
    fi
}

# 修复RustDesk
fix_rustdesk() {
    if [ "$RUSTDESK_INSTALLED" = true ]; then
        log_info "修复RustDesk应用..."
        
        # 清除应用数据
        adb -s $DEVICE_ADDRESS shell pm clear com.carriez.flutter_hbb
        
        # 授予权限
        log_info "授予RustDesk必要权限..."
        adb -s $DEVICE_ADDRESS shell pm grant com.carriez.flutter_hbb android.permission.WRITE_EXTERNAL_STORAGE 2>/dev/null
        adb -s $DEVICE_ADDRESS shell pm grant com.carriez.flutter_hbb android.permission.READ_EXTERNAL_STORAGE 2>/dev/null
        adb -s $DEVICE_ADDRESS shell pm grant com.carriez.flutter_hbb android.permission.CAMERA 2>/dev/null
        adb -s $DEVICE_ADDRESS shell pm grant com.carriez.flutter_hbb android.permission.RECORD_AUDIO 2>/dev/null
        
        # 测试启动
        log_info "测试RustDesk启动..."
        if adb -s $DEVICE_ADDRESS shell am start -n com.carriez.flutter_hbb/.MainActivity; then
            log_success "RustDesk启动成功"
        else
            log_error "RustDesk启动失败"
        fi
    else
        log_warning "RustDesk未安装"
    fi
}

# 修复其他应用
fix_other_apps() {
    log_info "修复其他应用..."
    
    # 获取所有uni.app应用
    uni_apps=$(adb -s $DEVICE_ADDRESS shell pm list packages | grep "uni.app" | cut -d':' -f2)
    
    for app in $uni_apps; do
        log_info "修复应用: $app"
        
        # 清除应用缓存
        adb -s $DEVICE_ADDRESS shell pm clear $app 2>/dev/null
        
        # 授予基本权限
        adb -s $DEVICE_ADDRESS shell pm grant $app android.permission.WRITE_EXTERNAL_STORAGE 2>/dev/null
        adb -s $DEVICE_ADDRESS shell pm grant $app android.permission.READ_EXTERNAL_STORAGE 2>/dev/null
        adb -s $DEVICE_ADDRESS shell pm grant $app android.permission.INTERNET 2>/dev/null
        
        log_success "应用 $app 修复完成"
    done
}

# MacBook投屏设置
setup_macbook_screen_sharing() {
    log_info "配置MacBook屏幕共享..."
    
    echo -e "\n${YELLOW}=== MacBook投屏到手机设置指南 ===${NC}"
    echo "方案1: 使用macOS内置屏幕共享 (推荐)"
    echo "1. 打开'系统偏好设置' → '共享'"
    echo "2. 勾选'屏幕共享'"
    echo "3. 设置访问权限为'所有用户'或指定用户"
    echo "4. 记录本机IP地址: $(ifconfig | grep 'inet ' | grep -v '127.0.0.1' | head -1 | awk '{print $2}')"
    echo "5. 在手机VNC客户端中连接: vnc://$(ifconfig | grep 'inet ' | grep -v '127.0.0.1' | head -1 | awk '{print $2}')"
    
    echo "\n方案2: 使用RustDesk双向连接"
    echo "1. 在MacBook上打开RustDesk应用"
    echo "2. 记录RustDesk ID和密码"
    echo "3. 在手机RustDesk中输入MacBook的ID进行连接"
    
    echo "\n方案3: 使用第三方投屏工具"
    echo "1. 下载LetsView或ApowerMirror"
    echo "2. 确保MacBook和手机在同一WiFi网络"
    echo "3. 按应用指引进行连接"
    echo -e "${YELLOW}================================${NC}\n"
}

# 安装VNC客户端到手机
install_vnc_client() {
    log_info "安装VNC客户端到手机..."
    
    # VNC Viewer APK下载链接
    VNC_APK_URL="https://www.realvnc.com/download/file/viewer.files/VNC-Viewer-3.7.1.42089-Android.apk"
    VNC_APK_FILE="vnc-viewer.apk"
    
    # 检查是否已有VNC客户端
    if adb -s $DEVICE_ADDRESS shell pm list packages | grep -q "com.realvnc.viewer"; then
        log_success "VNC Viewer已安装"
        return 0
    fi
    
    # 下载VNC Viewer
    log_info "下载VNC Viewer..."
    if curl -L -o "$VNC_APK_FILE" "$VNC_APK_URL"; then
        log_success "VNC Viewer下载完成"
        
        # 安装到设备
        log_info "安装VNC Viewer到设备..."
        if adb -s $DEVICE_ADDRESS install "$VNC_APK_FILE"; then
            log_success "VNC Viewer安装成功"
            rm -f "$VNC_APK_FILE"
        else
            log_error "VNC Viewer安装失败"
        fi
    else
        log_error "VNC Viewer下载失败"
    fi
}

# 启用MacBook屏幕共享
enable_macbook_screen_sharing() {
    log_info "启用MacBook屏幕共享..."
    
    # 检查屏幕共享是否已启用
    if sudo launchctl list | grep -q "com.apple.screensharing"; then
        log_success "MacBook屏幕共享已启用"
    else
        log_info "启用MacBook屏幕共享服务..."
        sudo launchctl load -w /System/Library/LaunchDaemons/com.apple.screensharing.plist 2>/dev/null
        
        if sudo launchctl list | grep -q "com.apple.screensharing"; then
            log_success "MacBook屏幕共享启用成功"
        else
            log_warning "请手动在系统偏好设置中启用屏幕共享"
        fi
    fi
    
    # 显示连接信息
    MACBOOK_IP=$(ifconfig | grep 'inet ' | grep -v '127.0.0.1' | head -1 | awk '{print $2}')
    echo -e "\n${GREEN}MacBook投屏连接信息:${NC}"
    echo "MacBook IP: $MACBOOK_IP"
    echo "VNC连接地址: vnc://$MACBOOK_IP"
    echo "在手机VNC客户端中输入上述地址即可连接"
}

# 生成诊断报告
generate_report() {
    REPORT_FILE="/Users/karuo/Documents/开发/4、小工具/局域网手机电脑控制/logs/device_fix_report_$(date +%Y%m%d_%H%M%S).txt"
    
    log_info "生成诊断报告..."
    
    cat > "$REPORT_FILE" << EOF
========== 设备连接和投屏解决方案报告 ==========
生成时间: $(date)
设备地址: $DEVICE_ADDRESS

========== 网络状态 ==========
$(ping -c 3 $DEVICE_IP 2>&1)

========== ADB连接状态 ==========
$(adb devices 2>&1)

========== 设备信息 ==========
$(adb -s $DEVICE_ADDRESS shell getprop 2>/dev/null | grep -E '(ro.build.version|ro.product)' || echo 'ADB连接失败，无法获取设备信息')

========== 已安装应用 ==========
$(adb -s $DEVICE_ADDRESS shell pm list packages 2>/dev/null | grep -E '(rustdesk|anydesk|uni.app|vnc|cast|mirror)' || echo 'ADB连接失败，无法获取应用列表')

========== MacBook网络信息 ==========
MacBook IP: $(ifconfig | grep 'inet ' | grep -v '127.0.0.1' | head -1 | awk '{print $2}')
屏幕共享状态: $(sudo launchctl list | grep -q "com.apple.screensharing" && echo "已启用" || echo "未启用")

========== 解决方案建议 ==========
1. 如果ADB连接失败，请按照设备配置指南重新设置
2. 使用MacBook内置屏幕共享进行投屏
3. 在手机上安装VNC客户端连接MacBook
4. 确保设备在同一WiFi网络中

EOF

    log_success "诊断报告已保存到: $REPORT_FILE"
}

# 主菜单
show_menu() {
    echo -e "\n${BLUE}=== 设备连接和投屏解决方案 ===${NC}"
    echo "1. 完整诊断和修复"
    echo "2. 检查设备连接"
    echo "3. 卸载AnyDesk"
    echo "4. 修复RustDesk"
    echo "5. 修复其他应用"
    echo "6. 配置MacBook投屏"
    echo "7. 安装VNC客户端"
    echo "8. 生成诊断报告"
    echo "9. 显示设备配置指南"
    echo "0. 退出"
    echo -e "${BLUE}=================================${NC}"
}

# 完整解决方案
full_solution() {
    log_info "开始完整解决方案..."
    
    # 1. 检查网络
    if ! check_device_network; then
        return 1
    fi
    
    # 2. 尝试连接ADB
    if ! connect_adb; then
        show_device_config_guide
        return 1
    fi
    
    # 3. 获取设备信息
    get_device_info
    
    # 4. 检查应用
    check_installed_apps
    
    # 5. 卸载AnyDesk
    uninstall_anydesk
    
    # 6. 修复RustDesk
    fix_rustdesk
    
    # 7. 修复其他应用
    fix_other_apps
    
    # 8. 配置MacBook投屏
    setup_macbook_screen_sharing
    
    # 9. 安装VNC客户端
    install_vnc_client
    
    # 10. 启用MacBook屏幕共享
    enable_macbook_screen_sharing
    
    # 11. 生成报告
    generate_report
    
    log_success "完整解决方案执行完成！"
}

# 主程序
main() {
    echo -e "${GREEN}设备连接和投屏完整解决方案${NC}"
    echo "目标设备: $DEVICE_ADDRESS"
    
    # 检查参数
    if [ "$1" = "--full" ]; then
        full_solution
        return
    fi
    
    # 交互式菜单
    while true; do
        show_menu
        read -p "请选择操作 (0-9): " choice
        
        case $choice in
            1)
                full_solution
                ;;
            2)
                check_device_network
                connect_adb
                ;;
            3)
                if connect_adb; then
                    check_installed_apps
                    uninstall_anydesk
                fi
                ;;
            4)
                if connect_adb; then
                    check_installed_apps
                    fix_rustdesk
                fi
                ;;
            5)
                if connect_adb; then
                    fix_other_apps
                fi
                ;;
            6)
                setup_macbook_screen_sharing
                enable_macbook_screen_sharing
                ;;
            7)
                if connect_adb; then
                    install_vnc_client
                fi
                ;;
            8)
                generate_report
                ;;
            9)
                show_device_config_guide
                ;;
            0)
                log_info "退出程序"
                break
                ;;
            *)
                log_error "无效选择，请重新输入"
                ;;
        esac
        
        echo
        read -p "按回车键继续..."
    done
}

# 执行主程序
main "$@"