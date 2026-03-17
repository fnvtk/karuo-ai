#!/bin/bash

# 乐播投屏安装脚本
# 适用于Android设备的乐播投屏应用安装

echo "=== 乐播投屏安装脚本 ==="
echo "目标设备: $1"
echo "当前时间: $(date)"
echo ""

# 设置目标设备IP
TARGET_IP="$1"
if [ -z "$TARGET_IP" ]; then
    echo "请提供设备IP地址"
    echo "使用方法: $0 <设备IP>"
    echo "例如: $0 192.168.2.15"
    exit 1
fi

# 检查设备连通性
echo "1. 检查设备连通性..."
ping -c 3 "$TARGET_IP" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✓ 设备 $TARGET_IP 在线"
else
    echo "✗ 设备 $TARGET_IP 无法连接"
    exit 1
fi

# 尝试ADB连接
echo "\n2. 尝试ADB连接..."
ADB_PORTS=("5555" "5037" "4444" "5556" "6666" "7777")
CONNECTED=false

for port in "${ADB_PORTS[@]}"; do
    echo "尝试连接 $TARGET_IP:$port"
    adb connect "$TARGET_IP:$port" > /dev/null 2>&1
    
    # 检查连接状态
    adb devices | grep "$TARGET_IP:$port" | grep -q "device"
    if [ $? -eq 0 ]; then
        echo "✓ ADB连接成功: $TARGET_IP:$port"
        CONNECTED=true
        DEVICE_ADDRESS="$TARGET_IP:$port"
        break
    fi
done

if [ "$CONNECTED" = false ]; then
    echo "\n✗ ADB连接失败，设备可能未开启无线调试"
    echo "\n请按以下步骤配置设备:"
    echo "1. 进入设置 → 关于手机/平板"
    echo "2. 连续点击版本号7次开启开发者选项"
    echo "3. 进入设置 → 开发者选项"
    echo "4. 开启USB调试"
    echo "5. 开启无线ADB调试(如果有此选项)"
    echo "6. 重新运行此脚本"
    echo "\n详细配置指南请查看: 文档/连接文档/Android设备ADB无线连接设置指南.md"
    exit 1
fi

# 获取设备信息
echo "\n3. 获取设备信息..."
DEVICE_MODEL=$(adb -s "$DEVICE_ADDRESS" shell getprop ro.product.model 2>/dev/null | tr -d '\r')
ANDROID_VERSION=$(adb -s "$DEVICE_ADDRESS" shell getprop ro.build.version.release 2>/dev/null | tr -d '\r')
echo "设备型号: $DEVICE_MODEL"
echo "Android版本: $ANDROID_VERSION"

# 检查是否已安装乐播投屏
echo "\n4. 检查已安装的投屏应用..."
LEBO_PACKAGES=(
    "com.hpplay.happycast.tv"     # 乐播投屏TV版
    "com.hpplay.happycast"        # 乐播投屏手机版
    "com.lebo.doubletvmobile"     # 乐播投屏
    "com.lebo.airplaydmr"         # 乐播投屏接收端
)

INSTALLED_LEBO=""
for package in "${LEBO_PACKAGES[@]}"; do
    if adb -s "$DEVICE_ADDRESS" shell pm list packages | grep -q "$package"; then
        echo "✓ 已安装: $package"
        INSTALLED_LEBO="$package"
    fi
done

if [ -n "$INSTALLED_LEBO" ]; then
    echo "\n乐播投屏已安装，尝试启动应用..."
    adb -s "$DEVICE_ADDRESS" shell am start -n "$INSTALLED_LEBO/.MainActivity" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "✓ 乐播投屏启动成功"
        exit 0
    else
        echo "启动失败，尝试其他Activity..."
        # 尝试其他可能的启动Activity
        adb -s "$DEVICE_ADDRESS" shell am start -n "$INSTALLED_LEBO/.ui.MainActivity" 2>/dev/null
        adb -s "$DEVICE_ADDRESS" shell am start -n "$INSTALLED_LEBO/.activity.MainActivity" 2>/dev/null
    fi
fi

# 下载乐播投屏APK
echo "\n5. 下载乐播投屏APK..."
APK_DIR="../应用文件"
mkdir -p "$APK_DIR"

# 乐播投屏下载链接
LEBO_URLS=(
    "https://down.lebo.cn/lebo_tv.apk"                                    # 官方TV版
    "https://imtt.dd.qq.com/16891/apk/469E7D8F7E7F4A2E9C9B8C5A5F5E5D5C.apk" # 应用宝版本
    "https://download.lebo.cn/android/lebo_phone.apk"                     # 手机版
)

