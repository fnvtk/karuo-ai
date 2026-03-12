#!/usr/bin/env bash
# Cursor 缓存清理（轻量版）—— 深度修复请用 cursor_deep_fix.sh
# 使用：完全退出 Cursor 后执行

set -e
CURSOR_SUPPORT="$HOME/Library/Application Support/Cursor"

if pgrep -f "Cursor.app" >/dev/null 2>&1; then
  echo "⚠️  Cursor 正在运行，请先 Cmd+Q 完全退出后再执行。"
  exit 1
fi

echo "🧹 清理 Cursor GPUCache / Cache / CachedData..."
rm -rf "$CURSOR_SUPPORT/GPUCache" "$CURSOR_SUPPORT/Cache" "$CURSOR_SUPPORT/CachedData"
echo "✅ 清理完成。可重新打开 Cursor。"
echo ""
echo "💡 如果仍频繁崩溃，请执行深度修复脚本："
echo "   bash \"$(dirname "$0")/cursor_deep_fix.sh\""
