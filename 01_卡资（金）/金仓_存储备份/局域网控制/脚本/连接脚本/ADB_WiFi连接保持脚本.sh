#!/bin/bash

# ADB WiFi连接保持脚本
# 功能：自动监控和维护ADB WiFi连接稳定性
# 作者：卡若
# 联系：微信28533368

# 颜色定义
RED="\033[0;31m"
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

# 配置参数
DEVICE_IP="192.168.2.15"
ADB_PORT="5555"
CHECK_INTERVAL=30  # 检查间隔（秒）
MAX_RETRY=3        # 最大重试次数
LOG_FILE="$HOME/adb_wifi_connection.log"

# 日志函数
log_message() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# 检查网络连通性
check_network() {
    if ping -c 1 -W 3000 "$DEVICE_IP" >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# 检查ADB连接状态
check_adb_connection() {
    local device_status=$(adb devices | grep "$DEVICE_IP:$ADB_PORT" | awk '{print $2}')
    if [[ "$device_status" == "device" ]]; then
        return 0
    else
        return 1
    fi
}

# 连接ADB设备
connect_adb() {
    local retry_count=0
    
    while [ $retry_count -lt $MAX_RETRY ]; do
        echo -e "${BLUE}尝试连接 $DEVICE_IP:$ADB_PORT (第$((retry_count+1))次)...${NC}"
        
        if adb connect "$DEVICE_IP:$ADB_PORT" >/dev/null 2>&1; then
            sleep 2
            if check_adb_connection; then
                echo -e "${GREEN}✓ ADB连接成功！${NC}"
                log_message "INFO" "ADB连接成功 - $DEVICE_IP:$ADB_PORT"
                return 0
            fi
        fi
        
        retry_count=$((retry_count+1))
        if [ $retry_count -lt $MAX_RETRY ]; then
            echo -e "${YELLOW}连接失败，等待5秒后重试...${NC}"
            sleep 5
        fi
    done
    
    echo -e "${RED}✗ ADB连接失败，已达到最大重试次数${NC}"
    log_message "ERROR" "ADB连接失败 - $DEVICE_IP:$ADB_PORT"
    return 1
}

# 重启ADB服务
restart_adb_service() {
    echo -e "${YELLOW}重启ADB服务...${NC}"
    adb kill-server
    sleep 2
    adb start-server
    sleep 3
    log_message "INFO" "ADB服务已重启"
}

# 获取设备信息
get_device_info() {
    if check_adb_connection; then
        local device_model=$(adb -s "$DEVICE_IP:$ADB_PORT" shell getprop ro.product.model 2>/dev/null | tr -d '\r')
        local android_version=$(adb -s "$DEVICE_IP:$ADB_PORT" shell getprop ro.build.version.release 2>/dev/null | tr -d '\r')
        local battery_level=$(adb -s "$DEVICE_IP:$ADB_PORT" shell dumpsys battery | grep level | awk '{print $2}' 2>/dev/null)
        
        echo -e "${GREEN}设备信息：${NC}"
        echo -e "  型号: $device_model"
        echo -e "  Android版本: $android_version"
        echo -e "  电池电量: ${battery_level}%"
        echo -e "  IP地址: $DEVICE_IP"
    fi
}

# 监控模式
monitor_mode() {
    echo -e "${BLUE}========== ADB WiFi连接监控模式 ==========${NC}"
    echo -e "目标设备: ${GREEN}$DEVICE_IP:$ADB_PORT${NC}"
    echo -e "检查间隔: ${GREEN}${CHECK_INTERVAL}秒${NC}"
    echo -e "日志文件: ${GREEN}$LOG_FILE${NC}"
    echo -e "按 Ctrl+C 停止监控"
    echo -e "${BLUE}===========================================${NC}"
    
    log_message "INFO" "开始ADB WiFi连接监控"
    
    # 初始连接检查
    if ! check_adb_connection; then
        echo -e "${YELLOW}设备未连接，尝试建立连接...${NC}"
        if check_network; then
            connect_adb
        else
            echo -e "${RED}✗ 网络不通，无法连接设备${NC}"
            log_message "ERROR" "网络连接失败 - $DEVICE_IP"
        fi
    else
        echo -e "${GREEN}✓ 设备已连接${NC}"
        get_device_info
    fi
    
    # 监控循环
    while true; do
        sleep $CHECK_INTERVAL
        
        # 检查网络连通性
        if ! check_network; then
            echo -e "${RED}✗ 网络连接中断 - $DEVICE_IP${NC}"
            log_message "WARNING" "网络连接中断 - $DEVICE_IP"
            continue
        fi
        
        # 检查ADB连接
        if ! check_adb_connection; then
            echo -e "${YELLOW}⚠ ADB连接断开，尝试重新连接...${NC}"
            log_message "WARNING" "ADB连接断开，尝试重新连接"
            
            # 尝试重新连接
            if ! connect_adb; then
                echo -e "${RED}重连失败，尝试重启ADB服务...${NC}"
                restart_adb_service
                connect_adb
            fi
        else
            echo -e "${GREEN}✓ ADB连接正常 ($(date '+%H:%M:%S'))${NC}"
        fi
    done
}

# 手动连接模式
manual_connect() {
    echo -e "${BLUE}========== 手动连接模式 ==========${NC}"
    
    # 检查网络
    echo -e "${BLUE}1. 检查网络连通性...${NC}"
    if check_network; then
        echo -e "${GREEN}✓ 网络连接正常${NC}"
    else
        echo -e "${RED}✗ 网络连接失败，请检查设备IP和网络状态${NC}"
        return 1
    fi
    
    # 检查当前连接状态
    echo -e "${BLUE}2. 检查ADB连接状态...${NC}"
    if check_adb_connection; then
        echo -e "${GREEN}✓ 设备已连接${NC}"
        get_device_info
        return 0
    else
        echo -e "${YELLOW}设备未连接，开始连接...${NC}"
    fi
    
    # 尝试连接
    echo -e "${BLUE}3. 建立ADB连接...${NC}"
    if connect_adb; then
        get_device_info
        echo -e "${GREEN}连接成功！${NC}"
    else
        echo -e "${RED}连接失败，尝试重启ADB服务后重试...${NC}"
        restart_adb_service
        if connect_adb; then
            get_device_info
            echo -e "${GREEN}连接成功！${NC}"
        else
            echo -e "${RED}连接失败，请检查设备设置：${NC}"
            echo -e "  1. 确保设备开启开发者选项"
            echo -e "  2. 启用USB调试"
            echo -e "  3. 启用无线ADB调试"
            echo -e "  4. 检查防火墙设置"
            return 1
        fi
    fi
}

# 状态检查模式
status_check() {
    echo -e "${BLUE}========== 连接状态检查 ==========${NC}"
    
    # 网络状态
    echo -e "${BLUE}网络状态:${NC}"
    if check_network; then
        local ping_result=$(ping -c 3 "$DEVICE_IP" 2>/dev/null | tail -1)
        echo -e "  ${GREEN}✓ 网络连通 - $DEVICE_IP${NC}"
        echo -e "  $ping_result"
    else
        echo -e "  ${RED}✗ 网络不通 - $DEVICE_IP${NC}"
    fi
    
    echo
    
    # ADB状态
    echo -e "${BLUE}ADB连接状态:${NC}"
    if check_adb_connection; then
        echo -e "  ${GREEN}✓ ADB已连接 - $DEVICE_IP:$ADB_PORT${NC}"
        get_device_info
    else
        echo -e "  ${RED}✗ ADB未连接 - $DEVICE_IP:$ADB_PORT${NC}"
    fi
    
    echo
    
    # ADB设备列表
    echo -e "${BLUE}当前ADB设备列表:${NC}"
    adb devices
}

# 日志查看
view_logs() {
    if [[ -f "$LOG_FILE" ]]; then
        echo -e "${BLUE}========== 最近50条日志 ==========${NC}"
        tail -50 "$LOG_FILE"
    else
        echo -e "${YELLOW}日志文件不存在: $LOG_FILE${NC}"
    fi
}

# 清理日志
clean_logs() {
    if [[ -f "$LOG_FILE" ]]; then
        > "$LOG_FILE"
        echo -e "${GREEN}✓ 日志文件已清理${NC}"
    else
        echo -e "${YELLOW}日志文件不存在${NC}"
    fi
}

# 帮助信息
show_help() {
    echo -e "${BLUE}========== ADB WiFi连接保持脚本 ==========${NC}"
    echo -e "用法: $0 [选项]"
    echo
    echo -e "${GREEN}选项:${NC}"
    echo -e "  -m, --monitor     启动监控模式（默认）"
    echo -e "  -c, --connect     手动连接模式"
    echo -e "  -s, --status      检查连接状态"
    echo -e "  -l, --logs        查看日志"
    echo -e "  -cl, --clean-logs 清理日志"
    echo -e "  -h, --help        显示帮助信息"
    echo
    echo -e "${GREEN}配置:${NC}"
    echo -e "  设备IP: $DEVICE_IP"
    echo -e "  ADB端口: $ADB_PORT"
    echo -e "  检查间隔: ${CHECK_INTERVAL}秒"
    echo -e "  日志文件: $LOG_FILE"
    echo
    echo -e "${GREEN}使用示例:${NC}"
    echo -e "  $0                    # 启动监控模式"
    echo -e "  $0 -c                 # 手动连接"
    echo -e "  $0 -s                 # 检查状态"
    echo -e "  $0 -l                 # 查看日志"
    echo
    echo -e "${YELLOW}注意事项:${NC}"
    echo -e "  1. 确保设备已开启开发者选项和无线ADB调试"
    echo -e "  2. 设备和电脑需在同一局域网内"
    echo -e "  3. 监控模式会持续运行，按Ctrl+C停止"
    echo
    echo -e "${BLUE}技术支持: 微信28533368${NC}"
}

# 信号处理
trap 'echo -e "\n${YELLOW}监控已停止${NC}"; log_message "INFO" "ADB WiFi连接监控停止"; exit 0' INT TERM

# 主程序
main() {
    # 检查ADB是否安装
    if ! command -v adb &> /dev/null; then
        echo -e "${RED}错误: ADB未安装或不在PATH中${NC}"
        echo -e "请安装Android SDK Platform Tools"
        exit 1
    fi
    
    # 创建日志目录
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # 参数处理
    case "${1:-}" in
        -m|--monitor)
            monitor_mode
            ;;
        -c|--connect)
            manual_connect
            ;;
        -s|--status)
            status_check
            ;;
        -l|--logs)
            view_logs
            ;;
        -cl|--clean-logs)
            clean_logs
            ;;
        -h|--help)
            show_help
            ;;
        "")
            monitor_mode
            ;;
        *)
            echo -e "${RED}未知选项: $1${NC}"
            echo -e "使用 $0 -h 查看帮助信息"
            exit 1
            ;;
    esac
}

# 运行主程序
main "$@"