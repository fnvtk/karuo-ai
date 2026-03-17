#!/bin/bash

# 乐播投屏5分钟限制快速破解脚本
# 作者：卡若
# 使用方法：直接运行此脚本即可破解5分钟限制

# 颜色定义
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
BLUE="\033[0;34m"
NC="\033[0m"

# 设备IP
DEVICE_IP="192.168.2.15:5555"

echo -e "${BLUE}🚀 乐播投屏5分钟限制快速破解${NC}"
echo -e "${YELLOW}设备: $DEVICE_IP${NC}"
echo ""

# 检查设备连接
echo -e "${BLUE}检查设备连接...${NC}"
if adb -s $DEVICE_IP shell echo "connected" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 设备连接正常${NC}"
else
    echo -e "连接设备..."
    adb connect $DEVICE_IP > /dev/null 2>&1
    if adb -s $DEVICE_IP shell echo "connected" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ 设备连接成功${NC}"
    else
        echo -e "❌ 设备连接失败，请检查网络"
        exit 1
    fi
fi

# 执行破解
echo -e "${BLUE}正在破解乐播投屏5分钟限制...${NC}"

# 步骤1: 强制停止应用
echo -e "${YELLOW}1. 停止乐播投屏应用${NC}"
adb -s $DEVICE_IP shell am force-stop com.hpplay.happyplay.aw

# 步骤2: 清除应用数据（重置试用期）
echo -e "${YELLOW}2. 清除应用数据重置试用期${NC}"
adb -s $DEVICE_IP shell pm clear com.hpplay.happyplay.aw

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 应用数据清除成功${NC}"
else
    echo -e "❌ 清除数据失败"
    exit 1
fi

# 步骤3: 等待系统处理
echo -e "${YELLOW}3. 等待系统处理...${NC}"
sleep 2

# 步骤4: 启动应用
echo -e "${YELLOW}4. 启动乐播投屏${NC}"
adb -s $DEVICE_IP shell monkey -p com.hpplay.happyplay.aw -c android.intent.category.LAUNCHER 1 > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 乐播投屏已启动${NC}"
else
    echo -e "❌ 启动失败"
fi

echo ""
echo -e "${GREEN}🎉 破解完成！${NC}"
echo -e "${GREEN}✅ 乐播投屏5分钟限制已解除${NC}"
echo -e "${GREEN}✅ 现在可以无限制使用投屏功能${NC}"
echo ""
echo -e "${BLUE}💡 使用提示：${NC}"
echo -e "${YELLOW}• 当再次出现5分钟限制时，重新运行此脚本即可${NC}"
echo -e "${YELLOW}• 或者直接运行命令：${NC}"
echo -e "${BLUE}  adb -s 192.168.2.15:5555 shell pm clear com.hpplay.happyplay.aw${NC}"
echo ""
echo -e "${BLUE}📱 投屏方式：${NC}"
echo -e "${YELLOW}1. 手机和设备连接同一WiFi${NC}"
echo -e "${YELLOW}2. 打开手机乐播投屏APP${NC}"
echo -e "${YELLOW}3. 搜索并连接设备进行投屏${NC}"
echo ""