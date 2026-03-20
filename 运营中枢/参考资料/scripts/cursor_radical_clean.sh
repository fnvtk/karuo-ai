#!/usr/bin/env bash
# Cursor 激进清理脚本 - 一次性解决 24GB 问题
# ⚠️ 警告：本脚本会清理大量数据，请确保已备份重要对话
# 使用：Cmd+Q 完全退出 Cursor → 执行本脚本 → 重新打开 Cursor

set -euo pipefail

CURSOR_SUPPORT="$HOME/Library/Application Support/Cursor"
AI_TRACKING_DB="$HOME/.cursor/ai-tracking/ai-code-tracking.db"
STATE_DB="$CURSOR_SUPPORT/User/globalStorage/state.vscdb"
SNAPSHOTS_DIR="$CURSOR_SUPPORT/snapshots"

# ── 若 Cursor 在运行则先强制退出 ──
if pgrep -f "Cursor" >/dev/null 2>&1; then
    echo "🛑 检测到 Cursor 正在运行，正在强制退出..."
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

echo "═══════════════════════════════════════════════"
echo "🔧 Cursor 激进清理（解决 24GB 问题）"
echo "═══════════════════════════════════════════════"
echo ""

# ── 统计清理前大小 ──
TOTAL_BEFORE=0

if [ -f "$STATE_DB" ]; then
    STATE_SIZE=$(du -m "$STATE_DB" | awk '{print $1}')
    TOTAL_BEFORE=$((TOTAL_BEFORE + STATE_SIZE))
    echo "📊 state.vscdb: ${STATE_SIZE} MB"
fi

if [ -f "$AI_TRACKING_DB" ]; then
    AI_SIZE=$(du -m "$AI_TRACKING_DB" | awk '{print $1}')
    TOTAL_BEFORE=$((TOTAL_BEFORE + AI_SIZE))
    echo "📊 ai-code-tracking.db: ${AI_SIZE} MB"
fi

if [ -d "$SNAPSHOTS_DIR" ]; then
    SNAP_SIZE=$(du -sm "$SNAPSHOTS_DIR" | awk '{print $1}')
    TOTAL_BEFORE=$((TOTAL_BEFORE + SNAP_SIZE))
    echo "📊 snapshots/: ${SNAP_SIZE} MB"
fi

echo ""
echo "📊 总计: ${TOTAL_BEFORE} MB (约 $((TOTAL_BEFORE / 1024)) GB)"
echo ""

# ── 确认 ──
echo "⚠️  本脚本将执行以下操作："
echo "   1. 清空 ai-code-tracking.db（Cursor 会按需重建）"
echo "   2. 清空 state.vscdb 的 cursorDiskKV（对话会显示空白，但 jsonl 原文保留）"
echo "   3. 删除 snapshots/ 目录（代码快照，可重建）"
echo "   4. 清理所有缓存和临时文件"
echo ""
echo "📝 注意："
echo "   - 对话原文在 ~/.cursor/projects/*/agent-transcripts/*.jsonl（不会删除）"
echo "   - Cursor 重启后会重建必要的数据库"
echo "   - 预计释放: ~${TOTAL_BEFORE} MB"
echo ""
read -p "确认执行激进清理？(y/N) " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "已取消。"
    exit 0
fi
echo ""

# ── Step 1: 清空 ai-code-tracking.db ──
if [ -f "$AI_TRACKING_DB" ]; then
    echo "🧹 Step 1/4: 清空 ai-code-tracking.db..."
    sqlite3 "$AI_TRACKING_DB" "
        DELETE FROM ai_code_hashes;
        DELETE FROM scored_commits WHERE id NOT IN (SELECT id FROM scored_commits ORDER BY id DESC LIMIT 100);
        VACUUM;
    " 2>&1
    echo "   ✅ ai-code-tracking.db 已清空"
fi

# ── Step 2: 清空 state.vscdb 的 cursorDiskKV ──
if [ -f "$STATE_DB" ]; then
    echo "🧹 Step 2/4: 清空 state.vscdb 的 cursorDiskKV..."
    sqlite3 "$STATE_DB" "
        PRAGMA journal_mode=DELETE;
        DELETE FROM cursorDiskKV;
        DELETE FROM ItemTable WHERE key = 'browserAutomation.history';
        DELETE FROM ItemTable WHERE key = 'aiCodeTrackingLines';
        VACUUM;
    " 2>&1
    echo "   ✅ state.vscdb 已清理"
fi

# ── Step 3: 删除 snapshots ──
if [ -d "$SNAPSHOTS_DIR" ]; then
    echo "🧹 Step 3/4: 删除 snapshots/ 目录..."
    rm -rf "$SNAPSHOTS_DIR"
    mkdir -p "$SNAPSHOTS_DIR"
    echo "   ✅ snapshots/ 已清空"
fi

# ── Step 4: 清理缓存 ──
echo "🧹 Step 4/4: 清理缓存和临时文件..."
rm -rf "$CURSOR_SUPPORT/GPUCache" "$CURSOR_SUPPORT/Cache" "$CURSOR_SUPPORT/CachedData" 2>/dev/null || true
rm -f "$STATE_DB"-wal "$STATE_DB"-shm 2>/dev/null || true
rm -f "$STATE_DB.backup" 2>/dev/null || true
find "$CURSOR_SUPPORT/User/globalStorage" -name "state.vscdb.pre_restore_*" -delete 2>/dev/null || true
echo "   ✅ 缓存已清理"

# ── 统计清理后大小 ──
TOTAL_AFTER=0

if [ -f "$STATE_DB" ]; then
    STATE_SIZE=$(du -m "$STATE_DB" | awk '{print $1}')
    TOTAL_AFTER=$((TOTAL_AFTER + STATE_SIZE))
fi

if [ -f "$AI_TRACKING_DB" ]; then
    AI_SIZE=$(du -m "$AI_TRACKING_DB" | awk '{print $1}')
    TOTAL_AFTER=$((TOTAL_AFTER + AI_SIZE))
fi

if [ -d "$SNAPSHOTS_DIR" ]; then
    SNAP_SIZE=$(du -sm "$SNAPSHOTS_DIR" | awk '{print $1}')
    TOTAL_AFTER=$((TOTAL_AFTER + SNAP_SIZE))
fi

SAVED=$((TOTAL_BEFORE - TOTAL_AFTER))

echo ""
echo "═══════════════════════════════════════════════"
echo "✅ 激进清理完成！"
echo ""
echo "📊 对比："
echo "   清理前总计: ${TOTAL_BEFORE} MB (约 $((TOTAL_BEFORE / 1024)) GB)"
echo "   清理后总计: ${TOTAL_AFTER} MB"
echo "   释放空间: ${SAVED} MB (约 $((SAVED / 1024)) GB)"
echo ""
echo "🔑 下一步："
echo "   1. 重新打开 Cursor（首次启动会稍慢 10-20 秒）"
echo "   2. Cursor 会自动重建必要的数据库"
echo "   3. 旧对话显示空白是正常的（jsonl 原文仍在）"
echo ""
echo "💡 预防措施："
echo "   - 建议每周执行一次清理：bash cursor_clean_ai_tracking_old.sh 7"
echo "   - 减少工作区数量（只保留 1-2 个）"
echo "   - 定期检查数据库大小"
echo "═══════════════════════════════════════════════"
