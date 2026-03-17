#!/bin/bash

# 飞书APK下载和安装脚本
# 目标设备：192.168.2.2 (RK3399 Android 7.1.2)
# 作者：卡若
# 更新日期：2024年12月

echo "🚀 飞书安装脚本启动..."
echo ""

# 目标设备信息
TARGET_IP="192.168.2.2"
DEVICE_INFO="RK3399 Android 7.1.2"

echo "📱 目标设备: $TARGET_IP"
echo "📋 设备信息: $DEVICE_INFO"
echo ""

# 检查ADB连接状态
echo "🔍 检查ADB设备连接状态..."
device_status=$(adb devices | grep "$TARGET_IP" | grep "device" | wc -l)

if [ $device_status -eq 0 ]; then
    echo "❌ 设备未连接或未授权"
    echo "正在尝试重新连接..."
    adb connect $TARGET_IP:5555
    sleep 2
    
    device_status=$(adb devices | grep "$TARGET_IP" | grep "device" | wc -l)
    if [ $device_status -eq 0 ]; then
        echo "❌ 连接失败，请检查设备状态"
        exit 1
    fi
fi

echo "✅ 设备已连接: $TARGET_IP"
echo ""

# 飞书APK文件名
FEISHU_APK="Feishu_latest.apk"

echo "📥 准备下载飞书APK..."

# 检查是否已存在APK文件
if [ -f "$FEISHU_APK" ]; then
    echo "📁 发现已存在的飞书APK文件"
    file_size=$(ls -lh "$FEISHU_APK" | awk '{print $5}')
    echo "文件大小: $file_size"
    
    read -p "是否重新下载最新版本？(y/n): " choice
    if [[ $choice == [Yy]* ]]; then
        rm "$FEISHU_APK"
        echo "🗑️  已删除旧文件"
    else
        echo "🚀 使用现有APK文件安装..."
        skip_download=true
    fi
fi

if [ "$skip_download" != "true" ]; then
    echo "🔗 正在下载飞书APK..."
    echo "注意：下载适配Android 7.1.2的版本"
    
    # 尝试从多个来源下载飞书APK
    download_success=false
    
    # 来源1：飞书官方下载页面
    echo "⏳ 尝试从飞书官方下载..."
    curl -L -o "$FEISHU_APK" "https://sf3-cn.feishucdn.com/obj/ee-apk-sg/feishu_Android.apk" 2>/dev/null && download_success=true
    
    if [ "$download_success" != "true" ]; then
        echo "⏳ 尝试备用下载源..."
        # 备用下载方式
        curl -L -o "$FEISHU_APK" "https://www.feishu.cn/download" 2>/dev/null && download_success=true
    fi
    
    if [ "$download_success" != "true" ]; then
        echo "❌ 自动下载失败"
        echo ""
        echo "请手动下载飞书APK："
        echo "1. 访问 https://www.feishu.cn/download"
        echo "2. 下载Android版本APK"
        echo "3. 将文件重命名为 '$FEISHU_APK' 放到当前目录"
        echo "4. 重新运行此脚本"
        exit 1
    fi
    
    echo "✅ 下载完成"
fi

# 验证APK文件
if [ ! -f "$FEISHU_APK" ]; then
    echo "❌ 飞书APK文件不存在"
    exit 1
fi

file_size=$(ls -lh "$FEISHU_APK" | awk '{print $5}')
echo "📦 APK文件大小: $file_size"

# 检查文件是否太小（可能下载失败）
actual_size=$(stat -f%z "$FEISHU_APK" 2>/dev/null || stat -c%s "$FEISHU_APK" 2>/dev/null)
if [ "$actual_size" -lt 10000000 ]; then  # 小于10MB可能有问题
    echo "⚠️  文件大小异常，可能下载不完整"
    read -p "是否继续安装？(y/n): " continue_choice
    if [[ $continue_choice != [Yy]* ]]; then
        echo "安装已取消"
        exit 1
    fi
fi

echo ""

# 检查手机存储空间
echo "💾 检查设备存储空间..."
storage_info=$(adb shell df /data | tail -1)
echo "存储状态: $storage_info"

available_kb=$(echo "$storage_info" | awk '{print $4}')
available_mb=$((available_kb / 1024))
echo "可用空间: ${available_mb}MB"

if [ "$available_mb" -lt 200 ]; then
    echo "⚠️  存储空间可能不足，建议清理后再安装"
    read -p "是否继续安装？(y/n): " storage_choice
    if [[ $storage_choice != [Yy]* ]]; then
        echo "安装已取消"
        exit 1
    fi
fi

echo ""

# 检查是否已安装飞书
echo "🔍 检查是否已安装飞书..."
existing_feishu=$(adb shell pm list packages | grep -E "(feishu|lark)")

if [ ! -z "$existing_feishu" ]; then
    echo "发现已安装的飞书应用:"
    echo "$existing_feishu"
    
    read -p "是否卸载旧版本再安装？(y/n): " uninstall_choice
    
    if [[ $uninstall_choice == [Yy]* ]]; then
        echo "🗑️  正在卸载旧版本..."
        # 尝试卸载常见的飞书包名
        adb uninstall com.ss.android.lark 2>/dev/null
        adb uninstall com.larksuite.suite 2>/dev/null
        adb uninstall com.bytedance.lark 2>/dev/null
        echo "✅ 旧版本处理完成"
    fi
fi

echo ""
echo "🚀 开始安装飞书..."
echo "设备: $DEVICE_INFO"
echo "这可能需要几分钟时间，请耐心等待..."
echo ""

# 安装飞书APK
echo "⏳ 正在安装中..."
adb install -r "$FEISHU_APK"

install_result=$?

echo ""

if [ $install_result -eq 0 ]; then
    echo "🎉 飞书安装成功！"
    echo ""
    echo "📱 后续操作："
    echo "1. 在设备上找到飞书图标"
    echo "2. 点击打开飞书应用"
    echo "3. 按照提示完成登录设置"
    echo ""
    
    # 获取安装的包名
    installed_package=$(adb shell pm list packages | grep -E "(feishu|lark)" | head -1)
    if [ ! -z "$installed_package" ]; then
        package_name=$(echo "$installed_package" | cut -d':' -f2)
        echo "📋 已安装包名: $package_name"
        
        # 启动飞书应用
        read -p "是否现在启动飞书应用？(y/n): " launch_choice
        if [[ $launch_choice == [Yy]* ]]; then
            echo "🚀 启动飞书应用..."
            adb shell monkey -p "$package_name" -c android.intent.category.LAUNCHER 1 2>/dev/null
            echo "✅ 飞书已启动，请在设备上查看"
        fi
    fi
    
else
    echo "❌ 飞书安装失败"
    echo ""
    echo "可能的原因："
    echo "1. 存储空间不足"
    echo "2. APK文件与Android 7.1.2不兼容"
    echo "3. 设备权限不足"
    echo "4. APK文件损坏"
    echo ""
    echo "建议解决方案："
    echo "- 清理设备存储空间"
    echo "- 下载旧版本飞书APK（适配Android 7.x）"
    echo "- 检查设备系统完整性"
    echo "- 重新下载APK文件"
fi

echo ""
echo "🔚 飞书安装脚本执行完成"
echo "设备信息: $DEVICE_INFO"
