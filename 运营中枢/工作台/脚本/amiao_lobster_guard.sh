#!/usr/bin/env bash
# 阿猫本机运行：周期性检测龙虾（OpenClaw 网关）是否可用，异常则自动修复。
# 由 LaunchAgent com.openclaw.lobster.guard 每 3 分钟触发；亦可手动：bash ~/.openclaw/lobster_guard.sh
set -u
NODE="/usr/local/opt/node/bin/node"
OC="${HOME}/.local/share/npm-global/lib/node_modules/openclaw/dist/index.js"
LABEL_GATE="com.openclaw.gateway.longmao"
UIDN="$(id -u)"
GW_ERR="${HOME}/.openclaw/launchd-gateway-longmao.err.log"
LOG="${HOME}/.openclaw/lobster_guard.log"
LAST_DOCTOR_STAMP="${HOME}/.openclaw/.lobster_guard_last_doctor"

ts() { date "+%Y-%m-%d %H:%M:%S"; }

log() { echo "$(ts) $*" >>"$LOG"; }

feishu_probe_ok() {
  local js
  js="$("$NODE" "$OC" channels status --probe --json 2>/dev/null)" || return 1
  echo "$js" | /usr/bin/python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
    fe = d.get('channels', {}).get('feishu', {})
    if not fe.get('running'):
        sys.exit(1)
    if not (fe.get('probe') or {}).get('ok'):
        sys.exit(1)
    sys.exit(0)
except Exception:
    sys.exit(1)
" 2>/dev/null
}

port_ok() {
  lsof -iTCP:18789 -sTCP:LISTEN >/dev/null 2>&1
}

healthy() {
  port_ok && feishu_probe_ok
}

run_doctor_if_config_broken() {
  if [[ ! -f "$GW_ERR" ]]; then
    return 0
  fi
  if ! tail -120 "$GW_ERR" 2>/dev/null | grep -q "Config invalid"; then
    return 0
  fi
  local now last
  now=$(date +%s)
  if [[ -f "$LAST_DOCTOR_STAMP" ]]; then
    last=$(cat "$LAST_DOCTOR_STAMP" 2>/dev/null || echo 0)
    if [[ "$((now - last))" -lt 3600 ]]; then
      log "skip doctor (throttled <3600s) but config invalid was seen"
      return 0
    fi
  fi
  log "run openclaw doctor --fix (Config invalid in gateway err log)"
  PATH="/usr/local/opt/node/bin:${HOME}/.local/share/npm-global/bin:/usr/bin:/bin" \
    openclaw doctor --fix >>"$LOG" 2>&1 || true
  echo "$now" >"$LAST_DOCTOR_STAMP"
}

kick_gateway() {
  log "launchctl kickstart -k gui/${UIDN}/${LABEL_GATE}"
  launchctl kickstart -k "gui/${UIDN}/${LABEL_GATE}" >>"$LOG" 2>&1 || true
}

hard_reset_gateway() {
  log "pkill openclaw gateway then kickstart"
  pkill -f "/openclaw/dist/index.js gateway" 2>/dev/null || true
  sleep 2
  kick_gateway
}

# —— 主流程 ——
if healthy; then
  exit 0
fi

log "UNHEALTHY: port_ok=$(port_ok && echo yes || echo no)"
run_doctor_if_config_broken
kick_gateway
sleep 10

if healthy; then
  log "recovered after kickstart"
  exit 0
fi

hard_reset_gateway
sleep 12

if healthy; then
  log "recovered after hard_reset"
  exit 0
fi

log "STILL_UNHEALTHY — inspect: $GW_ERR and $LOG"
exit 1
