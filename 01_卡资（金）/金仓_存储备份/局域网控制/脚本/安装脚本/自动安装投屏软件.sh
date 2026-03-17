#!/bin/bash
# MacBook投屏软件自动安装脚本
# 作者：卡若
# 功能：自动安装免费投屏软件到MacBook

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

echo "📱 MacBook投屏软件自动安装工具"
echo "作者: 卡若 | 版本: 1.0.0"
echo "========================================"
echo "正在自动安装免费投屏软件..."
echo

# 检查Homebrew
check_homebrew() {
    log_info "检查Homebrew..."
    
    if ! command -v brew >/dev/null 2>&1; then
        log_warn "Homebrew未安装，正在安装..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        
        # 添加到PATH
        echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
        eval "$(/opt/homebrew/bin/brew shellenv)"
    else
        log_info "✅ Homebrew已安装: $(brew --version | head -1)"
    fi
    echo
}

# 安装scrcpy和ADB
install_scrcpy() {
    log_progress "安装scrcpy (Android投屏神器)..."
    
    if command -v scrcpy >/dev/null 2>&1; then
        log_info "✅ scrcpy已安装: $(scrcpy --version | head -1)"
    else
        log_info "正在安装scrcpy..."
        brew install scrcpy
        log_success "scrcpy安装完成！"
    fi
    
    # 安装ADB工具
    if ! command -v adb >/dev/null 2>&1; then
        log_info "正在安装ADB工具..."
        brew install android-platform-tools
        log_success "ADB工具安装完成！"
    else
        log_info "✅ ADB已安装: $(adb --version | head -1)"
    fi
    echo
}

# 尝试安装LetsView
install_letsview() {
    log_progress "尝试安装LetsView..."
    
    if [ -d "/Applications/LetsView.app" ]; then
        log_info "✅ LetsView已安装"
    else
        log_info "正在尝试通过Homebrew Cask安装LetsView..."
        
        if brew install --cask letsview 2>/dev/null; then
            log_success "LetsView通过Homebrew安装完成！"
        else
            log_warn "Homebrew Cask安装失败，LetsView可能需要手动下载"
            log_info "LetsView官网: https://letsview.com/"
        fi
    fi
    echo
}

# 创建桌面启动脚本
create_launcher_scripts() {
    log_progress "创建桌面启动脚本..."
    
    # 创建scrcpy启动脚本
    cat > "$HOME/Desktop/启动scrcpy投屏.command" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
echo "🚀 启动scrcpy投屏工具"
echo "请确保Android设备已开启USB调试和无线调试"
echo

# 扫描设备
echo "正在扫描连接的设备..."
adb devices

echo
read -p "请输入设备IP地址 (例: 192.168.2.2): " device_ip

if [ -n "$device_ip" ]; then
    echo "正在连接设备: $device_ip"
    adb connect "$device_ip:5555"
    
    sleep 2
    echo "启动投屏..."
    scrcpy --max-size 1920 --bit-rate 8M --max-fps 30 --stay-awake --window-title "投屏: $device_ip"
else
    echo "未输入设备IP，尝试USB连接投屏..."
    scrcpy --max-size 1920 --bit-rate 8M --max-fps 30 --stay-awake
fi

read -p "按回车键退出..."
EOF
    
    chmod +x "$HOME/Desktop/启动scrcpy投屏.command"
    log_success "已创建桌面快捷方式: 启动scrcpy投屏.command"
    
    # 创建设备连接脚本
    cat > "$HOME/Desktop/连接Android设备.command" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
echo "📱 Android设备连接工具"
echo

# 重启ADB服务
echo "重启ADB服务..."
adb kill-server
adb start-server

echo "当前连接的设备:"
adb devices

echo
read -p "请输入设备IP地址 (例: 192.168.2.2): " device_ip

if [ -n "$device_ip" ]; then
    echo "正在连接设备: $device_ip"
    adb connect "$device_ip:5555"
    
    sleep 1
    echo "连接结果:"
    adb devices
    
    if adb devices | grep -q "$device_ip.*device"; then
        echo "✅ 设备连接成功！"
        echo "现在可以使用'启动scrcpy投屏.command'开始投屏"
    else
        echo "❌ 设备连接失败，请检查:"
        echo "1. 设备是否开启了无线调试"
        echo "2. 设备和MacBook是否在同一WiFi网络"
        echo "3. 设备IP地址是否正确"
    fi
else
    echo "未输入设备IP"
fi

read -p "按回车键退出..."
EOF
    
    chmod +x "$HOME/Desktop/连接Android设备.command"
    log_success "已创建桌面快捷方式: 连接Android设备.command"
    
    # 创建快速投屏脚本（直接连接192.168.2.2）
    cat > "$HOME/Desktop/快速投屏192.168.2.2.command" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
echo "🚀 快速投屏到 192.168.2.2"
echo

# 设备IP
DEVICE_IP="192.168.2.2"

# 重启ADB服务
echo "重启ADB服务..."
adb kill-server
adb start-server

# 连接设备
echo "正在连接设备: $DEVICE_IP"
adb connect "$DEVICE_IP:5555"

sleep 2

# 检查连接状态
if adb devices | grep -q "$DEVICE_IP.*device"; then
    echo "✅ 设备连接成功！"
    echo "启动投屏..."
    scrcpy -s "$DEVICE_IP:5555" --max-size 1920 --bit-rate 8M --max-fps 30 --stay-awake --window-title "投屏: $DEVICE_IP"
else
    echo "❌ 设备连接失败！"
    echo "请确保:"
    echo "1. 设备 $DEVICE_IP 已开启无线调试"
    echo "2. 设备和MacBook在同一WiFi网络"
    echo "3. 设备已授权此MacBook的ADB连接"
    echo
    echo "📱 Android设备设置步骤:"
    echo "1. 设置 → 关于手机 → 连续点击版本号7次"
    echo "2. 设置 → 系统 → 开发者选项"
    echo "3. 开启'USB调试'和'无线调试'"
fi

read -p "按回车键退出..."
EOF
    
    chmod +x "$HOME/Desktop/快速投屏192.168.2.2.command"
    log_success "已创建桌面快捷方式: 快速投屏192.168.2.2.command"
    echo
}

