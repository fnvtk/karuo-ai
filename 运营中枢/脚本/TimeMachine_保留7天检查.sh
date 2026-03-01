#!/bin/bash
# Time Machine 快照至少保留 7 天：每日检查脚本
# 当备份目的地可用时，检查是否仍有 ≥7 天的备份历史；结果写入工作台日志。
# 说明：Apple 本地快照默认约 24 小时，无法通过系统设置改为 7 天；本脚本仅检查「备份目的地」上的备份历史。

RETENTION_DAYS=7
LOG_DIR="/Users/karuo/Documents/个人/卡若AI/运营中枢/工作台"
LOG_FILE="$LOG_DIR/TimeMachine_保留检查.log"
STAMP=$(date "+%Y-%m-%d %H:%M:%S")

mkdir -p "$LOG_DIR"

# 获取默认目的地下的备份列表（15 秒超时，避免未挂载时挂起）
TMP_LIST=$(mktemp)
( tmutil listbackups 2>/dev/null > "$TMP_LIST"; ) &
TM_PID=$!
for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
  kill -0 "$TM_PID" 2>/dev/null || break
  sleep 1
done
kill "$TM_PID" 2>/dev/null
BACKUPS=$(cat "$TMP_LIST" 2>/dev/null)
rm -f "$TMP_LIST"
if [[ -z "$BACKUPS" ]]; then
  echo "[$STAMP] 备份列表不可用（可能未连接备份盘），跳过 7 天保留检查。" >> "$LOG_FILE"
  exit 0
fi

# 取最早一条备份路径，解析日期（格式：.../YYYY-MM-DD-HHMMSS）
OLDEST_PATH=$(echo "$BACKUPS" | head -1)
# 路径末尾形如 2026-02-28-082912
OLDEST_DATE_STR=$(basename "$OLDEST_PATH" | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}' | head -1)
if [[ -z "$OLDEST_DATE_STR" ]]; then
  echo "[$STAMP] 无法解析最早备份日期，跳过检查。" >> "$LOG_FILE"
  exit 0
fi

# 计算最早备份距今天数（macOS 使用 -j -f）
TODAY_EPOCH=$(date -j -f "%Y-%m-%d" "$(date +%Y-%m-%d)" "+%s" 2>/dev/null)
OLDEST_EPOCH=$(date -j -f "%Y-%m-%d" "$OLDEST_DATE_STR" "+%s" 2>/dev/null)
if [[ -z "$OLDEST_EPOCH" ]] || [[ -z "$TODAY_EPOCH" ]]; then
  DAYS_AGO=0
else
  DAYS_AGO=$(( (TODAY_EPOCH - OLDEST_EPOCH) / 86400 ))
fi

if [[ "$DAYS_AGO" -ge "$RETENTION_DAYS" ]]; then
  echo "[$STAMP] 通过：最早备份 $OLDEST_DATE_STR，距今 ${DAYS_AGO} 天，≥ ${RETENTION_DAYS} 天保留。" >> "$LOG_FILE"
  exit 0
else
  echo "[$STAMP] 提醒：最早备份 $OLDEST_DATE_STR，距今 ${DAYS_AGO} 天，不足 ${RETENTION_DAYS} 天。请确保备份盘空间充足以保留至少 7 天快照。" >> "$LOG_FILE"
  exit 0
fi
