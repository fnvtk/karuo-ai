#!/bin/bash
# NAS 虚拟机管理脚本
# 功能：统一管理 Windows 和 macOS 虚拟机的启动、停止和状态查询
# 用途：实现按需启动，节省 NAS 资源

NAS_IP="192.168.1.201"
SSH_USER="fnvtk"
DOCKER_CMD="/volume1/@appstore/ContainerManager/usr/bin/docker"
COMPOSE_CMD="$DOCKER_CMD compose"
PASSWORD="Zhiqun1984"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

ssh_cmd() {
    ssh "$SSH_USER"@"$NAS_IP" "$1"
}

sudo_cmd() {
    ssh "$SSH_USER"@"$NAS_IP" "echo '$PASSWORD' | sudo -S $1"
}

start_windows() {
    log_info "启动 Windows 虚拟机..."
    ssh_cmd "cd /volume1/docker/windows-vm && echo '$PASSWORD' | sudo -S $COMPOSE_CMD up -d"
    log_info "Windows 虚拟机启动成功！"
    echo "  📱 Web VNC: http://$NAS_IP:8006"
    echo "  💻 RDP:     $NAS_IP:3389 (安装完成后)"
}

stop_windows() {
    log_info "停止 Windows 虚拟机..."
    ssh_cmd "cd /volume1/docker/windows-vm && echo '$PASSWORD' | sudo -S $COMPOSE_CMD down"
    log_info "Windows 虚拟机已停止"
}

start_macos() {
    log_info "启动 macOS 虚拟机..."
    ssh_cmd "cd /volume1/docker/macos-vm && echo '$PASSWORD' | sudo -S $COMPOSE_CMD up -d"
    log_info "macOS 虚拟机启动成功！"
    echo "  🍎 Web VNC: http://$NAS_IP:8007"
    echo "  🖥️  VNC:     vnc://$NAS_IP:5901"
}

stop_macos() {
    log_info "停止 macOS 虚拟机..."
    ssh_cmd "cd /volume1/docker/macos-vm && echo '$PASSWORD' | sudo -S $COMPOSE_CMD down"
    log_info "macOS 虚拟机已停止"
}

status_all() {
    log_info "检查虚拟机状态..."
    echo ""
    sudo_cmd "$DOCKER_CMD ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep -E 'windows-vm|macos-vm|NAMES'" || echo "无运行中的虚拟机"
    echo ""
    log_info "系统资源:"
    ssh_cmd "free -h | head -2"
}

show_help() {
    echo "NAS 虚拟机管理脚本"
    echo ""
    echo "用法: $0 <命令> [虚拟机]"
    echo ""
    echo "命令:"
    echo "  start <windows|macos|all>  启动虚拟机"
    echo "  stop <windows|macos|all>   停止虚拟机"
    echo "  status                     查看状态"
    echo ""
    echo "示例:"
    echo "  $0 start windows    # 启动 Windows"
    echo "  $0 start macos      # 启动 macOS"
    echo "  $0 stop all         # 停止所有"
    echo "  $0 status           # 查看状态"
}

case "$1" in
    start)
        case "$2" in
            windows) start_windows ;;
            macos) start_macos ;;
            all)
                start_windows
                start_macos
                ;;
            *) log_error "用法: $0 start [windows|macos|all]"; exit 1 ;;
        esac
        ;;
    stop)
        case "$2" in
            windows) stop_windows ;;
            macos) stop_macos ;;
            all)
                stop_windows
                stop_macos
                ;;
            *) log_error "用法: $0 stop [windows|macos|all]"; exit 1 ;;
        esac
        ;;
    status)
        status_all
        ;;
    *)
        show_help
        exit 1
        ;;
esac
