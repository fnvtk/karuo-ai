#!/bin/bash

# 安装VNC客户端到手机脚本
# 作者: 卡若
# 版本: 1.0.0
# 功能: 自动下载并安装VNC客户端应用到Android设备，用于接收MacBook屏幕共享

# 颜色定义
RED="\033[0;31m"
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

# 日志函数
log_error() {
    echo -e "${RED}[错误]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[成功]${NC} $1"
}

log_info() {
    echo -e "${BLUE}[信息]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[警告]${NC} $1"
}

log_progress() {
    echo -e "\n${BLUE}[进度]${NC} $1"
    echo "----------------------------------------"
}

# 检查ADB工具
check_adb() {
    log_progress "检查ADB工具"
    
    if ! command -v adb &> /dev/null; then
        log_error "未找到ADB工具，正在尝试安装..."
        
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS系统
            if ! command -v brew &> /dev/null; then
                log_error "未找到Homebrew，请先安装Homebrew"
                echo "安装命令: /bin/bash -c \"$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
                exit 1
            fi
            
            log_info "正在通过Homebrew安装ADB..."
            brew install android-platform-tools
        else
            log_error "请手动安装ADB工具"
            exit 1
        fi
    fi
    
    log_success "ADB工具检查完成"
}

# 连接设备
connect_device() {
    log_progress "连接Android设备"
    
    # 重启ADB服务
    adb kill-server > /dev/null 2>&1
    adb start-server > /dev/null 2>&1
    
    # 显示已连接设备
    log_info "已连接设备:"
    adb devices
    
    # 检查是否有设备连接
    if [ -z "$(adb devices | grep -v 'List' | grep device)" ]; then
        log_warn "未检测到已连接的设备，尝试无线连接..."
        
        # 尝试连接默认IP，设置超时
        DEFAULT_IP="192.168.2.15"
        log_info "尝试连接默认设备: ${DEFAULT_IP}:5555 (10秒超时)"
        
        # 使用timeout命令避免连接卡住
        if timeout 10 adb connect ${DEFAULT_IP}:5555 2>/dev/null | grep -q "connected"; then
            log_success "成功连接到 ${DEFAULT_IP}:5555"
            DEVICE_IP=${DEFAULT_IP}
        else
            log_warn "连接默认设备超时或失败，尝试其他方式"
            
            # 如果默认IP连接失败，提示用户输入IP
            read -p "请输入Android设备IP地址: " DEVICE_IP
            
            if [ -z "$DEVICE_IP" ]; then
                log_error "未提供IP地址，退出"
                exit 1
            fi
            
            log_info "尝试连接到 ${DEVICE_IP}:5555 (10秒超时)"
            if timeout 10 adb connect ${DEVICE_IP}:5555 2>/dev/null | grep -q "connected"; then
                log_success "成功连接到 ${DEVICE_IP}:5555"
            else
                log_error "无法连接到 ${DEVICE_IP}:5555"
                log_info "请确保:"
                echo "1. Android设备已开启USB调试"
                echo "2. Android设备已开启无线调试"
                echo "3. Android设备与电脑在同一WiFi网络"
                echo "4. Android设备已授权ADB连接"
                
                # 尝试ping测试设备是否可达
                log_info "尝试ping测试设备 ${DEVICE_IP}..."
                if ping -c 1 -W 3 ${DEVICE_IP} >/dev/null 2>&1; then
                    log_warn "设备可ping通但ADB连接失败，可能需要在设备上配置ADB无线调试"
                else
                    log_error "设备 ${DEVICE_IP} 无法访问，请检查网络连接"
                fi
                exit 1
            fi
        fi
    else
        log_success "检测到已连接设备"
        # 获取设备信息
        log_info "设备信息:"
        adb shell getprop ro.product.model 2>/dev/null || echo "无法获取设备型号"
        adb shell getprop ro.build.version.release 2>/dev/null || echo "无法获取Android版本"
    fi
}

