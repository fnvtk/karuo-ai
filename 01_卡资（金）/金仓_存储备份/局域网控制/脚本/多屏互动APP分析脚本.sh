#!/bin/bash
# 多屏互动APP分析与商用激活脚本
# 适用于192.168.2.14设备

echo "=== 卡若私域-多屏互动APP分析与激活脚本 ==="
echo "目标设备: 192.168.2.14"
echo "目标共享名: 卡若私域-办公室"
echo ""

# 连接设备
echo "1. 连接设备..."
adb connect 192.168.2.14:5555
sleep 2

# 检查连接状态
echo "2. 检查连接状态..."
adb devices

# 获取设备信息
echo "3. 获取设备信息..."
echo "设备型号: $(adb shell getprop ro.product.model)"
echo "Android版本: $(adb shell getprop ro.build.version.release)"
echo "序列号: $(adb shell getprop ro.serialno)"
echo ""

# 查找多屏互动相关应用
echo "4. 分析多屏互动应用..."
echo "已安装投屏类应用:"
adb shell pm list packages | grep -i "screen\|cast\|mirror\|display\|投屏\|多屏\|同屏"

# 查找photoxxx相关应用
echo ""
echo "查找photoxxx相关应用:"
adb shell pm list packages | grep -i "photo"

# 获取当前共享设置
echo ""
echo "5. 分析共享设置..."
adb shell settings get global device_name
adb shell settings get system device_name

# 尝试修改共享名称
echo ""
echo "6. 修改共享名称为'卡若私域-办公室'..."
adb shell settings put global device_name "卡若私域-办公室"
adb shell settings put system device_name "卡若私域-办公室"

# 检查网络共享服务
echo ""
echo "7. 检查网络共享服务..."
adb shell service list | grep -i "display\|cast\|mirror"

# 查找配置文件
echo ""
echo "8. 查找可能的配置文件..."
adb shell find /data/data -name "*photo*" -type d 2>/dev/null | head -5
adb shell find /sdcard -name "*photo*" -type d 2>/dev/null | head -5

echo ""
echo "=== 分析完成 ==="
echo "如果找到目标应用，请提供具体包名进行商用激活"