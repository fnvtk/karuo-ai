#!/usr/bin/env bash
# Cursor 自动瘦身（静默模式，用于定期执行）
# 仅在 Cursor 未运行时执行；若 Cursor 在运行则跳过，下次再试
# 只清理 agentKv:blob 缓存和中间态数据，保留全部聊天对话
# 配合 LaunchAgent 每周自动运行一次

set -euo pipefail

DB="$HOME/Library/Application Support/Cursor/User/globalStorage/state.vscdb"
BACKUP="$HOME/Library/Application Support/Cursor/User/globalStorage/state.vscdb.backup"
LOG_FILE="$HOME/Library/Application Support/Cursor/cursor_auto_slim.log"

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $1" >> "$LOG_FILE"; }

if [ ! -f "$DB" ]; then
  log "SKIP: state.vscdb 不存在"
  exit 0
fi

if pgrep -f "Cursor.app" >/dev/null 2>&1; then
  log "SKIP: Cursor 正在运行，下次再清理"
  exit 0
fi

BEFORE_MB=$(du -m "$DB" | awk '{print $1}')
if [ "$BEFORE_MB" -lt 500 ]; then
  log "SKIP: state.vscdb ${BEFORE_MB}MB < 500MB，无需瘦身"
  exit 0
fi

log "START: state.vscdb ${BEFORE_MB}MB，开始瘦身"

sqlite3 "$DB" "DELETE FROM cursorDiskKV WHERE key LIKE 'agentKv:blob:%';" 2>/dev/null
sqlite3 "$DB" "
DELETE FROM cursorDiskKV WHERE key LIKE 'checkpointId:%';
DELETE FROM cursorDiskKV WHERE key LIKE 'codeBlockPartialInlineDiffFates:%';
DELETE FROM cursorDiskKV WHERE key LIKE 'codeBlockDiff:%';
DELETE FROM cursorDiskKV WHERE key LIKE 'inlineDiff:%';
DELETE FROM cursorDiskKV WHERE key LIKE 'patch-graph:%';
DELETE FROM cursorDiskKV WHERE key LIKE 'messageRequestContext:%';
DELETE FROM cursorDiskKV WHERE key LIKE 'expectedContent-v1-%';
" 2>/dev/null

sqlite3 "$DB" "VACUUM;" 2>/dev/null
rm -f "${DB}-wal" "${DB}-shm" 2>/dev/null
[ -f "$BACKUP" ] && rm -f "$BACKUP"

AFTER_MB=$(du -m "$DB" | awk '{print $1}')
SAVED=$((BEFORE_MB - AFTER_MB))
BUBBLE=$(sqlite3 "$DB" "SELECT count(*) FROM cursorDiskKV WHERE key LIKE 'bubbleId:%';" 2>/dev/null || echo "?")

log "DONE: ${BEFORE_MB}MB → ${AFTER_MB}MB（释放 ${SAVED}MB），对话保留 ${BUBBLE} 行"
