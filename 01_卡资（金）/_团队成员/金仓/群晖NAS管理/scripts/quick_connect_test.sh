#!/bin/bash
# 群晖NAS快速连接测试
# 用途：验证SSH连接和基本服务可用性

# 配置
NAS_IP="192.168.1.201"
NAS_USER="fnvtk"
NAS_PASS="zhiqun1984"
SSH_OPTS="-o KexAlgorithms=+diffie-hellman-group1-sha1 -o Ciphers=+aes128-cbc,3des-cbc,aes192-cbc,aes256-cbc -o StrictHostKeyChecking=no -o ConnectTimeout=5"

# 颜色
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  群晖NAS快速连接测试${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  目标NAS: ${YELLOW}$NAS_IP${NC}"
echo -e "  用户名: ${YELLOW}$NAS_USER${NC}"
echo ""

# 检查依赖
if ! command -v sshpass &> /dev/null; then
    echo -e "${RED}✗ 错误: sshpass未安装${NC}"
    echo "  安装命令: brew install hudochenkov/sshpass/sshpass"
    exit 1
fi

# SSH命令封装
run_ssh() {
    sshpass -p "$NAS_PASS" ssh $SSH_OPTS "$NAS_USER@$NAS_IP" "$1" 2>/dev/null
}

# 1. 网络连通性
echo -e "${CYAN}【测试1/4】网络连通性${NC}"
if ping -c 1 -W 2 $NAS_IP &> /dev/null; then
    echo -e "  ${GREEN}✓${NC} Ping成功"
else
    echo -e "  ${RED}✗${NC} Ping失败"
    exit 1
fi

# 2. SSH连接
echo ""
echo -e "${CYAN}【测试2/4】SSH连接${NC}"
hostname=$(run_ssh "hostname")
if [ -n "$hostname" ]; then
    echo -e "  ${GREEN}✓${NC} SSH连接成功"
    echo -e "  ${GREEN}→${NC} 主机名: $hostname"
    user=$(run_ssh "whoami")
    echo -e "  ${GREEN}→${NC} 当前用户: $user"
else
    echo -e "  ${RED}✗${NC} SSH连接失败"
    exit 1
fi

# 3. 关键服务端口
echo ""
echo -e "${CYAN}【测试3/4】服务端口检查${NC}"

check_port() {
    if nc -z -w2 $NAS_IP $1 2>/dev/null; then
        echo -e "  ${GREEN}✓${NC} $2 (端口 $1)"
    else
        echo -e "  ${RED}✗${NC} $2 (端口 $1)"
    fi
}

check_port 5000 "DSM管理界面"
check_port 22 "SSH服务"
check_port 27017 "MongoDB数据库"
check_port 6333 "Qdrant向量库"

# 4. Docker容器状态
echo ""
echo -e "${CYAN}【测试4/4】Docker容器${NC}"
DOCKER_CMD="/volume1/@appstore/ContainerManager/usr/bin/docker"
containers=$(run_ssh "$DOCKER_CMD ps --format '{{.Names}}|{{.Status}}'" 2>/dev/null)

if [ -n "$containers" ]; then
    count=$(echo "$containers" | wc -l | tr -d ' ')
    echo -e "  ${GREEN}✓${NC} 找到 $count 个运行中的容器"
    
    # 检查MongoDB
    if echo "$containers" | grep -qi "mongo"; then
        mongo_status=$(echo "$containers" | grep -i "mongo" | cut -d'|' -f2)
        echo -e "  ${GREEN}→${NC} MongoDB容器: $mongo_status"
    else
        echo -e "  ${YELLOW}⚠${NC} 未找到MongoDB容器"
    fi
else
    echo -e "  ${YELLOW}⚠${NC} 无法获取容器信息"
fi

# 总结
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ 连接测试完成！${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "下一步："
echo "  • 查看NAS状态: ./nas_status.sh"
echo "  • 查看容器列表: ./docker_list.sh"
echo "  • 获取MongoDB信息: python3 ./get_mongodb_info.py"
echo "  • 测试DSM API: python3 ./synology_api_demo.py"
echo ""
