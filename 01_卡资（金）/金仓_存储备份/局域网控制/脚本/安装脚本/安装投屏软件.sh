#!/bin/bash
# MacBook投屏软件安装脚本
# 作者：卡若
# 功能：安装多种免费投屏软件

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

echo "📱 MacBook投屏软件安装工具"
echo "作者: 卡若 | 版本: 1.0.0"
echo "========================================"
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

# 安装scrcpy (最佳Android投屏工具)
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

# 安装LetsView (免费跨平台投屏)
install_letsview() {
    log_progress "安装LetsView (免费跨平台投屏)..."
    
    if [ -d "/Applications/LetsView.app" ]; then
        log_info "✅ LetsView已安装"
    else
        log_info "正在下载LetsView..."
        
        # 创建临时目录
        temp_dir=$(mktemp -d)
        cd "$temp_dir"
        
        # 下载LetsView
        curl -L -o "LetsView.dmg" "https://download.letsview.com/mac/LetsView.dmg"
        
        # 挂载DMG
        hdiutil attach "LetsView.dmg" -quiet
        
        # 复制应用
        cp -R "/Volumes/LetsView/LetsView.app" "/Applications/"
        
        # 卸载DMG
        hdiutil detach "/Volumes/LetsView" -quiet
        
        # 清理临时文件
        cd - >/dev/null
        rm -rf "$temp_dir"
        
        log_success "LetsView安装完成！"
    fi
    echo
}

# 安装ApowerMirror (功能丰富的投屏工具)
install_apowermirror() {
    log_progress "安装ApowerMirror (功能丰富的投屏工具)..."
    
    if [ -d "/Applications/ApowerMirror.app" ]; then
        log_info "✅ ApowerMirror已安装"
    else
        log_info "正在通过Homebrew Cask安装ApowerMirror..."
        
        # 尝试通过Homebrew Cask安装
        if brew install --cask apowermirror 2>/dev/null; then
            log_success "ApowerMirror安装完成！"
        else
            log_warn "Homebrew Cask安装失败，尝试手动下载..."
            
            # 手动下载安装
            temp_dir=$(mktemp -d)
            cd "$temp_dir"
            
            log_info "正在下载ApowerMirror..."
            curl -L -o "ApowerMirror.dmg" "https://download.apowersoft.com/mac/apowermirror-mac.dmg"
            
            # 挂载DMG
            hdiutil attach "ApowerMirror.dmg" -quiet
            
            # 复制应用
            cp -R "/Volumes/ApowerMirror/ApowerMirror.app" "/Applications/"
            
            # 卸载DMG
            hdiutil detach "/Volumes/ApowerMirror" -quiet
            
            # 清理临时文件
            cd - >/dev/null
            rm -rf "$temp_dir"
            
            log_success "ApowerMirror安装完成！"
        fi
    fi
    echo
}

# 安装Vysor (Chrome扩展投屏)
install_vysor_info() {
    log_progress "Vysor安装信息 (Chrome扩展投屏)..."
    
    echo "📌 Vysor安装步骤:"
    echo "1. 打开Chrome浏览器"
    echo "2. 访问: https://chrome.google.com/webstore/detail/vysor/gidgenkbbabolejbgbpnhbimgjbffefm"
    echo "3. 点击'添加至Chrome'安装扩展"
    echo "4. 安装完成后，点击扩展图标使用"
    echo
    
    # 尝试打开Chrome Web Store
    if command -v open >/dev/null 2>&1; then
        read -p "是否现在打开Chrome Web Store安装Vysor？(y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            open "https://chrome.google.com/webstore/detail/vysor/gidgenkbbabolejbgbpnhbimgjbffefm"
            log_info "已打开Chrome Web Store，请手动安装Vysor扩展"
        fi
    fi
    echo
}

# 安装AirServer (AirPlay接收器)
install_airserver_info() {
    log_progress "AirServer信息 (AirPlay接收器)..."
    
    echo "📌 AirServer (付费软件，有试用期):"
    echo "1. 访问官网: https://www.airserver.com/"
    echo "2. 下载Mac版本"
    echo "3. 安装后可以接收iOS设备的AirPlay投屏"
    echo "4. 价格: 约$20，有7天免费试用"
    echo
    
    read -p "是否现在打开AirServer官网？(y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        open "https://www.airserver.com/"
        log_info "已打开AirServer官网"
    fi
    echo
}

