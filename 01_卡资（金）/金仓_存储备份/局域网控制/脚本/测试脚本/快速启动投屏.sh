#!/bin/bash

# 快速启动MacBook到手机投屏
echo "启动投屏连接..."

# 连接设备
adb connect 192.168.2.15:5555

# 启动手机端RustDesk
adb -s 192.168.2.15:5555 shell am start -n com.carriez.flutter_hbb/.MainActivity

# 启动MacBook端RustDesk
open -a "/Applications/RustDesk.app"

echo "✅ 投屏应用已启动，请按照指南进行连接"
