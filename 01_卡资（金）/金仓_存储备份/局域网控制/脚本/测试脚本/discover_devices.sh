#!/bin/bash
# 局域网设备发现脚本 - 扫描可连接的Android设备
# 作者：卡若
# 日期：$(date +%Y-%m-%d)

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
    echo -e "${BLUE}[SCAN]${NC} $1"
}

log_found() {
    echo -e "${PURPLE}[FOUND]${NC} 📱 $1"
}

# 获取本机IP和网段
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

# 检查必要工具
check_tools() {
    log_info "检查必要工具..."
    
    # 检查ADB
    if ! command -v adb >/dev/null 2>&1; then
        log_error "ADB未安装，请先安装: brew install android-platform-tools"
        exit 1
    fi
    
    # 检查ping
    if ! command -v ping >/dev/null 2>&1; then
        log_error "ping命令不可用"
        exit 1
    fi
    
    log_info "✅ 工具检查完成"
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
        local sdk=$(adb -s "$ip:$port" shell getprop ro.build.version.sdk 2>/dev/null | tr -d '\r' || echo "未知")
        
        echo "$brand|$model|$version|$sdk"
        return 0
    fi
    
    return 1
}

# 主扫描函数
main_scan() {
    log_info "🔍 开始局域网Android设备扫描..."
    echo
    
    # 重启ADB服务
    log_progress "重启ADB服务..."
    adb kill-server >/dev/null 2>&1 || true
    adb start-server >/dev/null 2>&1
    
    # 获取网络信息
    get_network_info
    echo
    
    # 执行ping扫描
    log_progress "扫描活跃设备..."
    ALIVE_IPS=($(ping_scan))
    
    if [ ${#ALIVE_IPS[@]} -eq 0 ]; then
        log_warn "未发现任何活跃设备"
        return 1
    fi
    
    log_info "发现 ${#ALIVE_IPS[@]} 个活跃IP地址"
    echo
    
    # 扫描Android设备
    log_progress "检测Android设备..."
    FOUND_DEVICES=()
    
    for ip in "${ALIVE_IPS[@]}"; do
        if [ "$ip" != "$LOCAL_IP" ]; then
            log_progress "检测 $ip..."
            
            if adb_scan "$ip"; then
                device_info=$(get_device_info "$ip")
                if [ $? -eq 0 ]; then
                    FOUND_DEVICES+=("$ip|$device_info")
                    
                    IFS='|' read -r ip_addr brand model version sdk <<< "$ip|$device_info"
                    log_found "$ip_addr - $brand $model (Android $version)"
                fi
            fi
        fi
    done
    
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
    
    log_info "🎉 发现 ${#FOUND_DEVICES[@]} 个Android设备！"
    echo
    
    # 生成设备列表
    echo "=== 发现的设备列表 ==="
    printf "%-15s %-12s %-20s %-12s %-8s\n" "IP地址" "品牌" "型号" "Android版本" "API级别"
    echo "----------------------------------------------------------------"
    
    for device in "${FOUND_DEVICES[@]}"; do
        IFS='|' read -r ip_addr brand model version sdk <<< "$device"
        printf "%-15s %-12s %-20s %-12s %-8s\n" "$ip_addr" "$brand" "$model" "$version" "$sdk"
    done
    
    echo
    
    # 询问是否保存到配置文件
    read -p "是否将发现的设备添加到配置文件？(y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        save_to_config
    fi
    
    # 询问是否连接测试
    read -p "是否测试连接所有发现的设备？(y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        test_connections
    fi
}

# 保存到配置文件
save_to_config() {
    local config_file="config/targets.csv"
    local backup_file="config/targets.csv.backup.$(date +%Y%m%d_%H%M%S)"
    
    if [ -f "$config_file" ]; then
        cp "$config_file" "$backup_file"
        log_info "配置文件已备份: $backup_file"
    fi
    
    log_progress "添加设备到配置文件..."
    
    for device in "${FOUND_DEVICES[@]}"; do
        IFS='|' read -r ip_addr brand model version sdk <<< "$device"
        
        # 检查是否已存在
        if ! grep -q "$ip_addr" "$config_file" 2>/dev/null; then
            # 生成设备名称
            device_name="${brand}_${model// /_}"
            device_type="phone"
            
            # 添加到配置文件
            echo "$device_name,$ip_addr,5555,$device_type,$brand,$model,$version,自动发现设备,active" >> "$config_file"
            log_info "✅ 已添加: $device_name ($ip_addr)"
        else
            log_warn "设备已存在: $ip_addr"
        fi
    done
    
    log_info "配置文件更新完成: $config_file"
}

# 测试连接
test_connections() {
    log_progress "测试设备连接..."
    echo
    
    for device in "${FOUND_DEVICES[@]}"; do
        IFS='|' read -r ip_addr brand model version sdk <<< "$device"
        
        log_progress "测试连接 $ip_addr ($brand $model)..."
        
        # 连接设备
        if adb connect "$ip_addr:5555" 2>/dev/null | grep -q "connected"; then
            # 测试基本命令
            if adb -s "$ip_addr:5555" shell echo "test" >/dev/null 2>&1; then
                log_info "✅ $ip_addr 连接成功"
                
                # 获取更多信息
                battery=$(adb -s "$ip_addr:5555" shell dumpsys battery | grep level | cut -d':' -f2 | tr -d ' ' || echo "未知")
                storage=$(adb -s "$ip_addr:5555" shell df /data | tail -1 | awk '{print $4}' | tr -d '\r' || echo "未知")
                
                log_info "  电池电量: ${battery}%"
                log_info "  可用存储: ${storage}KB"
            else
                log_warn "❌ $ip_addr 连接异常"
            fi
        else
            log_error "❌ $ip_addr 连接失败"
        fi
        echo
    done
}

# 显示帮助
show_help() {
    echo "局域网Android设备发现工具"
    echo
    echo "用法: $0 [选项]"
    echo
    echo "选项:"
    echo "  -h, --help     显示此帮助信息"
    echo "  -q, --quick    快速扫描模式（跳过详细信息）"
    echo "  -s, --save     自动保存发现的设备到配置文件"
    echo "  -t, --test     自动测试所有发现的设备连接"
    echo
    echo "示例:"
    echo "  $0              # 交互式扫描"
    echo "  $0 -q           # 快速扫描"
    echo "  $0 -s -t        # 扫描并自动保存和测试"
    echo
}

# 参数处理
QUICK_MODE=false
AUTO_SAVE=false
AUTO_TEST=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -q|--quick)
            QUICK_MODE=true
            shift
            ;;
        -s|--save)
            AUTO_SAVE=true
            shift
            ;;
        -t|--test)
            AUTO_TEST=true
            shift
            ;;
        *)
            log_error "未知参数: $1"
            show_help
            exit 1
            ;;
    esac
done

# 主程序
echo "🔍 局域网Android设备发现工具"
echo "作者: 卡若 | 版本: 1.0.0"
echo "========================================"
echo

# 检查工具
check_tools
echo

# 执行扫描
main_scan

echo
log_info "扫描完成！"
log_info "如需重新扫描，请再次运行此脚本"

exit 0