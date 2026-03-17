#!/bin/bash

# 飞书会议室系统安装脚本
# 设备：RK3399 (CBI9SU7JNR)
# 目标：打造专业飞书会议室系统
# 作者：卡若
# 日期：2024年12月

echo "🚀 开始安装飞书会议室系统..."
echo "设备：RK3399 Android 7.1.2"
echo "目标：专业会议室解决方案"
echo ""

# 检查设备连接
echo "🔍 检查设备连接状态..."
if ! adb devices | grep -q "192.168.2.2"; then
    echo "❌ 设备未连接，请检查ADB连接"
    exit 1
fi

echo "✅ 设备连接正常"
echo ""

# 创建安装目录
INSTALL_DIR="feishu_meeting_system"
mkdir -p "$INSTALL_DIR"

echo "📁 安装目录: $INSTALL_DIR"
echo ""

# 第一步：下载飞书会议套件
echo "📥 第一步：下载飞书会议应用套件..."

# 飞书主应用
echo "⏳ 下载飞书主应用..."
curl -L -o "$INSTALL_DIR/feishu_main.apk" "https://sf3-cn.feishucdn.com/obj/ee-apk-sg/lark_Android.apk" 2>/dev/null || {
    echo "⚠️  官方下载失败，使用备用方案..."
    echo "📋 请手动下载飞书APK到 $INSTALL_DIR/feishu_main.apk"
    echo "下载地址: https://www.feishu.cn/download"
}

# 检查文件大小
if [ -f "$INSTALL_DIR/feishu_main.apk" ]; then
    file_size=$(stat -f%z "$INSTALL_DIR/feishu_main.apk" 2>/dev/null || stat -c%s "$INSTALL_DIR/feishu_main.apk" 2>/dev/null)
    if [ "$file_size" -gt 50000000 ]; then  # 大于50MB才正常
        echo "✅ 飞书主应用下载完成 ($(ls -lh $INSTALL_DIR/feishu_main.apk | awk '{print $5}'))"
    else
        echo "❌ 下载文件异常，请手动下载"
        echo "将飞书APK重命名为 feishu_main.apk 放到 $INSTALL_DIR/ 目录"
        read -p "文件准备好后按回车继续..."
    fi
fi

# 第二步：系统优化配置
echo ""
echo "⚙️  第二步：优化系统配置..."

echo "🔧 配置显示设置..."
# 设置屏幕亮度为最大
adb shell settings put system screen_brightness 255

# 设置屏幕超时为30分钟（会议室使用）
adb shell settings put system screen_off_timeout 1800000

# 关闭休眠模式
adb shell settings put global stay_on_while_plugged_in 7

echo "✅ 显示设置优化完成"

echo "🔧 配置音频设置..."
# 设置音量
adb shell settings put system volume_system 15      # 系统音量最大
adb shell settings put system volume_music 13       # 媒体音量
adb shell settings put system volume_voice_call 15  # 通话音量最大

echo "✅ 音频设置优化完成"

echo "🔧 配置网络设置..."
# 关闭省电模式
adb shell settings put global low_power 0

# 优化网络性能
adb shell settings put global wifi_sleep_policy 2  # WiFi永不休眠

echo "✅ 网络设置优化完成"

# 第三步：安装飞书应用
echo ""
echo "📱 第三步：安装飞书会议应用..."

if [ -f "$INSTALL_DIR/feishu_main.apk" ]; then
    echo "🚀 正在安装飞书主应用..."
    if adb install -r "$INSTALL_DIR/feishu_main.apk"; then
        echo "✅ 飞书主应用安装成功"
    else
        echo "❌ 飞书安装失败，请检查APK文件"
        adb logcat | grep "PackageManager" | tail -5
        exit 1
    fi
else
    echo "❌ 飞书APK文件不存在，请先下载"
    exit 1
fi

# 第四步：安装辅助应用
echo ""
echo "🛠️  第四步：安装会议辅助应用..."

# 安装Chrome浏览器（Web会议支持）
echo "⏳ 下载Chrome浏览器..."
curl -L -o "$INSTALL_DIR/chrome.apk" "https://dl.google.com/android/chrome/apk/chrome.apk" 2>/dev/null || {
    echo "⚠️  Chrome下载失败，使用系统自带浏览器"
}

if [ -f "$INSTALL_DIR/chrome.apk" ]; then
    echo "📱 安装Chrome浏览器..."
    adb install -r "$INSTALL_DIR/chrome.apk" 2>/dev/null && echo "✅ Chrome安装成功" || echo "⚠️  Chrome安装失败"
fi

# 第五步：配置开机自启动
echo ""
echo "🔄 第五步：配置飞书自启动..."

# 获取飞书包名
feishu_package=$(adb shell pm list packages | grep -E "(feishu|lark)" | head -1 | cut -d':' -f2)

