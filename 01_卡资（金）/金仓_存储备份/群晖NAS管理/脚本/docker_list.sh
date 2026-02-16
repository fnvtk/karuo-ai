#!/bin/bash
# Docker容器列表脚本
# 用途：列出群晖NAS上所有Docker容器及状态

# 配置
NAS_IP="192.168.1.201"
NAS_USER="fnvtk"
NAS_PASS="zhiqun1984"
DOCKER_CMD="/volume1/@appstore/ContainerManager/usr/bin/docker"
SSH_OPTS="-o KexAlgorithms=+diffie-hellman-group1-sha1 -o Ciphers=+aes128-cbc,3des-cbc,aes192-cbc,aes256-cbc -o StrictHostKeyChecking=no -o ConnectTimeout=10"

# 颜色
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo "========================================"
echo "  Docker容器列表 - $NAS_IP"
echo "========================================"
echo ""

# 检查sshpass
if ! command -v sshpass &> /dev/null; then
    echo -e "${RED}错误: 请先安装sshpass${NC}"
    exit 1
fi

# 获取容器列表
containers=$(sshpass -p "$NAS_PASS" ssh $SSH_OPTS "$NAS_USER@$NAS_IP" \
    "$DOCKER_CMD ps -a --format '{{.Names}}|{{.Image}}|{{.Status}}|{{.Ports}}'" 2>/dev/null)

if [ -z "$containers" ]; then
    echo -e "${RED}无法获取容器列表${NC}"
    exit 1
fi

# 统计
total=0
running=0
stopped=0

echo -e "${CYAN}容器名称                 镜像                          状态${NC}"
echo "--------------------------------------------------------------------------------"

echo "$containers" | while IFS='|' read name image status ports; do
    ((total++))
    
    # 截断显示
    name_display=$(printf "%-24s" "${name:0:24}")
    image_display=$(printf "%-30s" "${image:0:30}")
    
    if [[ "$status" == *"Up"* ]]; then
        ((running++))
        echo -e "${GREEN}●${NC} $name_display $image_display ${GREEN}运行中${NC}"
    else
        ((stopped++))
        echo -e "${RED}●${NC} $name_display $image_display ${RED}已停止${NC}"
    fi
    
    # 显示端口映射
    if [ -n "$ports" ] && [ "$ports" != "-" ]; then
        echo -e "  └─ 端口: ${YELLOW}$ports${NC}"
    fi
done

echo ""
echo "--------------------------------------------------------------------------------"

# 重新统计（因为管道子shell问题）
total=$(echo "$containers" | wc -l | tr -d ' ')
running=$(echo "$containers" | grep -c "Up")
stopped=$((total - running))

echo -e "总计: $total 个容器 | ${GREEN}运行: $running${NC} | ${RED}停止: $stopped${NC}"
echo ""

# 常用操作提示
echo "常用操作:"
echo "  启动容器: ssh $NAS_USER@$NAS_IP \"$DOCKER_CMD start <容器名>\""
echo "  停止容器: ssh $NAS_USER@$NAS_IP \"$DOCKER_CMD stop <容器名>\""
echo "  查看日志: ssh $NAS_USER@$NAS_IP \"$DOCKER_CMD logs -f <容器名>\""
