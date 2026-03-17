#!/bin/bash
# MacBook投屏到Android设备脚本
# 作者：卡若
# 功能：连接并投屏到指定Android设备

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
    echo -e "${BLUE}[PROGRESS]${NC} $1"
}

log_success() {
    echo -e "${PURPLE}[SUCCESS]${NC} 🎉 $1"
}

# 默认设备IP
DEVICE_IP="192.168.2.2"
DEVICE_PORTS=("5555" "5037" "4444" "5556")

echo "📱 MacBook投屏到Android设备工具"
echo "作者: 卡若 | 版本: 1.0.0"
echo "========================================"
echo

# 检查必要工具
check_tools() {
    log_info "检查必要工具..."
    
    # 检查ADB
    if ! command -v adb >/dev/null 2>&1; then
        log_error "ADB未安装，正在安装..."
        brew install android-platform-tools
    else
        log_info "✅ ADB已安装: $(adb --version | head -1)"
    fi
    
    # 检查scrcpy
    if ! command -v scrcpy >/dev/null 2>&1; then
        log_error "scrcpy未安装，正在安装..."
        brew install scrcpy
    else
        log_info "✅ scrcpy已安装: $(scrcpy --version | head -1)"
    fi
    
    echo
}

# 测试设备连通性
test_connectivity() {
    log_progress "测试设备连通性..."
    
    if ping -c 1 -W 1000 "$DEVICE_IP" >/dev/null 2>&1; then
        log_info "✅ 设备 $DEVICE_IP 网络连通正常"
        return 0
    else
        log_error "❌ 设备 $DEVICE_IP 网络不通"
        return 1
    fi
}

# 尝试ADB连接
try_adb_connection() {
    log_progress "尝试ADB连接..."
    
    # 重启ADB服务
    adb kill-server >/dev/null 2>&1 || true
    adb start-server >/dev/null 2>&1
    
    # 尝试不同端口
    for port in "${DEVICE_PORTS[@]}"; do
        log_progress "尝试连接 $DEVICE_IP:$port..."
        
        if adb connect "$DEVICE_IP:$port" 2>/dev/null | grep -q "connected"; then
            sleep 2
            
            # 验证连接
            if adb devices | grep -q "$DEVICE_IP:$port.*device"; then
                log_success "ADB连接成功: $DEVICE_IP:$port"
                
                # 获取设备信息
                local model=$(adb -s "$DEVICE_IP:$port" shell getprop ro.product.model 2>/dev/null | tr -d '\r' || echo "未知")
                local brand=$(adb -s "$DEVICE_IP:$port" shell getprop ro.product.brand 2>/dev/null | tr -d '\r' || echo "未知")
                local version=$(adb -s "$DEVICE_IP:$port" shell getprop ro.build.version.release 2>/dev/null | tr -d '\r' || echo "未知")
                
                log_info "设备信息: $brand $model (Android $version)"
                return 0
            fi
        fi
    done
    
    log_error "❌ 所有端口连接失败"
    return 1
}

# 启动投屏
start_screen_mirror() {
    log_progress "启动投屏功能..."
    
    # 获取连接的设备
    local connected_device=$(adb devices | grep "$DEVICE_IP" | grep "device" | awk '{print $1}' | head -1)
    
    if [ -z "$connected_device" ]; then
        log_error "未找到已连接的设备"
        return 1
    fi
    
    log_info "开始投屏设备: $connected_device"
    log_info "投屏窗口即将打开，按Ctrl+C可退出投屏"
    echo
    
    # 启动scrcpy投屏
    # 参数说明:
    # -s: 指定设备
    # --max-size: 限制分辨率以提高性能
    # --bit-rate: 设置比特率
    # --max-fps: 限制帧率
    # --stay-awake: 保持设备唤醒
    # --turn-screen-off: 关闭设备屏幕（可选）
    
    scrcpy -s "$connected_device" \
           --max-size 1920 \
           --bit-rate 8M \
           --max-fps 30 \
           --stay-awake \
           --window-title "投屏: $connected_device" \
           --window-borderless=false
}

