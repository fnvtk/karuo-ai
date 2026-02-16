#!/bin/bash
# ============================================================
#  存储节点一键部署
#  支持: Storj / Filecoin(Lotus)
#  前提: Docker, 大容量磁盘
#  用法: bash deploy_storage.sh --platform storj --size 500GB
# ============================================================

RED='\033[91m'; GREEN='\033[92m'; YELLOW='\033[93m'
BLUE='\033[94m'; CYAN='\033[96m'; NC='\033[0m'

PLATFORM="storj"
STORAGE_SIZE="500GB"
STORAGE_PATH="/data/storage"
WALLET=""
EMAIL=""
PUBLIC_IP=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --platform) PLATFORM="$2"; shift 2 ;;
        --size) STORAGE_SIZE="$2"; shift 2 ;;
        --path) STORAGE_PATH="$2"; shift 2 ;;
        --wallet) WALLET="$2"; shift 2 ;;
        --email) EMAIL="$2"; shift 2 ;;
        --ip) PUBLIC_IP="$2"; shift 2 ;;
        *) shift ;;
    esac
done

echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════╗"
echo "║            存储节点部署 v1.0                          ║"
echo "║            平台: $PLATFORM | 大小: $STORAGE_SIZE"
echo "╚═══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Docker
if ! command -v docker &>/dev/null; then
    echo -e "${BLUE}[*] 安装Docker...${NC}"
    curl -fsSL https://get.docker.com | bash
    systemctl enable docker && systemctl start docker
fi

case "$PLATFORM" in

    # ========== Storj ==========
    storj)
        echo -e "${BLUE}[*] 部署Storj存储节点...${NC}"
        
        if [ -z "$WALLET" ] || [ -z "$EMAIL" ]; then
            echo -e "${YELLOW}[!] Storj需要以下信息:${NC}"
            [ -z "$WALLET" ] && read -p "  ETH钱包地址: " WALLET
            [ -z "$EMAIL" ] && read -p "  邮箱: " EMAIL
        fi
        
        [ -z "$PUBLIC_IP" ] && PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null)
        
        mkdir -p "$STORAGE_PATH" /opt/storj/identity
        
        echo -e "${YELLOW}[!] Storj需要先生成identity，可能需要较长时间${NC}"
        echo -e "${YELLOW}[!] 详见: https://docs.storj.io/node${NC}"
        
        cat > /opt/storj/start.sh << SEOF
#!/bin/bash
docker run -d --restart unless-stopped \\
    --stop-timeout 300 \\
    -p 28967:28967/tcp \\
    -p 28967:28967/udp \\
    -p 14002:14002 \\
    -e WALLET="$WALLET" \\
    -e EMAIL="$EMAIL" \\
    -e ADDRESS="$PUBLIC_IP:28967" \\
    -e STORAGE="$STORAGE_SIZE" \\
    --mount type=bind,source=/opt/storj/identity,destination=/app/identity \\
    --mount type=bind,source=$STORAGE_PATH,destination=/app/config \\
    --name storagenode \\
    storjlabs/storagenode:latest
echo "Storj节点已启动"
echo "仪表盘: http://localhost:14002"
SEOF
        chmod +x /opt/storj/start.sh
        
        echo ""
        echo -e "${GREEN}  Storj脚本已生成: /opt/storj/start.sh${NC}"
        echo -e "  存储路径: $STORAGE_PATH"
        echo -e "  大小: $STORAGE_SIZE"
        echo -e "  ${YELLOW}需要先完成identity生成后再启动${NC}"
        ;;

    *)
        echo -e "${RED}[!] 不支持的平台: $PLATFORM${NC}"
        echo "支持: storj"
        exit 1
        ;;
esac
