#!/bin/bash

# RK3399系统升级脚本
# 设备：192.168.2.15 (RK3399)
# 当前系统：Android 7.1.2 (API 25)
# 目标系统：LineageOS 18.1 (Android 11)
# 作者：卡若
# 日期：2025年1月

echo "🚀 RK3399系统升级脚本"
echo "========================"
echo "设备：192.168.2.15"
echo "当前：Android 7.1.2 (API 25)"
echo "目标：LineageOS 18.1 (Android 11)"
echo ""

# 设置变量
DEVICE_IP="192.168.2.15"
DEVICE_PORT="5555"
BACKUP_DIR="RK3399_upgrade_backup_$(date +%Y%m%d_%H%M%S)"
ROM_FILE="/Users/karuo/Documents/开发/4、小工具/局域网手机电脑控制/ROM文件/lineage-18.1-20231215-UNOFFICIAL-rk3399.zip"
WORK_DIR="$(pwd)"

# 颜色输出函数
red() { echo -e "\033[31m$1\033[0m"; }
green() { echo -e "\033[32m$1\033[0m"; }
yellow() { echo -e "\033[33m$1\033[0m"; }
blue() { echo -e "\033[34m$1\033[0m"; }

# 日志函数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a upgrade.log
}

# 错误处理
error_exit() {
    red "❌ 错误：$1"
    log "ERROR: $1"
    exit 1
}

# 检查系统环境
check_environment() {
    log "检查系统环境..."
    
    # 检查ADB
    if ! command -v adb &> /dev/null; then
        error_exit "未找到ADB工具，请安装Android Platform Tools"
    fi
    
    # 检查fastboot
    if ! command -v fastboot &> /dev/null; then
        error_exit "未找到fastboot工具，请安装Android Platform Tools"
    fi
    
    # 检查ROM文件
    if [ ! -f "$ROM_FILE" ]; then
        error_exit "未找到ROM文件：$ROM_FILE"
    fi
    
    green "✅ 系统环境检查通过"
}

# 连接设备
connect_device() {
    log "连接设备 $DEVICE_IP:$DEVICE_PORT..."
    
    # 尝试连接
    adb connect $DEVICE_IP:$DEVICE_PORT
    sleep 2
    
    # 检查连接状态
    if ! adb devices | grep -q "$DEVICE_IP:$DEVICE_PORT"; then
        error_exit "无法连接到设备 $DEVICE_IP:$DEVICE_PORT"
    fi
    
    green "✅ 设备连接成功"
}

# 获取设备信息
get_device_info() {
    log "获取设备信息..."
    
    echo "📱 设备信息："
    echo "型号：$(adb shell getprop ro.product.model)"
    echo "品牌：$(adb shell getprop ro.product.brand)"
    echo "硬件：$(adb shell getprop ro.hardware)"
    echo "Android版本：$(adb shell getprop ro.build.version.release)"
    echo "API级别：$(adb shell getprop ro.build.version.sdk)"
    echo "构建ID：$(adb shell getprop ro.build.id)"
    echo "安全补丁：$(adb shell getprop ro.build.version.security_patch)"
    echo ""
}

# 创建备份
create_backup() {
    log "创建系统备份..."
    
    mkdir -p "$BACKUP_DIR"
    
    echo "📦 备份系统分区..."
    
    # 备份重要分区信息
    adb shell "cat /proc/partitions" > "$BACKUP_DIR/partitions.txt"
    adb shell "mount" > "$BACKUP_DIR/mount_points.txt"
    adb shell "getprop" > "$BACKUP_DIR/system_properties.txt"
    
    # 备份已安装应用列表
    adb shell "pm list packages -f" > "$BACKUP_DIR/installed_packages.txt"
    
    # 备份系统设置
    adb shell "settings list system" > "$BACKUP_DIR/system_settings.txt" 2>/dev/null || true
    adb shell "settings list secure" > "$BACKUP_DIR/secure_settings.txt" 2>/dev/null || true
    adb shell "settings list global" > "$BACKUP_DIR/global_settings.txt" 2>/dev/null || true
    
    green "✅ 备份完成：$BACKUP_DIR"
}

# 检查解锁状态
check_bootloader() {
    log "检查Bootloader解锁状态..."
    
    # 重启到fastboot模式
    yellow "⚠️  即将重启设备到fastboot模式"
    echo "自动确认进入fastboot模式..."
    confirm="y"
    
    adb reboot bootloader
    sleep 10
    
    # 检查fastboot设备
    if ! fastboot devices | grep -q "fastboot"; then
        error_exit "设备未进入fastboot模式"
    fi
    
    # 检查解锁状态
    unlock_status=$(fastboot oem device-info 2>&1 | grep "Device unlocked" || true)
    
    if [[ $unlock_status == *"true"* ]]; then
        green "✅ Bootloader已解锁"
    else
        red "❌ Bootloader未解锁"
        echo "请先解锁Bootloader："
        echo "1. fastboot oem unlock"
        echo "2. 按设备提示确认解锁"
        echo "3. 重新运行此脚本"
        exit 1
    fi
}

