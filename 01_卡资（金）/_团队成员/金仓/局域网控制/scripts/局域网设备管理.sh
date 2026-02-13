#!/bin/bash
# 局域网设备管理系统 - 通用版本
# 作者：卡若
# 功能：自动发现和管理局域网中的所有可控制设备（手机、电脑、电视、平板等）
# 版本：2.0.0

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# 日志函数
log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_progress() { echo -e "${BLUE}[SCAN]${NC} $1"; }
log_found() { echo -e "${PURPLE}[FOUND]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }

# 全局变量
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEVICE_LIST=()
ANDROID_DEVICES=()
COMPUTER_DEVICES=()
TV_DEVICES=()
OTHER_DEVICES=()

# 显示标题
show_banner() {
    clear
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}          ${GREEN}局域网设备管理系统 v2.0.0${NC}                    ${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}          ${BLUE}作者：卡若 | 随时随地控制你的设备${NC}              ${CYAN}║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo
}

# 获取本机网络信息
get_network_info() {
    log_info "正在获取网络信息..."
    
    # macOS获取网络信息
    LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')
    if [ -z "$LOCAL_IP" ]; then
        # 尝试其他方法
        LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
    fi
    
    if [ -z "$LOCAL_IP" ]; then
        log_error "无法获取本机IP地址，请检查网络连接"
        return 1
    fi
    
    # 提取网段
    NETWORK=$(echo $LOCAL_IP | cut -d'.' -f1-3)
    GATEWAY=$(netstat -rn | grep default | grep -v utun | head -1 | awk '{print $2}')
    
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "  ${BLUE}本机IP:${NC} $LOCAL_IP"
    echo -e "  ${BLUE}网段:${NC} ${NETWORK}.0/24"
    echo -e "  ${BLUE}网关:${NC} $GATEWAY"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo
    
    return 0
}

