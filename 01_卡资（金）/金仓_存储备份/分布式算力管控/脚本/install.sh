#!/bin/bash
# ============================================================
#  分布式算力管控 - 一键安装脚本
#  在任意 Linux 机器上执行即可完成环境准备
#  用法: bash install.sh [--mode cpu|gpu|pcdn|storage|all]
# ============================================================

set -e

RED='\033[91m'; GREEN='\033[92m'; YELLOW='\033[93m'
BLUE='\033[94m'; CYAN='\033[96m'; NC='\033[0m'

INSTALL_DIR="/opt/karuo-compute"
CONFIG_FILE="$INSTALL_DIR/config.json"

banner() {
    echo -e "${CYAN}"
    echo "╔═══════════════════════════════════════════════════════╗"
    echo "║     分布式算力管控 - 一键安装 v1.0                    ║"
    echo "║     支持: CPU矿机 / GPU矿机 / PCDN / 存储节点        ║"
    echo "╚═══════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

log() { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err() { echo -e "${RED}[✗]${NC} $1"; }

# ---- 检测系统信息 ----
detect_system() {
    echo -e "\n${BLUE}[*] 检测系统信息...${NC}"
    
    HOSTNAME=$(hostname)
    OS=$(cat /etc/os-release 2>/dev/null | grep "^ID=" | cut -d= -f2 | tr -d '"')
    CPU_CORES=$(nproc 2>/dev/null || echo 0)
    CPU_MODEL=$(grep 'model name' /proc/cpuinfo 2>/dev/null | head -1 | cut -d: -f2 | xargs)
    RAM_GB=$(free -g 2>/dev/null | grep Mem | awk '{print $2}')
    DISK_GB=$(df -BG / 2>/dev/null | tail -1 | awk '{print $4}' | tr -d 'G')
    
    # GPU检测
    GPU_COUNT=0
    GPU_INFO=""
    if command -v nvidia-smi &>/dev/null; then
        GPU_COUNT=$(nvidia-smi -L 2>/dev/null | wc -l)
        GPU_INFO=$(nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null | head -1)
    fi
    
    log "主机名: $HOSTNAME"
    log "系统:   $OS"
    log "CPU:    $CPU_MODEL ($CPU_CORES 核)"
    log "内存:   ${RAM_GB}GB"
    log "磁盘可用: ${DISK_GB}GB"
    
    if [ "$GPU_COUNT" -gt 0 ]; then
        log "GPU:    $GPU_INFO (${GPU_COUNT}张)"
    else
        warn "GPU:    未检测到NVIDIA显卡"
    fi
}

# ---- 安装基础依赖 ----
install_deps() {
    echo -e "\n${BLUE}[*] 安装基础依赖...${NC}"
    
    if command -v apt-get &>/dev/null; then
        apt-get update -qq
        apt-get install -y -qq wget curl jq screen htop > /dev/null 2>&1
    elif command -v yum &>/dev/null; then
        yum install -y -q wget curl jq screen htop > /dev/null 2>&1
    elif command -v dnf &>/dev/null; then
        dnf install -y -q wget curl jq screen htop > /dev/null 2>&1
    fi
    
    log "基础依赖已安装"
}

# ---- 创建工作目录 ----
setup_dirs() {
    echo -e "\n${BLUE}[*] 创建工作目录...${NC}"
    
    mkdir -p "$INSTALL_DIR"/{miners,pcdn,storage,logs,config}
    
    log "工作目录: $INSTALL_DIR"
}

# ---- 生成默认配置 ----
generate_config() {
    if [ ! -f "$CONFIG_FILE" ]; then
        cat > "$CONFIG_FILE" << 'JSONEOF'
{
  "node_name": "CHANGE_ME",
  
  "xmrig": {
    "pool": "pool.hashvault.pro:443",
    "wallet": "YOUR_XMR_WALLET",
    "max_cpu_percent": 80,
    "tls": true
  },
  
  "gpu_miner": {
    "type": "trex",
    "pool": "stratum+tcp://eth.2miners.com:2020",
    "wallet": "YOUR_ETH_WALLET"
  },
  
  "pcdn": {
    "platform": "wangxinyun",
    "device_code": "YOUR_CODE"
  },
  
  "storage": {
    "platform": "storj",
    "token": "YOUR_TOKEN",
    "path": "/data/storj",
    "size": "500GB"
  }
}
JSONEOF
        warn "配置文件已生成: $CONFIG_FILE"
        warn "请编辑配置文件填入你的钱包地址和账号信息"
    else
        log "配置文件已存在"
    fi
}

# ---- 安装 XMRig (CPU挖矿) ----
install_xmrig() {
    echo -e "\n${BLUE}[*] 安装 XMRig (CPU挖矿)...${NC}"
    
    local XMRIG_DIR="$INSTALL_DIR/miners/xmrig"
    mkdir -p "$XMRIG_DIR"
    
    # 下载最新版
    local XMRIG_URL="https://github.com/xmrig/xmrig/releases/download/v6.22.2/xmrig-6.22.2-linux-static-x64.tar.gz"
    
    if [ ! -f "$XMRIG_DIR/xmrig" ]; then
        wget -q "$XMRIG_URL" -O /tmp/xmrig.tar.gz 2>/dev/null
        tar xzf /tmp/xmrig.tar.gz -C "$XMRIG_DIR" --strip-components=1
        rm -f /tmp/xmrig.tar.gz
        log "XMRig 已下载"
    else
        log "XMRig 已存在"
    fi
    
    # 读取配置
    local POOL=$(jq -r '.xmrig.pool' "$CONFIG_FILE" 2>/dev/null)
    local WALLET=$(jq -r '.xmrig.wallet' "$CONFIG_FILE" 2>/dev/null)
    local MAX_CPU=$(jq -r '.xmrig.max_cpu_percent' "$CONFIG_FILE" 2>/dev/null)
    local NODE_NAME=$(jq -r '.node_name' "$CONFIG_FILE" 2>/dev/null)
    local USE_TLS=$(jq -r '.xmrig.tls' "$CONFIG_FILE" 2>/dev/null)
    
    [ "$POOL" = "null" ] && POOL="pool.hashvault.pro:443"
    [ "$WALLET" = "null" ] && WALLET="YOUR_XMR_WALLET"
    [ "$MAX_CPU" = "null" ] && MAX_CPU=80
    [ "$NODE_NAME" = "null" ] && NODE_NAME="$HOSTNAME"
    [ "$USE_TLS" = "null" ] && USE_TLS=true
    
    # 生成XMRig配置
    cat > "$XMRIG_DIR/config.json" << XEOF
{
    "autosave": true,
    "background": true,
    "cpu": {
        "enabled": true,
        "max-threads-hint": $MAX_CPU,
        "priority": 1
    },
    "pools": [{
        "url": "$POOL",
        "user": "$WALLET.$NODE_NAME",
        "pass": "x",
        "tls": $USE_TLS,
        "keepalive": true
    }],
    "print-time": 60,
    "donate-level": 1
}
XEOF
    
    # 创建启动/停止脚本
    cat > "$XMRIG_DIR/start.sh" << 'SEOF'
#!/bin/bash
cd "$(dirname "$0")"
if pgrep -f "xmrig" > /dev/null; then
    echo "XMRig 已在运行"
else
    screen -dmS xmrig ./xmrig -c config.json
    echo "XMRig 已启动 (screen: xmrig)"
fi
SEOF
    chmod +x "$XMRIG_DIR/start.sh"
    
    cat > "$XMRIG_DIR/stop.sh" << 'SEOF'
#!/bin/bash
pkill -f "xmrig" 2>/dev/null && echo "XMRig 已停止" || echo "XMRig 未运行"
SEOF
    chmod +x "$XMRIG_DIR/stop.sh"
    
    log "XMRig 配置完成"
    log "启动: $XMRIG_DIR/start.sh"
    log "停止: $XMRIG_DIR/stop.sh"
}

# ---- 安装 GPU 矿机 ----
install_gpu_miner() {
    echo -e "\n${BLUE}[*] 安装 GPU 矿机...${NC}"
    
    if [ "$GPU_COUNT" -eq 0 ]; then
        warn "未检测到GPU，跳过GPU矿机安装"
        return
    fi
    
    local GPU_DIR="$INSTALL_DIR/miners/gpu"
    mkdir -p "$GPU_DIR"
    
    local MINER_TYPE=$(jq -r '.gpu_miner.type' "$CONFIG_FILE" 2>/dev/null)
    [ "$MINER_TYPE" = "null" ] && MINER_TYPE="trex"
    
    if [ "$MINER_TYPE" = "trex" ]; then
        local TREX_URL="https://github.com/trexminer/T-Rex/releases/download/0.26.8/t-rex-0.26.8-linux.tar.gz"
        if [ ! -f "$GPU_DIR/t-rex" ]; then
            wget -q "$TREX_URL" -O /tmp/trex.tar.gz 2>/dev/null
            tar xzf /tmp/trex.tar.gz -C "$GPU_DIR"
            rm -f /tmp/trex.tar.gz
            log "T-Rex 已下载"
        fi
    fi
    
    local POOL=$(jq -r '.gpu_miner.pool' "$CONFIG_FILE" 2>/dev/null)
    local WALLET=$(jq -r '.gpu_miner.wallet' "$CONFIG_FILE" 2>/dev/null)
    
    cat > "$GPU_DIR/start.sh" << SEOF
#!/bin/bash
cd "\$(dirname "\$0")"
screen -dmS gpu_miner ./t-rex -a ethash -o $POOL -u $WALLET -p x
echo "GPU矿机已启动 (screen: gpu_miner)"
SEOF
    chmod +x "$GPU_DIR/start.sh"
    
    cat > "$GPU_DIR/stop.sh" << 'SEOF'
#!/bin/bash
pkill -f "t-rex" 2>/dev/null && echo "GPU矿机已停止" || echo "GPU矿机未运行"
SEOF
    chmod +x "$GPU_DIR/stop.sh"
    
    log "GPU矿机配置完成"
}

# ---- 安装 PCDN ----
install_pcdn() {
    echo -e "\n${BLUE}[*] 安装 PCDN 节点...${NC}"
    
    local PCDN_DIR="$INSTALL_DIR/pcdn"
    local PLATFORM=$(jq -r '.pcdn.platform' "$CONFIG_FILE" 2>/dev/null)
    [ "$PLATFORM" = "null" ] && PLATFORM="wangxinyun"
    
    case "$PLATFORM" in
        wangxinyun)
            warn "网心云需要手动安装Docker镜像"
            warn "步骤: 1) 安装Docker  2) docker pull onething1/wxedge  3) docker run"
            
            # 安装Docker（如未安装）
            if ! command -v docker &>/dev/null; then
                curl -fsSL https://get.docker.com | bash
                systemctl enable docker
                systemctl start docker
                log "Docker 已安装"
            fi
            
            cat > "$PCDN_DIR/start_wangxinyun.sh" << 'SEOF'
#!/bin/bash
docker pull onething1/wxedge:latest
docker run -d --name wxedge \
    --restart=always \
    --net=host \
    --privileged \
    -v /data/wxedge:/storage \
    onething1/wxedge:latest
echo "网心云容器已启动"
echo "访问 http://本机IP:18888 进行绑定"
SEOF
            chmod +x "$PCDN_DIR/start_wangxinyun.sh"
            log "网心云脚本已生成: $PCDN_DIR/start_wangxinyun.sh"
            ;;
        
        tiantang)
            warn "甜糖需要Docker安装"
            cat > "$PCDN_DIR/start_tiantang.sh" << 'SEOF'
#!/bin/bash
if ! command -v docker &>/dev/null; then
    curl -fsSL https://get.docker.com | bash
    systemctl enable docker && systemctl start docker
fi
docker pull tiantang/ttnode:latest
docker run -d --name ttnode \
    --restart=always \
    --net=host \
    -v /data/ttnode:/mnts \
    tiantang/ttnode:latest
echo "甜糖容器已启动"
SEOF
            chmod +x "$PCDN_DIR/start_tiantang.sh"
            log "甜糖脚本已生成"
            ;;
    esac
}

