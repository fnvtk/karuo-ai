#!/bin/bash

# WiFi调试持久化监控脚本
# 功能：持续监控并确保WiFi调试永远开启
# 作者：卡若
# 日期：2025年1月

# 配置参数
DEVICE_IP="192.168.2.15"
ADB_PORT="5555"
CHECK_INTERVAL=30  # 检查间隔（秒）
LOG_FILE="wifi_debug_monitor.log"
MAX_RETRY=5

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_message() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# 检查ADB是否可用
check_adb() {
    if ! command -v adb &> /dev/null; then
        log_message "ERROR" "ADB工具未找到，请先安装Android SDK"
        exit 1
    fi
}

# 连接设备
connect_device() {
    local retry_count=0
    
    while [ $retry_count -lt $MAX_RETRY ]; do
        log_message "INFO" "尝试连接设备 ${DEVICE_IP}:${ADB_PORT} (第$((retry_count+1))次)"
        
        # 先断开可能存在的连接
        adb disconnect "${DEVICE_IP}:${ADB_PORT}" &>/dev/null
        
        # 尝试连接
        if adb connect "${DEVICE_IP}:${ADB_PORT}" 2>&1 | grep -q "connected"; then
            log_message "INFO" "设备连接成功"
            return 0
        fi
        
        retry_count=$((retry_count + 1))
        if [ $retry_count -lt $MAX_RETRY ]; then
            log_message "WARN" "连接失败，等待10秒后重试..."
            sleep 10
        fi
    done
    
    log_message "ERROR" "设备连接失败，已重试${MAX_RETRY}次"
    return 1
}

# 检查WiFi调试状态
check_wifi_debug_status() {
    local adb_enabled=$(adb shell settings get global adb_enabled 2>/dev/null)
    local adb_wifi_enabled=$(adb shell settings get global adb_wifi_enabled 2>/dev/null)
    local adb_port=$(adb shell getprop service.adb.tcp.port 2>/dev/null)
    
    log_message "INFO" "当前状态 - ADB: $adb_enabled, WiFi调试: $adb_wifi_enabled, 端口: $adb_port"
    
    # 检查是否需要重新启用
    if [ "$adb_enabled" != "1" ] || [ "$adb_wifi_enabled" != "1" ] || [ "$adb_port" != "$ADB_PORT" ]; then
        return 1
    fi
    
    return 0
}

# 启用WiFi调试
enable_wifi_debug() {
    log_message "INFO" "正在重新启用WiFi调试功能..."
    
    # 启用开发者选项和USB调试
    adb shell settings put global development_settings_enabled 1
    adb shell settings put global adb_enabled 1
    
    # 启用WiFi调试
    adb shell settings put global adb_wifi_enabled 1
    adb shell setprop service.adb.tcp.port $ADB_PORT
    
    # 重启ADB服务
    adb shell stop adbd
    sleep 2
    adb shell start adbd
    
    log_message "INFO" "WiFi调试功能已重新启用"
    
    # 等待服务重启
    sleep 5
}

# 创建系统级持久化配置
create_persistent_config() {
    log_message "INFO" "创建系统级持久化配置..."
    
    # 创建属性配置
    adb shell "echo 'persist.adb.tcp.port=$ADB_PORT' >> /system/build.prop" 2>/dev/null || true
    adb shell "echo 'ro.adb.secure=0' >> /system/build.prop" 2>/dev/null || true
    
    # 创建init.d脚本（如果支持）
    local init_script="#!/system/bin/sh
# WiFi调试自启动脚本
setprop service.adb.tcp.port $ADB_PORT
setprop persist.adb.tcp.port $ADB_PORT
start adbd
"
    
    echo "$init_script" | adb shell "cat > /system/etc/init.d/99adb_wifi" 2>/dev/null || true
    adb shell chmod 755 /system/etc/init.d/99adb_wifi 2>/dev/null || true
    
    log_message "INFO" "持久化配置创建完成"
}

