#!/usr/bin/env bash
# 家里 NAS：局域网部署「卡若AI 工作区」Web IDE（code-server），并挂载整卷 /volume1 以便访问 NAS 上文件。
# 前置：本机与 NAS 同网；NAS 已装 Container Manager；SSH 已开。
# 用法：
#   export NAS_HOST=192.168.110.29 NAS_USER=admin NAS_SUDO_PASS='你的sudo密码'
#   export WEBIDE_PASS='浏览器登录密码'   # 必填，勿提交到 git
#   bash "/Users/karuo/Documents/个人/卡若AI/01_卡资（金）/金仓_存储备份/群晖NAS管理/scripts/deploy_karuo_ai_home_nas_webide.sh"
#
# 装好后浏览器：http://<NAS_HOST>:8443  工作区左侧可看到 volume1（整 NAS 主存储树）
#
# 安全：勿对公网映射 8443；仅局域网或 VPN 使用。整卷读写权限极高，密码要强。

set -euo pipefail

NAS_HOST="${NAS_HOST:-192.168.110.29}"
NAS_USER="${NAS_USER:-admin}"
WEBIDE_PORT="${WEBIDE_PORT:-8443}"
# 群晖 Docker 绝对路径（DSM 7+ Container Manager）
REMOTE_DOCKER='/volume1/@appstore/ContainerManager/usr/bin/docker'
COMPOSE_DIR='/volume1/docker/karuo-ai-webide'
# 可选：把卡若AI 仓库克隆到 NAS 的路径（Gitea 需本机或 NAS 能访问）
KARUO_GIT_URL="${KARUO_GIT_URL:-http://open.quwanzhi.com:3000/fnvtk/karuo-ai.git}"
CLONE_ON_NAS="${CLONE_ON_NAS:-1}"

if [[ -z "${WEBIDE_PASS:-}" ]]; then
  echo "请设置环境变量 WEBIDE_PASS（code-server 登录密码）" >&2
  exit 1
fi

SSH_BASE=(ssh -o StrictHostKeyChecking=no -o ConnectTimeout=8
  -o KexAlgorithms=+diffie-hellman-group1-sha1
  -o Ciphers=+aes128-cbc,3des-cbc,aes192-cbc,aes256-cbc
  "${NAS_USER}@${NAS_HOST}")

echo ">>> 探测 NAS ${NAS_HOST} …"
if ! "${SSH_BASE[@]}" "echo ok" >/dev/null 2>&1; then
  echo "SSH 失败：请确认与家里 NAS 同网，且 ${NAS_USER}@${NAS_HOST} 可登录。详见 群晖NAS管理/SKILL.md「家里 NAS」。" >&2
  exit 1
fi

echo ">>> 创建目录 ${COMPOSE_DIR} …"
"${SSH_BASE[@]}" "mkdir -p '${COMPOSE_DIR}/config'"

echo ">>> 写入 docker-compose.yml …"
PUID=$("${SSH_BASE[@]}" "id -u '${NAS_USER}'" | tr -d '\r')
PGID=$("${SSH_BASE[@]}" "id -g '${NAS_USER}'" | tr -d '\r')
PUID="${PUID:-1026}"
PGID="${PGID:-100}"

COMPOSE_TMP="$(mktemp)"
trap 'rm -f "$COMPOSE_TMP"' EXIT
cat > "$COMPOSE_TMP" << EOF
services:
  code-server:
    image: lscr.io/linuxserver/code-server:latest
    container_name: karuo-ai-webide
    environment:
      - PUID=${PUID}
      - PGID=${PGID}
      - TZ=Asia/Shanghai
      - PASSWORD=${WEBIDE_PASS}
      - SUDO_PASSWORD=${WEBIDE_PASS}
      - DEFAULT_WORKSPACE=/config/workspace
    ports:
      - "${WEBIDE_PORT}:8443"
    volumes:
      - ${COMPOSE_DIR}/config:/config
      - /volume1:/config/workspace/volume1
    restart: unless-stopped
EOF

scp -o StrictHostKeyChecking=no -o ConnectTimeout=8 \
  -o KexAlgorithms=+diffie-hellman-group1-sha1 \
  -o Ciphers=+aes128-cbc,3des-cbc,aes192-cbc,aes256-cbc \
  "$COMPOSE_TMP" "${NAS_USER}@${NAS_HOST}:${COMPOSE_DIR}/docker-compose.yml"

if [[ "$CLONE_ON_NAS" == "1" ]]; then
  echo ">>> （可选）在 NAS 上克隆卡若AI 仓库到 /volume1/docker/karuo-ai …"
  "${SSH_BASE[@]}" "command -v git >/dev/null 2>&1 || echo 'NAS 未装 git，可跳过：在套件中心安装 Git Server 或 entware git'"
  "${SSH_BASE[@]}" "mkdir -p /volume1/docker && cd /volume1/docker && (test -d karuo-ai/.git || git clone '${KARUO_GIT_URL}' karuo-ai)" || true
fi

SUDO_PREFIX=""
if [[ -n "${NAS_SUDO_PASS:-}" ]]; then
  SUDO_PREFIX="echo '${NAS_SUDO_PASS}' | sudo -S "
fi

echo ">>> 启动容器 …"
"${SSH_BASE[@]}" "cd '${COMPOSE_DIR}' && ${SUDO_PREFIX}${REMOTE_DOCKER} compose up -d"

echo ">>> 完成。局域网打开: http://${NAS_HOST}:${WEBIDE_PORT}"
echo "    左侧资源管理器打开 workspace/volume1 即可浏览各共享目录。"
echo "    若另有 volume2：可在 NAS 上编辑 ${COMPOSE_DIR}/docker-compose.yml 增加一行挂载后 compose up -d。"
