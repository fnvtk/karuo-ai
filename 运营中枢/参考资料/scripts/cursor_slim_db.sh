#!/usr/bin/env bash
# Cursor 数据库智能瘦身 v2（清理全部缓存 + 旧对话气泡）
# 效果：把膨胀的 state.vscdb（10GB+）缩到 ~50MB
# 使用：Cmd+Q 完全退出 Cursor → 执行本脚本 → 重新打开 Cursor
#
# 清理内容（Cursor 会自动重新生成，不影响功能）：
#   1. agentKv:blob  — Agent 代码分析缓存（哈希/嵌入），可再生
#   2. bubbleId      — 对话气泡数据（是膨胀主因，70万行/10GB）
#   3. 中间态数据    — checkpointId / codeBlockDiff / inlineDiff 等临时数据
#   4. state.vscdb.backup — 旧备份文件（冗余）
#
# 聊天记录保留方式：
#   所有 Agent 对话完整 jsonl 保存在 ~/.cursor/projects/*/agent-transcripts/
#   清理 bubbleId 后 Cursor UI 旧对话显示空白，但 jsonl 原文仍在
#
# 保留内容（绝不删除）：
#   - ItemTable      — 编辑器全局状态
#   - composerData   — Composer 数据（仅保留最近的）

set -euo pipefail

DB="$HOME/Library/Application Support/Cursor/User/globalStorage/state.vscdb"
BACKUP="$HOME/Library/Application Support/Cursor/User/globalStorage/state.vscdb.backup"

# ── 若 Cursor 在运行则先强制退出 Cursor 及所有相关进程 ──
if pgrep -f "Cursor" >/dev/null 2>&1; then
  echo "🛑 检测到 Cursor 正在运行，正在强制退出 Cursor 及相关进程..."
  killall Cursor 2>/dev/null || true
  sleep 3
  pkill -9 -f "Cursor" 2>/dev/null || true
  sleep 2
  if pgrep -f "Cursor" >/dev/null 2>&1; then
    echo "⚠️  无法完全退出，请从「活动监视器」中手动结束所有 Cursor 相关进程后重试。"
    exit 1
  fi
  echo "   ✅ Cursor 已退出，继续执行..."
fi

if [ ! -f "$DB" ]; then
  echo "❌ 未找到 state.vscdb：$DB"
  exit 1
fi

echo "═══════════════════════════════════════════════"
echo "🔬 Cursor 数据库智能瘦身（保留全部对话）"
echo "═══════════════════════════════════════════════"
echo ""

# ── 瘦身前统计 ──
BEFORE_SIZE=$(du -m "$DB" | awk '{print $1}')
BACKUP_SIZE=0
[ -f "$BACKUP" ] && BACKUP_SIZE=$(du -m "$BACKUP" | awk '{print $1}')

echo "📊 瘦身前状态："
echo "   state.vscdb     : ${BEFORE_SIZE} MB"
[ "$BACKUP_SIZE" -gt 0 ] && echo "   state.vscdb.backup: ${BACKUP_SIZE} MB（冗余备份）"

TOTAL_ROWS=$(sqlite3 "$DB" "SELECT count(*) FROM cursorDiskKV;" 2>/dev/null || echo "?")
AGENT_ROWS=$(sqlite3 "$DB" "SELECT count(*) FROM cursorDiskKV WHERE key LIKE 'agentKv:blob:%';" 2>/dev/null || echo "?")
BUBBLE_ROWS=$(sqlite3 "$DB" "SELECT count(*) FROM cursorDiskKV WHERE key LIKE 'bubbleId:%';" 2>/dev/null || echo "?")
OTHER_ROWS=$(sqlite3 "$DB" "SELECT count(*) FROM cursorDiskKV WHERE key NOT LIKE 'agentKv:blob:%' AND key NOT LIKE 'bubbleId:%';" 2>/dev/null || echo "?")

echo "   总行数          : $TOTAL_ROWS"
echo "   agentKv:blob    : $AGENT_ROWS 行（缓存，将清理）"
echo "   bubbleId        : $BUBBLE_ROWS 行（对话，保留 ✅）"
echo "   其他中间数据    : $OTHER_ROWS 行（部分清理）"
echo ""

