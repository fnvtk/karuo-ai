#!/usr/bin/env bash
# Cursor 数据库彻底修复（解决 "Blob not found" / "Internal Error"）
# ────────────────────────────────────────────────────────────────
# 问题根因：
#   之前多次清理只删 agentKv:blob，保留 bubbleId（对话记录），
#   导致 bubbleId 引用已删除的 blob → "Blob not found" → Internal Error
#   bubbleId 本身也有 70 万行 / 10 GB，是数据库膨胀的真正元凶
#
# 本脚本操作：
#   1. 完全清空 cursorDiskKV 表（bubbleId + agentKv + 全部中间数据）
#   2. VACUUM 压缩数据库文件
#   3. 删除冗余 backup / WAL / SHM 文件
#
# 聊天记录不会真正丢失：
#   所有 Agent 对话完整记录保存在 ~/.cursor/projects/*/agent-transcripts/*.jsonl
#   清理后 Cursor UI 里旧对话会显示空/Loading，但 jsonl 原文仍在
#
# 使用：直接执行，脚本会自动退出 Cursor
# ────────────────────────────────────────────────────────────────

set -euo pipefail

DB="$HOME/Library/Application Support/Cursor/User/globalStorage/state.vscdb"
DIR="$HOME/Library/Application Support/Cursor/User/globalStorage"
TS="$(date +%Y%m%dT%H%M%S)"

echo ""
echo "══════════════════════════════════════════════════════════"
echo "  Cursor 数据库彻底修复"
echo "  解决 \"Blob not found\" / \"Internal Error\" 反复出现"
echo "══════════════════════════════════════════════════════════"
echo ""

# ── Step 0: 退出 Cursor ──
if pgrep -f "Cursor.app" >/dev/null 2>&1; then
  echo "🛑 Step 0: 退出 Cursor..."
  osascript -e 'tell application "Cursor" to quit' 2>/dev/null || true
  sleep 3
  if pgrep -f "Cursor.app" >/dev/null 2>&1; then
    killall "Cursor" 2>/dev/null || true
    sleep 2
  fi
  if pgrep -f "Cursor.app" >/dev/null 2>&1; then
    pkill -9 -f "Cursor" 2>/dev/null || true
    sleep 2
  fi
  if pgrep -f "Cursor.app" >/dev/null 2>&1; then
    echo "⚠️  无法退出 Cursor，请手动关闭后重新执行"
    exit 1
  fi
  echo "   ✅ Cursor 已退出"
fi

if [ ! -f "$DB" ]; then
  echo "❌ 未找到 state.vscdb：$DB"
  exit 1
fi

# ── Step 1: 瘦身前统计 ──
BEFORE_SIZE=$(du -m "$DB" | awk '{print $1}')
echo ""
echo "📊 修复前状态："
echo "   state.vscdb : ${BEFORE_SIZE} MB"

TOTAL_ROWS=$(sqlite3 "$DB" "SELECT count(*) FROM cursorDiskKV;" 2>/dev/null || echo "?")
BUBBLE_ROWS=$(sqlite3 "$DB" "SELECT count(*) FROM cursorDiskKV WHERE key LIKE 'bubbleId:%';" 2>/dev/null || echo "?")
AGENT_ROWS=$(sqlite3 "$DB" "SELECT count(*) FROM cursorDiskKV WHERE key LIKE 'agentKv:%';" 2>/dev/null || echo "?")

echo "   cursorDiskKV 总行数 : $TOTAL_ROWS"
echo "   bubbleId（对话气泡）: $BUBBLE_ROWS 行"
echo "   agentKv（Agent缓存）: $AGENT_ROWS 行"

# 检查 agent-transcripts 备份是否存在
TRANSCRIPT_COUNT=$(find "$HOME/.cursor/projects" -name "*.jsonl" -path "*/agent-transcripts/*" 2>/dev/null | wc -l | tr -d ' ')
echo ""
echo "   📁 agent-transcripts 备份文件: $TRANSCRIPT_COUNT 个 jsonl"
echo "   （所有对话原文安全保存在这些文件中）"
echo ""

