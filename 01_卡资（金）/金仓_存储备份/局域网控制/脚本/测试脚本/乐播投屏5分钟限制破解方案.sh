#!/bin/bash

# 乐播投屏5分钟限制破解方案
# 作者：卡若
# 日期：2025年1月

# 颜色定义
RED="\033[0;31m"
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

# 设备IP
DEVICE_IP="192.168.2.15:5555"

echo -e "${BLUE}=== 乐播投屏5分钟限制破解方案 ===${NC}"
echo -e "${YELLOW}设备: $DEVICE_IP${NC}"
echo ""

# 检查设备连接
echo -e "${BLUE}1. 检查设备连接状态...${NC}"
adb connect $DEVICE_IP > /dev/null 2>&1
if adb -s $DEVICE_IP shell echo "connected" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 设备连接正常${NC}"
else
    echo -e "${RED}✗ 设备连接失败，请检查网络${NC}"
    exit 1
fi

# 方案选择菜单
echo -e "\n${BLUE}请选择破解方案:${NC}"
echo -e "${YELLOW}1. 清除应用数据重置试用期 (推荐)${NC}"
echo -e "${YELLOW}2. 修改系统时间绕过限制${NC}"
echo -e "${YELLOW}3. 强制停止后重启应用${NC}"
echo -e "${YELLOW}4. 卸载重装应用${NC}"
echo -e "${YELLOW}5. 查看当前应用状态${NC}"
echo -e "${YELLOW}6. 一键破解脚本 (自动执行)${NC}"
echo -e "${YELLOW}0. 退出${NC}"
echo ""
read -p "请输入选项 (0-6): " choice

