#!/bin/bash

# 专业微信安装脚本
# 适用于RK3399设备 (192.168.2.2)
# 作者：卡若
# 日期：2024年12月

echo "📱 专业微信安装脚本"
echo "=================="
echo ""

# 颜色输出函数
red() { echo -e "\033[31m$1\033[0m"; }
green() { echo -e "\033[32m$1\033[0m"; }
yellow() { echo -e "\033[33m$1\033[0m"; }
blue() { echo -e "\033[34m$1\033[0m"; }

# 设备信息
DEVICE_IP="192.168.2.2:5555"
WECHAT_DIR="wechat_install"

echo "🎯 目标设备: $DEVICE_IP"
echo ""

# 步骤1：检查设备连接
echo "📡 第1步：检查设备连接"
echo "======================"

if adb devices | grep -q "$DEVICE_IP.*device"; then
    green "✅ 设备连接正常"
    
    # 获取设备基本信息
    device_model=$(adb shell getprop ro.product.model 2>/dev/null | tr -d '\r')
    android_version=$(adb shell getprop ro.build.version.release 2>/dev/null | tr -d '\r')
    
    echo "📋 设备信息："
    echo "  型号: $device_model"
    echo "  Android版本: $android_version"
else
    red "❌ 设备连接失败"
    echo "正在尝试重新连接..."
    adb connect $DEVICE_IP
    sleep 3
    
    if adb devices | grep -q "$DEVICE_IP.*device"; then
        green "✅ 重连成功"
    else
        red "❌ 无法连接设备，请检查网络和ADB设置"
        exit 1
    fi
fi

echo ""

# 步骤2：检查是否已安装微信
echo "🔍 第2步：检查微信安装状态"
echo "========================="

if adb shell pm list packages | grep -q "com.tencent.mm"; then
    yellow "⚠️  设备已安装微信"
    
    # 获取微信版本信息
    wechat_version=$(adb shell dumpsys package com.tencent.mm | grep "versionName" | head -1 | cut -d'=' -f2 || echo "未知版本")
    echo "📦 当前版本: $wechat_version"
    
    read -p "是否要更新到最新版本？(y/n): " update_choice
    
    if [[ $update_choice != [Yy]* ]]; then
        green "✅ 保持当前微信版本"
        echo ""
        echo "🚀 微信快速启动："
        adb shell am start -n com.tencent.mm/.ui.LauncherUI
        green "🎉 微信已启动！"
        exit 0
    else
        echo "📥 准备更新微信..."
    fi
else
    blue "📱 设备未安装微信，准备安装最新版本"
fi

echo ""

# 步骤3：创建工作目录
echo "📁 第3步：创建工作目录"
echo "===================="

mkdir -p "$WECHAT_DIR"
cd "$WECHAT_DIR"

green "✅ 工作目录创建完成: $(pwd)"
echo ""

# 步骤4：下载微信APK
echo "📥 第4步：下载微信APK"
echo "==================="

WECHAT_APK="wechat_latest.apk"

echo "🎯 微信下载选项："
echo "1. 官方最新版本 (推荐)"
echo "2. 稳定版本"
echo "3. 手动指定版本"
echo ""

read -p "选择下载版本 (1-3，默认1): " version_choice
version_choice=${version_choice:-1}

case $version_choice in
    1)
        echo "📥 下载官方最新版微信..."
        # 使用多个可靠的下载源
        DOWNLOAD_URLS=(
            "https://dldir1.qq.com/weixin/android/weixin8036android2280_arm64.apk"
            "https://dldir1.qq.com/weixin/android/weixin8036android2280.apk"
            "https://d.qq.com/android/WeChat_arm64.apk"
        )
        ;;
    2)
        echo "📥 下载稳定版微信..."
        DOWNLOAD_URLS=(
            "https://dldir1.qq.com/weixin/android/weixin8035android2240_arm64.apk"
            "https://dldir1.qq.com/weixin/android/weixin8035android2240.apk"
        )
        ;;
    3)
        read -p "请输入微信APK下载链接: " custom_url
        DOWNLOAD_URLS=("$custom_url")
        ;;
esac

# 尝试下载
download_success=false

