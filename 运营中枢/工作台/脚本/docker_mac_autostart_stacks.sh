#!/usr/bin/env bash
# Mac 本机：Docker Desktop 登录后兜底——等待引擎就绪后按依赖顺序 docker start。
# 与 compose 中 restart: always 叠加；策略「引擎已起但容器没落」时补一刀。
set -euo pipefail
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

wait_docker() {
  local max="${1:-120}" elapsed=0
  while ! docker info >/dev/null 2>&1; do
    elapsed=$((elapsed + 2))
    if (( elapsed >= max )); then
      return 1
    fi
    sleep 2
  done
  return 0
}

if ! wait_docker 120; then
  log "Docker 引擎 120s 内未就绪，跳过（请打开 Docker Desktop 或勾选登录时启动）"
  exit 0
fi

log "Docker 就绪，按序启动容器…"

docker start datacenter_mongodb 2>/dev/null || true
sleep 4

# 依赖 Mongo/网络的站点与工具（存在则启，不存在忽略）
for c in \
  datacenter_mysql \
  cunkebao-redis \
  cunkebao-mysql \
  website-shensheshou \
  website-wanzhi-web \
  website-n8n \
  website-douyin-api \
  website-feishu-toolbox \
  website-karuo-site \
  website-openclaw-gateway \
  cunkebao-server \
  cunkebao-web \
  touchkebao-web \
  workphone-sdk \
  workphone-website \
  portainer
do
  if docker inspect "$c" >/dev/null 2>&1; then
    docker start "$c" 2>/dev/null && log "OK $c" || log "FAIL $c"
  fi
done

log "兜底启动流程结束"
exit 0