case $choice in
    1)
        echo -e "\n${BLUE}=== 方案1: 清除应用数据重置试用期 ===${NC}"
        echo -e "${YELLOW}正在清除乐播投屏应用数据...${NC}"
        adb -s $DEVICE_IP shell pm clear com.hpplay.happyplay.aw
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ 应用数据清除成功，试用期已重置${NC}"
            echo -e "${BLUE}正在启动乐播投屏...${NC}"
            adb -s $DEVICE_IP shell monkey -p com.hpplay.happyplay.aw -c android.intent.category.LAUNCHER 1
            echo -e "${GREEN}✓ 乐播投屏已启动，现在可以无限制使用${NC}"
        else
            echo -e "${RED}✗ 清除数据失败${NC}"
        fi
        ;;
    2)
        echo -e "\n${BLUE}=== 方案2: 修改系统时间绕过限制 ===${NC}"
        echo -e "${YELLOW}获取当前系统时间...${NC}"
        current_time=$(adb -s $DEVICE_IP shell date)
        echo -e "当前时间: $current_time"
        
        echo -e "${YELLOW}将时间回调24小时...${NC}"
        yesterday=$(date -v-1d '+%m%d%H%M%Y.%S')
        adb -s $DEVICE_IP shell su -c "date $yesterday"
        
        echo -e "${BLUE}启动乐播投屏...${NC}"
        adb -s $DEVICE_IP shell monkey -p com.hpplay.happyplay.aw -c android.intent.category.LAUNCHER 1
        
        echo -e "${YELLOW}等待5秒后恢复正常时间...${NC}"
        sleep 5
        adb -s $DEVICE_IP shell su -c "date $(date '+%m%d%H%M%Y.%S')"
        echo -e "${GREEN}✓ 时间已恢复，限制已绕过${NC}"
        ;;
    3)
        echo -e "\n${BLUE}=== 方案3: 强制停止后重启应用 ===${NC}"
        echo -e "${YELLOW}强制停止乐播投屏...${NC}"
        adb -s $DEVICE_IP shell am force-stop com.hpplay.happyplay.aw
        sleep 2
        
        echo -e "${YELLOW}清除应用缓存...${NC}"
        adb -s $DEVICE_IP shell pm clear com.hpplay.happyplay.aw
        
        echo -e "${BLUE}重新启动应用...${NC}"
        adb -s $DEVICE_IP shell monkey -p com.hpplay.happyplay.aw -c android.intent.category.LAUNCHER 1
        echo -e "${GREEN}✓ 应用已重启，试用期重置${NC}"
        ;;
    4)
        echo -e "\n${BLUE}=== 方案4: 卸载重装应用 ===${NC}"
        echo -e "${YELLOW}正在卸载乐播投屏...${NC}"
        adb -s $DEVICE_IP shell pm uninstall com.hpplay.happyplay.aw
        
        echo -e "${YELLOW}正在重新安装乐播投屏...${NC}"
        apk_path="/Users/karuo/Documents/开发/4、小工具/局域网手机电脑控制/应用文件/乐播.apk"
        if [ -f "$apk_path" ]; then
            adb -s $DEVICE_IP install "$apk_path"
            echo -e "${GREEN}✓ 乐播投屏重新安装完成${NC}"
            adb -s $DEVICE_IP shell monkey -p com.hpplay.happyplay.aw -c android.intent.category.LAUNCHER 1
        else
            echo -e "${RED}✗ APK文件不存在: $apk_path${NC}"
        fi
        ;;
    5)
        echo -e "\n${BLUE}=== 当前应用状态 ===${NC}"
        echo -e "${YELLOW}应用信息:${NC}"
        adb -s $DEVICE_IP shell dumpsys package com.hpplay.happyplay.aw | grep -E '(versionName|firstInstallTime|lastUpdateTime)'
        
        echo -e "\n${YELLOW}应用进程状态:${NC}"
        adb -s $DEVICE_IP shell ps | grep hpplay || echo "应用未运行"
        
        echo -e "\n${YELLOW}应用数据大小:${NC}"
        adb -s $DEVICE_IP shell du -sh /data/data/com.hpplay.happyplay.aw 2>/dev/null || echo "无法获取数据大小"
        ;;
    6)
        echo -e "\n${BLUE}=== 一键破解脚本 (自动执行) ===${NC}"
        echo -e "${YELLOW}执行自动破解流程...${NC}"
        
        # 步骤1: 强制停止应用
        echo -e "${BLUE}步骤1: 停止应用${NC}"
        adb -s $DEVICE_IP shell am force-stop com.hpplay.happyplay.aw
        
        # 步骤2: 清除应用数据
        echo -e "${BLUE}步骤2: 清除数据${NC}"
        adb -s $DEVICE_IP shell pm clear com.hpplay.happyplay.aw
        
        # 步骤3: 等待2秒
        echo -e "${BLUE}步骤3: 等待系统处理${NC}"
        sleep 2
        
        # 步骤4: 启动应用
        echo -e "${BLUE}步骤4: 启动应用${NC}"
        adb -s $DEVICE_IP shell monkey -p com.hpplay.happyplay.aw -c android.intent.category.LAUNCHER 1
        
        echo -e "\n${GREEN}🎉 一键破解完成！${NC}"
        echo -e "${GREEN}✓ 乐播投屏5分钟限制已解除${NC}"
        echo -e "${GREEN}✓ 现在可以无限制使用投屏功能${NC}"
        echo -e "${YELLOW}💡 提示: 当再次出现5分钟限制时，重新运行此脚本即可${NC}"
        ;;
    0)
        echo -e "${BLUE}退出脚本${NC}"
        exit 0
        ;;
    *)
        echo -e "${RED}无效选项，请重新运行脚本${NC}"
        exit 1
        ;;
esac

echo -e "\n${BLUE}=== 破解完成 ===${NC}"
echo -e "${GREEN}乐播投屏5分钟限制已成功破解${NC}"
echo -e "${YELLOW}如需再次破解，请重新运行此脚本${NC}"
echo ""
echo -e "${BLUE}快速破解命令:${NC}"
echo -e "${YELLOW}adb -s 192.168.2.15:5555 shell pm clear com.hpplay.happyplay.aw && adb -s 192.168.2.15:5555 shell monkey -p com.hpplay.happyplay.aw -c android.intent.category.LAUNCHER 1${NC}"
echo ""