for url in "${DOWNLOAD_URLS[@]}"; do
    echo "🔗 尝试下载: $url"
    
    if curl -L --connect-timeout 30 --max-time 600 -o "$WECHAT_APK" "$url"; then
        # 检查文件大小
        file_size=$(stat -f%z "$WECHAT_APK" 2>/dev/null || stat -c%s "$WECHAT_APK" 2>/dev/null)
        size_mb=$((file_size / 1024 / 1024))
        
        echo "📊 下载文件大小: ${size_mb}MB"
        
        if [ $size_mb -gt 50 ] && [ $size_mb -lt 200 ]; then
            green "✅ 下载成功，文件大小正常"
            download_success=true
            break
        else
            yellow "⚠️  文件大小异常，尝试下一个源..."
            rm -f "$WECHAT_APK"
        fi
    else
        yellow "⚠️  下载失败，尝试下一个源..."
    fi
done

if [ "$download_success" = false ]; then
    red "❌ 所有下载源都失败了"
    echo ""
    echo "💡 手动下载方法："
    echo "1. 在浏览器中访问: https://weixin.qq.com/"
    echo "2. 点击'立即下载'获取最新APK"
    echo "3. 将下载的APK文件重命名为: $WECHAT_APK"
    echo "4. 放到当前目录: $(pwd)"
    echo "5. 重新运行此脚本"
    exit 1
fi

echo ""

# 步骤5：安装微信
echo "📦 第5步：安装微信到设备"
echo "======================"

echo "⏳ 正在安装微信，请稍候..."

# 先卸载旧版本（如果存在）
if adb shell pm list packages | grep -q "com.tencent.mm"; then
    echo "🗑️  卸载旧版本微信..."
    adb uninstall com.tencent.mm
fi

# 安装新版本
if adb install -r "$WECHAT_APK"; then
    green "✅ 微信安装成功！"
else
    red "❌ 微信安装失败"
    echo ""
    echo "🔧 故障排除："
    echo "1. 检查APK文件是否完整"
    echo "2. 确保设备有足够存储空间"
    echo "3. 检查是否允许安装未知来源应用"
    echo "4. 尝试手动安装APK文件"
    exit 1
fi

echo ""

# 步骤6：验证安装
echo "🧪 第6步：验证微信安装"
echo "==================="

echo "🔍 检查微信是否正确安装..."

if adb shell pm list packages | grep -q "com.tencent.mm"; then
    green "✅ 微信包已安装"
    
    # 获取微信版本信息
    new_version=$(adb shell dumpsys package com.tencent.mm | grep "versionName" | head -1 | cut -d'=' -f2 2>/dev/null | tr -d '\r' || echo "未知版本")
    version_code=$(adb shell dumpsys package com.tencent.mm | grep "versionCode" | head -1 | cut -d'=' -f2 | cut -d' ' -f1 2>/dev/null | tr -d '\r' || echo "未知")
    
    echo "📦 微信版本: $new_version"
    echo "📦 版本代码: $version_code"
    
    # 检查微信权限
    echo "🔑 检查微信权限..."
    permissions=$(adb shell dumpsys package com.tencent.mm | grep "android.permission" | wc -l)
    echo "📋 已授权权限数量: $permissions"
    
    green "✅ 微信安装验证完成"
else
    red "❌ 微信安装验证失败"
    exit 1
fi

echo ""

# 步骤7：启动微信
echo "🚀 第7步：启动微信应用"
echo "==================="

echo "📱 正在启动微信..."

if adb shell am start -n com.tencent.mm/.ui.LauncherUI; then
    green "✅ 微信启动成功！"
    
    echo ""
    echo "📋 微信使用提示："
    echo "1. 首次启动需要登录微信账号"
    echo "2. 建议连接WiFi以获得更好体验"
    echo "3. 可以在设置中调整字体大小"
    echo "4. 支持语音、视频通话功能"
    
else
    yellow "⚠️  微信启动可能有问题，请手动启动"
fi

echo ""

# 清理工作
echo "🧹 第8步：清理临时文件"
echo "===================="

cd ..
rm -rf "$WECHAT_DIR"
green "✅ 临时文件清理完成"

echo ""

# 完成报告
green "🎉 微信安装完成！"
echo "=================="
echo ""
echo "📱 设备: RK3399 ($DEVICE_IP)"
echo "📦 应用: 微信最新版"
echo "✅ 状态: 安装成功并已启动"
echo ""
echo "🎯 下一步操作："
echo "1. 在设备上打开微信应用"
echo "2. 使用手机号或微信号登录"
echo "3. 享受微信聊天、视频通话功能"
echo ""
green "🚀 安装完成，微信已可正常使用！"
