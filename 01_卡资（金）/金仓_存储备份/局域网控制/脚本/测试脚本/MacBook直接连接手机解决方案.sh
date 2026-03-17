#!/bin/bash

# MacBook直接连接手机解决方案
# 创建时间: $(date '+%Y-%m-%d %H:%M:%S')
# 设备信息: 192.168.2.15 (RK3399, Android 7.1.2)

# 颜色定义
RED="\033[0;31m"
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

echo -e "${BLUE}=== MacBook直接连接手机解决方案 ===${NC}"
echo -e "${YELLOW}设备: 192.168.2.15 (RK3399, Android 7.1.2)${NC}"
echo ""

# 方案1: AnyDesk远程连接
echo -e "${GREEN}方案1: AnyDesk远程连接 (推荐)${NC}"
echo "手机端: AnyDesk已安装并启动"
echo "MacBook端操作:"
echo "1. 下载AnyDesk for macOS"
echo "   官网: https://anydesk.com/en/downloads/mac-os"
echo "2. 安装后启动AnyDesk"
echo "3. 在手机AnyDesk中查看设备ID"
echo "4. 在MacBook AnyDesk中输入手机设备ID连接"
echo ""

# 检查并下载AnyDesk
if [ ! -d "/Applications/AnyDesk.app" ]; then
    echo -e "${YELLOW}正在下载AnyDesk for macOS...${NC}"
    cd ~/Downloads
    curl -L -o "AnyDesk-macOS.dmg" "https://download.anydesk.com/anydesk.dmg"
    
    if [ -f "AnyDesk-macOS.dmg" ]; then
        echo -e "${GREEN}AnyDesk下载完成，请手动安装:${NC}"
        echo "1. 双击 ~/Downloads/AnyDesk-macOS.dmg"
        echo "2. 将AnyDesk拖拽到Applications文件夹"
        echo "3. 启动AnyDesk并输入手机设备ID"
        open ~/Downloads/AnyDesk-macOS.dmg
    else
        echo -e "${RED}AnyDesk下载失败，请手动访问官网下载${NC}"
    fi
else
    echo -e "${GREEN}AnyDesk已安装，正在启动...${NC}"
    open -a AnyDesk
fi

echo ""
echo -e "${GREEN}方案2: VNC连接 (备选)${NC}"
echo "手机端需要安装VNC服务器应用"
echo "MacBook端可使用内置屏幕共享或第三方VNC客户端"
echo ""

# 方案3: scrcpy投屏
echo -e "${GREEN}方案3: scrcpy投屏控制${NC}"
echo "通过USB或WiFi投屏并控制手机"
if ! command -v scrcpy &> /dev/null; then
    echo -e "${YELLOW}scrcpy未安装，正在通过Homebrew安装...${NC}"
    if command -v brew &> /dev/null; then
        brew install scrcpy
        echo -e "${GREEN}scrcpy安装完成${NC}"
    else
        echo -e "${RED}请先安装Homebrew: /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\"${NC}"
    fi
else
    echo -e "${GREEN}scrcpy已安装${NC}"
fi

echo ""
echo -e "${GREEN}启动scrcpy连接:${NC}"
echo "scrcpy -s 192.168.2.15:5555"
echo ""

# 方案4: 浏览器远程控制
echo -e "${GREEN}方案4: 浏览器远程控制${NC}"
echo "通过ADB端口转发实现浏览器控制"
echo "adb -s 192.168.2.15:5555 forward tcp:8080 tcp:8080"
echo "然后在浏览器访问: http://localhost:8080"
echo ""

# 网络信息
echo -e "${BLUE}=== 网络连接信息 ===${NC}"
echo "设备IP: 192.168.2.15"
echo "ADB端口: 5555"
echo "本机IP: $(ifconfig | grep 'inet ' | grep -v 127.0.0.1 | head -1 | awk '{print $2}')"
echo ""

# 连接测试
echo -e "${BLUE}=== 连接状态检查 ===${NC}"
if ping -c 1 192.168.2.15 &> /dev/null; then
    echo -e "${GREEN}✓ 设备网络连接正常${NC}"
else
    echo -e "${RED}✗ 设备网络连接失败${NC}"
fi

if adb devices | grep -q "192.168.2.15:5555"; then
    echo -e "${GREEN}✓ ADB连接正常${NC}"
else
    echo -e "${RED}✗ ADB连接失败${NC}"
fi

echo ""
echo -e "${YELLOW}=== 使用建议 ===${NC}"
echo "1. 优先使用AnyDesk，稳定性最好"
echo "2. scrcpy适合临时投屏控制"
echo "3. VNC适合长期远程管理"
echo "4. 浏览器控制适合轻量级操作"
echo ""
echo -e "${GREEN}解决方案配置完成！${NC}"

# 创建快速连接脚本
cat > ~/Desktop/连接手机192.168.2.15.sh << 'EOF'
#!/bin/bash
echo "正在连接手机 192.168.2.15..."
if command -v scrcpy &> /dev/null; then
    scrcpy -s 192.168.2.15:5555
else
    echo "请先安装scrcpy或使用AnyDesk连接"
    if [ -d "/Applications/AnyDesk.app" ]; then
        open -a AnyDesk
    fi
fi
EOF

chmod +x ~/Desktop/连接手机192.168.2.15.sh
echo -e "${GREEN}已创建桌面快捷连接脚本: ~/Desktop/连接手机192.168.2.15.sh${NC}"