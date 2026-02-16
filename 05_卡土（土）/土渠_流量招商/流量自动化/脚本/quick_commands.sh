#!/bin/bash
# 流量自动化快速命令
# 使用: source quick_commands.sh

# ============================================
# 设备信息查看
# ============================================

# 查看当前MAC地址
alias show_mac="ifconfig en0 | grep ether"

# 查看外网IP
alias show_ip="curl -s ip.sb"

# 查看所有网络接口
alias show_interfaces="networksetup -listallnetworkservices"

# ============================================
# MAC地址操作 (需要sudo)
# ============================================

# 生成随机MAC地址
generate_mac() {
    printf '%02x:%02x:%02x:%02x:%02x:%02x\n' \
        $((RANDOM%256 & 0xfe | 0x02)) \
        $((RANDOM%256)) \
        $((RANDOM%256)) \
        $((RANDOM%256)) \
        $((RANDOM%256)) \
        $((RANDOM%256))
}

# 重置MAC地址
reset_mac() {
    local interface=${1:-en0}
    local new_mac=$(generate_mac)
    echo "新MAC地址: $new_mac"
    sudo ifconfig $interface ether $new_mac
    sudo ifconfig $interface down
    sudo ifconfig $interface up
    echo "MAC已重置"
}

# ============================================
# VPN操作
# ============================================

# 列出VPN服务
alias vpn_list="networksetup -listnetworkserviceorder | grep -i vpn"

# 连接VPN (用法: vpn_connect "VPN名称")
vpn_connect() {
    networksetup -connectpppoeservice "$1"
    sleep 3
    echo "当前IP: $(curl -s ip.sb)"
}

# 断开VPN
vpn_disconnect() {
    networksetup -disconnectpppoeservice "$1"
}

# VPN状态
vpn_status() {
    networksetup -showpppoestatus "$1"
}

# ============================================
# 浏览器清理
# ============================================

# 清理Chrome
clean_chrome() {
    rm -rf ~/Library/Application\ Support/Google/Chrome/Default/Cookies
    rm -rf ~/Library/Application\ Support/Google/Chrome/Default/History
    rm -rf ~/Library/Application\ Support/Google/Chrome/Default/Cache
    rm -rf ~/Library/Application\ Support/Google/Chrome/Default/Web\ Data
    echo "Chrome数据已清理"
}

# 清理Safari
clean_safari() {
    rm -rf ~/Library/Safari/LocalStorage/*
    rm -rf ~/Library/Safari/History.db*
    rm -rf ~/Library/Cookies/*
    rm -rf ~/Library/Caches/com.apple.Safari/*
    echo "Safari数据已清理"
}

# 清理所有浏览器
clean_all() {
    clean_chrome
    clean_safari
    echo "所有浏览器数据已清理"
}

# ============================================
# 一键操作
# ============================================

# 完整重置 (MAC + 浏览器)
full_reset() {
    echo "开始完整重置..."
    clean_all
    reset_mac en0
    echo "重置完成!"
    show_mac
    show_ip
}

# ============================================
# 帮助
# ============================================

traffic_help() {
    echo "=== 流量自动化命令 ==="
    echo ""
    echo "信息查看:"
    echo "  show_mac        - 显示当前MAC地址"
    echo "  show_ip         - 显示外网IP"
    echo "  show_interfaces - 显示所有网络接口"
    echo ""
    echo "MAC操作 (需要sudo):"
    echo "  generate_mac    - 生成随机MAC"
    echo "  reset_mac [接口] - 重置MAC地址"
    echo ""
    echo "VPN操作:"
    echo "  vpn_list        - 列出VPN服务"
    echo "  vpn_connect \"名称\" - 连接VPN"
    echo "  vpn_disconnect \"名称\" - 断开VPN"
    echo "  vpn_status \"名称\" - 查看状态"
    echo ""
    echo "清理操作:"
    echo "  clean_chrome    - 清理Chrome"
    echo "  clean_safari    - 清理Safari"
    echo "  clean_all       - 清理所有浏览器"
    echo ""
    echo "一键操作:"
    echo "  full_reset      - 完整重置(MAC+浏览器)"
}

echo "流量自动化命令已加载，输入 traffic_help 查看帮助"
