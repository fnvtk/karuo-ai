#!/bin/bash
# NAS API 状态检查脚本
# 用途：通过 DSM API 检查群晖NAS各项服务状态（无需SSH）
# 更新：2026-01-21

# 配置
NAS_IP="192.168.1.201"
NAS_USER="fnvtk"
NAS_PASS="Zhiqun1984"
BASE_URL="http://${NAS_IP}:5000/webapi"

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo "========================================"
echo -e "  ${CYAN}群晖NAS状态检查 (API模式)${NC}"
echo "  IP: $NAS_IP"
echo "========================================"
echo ""

# 1. 网络连通性检查
echo "【1/5】检查网络连通性..."
if ping -c 1 -W 2 $NAS_IP > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} Ping 成功"
else
    echo -e "  ${RED}✗${NC} Ping 失败，请检查网络"
    exit 1
fi

# 检查 DSM 端口
if nc -z -w 3 $NAS_IP 5000 2>/dev/null; then
    echo -e "  ${GREEN}✓${NC} DSM 端口 5000 可达"
else
    echo -e "  ${RED}✗${NC} DSM 端口 5000 不可达"
    exit 1
fi
echo ""

# 2. API 登录
echo "【2/5】API 登录..."
LOGIN_RESP=$(curl -s -m 30 --connect-timeout 10 "${BASE_URL}/auth.cgi?api=SYNO.API.Auth&version=3&method=login&account=${NAS_USER}&passwd=${NAS_PASS}&session=DSMStatus&format=sid")

if echo "$LOGIN_RESP" | python3 -c "import sys,json; exit(0 if json.load(sys.stdin).get('success') else 1)" 2>/dev/null; then
    SID=$(echo "$LOGIN_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['sid'])" 2>/dev/null)
    echo -e "  ${GREEN}✓${NC} 登录成功"
else
    echo -e "  ${RED}✗${NC} 登录失败"
    echo "  响应: $LOGIN_RESP"
    exit 1
fi
echo ""

# 3. 系统信息
echo "【3/5】系统信息..."
SYS_INFO=$(curl -s -m 20 --connect-timeout 10 "${BASE_URL}/entry.cgi?api=SYNO.DSM.Info&version=2&method=getinfo&_sid=$SID")

if echo "$SYS_INFO" | python3 -c "import sys,json; exit(0 if json.load(sys.stdin).get('success') else 1)" 2>/dev/null; then
    MODEL=$(echo "$SYS_INFO" | python3 -c "import sys,json; print(json.load(sys.stdin)['data'].get('model','N/A'))" 2>/dev/null)
    VERSION=$(echo "$SYS_INFO" | python3 -c "import sys,json; print(json.load(sys.stdin)['data'].get('version_string','N/A'))" 2>/dev/null)
    TEMP=$(echo "$SYS_INFO" | python3 -c "import sys,json; print(json.load(sys.stdin)['data'].get('temperature','N/A'))" 2>/dev/null)
    RAM=$(echo "$SYS_INFO" | python3 -c "import sys,json; print(json.load(sys.stdin)['data'].get('ram','N/A'))" 2>/dev/null)
    UPTIME=$(echo "$SYS_INFO" | python3 -c "import sys,json; u=json.load(sys.stdin)['data'].get('uptime',0); print(f'{u//86400}天 {(u%86400)//3600}小时')" 2>/dev/null)
    
    echo -e "  型号:     ${CYAN}$MODEL${NC}"
    echo -e "  版本:     ${CYAN}$VERSION${NC}"
    echo -e "  温度:     ${YELLOW}${TEMP}°C${NC}"
    echo -e "  内存:     ${CYAN}${RAM}MB${NC}"
    echo -e "  运行时间: ${CYAN}$UPTIME${NC}"
else
    echo -e "  ${YELLOW}⚠${NC} 无法获取系统信息"
fi
echo ""

# 4. Docker 容器状态
echo "【4/5】Docker 容器..."
DOCKER_INFO_FILE="/tmp/nas_docker_info.json"
curl -s -m 30 --connect-timeout 10 "${BASE_URL}/entry.cgi?api=SYNO.Docker.Container&version=1&method=list&limit=50&offset=0&_sid=$SID" > "$DOCKER_INFO_FILE"

python3 - "$DOCKER_INFO_FILE" << 'PYEOF'
import json
import sys

try:
    with open(sys.argv[1], 'r') as f:
        data = json.load(f)
    
    if not data.get('success'):
        print("  \033[1;33m⚠\033[0m 无法获取容器信息")
        sys.exit(0)
    
    containers = data.get('data', {}).get('containers', [])
    running = 0
    stopped = 0
    
    for c in containers:
        name = c.get('name', 'unknown')
        status = c.get('status', 'unknown')
        image = c.get('image', 'unknown')[:30]
        if status == 'running':
            running += 1
            print(f"  \033[0;32m●\033[0m {name:<20} {image:<30} \033[0;32m运行中\033[0m")
        else:
            stopped += 1
            print(f"  \033[0;31m●\033[0m {name:<20} {image:<30} \033[0;31m已停止\033[0m")
    
    print(f"\n  总计: {len(containers)} 个 | \033[0;32m运行: {running}\033[0m | \033[0;31m停止: {stopped}\033[0m")
except Exception as e:
    print(f"  \033[1;33m⚠\033[0m 解析失败: {e}")
PYEOF

rm -f "$DOCKER_INFO_FILE" 2>/dev/null
echo ""

# 5. 端口检查
echo "【5/5】服务端口..."
check_port() {
    if nc -z -w 2 $NAS_IP $1 2>/dev/null; then
        echo -e "  ${GREEN}●${NC} $2 (端口$1) - 正常"
    else
        echo -e "  ${RED}●${NC} $2 (端口$1) - 不可达"
    fi
}

check_port 5000 "DSM管理界面"
check_port 5001 "DSM HTTPS"
check_port 22 "SSH"
check_port 27017 "MongoDB"
check_port 6333 "Qdrant"
check_port 8888 "宝塔面板"
check_port 8890 "bt-hub中控"
echo ""

# 登出
curl -s "${BASE_URL}/auth.cgi?api=SYNO.API.Auth&version=1&method=logout&session=DSMStatus&_sid=$SID" > /dev/null

echo "========================================"
echo -e "  ${GREEN}检查完成${NC}"
echo "  DSM: http://${NAS_IP}:5000"
echo "========================================"