# 创建投屏工具启动脚本
create_launcher_scripts() {
    log_progress "创建投屏工具启动脚本..."
    
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
read -p "请输入设备IP地址 (例: 192.168.1.100): " device_ip

if [ -n "$device_ip" ]; then
    echo "正在连接设备: $device_ip"
    adb connect "$device_ip:5555"
    
    echo "启动投屏..."
    scrcpy --max-size 1920 --bit-rate 8M --max-fps 30 --stay-awake
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
read -p "请输入设备IP地址 (例: 192.168.1.100): " device_ip

if [ -n "$device_ip" ]; then
    echo "正在连接设备: $device_ip"
    adb connect "$device_ip:5555"
    
    echo "连接结果:"
    adb devices
else
    echo "未输入设备IP"
fi

read -p "按回车键退出..."
EOF
    
    chmod +x "$HOME/Desktop/连接Android设备.command"
    log_success "已创建桌面快捷方式: 连接Android设备.command"
    echo
}

# 显示使用指南
show_usage_guide() {
    echo "📖 投屏软件使用指南"
    echo "========================================"
    echo
    
    echo "🔥 推荐方案 - scrcpy (最佳Android投屏):"
    echo "1. 优点: 免费、开源、低延迟、高画质"
    echo "2. 支持: 无线/USB连接、键鼠控制、录屏"
    echo "3. 使用: 双击桌面'启动scrcpy投屏.command'"
    echo
    
    echo "🌟 备选方案:"
    echo "• LetsView: 跨平台免费，支持iOS/Android"
    echo "• ApowerMirror: 功能丰富，免费版有限制"
    echo "• Vysor: Chrome扩展，简单易用"
    echo "• AirServer: 专业AirPlay接收器(付费)"
    echo
    
    echo "📱 Android设备设置步骤:"
    echo "1. 设置 → 关于手机 → 连续点击版本号7次"
    echo "2. 设置 → 系统 → 开发者选项"
    echo "3. 开启'USB调试'和'无线调试'"
    echo "4. 确保设备与MacBook在同一WiFi网络"
    echo
    
    echo "🚀 快速开始:"
    echo "1. 双击桌面'连接Android设备.command'连接设备"
    echo "2. 双击桌面'启动scrcpy投屏.command'开始投屏"
    echo "3. 或直接打开LetsView等应用使用"
    echo
    
    echo "💡 故障排除:"
    echo "• 连接失败: 检查设备设置和网络连接"
    echo "• 画面卡顿: 降低分辨率或比特率"
    echo "• 无法控制: 确认已授权USB调试"
    echo
}

# 主菜单
show_menu() {
    echo "请选择要安装的投屏软件:"
    echo "1. 安装scrcpy (推荐 - Android专用)"
    echo "2. 安装LetsView (跨平台免费)"
    echo "3. 安装ApowerMirror (功能丰富)"
    echo "4. 查看Vysor安装信息 (Chrome扩展)"
    echo "5. 查看AirServer信息 (AirPlay接收器)"
    echo "6. 全部安装 (推荐)"
    echo "7. 创建启动脚本"
    echo "8. 显示使用指南"
    echo "0. 退出"
    echo
    read -p "请输入选项 (0-8): " choice
    echo
    
    case $choice in
        1)
            install_scrcpy
            ;;
        2)
            install_letsview
            ;;
        3)
            install_apowermirror
            ;;
        4)
            install_vysor_info
            ;;
        5)
            install_airserver_info
            ;;
        6)
            install_scrcpy
            install_letsview
            install_apowermirror
            install_vysor_info
            create_launcher_scripts
            log_success "所有投屏软件安装完成！"
            ;;
        7)
            create_launcher_scripts
            ;;
        8)
            show_usage_guide
            ;;
        0)
            log_info "退出安装程序"
            exit 0
            ;;
        *)
            log_error "无效选项，请重新选择"
            ;;
    esac
}

# 主函数
main() {
    # 检查系统
    if [[ "$OSTYPE" != "darwin"* ]]; then
        log_error "此脚本仅支持macOS系统"
        exit 1
    fi
    
    # 检查Homebrew
    check_homebrew
    
    # 显示菜单
    while true; do
        show_menu
        echo
        read -p "是否继续安装其他软件？(y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            break
        fi
        echo
    done
    
    echo
    log_success "安装完成！"
    show_usage_guide
}

# 运行主函数
main "$@"