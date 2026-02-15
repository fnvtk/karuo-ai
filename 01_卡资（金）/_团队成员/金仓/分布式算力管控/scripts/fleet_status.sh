#!/bin/bash
# ============================================================
#  机群状态查询 - 本机检查所有算力服务状态
#  用法: bash fleet_status.sh
# ============================================================

RED='\033[91m'; GREEN='\033[92m'; YELLOW='\033[93m'
BLUE='\033[94m'; CYAN='\033[96m'; NC='\033[0m'

echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════╗"
echo "║            算力节点状态 - $(hostname)"
echo "║            $(date '+%Y-%m-%d %H:%M:%S')"
echo "╚═══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ---- 系统资源 ----
echo -e "${BLUE}── 系统资源 ──────────────────────────────────${NC}"
echo -e "  CPU核心:  $(nproc) 核"
echo -e "  CPU使用:  $(top -bn1 | grep 'Cpu(s)' | awk '{printf "%.1f%%", $2}' 2>/dev/null || echo 'N/A')"
echo -e "  内存使用: $(free | grep Mem | awk '{printf "%.0f%%", $3/$2*100}') ($(free -h | grep Mem | awk '{print $3}') / $(free -h | grep Mem | awk '{print $2}'))"
echo -e "  磁盘使用: $(df -h / | tail -1 | awk '{print $5}') ($(df -h / | tail -1 | awk '{print $3}') / $(df -h / | tail -1 | awk '{print $2}'))"

# GPU
if command -v nvidia-smi &>/dev/null; then
    echo -e "  GPU:      $(nvidia-smi --query-gpu=name,utilization.gpu,temperature.gpu --format=csv,noheader 2>/dev/null | head -1)"
fi

# ---- XMRig 状态 ----
echo -e "\n${BLUE}── 💎 XMRig (CPU挖矿) ────────────────────────${NC}"
if pgrep -f xmrig > /dev/null 2>&1; then
    PID=$(pgrep -f xmrig | head -1)
    CPU=$(ps -p $PID -o %cpu= 2>/dev/null)
    MEM=$(ps -p $PID -o %mem= 2>/dev/null)
    UPTIME=$(ps -p $PID -o etime= 2>/dev/null)
    echo -e "  状态: ${GREEN}运行中${NC} (PID: $PID)"
    echo -e "  CPU: ${CPU}% | 内存: ${MEM}% | 运行时间: $UPTIME"
else
    echo -e "  状态: ${YELLOW}未运行${NC}"
fi

# ---- GPU矿机状态 ----
echo -e "\n${BLUE}── 🎮 GPU矿机 ────────────────────────────────${NC}"
if pgrep -f "t-rex\|nbminer\|lolminer" > /dev/null 2>&1; then
    PID=$(pgrep -f "t-rex\|nbminer" | head -1)
    echo -e "  状态: ${GREEN}运行中${NC} (PID: $PID)"
else
    echo -e "  状态: ${YELLOW}未运行${NC}"
fi

# ---- PCDN状态 ----
echo -e "\n${BLUE}── 📡 PCDN节点 ────────────────────────────────${NC}"
# 网心云
if docker ps --format '{{.Names}}' 2>/dev/null | grep -q wxedge; then
    echo -e "  网心云: ${GREEN}运行中${NC}"
else
    echo -e "  网心云: ${YELLOW}未运行${NC}"
fi

# 甜糖
if docker ps --format '{{.Names}}' 2>/dev/null | grep -q ttnode; then
    echo -e "  甜糖:   ${GREEN}运行中${NC}"
else
    echo -e "  甜糖:   ${YELLOW}未运行${NC}"
fi

# ---- 存储节点状态 ----
echo -e "\n${BLUE}── 💾 存储节点 ────────────────────────────────${NC}"
if docker ps --format '{{.Names}}' 2>/dev/null | grep -q storagenode; then
    echo -e "  Storj: ${GREEN}运行中${NC}"
else
    echo -e "  Storj: ${YELLOW}未运行${NC}"
fi

# ---- 网络连接 ----
echo -e "\n${BLUE}── 🌐 网络连接 ────────────────────────────────${NC}"
ESTAB=$(ss -tnp 2>/dev/null | grep ESTAB | wc -l)
echo -e "  活跃连接: $ESTAB 个"

# 检查矿池连接
POOL_CONN=$(ss -tnp 2>/dev/null | grep ESTAB | grep -iE "hashvault|c3pool|nanopool|2miners" | wc -l)
if [ "$POOL_CONN" -gt 0 ]; then
    echo -e "  矿池连接: ${GREEN}$POOL_CONN 个${NC}"
fi

echo ""
echo -e "${CYAN}════════════════════════════════════════════════${NC}"
