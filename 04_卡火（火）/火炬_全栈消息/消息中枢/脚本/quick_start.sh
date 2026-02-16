#!/bin/bash
# Moltbot 快速启动脚本
# 作者：卡火（火）- 火炬
# 用途：快速安装和启动 Moltbot AI 助手平台

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查 Node.js 版本
check_node() {
    print_info "检查 Node.js 版本..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js 未安装！请先安装 Node.js 22+"
        echo "  brew install node@22"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 22 ]; then
        print_error "Node.js 版本过低！需要 22+，当前版本: $(node -v)"
        echo "  brew upgrade node"
        exit 1
    fi
    
    print_success "Node.js 版本: $(node -v)"
}

# 检查 pnpm
check_pnpm() {
    print_info "检查 pnpm..."
    
    if ! command -v pnpm &> /dev/null; then
        print_warning "pnpm 未安装，正在安装..."
        npm install -g pnpm
    fi
    
    print_success "pnpm 版本: $(pnpm -v)"
}

# 安装 Moltbot
install_moltbot() {
    print_info "安装 Moltbot..."
    
    if command -v moltbot &> /dev/null; then
        print_warning "Moltbot 已安装，检查更新..."
        npm update -g moltbot
    else
        npm install -g moltbot@latest
    fi
    
    print_success "Moltbot 版本: $(moltbot --version)"
}

# 运行引导
run_onboard() {
    print_info "运行引导向导..."
    moltbot onboard --install-daemon
}

# 启动 Gateway
start_gateway() {
    print_info "启动 Gateway..."
    
    # 检查是否已在运行
    if lsof -i :18789 &> /dev/null; then
        print_warning "Gateway 已在运行（端口 18789）"
        echo "  如需重启，请先运行: pkill -f moltbot-gateway"
        return
    fi
    
    # 后台启动
    nohup moltbot gateway run --bind loopback --port 18789 > /tmp/moltbot-gateway.log 2>&1 &
    
    sleep 2
    
    if lsof -i :18789 &> /dev/null; then
        print_success "Gateway 已启动！"
        echo "  日志: tail -f /tmp/moltbot-gateway.log"
        echo "  WebChat: http://localhost:18789/webchat"
    else
        print_error "Gateway 启动失败，请检查日志"
        echo "  tail -n 50 /tmp/moltbot-gateway.log"
    fi
}

# 显示状态
show_status() {
    print_info "检查状态..."
    
    echo ""
    echo "=== 系统状态 ==="
    moltbot doctor 2>/dev/null || true
    
    echo ""
    echo "=== 通道状态 ==="
    moltbot channels status 2>/dev/null || true
}

# 显示帮助
show_help() {
    echo ""
    echo "🦞 Moltbot AI 助手平台 - 快速启动脚本"
    echo ""
    echo "用法: $0 [命令]"
    echo ""
    echo "命令:"
    echo "  install     安装 Moltbot"
    echo "  start       启动 Gateway"
    echo "  status      查看状态"
    echo "  restart     重启 Gateway"
    echo "  stop        停止 Gateway"
    echo "  logs        查看日志"
    echo "  full        完整安装并启动"
    echo "  help        显示帮助"
    echo ""
    echo "示例:"
    echo "  $0 full     # 首次使用，完整安装"
    echo "  $0 start    # 启动 Gateway"
    echo "  $0 status   # 检查状态"
    echo ""
}

# 停止 Gateway
stop_gateway() {
    print_info "停止 Gateway..."
    pkill -f moltbot-gateway 2>/dev/null || true
    print_success "Gateway 已停止"
}

# 重启 Gateway
restart_gateway() {
    stop_gateway
    sleep 1
    start_gateway
}

# 查看日志
show_logs() {
    if [ -f /tmp/moltbot-gateway.log ]; then
        tail -f /tmp/moltbot-gateway.log
    else
        print_error "日志文件不存在"
    fi
}

# 完整安装
full_install() {
    echo ""
    echo "🦞 Moltbot AI 助手平台 - 完整安装"
    echo "=================================="
    echo ""
    
    check_node
    check_pnpm
    install_moltbot
    
    echo ""
    read -p "是否运行引导向导？(y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        run_onboard
    fi
    
    echo ""
    read -p "是否启动 Gateway？(y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        start_gateway
    fi
    
    echo ""
    print_success "安装完成！"
    echo ""
    echo "下一步："
    echo "  1. 登录 WhatsApp: moltbot channels login"
    echo "  2. 配置白名单: ~/.clawdbot/moltbot.json"
    echo "  3. 开始使用！"
    echo ""
}

# 主程序
case "${1:-help}" in
    install)
        check_node
        check_pnpm
        install_moltbot
        ;;
    start)
        start_gateway
        ;;
    status)
        show_status
        ;;
    restart)
        restart_gateway
        ;;
    stop)
        stop_gateway
        ;;
    logs)
        show_logs
        ;;
    full)
        full_install
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "未知命令: $1"
        show_help
        exit 1
        ;;
esac
