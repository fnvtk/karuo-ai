#!/bin/bash
# Docker 容器列表脚本 (API模式)
# 用途：通过 DSM API 列出群晖NAS上所有Docker容器（无需SSH）
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
echo -e "  ${CYAN}Docker容器列表 (API模式)${NC}"
echo "  NAS: $NAS_IP"
echo "========================================"
echo ""

# 登录
LOGIN_RESP=$(curl -s -m 10 "${BASE_URL}/auth.cgi?api=SYNO.API.Auth&version=3&method=login&account=${NAS_USER}&passwd=${NAS_PASS}&session=DockerList&format=sid")
SID=$(echo "$LOGIN_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('sid',''))" 2>/dev/null)

if [ -z "$SID" ]; then
    echo -e "${RED}登录失败${NC}"
    exit 1
fi

# 获取容器列表
DOCKER_INFO=$(curl -s -m 10 "${BASE_URL}/entry.cgi?api=SYNO.Docker.Container&version=1&method=list&limit=100&offset=0&_sid=$SID")

# 解析并显示
python3 << PYEOF
import json
import sys

data = json.loads('''$DOCKER_INFO''')

if not data.get('success'):
    print("\033[0;31m无法获取容器列表\033[0m")
    print(f"错误: {data.get('error', 'unknown')}")
    sys.exit(1)

containers = data.get('data', {}).get('containers', [])

print(f"\033[0;36m{'容器名称':<25} {'镜像':<35} {'状态':<10}\033[0m")
print("-" * 75)

running = 0
stopped = 0

for c in containers:
    name = c.get('name', 'unknown')[:24]
    image = c.get('image', 'unknown')[:34]
    status = c.get('status', 'unknown')
    up_status = c.get('up_status', '')
    
    if status == 'running':
        running += 1
        status_display = f"\033[0;32m● 运行中\033[0m"
        # 显示运行时间
        if up_status:
            print(f"\033[0;32m●\033[0m {name:<24} {image:<34} {status_display}")
            print(f"  └─ {up_status}")
        else:
            print(f"\033[0;32m●\033[0m {name:<24} {image:<34} {status_display}")
    else:
        stopped += 1
        print(f"\033[0;31m●\033[0m {name:<24} {image:<34} \033[0;31m已停止\033[0m")

print("-" * 75)
print(f"总计: {len(containers)} 个 | \033[0;32m运行: {running}\033[0m | \033[0;31m停止: {stopped}\033[0m")
print()
print("常用操作:")
print(f"  启动容器: curl '{BASE_URL}/entry.cgi?api=SYNO.Docker.Container&version=1&method=start&name=<容器名>&_sid=$SID'")
print(f"  停止容器: curl '{BASE_URL}/entry.cgi?api=SYNO.Docker.Container&version=1&method=stop&name=<容器名>&_sid=$SID'")
PYEOF

# 登出
curl -s "${BASE_URL}/auth.cgi?api=SYNO.API.Auth&version=1&method=logout&session=DockerList&_sid=$SID" > /dev/null
