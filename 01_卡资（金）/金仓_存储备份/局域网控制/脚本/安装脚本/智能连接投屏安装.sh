#!/bin/bash

# 智能连接投屏安装脚本
# 功能：自动发现设备IP并安装投屏应用
# 作者：卡若
# 更新日期：2025年1月

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

# 全局变量
FOUND_DEVICES=()
TARGET_DEVICE=""
CONFIG_FILE="config/device_cache.txt"

# 创建配置目录
mkdir -p config

# 检查必要工具
check_tools() {
    log_info "检查必要工具..."
    
    # 检查ADB
    if ! command -v adb >/dev/null 2>&1; then
        log_error "ADB未安装，正在安装..."
        if command -v brew >/dev/null 2>&1; then
            brew install android-platform-tools
        else
            log_error "请先安装Homebrew或手动安装ADB"
            exit 1
        fi
    fi
    
    # 检查curl
    if ! command -v curl >/dev/null 2>&1; then
        log_error "curl未安装"
        exit 1
    fi
    
    log_info "✅ 工具检查完成"
}

# 获取本机网络信息
get_network_info() {
    # macOS获取网络信息
    LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')
    if [ -z "$LOCAL_IP" ]; then
        log_error "无法获取本机IP地址"
        exit 1
    fi
    
    # 提取网段 (例如: 192.168.1.100 -> 192.168.1)
    NETWORK=$(echo $LOCAL_IP | cut -d'.' -f1-3)
    
    log_info "本机IP: $LOCAL_IP"
    log_info "扫描网段: ${NETWORK}.1-254"
}

# 快速ping扫描
ping_scan() {
    log_progress "执行ping扫描 ${NETWORK}.1-254..."
    
    local temp_file="/tmp/ping_results_$$"
    > "$temp_file"
    
    # 并行ping扫描
    for i in {1..254}; do
        {
            IP="${NETWORK}.$i"
            if ping -c 1 -W 1000 "$IP" >/dev/null 2>&1; then
                echo "$IP" >> "$temp_file"
            fi
        } &
        
        # 控制并发数量
        if (( i % 50 == 0 )); then
            wait
        fi
    done
    wait
    
    # 读取结果
    if [ -f "$temp_file" ]; then
        cat "$temp_file"
        rm -f "$temp_file"
    fi
}

# ADB端口扫描
adb_scan() {
    local ip=$1
    local ports=("5555" "5037" "4444" "5556")
    
    for port in "${ports[@]}"; do
        # 尝试连接ADB端口
        if timeout 3 bash -c "</dev/tcp/$ip/$port" 2>/dev/null; then
            return 0
        fi
    done
    return 1
}

# 获取设备信息
get_device_info() {
    local ip=$1
    local port=${2:-5555}
    
    # 尝试连接并获取设备信息
    adb connect "$ip:$port" >/dev/null 2>&1
    sleep 1
    
    if adb devices | grep -q "$ip:$port.*device"; then
        local model=$(adb -s "$ip:$port" shell getprop ro.product.model 2>/dev/null | tr -d '\r' || echo "未知")
        local brand=$(adb -s "$ip:$port" shell getprop ro.product.brand 2>/dev/null | tr -d '\r' || echo "未知")
        local version=$(adb -s "$ip:$port" shell getprop ro.build.version.release 2>/dev/null | tr -d '\r' || echo "未知")
        
        echo "$brand|$model|$version"
        return 0
    fi
    
    return 1
}

# 从缓存读取设备
read_device_cache() {
    if [ -f "$CONFIG_FILE" ]; then
        log_info "读取设备缓存..."
        while IFS='|' read -r ip brand model version last_seen; do
            # 检查设备是否仍然可连接
            if ping -c 1 -W 1000 "$ip" >/dev/null 2>&1; then
                if adb_scan "$ip"; then
                    FOUND_DEVICES+=("$ip|$brand|$model|$version")
                    log_info "✅ 缓存设备可用: $ip ($brand $model)"
                fi
            fi
        done < "$CONFIG_FILE"
    fi
}

# 保存设备到缓存
save_device_cache() {
    log_progress "保存设备缓存..."
    > "$CONFIG_FILE"
    
    for device in "${FOUND_DEVICES[@]}"; do
        IFS='|' read -r ip brand model version <<< "$device"
        echo "$ip|$brand|$model|$version|$(date +%Y-%m-%d_%H:%M:%S)" >> "$CONFIG_FILE"
    done
    
    log_info "设备缓存已保存: $CONFIG_FILE"
}

