#!/usr/bin/env bash
# Docker Desktop 就绪后，一次性按依赖顺序拉起本机常用编排：
#   1) datacenter（MongoDB / MariaDB + datacenter_network）
#   2) 神射手目录 website（神射手、玩值、抖音 API、n8n、OpenClaw 等）
#   3) 卡若官网（独立 COMPOSE_PROJECT_NAME，避免与上一步同名 website 项目互相覆盖）
#
# 用法：手动执行；或配合 com.karuo.docker-stacks-up.plist 在登录后延迟执行。
# 各 compose 内服务已设 restart: unless-stopped 时，Docker 守护进程重启后也会自动恢复，
# 本脚本用于「冷启动 / compose down 后」或「登录后确保全部 up」。

set -euo pipefail

DATACENTER_DIR="/Users/karuo/Documents/个人/卡若AI/01_卡资（金）/金仓_存储备份/datacenter"
WEBSITE_SHEN_DIR="/Users/karuo/Documents/开发/2、私域银行/神射手"
KARUO_SITE_DIR="/Users/karuo/Documents/开发/3、自营项目/卡若ai网站"

log() { printf '%s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }

wait_for_docker() {
  local max="${1:-60}"
  local i=0
  while (( i < max )); do
    if docker info >/dev/null 2>&1; then
      log "Docker 已就绪"
      return 0
    fi
    (( i++ )) || true
    sleep 2
  done
  log "超时：Docker 未在 $((max * 2)) 秒内就绪"
  return 1
}

wait_for_docker 60

if [[ -d "$DATACENTER_DIR" ]]; then
  log "启动 datacenter …"
  (cd "$DATACENTER_DIR" && docker compose -p datacenter up -d)
else
  log "跳过：未找到 datacenter 目录 $DATACENTER_DIR"
fi

if [[ -d "$WEBSITE_SHEN_DIR" ]]; then
  log "启动 website（神射手编排）…"
  (cd "$WEBSITE_SHEN_DIR" && docker compose up -d)
else
  log "跳过：未找到 $WEBSITE_SHEN_DIR"
fi

if [[ -d "$KARUO_SITE_DIR" ]]; then
  log "启动卡若官网 Docker（项目名 website_karuo，避免与神射手 website 冲突）…"
  (cd "$KARUO_SITE_DIR" && COMPOSE_PROJECT_NAME=website_karuo docker compose up -d)
else
  log "跳过：未找到 $KARUO_SITE_DIR"
fi

log "完成。可执行 docker compose ls 与 docker ps 查看状态。"
