#!/bin/bash

# AI数智员工和存客宝白屏问题修复脚本
# 作者：卡若
# 功能：不重装应用的情况下修复白屏和出错问题

# 颜色定义
RED="\033[0;31m"
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

# 配置参数
DEVICE_IP="192.168.2.15:5555"
APP_PACKAGE="uni.app.UNI8F915F5"  # 主要应用包名
APP_ACTIVITY="io.dcloud.PandoraEntry"
LOG_FILE="app_fix_$(date +%Y%m%d_%H%M%S).log"

# 日志函数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[成功] $1${NC}" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[错误] $1${NC}" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[警告] $1${NC}" | tee -a "$LOG_FILE"
}

log_info() {
    echo -e "${BLUE}[信息] $1${NC}" | tee -a "$LOG_FILE"
}

# 检查设备连接
check_device() {
    log_info "检查设备连接状态..."
    if adb devices | grep -q "$DEVICE_IP.*device"; then
        log_success "设备 $DEVICE_IP 连接正常"
        return 0
    else
        log_error "设备 $DEVICE_IP 未连接或连接异常"
        log_info "尝试重新连接设备..."
        adb connect "$DEVICE_IP"
        sleep 2
        if adb devices | grep -q "$DEVICE_IP.*device"; then
            log_success "设备重新连接成功"
            return 0
        else
            log_error "设备连接失败，请检查网络和设备设置"
            return 1
        fi
    fi
}

# 检查应用状态
check_app_status() {
    log_info "检查应用 $APP_PACKAGE 状态..."
    
    # 检查应用是否安装
    if ! adb -s "$DEVICE_IP" shell pm list packages | grep -q "$APP_PACKAGE"; then
        log_error "应用 $APP_PACKAGE 未安装"
        return 1
    fi
    
    # 检查应用是否启用
    local enabled_status=$(adb -s "$DEVICE_IP" shell dumpsys package "$APP_PACKAGE" | grep "enabled=" | head -1)
    log_info "应用状态: $enabled_status"
    
    if echo "$enabled_status" | grep -q "enabled=0"; then
        log_warning "应用被禁用，正在启用..."
        adb -s "$DEVICE_IP" shell pm enable "$APP_PACKAGE"
        log_success "应用已启用"
    fi
    
    return 0
}

