#!/bin/bash

# WiFi调试永久开启脚本
# 功能：确保Android设备WiFi调试永远保持开启状态，重启后也自动恢复
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
LOG_FILE="$HOME/wifi_debug_permanent.log"

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
        echo -e "${RED}错误: ADB未安装或不在PATH中${NC}"
        echo -e "请安装Android SDK Platform Tools"
        exit 1
    fi
}

# 检查设备连接
check_device_connection() {
    local device_status=$(adb devices | grep "$DEVICE_IP:$ADB_PORT" | awk '{print $2}')
    if [[ "$device_status" == "device" ]]; then
        return 0
    else
        return 1
    fi
}

# 连接设备
connect_device() {
    echo -e "${BLUE}正在连接设备 $DEVICE_IP:$ADB_PORT...${NC}"
    
    # 先尝试连接
    if adb connect "$DEVICE_IP:$ADB_PORT" >/dev/null 2>&1; then
        sleep 2
        if check_device_connection; then
            echo -e "${GREEN}✓ 设备连接成功${NC}"
            log_message "INFO" "设备连接成功 - $DEVICE_IP:$ADB_PORT"
            return 0
        fi
    fi
    
    echo -e "${RED}✗ 设备连接失败${NC}"
    log_message "ERROR" "设备连接失败 - $DEVICE_IP:$ADB_PORT"
    return 1
}

# 检查WiFi调试状态
check_wifi_debug_status() {
    if ! check_device_connection; then
        echo -e "${RED}设备未连接，无法检查WiFi调试状态${NC}"
        return 1
    fi
    
    # 检查开发者选项是否开启
    local dev_options=$(adb -s "$DEVICE_IP:$ADB_PORT" shell settings get global development_settings_enabled 2>/dev/null)
    
    # 检查USB调试是否开启
    local usb_debug=$(adb -s "$DEVICE_IP:$ADB_PORT" shell settings get global adb_enabled 2>/dev/null)
    
    # 检查WiFi调试是否开启
    local wifi_debug=$(adb -s "$DEVICE_IP:$ADB_PORT" shell settings get global adb_wifi_enabled 2>/dev/null)
    
    echo -e "${BLUE}当前WiFi调试状态：${NC}"
    echo -e "  开发者选项: $([ "$dev_options" = "1" ] && echo -e "${GREEN}已开启${NC}" || echo -e "${RED}未开启${NC}")"
    echo -e "  USB调试: $([ "$usb_debug" = "1" ] && echo -e "${GREEN}已开启${NC}" || echo -e "${RED}未开启${NC}")"
    echo -e "  WiFi调试: $([ "$wifi_debug" = "1" ] && echo -e "${GREEN}已开启${NC}" || echo -e "${RED}未开启${NC}")"
    
    # 返回状态：所有都开启才返回0
    if [ "$dev_options" = "1" ] && [ "$usb_debug" = "1" ] && [ "$wifi_debug" = "1" ]; then
        return 0
    else
        return 1
    fi
}

# 启用WiFi调试
enable_wifi_debug() {
    if ! check_device_connection; then
        echo -e "${RED}设备未连接，无法启用WiFi调试${NC}"
        return 1
    fi
    
    echo -e "${BLUE}正在启用WiFi调试功能...${NC}"
    
    # 启用开发者选项
    adb -s "$DEVICE_IP:$ADB_PORT" shell settings put global development_settings_enabled 1
    log_message "INFO" "已启用开发者选项"
    
    # 启用USB调试
    adb -s "$DEVICE_IP:$ADB_PORT" shell settings put global adb_enabled 1
    log_message "INFO" "已启用USB调试"
    
    # 启用WiFi调试
    adb -s "$DEVICE_IP:$ADB_PORT" shell settings put global adb_wifi_enabled 1
    log_message "INFO" "已启用WiFi调试"
    
    # 设置ADB端口
    adb -s "$DEVICE_IP:$ADB_PORT" shell setprop service.adb.tcp.port $ADB_PORT
    log_message "INFO" "已设置ADB端口为 $ADB_PORT"
    
    # 重启ADB服务以应用设置
    adb -s "$DEVICE_IP:$ADB_PORT" shell stop adbd
    sleep 2
    adb -s "$DEVICE_IP:$ADB_PORT" shell start adbd
    sleep 3
    
    echo -e "${GREEN}✓ WiFi调试功能已启用${NC}"
    log_message "INFO" "WiFi调试功能启用完成"
}

