#!/bin/bash

# 乐播投屏5分钟限制高级破解方案
# 作者：卡若
# 版本：2.0
# 更新时间：2025年1月

# 颜色定义
RED="\033[0;31m"
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

# 设备IP
DEVICE_IP="192.168.2.15:5555"
PACKAGE_NAME="com.hpplay.happyplay.aw"

echo -e "${BLUE}=== 乐播投屏5分钟限制高级破解方案 ===${NC}"
echo -e "${YELLOW}设备: $DEVICE_IP${NC}"
echo -e "${YELLOW}应用: 乐播投屏 v8.19.36${NC}"
echo ""

# 检查设备连接
echo -e "${BLUE}检查设备连接...${NC}"
adb connect $DEVICE_IP > /dev/null 2>&1
if ! adb -s $DEVICE_IP shell echo "connected" > /dev/null 2>&1; then
    echo -e "${RED}❌ 设备连接失败！请检查设备IP和ADB调试设置${NC}"
    exit 1
fi
echo -e "${GREEN}✅ 设备连接成功${NC}"
echo ""

# 破解方案菜单
echo -e "${BLUE}请选择破解方案：${NC}"
echo -e "${YELLOW}1.${NC} 🔄 标准破解 (清除数据+重启)"
echo -e "${YELLOW}2.${NC} ⏰ 时间欺骗破解 (修改系统时间)"
echo -e "${YELLOW}3.${NC} 🗂️  深度清理破解 (清除所有相关文件)"
echo -e "${YELLOW}4.${NC} 🔧 权限重置破解 (重置应用权限)"
echo -e "${YELLOW}5.${NC} 📱 系统级破解 (修改系统属性)"
echo -e "${YELLOW}6.${NC} 🚀 终极破解 (组合所有方法)"
echo -e "${YELLOW}7.${NC} 📊 查看当前状态"
echo -e "${YELLOW}8.${NC} 🔍 检测破解效果"
echo -e "${YELLOW}0.${NC} 退出"
echo ""
read -p "请输入选项 (0-8): " choice