# 修复白屏问题 - 方案1：清理缓存和数据
fix_whitscreen_cache() {
    log_info "执行方案1：清理应用缓存和数据"
    
    # 强制停止应用
    log_info "强制停止应用..."
    adb -s "$DEVICE_IP" shell am force-stop "$APP_PACKAGE"
    
    # 清理应用数据
    log_info "清理应用数据..."
    adb -s "$DEVICE_IP" shell pm clear "$APP_PACKAGE"
    
    # 清理系统缓存
    log_info "清理系统缓存..."
    adb -s "$DEVICE_IP" shell rm -rf /data/dalvik-cache/*
    adb -s "$DEVICE_IP" shell rm -rf /cache/*
    
    log_success "缓存清理完成"
}

# 修复白屏问题 - 方案2：重置应用权限
fix_whitscreen_permissions() {
    log_info "执行方案2：重置应用权限"
    
    # 重置应用权限
    adb -s "$DEVICE_IP" shell pm reset-permissions "$APP_PACKAGE"
    
    # 授予基本权限
    local permissions=(
        "android.permission.INTERNET"
        "android.permission.ACCESS_NETWORK_STATE"
        "android.permission.WRITE_EXTERNAL_STORAGE"
        "android.permission.READ_EXTERNAL_STORAGE"
        "android.permission.CAMERA"
        "android.permission.RECORD_AUDIO"
    )
    
    for perm in "${permissions[@]}"; do
        log_info "授予权限: $perm"
        adb -s "$DEVICE_IP" shell pm grant "$APP_PACKAGE" "$perm" 2>/dev/null || true
    done
    
    log_success "权限重置完成"
}

# 修复白屏问题 - 方案3：优化系统性能
fix_whitscreen_performance() {
    log_info "执行方案3：优化系统性能"
    
    # 清理内存
    log_info "清理系统内存..."
    adb -s "$DEVICE_IP" shell am kill-all
    adb -s "$DEVICE_IP" shell echo 3 > /proc/sys/vm/drop_caches 2>/dev/null || true
    
    # 优化GPU渲染
    log_info "优化GPU渲染设置..."
    adb -s "$DEVICE_IP" shell setprop debug.hwui.renderer opengl
    adb -s "$DEVICE_IP" shell setprop ro.hwui.texture_cache_size 72
    
    # 禁用动画以提升性能
    adb -s "$DEVICE_IP" shell settings put global window_animation_scale 0
    adb -s "$DEVICE_IP" shell settings put global transition_animation_scale 0
    adb -s "$DEVICE_IP" shell settings put global animator_duration_scale 0
    
    log_success "性能优化完成"
}

# 修复白屏问题 - 方案4：网络连接修复
fix_whitscreen_network() {
    log_info "执行方案4：修复网络连接"
    
    # 重置网络设置
    adb -s "$DEVICE_IP" shell svc wifi disable
    sleep 2
    adb -s "$DEVICE_IP" shell svc wifi enable
    sleep 5
    
    # 清理DNS缓存
    adb -s "$DEVICE_IP" shell ndc resolver flushdefaultif
    
    # 测试网络连通性
    log_info "测试网络连通性..."
    if adb -s "$DEVICE_IP" shell ping -c 3 8.8.8.8 >/dev/null 2>&1; then
        log_success "网络连接正常"
    else
        log_warning "网络连接可能存在问题"
    fi
    
    log_success "网络修复完成"
}

# 启动应用
start_app() {
    log_info "启动应用 $APP_PACKAGE..."
    
    # 启动应用
    adb -s "$DEVICE_IP" shell am start -n "$APP_PACKAGE/$APP_ACTIVITY"
    
    # 等待应用启动
    sleep 3
    
    # 检查应用是否运行
    if adb -s "$DEVICE_IP" shell ps | grep -q "$APP_PACKAGE"; then
        log_success "应用启动成功"
        
        # 显示应用进程信息
        local process_info=$(adb -s "$DEVICE_IP" shell ps | grep "$APP_PACKAGE")
        log_info "应用进程信息:"
        echo "$process_info" | tee -a "$LOG_FILE"
        
        return 0
    else
        log_error "应用启动失败"
        return 1
    fi
}

# 检查应用运行状态
check_app_running() {
    log_info "检查应用运行状态..."
    
    # 检查进程
    local process_count=$(adb -s "$DEVICE_IP" shell ps | grep -c "$APP_PACKAGE" || echo "0")
    log_info "应用进程数量: $process_count"
    
    # 检查Activity
    local current_activity=$(adb -s "$DEVICE_IP" shell dumpsys activity activities | grep "mResumedActivity" | head -1)
    log_info "当前Activity: $current_activity"
    
    # 检查内存使用
    local memory_info=$(adb -s "$DEVICE_IP" shell dumpsys meminfo "$APP_PACKAGE" | grep "TOTAL" | head -1)
    log_info "内存使用: $memory_info"
    
    return 0
}

# 主修复流程
main_fix() {
    log_info "开始AI数智员工和存客宝白屏修复流程"
    
    # 检查设备连接
    if ! check_device; then
        exit 1
    fi
    
    # 检查应用状态
    if ! check_app_status; then
        exit 1
    fi
    
    # 执行修复方案
    log_info "执行综合修复方案..."
    
    fix_whitscreen_cache
    sleep 2
    
    fix_whitscreen_permissions
    sleep 2
    
    fix_whitscreen_performance
    sleep 2
    
    fix_whitscreen_network
    sleep 2
    
    # 启动应用
    if start_app; then
        sleep 3
        check_app_running
        log_success "修复流程完成，应用已启动"
    else
        log_error "应用启动失败，请检查应用是否损坏"
        exit 1
    fi
}

# 快速修复模式
quick_fix() {
    log_info "执行快速修复模式"
    
    check_device || exit 1
    
    # 快速清理和重启
    adb -s "$DEVICE_IP" shell am force-stop "$APP_PACKAGE"
    adb -s "$DEVICE_IP" shell pm clear "$APP_PACKAGE"
    adb -s "$DEVICE_IP" shell pm enable "$APP_PACKAGE"
    
    sleep 2
    
    adb -s "$DEVICE_IP" shell am start -n "$APP_PACKAGE/$APP_ACTIVITY"
    
    log_success "快速修复完成"
}

# 显示帮助信息
show_help() {
    echo -e "${BLUE}AI数智员工和存客宝白屏修复脚本${NC}"
    echo "使用方法:"
    echo "  $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -f, --full     执行完整修复流程（默认）"
    echo "  -q, --quick    执行快速修复"
    echo "  -s, --status   检查应用状态"
    echo "  -c, --check    检查设备连接"
    echo "  -h, --help     显示帮助信息"
    echo ""
    echo "示例:"
    echo "  $0              # 执行完整修复"
    echo "  $0 -q           # 快速修复"
    echo "  $0 -s           # 检查状态"
    echo ""
    echo "联系方式: 微信28533368"
}

# 参数处理
case "${1:-}" in
    -f|--full)
        main_fix
        ;;
    -q|--quick)
        quick_fix
        ;;
    -s|--status)
        check_device && check_app_status && check_app_running
        ;;
    -c|--check)
        check_device
        ;;
    -h|--help)
        show_help
        ;;
    "")
        main_fix
        ;;
    *)
        echo -e "${RED}未知选项: $1${NC}"
        show_help
        exit 1
        ;;
esac

log_info "脚本执行完成，日志文件: $LOG_FILE"