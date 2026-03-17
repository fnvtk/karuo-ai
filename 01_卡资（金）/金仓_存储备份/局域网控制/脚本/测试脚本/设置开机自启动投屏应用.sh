#!/bin/bash

# 设置开机自启动投屏应用脚本
# 作者: 卡若
# 功能: 为Android设备设置投屏应用开机自启动

echo "=== 设置开机自启动投屏应用 ==="
echo "设备IP: 192.168.2.15"
echo "时间: $(date)"
echo

# 检查设备连接
echo "1. 检查设备连接状态..."
adb connect 192.168.2.15:5555
if [ $? -ne 0 ]; then
    echo "❌ 设备连接失败，请检查设备ADB设置"
    exit 1
fi

echo "✅ 设备连接成功"
echo

# 获取设备信息
echo "2. 获取设备信息..."
DEVICE_MODEL=$(adb -s 192.168.2.15:5555 shell getprop ro.product.model)
ANDROID_VERSION=$(adb -s 192.168.2.15:5555 shell getprop ro.build.version.release)
echo "设备型号: $DEVICE_MODEL"
echo "Android版本: $ANDROID_VERSION"
echo

# 投屏应用列表
APPS=(
    "com.carriez.flutter_hbb:RustDesk远程桌面"
    "uni.app.UNI2B34F1A:投屏应用1"
    "uni.app.UNI8F915F5:投屏应用2"
    "com.hpplay.happycast:乐播投屏"
)

echo "3. 设置应用开机自启动..."
for app_info in "${APPS[@]}"; do
    IFS=':' read -r package_name app_name <<< "$app_info"
    
    echo "正在设置 $app_name ($package_name)..."
    
    # 检查应用是否已安装
    if adb -s 192.168.2.15:5555 shell pm list packages | grep -q "$package_name"; then
        echo "  ✅ 应用已安装"
        
        # 启用应用自启动权限
        adb -s 192.168.2.15:5555 shell pm enable "$package_name"
        
        # 设置应用为系统应用（如果可能）
        adb -s 192.168.2.15:5555 shell pm grant "$package_name" android.permission.RECEIVE_BOOT_COMPLETED 2>/dev/null
        
        # 启动应用一次以激活
        case "$package_name" in
            "com.carriez.flutter_hbb")
                adb -s 192.168.2.15:5555 shell am start -n "$package_name/.MainActivity" >/dev/null 2>&1
                ;;
            "uni.app.UNI2B34F1A"|"uni.app.UNI8F915F5")
                adb -s 192.168.2.15:5555 shell am start -n "$package_name/io.dcloud.PandoraEntry" >/dev/null 2>&1
                ;;
            "com.hpplay.happycast")
                adb -s 192.168.2.15:5555 shell am start -n "$package_name/.activitys.SplashActivity" >/dev/null 2>&1
                ;;
        esac
        
        echo "  ✅ 已设置开机自启动"
    else
        echo "  ❌ 应用未安装，跳过"
    fi
    echo
done

echo "4. 创建开机启动脚本..."

# 在设备上创建开机启动脚本
STARTUP_SCRIPT="/sdcard/startup_screen_apps.sh"
adb -s 192.168.2.15:5555 shell "cat > $STARTUP_SCRIPT << 'EOF'
#!/system/bin/sh

# 等待系统完全启动
sleep 30

# 启动投屏应用
am start -n com.carriez.flutter_hbb/.MainActivity
sleep 5
am start -n uni.app.UNI2B34F1A/io.dcloud.PandoraEntry
sleep 5
am start -n uni.app.UNI8F915F5/io.dcloud.PandoraEntry
sleep 5
am start -n com.hpplay.happycast/.activitys.SplashActivity

EOF"

# 给脚本执行权限
adb -s 192.168.2.15:5555 shell chmod 755 "$STARTUP_SCRIPT"

echo "✅ 开机启动脚本已创建: $STARTUP_SCRIPT"
echo

