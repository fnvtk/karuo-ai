#!/usr/bin/env bash
# Cursor 数据库智能瘦身（保留全部对话，只清缓存）
# 效果：把 21GB 的 state.vscdb 缩到 ~10GB，所有聊天记录完整保留
# 使用：Cmd+Q 完全退出 Cursor → 执行本脚本 → 重新打开 Cursor
#
# 清理内容（Cursor 会自动重新生成，不影响功能）：
#   1. agentKv:blob  — Agent 代码分析缓存（哈希/嵌入），可再生
#   2. 中间态数据    — checkpointId / codeBlockDiff / inlineDiff 等临时数据
#   3. state.vscdb.backup — 旧备份文件（15GB 冗余）
#
# 保留内容（绝不删除）：
#   - bubbleId:*     — 所有聊天对话（Agent 对话历史）
#   - ItemTable      — 编辑器全局状态
#   - composerData   — Composer 数据

set -euo pipefail

DB="$HOME/Library/Application Support/Cursor/User/globalStorage/state.vscdb"
BACKUP="$HOME/Library/Application Support/Cursor/User/globalStorage/state.vscdb.backup"

# ── 检查 Cursor 是否在运行 ──
if pgrep -f "Cursor.app" >/dev/null 2>&1; then
  echo "⚠️  Cursor 正在运行！请先 Cmd+Q 完全退出后再执行。"
  exit 1
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
echo "   ✅ 保留：所有 bubbleId（聊天对话）+ ItemTable（编辑器状态）+ composerData"
echo "   🗑️  清理：agentKv:blob（Agent 缓存）+ checkpointId/codeBlockDiff/inlineDiff 等中间数据"
echo "   🗑️  删除：state.vscdb.backup（冗余备份文件）"
echo "   🔧 执行：VACUUM（压缩数据库回收空间）"
echo ""
read -p "确认执行？(y/N) " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
  echo "已取消。"
  exit 0
fi
echo ""

# ── Step 1: 删除 agentKv:blob（Agent 缓存，可再生） ──
echo "🧹 Step 1/4: 清理 agentKv:blob 缓存数据..."
sqlite3 "$DB" "DELETE FROM cursorDiskKV WHERE key LIKE 'agentKv:blob:%';" 2>&1
AFTER_AGENT=$(sqlite3 "$DB" "SELECT count(*) FROM cursorDiskKV WHERE key LIKE 'agentKv:blob:%';" 2>/dev/null)
echo "   已清理 agentKv:blob，剩余 $AFTER_AGENT 行"

# ── Step 2: 删除中间态临时数据（不含 bubbleId 和 composerData） ──
echo "🧹 Step 2/4: 清理中间态临时数据..."
sqlite3 "$DB" "
DELETE FROM cursorDiskKV WHERE key LIKE 'checkpointId:%';
DELETE FROM cursorDiskKV WHERE key LIKE 'codeBlockPartialInlineDiffFates:%';
DELETE FROM cursorDiskKV WHERE key LIKE 'codeBlockDiff:%';
DELETE FROM cursorDiskKV WHERE key LIKE 'inlineDiff:%';
DELETE FROM cursorDiskKV WHERE key LIKE 'patch-graph:%';
DELETE FROM cursorDiskKV WHERE key LIKE 'messageRequestContext:%';
DELETE FROM cursorDiskKV WHERE key LIKE 'expectedContent-v1-%';
" 2>&1
AFTER_OTHER=$(sqlite3 "$DB" "SELECT count(*) FROM cursorDiskKV WHERE key NOT LIKE 'agentKv:blob:%' AND key NOT LIKE 'bubbleId:%';" 2>/dev/null)
echo "   中间态数据剩余 $AFTER_OTHER 行（保留了 composerData 等）"

# ── Step 3: VACUUM 压缩数据库 ──
echo "🔧 Step 3/4: VACUUM 压缩数据库（需要一些时间，请耐心等待）..."
sqlite3 "$DB" "VACUUM;" 2>&1
echo "   VACUUM 完成"

# ── Step 4: 删除冗余 backup ──
if [ -f "$BACKUP" ]; then
  echo "🗑️  Step 4/4: 删除冗余备份 state.vscdb.backup（${BACKUP_SIZE}MB）..."
  rm -f "$BACKUP"
  echo "   已删除"
else
  echo "✅ Step 4/4: 无冗余备份文件，跳过"
fi

# 清理 WAL 和 SHM（VACUUM 后这些可以删）
rm -f "${DB}-wal" "${DB}-shm" 2>/dev/null

# ── 瘦身后统计 ──
AFTER_SIZE=$(du -m "$DB" | awk '{print $1}')
AFTER_TOTAL=$(sqlite3 "$DB" "SELECT count(*) FROM cursorDiskKV;" 2>/dev/null || echo "?")
AFTER_BUBBLE=$(sqlite3 "$DB" "SELECT count(*) FROM cursorDiskKV WHERE key LIKE 'bubbleId:%';" 2>/dev/null || echo "?")
SAVED=$((BEFORE_SIZE + BACKUP_SIZE - AFTER_SIZE))

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
echo "📋 数据保留确认："
echo "   bubbleId（聊天对话）  : $AFTER_BUBBLE 行 ✅ 全部保留"
echo "   cursorDiskKV 总行数   : $AFTER_TOTAL 行"
echo ""
echo "🔑 下一步：直接打开 Cursor 即可"
echo "   （Agent 缓存会在使用时按需重建，不影响功能）"
echo "═══════════════════════════════════════════════"
