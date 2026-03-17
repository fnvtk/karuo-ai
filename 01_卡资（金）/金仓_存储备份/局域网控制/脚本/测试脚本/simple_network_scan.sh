#!/bin/bash
# 简单的局域网设备扫描脚本
# 作者：卡若
# 功能：扫描局域网中的所有活跃设备

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_progress() {
    echo -e "${BLUE}[SCAN]${NC} $1"
}

log_found() {
    echo -e "${PURPLE}[FOUND]${NC} 📱 $1"
}

echo "🔍 局域网设备扫描工具"
echo "作者: 卡若 | 版本: 1.0.0"
echo "========================================"
echo

# 获取本机IP和网段
LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')
if [ -z "$LOCAL_IP" ]; then
    log_error "无法获取本机IP地址"
    exit 1
fi

# 提取网段
NETWORK=$(echo $LOCAL_IP | cut -d'.' -f1-3)

log_info "本机IP: $LOCAL_IP"
log_info "扫描网段: ${NETWORK}.1-254"
echo

# 检查是否安装了nmap
if command -v nmap >/dev/null 2>&1; then
    log_info "使用nmap进行快速扫描..."
    echo
    
    # 使用nmap扫描
    nmap -sn "${NETWORK}.0/24" 2>/dev/null | grep -E "Nmap scan report|MAC Address" | while read line; do
        if [[ $line == *"Nmap scan report"* ]]; then
            IP=$(echo $line | awk '{print $NF}' | tr -d '()')
            echo -n "📍 $IP"
        elif [[ $line == *"MAC Address"* ]]; then
            MAC=$(echo $line | awk '{print $3}')
            VENDOR=$(echo $line | cut -d'(' -f2 | cut -d')' -f1)
            echo " - $MAC ($VENDOR)"
        else
            echo
        fi
    done
else
    log_info "nmap未安装，使用ping扫描..."
    log_info "提示：安装nmap可获得更详细信息: brew install nmap"
    echo
    
    log_progress "扫描活跃设备..."
    
    # 创建临时文件
    TEMP_FILE="/tmp/ping_scan_$$"
    > "$TEMP_FILE"
    
    # 并行ping扫描
    for i in {1..254}; do
        {
            IP="${NETWORK}.$i"
            if ping -c 1 -W 1000 "$IP" >/dev/null 2>&1; then
                echo "$IP" >> "$TEMP_FILE"
            fi
        } &
        
        # 控制并发数量，避免系统负载过高
        if (( i % 30 == 0 )); then
            wait
        fi
    done
    wait
    
    echo
    log_info "发现的活跃设备:"
    echo
    
    if [ -f "$TEMP_FILE" ] && [ -s "$TEMP_FILE" ]; then
        while read -r ip; do
            if [ "$ip" != "$LOCAL_IP" ]; then
                echo "📍 $ip"
                
                # 尝试获取主机名
                hostname=$(nslookup "$ip" 2>/dev/null | grep "name =" | awk '{print $NF}' | sed 's/\.$//') || hostname=""
                if [ -n "$hostname" ]; then
                    echo "   主机名: $hostname"
                fi
                
                # 检查常见端口
                echo -n "   开放端口: "
                open_ports=()
                
                # 检查常见端口
                for port in 22 23 80 443 5555 8080; do
                    if timeout 1 bash -c "</dev/tcp/$ip/$port" 2>/dev/null; then
                        open_ports+=("$port")
                    fi
                done
                
                if [ ${#open_ports[@]} -gt 0 ]; then
                    echo "${open_ports[*]}"
                else
                    echo "无"
                fi
                
                # 特别检查ADB端口
                if timeout 1 bash -c "</dev/tcp/$ip/5555" 2>/dev/null; then
                    log_found "$ip 可能是Android设备 (ADB端口5555开放)"
                fi
                
                echo
            fi
        done < "$TEMP_FILE"
    else
        log_warn "未发现任何活跃设备"
    fi
    
    # 清理临时文件
    rm -f "$TEMP_FILE"
fi

echo
log_info "扫描完成！"

# 显示ADB连接提示
echo
log_info "💡 如果发现Android设备，可以尝试连接:"
echo "   adb connect <设备IP>:5555"
echo "   例如: adb connect 192.168.3.100:5555"
echo
log_info "📱 确保Android设备已开启:"
echo "   1. 开发者选项"
echo "   2. USB调试"
echo "   3. 无线ADB调试"
echo

exit 0