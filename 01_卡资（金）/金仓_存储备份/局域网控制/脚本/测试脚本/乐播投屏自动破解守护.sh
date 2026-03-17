#!/bin/bash

# 乐播投屏自动破解守护脚本
# 作者：卡若
# 功能：自动监控并破解乐播投屏5分钟限制
# 版本：1.0

# 颜色定义
RED="\033[0;31m"
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
BLUE="\033[0;34m"
NC="\033[0m"

# 配置参数
DEVICE_IP="192.168.2.15:5555"
PACKAGE_NAME="com.hpplay.happyplay.aw"
CHECK_INTERVAL=300  # 检查间隔（秒）
LOG_FILE="/tmp/lebo_crack_log.txt"

# 日志函数
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# 检查设备连接
check_device() {
    if ! adb -s $DEVICE_IP shell echo "connected" > /dev/null 2>&1; then
        log_message "❌ 设备连接失败，尝试重新连接..."
        adb connect $DEVICE_IP > /dev/null 2>&1
        sleep 2
        if ! adb -s $DEVICE_IP shell echo "connected" > /dev/null 2>&1; then
            log_message "❌ 设备连接失败，跳过本次检查"
            return 1
        fi
    fi
    return 0
}

# 执行破解
perform_crack() {
    log_message "🚀 开始执行破解..."
    
    # 强制停止应用
    adb -s $DEVICE_IP shell am force-stop $PACKAGE_NAME
    log_message "✅ 应用已停止"
    
    # 清除应用数据
    adb -s $DEVICE_IP shell pm clear $PACKAGE_NAME
    log_message "✅ 应用数据已清除"
    
    # 深度清理
    adb -s $DEVICE_IP shell "rm -rf /sdcard/Android/data/$PACKAGE_NAME/" 2>/dev/null
    adb -s $DEVICE_IP shell "rm -rf /sdcard/.hpplay*" 2>/dev/null
    log_message "✅ 深度清理完成"
    
    # 重新启用应用
    adb -s $DEVICE_IP shell pm enable $PACKAGE_NAME > /dev/null 2>&1
    log_message "✅ 应用已重新启用"
    
    # 等待系统处理
    sleep 3
    
    # 启动应用
    adb -s $DEVICE_IP shell monkey -p $PACKAGE_NAME -c android.intent.category.LAUNCHER 1 > /dev/null 2>&1
    log_message "✅ 应用已启动"
    
    log_message "🎉 破解完成！试用期已重置"
}

# 检查应用状态
check_app_status() {
    # 检查应用是否正在运行
    if adb -s $DEVICE_IP shell "ps | grep hpplay" > /dev/null 2>&1; then
        return 0  # 应用正在运行
    else
        return 1  # 应用未运行
    fi
}

# 主循环
main_loop() {
    log_message "🔄 乐播投屏自动破解守护程序启动"
    log_message "📱 目标设备: $DEVICE_IP"
    log_message "⏰ 检查间隔: ${CHECK_INTERVAL}秒"
    log_message "📝 日志文件: $LOG_FILE"
    
    while true; do
        if check_device; then
            # 执行定期破解（每次检查都破解，确保无限制）
            perform_crack
        fi
        
        log_message "😴 等待 ${CHECK_INTERVAL} 秒后进行下次检查..."
        sleep $CHECK_INTERVAL
    done
}

# 手动破解模式
manual_crack() {
    echo -e "${BLUE}=== 乐播投屏手动破解模式 ===${NC}"
    
    if check_device; then
        perform_crack
        echo -e "${GREEN}✅ 手动破解完成！${NC}"
    else
        echo -e "${RED}❌ 设备连接失败！${NC}"
        exit 1
    fi
}

# 显示帮助信息
show_help() {
    echo -e "${BLUE}乐播投屏自动破解守护脚本${NC}"
    echo ""
    echo "使用方法："
    echo "  $0 [选项]"
    echo ""
    echo "选项："
    echo "  -d, --daemon    启动守护进程模式（自动监控破解）"
    echo "  -m, --manual    手动破解一次"
    echo "  -s, --status    查看应用状态"
    echo "  -l, --log       查看破解日志"
    echo "  -h, --help      显示此帮助信息"
    echo ""
    echo "示例："
    echo "  $0 -m           # 手动破解一次"
    echo "  $0 -d           # 启动守护进程"
    echo "  $0 -s           # 查看状态"
}

# 查看应用状态
show_status() {
    echo -e "${BLUE}=== 乐播投屏状态信息 ===${NC}"
    
    if check_device; then
        echo -e "${GREEN}✅ 设备连接正常${NC}"
        
        echo -e "${YELLOW}应用信息:${NC}"
        adb -s $DEVICE_IP shell dumpsys package $PACKAGE_NAME | grep -E '(versionName|firstInstallTime|lastUpdateTime|enabled)'
        
        echo -e "${YELLOW}运行状态:${NC}"
        if check_app_status; then
            echo -e "${GREEN}✅ 应用正在运行${NC}"
        else
            echo -e "${RED}❌ 应用未运行${NC}"
        fi
        
        echo -e "${YELLOW}数据目录:${NC}"
        adb -s $DEVICE_IP shell "ls -la /data/data/$PACKAGE_NAME 2>/dev/null | head -5 || echo '无数据目录'"
    else
        echo -e "${RED}❌ 设备连接失败${NC}"
    fi
}

# 查看日志
show_log() {
    if [ -f "$LOG_FILE" ]; then
        echo -e "${BLUE}=== 最近10条破解日志 ===${NC}"
        tail -10 "$LOG_FILE"
    else
        echo -e "${YELLOW}暂无日志文件${NC}"
    fi
}

# 参数处理
case "$1" in
    -d|--daemon)
        main_loop
        ;;
    -m|--manual)
        manual_crack
        ;;
    -s|--status)
        show_status
        ;;
    -l|--log)
        show_log
        ;;
    -h|--help|"")
        show_help
        ;;
    *)
        echo -e "${RED}❌ 未知选项: $1${NC}"
        show_help
        exit 1
        ;;
esac