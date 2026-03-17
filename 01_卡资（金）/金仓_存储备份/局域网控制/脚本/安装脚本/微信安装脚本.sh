#!/bin/bash

# 微信APK下载和安装脚本
# 作者：卡若
# 更新日期：2024年12月

echo "📱 微信安装脚本启动..."
echo ""

# 检查ADB连接状态
echo "🔍 检查ADB设备连接状态..."
device_status=$(adb devices | grep -v "List of devices" | grep -E "device|unauthorized" | wc -l)

if [ $device_status -eq 0 ]; then
    echo "❌ 没有检测到连接的设备"
    echo "请先运行 './ADB连接脚本.sh' 连接手机"
    exit 1
fi

echo "✅ 设备已连接"
echo ""

# 微信APK下载
WECHAT_APK="WeChat_latest.apk"

echo "📥 准备下载最新版微信..."

# 检查是否已存在APK文件
if [ -f "$WECHAT_APK" ]; then
    echo "📁 发现已存在的微信APK文件"
    read -p "是否重新下载最新版本？(y/n): " choice
    if [[ $choice == [Yy]* ]]; then
        rm "$WECHAT_APK"
    else
        echo "🚀 使用现有APK文件安装..."
        skip_download=true
    fi
fi

if [ "$skip_download" != "true" ]; then
    echo "🔗 从应用宝下载微信最新版..."
    
    # 使用curl下载微信APK（应用宝官方链接）
    curl -L -o "$WECHAT_APK" "https://dldir1.qq.com/weixin/android/weixin8050android2840_0x2800183f.apk" || {
        echo "❌ 下载失败，尝试备用下载源..."
        
        # 备用下载方式
        echo "请手动下载微信APK文件到当前目录，命名为 '$WECHAT_APK'"
        echo "下载地址: https://weixin.qq.com/"
        echo "或者使用浏览器访问: https://dldir1.qq.com/weixin/android/"
        exit 1
    }
fi

# 验证APK文件
if [ ! -f "$WECHAT_APK" ]; then
    echo "❌ 微信APK文件不存在"
    exit 1
fi

file_size=$(ls -lh "$WECHAT_APK" | awk '{print $5}')
echo "📦 APK文件大小: $file_size"
echo ""

# 检查手机存储空间
echo "💾 检查手机存储空间..."
storage_info=$(adb shell df /data | tail -1)
echo "存储状态: $storage_info"
echo ""

# 卸载旧版本微信（可选）
echo "🗑️  检查是否需要卸载旧版本..."
old_wechat=$(adb shell pm list packages | grep tencent.mm)

if [ ! -z "$old_wechat" ]; then
    echo "发现已安装的微信版本"
    read -p "是否卸载旧版本再安装？(y/n): " uninstall_choice
    
    if [[ $uninstall_choice == [Yy]* ]]; then
        echo "🗑️  正在卸载旧版本微信..."
        adb uninstall com.tencent.mm
        echo "✅ 旧版本已卸载"
    fi
fi

echo ""
echo "🚀 开始安装微信..."
echo "这可能需要几分钟时间，请耐心等待..."
echo ""

# 安装微信APK
adb install -r "$WECHAT_APK"

install_result=$?

if [ $install_result -eq 0 ]; then
    echo ""
    echo "🎉 微信安装成功！"
    echo ""
    echo "📱 后续操作："
    echo "1. 在手机上找到微信图标"
    echo "2. 点击打开微信应用" 
    echo "3. 按照提示完成登录设置"
    echo ""
    
    # 启动微信应用
    read -p "是否现在启动微信应用？(y/n): " launch_choice
    if [[ $launch_choice == [Yy]* ]]; then
        echo "🚀 启动微信应用..."
        adb shell am start -n com.tencent.mm/.ui.LauncherUI
        echo "✅ 微信已启动，请在手机上查看"
    fi
    
else
    echo ""
    echo "❌ 微信安装失败"
    echo "可能的原因："
    echo "1. 存储空间不足"
    echo "2. APK文件损坏"
    echo "3. 系统版本不兼容"
    echo "4. 设备权限不足"
    echo ""
    echo "建议："
    echo "- 清理手机存储空间"
    echo "- 重新下载APK文件"
    echo "- 检查手机系统版本"
fi

echo ""
echo "🔚 脚本执行完成"