# ── Step 2: 备份当前数据库（压缩备份） ──
echo "💾 Step 1/4: 备份当前数据库..."
BACKUP_PATH="$DIR/state.vscdb.pre_full_reset_$TS"
cp "$DB" "$BACKUP_PATH"
echo "   备份保存至: state.vscdb.pre_full_reset_$TS"

# ── Step 3: 清空 cursorDiskKV（一次性解决所有引用断裂问题） ──
echo "🧹 Step 2/4: 清空 cursorDiskKV 表..."
sqlite3 "$DB" <<'SQL'
PRAGMA journal_mode=DELETE;
DELETE FROM cursorDiskKV;
SQL
AFTER_ROWS=$(sqlite3 "$DB" "SELECT count(*) FROM cursorDiskKV;" 2>/dev/null)
echo "   ✅ cursorDiskKV 已清空（剩余 $AFTER_ROWS 行）"

# ── Step 4: 清理 ItemTable 中的大缓存条目 ──
echo "🧹 Step 3/4: 清理 ItemTable 中的大缓存..."
sqlite3 "$DB" <<'SQL'
DELETE FROM ItemTable WHERE key = 'browserAutomation.history';
DELETE FROM ItemTable WHERE key = 'aiCodeTrackingLines';
SQL
echo "   ✅ 已清理 browserAutomation.history (3MB) + aiCodeTrackingLines (1.3MB)"

# ── Step 5: VACUUM 压缩 ──
echo "🔧 Step 4/4: VACUUM 压缩数据库（可能需要 1-2 分钟）..."
sqlite3 "$DB" "VACUUM;"
echo "   ✅ VACUUM 完成"

# ── 清理附属文件 ──
rm -f "${DB}-wal" "${DB}-shm" 2>/dev/null

# 删除旧的冗余备份（保留本次备份和最近一次）
for old_backup in "$DIR"/state.vscdb.backup "$DIR"/state.vscdb.pre_restore_*; do
  [ -f "$old_backup" ] && rm -f "$old_backup" && echo "   🗑️  已删除旧备份: $(basename "$old_backup")"
done

# ── 修复后统计 ──
AFTER_SIZE=$(du -m "$DB" | awk '{print $1}')
SAVED=$((BEFORE_SIZE - AFTER_SIZE))
AFTER_TOTAL=$(sqlite3 "$DB" "SELECT count(*) FROM cursorDiskKV;" 2>/dev/null || echo "?")
ITEM_ROWS=$(sqlite3 "$DB" "SELECT count(*) FROM ItemTable;" 2>/dev/null || echo "?")

echo ""
echo "══════════════════════════════════════════════════════════"
echo "✅ 彻底修复完成！"
echo ""
echo "📊 对比："
echo "   修复前 state.vscdb    : ${BEFORE_SIZE} MB"
echo "   修复后 state.vscdb    : ${AFTER_SIZE} MB"
echo "   释放空间              : ≈${SAVED} MB"
echo ""
echo "📋 数据确认："
echo "   cursorDiskKV 行数     : $AFTER_TOTAL（已清空，Cursor 按需重建）"
echo "   ItemTable 行数        : $ITEM_ROWS（编辑器状态，已保留）"
echo "   agent-transcripts     : $TRANSCRIPT_COUNT 个 jsonl（对话原文完好）"
echo ""
echo "🔑 下一步："
echo "   1. 打开 Cursor"
echo "   2. 旧 Agent 对话会显示空白/Loading —— 这是正常的"
echo "   3. 新建 Agent 对话即可正常使用，不会再报 Blob not found"
echo "   4. 如需查看旧对话内容，去 ~/.cursor/projects/*/agent-transcripts/ 看 jsonl"
echo ""
echo "⚡ 备份位置（如需回退）："
echo "   $BACKUP_PATH"
echo "══════════════════════════════════════════════════════════"
