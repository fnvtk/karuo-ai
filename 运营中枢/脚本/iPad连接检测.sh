#!/bin/bash
# iPad 连接状态检测（快速检查）
echo "=== iPad/Mac 连接检测 ==="
echo ""
echo "1. libimobiledevice 检测："
if idevice_id -l 2>/dev/null | grep -q .; then
    echo "   ✅ 已检测到 iOS 设备"
    ideviceinfo 2>/dev/null | grep -E "ProductName|ProductType|ProductVersion"
else
    echo "   ❌ 未检测到 iPad"
    echo ""
    echo "   请检查："
    echo "   • iPad 已解锁"
    echo "   • 弹窗出现时点「信任此电脑」"
    echo "   • 使用可传数据的数据线（30针转 USB）"
    echo "   • 若通过扩展坞：部分扩展坞只支持充电，不支持数据"
    echo "   • 尝试直接用 30针→USB 线连 Mac，绕过扩展坞"
fi
echo ""
echo "2. USB 设备（含扩展坞）："
system_profiler SPUSBDataType 2>/dev/null | grep -E "Product ID|Vendor ID|Serial|Apple|iPad" || echo "   无法获取"
echo ""
echo "3. Duet 状态："
[ -d /Applications/Duet.app ] && echo "   ✅ Duet Mac 已安装" || echo "   ❌ Duet 未安装"
