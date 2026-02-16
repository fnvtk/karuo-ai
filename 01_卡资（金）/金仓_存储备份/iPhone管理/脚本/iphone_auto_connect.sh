#!/bin/bash
# iPhone 自动连接脚本
# 功能：检测网络状态，自动切换到 iPhone USB 或个人热点
# 作者：卡若AI

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_FILE="/tmp/iphone_auto_connect.log"
IPHONE_USB_SERVICE="iPhone USB"
WIFI_SERVICE="Wi-Fi"

# 加载配置文件
if [ -f "$SCRIPT_DIR/config.sh" ]; then
    source "$SCRIPT_DIR/config.sh"
fi

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# 检查是否有互联网连接
check_internet() {
    ping -c 1 -W 2 8.8.8.8 &>/dev/null
    return $?
}

# 检查 WiFi 是否已连接
check_wifi_connected() {
    local wifi_status=$(networksetup -getairportnetwork en0 2>/dev/null | grep -v "not associated")
    if [ -n "$wifi_status" ]; then
        return 0
    fi
    return 1
}

# 检查 iPhone 是否通过 USB 连接
check_iphone_usb() {
    system_profiler SPUSBDataType 2>/dev/null | grep -q "iPhone"
    return $?
}

# 获取 iPhone USB 网络接口
get_iphone_interface() {
    networksetup -listallhardwareports | grep -A 1 "iPhone USB" | grep "Device" | awk '{print $2}'
}

# 启用 iPhone USB 网络
enable_iphone_usb() {
    log "尝试启用 iPhone USB 网络..."
    
    # 确保 iPhone USB 服务已启用
    networksetup -setnetworkserviceenabled "$IPHONE_USB_SERVICE" on 2>/dev/null
    
    # 设置为 DHCP
    networksetup -setdhcp "$IPHONE_USB_SERVICE" 2>/dev/null
    
    # 等待获取 IP
    sleep 3
    
    # 检查是否获取到 IP
    local ip=$(networksetup -getinfo "$IPHONE_USB_SERVICE" 2>/dev/null | grep "^IP address" | awk '{print $3}')
    if [ -n "$ip" ] && [ "$ip" != "none" ]; then
        log "iPhone USB 网络已启用，IP: $ip"
        
        # 设置网络服务顺序，优先使用 iPhone USB
        networksetup -ordernetworkservices "$IPHONE_USB_SERVICE" "$WIFI_SERVICE" "Thunderbolt Bridge" 2>/dev/null
        return 0
    fi
    
    log "iPhone USB 网络启用失败"
    return 1
}

# 连接 iPhone 个人热点（通过蓝牙/WiFi）
# 热点名称配置在 config.sh 中
connect_iphone_hotspot() {
    log "尝试连接 iPhone 个人热点..."
    
    # 开启 WiFi
    networksetup -setairportpower en0 on 2>/dev/null
    sleep 2
    
    # 获取已保存的网络列表
    local saved_networks=$(networksetup -listpreferredwirelessnetworks en0 2>/dev/null)
    
    # 遍历配置的热点名称，尝试连接
    for hotspot_name in "${IPHONE_HOTSPOT_NAMES[@]}"; do
        # 检查是否在已保存网络中
        if echo "$saved_networks" | grep -q "$hotspot_name"; then
            log "尝试连接热点: $hotspot_name"
            
            # 连接热点
            networksetup -setairportnetwork en0 "$hotspot_name" 2>/dev/null
            sleep 5
            
            if check_internet; then
                log "成功连接到 iPhone 热点: $hotspot_name"
                return 0
            else
                log "连接 $hotspot_name 失败，尝试下一个..."
            fi
        fi
    done
    
    # 如果配置的热点都不行，尝试搜索包含 iPhone 关键词的网络
    local iphone_network=$(echo "$saved_networks" | grep -i "iphone" | head -1 | xargs)
    if [ -n "$iphone_network" ]; then
        log "尝试连接: $iphone_network"
        networksetup -setairportnetwork en0 "$iphone_network" 2>/dev/null
        sleep 5
        if check_internet; then
            log "成功连接到: $iphone_network"
            return 0
        fi
    fi
    
    log "未找到可用的 iPhone 个人热点"
    return 1
}

# 主逻辑
main() {
    log "=== iPhone 自动连接检查 ==="
    
    # 1. 检查当前是否已有网络
    if check_internet; then
        log "当前网络正常，无需切换"
        exit 0
    fi
    
    log "当前无网络连接，尝试自动连接..."
    
    # 2. 优先检查 iPhone USB 连接
    if check_iphone_usb; then
        log "检测到 iPhone USB 连接"
        if enable_iphone_usb; then
            if check_internet; then
                log "通过 iPhone USB 上网成功"
                # 发送通知
                osascript -e 'display notification "已通过 iPhone USB 连接上网" with title "网络已连接"' 2>/dev/null
                exit 0
            fi
        fi
    fi
    
    # 3. 尝试连接 iPhone 个人热点
    if connect_iphone_hotspot; then
        log "通过 iPhone 个人热点上网成功"
        osascript -e 'display notification "已连接 iPhone 个人热点" with title "网络已连接"' 2>/dev/null
        exit 0
    fi
    
    log "所有自动连接方式均失败"
    osascript -e 'display notification "请检查 iPhone 是否已连接或开启个人热点" with title "网络连接失败"' 2>/dev/null
    exit 1
}

# 执行
main "$@"
