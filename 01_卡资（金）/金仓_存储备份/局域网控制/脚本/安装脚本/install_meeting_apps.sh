#!/system/bin/sh
# 会议应用自动安装脚本

echo "安装会议应用套件..."

# 设置系统为会议优化模式
settings put system screen_brightness 255
settings put system screen_off_timeout 0
settings put system user_rotation 1
settings put system volume_system 15

# 启用开发者选项中的有用功能
settings put global stay_on_while_plugged_in 7
settings put global wifi_sleep_policy 2

echo "会议系统配置完成"
