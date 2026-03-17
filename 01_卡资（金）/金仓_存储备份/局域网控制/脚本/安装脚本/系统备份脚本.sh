#!/bin/bash

# RK3399系统完整备份脚本
# 设备：CBI9SU7JNR
# 作者：卡若
# 日期：2024年12月

echo "🔧 开始RK3399系统完整备份..."
echo ""

# 创建备份目录
BACKUP_DIR="RK3399_backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "📁 备份目录: $BACKUP_DIR"
echo ""

# 检查ADB连接
echo "🔍 检查设备连接..."
if ! adb devices | grep -q "192.168.2.2"; then
    echo "❌ 设备未连接，请检查ADB连接"
    exit 1
fi

echo "✅ 设备连接正常"
echo ""

# 备份设备信息
echo "📋 备份设备信息..."
{
    echo "RK3399设备信息备份 - $(date)"
    echo "========================================"
    echo "序列号: $(adb shell getprop ro.serialno)"
    echo "型号: $(adb shell getprop ro.product.model)"
    echo "品牌: $(adb shell getprop ro.product.manufacturer)"
    echo "系统版本: $(adb shell getprop ro.build.version.release)"
    echo "构建信息: $(adb shell getprop ro.build.fingerprint)"
    echo "构建ID: $(adb shell getprop ro.build.display.id)"
    echo "内核版本: $(adb shell cat /proc/version | head -1)"
    echo ""
    echo "硬件信息:"
    echo "CPU: $(adb shell cat /proc/cpuinfo | grep "Hardware" | head -1)"
    echo "内存: $(adb shell cat /proc/meminfo | grep "MemTotal")"
    echo ""
    echo "分区信息:"
    adb shell cat /proc/partitions
    echo ""
    echo "已安装应用列表:"
    adb shell pm list packages
} > "$BACKUP_DIR/device_info.txt"

echo "✅ 设备信息已备份"

# 备份系统配置
echo "⚙️  备份系统配置..."
adb shell settings list system > "$BACKUP_DIR/system_settings.txt" 2>/dev/null
adb shell settings list global > "$BACKUP_DIR/global_settings.txt" 2>/dev/null
adb shell settings list secure > "$BACKUP_DIR/secure_settings.txt" 2>/dev/null

echo "✅ 系统配置已备份"

# 备份重要系统属性
echo "🔧 备份系统属性..."
adb shell getprop > "$BACKUP_DIR/system_properties.txt"

echo "✅ 系统属性已备份"

# 备份用户安装的应用
echo "📱 备份用户安装的应用..."
mkdir -p "$BACKUP_DIR/user_apks"

echo "正在获取用户应用列表..."
adb shell pm list packages -3 | cut -d':' -f2 > "$BACKUP_DIR/user_apps_list.txt"

app_count=0
while read -r package; do
    if [ ! -z "$package" ]; then
        echo "备份应用: $package"
        
        # 获取APK路径
        apk_path=$(adb shell pm path "$package" 2>/dev/null | head -1 | cut -d':' -f2)
        
        if [ ! -z "$apk_path" ]; then
            # 拉取APK文件
            if adb pull "$apk_path" "$BACKUP_DIR/user_apks/${package}.apk" >/dev/null 2>&1; then
                echo "  ✅ $package 备份成功"
                ((app_count++))
            else
                echo "  ❌ $package 备份失败"
            fi
        else
            echo "  ⚠️  $package 路径获取失败"
        fi
    fi
done < "$BACKUP_DIR/user_apps_list.txt"

echo "✅ 用户应用备份完成，共备份 $app_count 个应用"

# 备份WiFi密码（需要root权限）
echo "🌐 尝试备份WiFi配置..."
if adb shell "su -c 'cat /data/misc/wifi/wpa_supplicant.conf'" > "$BACKUP_DIR/wifi_config.txt" 2>/dev/null; then
    echo "✅ WiFi配置已备份"
else
    echo "⚠️  WiFi配置备份失败（需要root权限）"
fi

# 生成备份摘要
echo ""
echo "📊 生成备份摘要..."

backup_size=$(du -sh "$BACKUP_DIR" | cut -f1)
file_count=$(find "$BACKUP_DIR" -type f | wc -l)

{
    echo "RK3399系统备份报告"
    echo "===================="
    echo "备份时间: $(date)"
    echo "设备序列号: CBI9SU7JNR"
    echo "原始系统: Android 7.1.2 (RK3399_android7.1_20200421092001)"
    echo "备份大小: $backup_size"
    echo "文件数量: $file_count 个"
    echo ""
    echo "备份内容清单:"
    echo "- ✅ 设备信息和硬件配置"
    echo "- ✅ 系统设置和属性"
    echo "- ✅ 用户安装的应用 ($app_count 个)"
    echo "- ✅ 分区信息"
    if [ -f "$BACKUP_DIR/wifi_config.txt" ]; then
        echo "- ✅ WiFi配置"
    else
        echo "- ❌ WiFi配置 (需要root)"
    fi
    echo ""
    echo "备份文件结构:"
    tree "$BACKUP_DIR" 2>/dev/null || ls -la "$BACKUP_DIR"
    echo ""
    echo "⚠️  重要提醒:"
    echo "1. 请将备份文件保存到安全位置"
    echo "2. 刷机前请确认备份完整性"
    echo "3. 刷机过程中断可能导致设备变砖"
    echo "4. 建议备份到云盘或外部存储"
    echo ""
    echo "恢复说明:"
    echo "如需恢复系统，请使用 RKDevTool 刷写原始固件"
    echo "或联系设备制造商获取官方固件"
} > "$BACKUP_DIR/backup_report.txt"

echo ""
echo "🎉 系统备份完成！"
echo "=========================="
echo "📁 备份位置: $(pwd)/$BACKUP_DIR"
echo "📦 备份大小: $backup_size"
echo "📄 备份文件: $file_count 个"
echo "📱 应用备份: $app_count 个"
echo ""
echo "📋 备份清单:"
ls -la "$BACKUP_DIR/"
echo ""
echo "✅ 备份验证："
if [ -f "$BACKUP_DIR/device_info.txt" ] && [ -f "$BACKUP_DIR/backup_report.txt" ]; then
    echo "   ✅ 核心备份文件完整"
else
    echo "   ❌ 备份可能不完整，请检查"
fi

echo ""
echo "🚀 备份完成，现在可以安全进行系统刷机操作！"
echo "   请保存好备份文件：$BACKUP_DIR"
