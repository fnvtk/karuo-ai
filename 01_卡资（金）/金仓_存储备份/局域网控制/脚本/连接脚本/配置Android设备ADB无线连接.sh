#!/bin/bash

# 配置Android设备ADB无线连接脚本
# 作者: 卡若
# 版本: 1.0.0
# 功能: 引导用户配置Android设备的ADB无线连接

# 颜色定义
RED="\033[0;31m"
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}[信息]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[成功]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[警告]${NC} $1"
}

print_error() {
    echo -e "${RED}[错误]${NC} $1"
}

print_step() {
    echo -e "\n${BLUE}[进度]${NC} $1"
    echo "----------------------------------------"
}

# 检查ADB是否安装
check_adb() {
    print_step "检查ADB工具"
    
    if ! command -v adb &> /dev/null; then
        print_error "未找到ADB工具，请先安装ADB"
        exit 1
    fi
    
    print_success "ADB工具检查完成"
}

# 检查设备连接状态
check_device_connection() {
    print_step "检查设备连接状态"
    
    local device_ip=$1
    
    # 检查设备是否在线
    print_info "正在检查设备 ${device_ip} 是否在线..."
    if ping -c 3 -W 2 "$device_ip" &> /dev/null; then
        print_success "设备 ${device_ip} 在线"
        
        # 尝试连接常用端口
        local ports=("5555" "5037" "4444" "5556" "6666" "7777")
        local connected=false
        
        for port in "${ports[@]}"; do
            print_info "尝试连接端口 ${port}..."
            if adb connect "${device_ip}:${port}" 2>&1 | grep -q "connected"; then
                print_success "成功连接到设备 ${device_ip}:${port}"
                connected=true
                break
            else
                print_warning "连接端口 ${port} 失败"
            fi
        done
        
        if [ "$connected" = false ]; then
            print_warning "所有常用端口连接失败，设备可能未配置ADB无线调试"
            return 1
        else
            return 0
        fi
    else
        print_error "设备 ${device_ip} 不在线或无法访问"
        return 2
    fi
}

# 显示配置指南
show_setup_guide() {
    print_step "Android设备ADB无线连接配置指南"
    
    cat << EOF
请按照以下步骤在您的Android设备上配置ADB无线调试：

步骤1：开启开发者选项
1. 打开【设置】→【关于手机】
2. 连续点击【版本号】7次
3. 输入锁屏密码确认
4. 看到"您现在处于开发者模式"提示

步骤2：启用USB调试
1. 返回【设置】→【系统】→【开发者选项】
2. 开启【USB调试】开关
3. 弹出确认对话框，点击【确定】

步骤3：开启无线ADB调试
1. 在【开发者选项】中找到【无线调试】
2. 开启【无线调试】开关
3. 记录显示的【IP地址和端口】（如：192.168.2.15:5555）

步骤4：通过USB首次配置（如果无线连接失败）
1. 使用USB线连接设备到电脑
2. 在设备上允许USB调试授权
3. 在电脑上运行：adb tcpip 5555
4. 断开USB线
5. 运行：adb connect 设备IP:5555

完成上述步骤后，请重新运行此脚本尝试连接。
EOF
}

# 主函数
main() {
    clear
    echo "🚀 Android设备ADB无线连接配置工具"
    echo "作者: 卡若 | 版本: 1.0.0"
    echo "功能: 引导用户配置Android设备的ADB无线连接"
    echo "=======================================\n"
    
    # 检查ADB
    check_adb
    
    # 获取设备IP
    read -p "请输入Android设备IP地址 (默认: 192.168.2.15): " device_ip
    device_ip=${device_ip:-"192.168.2.15"}
    
    # 检查设备连接
    if check_device_connection "$device_ip"; then
        print_success "设备已成功连接，可以继续安装VNC客户端"
        print_info "请运行 ./安装VNC客户端到手机.sh 安装VNC客户端"
    else
        print_warning "设备连接失败，需要配置ADB无线调试"
        show_setup_guide
    fi
}

# 执行主函数
main