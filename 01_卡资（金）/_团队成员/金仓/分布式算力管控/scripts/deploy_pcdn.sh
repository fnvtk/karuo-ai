#!/bin/bash
# ============================================================
#  PCDN节点一键部署
#  支持: 网心云 / 甜糖
#  前提: Docker
#  用法: bash deploy_pcdn.sh --platform wangxinyun
# ============================================================

RED='\033[91m'; GREEN='\033[92m'; YELLOW='\033[93m'
BLUE='\033[94m'; CYAN='\033[96m'; NC='\033[0m'

PLATFORM="${2:-wangxinyun}"
DATA_DIR="/data"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --platform) PLATFORM="$2"; shift 2 ;;
        --data-dir) DATA_DIR="$2"; shift 2 ;;
        *) shift ;;
    esac
done

echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════╗"
echo "║            PCDN节点部署 v1.0                          ║"
echo "║            平台: $PLATFORM"
echo "╚═══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ---- 安装Docker ----
install_docker() {
    if ! command -v docker &>/dev/null; then
        echo -e "${BLUE}[*] 安装Docker...${NC}"
        curl -fsSL https://get.docker.com | bash
        systemctl enable docker
        systemctl start docker
        echo -e "${GREEN}[✓] Docker已安装${NC}"
    else
        echo -e "${GREEN}[✓] Docker已存在${NC}"
    fi
}

install_docker

case "$PLATFORM" in

    # ========== 网心云 ==========
    wangxinyun|wxedge)
        echo -e "${BLUE}[*] 部署网心云容器...${NC}"
        
        mkdir -p "$DATA_DIR/wxedge"
        
        # 停止旧容器
        docker stop wxedge 2>/dev/null
        docker rm wxedge 2>/dev/null
        
        docker pull onething1/wxedge:latest
        
        docker run -d \
            --name wxedge \
            --restart=always \
            --net=host \
            --privileged \
            -v "$DATA_DIR/wxedge:/storage" \
            onething1/wxedge:latest
        
        echo ""
        echo -e "${GREEN}════════════════════════════════════════════════${NC}"
        echo -e "${GREEN}  网心云部署完成！${NC}"
        echo -e "${GREEN}════════════════════════════════════════════════${NC}"
        echo ""
        echo -e "  管理页面: ${CYAN}http://$(hostname -I | awk '{print $1}'):18888${NC}"
        echo -e "  存储目录: $DATA_DIR/wxedge"
        echo -e "  下一步: 在管理页面绑定账号"
        ;;

    # ========== 甜糖 ==========
    tiantang|ttnode)
        echo -e "${BLUE}[*] 部署甜糖容器...${NC}"
        
        mkdir -p "$DATA_DIR/ttnode"
        
        docker stop ttnode 2>/dev/null
        docker rm ttnode 2>/dev/null
        
        docker pull tiptime/ttnode:latest 2>/dev/null || docker pull tiantang/ttnode:latest 2>/dev/null
        
        docker run -d \
            --name ttnode \
            --restart=always \
            --net=host \
            -v "$DATA_DIR/ttnode:/mnts" \
            tiptime/ttnode:latest 2>/dev/null || \
        docker run -d \
            --name ttnode \
            --restart=always \
            --net=host \
            -v "$DATA_DIR/ttnode:/mnts" \
            tiantang/ttnode:latest
        
        echo ""
        echo -e "${GREEN}  甜糖部署完成！${NC}"
        echo -e "  存储目录: $DATA_DIR/ttnode"
        ;;

    *)
        echo -e "${RED}[!] 不支持的平台: $PLATFORM${NC}"
        echo "支持: wangxinyun / tiantang"
        exit 1
        ;;
esac
