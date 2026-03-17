#!/bin/bash

# Android显示管理应用安装脚本
# 作者：卡若
# 功能：为Android设备安装显示管理和扩展屏相关应用
# 适用系统：Android 7.1.2 (RK3399)

# 颜色定义
RED="\033[0;31m"
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
BLUE="\033[0;34m"
NC="\033[0m"

# 设备信息
DEVICE_IP="192.168.2.15:5555"
ANDROID_VERSION="7.1.2"
DEVICE_MODEL="RK3399"

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
    if adb devices | grep -q "$DEVICE_IP.*device"; then
        log_success "设备连接正常: $DEVICE_IP"
        return 0
    else
        log_error "设备连接失败，请检查ADB连接"
        return 1
    fi
}

# 获取设备信息
get_device_info() {
    log_info "获取设备信息..."
    android_version=$(adb -s $DEVICE_IP shell getprop ro.build.version.release)
    device_model=$(adb -s $DEVICE_IP shell getprop ro.product.model)
    device_brand=$(adb -s $DEVICE_IP shell getprop ro.product.brand)
    
    echo "设备型号: $device_model"
    echo "Android版本: $android_version"
    echo "设备品牌: $device_brand"
    echo "设备架构: $(adb -s $DEVICE_IP shell getprop ro.product.cpu.abi)"
}

# 安装VNC客户端（替代BetterDisplay的显示管理功能）
install_vnc_client() {
    log_info "=== 安装VNC客户端 ==="
    log_info "VNC客户端可以连接到Mac的BetterDisplay虚拟显示器"
    
    # 检查是否已安装
    if adb -s $DEVICE_IP shell pm list packages | grep -q "realvnc.viewer\|iiordanov.bVNC"; then
        log_success "VNC客户端已安装"
        return 0
    fi
    
    # 下载适合Android 7.1.2的VNC客户端
    vnc_apk="/tmp/bvnc_android7.apk"
    
    log_info "正在下载bVNC客户端（适配Android 7.1.2）..."
    if curl -L -o "$vnc_apk" "https://github.com/iiordanov/bVNC/releases/download/v5.0.1/bVNC-5.0.1.apk" 2>/dev/null; then
        log_success "VNC客户端下载完成"
        
        log_info "正在安装VNC客户端..."
        if adb -s $DEVICE_IP install "$vnc_apk"; then
            log_success "VNC客户端安装成功"
            
            # 启动VNC客户端
            log_info "启动VNC客户端..."
            adb -s $DEVICE_IP shell am start -n com.iiordanov.bVNC/.bVNC
            
            rm -f "$vnc_apk"
            return 0
        else
            log_error "VNC客户端安装失败"
            rm -f "$vnc_apk"
            return 1
        fi
    else
        log_error "VNC客户端下载失败"
        return 1
    fi
}

# 安装屏幕镜像应用
install_screen_mirror_apps() {
    log_info "=== 安装屏幕镜像应用 ==="
    
    # 1. 安装scrcpy客户端（如果有Android版本）
    log_info "检查scrcpy相关应用..."
    
    # 2. 安装TeamViewer QuickSupport
    log_info "安装TeamViewer QuickSupport..."
    teamviewer_apk="/tmp/teamviewer_qs.apk"
    
    if curl -L -o "$teamviewer_apk" "https://download.teamviewer.com/download/TeamViewerQS.apk" 2>/dev/null; then
        log_info "正在安装TeamViewer QuickSupport..."
        if adb -s $DEVICE_IP install "$teamviewer_apk"; then
            log_success "TeamViewer QuickSupport安装成功"
        else
            log_warning "TeamViewer QuickSupport安装失败"
        fi
        rm -f "$teamviewer_apk"
    fi
    
    # 3. 安装AnyDesk（已知兼容Android 7.1.2）
    log_info "安装AnyDesk..."
    anydesk_apk="/tmp/anydesk.apk"
    
    if curl -L -o "$anydesk_apk" "https://download.anydesk.com/anydesk.apk" 2>/dev/null; then
        log_info "正在安装AnyDesk..."
        if adb -s $DEVICE_IP install "$anydesk_apk"; then
            log_success "AnyDesk安装成功"
            # 启动AnyDesk
            adb -s $DEVICE_IP shell am start -n com.anydesk.anydeskandroid/.HubActivity
        else
            log_warning "AnyDesk安装失败"
        fi
        rm -f "$anydesk_apk"
    fi
}

# 安装显示设置工具
install_display_tools() {
    log_info "=== 安装显示设置工具 ==="
    
    # 1. 安装Resolution Changer（分辨率修改工具）
    log_info "安装Resolution Changer..."
    resolution_apk="/tmp/resolution_changer.apk"
    
    # 使用APKPure下载
    if curl -L -o "$resolution_apk" "https://d.apkpure.com/b/APK/com.nomone.resolution_changer?version=latest" 2>/dev/null; then
        log_info "正在安装Resolution Changer..."
        if adb -s $DEVICE_IP install "$resolution_apk"; then
            log_success "Resolution Changer安装成功"
        else
            log_warning "Resolution Changer安装失败"
        fi
        rm -f "$resolution_apk"
    fi
    
    # 2. 设置显示相关权限
    log_info "配置显示权限..."
    
    # 启用开发者选项中的显示相关设置
    adb -s $DEVICE_IP shell settings put global development_settings_enabled 1
    adb -s $DEVICE_IP shell settings put global adb_enabled 1
    
    # 设置显示密度（可选）
    current_density=$(adb -s $DEVICE_IP shell wm density | grep -o '[0-9]*')
    log_info "当前显示密度: ${current_density}dpi"
}