DOWNLOADED=false
for i in "${!LEBO_URLS[@]}"; do
    url="${LEBO_URLS[$i]}"
    filename="lebo_cast_$((i+1)).apk"
    filepath="$APK_DIR/$filename"
    
    echo "尝试下载: $url"
    curl -L -o "$filepath" "$url" --connect-timeout 30 --max-time 300
    
    if [ -f "$filepath" ] && [ -s "$filepath" ]; then
        # 验证APK文件
        file_size=$(stat -f%z "$filepath" 2>/dev/null || stat -c%s "$filepath" 2>/dev/null)
        if [ "$file_size" -gt 1000000 ]; then  # 大于1MB
            echo "✓ 下载成功: $filename (${file_size} bytes)"
            LEBO_APK="$filepath"
            DOWNLOADED=true
            break
        else
            echo "✗ 文件太小，可能下载失败"
            rm -f "$filepath"
        fi
    else
        echo "✗ 下载失败"
    fi
done

if [ "$DOWNLOADED" = false ]; then
    echo "\n所有下载链接都失败，尝试使用本地APK文件..."
    
    # 查找本地乐播投屏APK文件
    LOCAL_APKS=(
        "$APK_DIR/lebo*.apk"
        "$APK_DIR/*lebo*.apk"
        "$APK_DIR/*cast*.apk"
    )
    
    for pattern in "${LOCAL_APKS[@]}"; do
        for apk in $pattern; do
            if [ -f "$apk" ]; then
                echo "找到本地APK: $apk"
                LEBO_APK="$apk"
                DOWNLOADED=true
                break 2
            fi
        done
    done
fi

if [ "$DOWNLOADED" = false ]; then
    echo "\n✗ 无法获取乐播投屏APK文件"
    echo "请手动下载乐播投屏APK到 $APK_DIR 目录"
    echo "官方下载地址: https://www.lebo.cn/"
    exit 1
fi

# 安装乐播投屏
echo "\n6. 安装乐播投屏..."
echo "安装文件: $LEBO_APK"
adb -s "$DEVICE_ADDRESS" install -r "$LEBO_APK"

if [ $? -eq 0 ]; then
    echo "✓ 乐播投屏安装成功"
else
    echo "✗ 安装失败，尝试强制安装..."
    adb -s "$DEVICE_ADDRESS" install -r -d "$LEBO_APK"
    
    if [ $? -eq 0 ]; then
        echo "✓ 强制安装成功"
    else
        echo "✗ 安装失败，请检查设备兼容性"
        exit 1
    fi
fi

# 验证安装
echo "\n7. 验证安装..."
for package in "${LEBO_PACKAGES[@]}"; do
    if adb -s "$DEVICE_ADDRESS" shell pm list packages | grep -q "$package"; then
        echo "✓ 验证成功: $package"
        INSTALLED_PACKAGE="$package"
        break
    fi
done

if [ -z "$INSTALLED_PACKAGE" ]; then
    echo "✗ 验证失败，应用可能未正确安装"
    exit 1
fi

# 启动乐播投屏
echo "\n8. 启动乐播投屏..."
# 尝试多种启动方式
START_ACTIVITIES=(
    "$INSTALLED_PACKAGE/.MainActivity"
    "$INSTALLED_PACKAGE/.ui.MainActivity"
    "$INSTALLED_PACKAGE/.activity.MainActivity"
    "$INSTALLED_PACKAGE/.SplashActivity"
    "$INSTALLED_PACKAGE/.LauncherActivity"
)

STARTED=false
for activity in "${START_ACTIVITIES[@]}"; do
    echo "尝试启动: $activity"
    adb -s "$DEVICE_ADDRESS" shell am start -n "$activity" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo "✓ 启动成功: $activity"
        STARTED=true
        break
    fi
done

if [ "$STARTED" = false ]; then
    echo "\n使用dumpsys查找正确的启动Activity..."
    adb -s "$DEVICE_ADDRESS" shell dumpsys package "$INSTALLED_PACKAGE" | grep -A 5 "Activity" | head -10
    
    echo "\n尝试通过包名启动..."
    adb -s "$DEVICE_ADDRESS" shell monkey -p "$INSTALLED_PACKAGE" -c android.intent.category.LAUNCHER 1
fi

# 显示网络信息
echo "\n9. 网络信息..."
DEVICE_IP=$(adb -s "$DEVICE_ADDRESS" shell ip route get 1.1.1.1 2>/dev/null | grep -oP 'src \K\S+' || echo "未知")
echo "设备IP地址: $DEVICE_IP"
echo "MacBook IP地址: $(ifconfig | grep 'inet ' | grep -v '127.0.0.1' | head -1 | awk '{print $2}')"

echo "\n=== 乐播投屏安装完成 ==="
echo "\n使用说明:"
echo "1. 确保设备和MacBook在同一局域网"
echo "2. 在MacBook上打开乐播投屏发送端或使用AirPlay"
echo "3. 选择设备名称进行投屏"
echo "4. 如需卸载: adb -s $DEVICE_ADDRESS uninstall $INSTALLED_PACKAGE"
echo ""
echo "故障排除:"
echo "- 如果无法发现设备，检查防火墙设置"
echo "- 如果投屏卡顿，尝试降低分辨率"
echo "- 如果连接失败，重启乐播投屏应用"
echo ""