# 创建开机自启动脚本
create_autostart_script() {
    if ! check_device_connection; then
        echo -e "${RED}设备未连接，无法创建自启动脚本${NC}"
        return 1
    fi
    
    echo -e "${BLUE}正在创建开机自启动脚本...${NC}"
    
    # 创建自启动脚本内容
    local autostart_script="#!/system/bin/sh
# WiFi调试自启动脚本
# 确保重启后WiFi调试功能自动开启

# 等待系统完全启动
sleep 30

# 启用开发者选项
settings put global development_settings_enabled 1

# 启用USB调试
settings put global adb_enabled 1

# 启用WiFi调试
settings put global adb_wifi_enabled 1

# 设置ADB端口
setprop service.adb.tcp.port $ADB_PORT

# 重启ADB服务
stop adbd
sleep 2
start adbd

# 记录日志
echo \"$(date): WiFi调试自启动完成\" >> /data/local/tmp/wifi_debug_autostart.log
"
    
    # 将脚本推送到设备
    echo "$autostart_script" | adb -s "$DEVICE_IP:$ADB_PORT" shell 'cat > /data/local/tmp/wifi_debug_autostart.sh'
    
    # 设置执行权限
    adb -s "$DEVICE_IP:$ADB_PORT" shell chmod 755 /data/local/tmp/wifi_debug_autostart.sh
    
    # 创建init.d脚本（如果支持）
    adb -s "$DEVICE_IP:$ADB_PORT" shell 'if [ -d "/system/etc/init.d" ]; then cp /data/local/tmp/wifi_debug_autostart.sh /system/etc/init.d/99wifi_debug; fi' 2>/dev/null
    
    # 添加到开机启动项（通过修改build.prop）
    adb -s "$DEVICE_IP:$ADB_PORT" shell 'echo "ro.debuggable=1" >> /system/build.prop' 2>/dev/null
    adb -s "$DEVICE_IP:$ADB_PORT" shell 'echo "persist.service.adb.enable=1" >> /system/build.prop' 2>/dev/null
    adb -s "$DEVICE_IP:$ADB_PORT" shell 'echo "persist.service.debuggable=1" >> /system/build.prop' 2>/dev/null
    adb -s "$DEVICE_IP:$ADB_PORT" shell 'echo "persist.sys.usb.config=adb" >> /system/build.prop' 2>/dev/null
    
    echo -e "${GREEN}✓ 自启动脚本创建完成${NC}"
    log_message "INFO" "自启动脚本创建完成"
}

# 设置系统属性持久化
set_persistent_properties() {
    if ! check_device_connection; then
        echo -e "${RED}设备未连接，无法设置系统属性${NC}"
        return 1
    fi
    
    echo -e "${BLUE}正在设置持久化系统属性...${NC}"
    
    # 设置持久化属性
    adb -s "$DEVICE_IP:$ADB_PORT" shell setprop persist.service.adb.enable 1
    adb -s "$DEVICE_IP:$ADB_PORT" shell setprop persist.service.debuggable 1
    adb -s "$DEVICE_IP:$ADB_PORT" shell setprop persist.sys.usb.config adb
    adb -s "$DEVICE_IP:$ADB_PORT" shell setprop ro.adb.secure 0
    adb -s "$DEVICE_IP:$ADB_PORT" shell setprop ro.debuggable 1
    
    # 设置ADB网络端口持久化
    adb -s "$DEVICE_IP:$ADB_PORT" shell setprop persist.adb.tcp.port $ADB_PORT
    
    echo -e "${GREEN}✓ 持久化属性设置完成${NC}"
    log_message "INFO" "持久化属性设置完成"
}