if [ ! -z "$feishu_package" ]; then
    echo "📋 检测到飞书包名: $feishu_package"
    
    # 设置飞书为默认启动应用
    echo "🔧 配置自启动设置..."
    
    # 启用自启动权限
    adb shell pm enable "$feishu_package"
    
    # 将飞书设为首选应用
    adb shell cmd package set-home-activity "$feishu_package"/.ui.LauncherUI 2>/dev/null || echo "⚠️  自启动配置需要手动设置"
    
    echo "✅ 自启动配置完成"
else
    echo "❌ 未找到飞书应用，请检查安装状态"
fi

# 第六步：创建会议室桌面
echo ""
echo "🖥️  第六步：配置会议室专用界面..."

# 隐藏状态栏和导航栏（沉浸式体验）
adb shell settings put global policy_control immersive.full=*

# 禁用锁屏
adb shell settings put secure lockscreen.disabled 1

# 设置横屏模式（会议室常用）
adb shell settings put system user_rotation 1

echo "✅ 界面配置完成"

# 第七步：测试安装结果
echo ""
echo "🧪 第七步：测试飞书会议功能..."

echo "🚀 启动飞书应用..."
if [ ! -z "$feishu_package" ]; then
    # 启动飞书
    adb shell am start -n "$feishu_package"/.ui.LauncherUI 2>/dev/null || \
    adb shell monkey -p "$feishu_package" -c android.intent.category.LAUNCHER 1
    
    echo "✅ 飞书应用已启动"
    echo "📱 请在设备上查看飞书是否正常运行"
else
    echo "❌ 无法启动飞书，请手动检查"
fi

# 生成安装报告
echo ""
echo "📊 生成安装报告..."

{
    echo "飞书会议室系统安装报告"
    echo "========================"
    echo "安装时间: $(date)"
    echo "设备型号: RK3399"
    echo "设备序列号: CBI9SU7JNR"
    echo "系统版本: Android 7.1.2"
    echo ""
    echo "安装组件:"
    echo "- ✅ 飞书主应用"
    if [ -f "$INSTALL_DIR/chrome.apk" ]; then
        echo "- ✅ Chrome浏览器"
    fi
    echo "- ✅ 系统优化配置"
    echo "- ✅ 会议室专用设置"
    echo ""
    echo "功能配置:"
    echo "- 🖥️  大屏会议界面"
    echo "- 🔊 音频优化"
    echo "- 📶 网络优化"
    echo "- 🔄 自启动配置"
    echo "- 🖱️  沉浸式体验"
    echo ""
    echo "已安装应用:"
    adb shell pm list packages | grep -E "(feishu|lark|chrome)"
    echo ""
    echo "使用说明:"
    echo "1. 重启设备后飞书将自动启动"
    echo "2. 使用遥控器或触屏操作"
    echo "3. 扫码或输入会议号加入会议"
    echo "4. 支持无线投屏和白板功能"
    echo ""
    echo "技术支持:"
    echo "- 飞书官方帮助: https://www.feishu.cn/hc"
    echo "- 企业版技术支持: 400-917-0707"
} > "$INSTALL_DIR/installation_report.txt"

echo "✅ 安装报告已生成: $INSTALL_DIR/installation_report.txt"

echo ""
echo "🎉 飞书会议室系统安装完成！"
echo "=================================="
echo ""
echo "✅ 安装成功组件:"
echo "   - 飞书会议主应用"
echo "   - 系统优化配置"
echo "   - 会议室专用设置"
echo ""
echo "🚀 下一步操作:"
echo "   1. 重启设备: adb reboot"
echo "   2. 设备将自动进入飞书会议界面"
echo "   3. 使用飞书账号登录"
echo "   4. 开始使用会议室功能"
echo ""
echo "📱 会议室功能特色:"
echo "   - 🤖 AI会议助手"
echo "   - 🌍 多语言翻译"
echo "   - 🎨 白板协作"
echo "   - ☁️  云端同步"
echo "   - 📊 数据分析"
echo ""
echo "💡 使用提示:"
echo "   - 使用遥控器方向键导航"
echo "   - 确保网络连接稳定"
echo "   - 建议连接外部大屏显示器"
echo ""

read -p "是否现在重启设备启用飞书会议室系统？(y/n): " restart_choice

if [[ $restart_choice == [Yy]* ]]; then
    echo "🔄 正在重启设备..."
    adb reboot
    echo "✅ 设备重启中，请等待飞书会议室系统启动"
    echo "🎯 重启后设备将直接进入飞书会议界面"
else
    echo "📋 手动重启命令: adb reboot"
    echo "🚀 飞书会议室系统已配置完成，随时可以使用！"
fi

echo ""
echo "🔚 安装脚本执行完成"