# 检查必要工具
check_tools() {
    log_info "检查必要工具..."
    
    local missing_tools=()
    
    # 检查ADB
    if ! command -v adb >/dev/null 2>&1; then
        missing_tools+=("adb (Android调试工具)")
        log_warn "ADB未安装: brew install android-platform-tools"
    fi
    
    # 检查nmap（可选）
    if ! command -v nmap >/dev/null 2>&1; then
        log_warn "nmap未安装，将使用ping扫描（速度较慢）"
        log_info "建议安装: brew install nmap"
    fi
    
    if [ ${#missing_tools[@]} -gt 0 ]; then
        log_warn "以下工具未安装: ${missing_tools[*]}"
        echo
        read -p "是否继续？(y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        log_success "所有必要工具已安装"
    fi
    echo
}

# 快速ping扫描
ping_scan() {
    log_progress "正在扫描局域网设备..."
    
    local temp_file="/tmp/lan_scan_$$"
    > "$temp_file"
    
    # 并行ping扫描
    for i in {1..254}; do
        {
            IP="${NETWORK}.$i"
            if ping -c 1 -W 500 "$IP" >/dev/null 2>&1; then
                echo "$IP" >> "$temp_file"
            fi
        } &
        
        # 控制并发数量
        if (( i % 40 == 0 )); then
            wait
            echo -ne "\r  扫描进度: $i/254 个IP地址"
        fi
    done
    wait
    echo -ne "\r  扫描进度: 254/254 个IP地址 ✓\n"
    
    # 读取结果
    if [ -f "$temp_file" ]; then
        while read -r ip; do
            DEVICE_LIST+=("$ip")
        done < "$temp_file"
        rm -f "$temp_file"
    fi
    
    echo
    log_success "发现 ${#DEVICE_LIST[@]} 个活跃设备"
    echo
}

# 检测设备类型和服务
detect_device_type() {
    local ip=$1
    local ports=""
    local device_type="未知"
    local device_name=""
    local control_methods=()
    
    # 检测常见端口
    local port_list=(
        "22:SSH"
        "23:Telnet"
        "80:HTTP"
        "443:HTTPS"
        "3389:RDP"
        "5037:ADB"
        "5555:ADB-WiFi"
        "5900:VNC"
        "8080:Web"
    )
    
    for port_info in "${port_list[@]}"; do
        IFS=':' read -r port service <<< "$port_info"
        if timeout 0.5 bash -c "</dev/tcp/$ip/$port" 2>/dev/null; then
            ports+="$service($port) "
            control_methods+=("$service")
        fi
    done
    
    # 判断设备类型
    if [[ " ${control_methods[*]} " =~ " ADB-WiFi " ]] || [[ " ${control_methods[*]} " =~ " ADB " ]]; then
        # Android设备检测
        adb connect "$ip:5555" >/dev/null 2>&1
        sleep 0.5
        
        if adb devices | grep -q "$ip:5555.*device"; then
            local brand=$(adb -s "$ip:5555" shell getprop ro.product.brand 2>/dev/null | tr -d '\r' || echo "Android")
            local model=$(adb -s "$ip:5555" shell getprop ro.product.model 2>/dev/null | tr -d '\r' || echo "Device")
            local version=$(adb -s "$ip:5555" shell getprop ro.build.version.release 2>/dev/null | tr -d '\r' || echo "?")
            
            device_name="$brand $model"
            
            # 判断是手机还是电视
            local characteristics=$(adb -s "$ip:5555" shell getprop ro.build.characteristics 2>/dev/null | tr -d '\r')
            if [[ "$characteristics" == *"tv"* ]] || [[ "$model" == *"TV"* ]] || [[ "$model" == *"RK3399"* ]]; then
                device_type="Android TV"
                TV_DEVICES+=("$ip|$device_name|Android $version|${control_methods[*]}")
            else
                device_type="Android手机/平板"
                ANDROID_DEVICES+=("$ip|$device_name|Android $version|${control_methods[*]}")
            fi
        else
            device_type="Android设备(离线)"
            OTHER_DEVICES+=("$ip|Android设备|离线|${control_methods[*]}")
        fi
    elif [[ " ${control_methods[*]} " =~ " VNC " ]] || [[ " ${control_methods[*]} " =~ " RDP " ]]; then
        device_type="电脑"
        device_name="远程桌面设备"
        COMPUTER_DEVICES+=("$ip|$device_name|VNC/RDP|${control_methods[*]}")
    elif [[ " ${control_methods[*]} " =~ " SSH " ]]; then
        device_type="服务器/路由器"
        device_name="SSH设备"
        OTHER_DEVICES+=("$ip|SSH设备|Linux/Unix|${control_methods[*]}")
    else
        device_type="其他设备"
        device_name="未识别"
        OTHER_DEVICES+=("$ip|未识别设备|未知|${control_methods[*]}")
    fi
    
    echo "$ip|$device_type|$device_name|${ports% }"
}

# 扫描设备类型
scan_device_types() {
    log_progress "正在识别设备类型..."
    echo
    
    # 重启ADB服务
    adb kill-server >/dev/null 2>&1 || true
    adb start-server >/dev/null 2>&1
    
    local count=0
    local total=${#DEVICE_LIST[@]}
    
    for ip in "${DEVICE_LIST[@]}"; do
        if [ "$ip" != "$LOCAL_IP" ]; then
            ((count++))
            echo -ne "\r  检测进度: $count/$total"
            
            local result=$(detect_device_type "$ip")
            IFS='|' read -r ip_addr dev_type dev_name ports <<< "$result"
            
            if [[ "$dev_type" != "未知" ]] && [[ "$dev_type" != "其他设备" ]]; then
                log_found "$ip_addr - $dev_type: $dev_name"
            fi
        fi
    done
    
    echo -ne "\r  检测进度: $total/$total ✓\n"
    echo
}

# 显示发现的设备
show_devices() {
    echo
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}                    ${GREEN}设备扫描结果${NC}                         ${CYAN}║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo
    
    # Android手机/平板
    if [ ${#ANDROID_DEVICES[@]} -gt 0 ]; then
        echo -e "${GREEN}📱 Android 手机/平板 (${#ANDROID_DEVICES[@]} 台)${NC}"
        echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        printf "%-4s %-16s %-25s %-15s %-30s\n" "序号" "IP地址" "设备名称" "系统版本" "控制方式"
        echo "────────────────────────────────────────────────────────────────────────────────────"
        
        local index=1
        for device in "${ANDROID_DEVICES[@]}"; do
            IFS='|' read -r ip name version methods <<< "$device"
            printf "%-4s %-16s %-25s %-15s %-30s\n" "$index" "$ip" "$name" "$version" "$methods"
            ((index++))
        done
        echo
    fi
    
    # Android TV
    if [ ${#TV_DEVICES[@]} -gt 0 ]; then
        echo -e "${GREEN}📺 Android TV / 智能电视 (${#TV_DEVICES[@]} 台)${NC}"
        echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        printf "%-4s %-16s %-25s %-15s %-30s\n" "序号" "IP地址" "设备名称" "系统版本" "控制方式"
        echo "────────────────────────────────────────────────────────────────────────────────────"
        
        local index=1
        for device in "${TV_DEVICES[@]}"; do
            IFS='|' read -r ip name version methods <<< "$device"
            printf "%-4s %-16s %-25s %-15s %-30s\n" "$index" "$ip" "$name" "$version" "$methods"
            ((index++))
        done
        echo
    fi
    
    # 电脑
    if [ ${#COMPUTER_DEVICES[@]} -gt 0 ]; then
        echo -e "${GREEN}💻 电脑 / 服务器 (${#COMPUTER_DEVICES[@]} 台)${NC}"
        echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        printf "%-4s %-16s %-25s %-15s %-30s\n" "序号" "IP地址" "设备名称" "类型" "控制方式"
        echo "────────────────────────────────────────────────────────────────────────────────────"
        
        local index=1
        for device in "${COMPUTER_DEVICES[@]}"; do
            IFS='|' read -r ip name type methods <<< "$device"
            printf "%-4s %-16s %-25s %-15s %-30s\n" "$index" "$ip" "$name" "$type" "$methods"
            ((index++))
        done
        echo
    fi
    
    # 其他设备
    if [ ${#OTHER_DEVICES[@]} -gt 0 ]; then
        echo -e "${YELLOW}🔧 其他设备 (${#OTHER_DEVICES[@]} 台)${NC}"
        echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        printf "%-4s %-16s %-25s %-15s %-30s\n" "序号" "IP地址" "设备名称" "类型" "控制方式"
        echo "────────────────────────────────────────────────────────────────────────────────────"
        
        local index=1
        for device in "${OTHER_DEVICES[@]}"; do
            IFS='|' read -r ip name type methods <<< "$device"
            printf "%-4s %-16s %-25s %-15s %-30s\n" "$index" "$ip" "$name" "$type" "$methods"
            ((index++))
        done
        echo
    fi
    
    # 统计信息
    local total_controlled=$((${#ANDROID_DEVICES[@]} + ${#TV_DEVICES[@]} + ${#COMPUTER_DEVICES[@]}))
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "  ${GREEN}可控制设备总数: $total_controlled 台${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo
}

# 快速连接菜单
quick_connect_menu() {
    while true; do
        echo
        echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${CYAN}║${NC}                    ${GREEN}快速操作菜单${NC}                         ${CYAN}║${NC}"
        echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
        echo
        echo "  1) 连接 Android 设备"
        echo "  2) 启动屏幕镜像 (scrcpy)"
        echo "  3) 连接 VNC 设备"
        echo "  4) 安装应用到设备"
        echo "  5) 查看设备详细信息"
        echo "  6) 重新扫描网络"
        echo "  7) 导出设备列表"
        echo "  0) 退出"
        echo
        read -p "请选择操作 [0-7]: " choice
        
        case $choice in
            1) connect_android_device ;;
            2) start_screen_mirror ;;
            3) connect_vnc_device ;;
            4) install_app_to_device ;;
            5) show_device_details ;;
            6) return 0 ;;
            7) export_device_list ;;
            0) exit 0 ;;
            *) log_error "无效选项，请重新选择" ;;
        esac
    done
}

# 连接Android设备
connect_android_device() {
    echo
    if [ ${#ANDROID_DEVICES[@]} -eq 0 ] && [ ${#TV_DEVICES[@]} -eq 0 ]; then
        log_warn "未发现Android设备"
        return
    fi
    
    echo -e "${GREEN}可用的 Android 设备:${NC}"
    echo
    
    local all_android=("${ANDROID_DEVICES[@]}" "${TV_DEVICES[@]}")
    local index=1
    
    for device in "${all_android[@]}"; do
        IFS='|' read -r ip name version methods <<< "$device"
        echo "  $index) $ip - $name ($version)"
        ((index++))
    done
    
    echo
    read -p "请选择设备编号: " dev_num
    
    if [[ "$dev_num" =~ ^[0-9]+$ ]] && [ "$dev_num" -ge 1 ] && [ "$dev_num" -lt "$index" ]; then
        local selected_device="${all_android[$((dev_num-1))]}"
        IFS='|' read -r ip name version methods <<< "$selected_device"
        
        log_progress "正在连接 $ip ..."
        
        if adb connect "$ip:5555" 2>&1 | grep -q "connected"; then
            log_success "已连接到 $name ($ip)"
            
            # 显示连接信息
            echo
            adb -s "$ip:5555" shell "echo '设备信息:'; getprop ro.product.model; getprop ro.build.version.release"
            echo
            
            # 询问后续操作
            echo "后续操作:"
            echo "  1) 启动屏幕镜像"
            echo "  2) 安装应用"
            echo "  3) 查看已安装应用"
            echo "  0) 返回"
            echo
            read -p "请选择 [0-3]: " action
            
            case $action in
                1) scrcpy -s "$ip:5555" ;;
                2) install_app_to_device ;;
                3) adb -s "$ip:5555" shell pm list packages ;;
                *) return ;;
            esac
        else
            log_error "连接失败"
        fi
    else
        log_error "无效的设备编号"
    fi
}

# 启动屏幕镜像
start_screen_mirror() {
    echo
    if ! command -v scrcpy >/dev/null 2>&1; then
        log_error "scrcpy 未安装"
        log_info "请运行: brew install scrcpy"
        return
    fi
    
    log_info "已连接的设备:"
    adb devices -l
    echo
    
    local devices=($(adb devices | grep -v "List" | grep "device$" | awk '{print $1}'))
    
    if [ ${#devices[@]} -eq 0 ]; then
        log_warn "没有已连接的设备，请先连接设备"
        return
    fi
    
    if [ ${#devices[@]} -eq 1 ]; then
        log_progress "启动屏幕镜像: ${devices[0]}"
        scrcpy -s "${devices[0]}"
    else
        echo "选择设备:"
        local index=1
        for dev in "${devices[@]}"; do
            echo "  $index) $dev"
            ((index++))
        done
        echo
        read -p "请选择设备编号: " dev_num
        
        if [[ "$dev_num" =~ ^[0-9]+$ ]] && [ "$dev_num" -ge 1 ] && [ "$dev_num" -le "${#devices[@]}" ]; then
            scrcpy -s "${devices[$((dev_num-1))]}"
        fi
    fi
}

# 连接VNC设备
connect_vnc_device() {
    echo
    if [ ${#COMPUTER_DEVICES[@]} -eq 0 ]; then
        log_warn "未发现VNC设备"
        return
    fi
    
    echo -e "${GREEN}可用的 VNC 设备:${NC}"
    echo
    
    local index=1
    for device in "${COMPUTER_DEVICES[@]}"; do
        IFS='|' read -r ip name type methods <<< "$device"
        if [[ "$methods" == *"VNC"* ]]; then
            echo "  $index) $ip - $name"
            ((index++))
        fi
    done
    
    echo
    read -p "请输入设备IP: " vnc_ip
    
    if [[ "$vnc_ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        log_info "正在打开 VNC 连接: vnc://$vnc_ip:5900"
        open "vnc://$vnc_ip:5900"
    else
        log_error "无效的IP地址"
    fi
}

# 安装应用到设备
install_app_to_device() {
    echo
    log_info "已连接的设备:"
    adb devices -l
    echo
    
    read -p "请输入APK文件路径: " apk_path
    
    if [ ! -f "$apk_path" ]; then
        log_error "文件不存在: $apk_path"
        return
    fi
    
    log_progress "正在安装: $apk_path"
    
    if adb install -r -g "$apk_path"; then
        log_success "安装成功"
    else
        log_error "安装失败"
    fi
}

# 查看设备详细信息
show_device_details() {
    echo
    read -p "请输入设备IP: " device_ip
    
    if ! [[ "$device_ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        log_error "无效的IP地址"
        return
    fi
    
    echo
    log_progress "正在获取设备信息: $device_ip"
    echo
    
    # 尝试ADB连接
    if adb connect "$device_ip:5555" 2>&1 | grep -q "connected"; then
        echo -e "${GREEN}═══ Android 设备信息 ═══${NC}"
        echo "品牌: $(adb -s "$device_ip:5555" shell getprop ro.product.brand 2>/dev/null | tr -d '\r')"
        echo "型号: $(adb -s "$device_ip:5555" shell getprop ro.product.model 2>/dev/null | tr -d '\r')"
        echo "Android版本: $(adb -s "$device_ip:5555" shell getprop ro.build.version.release 2>/dev/null | tr -d '\r')"
        echo "API级别: $(adb -s "$device_ip:5555" shell getprop ro.build.version.sdk 2>/dev/null | tr -d '\r')"
        echo "CPU架构: $(adb -s "$device_ip:5555" shell getprop ro.product.cpu.abi 2>/dev/null | tr -d '\r')"
        echo "屏幕分辨率: $(adb -s "$device_ip:5555" shell wm size 2>/dev/null | grep 'Physical size' | cut -d':' -f2 | tr -d ' \r')"
        echo "电池电量: $(adb -s "$device_ip:5555" shell dumpsys battery 2>/dev/null | grep level | cut -d':' -f2 | tr -d ' \r')%"
        echo
    else
        echo -e "${YELLOW}设备不支持ADB或未开启无线调试${NC}"
    fi
    
    # 端口扫描
    echo -e "${GREEN}═══ 开放端口 ═══${NC}"
    for port in 22 23 80 443 3389 5555 5900 8080; do
        if timeout 0.5 bash -c "</dev/tcp/$device_ip/$port" 2>/dev/null; then
            echo "✓ 端口 $port 开放"
        fi
    done
    echo
}

# 导出设备列表
export_device_list() {
    local export_file="$HOME/局域网设备列表_$(date +%Y%m%d_%H%M%S).txt"
    
    {
        echo "局域网设备扫描报告"
        echo "生成时间: $(date '+%Y-%m-%d %H:%M:%S')"
        echo "网段: ${NETWORK}.0/24"
        echo "========================================="
        echo
        
        if [ ${#ANDROID_DEVICES[@]} -gt 0 ]; then
            echo "Android 手机/平板:"
            echo "----------------------------------------"
            for device in "${ANDROID_DEVICES[@]}"; do
                IFS='|' read -r ip name version methods <<< "$device"
                echo "$ip - $name ($version) - 控制方式: $methods"
            done
            echo
        fi
        
        if [ ${#TV_DEVICES[@]} -gt 0 ]; then
            echo "Android TV / 智能电视:"
            echo "----------------------------------------"
            for device in "${TV_DEVICES[@]}"; do
                IFS='|' read -r ip name version methods <<< "$device"
                echo "$ip - $name ($version) - 控制方式: $methods"
            done
            echo
        fi
        
        if [ ${#COMPUTER_DEVICES[@]} -gt 0 ]; then
            echo "电脑 / 服务器:"
            echo "----------------------------------------"
            for device in "${COMPUTER_DEVICES[@]}"; do
                IFS='|' read -r ip name type methods <<< "$device"
                echo "$ip - $name ($type) - 控制方式: $methods"
            done
            echo
        fi
        
        echo "========================================="
        echo "总计: $((${#ANDROID_DEVICES[@]} + ${#TV_DEVICES[@]} + ${#COMPUTER_DEVICES[@]})) 台可控制设备"
        
    } > "$export_file"
    
    log_success "设备列表已导出到: $export_file"
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        open -R "$export_file"
    fi
}

# 主函数
main() {
    show_banner
    
    # 检查工具
    check_tools
    
    # 获取网络信息
    if ! get_network_info; then
        exit 1
    fi
    
    # 扫描网络
    ping_scan
    
    # 识别设备类型
    scan_device_types
    
    # 显示结果
    show_devices
    
    # 显示操作菜单
    quick_connect_menu
}

# 运行主函数
main

exit 0