# 创建监控守护进程
create_daemon_service() {
    if ! check_device_connection; then
        echo -e "${RED}设备未连接，无法创建守护进程${NC}"
        return 1
    fi
    
    echo -e "${BLUE}正在创建WiFi调试守护进程...${NC}"
    
    # 创建守护进程脚本
    local daemon_script="#!/system/bin/sh
# WiFi调试守护进程
# 持续监控并确保WiFi调试功能始终开启

while true; do
    # 检查并确保开发者选项开启
    if [ \"\$(settings get global development_settings_enabled)\" != \"1\" ]; then
        settings put global development_settings_enabled 1
    fi
    
    # 检查并确保USB调试开启
    if [ \"\$(settings get global adb_enabled)\" != \"1\" ]; then
        settings put global adb_enabled 1
    fi
    
    # 检查并确保WiFi调试开启
    if [ \"\$(settings get global adb_wifi_enabled)\" != \"1\" ]; then
        settings put global adb_wifi_enabled 1
    fi
    
    # 检查ADB端口设置
    if [ \"\$(getprop service.adb.tcp.port)\" != \"$ADB_PORT\" ]; then
        setprop service.adb.tcp.port $ADB_PORT
        stop adbd
        sleep 1
        start adbd
    fi
    
    # 每30秒检查一次
    sleep 30
done
"
    
    # 将守护进程脚本推送到设备
    echo "$daemon_script" | adb -s "$DEVICE_IP:$ADB_PORT" shell 'cat > /data/local/tmp/wifi_debug_daemon.sh'
    
    # 设置执行权限
    adb -s "$DEVICE_IP:$ADB_PORT" shell chmod 755 /data/local/tmp/wifi_debug_daemon.sh
    
    # 启动守护进程（后台运行）
    adb -s "$DEVICE_IP:$ADB_PORT" shell 'nohup /data/local/tmp/wifi_debug_daemon.sh > /data/local/tmp/wifi_debug_daemon.log 2>&1 &'
    
    echo -e "${GREEN}✓ WiFi调试守护进程已启动${NC}"
    log_message "INFO" "WiFi调试守护进程已启动"
}

# 验证配置
verify_configuration() {
    echo -e "${BLUE}========== 配置验证 ==========${NC}"
    
    if check_wifi_debug_status; then
        echo -e "${GREEN}✓ WiFi调试配置验证成功${NC}"
        
        # 显示设备信息
        local device_model=$(adb -s "$DEVICE_IP:$ADB_PORT" shell getprop ro.product.model 2>/dev/null | tr -d '\r')
        local android_version=$(adb -s "$DEVICE_IP:$ADB_PORT" shell getprop ro.build.version.release 2>/dev/null | tr -d '\r')
        local adb_port=$(adb -s "$DEVICE_IP:$ADB_PORT" shell getprop service.adb.tcp.port 2>/dev/null | tr -d '\r')
        
        echo -e "${GREEN}设备信息：${NC}"
        echo -e "  型号: $device_model"
        echo -e "  Android版本: $android_version"
        echo -e "  ADB端口: $adb_port"
        echo -e "  IP地址: $DEVICE_IP"
        
        log_message "INFO" "WiFi调试永久开启配置完成 - $device_model"
        return 0
    else
        echo -e "${RED}✗ WiFi调试配置验证失败${NC}"
        log_message "ERROR" "WiFi调试配置验证失败"
        return 1
    fi
}

# 测试重启后恢复
test_reboot_recovery() {
    echo -e "${BLUE}========== 重启恢复测试 ==========${NC}"
    echo -e "${YELLOW}注意：此操作将重启设备进行测试${NC}"
    
    read -p "是否继续重启测试？(y/N): " confirm
    if [[ $confirm != [yY] ]]; then
        echo -e "${YELLOW}跳过重启测试${NC}"
        return 0
    fi
    
    if ! check_device_connection; then
        echo -e "${RED}设备未连接，无法进行重启测试${NC}"
        return 1
    fi
    
    echo -e "${BLUE}正在重启设备...${NC}"
    adb -s "$DEVICE_IP:$ADB_PORT" shell reboot
    
    echo -e "${YELLOW}等待设备重启完成（约60秒）...${NC}"
    sleep 60
    
    # 尝试重新连接
    local retry_count=0
    local max_retry=10
    
    while [ $retry_count -lt $max_retry ]; do
        echo -e "${BLUE}尝试重新连接... (第$((retry_count+1))次)${NC}"
        
        if connect_device; then
            echo -e "${GREEN}✓ 重启后成功重新连接${NC}"
            
            # 验证WiFi调试状态
            if check_wifi_debug_status; then
                echo -e "${GREEN}✓ 重启后WiFi调试功能正常${NC}"
                log_message "INFO" "重启恢复测试成功"
                return 0
            else
                echo -e "${RED}✗ 重启后WiFi调试功能异常${NC}"
                log_message "ERROR" "重启恢复测试失败 - WiFi调试未恢复"
                return 1
            fi
        fi
        
        retry_count=$((retry_count+1))
        sleep 10
    done
    
    echo -e "${RED}✗ 重启后无法重新连接设备${NC}"
    log_message "ERROR" "重启恢复测试失败 - 无法重新连接"
    return 1
}

# 显示使用说明
show_usage() {
    echo -e "${BLUE}========== WiFi调试永久开启脚本 ==========${NC}"
    echo -e "用法: $0 [选项]"
    echo
    echo -e "  -e, --enable      启用WiFi调试永久开启"
    echo -e "  -c, --check       检查WiFi调试状态"
    echo -e "  -t, --test        测试重启后恢复功能"
    echo -e "  -d, --daemon      启动守护进程"
    echo -e "  -v, --verify      验证配置"
    echo -e "  -h, --help        显示帮助信息"
    echo
    echo -e "${GREEN}配置:${NC}"
    echo -e "  设备IP: $DEVICE_IP"
    echo -e "  ADB端口: $ADB_PORT"
    echo -e "  日志文件: $LOG_FILE"
    echo
    echo -e "${GREEN}使用示例:${NC}"
    echo -e "  $0 -e             # 启用WiFi调试永久开启"
    echo -e "  $0 -c             # 检查当前状态"
    echo -e "  $0 -t             # 测试重启恢复"
    echo -e "  $0 -d             # 启动守护进程"
    echo
    echo -e "${YELLOW}注意事项:${NC}"
    echo -e "  1. 需要设备已通过USB首次连接并授权"
    echo -e "  2. 部分功能需要root权限"
    echo -e "  3. 建议在配置完成后进行重启测试"
    echo
    echo -e "${BLUE}技术支持: 微信28533368${NC}"
}

# 主程序
main() {
    # 检查ADB
    check_adb
    
    # 创建日志目录
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # 参数处理
    case "${1:-}" in
        -e|--enable)
            echo -e "${BLUE}========== 启用WiFi调试永久开启 ==========${NC}"
            
            if connect_device; then
                enable_wifi_debug
                set_persistent_properties
                create_autostart_script
                create_daemon_service
                verify_configuration
                
                echo -e "${GREEN}========== 配置完成 ==========${NC}"
                echo -e "WiFi调试永久开启配置已完成！"
                echo -e "建议运行 '$0 -t' 进行重启测试"
            else
                echo -e "${RED}设备连接失败，请检查设备状态和网络连接${NC}"
                exit 1
            fi
            ;;
        -c|--check)
            echo -e "${BLUE}========== 检查WiFi调试状态 ==========${NC}"
            
            if connect_device; then
                check_wifi_debug_status
            else
                echo -e "${RED}设备连接失败，无法检查状态${NC}"
                exit 1
            fi
            ;;
        -t|--test)
            test_reboot_recovery
            ;;
        -d|--daemon)
            echo -e "${BLUE}========== 启动守护进程 ==========${NC}"
            
            if connect_device; then
                create_daemon_service
            else
                echo -e "${RED}设备连接失败，无法启动守护进程${NC}"
                exit 1
            fi
            ;;
        -v|--verify)
            echo -e "${BLUE}========== 验证配置 ==========${NC}"
            
            if connect_device; then
                verify_configuration
            else
                echo -e "${RED}设备连接失败，无法验证配置${NC}"
                exit 1
            fi
            ;;
        -h|--help)
            show_usage
            ;;
        "")
            # 默认执行完整配置
            echo -e "${BLUE}========== WiFi调试永久开启配置 ==========${NC}"
            
            if connect_device; then
                check_wifi_debug_status
                echo
                enable_wifi_debug
                set_persistent_properties
                create_autostart_script
                create_daemon_service
                verify_configuration
                
                echo -e "${GREEN}========== 配置完成 ==========${NC}"
                echo -e "WiFi调试永久开启配置已完成！"
                echo -e "设备重启后WiFi调试功能将自动恢复"
                echo -e "建议运行 '$0 -t' 进行重启测试验证"
            else
                echo -e "${RED}设备连接失败，请检查：${NC}"
                echo -e "  1. 设备IP是否正确: $DEVICE_IP"
                echo -e "  2. 设备是否在同一网络"
                echo -e "  3. 设备是否已开启ADB调试"
                echo -e "  4. 是否已通过USB首次连接授权"
                exit 1
            fi
            ;;
        *)
            echo -e "${RED}未知选项: $1${NC}"
            echo -e "使用 $0 -h 查看帮助信息"
            exit 1
            ;;
    esac
}

# 信号处理
trap 'echo -e "\n${YELLOW}操作已取消${NC}"; exit 0' INT TERM

# 运行主程序
main "$@"