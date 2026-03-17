#!/bin/bash

# Android系统诊断和修复脚本
# 解决应用闪退和系统问题
# 作者：卡若
# 日期：2025-01-09

# 颜色定义
RED="\033[0;31m"
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

# 设备IP
DEVICE_IP="192.168.2.15:5555"

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查设备连接
check_device_connection() {
    log_info "检查设备连接状态..."
    if adb devices | grep -q "$DEVICE_IP.*device"; then
        log_success "设备 $DEVICE_IP 已连接"
        return 0
    else
        log_error "设备 $DEVICE_IP 未连接"
        return 1
    fi
}

# 获取系统信息
get_system_info() {
    log_info "获取系统信息..."
    echo "========== 系统信息 =========="
    echo "Android版本: $(adb -s $DEVICE_IP shell getprop ro.build.version.release)"
    echo "设备型号: $(adb -s $DEVICE_IP shell getprop ro.product.model)"
    echo "API级别: $(adb -s $DEVICE_IP shell getprop ro.build.version.sdk)"
    echo "芯片架构: $(adb -s $DEVICE_IP shell getprop ro.product.cpu.abi)"
    echo "内核版本: $(adb -s $DEVICE_IP shell uname -r)"
    echo "=============================="
}

# 检查内存状态
check_memory_status() {
    log_info "检查内存状态..."
    echo "========== 内存信息 =========="
    adb -s $DEVICE_IP shell cat /proc/meminfo | grep -E '(MemTotal|MemFree|MemAvailable|Cached)'
    echo "=============================="
    
    # 检查可用内存是否充足
    available_mem=$(adb -s $DEVICE_IP shell cat /proc/meminfo | grep MemAvailable | awk '{print $2}')
    if [ "$available_mem" -lt 500000 ]; then
        log_warning "可用内存不足500MB，可能影响应用运行"
        return 1
    else
        log_success "内存状态正常"
        return 0
    fi
}

# 检查存储空间
check_storage_space() {
    log_info "检查存储空间..."
    echo "========== 存储信息 =========="
    adb -s $DEVICE_IP shell df -h | grep -E '(data|system)'
    echo "=============================="
    
    # 检查data分区使用率
    data_usage=$(adb -s $DEVICE_IP shell df /data | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ "$data_usage" -gt 90 ]; then
        log_warning "数据分区使用率超过90%，可能影响应用运行"
        return 1
    else
        log_success "存储空间充足"
        return 0
    fi
}

# 检查应用状态
check_app_status() {
    log_info "检查已安装应用状态..."
    echo "========== 应用列表 =========="
    
    # 检查关键应用
    apps=("uni.app.UNI8F915F5" "uni.app.UNI2B34F1A" "com.anydesk.anydeskandroid" "com.carriez.flutter_hbb")
    
    for app in "${apps[@]}"; do
        if adb -s $DEVICE_IP shell pm list packages | grep -q "$app"; then
            version=$(adb -s $DEVICE_IP shell dumpsys package "$app" | grep versionName | head -1 | awk '{print $1}' | cut -d'=' -f2)
            echo "✓ $app (版本: $version)"
        else
            echo "✗ $app (未安装)"
        fi
    done
    echo "=============================="
}

# 分析崩溃日志
analyze_crash_logs() {
    log_info "分析最近的崩溃日志..."
    echo "========== 崩溃日志分析 =========="
    
    # 获取最近的崩溃日志
    crash_logs=$(adb -s $DEVICE_IP shell logcat -d | grep -E '(FATAL|AndroidRuntime|CRASH)' | tail -10)
    
    if [ -n "$crash_logs" ]; then
        echo "发现崩溃日志:"
        echo "$crash_logs"
        
        # 分析RustDesk崩溃
        if echo "$crash_logs" | grep -q "flutter_hbb"; then
            log_warning "检测到RustDesk应用崩溃"
            echo "崩溃原因：FFI库加载失败，可能是架构不兼容"
        fi
    else
        log_success "未发现最近的崩溃日志"
    fi
    echo "================================="
}

