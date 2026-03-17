#!/bin/bash
# 安装AnyDesk到Android设备
# 作者：卡若
# 功能：快速安装AnyDesk远程控制应用到Android设备

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[信息]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[警告]${NC} $1"
}

log_error() {
    echo -e "${RED}[错误]${NC} $1"
}

log_progress() {
    echo -e "${BLUE}[进度]${NC} $1"
    echo "----------------------------------------"
}

log_success() {
    echo -e "${PURPLE}[成功]${NC} $1"
}

# 检查ADB工具
check_adb() {
    log_progress "检查ADB工具"
    
    if ! command -v adb >/dev/null 2>&1; then
        log_error "ADB工具未安装！正在安装..."
        if command -v brew >/dev/null 2>&1; then
            brew install android-platform-tools
        else
            log_error "请先安装Homebrew或手动安装ADB工具"
            exit 1
        fi
    else
        log_success "ADB工具检查完成"
    fi
    echo ""
}

# 连接设备
connect_device() {
    log_progress "连接Android设备"
    
    # 重启ADB服务
    adb kill-server
    adb start-server
    
    # 显示已连接设备
    log_info "已连接设备:"
    adb devices
    
    # 检查是否有设备连接
    if adb devices | grep -q "device$"; then
        log_success "设备已连接"
        return 0
    fi
    
    # 尝试无线连接
    log_warn "未检测到已连接的设备，尝试无线连接..."
    
    # 尝试连接默认IP
    local default_ip="192.168.2.15"
    log_info "尝试连接默认设备: ${default_ip}:5555 (10秒超时)"
    timeout 10 adb connect "${default_ip}:5555" || true
    
    # 检查连接结果
    if adb devices | grep -q "${default_ip}.*device"; then
        log_success "设备连接成功！"
        return 0
    else
        log_warn "连接默认设备超时或失败，尝试其他方式"
    fi
    
    # 提示用户输入设备IP
    echo ""
    read -p "请输入Android设备IP地址 (例如 192.168.1.100): " device_ip
    
    if [ -z "$device_ip" ]; then
        log_error "未提供设备IP地址"
        return 1
    fi
    
    # 尝试连接用户提供的IP
    log_info "尝试连接设备: ${device_ip}:5555"
    adb connect "${device_ip}:5555"
    
    # 检查连接结果
    if adb devices | grep -q "${device_ip}.*device"; then
        log_success "设备连接成功！"
        return 0
    else
        # 尝试ping测试
        log_warn "ADB连接失败，尝试ping测试..."
        if ping -c 3 "$device_ip" > /dev/null 2>&1; then
            log_info "设备可以ping通，但ADB连接失败"
            echo ""
            echo "📱 请确保Android设备已完成以下设置:"
            echo "1. 设置 → 关于手机 → 连续点击'版本号'7次"
            echo "2. 设置 → 系统 → 开发者选项"
            echo "3. 开启'USB调试'和'无线调试'"
            echo "4. 设备与MacBook在同一WiFi网络"
            echo "5. 已授权此MacBook的ADB连接"
        else
            log_error "设备无法ping通，请检查IP地址和网络连接"
        fi
        return 1
    fi
}

# 安装AnyDesk
install_anydesk() {
    log_progress "安装AnyDesk远程控制应用"
    
    # 检查AnyDesk是否已安装
    local package_name="com.anydesk.anydeskandroid"
    
    if adb shell pm list packages | grep -q "$package_name"; then
        log_success "AnyDesk已安装"
        return 0
    fi
    
    # 创建临时目录
    local temp_dir="/tmp/anydesk_install_$(date +%s)"
    mkdir -p "$temp_dir"
    cd "$temp_dir"
    
    # 下载AnyDesk APK
    log_info "正在下载AnyDesk..."
    local download_url="https://download.anydesk.com/anydesk.apk"
    curl -L -o "anydesk.apk" "$download_url" --connect-timeout 15 --max-time 60 --retry 3 --retry-delay 2
    
    # 检查下载文件大小
    local apk_size=$(stat -f%z "anydesk.apk" 2>/dev/null || echo 0)
    log_info "AnyDesk.apk 文件大小: ${apk_size} 字节"
    
    if [ -f "anydesk.apk" ] && [ "$apk_size" -gt 1000000 ]; then
        log_success "AnyDesk下载完成"
        
        # 安装APK
        log_info "正在安装AnyDesk..."
        local install_result=$(adb install -r "anydesk.apk" 2>&1)
        log_info "安装结果: $install_result"
        
        if echo "$install_result" | grep -q "Success"; then
            log_success "AnyDesk安装成功！"
            
            # 清理临时文件
            cd - >/dev/null
            rm -rf "$temp_dir"
            
            return 0
        else
            log_error "AnyDesk安装失败，尝试备用下载源"
            
            # 尝试备用下载源
            log_info "尝试从备用源下载AnyDesk..."
            local backup_url="https://apkpure.com/anydesk-remote-control/com.anydesk.anydeskandroid/download/apk"
            curl -L -o "anydesk_backup.apk" "$backup_url" --connect-timeout 15 --max-time 60 --retry 3 --retry-delay 2
            
            # 检查下载文件大小
            local backup_size=$(stat -f%z "anydesk_backup.apk" 2>/dev/null || echo 0)
            log_info "备用AnyDesk.apk 文件大小: ${backup_size} 字节"
            
            if [ -f "anydesk_backup.apk" ] && [ "$backup_size" -gt 1000000 ]; then
                log_success "备用AnyDesk下载完成"
                
                # 安装APK
                log_info "正在安装备用AnyDesk..."
                install_result=$(adb install -r "anydesk_backup.apk" 2>&1)
                log_info "安装结果: $install_result"
                
                if echo "$install_result" | grep -q "Success"; then
                    log_success "AnyDesk安装成功！"
                    
                    # 清理临时文件
                    cd - >/dev/null
                    rm -rf "$temp_dir"
                    
                    return 0
                else
                    log_error "AnyDesk安装失败"
                    
                    # 清理临时文件
                    cd - >/dev/null
                    rm -rf "$temp_dir"
                    
                    return 1
                fi
            else
                log_error "备用AnyDesk下载失败"
                
                # 清理临时文件
                cd - >/dev/null
                rm -rf "$temp_dir"
                
                return 1
            fi
        fi
    else
        log_error "AnyDesk下载失败"
        
        # 清理临时文件
        cd - >/dev/null
        rm -rf "$temp_dir"
        
        return 1
    fi
}

