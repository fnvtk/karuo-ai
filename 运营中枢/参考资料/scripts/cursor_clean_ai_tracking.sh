#!/usr/bin/env bash
# Cursor ai-code-tracking.db 清理脚本
# 用途：清理膨胀的 ai-code-tracking.db（当前 1.0GB，358万行）
# 使用：Cmd+Q 完全退出 Cursor → 执行本脚本 → 重新打开 Cursor
#
# 清理内容：
#   1. ai_code_hashes — 代码哈希表（358万行，可清理旧数据）
#   2. scored_commits — 已评分提交（保留最近 1000 条）
#   3. VACUUM 压缩数据库
#
# 保留内容：
#   - conversation_summaries — 对话摘要（保留）
#   - tracking_state — 跟踪状态（保留）

set -euo pipefail

AI_TRACKING_DB="$HOME/.cursor/ai-tracking/ai-code-tracking.db"
TRASH_DIR="$HOME/.Trash/cursor_ai_tracking_$(date +%Y%m%d_%H%M%S)"

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

if [ ! -f "$AI_TRACKING_DB" ]; then
  echo "❌ 未找到 ai-code-tracking.db：$AI_TRACKING_DB"
  exit 1
fi

echo "═══════════════════════════════════════════════"
echo "🔬 Cursor ai-code-tracking.db 清理"
echo "═══════════════════════════════════════════════"
echo ""

# ── 清理前统计 ──
BEFORE_SIZE=$(du -m "$AI_TRACKING_DB" | awk '{print $1}')
echo "📊 清理前状态："
echo "   ai-code-tracking.db: ${BEFORE_SIZE} MB"

# 统计各表行数
AI_HASHES_COUNT=$(sqlite3 "$AI_TRACKING_DB" "SELECT COUNT(*) FROM ai_code_hashes;" 2>/dev/null || echo "0")
SCORED_COMMITS_COUNT=$(sqlite3 "$AI_TRACKING_DB" "SELECT COUNT(*) FROM scored_commits;" 2>/dev/null || echo "0")
CONV_SUMMARIES_COUNT=$(sqlite3 "$AI_TRACKING_DB" "SELECT COUNT(*) FROM conversation_summaries;" 2>/dev/null || echo "0")

echo "   ai_code_hashes      : $AI_HASHES_COUNT 行（将清理）"
echo "   scored_commits      : $SCORED_COMMITS_COUNT 行（保留最近 1000 条）"
echo "   conversation_summaries: $CONV_SUMMARIES_COUNT 行（保留）"
echo ""

# ── 确认 ──
echo "📋 本次操作："
echo "   🗑️  清理：ai_code_hashes 全部数据（358万行，可重建）"
echo "   🗑️  清理：scored_commits 旧数据（保留最近 1000 条）"
echo "   ✅ 保留：conversation_summaries（对话摘要）"
echo "   ✅ 保留：tracking_state（跟踪状态）"
echo "   🔧 执行：VACUUM（压缩数据库回收空间）"
echo ""
read -p "确认执行？(y/N) " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
  echo "已取消。"
  exit 0
fi
echo ""

# ── Step 1: 清理 ai_code_hashes（全部删除，Cursor 会按需重建） ──
echo "🧹 Step 1/3: 清理 ai_code_hashes 表..."
sqlite3 "$AI_TRACKING_DB" "DELETE FROM ai_code_hashes;" 2>&1
echo "   ✅ 已清空 ai_code_hashes（${AI_HASHES_COUNT} 行）"

# ── Step 2: 清理 scored_commits 旧数据（保留最近 1000 条） ──
if [ "$SCORED_COMMITS_COUNT" -gt 1000 ]; then
  echo "🧹 Step 2/3: 清理 scored_commits 旧数据（保留最近 1000 条）..."
  sqlite3 "$AI_TRACKING_DB" "
    DELETE FROM scored_commits 
    WHERE id NOT IN (
      SELECT id FROM scored_commits 
      ORDER BY id DESC 
      LIMIT 1000
    );
  " 2>&1
  REMAINING=$(sqlite3 "$AI_TRACKING_DB" "SELECT COUNT(*) FROM scored_commits;" 2>/dev/null || echo "0")
  echo "   ✅ 已清理 scored_commits（保留 $REMAINING 条）"
else
  echo "🧹 Step 2/3: scored_commits 仅 $SCORED_COMMITS_COUNT 条，无需清理"
fi

# ── Step 3: VACUUM 压缩数据库 ──
echo "🔧 Step 3/3: VACUUM 压缩数据库（可能需要 30-60 秒）..."
sqlite3 "$AI_TRACKING_DB" "VACUUM;" 2>&1
echo "   ✅ VACUUM 完成"

# ── 清理后统计 ──
AFTER_SIZE=$(du -m "$AI_TRACKING_DB" | awk '{print $1}')
SAVED=$((BEFORE_SIZE - AFTER_SIZE))
AFTER_AI_HASHES=$(sqlite3 "$AI_TRACKING_DB" "SELECT COUNT(*) FROM ai_code_hashes;" 2>/dev/null || echo "0")
AFTER_SCORED=$(sqlite3 "$AI_TRACKING_DB" "SELECT COUNT(*) FROM scored_commits;" 2>/dev/null || echo "0")

echo ""
echo "═══════════════════════════════════════════════"
echo "✅ 清理完成！"
echo ""
echo "📊 对比："
echo "   清理前 ai-code-tracking.db: ${BEFORE_SIZE} MB"
echo "   清理后 ai-code-tracking.db: ${AFTER_SIZE} MB"
echo "   释放空间                  : ≈${SAVED} MB"
echo ""
echo "📋 数据确认："
echo "   ai_code_hashes 行数       : $AFTER_AI_HASHES（已清空，Cursor 按需重建）"
echo "   scored_commits 行数       : $AFTER_SCORED（保留）"
echo ""
echo "🔑 下一步："
echo "   1. 打开 Cursor，正常使用即可"
echo "   2. ai_code_hashes 会在需要时自动重建"
echo "═══════════════════════════════════════════════"
