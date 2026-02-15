#!/bin/bash
# ============================================================
#  矿机一键部署 - 本机执行
#  支持: XMRig(CPU) / T-Rex(GPU) / NBMiner(GPU)
#  用法: bash deploy_miner.sh --type cpu --pool "POOL" --wallet "WALLET"
# ============================================================

RED='\033[91m'; GREEN='\033[92m'; YELLOW='\033[93m'
BLUE='\033[94m'; CYAN='\033[96m'; NC='\033[0m'

INSTALL_DIR="/opt/karuo-compute/miners"

# 默认值
TYPE="cpu"
POOL=""
WALLET=""
WORKER=$(hostname)
MAX_CPU=80
GPU_MINER="trex"

# 解析参数
while [[ $# -gt 0 ]]; do
    case "$1" in
        --type) TYPE="$2"; shift 2 ;;
        --pool) POOL="$2"; shift 2 ;;
        --wallet) WALLET="$2"; shift 2 ;;
        --worker) WORKER="$2"; shift 2 ;;
        --max-cpu) MAX_CPU="$2"; shift 2 ;;
        --miner) GPU_MINER="$2"; shift 2 ;;
        *) shift ;;
    esac
done

echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════╗"
echo "║            矿机一键部署 v1.0                          ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# 检查钱包
if [ -z "$WALLET" ]; then
    echo -e "${RED}[!] 必须指定钱包地址: --wallet YOUR_WALLET${NC}"
    echo ""
    echo "用法:"
    echo "  CPU挖矿: bash deploy_miner.sh --type cpu --wallet YOUR_XMR_WALLET"
    echo "  GPU挖矿: bash deploy_miner.sh --type gpu --wallet YOUR_ETH_WALLET"
    exit 1
fi

# ========== CPU 挖矿 (XMRig) ==========
if [ "$TYPE" = "cpu" ]; then
    
    [ -z "$POOL" ] && POOL="pool.hashvault.pro:443"
    
    echo -e "${BLUE}[*] 部署 XMRig (CPU挖矿)${NC}"
    echo -e "    矿池: $POOL"
    echo -e "    钱包: ${WALLET:0:20}...${WALLET: -8}"
    echo -e "    矿工: $WORKER"
    echo -e "    CPU:  ${MAX_CPU}%"
    echo ""
    
    DIR="$INSTALL_DIR/xmrig"
    mkdir -p "$DIR"
    
    # 下载
    if [ ! -f "$DIR/xmrig" ]; then
        echo -e "${BLUE}[*] 下载 XMRig...${NC}"
        wget -q "https://github.com/xmrig/xmrig/releases/download/v6.22.2/xmrig-6.22.2-linux-static-x64.tar.gz" -O /tmp/xmrig.tar.gz
        tar xzf /tmp/xmrig.tar.gz -C "$DIR" --strip-components=1
        rm -f /tmp/xmrig.tar.gz
        echo -e "${GREEN}[✓] XMRig 已下载${NC}"
    fi
    
    # TLS判断
    TLS="false"
    [[ "$POOL" == *":443"* ]] && TLS="true"
    
    # 配置
    cat > "$DIR/config.json" << XEOF
{
    "autosave": true,
    "background": true,
    "cpu": { "enabled": true, "max-threads-hint": $MAX_CPU, "priority": 1 },
    "pools": [{
        "url": "$POOL",
        "user": "$WALLET.$WORKER",
        "pass": "x",
        "tls": $TLS,
        "keepalive": true
    }],
    "print-time": 60,
    "donate-level": 1
}
XEOF
    
    # 启动脚本
    cat > "$DIR/start.sh" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
pkill -f xmrig 2>/dev/null; sleep 1
screen -dmS xmrig ./xmrig -c config.json
echo "XMRig 已启动 → screen -r xmrig 查看"
EOF
    chmod +x "$DIR/start.sh"
    
    cat > "$DIR/stop.sh" << 'EOF'
#!/bin/bash
pkill -f xmrig && echo "XMRig 已停止" || echo "XMRig 未运行"
EOF
    chmod +x "$DIR/stop.sh"
    
    # 开机自启
    (crontab -l 2>/dev/null | grep -v "xmrig"; echo "@reboot $DIR/start.sh") | crontab -
    
    # 启动
    "$DIR/start.sh"
    
    echo ""
    echo -e "${GREEN}════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  XMRig 部署完成！${NC}"
    echo -e "${GREEN}════════════════════════════════════════════════${NC}"
    echo -e "  查看: screen -r xmrig"
    echo -e "  停止: $DIR/stop.sh"
    echo -e "  启动: $DIR/start.sh"

# ========== GPU 挖矿 ==========
elif [ "$TYPE" = "gpu" ]; then
    
    # 检查GPU
    if ! command -v nvidia-smi &>/dev/null; then
        echo -e "${RED}[!] 未检测到 nvidia-smi，请先安装NVIDIA驱动${NC}"
        exit 1
    fi
    
    GPU_NAME=$(nvidia-smi --query-gpu=name --format=csv,noheader | head -1)
    GPU_COUNT=$(nvidia-smi -L | wc -l)
    echo -e "${GREEN}[✓] 检测到 GPU: $GPU_NAME x$GPU_COUNT${NC}"
    
    [ -z "$POOL" ] && POOL="stratum+tcp://eth.2miners.com:2020"
    
    DIR="$INSTALL_DIR/gpu"
    mkdir -p "$DIR"
    
    if [ "$GPU_MINER" = "trex" ]; then
        if [ ! -f "$DIR/t-rex" ]; then
            echo -e "${BLUE}[*] 下载 T-Rex...${NC}"
            wget -q "https://github.com/trexminer/T-Rex/releases/download/0.26.8/t-rex-0.26.8-linux.tar.gz" -O /tmp/trex.tar.gz
            tar xzf /tmp/trex.tar.gz -C "$DIR"
            rm -f /tmp/trex.tar.gz
        fi
        
        cat > "$DIR/start.sh" << GEOF
#!/bin/bash
cd "\$(dirname "\$0")"
screen -dmS gpu_miner ./t-rex -a ethash -o $POOL -u $WALLET -p x -w $WORKER
echo "T-Rex GPU矿机已启动 → screen -r gpu_miner"
GEOF
    fi
    
    chmod +x "$DIR/start.sh"
    cat > "$DIR/stop.sh" << 'EOF'
#!/bin/bash
pkill -f "t-rex\|nbminer" && echo "GPU矿机已停止" || echo "GPU矿机未运行"
EOF
    chmod +x "$DIR/stop.sh"
    
    "$DIR/start.sh"
    
    echo -e "${GREEN}  GPU矿机部署完成！${NC}"

else
    echo -e "${RED}[!] 未知类型: $TYPE (支持: cpu / gpu)${NC}"
    exit 1
fi
