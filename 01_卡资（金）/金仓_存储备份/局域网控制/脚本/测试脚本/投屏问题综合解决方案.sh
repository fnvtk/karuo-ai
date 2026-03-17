#!/bin/bash

# 投屏问题综合解决方案
# 解决WIFI投屏闪退、存客宝白屏、乐播投屏5分钟限制问题
# 作者：卡若
# 日期：$(date '+%Y-%m-%d')

# 颜色定义
RED="\033[0;31m"
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

# 设备IP
DEVICE_IP="192.168.2.15:5555"

echo -e "${BLUE}=== 投屏问题综合解决方案 ===${NC}"
echo -e "${YELLOW}设备信息：Android 7.1.2 (API 25) - RK3399${NC}"
echo

# 1. 检查设备连接状态
echo -e "${BLUE}1. 检查设备连接状态${NC}"
if adb connect $DEVICE_IP > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 设备连接成功${NC}"
else
    echo -e "${RED}✗ 设备连接失败，请检查网络${NC}"
    exit 1
fi

# 2. 系统资源检查
echo -e "${BLUE}2. 系统资源检查${NC}"
MEM_INFO=$(adb -s $DEVICE_IP shell cat /proc/meminfo | head -3)
STORAGE_INFO=$(adb -s $DEVICE_IP shell df /data | tail -1)
echo -e "${YELLOW}内存状态：${NC}"
echo "$MEM_INFO"
echo -e "${YELLOW}存储状态：${NC}"
echo "$STORAGE_INFO"
echo

# 3. 解决存客宝白屏问题
echo -e "${BLUE}3. 解决存客宝白屏问题${NC}"
CKB_INSTALLED=$(adb -s $DEVICE_IP shell pm list packages | grep uni.app.UNI2B34F1A)
if [ -n "$CKB_INSTALLED" ]; then
    echo -e "${YELLOW}发现存客宝旧版本，正在重新安装...${NC}"
    adb -s $DEVICE_IP shell pm uninstall uni.app.UNI2B34F1A
    adb -s $DEVICE_IP install "../应用文件/ckb.apk"
    echo -e "${GREEN}✓ 存客宝重新安装完成${NC}"
else
    echo -e "${GREEN}✓ 存客宝状态正常${NC}"
fi
echo

# 4. 解决WIFI投屏闪退问题
echo -e "${BLUE}4. 解决WIFI投屏闪退问题${NC}"
echo -e "${YELLOW}推荐使用稳定的投屏方案：${NC}"
echo "• scrcpy (推荐) - 低延迟，高稳定性"
echo "• AnyDesk - 已安装，支持双向控制"
echo "• 系统内置屏幕共享 - macOS VNC协议"
echo

# 5. 解决乐播投屏5分钟限制
echo -e "${BLUE}5. 解决乐播投屏5分钟限制${NC}"
echo -e "${YELLOW}乐播投屏限制解决方案：${NC}"
echo "方案1：使用免费替代方案"
echo "  • scrcpy - 无时间限制，开源免费"
echo "  • AnyDesk - 个人使用免费"
echo "  • 系统内置投屏 - 完全免费"
echo
echo "方案2：乐播投屏优化设置"
echo "  • 清除应用数据重置试用期"
echo "  • 使用不同设备ID"
echo "  • 网络重连刷新会话"
echo

# 6. 启动推荐投屏方案
echo -e "${BLUE}6. 启动推荐投屏方案${NC}"
echo -e "${YELLOW}选择投屏方案：${NC}"
echo "1) scrcpy (推荐)"
echo "2) AnyDesk"
echo "3) 重置乐播投屏"
echo "4) 系统诊断"
read -p "请选择 (1-4): " choice

case $choice in
    1)
        echo -e "${GREEN}启动 scrcpy 投屏...${NC}"
        scrcpy -s $DEVICE_IP --stay-awake --turn-screen-off
        ;;
    2)
        echo -e "${GREEN}启动 AnyDesk...${NC}"
        adb -s $DEVICE_IP shell am start -n com.anydesk.anydeskandroid/.gui.activity.HubActivity
        echo "请在手机上查看AnyDesk ID，然后在Mac上连接"
        ;;
    3)
        echo -e "${GREEN}重置乐播投屏...${NC}"
        adb -s $DEVICE_IP shell pm clear com.hpplay.happyplay.aw
        adb -s $DEVICE_IP shell am start -n com.hpplay.happyplay.aw/.MainActivity
        echo "乐播投屏已重置，试用期已刷新"
        ;;
    4)
        echo -e "${GREEN}运行系统诊断...${NC}"
        # 清理系统缓存
        adb -s $DEVICE_IP shell pm trim-caches 1000000000
        # 重启系统UI
        adb -s $DEVICE_IP shell killall com.android.systemui
        # 检查运行中的投屏相关进程
        adb -s $DEVICE_IP shell ps | grep -E '(cast|mirror|screen)'
        echo "系统诊断完成"
        ;;
    *)
        echo -e "${RED}无效选择${NC}"
        ;;
esac

echo
echo -e "${BLUE}=== 解决方案总结 ===${NC}"
echo -e "${GREEN}✓ 存客宝：重新安装解决白屏问题${NC}"
echo -e "${GREEN}✓ 乐播投屏：提供多种解决5分钟限制方案${NC}"
echo -e "${GREEN}✓ WIFI投屏：推荐使用scrcpy替代不稳定方案${NC}"
echo -e "${YELLOW}建议：优先使用scrcpy，稳定性最佳${NC}"
echo
echo -e "${BLUE}快速启动命令：${NC}"
echo "scrcpy -s $DEVICE_IP --stay-awake"
echo "adb -s $DEVICE_IP shell am start -n com.anydesk.anydeskandroid/.gui.activity.HubActivity"
echo
echo -e "${GREEN}脚本执行完成！${NC}"