# 下载并安装VNC客户端
install_vnc_client() {
    log_progress "下载并安装VNC客户端"
    
    # 创建临时目录
    TEMP_DIR=$(mktemp -d)
    cd "$TEMP_DIR"
    
    # 安装成功标志
    INSTALL_SUCCESS=false
    
    # VNC客户端列表 - 使用简单数组而非关联数组
    VNC_NAMES=("VNC Viewer" "bVNC Free" "MultiVNC" "TeamViewer")
    
    # 显示可用的VNC客户端
    echo "可用的VNC客户端:"
    for i in $(seq 0 $((${#VNC_NAMES[@]}-1))); do
        echo "$((i+1)). ${VNC_NAMES[$i]}"
    done
    
    # 1. 首先尝试VNC Viewer
    log_info "正在下载VNC Viewer (RealVNC)..."
    
    # 使用更可靠的APK下载源，增加超时设置
    VNC_VIEWER_URL="https://apkpure.com/vnc-viewer-remote-desktop/com.realvnc.viewer.android/download/apk"
    curl -L -o "VNCViewer.apk" "$VNC_VIEWER_URL" --connect-timeout 15 --max-time 60 --retry 3 --retry-delay 2
    
    # 检查下载文件大小 (macOS使用-f%z)
    VNC_SIZE=$(stat -f%z "VNCViewer.apk" 2>/dev/null || echo 0)
    log_info "VNCViewer.apk 文件大小: ${VNC_SIZE} 字节"
    
    if [ -f "VNCViewer.apk" ] && [ "$VNC_SIZE" -gt 1000000 ]; then
        log_success "VNC Viewer下载完成"
        
        # 安装APK
        log_info "正在安装VNC Viewer..."
        INSTALL_RESULT=$(adb install -r "VNCViewer.apk" 2>&1)
        log_info "安装结果: $INSTALL_RESULT"
        
        if echo "$INSTALL_RESULT" | grep -q "Success"; then
            log_success "VNC Viewer安装成功！"
            INSTALLED_VNC="${VNC_NAMES[0]}"
            INSTALL_SUCCESS=true
        else
            log_error "VNC Viewer安装失败，尝试安装bVNC..."
        fi
    else
        log_error "VNC Viewer下载失败或文件不完整，尝试备用下载源..."
        
        # 尝试备用下载源
        BACKUP_VNC_URL="https://github.com/realvnc-labs/vnc-viewer-android/releases/download/v3.8.0.48406/VNC_Viewer_v3.8.0.48406.apk"
        log_info "尝试备用源下载VNC Viewer..."
        curl -L -o "VNCViewer_backup.apk" "$BACKUP_VNC_URL" --connect-timeout 15 --max-time 60 --retry 3 --retry-delay 2
        
        # 检查下载文件大小
        VNC_SIZE=$(stat -f%z "VNCViewer_backup.apk" 2>/dev/null || echo 0)
        log_info "VNCViewer_backup.apk 文件大小: ${VNC_SIZE} 字节"
        
        if [ -f "VNCViewer_backup.apk" ] && [ "$VNC_SIZE" -gt 1000000 ]; then
            log_success "VNC Viewer备用源下载完成"
            
            # 安装APK
            log_info "正在安装VNC Viewer..."
            INSTALL_RESULT=$(adb install -r "VNCViewer_backup.apk" 2>&1)
            log_info "安装结果: $INSTALL_RESULT"
            
            if echo "$INSTALL_RESULT" | grep -q "Success"; then
                log_success "VNC Viewer安装成功！"
                INSTALLED_VNC="${VNC_NAMES[0]}"
                INSTALL_SUCCESS=true
            else
                log_error "VNC Viewer安装失败，尝试安装bVNC..."
            fi
        else
            log_error "VNC Viewer备用源下载失败，尝试安装bVNC..."
        fi
    fi
    
    # 2. 如果VNC Viewer安装失败，尝试bVNC
    if [ "$INSTALL_SUCCESS" = false ]; then
        # 下载并安装bVNC
        log_info "正在下载bVNC Free..."
        BVNC_URL="https://apkpure.com/bvnc-pro-secure-vnc-viewer/com.iiordanov.bVNC/download/apk"
        curl -L -o "bVNC.apk" "$BVNC_URL" --connect-timeout 15 --max-time 60 --retry 3 --retry-delay 2
        
        # 检查下载文件大小 (macOS使用-f%z)
        BVNC_SIZE=$(stat -f%z "bVNC.apk" 2>/dev/null || echo 0)
        log_info "bVNC.apk 文件大小: ${BVNC_SIZE} 字节"
        
        if [ -f "bVNC.apk" ] && [ "$BVNC_SIZE" -gt 1000000 ]; then
            log_success "bVNC下载完成"
            
            # 安装APK
            log_info "正在安装bVNC..."
            INSTALL_RESULT=$(adb install -r "bVNC.apk" 2>&1)
            log_info "安装结果: $INSTALL_RESULT"
            
            if echo "$INSTALL_RESULT" | grep -q "Success"; then
                log_success "bVNC安装成功！"
                INSTALLED_VNC="${VNC_NAMES[1]}"
                INSTALL_SUCCESS=true
            else
                log_error "bVNC安装失败，尝试安装MultiVNC..."
            fi
        else
            log_error "bVNC下载失败，尝试安装MultiVNC..."
        fi
    fi
    
    # 3. 如果前两个都失败，尝试MultiVNC
    if [ "$INSTALL_SUCCESS" = false ]; then
        # 尝试安装MultiVNC
        log_info "正在下载MultiVNC..."
        MULTIVNC_URL="https://apkpure.com/multivnc/com.coboltforge.dontmind.multivnc/download/apk"
        curl -L -o "MultiVNC.apk" "$MULTIVNC_URL" --connect-timeout 15 --max-time 60 --retry 3 --retry-delay 2
        
        # 检查下载文件大小 (macOS使用-f%z)
        MULTIVNC_SIZE=$(stat -f%z "MultiVNC.apk" 2>/dev/null || echo 0)
        log_info "MultiVNC.apk 文件大小: ${MULTIVNC_SIZE} 字节"
        
        if [ -f "MultiVNC.apk" ] && [ "$MULTIVNC_SIZE" -gt 1000000 ]; then
            log_success "MultiVNC下载完成"
            
            log_info "正在安装MultiVNC..."
            INSTALL_RESULT=$(adb install -r "MultiVNC.apk" 2>&1)
            log_info "安装结果: $INSTALL_RESULT"
            
            if echo "$INSTALL_RESULT" | grep -q "Success"; then
                log_success "MultiVNC安装成功！"
                INSTALLED_VNC="${VNC_NAMES[2]}"
                INSTALL_SUCCESS=true
            else
                log_error "MultiVNC安装失败，尝试安装TeamViewer..."
            fi
        else
            log_error "MultiVNC下载失败，尝试安装TeamViewer..."
        fi
    fi
    
    # 4. 如果前三个都失败，尝试TeamViewer作为备选
    if [ "$INSTALL_SUCCESS" = false ]; then
        log_info "尝试安装TeamViewer作为备选..."
        TV_URL="https://download.teamviewer.com/download/TeamViewer.apk"
        curl -L -o "TeamViewer.apk" "$TV_URL" --connect-timeout 15 --max-time 60 --retry 3 --retry-delay 2
        
        # 检查下载文件大小
        TV_SIZE=$(stat -f%z "TeamViewer.apk" 2>/dev/null || echo 0)
        log_info "TeamViewer.apk 文件大小: ${TV_SIZE} 字节"
        
        if [ -f "TeamViewer.apk" ] && [ "$TV_SIZE" -gt 1000000 ]; then
            log_info "正在安装TeamViewer..."
            INSTALL_RESULT=$(adb install -r "TeamViewer.apk" 2>&1)
            log_info "安装结果: $INSTALL_RESULT"
            
            if echo "$INSTALL_RESULT" | grep -q "Success"; then
                log_success "TeamViewer安装成功！"
                INSTALLED_VNC="${VNC_NAMES[3]}"
                INSTALL_SUCCESS=true
            else
                log_error "TeamViewer安装失败"
                log_error "所有远程控制应用安装失败，请手动安装"
            fi
        else
            log_error "TeamViewer下载失败"
            log_error "所有远程控制应用安装失败，请手动安装"
        fi
    fi
    
    # 清理临时文件
    cd - >/dev/null
    rm -rf "$TEMP_DIR"
    
    # 检查最终安装结果
    if [ "$INSTALL_SUCCESS" = true ]; then
        log_success "成功安装 $INSTALLED_VNC"
        return 0
    else
        log_error "所有远程控制应用安装失败，请手动安装"
        return 1
    fi
}

# 显示使用指南
show_usage_guide() {
    log_progress "VNC客户端使用指南"
    
    # 如果INSTALLED_VNC未设置，则使用默认值
    local vnc_app=${INSTALLED_VNC:-"VNC Viewer"}
    
    echo "📱 在Android设备上:"
    echo "1. 打开已安装的$vnc_app应用"
    echo "2. 点击 + 或 '新建连接' 按钮"
    echo "3. 输入MacBook的IP地址 (不需要添加'vnc://'前缀)"
    echo "4. 端口通常为5900 (默认VNC端口)"
    echo "5. 如果需要，输入在MacBook上设置的密码"
    echo "6. 保存并连接"
    echo ""
    echo "💻 在MacBook上:"
    echo "1. 确保已启用屏幕共享 (系统设置 > 共享 > 屏幕共享)"
    echo "2. 记下MacBook的IP地址: $(ifconfig en0 | grep 'inet ' | awk '{print $2}')"
    echo "3. 确保MacBook和Android设备在同一网络"
    echo ""
    echo "🔧 故障排除:"
    echo "• 如果连接被拒绝，检查MacBook的防火墙设置"
    echo "• 如果看不到画面，尝试调整VNC客户端的画质设置"
    echo "• 如果连接缓慢，确保两设备在同一局域网"
    echo ""
    echo "📞 如需帮助，联系卡若: 微信 28533368"
}

# 主函数
main() {
    echo "🚀 VNC客户端安装工具"
    echo "作者: 卡若 | 版本: 1.0.0"
    echo "功能: 安装VNC客户端到Android设备，用于接收MacBook屏幕共享"
    echo "======================================="
    echo ""
    
    # 检查ADB工具
    check_adb
    echo ""
    
    # 连接设备
    connect_device
    echo ""
    
    # 安装VNC客户端
    if install_vnc_client; then
        log_success "VNC客户端安装完成！"
        echo ""
        show_usage_guide
    else
        log_error "VNC客户端安装失败"
        exit 1
    fi
    
    echo ""
    log_success "脚本执行完成！"
}

# 执行主函数
main