case $choice in
    1)
        echo -e "${BLUE}执行标准破解...${NC}"
        adb -s $DEVICE_IP shell am force-stop $PACKAGE_NAME
        adb -s $DEVICE_IP shell pm clear $PACKAGE_NAME
        sleep 2
        adb -s $DEVICE_IP shell pm enable $PACKAGE_NAME
        adb -s $DEVICE_IP shell monkey -p $PACKAGE_NAME -c android.intent.category.LAUNCHER 1
        echo -e "${GREEN}✅ 标准破解完成${NC}"
        ;;
    2)
        echo -e "${BLUE}执行时间欺骗破解...${NC}"
        # 获取当前时间并回退1小时
        current_time=$(date +"%m%d%H%M%Y.%S")
        past_time=$(date -d "1 hour ago" +"%m%d%H%M%Y.%S" 2>/dev/null || date -v-1H +"%m%d%H%M%Y.%S")
        
        adb -s $DEVICE_IP shell am force-stop $PACKAGE_NAME
        adb -s $DEVICE_IP shell "date $past_time"
        sleep 1
        adb -s $DEVICE_IP shell monkey -p $PACKAGE_NAME -c android.intent.category.LAUNCHER 1
        sleep 3
        adb -s $DEVICE_IP shell am force-stop $PACKAGE_NAME
        adb -s $DEVICE_IP shell "date $current_time"
        echo -e "${GREEN}✅ 时间欺骗破解完成${NC}"
        ;;
    3)
        echo -e "${BLUE}执行深度清理破解...${NC}"
        adb -s $DEVICE_IP shell am force-stop $PACKAGE_NAME
        adb -s $DEVICE_IP shell pm clear $PACKAGE_NAME
        # 清理可能的缓存文件
        adb -s $DEVICE_IP shell "rm -rf /sdcard/Android/data/$PACKAGE_NAME/"
        adb -s $DEVICE_IP shell "rm -rf /data/data/$PACKAGE_NAME/"
        adb -s $DEVICE_IP shell "rm -rf /sdcard/.hpplay*"
        adb -s $DEVICE_IP shell "rm -rf /sdcard/hpplay*"
        sleep 2
        adb -s $DEVICE_IP shell pm enable $PACKAGE_NAME
        adb -s $DEVICE_IP shell monkey -p $PACKAGE_NAME -c android.intent.category.LAUNCHER 1
        echo -e "${GREEN}✅ 深度清理破解完成${NC}"
        ;;
    4)
        echo -e "${BLUE}执行权限重置破解...${NC}"
        adb -s $DEVICE_IP shell am force-stop $PACKAGE_NAME
        # 重置所有权限
        adb -s $DEVICE_IP shell "pm reset-permissions $PACKAGE_NAME"
        adb -s $DEVICE_IP shell pm clear $PACKAGE_NAME
        # 重新授予必要权限
        adb -s $DEVICE_IP shell "pm grant $PACKAGE_NAME android.permission.WRITE_EXTERNAL_STORAGE"
        adb -s $DEVICE_IP shell "pm grant $PACKAGE_NAME android.permission.READ_EXTERNAL_STORAGE"
        sleep 2
        adb -s $DEVICE_IP shell pm enable $PACKAGE_NAME
        adb -s $DEVICE_IP shell monkey -p $PACKAGE_NAME -c android.intent.category.LAUNCHER 1
        echo -e "${GREEN}✅ 权限重置破解完成${NC}"
        ;;
    5)
        echo -e "${BLUE}执行系统级破解...${NC}"
        adb -s $DEVICE_IP shell am force-stop $PACKAGE_NAME
        # 修改系统属性（需要root权限）
        adb -s $DEVICE_IP shell "setprop debug.hwui.render_dirty_regions false"
        adb -s $DEVICE_IP shell "setprop debug.composition.type gpu"
        adb -s $DEVICE_IP shell pm clear $PACKAGE_NAME
        sleep 2
        adb -s $DEVICE_IP shell pm enable $PACKAGE_NAME
        adb -s $DEVICE_IP shell monkey -p $PACKAGE_NAME -c android.intent.category.LAUNCHER 1
        echo -e "${GREEN}✅ 系统级破解完成${NC}"
        ;;
    6)
        echo -e "${BLUE}执行终极破解 (组合所有方法)...${NC}"
        echo -e "${YELLOW}步骤1: 强制停止应用${NC}"
        adb -s $DEVICE_IP shell am force-stop $PACKAGE_NAME
        
        echo -e "${YELLOW}步骤2: 深度清理数据${NC}"
        adb -s $DEVICE_IP shell pm clear $PACKAGE_NAME
        adb -s $DEVICE_IP shell "rm -rf /sdcard/Android/data/$PACKAGE_NAME/"
        adb -s $DEVICE_IP shell "rm -rf /sdcard/.hpplay*"
        
        echo -e "${YELLOW}步骤3: 重置权限${NC}"
        adb -s $DEVICE_IP shell "pm reset-permissions $PACKAGE_NAME"
        
        echo -e "${YELLOW}步骤4: 时间回退${NC}"
        past_time=$(date -d "2 hours ago" +"%m%d%H%M%Y.%S" 2>/dev/null || date -v-2H +"%m%d%H%M%Y.%S")
        adb -s $DEVICE_IP shell "date $past_time"
        
        echo -e "${YELLOW}步骤5: 重新启用应用${NC}"
        adb -s $DEVICE_IP shell pm enable $PACKAGE_NAME
        
        echo -e "${YELLOW}步骤6: 启动应用${NC}"
        adb -s $DEVICE_IP shell monkey -p $PACKAGE_NAME -c android.intent.category.LAUNCHER 1
        
        sleep 5
        
        echo -e "${YELLOW}步骤7: 恢复系统时间${NC}"
        current_time=$(date +"%m%d%H%M%Y.%S")
        adb -s $DEVICE_IP shell "date $current_time"
        
        echo -e "${GREEN}🚀 终极破解完成！应用已重置为全新状态${NC}"
        ;;
    7)
        echo -e "${BLUE}查看当前状态...${NC}"
        echo -e "${YELLOW}应用信息:${NC}"
        adb -s $DEVICE_IP shell dumpsys package $PACKAGE_NAME | grep -E '(versionName|firstInstallTime|lastUpdateTime|enabled)'
        echo ""
        echo -e "${YELLOW}应用进程:${NC}"
        adb -s $DEVICE_IP shell "ps | grep hpplay || echo '应用未运行'"
        echo ""
        echo -e "${YELLOW}存储使用:${NC}"
        adb -s $DEVICE_IP shell "du -sh /data/data/$PACKAGE_NAME 2>/dev/null || echo '无数据目录'"
        ;;
    8)
        echo -e "${BLUE}检测破解效果...${NC}"
        echo -e "${YELLOW}启动乐播投屏进行测试...${NC}"
        adb -s $DEVICE_IP shell monkey -p $PACKAGE_NAME -c android.intent.category.LAUNCHER 1
        echo ""
        echo -e "${GREEN}✅ 请在设备上查看乐播投屏是否显示试用期重置${NC}"
        echo -e "${BLUE}💡 如果仍有5分钟限制，请尝试其他破解方案${NC}"
        ;;
    0)
        echo -e "${BLUE}退出破解工具${NC}"
        exit 0
        ;;
    *)
        echo -e "${RED}❌ 无效选项，请重新运行脚本${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${BLUE}=== 破解完成 ===${NC}"
echo -e "${GREEN}💡 使用提示：${NC}"
echo -e "${YELLOW}1. 如果破解失败，可尝试其他方案${NC}"
echo -e "${YELLOW}2. 建议定期运行快速破解脚本${NC}"
echo -e "${YELLOW}3. 终极破解方案成功率最高${NC}"
echo -e "${YELLOW}4. 如需帮助，联系微信：28533368${NC}"
echo ""