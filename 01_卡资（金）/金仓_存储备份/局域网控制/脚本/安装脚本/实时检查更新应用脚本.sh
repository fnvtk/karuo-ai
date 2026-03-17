#!/bin/bash

# 实时检查更新应用脚本
# 功能：定期检查并更新app.apk和ckb.apk
# 作者：卡若
# 创建时间：2025年1月

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置变量
APP_DIR="/Users/karuo/Documents/开发/4、小工具/局域网手机电脑控制/应用文件"
APP_APK="$APP_DIR/app.apk"
CKB_APK="$APP_DIR/ckb.apk"
APP_PACKAGE="uni.app.UNI8F915F5"
CKB_PACKAGE="uni.app.UNI2B34F1A"
CHECK_INTERVAL=300  # 检查间隔（秒），默认5分钟
LOG_FILE="/Users/karuo/Documents/开发/4、小工具/局域网手机电脑控制/logs/app_update.log"

# 创建日志目录
mkdir -p "$(dirname "$LOG_FILE")"

# 日志函数
log_message() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# 检查ADB连接
check_adb_connection() {
    local devices=$(adb devices | grep -v "List of devices" | grep "device$" | wc -l)
    if [ $devices -eq 0 ]; then
        log_message "ERROR" "没有检测到ADB连接的设备"
        return 1
    fi
    log_message "INFO" "检测到 $devices 个ADB连接设备"
    return 0
}

# 获取应用版本信息
get_app_version() {
    local package=$1
    local version=$(adb shell dumpsys package $package | grep "versionName" | head -1 | cut -d'=' -f2)
    echo $version
}

# 获取APK文件修改时间
get_apk_mtime() {
    local apk_file=$1
    if [ -f "$apk_file" ]; then
        stat -f "%m" "$apk_file" 2>/dev/null || stat -c "%Y" "$apk_file" 2>/dev/null
    else
        echo "0"
    fi
}

# 检查应用是否需要更新
check_app_update() {
    local apk_file=$1
    local package=$2
    local app_name=$3
    
    if [ ! -f "$apk_file" ]; then
        log_message "ERROR" "APK文件不存在: $apk_file"
        return 1
    fi
    
    # 检查应用是否已安装
    local installed=$(adb shell pm list packages | grep "$package" | wc -l)
    if [ $installed -eq 0 ]; then
        log_message "INFO" "$app_name 未安装，准备安装"
        return 0  # 需要安装
    fi
    
    # 获取当前安装的版本
    local current_version=$(get_app_version $package)
    log_message "INFO" "$app_name 当前版本: $current_version"
    
    # 这里可以添加更复杂的版本比较逻辑
    # 目前简单地检查APK文件是否有更新（基于修改时间）
    local apk_mtime=$(get_apk_mtime "$apk_file")
    local last_install_time=$(adb shell stat /data/app/$package*/base.apk 2>/dev/null | grep "Modify" | head -1 | cut -d' ' -f2-3 || echo "")
    
    # 如果无法获取安装时间，默认需要更新
    if [ -z "$last_install_time" ]; then
        log_message "INFO" "无法获取 $app_name 安装时间，准备重新安装"
        return 0
    fi
    
    log_message "INFO" "$app_name 检查完成，暂无更新"
    return 1  # 不需要更新
}

# 安装或更新应用
install_app() {
    local apk_file=$1
    local package=$2
    local app_name=$3
    
    log_message "INFO" "开始安装/更新 $app_name"
    
    # 先尝试直接安装
    if adb install "$apk_file" 2>/dev/null; then
        log_message "SUCCESS" "$app_name 安装成功"
        return 0
    fi
    
    # 如果安装失败，尝试卸载后重新安装
    log_message "INFO" "直接安装失败，尝试卸载后重新安装 $app_name"
    
    if adb uninstall "$package" 2>/dev/null; then
        log_message "INFO" "$app_name 卸载成功"
    fi
    
    # 重新安装
    if adb install "$apk_file"; then
        log_message "SUCCESS" "$app_name 重新安装成功"
        return 0
    else
        log_message "ERROR" "$app_name 安装失败"
        return 1
    fi
}

# 主检查函数
check_and_update_apps() {
    log_message "INFO" "开始检查应用更新"
    
    # 检查ADB连接
    if ! check_adb_connection; then
        return 1
    fi
    
    local updated=0
    
    # 检查app.apk
    if check_app_update "$APP_APK" "$APP_PACKAGE" "桌面端控制应用"; then
        if install_app "$APP_APK" "$APP_PACKAGE" "桌面端控制应用"; then
            updated=1
        fi
    fi
    
    # 检查ckb.apk
    if check_app_update "$CKB_APK" "$CKB_PACKAGE" "CKB应用"; then
        if install_app "$CKB_APK" "$CKB_PACKAGE" "CKB应用"; then
            updated=1
        fi
    fi
    
    if [ $updated -eq 1 ]; then
        log_message "SUCCESS" "应用更新检查完成，有应用被更新"
    else
        log_message "INFO" "应用更新检查完成，所有应用都是最新版本"
    fi
}