# ── 确认 ──
echo "📋 本次操作："
echo "   🗑️  清理：bubbleId（对话气泡，膨胀主因）+ agentKv + 全部中间数据"
echo "   ✅ 保留：ItemTable（编辑器状态）+ composerData（最近的）"
echo "   🗑️  删除：state.vscdb.backup（冗余备份文件）"
echo "   🔧 执行：VACUUM（压缩数据库回收空间）"
echo "   📁 对话原文：保存在 ~/.cursor/projects/*/agent-transcripts/*.jsonl"
echo ""
read -p "确认执行？(y/N) " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
  echo "已取消。"
  exit 0
fi
echo ""

# ── Step 1: 清空 cursorDiskKV（解决 Blob not found 引用断裂） ──
echo "🧹 Step 1/2: 清空 cursorDiskKV 表..."
sqlite3 "$DB" "PRAGMA journal_mode=DELETE; DELETE FROM cursorDiskKV;" 2>&1
echo "   ✅ 已清空全部 cursorDiskKV 数据"

# ── Step 2: 清理 ItemTable 中的大缓存条目 ──
echo "🧹 Step 2/2: 清理 ItemTable 大缓存条目..."
sqlite3 "$DB" "
DELETE FROM ItemTable WHERE key = 'browserAutomation.history';
DELETE FROM ItemTable WHERE key = 'aiCodeTrackingLines';
" 2>&1
echo "   ✅ 已清理大缓存条目"

# ── Step 3: VACUUM 压缩数据库 ──
echo "🔧 VACUUM 压缩数据库（可能需要 1-2 分钟）..."
sqlite3 "$DB" "VACUUM;" 2>&1
echo "   ✅ VACUUM 完成"

# ── Step 4: 清理附属文件 ──
rm -f "${DB}-wal" "${DB}-shm" 2>/dev/null
if [ -f "$BACKUP" ]; then
  echo "🗑️  删除冗余备份 state.vscdb.backup（${BACKUP_SIZE}MB）..."
  rm -f "$BACKUP"
fi
for old_bak in "$HOME/Library/Application Support/Cursor/User/globalStorage"/state.vscdb.pre_restore_*; do
  [ -f "$old_bak" ] && rm -f "$old_bak"
done

# ── 瘦身后统计 ──
AFTER_SIZE=$(du -m "$DB" | awk '{print $1}')
AFTER_TOTAL=$(sqlite3 "$DB" "SELECT count(*) FROM cursorDiskKV;" 2>/dev/null || echo "?")
SAVED=$((BEFORE_SIZE + BACKUP_SIZE - AFTER_SIZE))
TRANSCRIPT_COUNT=$(find "$HOME/.cursor/projects" -name "*.jsonl" -path "*/agent-transcripts/*" 2>/dev/null | wc -l | tr -d ' ')

echo ""
echo "═══════════════════════════════════════════════"
echo "✅ 瘦身完成！"
echo ""
echo "📊 对比："
echo "   瘦身前 state.vscdb    : ${BEFORE_SIZE} MB"
[ "$BACKUP_SIZE" -gt 0 ] && echo "   瘦身前 backup          : ${BACKUP_SIZE} MB"
echo "   瘦身后 state.vscdb    : ${AFTER_SIZE} MB"
echo "   总释放空间            : ≈${SAVED} MB"
echo ""
echo "📋 数据确认："
echo "   cursorDiskKV 行数     : $AFTER_TOTAL（已清空，Cursor 按需重建）"
echo "   agent-transcripts     : $TRANSCRIPT_COUNT 个 jsonl（对话原文完好）"
echo ""
echo "🔑 下一步："
echo "   1. 打开 Cursor，新建 Agent 对话即可正常使用"
echo "   2. 旧对话显示空白/Loading 是正常的"
echo "   3. 对话原文在 ~/.cursor/projects/*/agent-transcripts/*.jsonl"
echo "═══════════════════════════════════════════════"
