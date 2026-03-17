#!/bin/bash

# 直接安装微信脚本
# 使用现有的APK文件进行安装测试

echo "🚀 直接安装微信到RK3399设备"
echo "=========================="
echo ""

# 检查设备连接
echo "📡 检查设备连接..."
if ! adb devices | grep -q "192.168.2.2.*device"; then
    echo "⚠️  设备未连接，尝试重新连接..."
    adb connect 192.168.2.2:5555
    sleep 3
    
    if ! adb devices | grep -q "192.168.2.2.*device"; then
        echo "❌ 设备连接失败"
        exit 1
    fi
fi

echo "✅ 设备连接正常"
echo ""

# 检查APK文件
echo "📦 检查微信APK文件..."
cd wechat_install

if [ -f "wechat_latest.apk" ]; then
    file_size=$(stat -f%z "wechat_latest.apk" 2>/dev/null || stat -c%s "wechat_latest.apk" 2>/dev/null)
    size_mb=$((file_size / 1024 / 1024))
    
    echo "📋 找到APK文件: wechat_latest.apk (${size_mb}MB)"
    
    if [ $size_mb -lt 5 ]; then
        echo "⚠️  这是演示APK文件，但我们继续测试安装流程..."
    fi
else
    echo "❌ 未找到微信APK文件"
    echo ""
    echo "请先获取真实的微信APK："
    echo "1. 运行 ./get_wechat_real.sh 查看下载方法"
    echo "2. 或手动下载微信APK到此目录"
    exit 1
fi

echo ""

# 检查设备存储空间
echo "💾 检查设备存储空间..."
available_space=$(adb shell df /data | tail -1 | awk '{print $4}' | tr -d '\r')
if [ -n "$available_space" ]; then
    available_mb=$((available_space / 1024))
    echo "📊 可用存储: ${available_mb}MB"
    
    if [ $available_mb -lt 200 ]; then
        echo "⚠️  存储空间可能不足，但继续尝试安装..."
    fi
else
    echo "⚠️  无法获取存储信息，继续安装..."
fi

echo ""

# 检查是否已安装微信
echo "🔍 检查微信安装状态..."
if adb shell pm list packages | grep -q "com.tencent.mm"; then
    echo "⚠️  设备已安装微信，准备更新..."
    
    # 先卸载旧版本
    echo "🗑️  卸载旧版本微信..."
    if adb uninstall com.tencent.mm; then
        echo "✅ 旧版本卸载成功"
    else
        echo "⚠️  卸载失败，继续安装新版本..."
    fi
else
    echo "📱 设备未安装微信，准备首次安装"
fi

echo ""

# 开始安装
echo "📦 开始安装微信..."
echo "=================="

echo "⏳ 正在安装，请稍候..."

# 尝试安装APK
if adb install -r "wechat_latest.apk"; then
    echo "✅ APK安装命令执行成功"
    
    # 验证安装
    echo ""
    echo "🧪 验证安装结果..."
    
    if adb shell pm list packages | grep -q "com.tencent.mm"; then
        echo "✅ 微信已成功安装到设备"
        
        # 获取应用信息
        echo ""
        echo "📋 微信应用信息："
        
        # 获取版本信息（可能无法获取，因为是演示APK）
        version_name=$(adb shell dumpsys package com.tencent.mm | grep "versionName" | head -1 | cut -d'=' -f2 2>/dev/null | tr -d '\r' || echo "演示版本")
        echo "📦 版本: $version_name"
        
        # 获取包路径
        package_path=$(adb shell pm path com.tencent.mm | cut -d':' -f2 | tr -d '\r')
        echo "📁 安装路径: $package_path"
        
        # 尝试启动微信
        echo ""
        echo "🚀 尝试启动微信..."
        
        if adb shell am start -n com.tencent.mm/.ui.LauncherUI 2>/dev/null; then
            echo "✅ 微信启动命令发送成功"
        else
            echo "⚠️  微信启动可能失败（演示APK限制）"
        fi
        
    else
        echo "❌ 安装验证失败，微信未出现在应用列表中"
    fi
    
else
    echo "❌ 微信安装失败"
    echo ""
    echo "🔧 可能的原因："
    echo "1. APK文件不完整或损坏"
    echo "2. 设备存储空间不足"
    echo "3. Android版本不兼容"
    echo "4. 权限设置问题"
    echo ""
    echo "💡 解决方法："
    echo "1. 下载真实的微信APK文件"
    echo "2. 检查设备设置中是否允许安装未知来源应用"
    echo "3. 清理设备存储空间"
    
    cd ..
    exit 1
fi

cd ..

echo ""
echo "🎉 微信安装流程完成！"
echo "===================="
echo ""

if adb shell pm list packages | grep -q "com.tencent.mm"; then
    echo "✅ 安装状态: 成功"
    echo "📱 设备: RK3399 (192.168.2.2)"
    echo "📦 应用: 微信"
    echo ""
    echo "🎯 下一步操作："
    echo "1. 在设备屏幕上查找微信图标"
    echo "2. 点击微信图标启动应用"
    echo "3. 使用微信账号登录"
    echo "4. 享受聊天、视频通话功能"
    echo ""
    
    if [ -f "wechat_install/wechat_latest.apk" ]; then
        file_size=$(stat -f%z "wechat_install/wechat_latest.apk" 2>/dev/null || stat -c%s "wechat_install/wechat_latest.apk" 2>/dev/null)
        size_mb=$((file_size / 1024 / 1024))
        
        if [ $size_mb -lt 5 ]; then
            echo "⚠️  注意: 当前安装的是演示版本"
            echo "📥 要安装真实微信，请："
            echo "1. 访问 https://apkpure.com/cn/wechat/com.tencent.mm"
            echo "2. 下载真实的微信APK"
            echo "3. 重新运行此脚本"
        fi
    fi
else
    echo "❌ 安装状态: 失败"
    echo "🔧 请尝试手动安装或联系技术支持"
fi

echo ""
echo "🚀 安装完成！"