# 监控主循环
monitor_loop() {
    log_message "INFO" "开始WiFi调试持久化监控..."
    
    while true; do
        # 检查设备连接
        if ! adb devices | grep -q "${DEVICE_IP}:${ADB_PORT}"; then
            log_message "WARN" "设备连接丢失，尝试重新连接..."
            if connect_device; then
                # 连接成功后检查WiFi调试状态
                if ! check_wifi_debug_status; then
                    enable_wifi_debug
                    create_persistent_config
                fi
            else
                log_message "ERROR" "无法连接设备，等待${CHECK_INTERVAL}秒后重试"
            fi
        else
            # 设备已连接，检查WiFi调试状态
            if ! check_wifi_debug_status; then
                log_message "WARN" "WiFi调试功能异常，正在修复..."
                enable_wifi_debug
            else
                log_message "INFO" "WiFi调试功能正常"
            fi
        fi
        
        # 等待下次检查
        sleep $CHECK_INTERVAL
    done
}

# 显示帮助信息
show_help() {
    echo "WiFi调试持久化监控脚本"
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -h, --help     显示帮助信息"
    echo "  -c, --check    检查当前状态"
    echo "  -s, --start    启动监控服务"
    echo "  -d, --daemon   后台运行监控服务"
    echo "  -k, --kill     停止后台监控服务"
    echo "  --setup        初始化设置"
    echo ""
    echo "示例:"
    echo "  $0 --setup     # 初始化设置WiFi调试"
    echo "  $0 --start     # 前台运行监控"
    echo "  $0 --daemon    # 后台运行监控"
    echo "  $0 --check     # 检查当前状态"
}

# 检查当前状态
check_status() {
    echo -e "${BLUE}========== WiFi调试状态检查 ==========${NC}"
    
    if connect_device; then
        if check_wifi_debug_status; then
            echo -e "${GREEN}✓ WiFi调试功能正常运行${NC}"
        else
            echo -e "${YELLOW}⚠ WiFi调试功能需要修复${NC}"
        fi
    else
        echo -e "${RED}✗ 设备连接失败${NC}"
    fi
}

# 初始化设置
setup_wifi_debug() {
    echo -e "${BLUE}========== WiFi调试初始化设置 ==========${NC}"
    
    check_adb
    
    if connect_device; then
        enable_wifi_debug
        create_persistent_config
        echo -e "${GREEN}✓ WiFi调试初始化设置完成${NC}"
        echo -e "${YELLOW}建议运行 '$0 --daemon' 启动后台监控${NC}"
    else
        echo -e "${RED}✗ 设备连接失败，无法完成设置${NC}"
        exit 1
    fi
}

# 启动后台监控
start_daemon() {
    local pid_file="wifi_debug_monitor.pid"
    
    if [ -f "$pid_file" ]; then
        local old_pid=$(cat "$pid_file")
        if kill -0 "$old_pid" 2>/dev/null; then
            echo -e "${YELLOW}监控服务已在运行 (PID: $old_pid)${NC}"
            return 0
        else
            rm -f "$pid_file"
        fi
    fi
    
    echo -e "${BLUE}启动WiFi调试后台监控服务...${NC}"
    nohup "$0" --start > "$LOG_FILE" 2>&1 &
    local pid=$!
    echo $pid > "$pid_file"
    echo -e "${GREEN}✓ 后台监控服务已启动 (PID: $pid)${NC}"
    echo -e "${BLUE}日志文件: $LOG_FILE${NC}"
    echo -e "${BLUE}停止服务: $0 --kill${NC}"
}

# 停止后台监控
stop_daemon() {
    local pid_file="wifi_debug_monitor.pid"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid"
            rm -f "$pid_file"
            echo -e "${GREEN}✓ 后台监控服务已停止${NC}"
        else
            echo -e "${YELLOW}监控服务未运行${NC}"
            rm -f "$pid_file"
        fi
    else
        echo -e "${YELLOW}未找到运行中的监控服务${NC}"
    fi
}

# 主程序
main() {
    case "$1" in
        -h|--help)
            show_help
            ;;
        -c|--check)
            check_status
            ;;
        -s|--start)
            check_adb
            monitor_loop
            ;;
        -d|--daemon)
            start_daemon
            ;;
        -k|--kill)
            stop_daemon
            ;;
        --setup)
            setup_wifi_debug
            ;;
        "")
            echo -e "${YELLOW}请指定操作选项，使用 -h 查看帮助${NC}"
            show_help
            ;;
        *)
            echo -e "${RED}未知选项: $1${NC}"
            show_help
            exit 1
            ;;
    esac
}

# 执行主程序
main "$@"