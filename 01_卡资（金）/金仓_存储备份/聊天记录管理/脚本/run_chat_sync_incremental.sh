#!/bin/bash
set -euo pipefail

PYTHON_BIN="/usr/bin/env python3"
SCRIPT="/Users/karuo/Documents/个人/卡若AI/01_卡资（金）/金仓_存储备份/聊天记录管理/脚本/realtime_chat_sync.py"
LOG_DIR="/Users/karuo/Documents/个人/卡若AI/01_卡资（金）/金仓_存储备份/聊天记录管理/日志"

mkdir -p "$LOG_DIR"

{
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] 开始增量同步"
  $PYTHON_BIN "$SCRIPT" --sync-all --only-new
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] 增量同步完成"
} >> "$LOG_DIR/chat_sync_incremental.log" 2>&1