# 显示使用指南
show_usage_guide() {
    echo "📖 投屏软件使用指南"
    echo "========================================"
    echo
    
    echo "🎯 快速开始 (推荐):"
    echo "1. 双击桌面'快速投屏192.168.2.2.command' - 直接投屏到目标设备"
    echo "2. 如果连接失败，按照提示设置Android设备"
    echo
    
    echo "🔧 手动操作:"
    echo "1. 双击桌面'连接Android设备.command' - 连接任意设备"
    echo "2. 双击桌面'启动scrcpy投屏.command' - 启动投屏"
    echo
    
    echo "📱 Android设备设置 (必须完成):"
    echo "1. 设置 → 关于手机 → 连续点击'版本号'7次 (开启开发者选项)"
    echo "2. 设置 → 系统 → 开发者选项"
    echo "3. 开启'USB调试'"
    echo "4. 开启'无线调试' (Android 11+)"
    echo "5. 确保设备与MacBook在同一WiFi网络"
    echo
    
    echo "💡 投屏功能:"
    echo "• 🖥️  高清画面投屏 (最高1920p)"
    echo "• 🖱️  鼠标键盘控制Android设备"
    echo "• 📱 支持横屏/竖屏自动切换"
    echo "• 🎮 支持游戏操作"
    echo "• 📹 支持录屏功能"
    echo "• 🔊 支持音频传输"
    echo
    
    echo "🚨 故障排除:"
    echo "• 连接失败: 检查设备IP和网络连接"
    echo "• 画面卡顿: 降低分辨率 (--max-size 1280)"
    echo "• 无法控制: 确认已授权USB调试"
    echo "• 黑屏问题: 重启设备的无线调试功能"
    echo
    
    echo "🌟 其他免费投屏方案:"
    echo "• LetsView: 跨平台免费投屏 (如已安装)"
    echo "• Chrome投射: 浏览器 → 菜单 → 投射"
    echo "• AirPlay: 适用于支持的设备"
    echo
}

# 主函数
main() {
    # 检查系统
    if [[ "$OSTYPE" != "darwin"* ]]; then
        log_error "此脚本仅支持macOS系统"
        exit 1
    fi
    
    log_info "开始自动安装投屏软件..."
    echo
    
    # 检查并安装Homebrew
    check_homebrew
    
    # 安装scrcpy (主要投屏工具)
    install_scrcpy
    
    # 尝试安装LetsView (备用方案)
    install_letsview
    
    # 创建桌面启动脚本
    create_launcher_scripts
    
    echo
    log_success "🎉 所有投屏软件安装完成！"
    echo
    
    # 显示使用指南
    show_usage_guide
    
    echo
    log_info "🚀 现在可以双击桌面的'快速投屏192.168.2.2.command'开始投屏！"
}

# 运行主函数
main "$@"