# 清理系统缓存
clean_system_cache() {
    log_info "清理系统缓存..."
    
    # 清理应用缓存
    adb -s $DEVICE_IP shell pm trim-caches 1000M
    
    # 清理logcat缓存
    adb -s $DEVICE_IP shell logcat -c
    
    log_success "系统缓存清理完成"
}

# 修复应用权限
fix_app_permissions() {
    log_info "修复应用权限..."
    
    # 为RustDesk授予必要权限
    if adb -s $DEVICE_IP shell pm list packages | grep -q "com.carriez.flutter_hbb"; then
        log_info "为RustDesk授予权限..."
        adb -s $DEVICE_IP shell pm grant com.carriez.flutter_hbb android.permission.RECORD_AUDIO 2>/dev/null
        adb -s $DEVICE_IP shell pm grant com.carriez.flutter_hbb android.permission.READ_EXTERNAL_STORAGE 2>/dev/null
        adb -s $DEVICE_IP shell pm grant com.carriez.flutter_hbb android.permission.WRITE_EXTERNAL_STORAGE 2>/dev/null
        log_success "RustDesk权限修复完成"
    fi
    
    # 为其他应用授予权限
    apps=("uni.app.UNI8F915F5" "uni.app.UNI2B34F1A" "com.anydesk.anydeskandroid")
    for app in "${apps[@]}"; do
        if adb -s $DEVICE_IP shell pm list packages | grep -q "$app"; then
            adb -s $DEVICE_IP shell pm grant "$app" android.permission.READ_EXTERNAL_STORAGE 2>/dev/null
            adb -s $DEVICE_IP shell pm grant "$app" android.permission.WRITE_EXTERNAL_STORAGE 2>/dev/null
        fi
    done
}

# 重新安装问题应用
reinstall_problematic_apps() {
    log_info "检查是否需要重新安装问题应用..."
    
    # 检查RustDesk是否需要重新安装
    if adb -s $DEVICE_IP shell logcat -d | grep -q "flutter_hbb.*FATAL"; then
        log_warning "检测到RustDesk频繁崩溃，建议重新安装"
        
        read -p "是否重新安装RustDesk? (y/n): " reinstall_choice
        if [ "$reinstall_choice" = "y" ] || [ "$reinstall_choice" = "Y" ]; then
            log_info "卸载旧版本RustDesk..."
            adb -s $DEVICE_IP shell pm uninstall com.carriez.flutter_hbb
            
            log_info "重新安装RustDesk..."
            apk_path="/Users/karuo/Documents/开发/4、小工具/局域网手机电脑控制/应用文件/rustdesk-1.4.2-universal.apk"
            if [ -f "$apk_path" ]; then
                adb -s $DEVICE_IP install "$apk_path"
                log_success "RustDesk重新安装完成"
            else
                log_error "未找到RustDesk安装包"
            fi
        fi
    fi
}

# 优化系统性能
optimize_system_performance() {
    log_info "优化系统性能..."
    
    # 调整内存管理
    adb -s $DEVICE_IP shell "echo 1 > /proc/sys/vm/drop_caches" 2>/dev/null
    
    # 停止不必要的服务
    adb -s $DEVICE_IP shell am force-stop com.android.vending 2>/dev/null
    
    # 设置应用为不被杀死
    apps=("uni.app.UNI8F915F5" "uni.app.UNI2B34F1A" "com.anydesk.anydeskandroid")
    for app in "${apps[@]}"; do
        if adb -s $DEVICE_IP shell pm list packages | grep -q "$app"; then
            adb -s $DEVICE_IP shell dumpsys deviceidle whitelist +"$app" 2>/dev/null
        fi
    done
    
    log_success "系统性能优化完成"
}