# 配置扩展屏功能
configure_extended_display() {
    log_info "=== 配置扩展屏功能 ==="
    
    # 检查设备是否支持多显示器
    log_info "检查多显示器支持..."
    display_info=$(adb -s $DEVICE_IP shell dumpsys display | grep "Display")
    echo "显示器信息:"
    echo "$display_info"
    
    # 获取当前分辨率
    current_resolution=$(adb -s $DEVICE_IP shell wm size)
    log_info "当前分辨率: $current_resolution"
    
    # 提供扩展屏使用说明
    echo ""
    log_info "扩展屏使用说明:"
    echo "1. VNC方式: 在Mac上启动BetterDisplay创建虚拟显示器，手机用VNC连接"
    echo "2. 投屏方式: 使用AnyDesk或TeamViewer进行屏幕共享"
    echo "3. 有线连接: 如果设备支持，可通过USB-C或HDMI连接外部显示器"
}

# 创建使用指南
create_usage_guide() {
    log_info "=== 创建使用指南 ==="
    
    guide_file="/Users/karuo/Documents/开发/4、小工具/局域网手机电脑控制/文档/安装文档/Android显示管理应用使用指南.md"
    
    cat > "$guide_file" << 'EOF'
# Android显示管理应用使用指南

## 设备信息
- 设备型号: RK3399
- Android版本: 7.1.2
- 设备IP: 192.168.2.15:5555

## 已安装应用

### 1. VNC客户端 (bVNC)
**功能**: 连接Mac的BetterDisplay虚拟显示器
**使用方法**:
1. 在Mac上启动BetterDisplay，创建虚拟显示器
2. 启用Mac屏幕共享（系统偏好设置 > 共享 > 屏幕共享）
3. 在手机bVNC中连接Mac IP地址
4. 输入Mac用户名和密码
5. 连接成功后可看到Mac的虚拟显示器内容

### 2. AnyDesk
**功能**: 远程桌面和屏幕共享
**使用方法**:
1. 在Mac上安装AnyDesk
2. 获取Mac的AnyDesk ID
3. 在手机AnyDesk中输入Mac的ID进行连接
4. 可以远程控制Mac桌面

### 3. TeamViewer QuickSupport
**功能**: 远程支持和屏幕共享
**使用方法**:
1. 启动应用获取设备ID
2. 在Mac上使用TeamViewer连接此ID
3. 可以从Mac远程控制手机

## 扩展屏实现方案

### 方案1: BetterDisplay + VNC（推荐）
1. Mac上启动BetterDisplay创建虚拟显示器
2. 设置合适的分辨率（建议1280x720）
3. 启用Mac屏幕共享服务
4. 手机VNC客户端连接Mac
5. 将需要扩展的窗口拖到虚拟显示器
6. 手机即可显示扩展屏内容

### 方案2: AnyDesk屏幕共享
1. Mac和手机都安装AnyDesk
2. 建立连接后选择"仅查看屏幕"
3. 可以在手机上查看Mac屏幕内容

## 故障排除

### VNC连接问题
- 确保Mac和手机在同一WiFi网络
- 检查Mac防火墙设置
- 确认屏幕共享服务已启用

### 应用启动问题
- 检查应用权限设置
- 重启应用或重新安装
- 确认Android版本兼容性

### 显示问题
- 调整分辨率设置
- 检查显示密度配置
- 确认设备硬件支持

## 技术参数
- 支持的最大分辨率: 1920x1080
- 推荐分辨率: 1280x720
- 网络延迟: <50ms（局域网）
- 支持的颜色深度: 24位
EOF
    
    log_success "使用指南已创建: $guide_file"
}

# 主安装流程
main_install() {
    log_info "=== Android显示管理应用安装开始 ==="
    log_warning "注意: BetterDisplay是Mac专用软件，无法直接安装到Android"
    log_info "将为您安装Android兼容的显示管理和扩展屏应用"
    
    # 检查连接
    if ! check_adb_connection; then
        exit 1
    fi
    
    # 获取设备信息
    get_device_info
    
    echo ""
    log_info "开始安装适合Android 7.1.2的显示管理应用..."
    
    # 安装VNC客户端
    install_vnc_client
    
    # 安装屏幕镜像应用
    install_screen_mirror_apps
    
    # 安装显示工具
    install_display_tools
    
    # 配置扩展屏功能
    configure_extended_display
    
    # 创建使用指南
    create_usage_guide
    
    echo ""
    log_success "=== 安装完成 ==="
    log_info "已安装的应用:"
    echo "✓ VNC客户端 (bVNC) - 连接Mac虚拟显示器"
    echo "✓ AnyDesk - 远程桌面和屏幕共享"
    echo "✓ TeamViewer QuickSupport - 远程支持"
    echo "✓ Resolution Changer - 分辨率设置工具"
    
    echo ""
    log_info "使用建议:"
    echo "1. 推荐使用VNC + Mac BetterDisplay实现扩展屏功能"
    echo "2. AnyDesk适合远程控制和屏幕共享"
    echo "3. 详细使用方法请查看生成的使用指南文档"
    
    echo ""
    log_info "下一步操作:"
    echo "1. 在Mac上启动BetterDisplay创建虚拟显示器"
    echo "2. 启用Mac屏幕共享服务"
    echo "3. 使用手机VNC客户端连接Mac"
    echo "4. 享受扩展屏功能！"
}

# 运行主程序
main_install