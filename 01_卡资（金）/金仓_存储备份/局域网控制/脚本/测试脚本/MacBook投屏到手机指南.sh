#!/bin/bash

# MacBook投屏到手机指南脚本
# 作者: 卡若
# 功能: 指导用户使用RustDesk实现MacBook投屏到Android手机

echo "=== MacBook投屏到手机指南 ==="
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

# 检查RustDesk安装状态
echo "2. 检查RustDesk安装状态..."

# 检查手机端RustDesk
if adb -s 192.168.2.15:5555 shell pm list packages | grep -q "com.carriez.flutter_hbb"; then
    echo "✅ 手机端RustDesk已安装"
else
    echo "❌ 手机端RustDesk未安装，正在安装..."
    adb -s 192.168.2.15:5555 install "/Users/karuo/Documents/开发/4、小工具/局域网手机电脑控制/应用文件/rustdesk-1.4.2-universal.apk"
    if [ $? -eq 0 ]; then
        echo "✅ 手机端RustDesk安装成功"
    else
        echo "❌ 手机端RustDesk安装失败"
        exit 1
    fi
fi

# 检查MacBook端RustDesk
if [ -d "/Applications/RustDesk.app" ]; then
    echo "✅ MacBook端RustDesk已安装"
else
    echo "❌ MacBook端RustDesk未安装，正在下载..."
    echo "请访问 https://rustdesk.com/zh/ 下载MacBook版本"
    open "https://rustdesk.com/zh/"
    echo "下载完成后请重新运行此脚本"
    exit 1
fi

echo

# 启动手机端RustDesk
echo "3. 启动手机端RustDesk..."
adb -s 192.168.2.15:5555 shell am start -n com.carriez.flutter_hbb/.MainActivity
echo "✅ 手机端RustDesk已启动"
echo

# 获取手机屏幕截图查看ID
echo "4. 获取手机屏幕截图..."
adb -s 192.168.2.15:5555 shell screencap -p /sdcard/rustdesk_screen.png
adb -s 192.168.2.15:5555 pull /sdcard/rustdesk_screen.png "/Users/karuo/Documents/开发/4、小工具/局域网手机电脑控制/执行脚本/测试脚本/手机RustDesk截图.png"
echo "✅ 屏幕截图已保存到: 手机RustDesk截图.png"
echo

# 启动MacBook端RustDesk
echo "5. 启动MacBook端RustDesk..."
open -a "/Applications/RustDesk.app"
echo "✅ MacBook端RustDesk已启动"
echo

echo "=== 投屏连接步骤 ==="
echo
echo "📱 手机端操作:"
echo "1. 在手机RustDesk界面查看设备ID（9位数字）"
echo "2. 确保'允许远程控制'开关已开启"
echo "3. 记录显示的设备ID"
echo
echo "💻 MacBook端操作:"
echo "1. 在MacBook RustDesk中输入手机的设备ID"
echo "2. 点击'连接'按钮"
echo "3. 手机会弹出连接请求，点击'接受'"
echo "4. 连接成功后，MacBook屏幕将投屏到手机"
echo
echo "🔧 投屏模式说明:"
echo "- 查看模式: 只能查看MacBook屏幕，无法控制"
echo "- 控制模式: 可以通过手机控制MacBook（需要权限）"
echo "- 文件传输: 可以在设备间传输文件"
echo
echo "⚙️ 高级设置:"
echo "- 画质调节: 在连接界面可调整画质（自动/高/中/低）"
echo "- 音频传输: 可选择是否传输音频"
echo "- 全屏模式: 手机端可切换全屏显示"
echo
echo "🚨 故障排除:"
echo "1. 连接失败:"
echo "   - 确保两设备在同一网络"
echo "   - 检查防火墙设置"
echo "   - 重启RustDesk应用"
echo
echo "2. 画面卡顿:"
echo "   - 降低画质设置"
echo "   - 检查网络带宽"
echo "   - 关闭其他网络应用"
echo
echo "3. 无法控制:"
echo "   - 检查手机端权限设置"
echo "   - 确保'允许远程控制'已开启"
echo "   - 重新建立连接"
echo
echo "📋 使用技巧:"
echo "- 双指缩放: 手机端可缩放MacBook屏幕"
echo "- 右键菜单: 长按屏幕显示右键菜单"
echo "- 键盘输入: 点击键盘图标调出虚拟键盘"
echo "- 快捷键: 支持常用MacBook快捷键"
echo
echo "🔒 安全提醒:"
echo "- 连接时会显示对方设备信息"
echo "- 可设置连接密码增强安全性"
echo "- 连接记录会保存在历史中"
echo "- 不使用时建议关闭远程控制功能"
echo

# 创建快捷启动脚本
echo "6. 创建快捷启动脚本..."
cat > "/Users/karuo/Documents/开发/4、小工具/局域网手机电脑控制/执行脚本/测试脚本/快速启动投屏.sh" << 'EOF'
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
EOF

chmod +x "/Users/karuo/Documents/开发/4、小工具/局域网手机电脑控制/执行脚本/测试脚本/快速启动投屏.sh"
echo "✅ 快捷启动脚本已创建: 快速启动投屏.sh"
echo

# 保存配置信息
echo "设备信息:" > "/Users/karuo/Documents/开发/4、小工具/局域网手机电脑控制/执行脚本/测试脚本/投屏配置信息.txt"
echo "- 手机IP: 192.168.2.15" >> "/Users/karuo/Documents/开发/4、小工具/局域网手机电脑控制/执行脚本/测试脚本/投屏配置信息.txt"
echo "- 手机RustDesk: com.carriez.flutter_hbb" >> "/Users/karuo/Documents/开发/4、小工具/局域网手机电脑控制/执行脚本/测试脚本/投屏配置信息.txt"
echo "- MacBook RustDesk: /Applications/RustDesk.app" >> "/Users/karuo/Documents/开发/4、小工具/局域网手机电脑控制/执行脚本/测试脚本/投屏配置信息.txt"
echo "- 配置时间: $(date)" >> "/Users/karuo/Documents/开发/4、小工具/局域网手机电脑控制/执行脚本/测试脚本/投屏配置信息.txt"
echo
echo "=== 投屏设置完成 ==="
echo "✅ RustDesk已在手机和MacBook上准备就绪"
echo "✅ 请查看手机屏幕获取设备ID，然后在MacBook端连接"
echo "✅ 快捷启动脚本: 快速启动投屏.sh"
echo "✅ 屏幕截图: 手机RustDesk截图.png"
echo "✅ 配置信息: 投屏配置信息.txt"
echo
echo "🎯 下一步: 在MacBook RustDesk中输入手机显示的设备ID进行连接！"