# 生成诊断报告
generate_diagnostic_report() {
    log_info "生成诊断报告..."
    
    report_file="/Users/karuo/Documents/开发/4、小工具/局域网手机电脑控制/logs/system_diagnostic_$(date +%Y%m%d_%H%M%S).txt"
    
    {
        echo "========== Android系统诊断报告 =========="
        echo "生成时间: $(date)"
        echo "设备IP: $DEVICE_IP"
        echo ""
        
        echo "========== 系统信息 =========="
        echo "Android版本: $(adb -s $DEVICE_IP shell getprop ro.build.version.release)"
        echo "设备型号: $(adb -s $DEVICE_IP shell getprop ro.product.model)"
        echo "API级别: $(adb -s $DEVICE_IP shell getprop ro.build.version.sdk)"
        echo "芯片架构: $(adb -s $DEVICE_IP shell getprop ro.product.cpu.abi)"
        echo ""
        
        echo "========== 内存状态 =========="
        adb -s $DEVICE_IP shell cat /proc/meminfo | grep -E '(MemTotal|MemFree|MemAvailable)'
        echo ""
        
        echo "========== 存储状态 =========="
        adb -s $DEVICE_IP shell df -h | grep -E '(data|system)'
        echo ""
        
        echo "========== 应用状态 =========="
        adb -s $DEVICE_IP shell pm list packages | grep -E '(uni.app|anydesk|rustdesk)'
        echo ""
        
        echo "========== 最近崩溃日志 =========="
        adb -s $DEVICE_IP shell logcat -d | grep -E '(FATAL|AndroidRuntime)' | tail -20
        
    } > "$report_file"
    
    log_success "诊断报告已保存到: $report_file"
}

# 主菜单
show_menu() {
    echo ""
    echo "========== Android系统诊断修复工具 =========="
    echo "1. 完整系统诊断"
    echo "2. 检查系统信息"
    echo "3. 检查内存状态"
    echo "4. 检查存储空间"
    echo "5. 分析崩溃日志"
    echo "6. 清理系统缓存"
    echo "7. 修复应用权限"
    echo "8. 重新安装问题应用"
    echo "9. 优化系统性能"
    echo "10. 生成诊断报告"
    echo "0. 退出"
    echo "============================================="
}

# 完整诊断流程
full_diagnostic() {
    log_info "开始完整系统诊断..."
    
    get_system_info
    check_memory_status
    check_storage_space
    check_app_status
    analyze_crash_logs
    
    log_info "诊断完成，开始修复..."
    
    clean_system_cache
    fix_app_permissions
    optimize_system_performance
    
    generate_diagnostic_report
    
    log_success "完整诊断和修复流程完成！"
}

# 主程序
main() {
    echo "Android系统诊断修复脚本 v1.0"
    echo "设备: $DEVICE_IP"
    
    # 检查设备连接
    if ! check_device_connection; then
        log_error "请确保设备已连接并启用ADB调试"
        exit 1
    fi
    
    # 如果有参数，直接执行对应功能
    case "$1" in
        "-f"|"--full")
            full_diagnostic
            exit 0
            ;;
        "-r"|"--report")
            generate_diagnostic_report
            exit 0
            ;;
        "-c"|"--clean")
            clean_system_cache
            exit 0
            ;;
        "-h"|"--help")
            echo "使用方法:"
            echo "  $0 [-f|--full]    执行完整诊断"
            echo "  $0 [-r|--report]  生成诊断报告"
            echo "  $0 [-c|--clean]   清理系统缓存"
            echo "  $0 [-h|--help]    显示帮助信息"
            exit 0
            ;;
    esac
    
    # 交互式菜单
    while true; do
        show_menu
        read -p "请选择操作 (0-10): " choice
        
        case $choice in
            1)
                full_diagnostic
                ;;
            2)
                get_system_info
                ;;
            3)
                check_memory_status
                ;;
            4)
                check_storage_space
                ;;
            5)
                analyze_crash_logs
                ;;
            6)
                clean_system_cache
                ;;
            7)
                fix_app_permissions
                ;;
            8)
                reinstall_problematic_apps
                ;;
            9)
                optimize_system_performance
                ;;
            10)
                generate_diagnostic_report
                ;;
            0)
                log_info "退出程序"
                exit 0
                ;;
            *)
                log_error "无效选择，请重新输入"
                ;;
        esac
        
        echo ""
        read -p "按回车键继续..."
    done
}

# 执行主程序
main "$@"