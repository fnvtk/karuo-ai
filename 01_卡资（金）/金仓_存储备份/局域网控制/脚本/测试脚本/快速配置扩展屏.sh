#!/bin/bash

# 快速配置BetterDisplay扩展屏
# 作者：卡若
# 功能：一键启动BetterDisplay和VNC服务

# 颜色定义
RED="\033[0;31m"
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
BLUE="\033[0;34m"
NC="\033[0m"

echo -e "${BLUE}=== 快速配置MacBook手机扩展屏 ===${NC}"

# 1. 启动BetterDisplay
echo -e "${BLUE}[1/4]${NC} 启动BetterDisplay..."
if [[ -d "/Applications/BetterDisplay.app" ]]; then
    open "/Applications/BetterDisplay.app"
    echo -e "${GREEN}✓${NC} BetterDisplay已启动"
else
    echo -e "${RED}✗${NC} BetterDisplay未安装"
    echo "请访问 https://github.com/waydabber/BetterDisplay 下载安装"
    exit 1
fi

# 2. 启用屏幕共享
echo -e "${BLUE}[2/4]${NC} 启用屏幕共享..."
sudo launchctl load -w /System/Library/LaunchDaemons/com.apple.screensharing.plist 2>/dev/null
echo -e "${GREEN}✓${NC} 屏幕共享已启用"

# 3. 获取IP地址
echo -e "${BLUE}[3/4]${NC} 获取网络信息..."
local_ip=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
echo -e "${GREEN}✓${NC} Mac IP地址: $local_ip"

# 4. 安装VNC到手机（如果ADB连接可用）
echo -e "${BLUE}[4/4]${NC} 检查手机连接..."
if adb devices | grep -q "192.168.2.15:5555.*device"; then
    echo -e "${GREEN}✓${NC} 手机已连接"
    
    # 检查是否已安装VNC
    if adb -s 192.168.2.15:5555 shell pm list packages | grep -q "realvnc.viewer\|iiordanov.bVNC"; then
        echo -e "${GREEN}✓${NC} VNC客户端已安装"
        # 启动VNC应用
        adb -s 192.168.2.15:5555 shell am start -a android.intent.action.MAIN -c android.intent.category.LAUNCHER -n com.realvnc.viewer.android/.app.ConnectionChooserActivity 2>/dev/null || \
        adb -s 192.168.2.15:5555 shell am start -a android.intent.action.MAIN -c android.intent.category.LAUNCHER -n com.iiordanov.bVNC/.bVNC 2>/dev/null
    else
        echo -e "${YELLOW}!${NC} 正在下载VNC客户端..."
        # 下载轻量级VNC客户端
        vnc_apk="/tmp/bvnc.apk"
        curl -L -o "$vnc_apk" "https://f-droid.org/repo/com.iiordanov.bVNC_5020000.apk" 2>/dev/null
        
        if [[ -f "$vnc_apk" ]]; then
            echo -e "${BLUE}安装VNC客户端到手机...${NC}"
            if adb -s 192.168.2.15:5555 install "$vnc_apk" 2>/dev/null; then
                echo -e "${GREEN}✓${NC} VNC客户端安装成功"
                adb -s 192.168.2.15:5555 shell am start -n com.iiordanov.bVNC/.bVNC
            else
                echo -e "${YELLOW}!${NC} VNC安装失败，请手动安装VNC客户端"
            fi
            rm -f "$vnc_apk"
        else
            echo -e "${YELLOW}!${NC} VNC下载失败，请手动安装VNC客户端"
        fi
    fi
else
    echo -e "${YELLOW}!${NC} 手机未连接，请手动安装VNC客户端"
fi

echo -e "\n${GREEN}=== 配置完成！===${NC}"
echo -e "${BLUE}使用步骤：${NC}"
echo "1. 在BetterDisplay中创建虚拟显示器（点击+号）"
echo "2. 设置分辨率（推荐1280x720）并启用"
echo "3. 在手机VNC客户端中连接："
echo "   地址: $local_ip"
echo "   端口: 5900"
echo "   用户: $(whoami)"
echo "   密码: Mac登录密码"
echo "4. 将窗口拖到虚拟显示器，手机即可显示"

echo -e "\n${YELLOW}故障排除：${NC}"
echo "- 连接失败？检查系统偏好设置>共享>屏幕共享是否启用"
echo "- 看不到画面？确保窗口在虚拟显示器上"
echo "- 延迟高？尝试降低分辨率或使用5GHz WiFi"

echo -e "\n按回车键退出..."
read