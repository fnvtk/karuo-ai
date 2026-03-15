#!/bin/bash
# ============================================
# 回到家自动触发 Time Machine 到家里 NAS
# 逻辑：
# 1. 仅在能访问 192.168.110.29 时执行
# 2. 确保 Backup 共享已挂载
# 3. 若 Time Machine 未在运行，则触发自动备份
# ============================================

set -u
shopt -s nullglob

NAS_IP="${DISKSTATION_IP:-192.168.110.29}"
NAS_USER="${DISKSTATION_USER:-admin}"
NAS_PASS="${DISKSTATION_PASS:-zhiqun1984}"
TM_SHARE="${TM_SHARE:-Backup}"
MOUNT_POINT="$HOME/DiskStation-TimeMachine"
LOG_PREFIX="[tm-home-auto]"

log() {
  echo "$LOG_PREFIX $1"
}

is_nas_online() {
  python3 - "$NAS_IP" <<'PY'
import socket
import sys

host = sys.argv[1]
for port in (445, 5000):
    try:
        sock = socket.create_connection((host, port), timeout=2)
        sock.close()
        sys.exit(0)
    except OSError:
        pass
sys.exit(1)
PY
}

cleanup_extra_sparsebundles() {
  local bundles=("$MOUNT_POINT"/*.sparsebundle)
  local keep_bundle=""
  local keep_size=0
  local size=0
  local bundle=""

  if [ "${#bundles[@]}" -le 1 ]; then
    log "备份卷内无需清理，sparsebundle 数量: ${#bundles[@]}"
    return 0
  fi

  for bundle in "${bundles[@]}"; do
    size="$(du -sk "$bundle" 2>/dev/null | awk '{print $1}')"
    size="${size:-0}"
    if [ "$size" -gt "$keep_size" ]; then
      keep_size="$size"
      keep_bundle="$bundle"
    fi
  done

  log "保留最大备份: $(basename "$keep_bundle") (${keep_size} KB)"
  for bundle in "${bundles[@]}"; do
    if [ "$bundle" != "$keep_bundle" ]; then
      log "删除多余备份: $(basename "$bundle")"
      rm -rf "$bundle"
    fi
  done
}

if ! command -v tmutil >/dev/null 2>&1; then
  log "tmutil 不可用，跳过"
  exit 0
fi

if ! is_nas_online; then
  log "未检测到家里 NAS 在线，跳过"
  exit 0
fi

mkdir -p "$MOUNT_POINT"

if ! mount | grep -q "$MOUNT_POINT"; then
  log "挂载家里 NAS 的 Time Machine 共享"
  mount_smbfs "//${NAS_USER}:${NAS_PASS}@${NAS_IP}/${TM_SHARE}" "$MOUNT_POINT" >/dev/null 2>&1 || {
    log "挂载失败，请检查共享名/密码/SMB"
    exit 1
  }
fi

cleanup_extra_sparsebundles

DEST_INFO="$(tmutil destinationinfo 2>/dev/null || true)"
if ! printf '%s' "$DEST_INFO" | grep -qiE "DiskStation|${NAS_IP}|${TM_SHARE}"; then
  log "当前未检测到家里 NAS 为 Time Machine 目标"
  exit 1
fi

CURRENT_PHASE="$(tmutil currentphase 2>/dev/null || true)"
if printf '%s' "$CURRENT_PHASE" | grep -q "BackupNotRunning"; then
  log "触发 Time Machine 自动备份"
  tmutil startbackup --auto >/dev/null 2>&1 || {
    log "启动备份失败"
    exit 1
  }
  log "已发起备份"
else
  log "Time Machine 正在运行：$CURRENT_PHASE"
fi

exit 0