# ---- 安装存储节点 ----
install_storage() {
    echo -e "\n${BLUE}[*] 安装存储节点...${NC}"
    
    local STORAGE_DIR="$INSTALL_DIR/storage"
    local PLATFORM=$(jq -r '.storage.platform' "$CONFIG_FILE" 2>/dev/null)
    [ "$PLATFORM" = "null" ] && PLATFORM="storj"
    
    case "$PLATFORM" in
        storj)
            local TOKEN=$(jq -r '.storage.token' "$CONFIG_FILE" 2>/dev/null)
            local SPATH=$(jq -r '.storage.path' "$CONFIG_FILE" 2>/dev/null)
            local SSIZE=$(jq -r '.storage.size' "$CONFIG_FILE" 2>/dev/null)
            
            [ "$SPATH" = "null" ] && SPATH="/data/storj"
            [ "$SSIZE" = "null" ] && SSIZE="500GB"
            
            mkdir -p "$SPATH"
            
            cat > "$STORAGE_DIR/start_storj.sh" << SEOF
#!/bin/bash
# Storj 存储节点
# 需要先安装: curl -L https://github.com/storj/storj/releases/latest/download/identity_linux_amd64.zip

if ! command -v docker &>/dev/null; then
    curl -fsSL https://get.docker.com | bash
    systemctl enable docker && systemctl start docker