# 刷入ROM
flash_rom() {
    log "开始刷入ROM..."
    
    # 解压ROM文件
    echo "📦 解压ROM文件..."
    EXTRACT_DIR="extracted_rom_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$EXTRACT_DIR"
    
    if command -v unzip &> /dev/null; then
        unzip -q "$ROM_FILE" -d "$EXTRACT_DIR"
    else
        error_exit "未找到unzip工具"
    fi
    
    cd "$EXTRACT_DIR"
    
    # 查找镜像文件
    echo "🔍 查找镜像文件..."
    
    BOOT_IMG=$(find . -name "boot.img" -o -name "boot-*.img" | head -1)
    SYSTEM_IMG=$(find . -name "system.img" -o -name "system-*.img" | head -1)
    RECOVERY_IMG=$(find . -name "recovery.img" -o -name "recovery-*.img" | head -1)
    VENDOR_IMG=$(find . -name "vendor.img" -o -name "vendor-*.img" | head -1)
    
    echo "找到的镜像文件："
    [ -n "$BOOT_IMG" ] && echo "Boot: $BOOT_IMG"
    [ -n "$SYSTEM_IMG" ] && echo "System: $SYSTEM_IMG"
    [ -n "$RECOVERY_IMG" ] && echo "Recovery: $RECOVERY_IMG"
    [ -n "$VENDOR_IMG" ] && echo "Vendor: $VENDOR_IMG"
    echo ""
    
    # 刷入镜像
    echo "⚡ 开始刷入镜像..."
    
    if [ -n "$BOOT_IMG" ]; then
        echo "刷入Boot分区..."
        fastboot flash boot "$BOOT_IMG" || error_exit "Boot分区刷入失败"
    fi
    
    if [ -n "$SYSTEM_IMG" ]; then
        echo "刷入System分区..."
        fastboot flash system "$SYSTEM_IMG" || error_exit "System分区刷入失败"
    fi
    
    if [ -n "$RECOVERY_IMG" ]; then
        echo "刷入Recovery分区..."
        fastboot flash recovery "$RECOVERY_IMG" || error_exit "Recovery分区刷入失败"
    fi
    
    if [ -n "$VENDOR_IMG" ]; then
        echo "刷入Vendor分区..."
        fastboot flash vendor "$VENDOR_IMG" || error_exit "Vendor分区刷入失败"
    fi
    
    # 清除用户数据
    echo "🧹 清除用户数据..."
    fastboot erase userdata
    fastboot erase cache
    
    cd "$WORK_DIR"
    
    green "✅ ROM刷入完成"
}

# 重启设备
reboot_device() {
    log "重启设备..."
    
    fastboot reboot
    
    echo "⏳ 等待设备启动..."
    echo "首次启动可能需要5-10分钟，请耐心等待"
    
    # 等待ADB连接
    for i in {1..60}; do
        sleep 10
        echo "等待中... ($i/60)"
        
        if adb connect $DEVICE_IP:$DEVICE_PORT &> /dev/null; then
            if adb devices | grep -q "$DEVICE_IP:$DEVICE_PORT"; then
                green "✅ 设备启动完成"
                return 0
            fi
        fi
    done
    
    yellow "⚠️  设备启动时间较长，请手动检查"
}

# 验证升级结果
verify_upgrade() {
    log "验证升级结果..."
    
    # 连接设备
    adb connect $DEVICE_IP:$DEVICE_PORT
    sleep 3
    
    if ! adb devices | grep -q "$DEVICE_IP:$DEVICE_PORT"; then
        yellow "⚠️  无法连接设备，请手动检查升级结果"
        return 1
    fi
    
    echo "📱 升级后设备信息："
    echo "型号：$(adb shell getprop ro.product.model)"
    echo "品牌：$(adb shell getprop ro.product.brand)"
    echo "Android版本：$(adb shell getprop ro.build.version.release)"
    echo "API级别：$(adb shell getprop ro.build.version.sdk)"
    echo "构建ID：$(adb shell getprop ro.build.id)"
    echo "安全补丁：$(adb shell getprop ro.build.version.security_patch)"
    
    # 检查LineageOS标识
    lineage_version=$(adb shell getprop ro.lineage.version 2>/dev/null || echo "未检测到")
    echo "LineageOS版本：$lineage_version"
    
    if [[ $lineage_version != "未检测到" ]]; then
        green "✅ LineageOS升级成功！"
    else
        yellow "⚠️  请手动确认系统版本"
    fi
}

# 清理临时文件
cleanup() {
    log "清理临时文件..."
    
    # 删除解压的ROM文件
    if [ -d "extracted_rom_*" ]; then
        rm -rf extracted_rom_*
    fi
    
    green "✅ 清理完成"
}

# 主函数
main() {
    echo "🚀 开始RK3399系统升级流程"
    echo "================================"
    echo ""
    
    # 安全确认
    red "⚠️  警告：系统升级有风险，可能导致设备变砖！"
    echo "请确保："
    echo "1. 设备电量充足（>50%）"
    echo "2. 数据已备份"
    echo "3. 了解刷机风险"
    echo ""
    
    read -p "确认继续升级？(输入 YES 继续): " confirm
    
    if [ "$confirm" != "YES" ]; then
        yellow "用户取消升级"
        exit 0
    fi
    
    # 执行升级流程
    check_environment
    connect_device
    get_device_info
    create_backup
    check_bootloader
    flash_rom
    reboot_device
    verify_upgrade
    cleanup
    
    echo ""
    green "🎉 RK3399系统升级完成！"
    echo "备份文件：$BACKUP_DIR"
    echo "升级日志：upgrade.log"
    echo ""
    echo "如遇问题，请检查："
    echo "1. 设备是否正常启动"
    echo "2. 网络连接是否正常"
    echo "3. ADB调试是否开启"
    
    log "升级流程完成"
}

# 错误处理
trap 'error_exit "脚本执行中断"' INT TERM

# 运行主函数
main "$@"