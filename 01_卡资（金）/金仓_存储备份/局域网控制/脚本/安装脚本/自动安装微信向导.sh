#!/bin/bash

# 自动安装微信向导（设备端下载 + ADB自动安装）
# 适配设备：192.168.2.2:5555 (Android 7.1.2 / RK3399)

set -e

DEVICE_IP="192.168.2.2:5555"
APK_PATH_DEVICE="/sdcard/Download/wechat_latest.apk"

red() { echo "\033[31m$1\033[0m"; }
green() { echo "\033[32m$1\033[0m"; }
yellow() { echo "\033[33m$1\033[0m"; }

echo "📱 自动安装微信向导"

# 1) 校验连接
if ! adb devices | grep -q "$DEVICE_IP.*device"; then
  echo "尝试连接设备..."
  adb connect $DEVICE_IP | cat
  sleep 2
fi
adb devices | cat

# 2) 打开浏览器到下载页（APKPure和官网二选一）
echo "在设备上打开下载页面..."
adb shell am start -a android.intent.action.VIEW -d "https://apkpure.com/cn/wechat/com.tencent.mm" | cat || true
sleep 2
adb shell am start -a android.intent.action.VIEW -d "https://weixin.qq.com/" | cat || true

# 3) 尝试开启未知来源（旧版系统全局开关）
echo "尝试开启未知来源安装..."
adb shell settings put secure install_non_market_apps 1 | cat || true

# 4) 轮询Download目录，发现APK后自动安装
echo "等待你在设备浏览器完成下载...（将自动检测 /sdcard/Download/wechat_latest.apk）"

# 提示用户把APK重命名为 wechat_latest.apk
adb shell 'echo 请将下载的APK重命名为 wechat_latest.apk 并保存在“下载”文件夹' | cat || true

for i in $(seq 1 60); do
  size=$(adb shell ls -l "$APK_PATH_DEVICE" 2>/dev/null | awk '{print $5}')
  if [ -n "$size" ] && [ "$size" -gt 50000000 ] 2>/dev/null; then
    echo "检测到APK (大小: $size 字节)，开始安装..."
    # 直接从设备路径安装
    adb shell pm install -r "$APK_PATH_DEVICE" | cat && {
      green "✅ 安装完成"
      echo "尝试启动微信..."
      adb shell am start -n com.tencent.mm/.ui.LauncherUI | cat || true
      exit 0
    }
  fi
  echo "第$i/60 次检查，尚未发现有效APK，继续等待..."
  sleep 10
done

yellow "未在60次轮询内检测到APK。你也可以："
echo "1) 把APK下载到电脑: wechat_install/wechat_latest.apk"
echo "2) 运行: adb install -r wechat_install/wechat_latest.apk"