fi

docker run -d --restart unless-stopped \\
    --stop-timeout 300 \\
    -p 28967:28967/tcp -p 28967:28967/udp \\
    -p 14002:14002 \\
    -e WALLET="YOUR_WALLET" \\
    -e EMAIL="YOUR_EMAIL" \\
    -e ADDRESS="YOUR_PUBLIC_IP:28967" \\
    -e STORAGE="$SSIZE" \\
    --mount type=bind,source="$SPATH",destination=/app/config \\
    --name storagenode storjlabs/storagenode:latest

echo "Storj节点已启动"
echo "仪表盘: http://localhost:14002"
SEOF
            chmod +x "$STORAGE_DIR/start_storj.sh"
            log "Storj 脚本已生成"
            ;;
    esac
}

# ---- 安装开机自启 ----
setup_autostart() {
    echo -e "\n${BLUE}[*] 配置开机自启...${NC}"
    
    cat > /etc/systemd/system/karuo-compute.service << SEOF
[Unit]
Description=Karuo Compute Node
After=network.target docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=$INSTALL_DIR/miners/xmrig/start.sh

[Install]
WantedBy=multi-user.target
SEOF
    
    systemctl daemon-reload
    systemctl enable karuo-compute.service 2>/dev/null
    log "开机自启已配置"
}

