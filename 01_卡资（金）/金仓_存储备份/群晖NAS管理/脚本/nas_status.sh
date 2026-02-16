#!/bin/bash
# NAS状态检查脚本
# 用途：一键检查群晖NAS各项服务状态

# 配置
NAS_IP="192.168.1.201"
NAS_USER="fnvtk"
NAS_PASS="zhiqun1984"
DOCKER_CMD="/volume1/@appstore/ContainerManager/usr/bin/docker"

# SSH选项（群晖旧版算法兼容）
SSH_OPTS="-o KexAlgorithms=+diffie-hellman-group1-sha1 -o Ciphers=+aes128-cbc,3des-cbc,aes192-cbc,aes256-cbc -o StrictHostKeyChecking=no -o ConnectTimeout=10"

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "========================================"
echo "  群晖NAS状态检查 - $NAS_IP"
echo "========================================"
echo ""

# 检查sshpass
if ! command -v sshpass &> /dev/null; then
    echo -e "${RED}错误: 请先安装sshpass${NC}"
    echo "  brew install hudochenkov/sshpass/sshpass"
    exit 1
fi

# SSH命令封装
run_ssh() {
    sshpass -p "$NAS_PASS" ssh $SSH_OPTS "$NAS_USER@$NAS_IP" "$1" 2>/dev/null
}

# 1. 连接测试
echo "【1/6】测试连接..."
result=$(run_ssh "hostname")
if [ -n "$result" ]; then
    echo -e "  ${GREEN}✓ 连接成功${NC} - 主机名: $result"
else
    echo -e "  ${RED}✗ 连接失败${NC}"
    exit 1
fi
echo ""

# 2. 系统信息
echo "【2/6】系统信息..."
uptime=$(run_ssh "uptime")
echo "  负载: $uptime"
echo ""

# 3. 内存使用
echo "【3/6】内存使用..."
run_ssh "free -h" | while read line; do echo "  $line"; done
echo ""

# 4. 磁盘使用
echo "【4/6】磁盘使用..."
run_ssh "df -h | grep -E '^/dev|Filesystem'" | while read line; do echo "  $line"; done
echo ""

# 5. Docker容器
echo "【5/6】Docker容器..."
containers=$(run_ssh "$DOCKER_CMD ps --format '{{.Names}}|{{.Status}}|{{.Ports}}'" 2>/dev/null)
if [ -n "$containers" ]; then
    echo "$containers" | while IFS='|' read name status ports; do
        if [[ "$status" == *"Up"* ]]; then
            echo -e "  ${GREEN}●${NC} $name - $status"
        else
            echo -e "  ${RED}●${NC} $name - $status"
        fi
    done
else
    echo -e "  ${YELLOW}⚠ 无法获取容器信息${NC}"
fi
echo ""

# 6. 关键服务端口
echo "【6/6】服务端口检查..."
check_port() {
    nc -z -w2 $NAS_IP $1 2>/dev/null
    if [ $? -eq 0 ]; then
        echo -e "  ${GREEN}●${NC} $2 (端口$1) - 正常"
    else
        echo -e "  ${RED}●${NC} $2 (端口$1) - 不可达"
    fi
}

check_port 5000 "DSM管理界面"
check_port 27017 "MongoDB"
check_port 6333 "Qdrant"
check_port 8890 "bt-hub中控"
check_port 8888 "本地宝塔"
echo ""

echo "========================================"
echo "  检查完成"
echo "========================================"