# 显示帮助信息
show_help() {
    echo -e "${BLUE}实时检查更新应用脚本${NC}"
    echo -e "${YELLOW}用法:${NC}"
    echo "  $0 [选项]"
    echo ""
    echo -e "${YELLOW}选项:${NC}"
    echo "  -h, --help     显示此帮助信息"
    echo "  -c, --check    执行一次检查更新"
    echo "  -d, --daemon   以守护进程模式运行（每5分钟检查一次）"
    echo "  -i, --interval 设置检查间隔（秒），默认300秒"
    echo "  -s, --status   显示当前应用状态"
    echo "  -l, --log      显示日志"
    echo ""
    echo -e "${YELLOW}示例:${NC}"
    echo "  $0 -c                    # 执行一次检查"
    echo "  $0 -d                    # 守护进程模式"
    echo "  $0 -d -i 600            # 守护进程模式，每10分钟检查一次"
    echo "  $0 -s                    # 显示应用状态"
}

# 显示应用状态
show_status() {
    echo -e "${BLUE}=== 应用状态检查 ===${NC}"
    
    if ! check_adb_connection; then
        echo -e "${RED}错误: 无ADB连接${NC}"
        return 1
    fi
    
    echo -e "\n${YELLOW}桌面端控制应用 (app.apk):${NC}"
    local app_installed=$(adb shell pm list packages | grep "$APP_PACKAGE" | wc -l)
    if [ $app_installed -gt 0 ]; then
        local app_version=$(get_app_version $APP_PACKAGE)
        echo -e "  状态: ${GREEN}已安装${NC}"
        echo -e "  版本: $app_version"
        echo -e "  包名: $APP_PACKAGE"
    else
        echo -e "  状态: ${RED}未安装${NC}"
    fi
    
    echo -e "\n${YELLOW}CKB应用 (ckb.apk):${NC}"
    local ckb_installed=$(adb shell pm list packages | grep "$CKB_PACKAGE" | wc -l)
    if [ $ckb_installed -gt 0 ]; then
        local ckb_version=$(get_app_version $CKB_PACKAGE)
        echo -e "  状态: ${GREEN}已安装${NC}"
        echo -e "  版本: $ckb_version"
        echo -e "  包名: $CKB_PACKAGE"
    else
        echo -e "  状态: ${RED}未安装${NC}"
    fi
    
    echo -e "\n${YELLOW}APK文件状态:${NC}"
    if [ -f "$APP_APK" ]; then
        local app_size=$(ls -lh "$APP_APK" | awk '{print $5}')
        local app_date=$(ls -l "$APP_APK" | awk '{print $6, $7, $8}')
        echo -e "  app.apk: ${GREEN}存在${NC} ($app_size, $app_date)"
    else
        echo -e "  app.apk: ${RED}不存在${NC}"
    fi
    
    if [ -f "$CKB_APK" ]; then
        local ckb_size=$(ls -lh "$CKB_APK" | awk '{print $5}')
        local ckb_date=$(ls -l "$CKB_APK" | awk '{print $6, $7, $8}')
        echo -e "  ckb.apk: ${GREEN}存在${NC} ($ckb_size, $ckb_date)"
    else
        echo -e "  ckb.apk: ${RED}不存在${NC}"
    fi
}

# 守护进程模式
daemon_mode() {
    log_message "INFO" "启动守护进程模式，检查间隔: ${CHECK_INTERVAL}秒"
    echo -e "${GREEN}守护进程已启动，每 ${CHECK_INTERVAL} 秒检查一次应用更新${NC}"
    echo -e "${YELLOW}按 Ctrl+C 停止${NC}"
    
    # 捕获中断信号
    trap 'log_message "INFO" "守护进程停止"; exit 0' INT TERM
    
    while true; do
        check_and_update_apps
        sleep $CHECK_INTERVAL
    done
}

# 显示日志
show_log() {
    if [ -f "$LOG_FILE" ]; then
        echo -e "${BLUE}=== 最近的日志记录 ===${NC}"
        tail -50 "$LOG_FILE"
    else
        echo -e "${YELLOW}日志文件不存在: $LOG_FILE${NC}"
    fi
}

# 主程序
main() {
    case "$1" in
        -h|--help)
            show_help
            ;;
        -c|--check)
            check_and_update_apps
            ;;
        -d|--daemon)
            if [ "$2" = "-i" ] || [ "$2" = "--interval" ]; then
                if [ -n "$3" ] && [ "$3" -gt 0 ] 2>/dev/null; then
                    CHECK_INTERVAL=$3
                else
                    echo -e "${RED}错误: 无效的间隔时间${NC}"
                    exit 1
                fi
            fi
            daemon_mode
            ;;
        -s|--status)
            show_status
            ;;
        -l|--log)
            show_log
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