# 扫描Android设备
scan_android_devices() {
    log_info "🔍 开始扫描Android设备..."
    echo
    
    # 重启ADB服务
    log_progress "重启ADB服务..."
    adb kill-server >/dev/null 2>&1 || true
    adb start-server >/dev/null 2>&1
    
    # 获取网络信息
    get_network_info
    echo
    
    # 先尝试从缓存读取
    read_device_cache
    
    # 如果缓存中没有设备，执行完整扫描
    if [ ${#FOUND_DEVICES[@]} -eq 0 ]; then
        log_progress "缓存中无可用设备，执行完整扫描..."
        
        # 执行ping扫描
        ALIVE_IPS=($(ping_scan))
        
        if [ ${#ALIVE_IPS[@]} -eq 0 ]; then
            log_warn "未发现任何活跃设备"
            return 1
        fi
        
        log_info "发现 ${#ALIVE_IPS[@]} 个活跃IP地址"
        echo
        
        # 扫描Android设备
        log_progress "检测Android设备..."
        
        for ip in "${ALIVE_IPS[@]}"; do
            if [ "$ip" != "$LOCAL_IP" ]; then
                log_progress "检测 $ip..."
                
                if adb_scan "$ip"; then
                    device_info=$(get_device_info "$ip")
                    if [ $? -eq 0 ]; then
                        FOUND_DEVICES+=("$ip|$device_info")
                        
                        IFS='|' read -r ip_addr brand model version <<< "$ip|$device_info"
                        log_info "📱 发现设备: $ip_addr - $brand $model (Android $version)"
                    fi
                fi
            fi
        done
        
        # 保存到缓存
        if [ ${#FOUND_DEVICES[@]} -gt 0 ]; then
            save_device_cache
        fi
    fi
    
    echo
    
    # 显示结果
    if [ ${#FOUND_DEVICES[@]} -eq 0 ]; then
        log_warn "未发现可连接的Android设备"
        log_info "请确保设备已开启:"
        log_info "1. 开发者选项"
        log_info "2. USB调试"
        log_info "3. 无线ADB调试"
        return 1
    fi
    
    log_success "发现 ${#FOUND_DEVICES[@]} 个Android设备！"
    return 0
}

# 选择目标设备
select_target_device() {
    if [ ${#FOUND_DEVICES[@]} -eq 1 ]; then
        TARGET_DEVICE="${FOUND_DEVICES[0]}"
        IFS='|' read -r ip brand model version <<< "$TARGET_DEVICE"
        log_info "自动选择唯一设备: $ip ($brand $model)"
        return 0
    fi
    
    echo "=== 发现的设备列表 ==="
    printf "%-3s %-15s %-12s %-20s %-12s\n" "序号" "IP地址" "品牌" "型号" "Android版本"
    echo "----------------------------------------------------------"
    
    local i=1
    for device in "${FOUND_DEVICES[@]}"; do
        IFS='|' read -r ip brand model version <<< "$device"
        printf "%-3s %-15s %-12s %-20s %-12s\n" "$i" "$ip" "$brand" "$model" "$version"
        ((i++))
    done
    
    echo
    read -p "请选择要连接的设备 (1-${#FOUND_DEVICES[@]}): " choice
    
    if [[ "$choice" =~ ^[0-9]+$ ]] && [ "$choice" -ge 1 ] && [ "$choice" -le ${#FOUND_DEVICES[@]} ]; then
        TARGET_DEVICE="${FOUND_DEVICES[$((choice-1))]}"
        IFS='|' read -r ip brand model version <<< "$TARGET_DEVICE"
        log_info "已选择设备: $ip ($brand $model)"
        return 0
    else
        log_error "无效选择"
        return 1
    fi
}

# 连接设备
connect_device() {
    IFS='|' read -r ip brand model version <<< "$TARGET_DEVICE"
    
    log_progress "连接设备 $ip..."
    
    # 尝试连接
    if adb connect "$ip:5555" 2>/dev/null | grep -q "connected"; then
        # 测试连接
        if adb -s "$ip:5555" shell echo "test" >/dev/null 2>&1; then
            log_success "设备连接成功: $ip ($brand $model)"
            
            # 显示设备详细信息
            log_info "设备详细信息:"
            log_info "  品牌: $brand"
            log_info "  型号: $model"
            log_info "  Android版本: $version"
            
            # 获取电池和存储信息
            battery=$(adb -s "$ip:5555" shell dumpsys battery | grep level | cut -d':' -f2 | tr -d ' ' 2>/dev/null || echo "未知")
            log_info "  电池电量: ${battery}%"
            
            return 0
        else
            log_error "设备连接异常"
            return 1
        fi
    else
        log_error "设备连接失败"
        return 1
    fi
}

# 检查应用是否已安装
check_app_installed() {
    local package_name=$1
    local device_id=$2
    
    if adb -s "$device_id" shell pm list packages | grep -q "$package_name"; then
        return 0
    else
        return 1
    fi
}

# 下载并安装应用
install_app() {
    local app_name=$1
    local package_name=$2
    local download_url=$3
    local device_id=$4
    
    log_progress "处理应用: $app_name"
    
    # 检查是否已安装
    if check_app_installed "$package_name" "$device_id"; then
        log_info "✅ $app_name 已安装，跳过"
        return 0
    fi
    
    # 下载APK
    local apk_file="/tmp/${app_name}.apk"
    log_progress "下载 $app_name..."
    
    if curl -L -o "$apk_file" "$download_url" --connect-timeout 30 --max-time 300; then
        # 检查文件大小
        local file_size=$(stat -f%z "$apk_file" 2>/dev/null || echo 0)
        if [ "$file_size" -lt 1000 ]; then
            log_error "$app_name 下载失败，文件过小"
            rm -f "$apk_file"
            return 1
        fi
        
        log_info "$app_name 下载完成 (${file_size} bytes)"
        
        # 安装APK
        log_progress "安装 $app_name..."
        if adb -s "$device_id" install "$apk_file" >/dev/null 2>&1; then
            log_success "$app_name 安装成功"
            rm -f "$apk_file"
            return 0
        else
            log_error "$app_name 安装失败"
            rm -f "$apk_file"
            return 1
        fi
    else
        log_error "$app_name 下载失败"
        return 1
    fi
}

# 安装投屏应用
install_screen_apps() {
    IFS='|' read -r ip brand model version <<< "$TARGET_DEVICE"
    local device_id="$ip:5555"
    
    log_info "🚀 开始安装投屏应用到设备: $ip ($brand $model)"
    echo
    
    # 定义应用列表
    declare -a apps=(
        "scrcpy|com.genymobile.scrcpy|https://github.com/Genymobile/scrcpy/releases/download/v2.0/scrcpy-android-v2.0.apk"
        "Vysor|com.koushikdutta.vysor|https://github.com/koush/vysor.io/releases/download/3.1.6/vysor.apk"
        "AnyDesk|com.anydesk.anydeskandroid|https://download.anydesk.com/anydesk.apk"
        "TeamViewer|com.teamviewer.teamviewer.market.mobile|https://download.teamviewer.com/download/TeamViewerQS.apk"
    )
    
    local success_count=0
    local total_count=${#apps[@]}
    
    for app_info in "${apps[@]}"; do
        IFS='|' read -r app_name package_name download_url <<< "$app_info"
        
        if install_app "$app_name" "$package_name" "$download_url" "$device_id"; then
            ((success_count++))
        fi
        echo
    done
    
    echo "=== 安装结果 ==="
    log_info "成功安装: $success_count/$total_count 个应用"
    
    if [ "$success_count" -gt 0 ]; then
        log_success "投屏应用安装完成！"
        log_info "设备信息已保存，下次可直接连接"
        return 0
    else
        log_error "所有应用安装失败"
        return 1
    fi
}

# 显示使用指南
show_usage_guide() {
    echo
    echo "=== 投屏应用使用指南 ==="
    echo
    echo "📱 手机端应用:"
    echo "  • scrcpy: 高性能投屏工具"
    echo "  • Vysor: 简单易用的投屏软件"
    echo "  • AnyDesk: 远程桌面工具"
    echo "  • TeamViewer: 专业远程控制"
    echo
    echo "💻 电脑端工具:"
    echo "  • scrcpy: brew install scrcpy"
    echo "  • Vysor: https://www.vysor.io/"
    echo "  • AnyDesk: https://anydesk.com/"
    echo "  • TeamViewer: https://www.teamviewer.com/"
    echo
    echo "🔧 连接方式:"
    echo "  1. 确保手机和电脑在同一网络"
    echo "  2. 手机开启对应应用"
    echo "  3. 电脑端连接手机IP地址"
    echo
    IFS='|' read -r ip brand model version <<< "$TARGET_DEVICE"
    echo "📍 当前设备IP: $ip"
    echo "   设备信息: $brand $model (Android $version)"
    echo
}

# 主函数
main() {
    echo "🚀 智能连接投屏安装工具"
    echo "作者: 卡若 | 版本: 1.0.0"
    echo "功能: 自动发现设备IP并安装投屏应用"
    echo "========================================"
    echo
    
    # 检查工具
    check_tools
    echo
    
    # 扫描设备
    if ! scan_android_devices; then
        log_error "设备扫描失败"
        exit 1
    fi
    
    # 选择目标设备
    if ! select_target_device; then
        log_error "设备选择失败"
        exit 1
    fi
    echo
    
    # 连接设备
    if ! connect_device; then
        log_error "设备连接失败"
        exit 1
    fi
    echo
    
    # 安装投屏应用
    if install_screen_apps; then
        show_usage_guide
        log_success "所有任务完成！设备已准备就绪"
    else
        log_error "应用安装失败"
        exit 1
    fi
}

# 运行主函数
main "$@"

exit 0