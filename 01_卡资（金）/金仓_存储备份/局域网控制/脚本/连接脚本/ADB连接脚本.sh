#!/bin/bash

# ADB连接和微信安装脚本
# 作者：卡若
# 更新日期：2024年12月

echo "🔧 开始ADB连接和微信安装流程..."

# 手机IP地址
PHONE_IP="192.168.2.2"

echo ""
echo "📱 目标手机IP: $PHONE_IP"
echo ""

# 常见ADB端口列表
PORTS=(5555 5556 37755 40000 43210)

echo "🔍 正在尝试连接手机设备..."
echo ""

# 清理之前的连接
adb disconnect > /dev/null 2>&1

# 尝试不同端口连接
for port in "${PORTS[@]}"; do
    echo "⏳ 尝试端口 $port..."
    
    result=$(adb connect $PHONE_IP:$port 2>&1)
    
    if [[ $result == *"connected"* ]]; then
        echo "✅ 成功连接到 $PHONE_IP:$port"
        echo ""
        
        # 检查设备状态
        echo "📋 设备状态检查："
        adb devices
        echo ""
        
        # 检查设备信息
        echo "📱 设备信息："
        echo "设备型号: $(adb shell getprop ro.product.model)"
        echo "Android版本: $(adb shell getprop ro.build.version.release)" 
        echo "品牌: $(adb shell getprop ro.product.brand)"
        echo ""
        
        exit 0
    else
        echo "❌ 端口 $port 连接失败"
    fi
done

echo ""
echo "⚠️  所有端口都连接失败！"
echo ""
echo "可能的原因："
echo "1. 手机未开启开发者选项"
echo "2. 手机未开启USB调试"
echo "3. 手机未开启无线调试"
echo "4. 手机和电脑不在同一WiFi网络"
echo ""
echo "解决方案："
echo "请查看 '手机ADB无线连接设置指南.md' 文件"
echo "按照指南完成手机端设置后再运行此脚本"
echo ""

exit 1