# ---- 主流程 ----
main() {
    banner
    
    local MODE="${1:---all}"
    MODE="${MODE/--mode /}"
    MODE="${MODE/--/}"
    [ -z "$MODE" ] && MODE="all"
    
    detect_system
    install_deps
    setup_dirs
    generate_config
    
    case "$MODE" in
        cpu)
            install_xmrig
            ;;
        gpu)
            install_xmrig
            install_gpu_miner
            ;;
        pcdn)
            install_pcdn
            ;;
        storage)
            install_storage
            ;;
        all)
            install_xmrig
            install_gpu_miner
            install_pcdn
            install_storage
            ;;
        *)
            err "未知模式: $MODE"
            echo "用法: bash install.sh [--mode cpu|gpu|pcdn|storage|all]"
            exit 1
            ;;
    esac
    
    setup_autostart
    
    echo ""
    echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  安装完成！${NC}"
    echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "  工作目录: ${GREEN}$INSTALL_DIR${NC}"
    echo -e "  配置文件: ${GREEN}$CONFIG_FILE${NC}"
    echo ""
    echo -e "  ${YELLOW}下一步：${NC}"
    echo -e "  1. 编辑 $CONFIG_FILE 填入钱包地址"
    echo -e "  2. 启动矿机: $INSTALL_DIR/miners/xmrig/start.sh"
    echo -e "  3. 查看状态: screen -r xmrig"
    echo ""
}

# 解析参数
MODE="all"
while [[ $# -gt 0 ]]; do
    case "$1" in
        --mode) MODE="$2"; shift 2 ;;
        --cpu) MODE="cpu"; shift ;;
        --gpu) MODE="gpu"; shift ;;
        --pcdn) MODE="pcdn"; shift ;;
        --storage) MODE="storage"; shift ;;
        --all) MODE="all"; shift ;;
        *) shift ;;
    esac
done

main "--$MODE"