# 启动AnyDesk
launch_anydesk() {
    log_progress "启动AnyDesk应用"
    
    # 检查AnyDesk是否已安装
    local package_name="com.anydesk.anydeskandroid"
    
    if ! adb shell pm list packages | grep -q "$package_name"; then
        log_error "AnyDesk未安装，无法启动"
        return 1
    fi
    
    # 获取AnyDesk的主Activity
    log_info "查找AnyDesk启动Activity..."
    local main_activity=$(adb shell "dumpsys package $package_name | grep -A 1 'android.intent.action.MAIN' | grep -o '$package_name/[^[:space:]]*'" | head -1)
    
    if [ -z "$main_activity" ]; then
        # 尝试使用默认Activity
        main_activity="$package_name/.HubActivity"
        log_warn "未找到主Activity，尝试使用默认值: $main_activity"
    else
        log_info "找到主Activity: $main_activity"
    fi
    
    # 启动AnyDesk
    log_info "正在启动AnyDesk..."
    local launch_result=$(adb shell am start -n "$main_activity" 2>&1)
    
    if echo "$launch_result" | grep -q "Error"; then
        log_error "AnyDesk启动失败: $launch_result"
        return 1
    else
        log_success "AnyDesk启动成功！"
        return 0
    fi
}

# 显示使用指南
show_usage_guide() {
    echo ""
    echo "📖 AnyDesk使用指南"
    echo "======================================="
    echo ""
    
    echo "🔄 连接步骤:"
    echo "1. 在Android设备上打开AnyDesk应用"
    echo "2. 记下显示的AnyDesk ID (9位数字)"
    echo "3. 在MacBook上下载并安装AnyDesk: https://anydesk.com/download"
    echo "4. 在MacBook的AnyDesk中输入Android设备的AnyDesk ID"
    echo "5. 在Android设备上接受连接请求"
    echo "6. 开始远程控制"
    echo ""
    
    echo "⚙️ 优化设置:"
    echo "• 在AnyDesk设置中启用'自动接受连接'可以简化后续连接"
    echo "• 设置固定密码可以避免每次手动确认"
    echo "• 在'显示'设置中调整画质以获得更好的性能"
    echo ""
    
    echo "🔒 安全提示:"
    echo "• 只接受来自已知设备的连接请求"
    echo "• 定期更改AnyDesk密码"
    echo "• 不使用时关闭AnyDesk应用"
    echo ""
    
    echo "🚨 故障排除:"
    echo "• 连接失败: 检查两设备是否在同一网络"
    echo "• 黑屏: 重启AnyDesk应用"
    echo "• 卡顿: 降低画质设置或检查网络连接"
    echo "• 无法控制: 确保已授予所有必要权限"
    echo ""
    
    echo "📞 如需帮助，联系卡若: 微信 28533368"
}

# 主函数
main() {
    echo "🚀 AnyDesk安装工具"
    echo "作者: 卡若 | 版本: 1.0.0"
    echo "功能: 快速安装AnyDesk远程控制应用到Android设备"
    echo "======================================="
    echo ""
    
    # 检查ADB工具
    check_adb
    
    # 连接设备
    if ! connect_device; then
        exit 1
    fi
    
    # 安装AnyDesk
    if install_anydesk; then
        # 启动AnyDesk
        launch_anydesk
        
        # 显示使用指南
        show_usage_guide
    else
        exit 1
    fi
    
    echo ""
    log_success "脚本执行完成！"
}

# 执行主函数
main