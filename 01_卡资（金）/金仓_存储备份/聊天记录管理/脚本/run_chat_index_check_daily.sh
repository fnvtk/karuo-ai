#!/bin/bash
set -euo pipefail

PYTHON_BIN="/usr/bin/env python3"
INDEX_SCRIPT="/Users/karuo/Documents/个人/卡若AI/01_卡资（金）/金仓_存储备份/聊天记录管理/脚本/ensure_mongo_chat_indexes.py"
SYNC_SCRIPT="/Users/karuo/Documents/个人/卡若AI/01_卡资（金）/金仓_存储备份/聊天记录管理/脚本/realtime_chat_sync.py"
LOG_DIR="/Users/karuo/Documents/个人/卡若AI/01_卡资（金）/金仓_存储备份/聊天记录管理/日志"

mkdir -p "$LOG_DIR"

{
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] 开始每日索引巡检"
  $PYTHON_BIN "$INDEX_SCRIPT"
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] 索引巡检完成，开始刷新项目分类汇总"
  $PYTHON_BIN "$SYNC_SCRIPT" --sync-all --only-new
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] 每日巡检与刷新完成"
} >> "$LOG_DIR/chat_index_daily.log" 2>&1
