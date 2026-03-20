#!/usr/bin/env bash
# 清理 ai-code-tracking.db 中超过 N 天的旧数据（保留最近数据）
# 使用：bash cursor_clean_ai_tracking_old.sh [保留天数，默认30]

set -euo pipefail

DB="$HOME/.cursor/ai-tracking/ai-code-tracking.db"
DAYS_TO_KEEP=${1:-30}  # 默认保留 30 天

if [ ! -f "$DB" ]; then
    echo "❌ 未找到数据库：$DB"
    exit 1
fi

# 检查 Cursor 是否在运行
if pgrep -f "Cursor" >/dev/null 2>&1; then
    echo "⚠️  Cursor 正在运行，请先 Cmd+Q 退出 Cursor 后执行"
    exit 1
fi

echo "═══════════════════════════════════════════════"
echo "🧹 清理 ai-code-tracking.db 旧数据"
echo "═══════════════════════════════════════════════"
echo ""

BEFORE_SIZE=$(du -m "$DB" | awk '{print $1}')
BEFORE_ROWS=$(sqlite3 "$DB" "SELECT COUNT(*) FROM ai_code_hashes;" 2>/dev/null || echo "0")

echo "📊 清理前状态："
echo "   文件大小: ${BEFORE_SIZE} MB"
echo "   总行数: ${BEFORE_ROWS:,}"
echo "   保留天数: ${DAYS_TO_KEEP} 天"
echo ""

# 计算保留时间戳（N 天前）
CUTOFF_TS=$(python3 -c "import time; print(int((time.time() - $DAYS_TO_KEEP * 86400) * 1000))")

echo "🧹 正在清理超过 ${DAYS_TO_KEEP} 天的旧数据..."
DELETED=$(sqlite3 "$DB" "
    DELETE FROM ai_code_hashes 
    WHERE createdAt < $CUTOFF_TS;
    SELECT changes();
" 2>&1)

echo "🔧 正在压缩数据库（VACUUM）..."
sqlite3 "$DB" "VACUUM;" 2>&1

AFTER_SIZE=$(du -m "$DB" | awk '{print $1}')
AFTER_ROWS=$(sqlite3 "$DB" "SELECT COUNT(*) FROM ai_code_hashes;" 2>/dev/null || echo "0")
SAVED=$((BEFORE_SIZE - AFTER_SIZE))
SAVED_ROWS=$((BEFORE_ROWS - AFTER_ROWS))

echo ""
echo "═══════════════════════════════════════════════"
echo "✅ 清理完成！"
echo ""
echo "📊 对比："
echo "   清理前: ${BEFORE_SIZE} MB (${BEFORE_ROWS:,} 行)"
echo "   清理后: ${AFTER_SIZE} MB (${AFTER_ROWS:,} 行)"
echo "   删除行数: ${SAVED_ROWS:,}"
echo "   释放空间: ${SAVED} MB"
echo ""
echo "🔑 下一步："
echo "   重新打开 Cursor 即可正常使用"
echo "═══════════════════════════════════════════════"