# 显示设备设置指南
show_setup_guide() {
    echo
    log_error "ADB连接失败！请按以下步骤设置Android设备:"
    echo
    echo "📱 Android设备设置步骤:"
    echo "1. 打开 设置 → 关于手机"
    echo "2. 连续点击 版本号 7次，开启开发者选项"
    echo "3. 返回设置，进入 系统 → 开发者选项"
    echo "4. 开启 USB调试"
    echo "5. 开启 无线调试 (Android 11+) 或 网络ADB调试"
    echo "6. 如果有 仅充电时允许ADB调试，请关闭此选项"
    echo
    echo "🔧 高级设置 (如果上述步骤无效):"
    echo "1. 在开发者选项中找到 无线调试"
    echo "2. 点击进入，选择 使用配对码配对设备"
    echo "3. 记录显示的IP地址和端口号"
    echo "4. 在MacBook上运行: adb pair <IP>:<端口> <配对码>"
    echo "5. 配对成功后运行: adb connect <IP>:5555"
    echo
    echo "💡 常见问题解决:"
    echo "- 确保手机和MacBook在同一WiFi网络"
    echo "- 重启手机的无线调试功能"
    echo "- 检查防火墙设置"
    echo "- 尝试重启ADB服务: adb kill-server && adb start-server"
    echo
}

# 显示其他投屏方案
show_alternatives() {
    echo
    log_info "🔄 其他免费投屏方案:"
    echo
    echo "1. 📺 AirPlay (如果设备支持):"
    echo "   - 在MacBook上: 系统偏好设置 → 显示器 → 添加显示器"
    echo "   - 选择支持AirPlay的设备"
    echo
    echo "2. 🌐 浏览器投屏:"
    echo "   - 使用Chrome浏览器的投射功能"
    echo "   - 右上角菜单 → 投射 → 选择设备"
    echo
    echo "3. 📱 第三方应用:"
    echo "   - ApowerMirror (免费版有限制)"
    echo "   - LetsView (免费)"
    echo "   - Vysor (免费版有限制)"
    echo
    echo "4. 🔗 USB连接投屏:"
    echo "   - 使用USB数据线连接设备"
    echo "   - 运行: scrcpy (无需网络连接)"
    echo
}

# 主函数
main() {
    # 解析参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -i|--ip)
                DEVICE_IP="$2"
                shift 2
                ;;
            -h|--help)
                echo "用法: $0 [选项]"
                echo "选项:"
                echo "  -i, --ip <IP>    指定设备IP地址 (默认: 192.168.2.2)"
                echo "  -h, --help       显示帮助信息"
                exit 0
                ;;
            *)
                log_error "未知参数: $1"
                exit 1
                ;;
        esac
    done
    
    log_info "目标设备: $DEVICE_IP"
    echo
    
    # 检查工具
    check_tools
    
    # 测试连通性
    if ! test_connectivity; then
        log_error "设备网络不通，请检查:"
        echo "1. 设备IP地址是否正确: $DEVICE_IP"
        echo "2. 设备和MacBook是否在同一网络"
        echo "3. 设备是否开机并连接WiFi"
        exit 1
    fi
    
    echo
    
    # 尝试ADB连接
    if try_adb_connection; then
        echo
        start_screen_mirror
    else
        show_setup_guide
        show_alternatives
        
        echo
        read -p "是否已完成设备设置，重新尝试连接？(y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo
            if try_adb_connection; then
                echo
                start_screen_mirror
            else
                log_error "连接仍然失败，请检查设备设置"
                exit 1
            fi
        else
            log_info "请完成设备设置后重新运行此脚本"
            exit 0
        fi
    fi
}

# 信号处理
trap 'echo; log_info "投屏已停止"; exit 0' INT TERM

# 运行主函数
main "$@"