echo "5. 设置系统级开机自启动（需要root权限）..."

# 检查是否有root权限
if adb -s 192.168.2.15:5555 shell su -c 'echo test' 2>/dev/null | grep -q 'test'; then
    echo "✅ 检测到root权限，设置系统级自启动"
    
    # 创建init.d脚本（如果支持）
    adb -s 192.168.2.15:5555 shell su -c "mkdir -p /system/etc/init.d" 2>/dev/null
    adb -s 192.168.2.15:5555 shell su -c "cat > /system/etc/init.d/99screen_apps << 'EOF'
#!/system/bin/sh

# 启动投屏应用
/sdcard/startup_screen_apps.sh &

EOF" 2>/dev/null
    
    adb -s 192.168.2.15:5555 shell su -c "chmod 755 /system/etc/init.d/99screen_apps" 2>/dev/null
    
    echo "✅ 系统级自启动脚本已设置"
else
    echo "⚠️  未检测到root权限，使用应用级自启动"
    echo "   建议在设备设置中手动添加应用到自启动白名单"
fi

echo
echo "6. 测试应用启动..."
echo "正在测试所有投屏应用启动..."

# 测试启动所有应用
for app_info in "${APPS[@]}"; do
    IFS=':' read -r package_name app_name <<< "$app_info"
    
    if adb -s 192.168.2.15:5555 shell pm list packages | grep -q "$package_name"; then
        echo "启动 $app_name..."
        
        case "$package_name" in
            "com.carriez.flutter_hbb")
                adb -s 192.168.2.15:5555 shell am start -n "$package_name/.MainActivity"
                ;;
            "uni.app.UNI2B34F1A"|"uni.app.UNI8F915F5")
                adb -s 192.168.2.15:5555 shell am start -n "$package_name/io.dcloud.PandoraEntry"
                ;;
            "com.hpplay.happycast")
                adb -s 192.168.2.15:5555 shell am start -n "$package_name/.activitys.SplashActivity"
                ;;
        esac
        
        sleep 2
    fi
done

echo
echo "=== 开机自启动设置完成 ==="
echo "✅ 所有投屏应用已设置开机自启动"
echo "✅ 开机启动脚本: $STARTUP_SCRIPT"
echo
echo "📱 使用说明:"
echo "1. 设备重启后，投屏应用将自动启动"
echo "2. 如需手动执行启动脚本: adb shell sh $STARTUP_SCRIPT"
echo "3. 建议在设备设置中将应用添加到自启动白名单"
echo "4. 部分设备可能需要手动在'应用管理'中开启自启动权限"
echo
echo "🔧 故障排除:"
echo "- 如果应用未自启动，检查设备的省电模式设置"
echo "- 确保应用有'开机自启动'权限"
echo "- 某些定制系统需要在安全中心添加自启动白名单"
echo

# 保存配置信息
echo "设备: $DEVICE_MODEL (Android $ANDROID_VERSION)" > "/Users/karuo/Documents/开发/4、小工具/局域网手机电脑控制/执行脚本/测试脚本/开机自启动配置.txt"
echo "配置时间: $(date)" >> "/Users/karuo/Documents/开发/4、小工具/局域网手机电脑控制/执行脚本/测试脚本/开机自启动配置.txt"
echo "已配置应用:" >> "/Users/karuo/Documents/开发/4、小工具/局域网手机电脑控制/执行脚本/测试脚本/开机自启动配置.txt"
for app_info in "${APPS[@]}"; do
    IFS=':' read -r package_name app_name <<< "$app_info"
    if adb -s 192.168.2.15:5555 shell pm list packages | grep -q "$package_name"; then
        echo "- $app_name ($package_name)" >> "/Users/karuo/Documents/开发/4、小工具/局域网手机电脑控制/执行脚本/测试脚本/开机自启动配置.txt"
    fi
done

echo "📄 配置信息已保存到: 开机自启动配置.txt"