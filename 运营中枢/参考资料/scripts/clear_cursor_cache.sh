#!/usr/bin/env bash
# Cursor 缓存清理脚本（缓解窗口无响应/崩溃）
# 使用：完全退出 Cursor 后执行本脚本；若 Cursor 在运行会提示先退出再执行。
# 说明见：运营中枢/参考资料/Cursor闪退排查_20260304.md

set -e
CURSOR_SUPPORT="$HOME/Library/Application Support/Cursor"

if pgrep -f "Cursor.app" >/dev/null 2>&1; then
  echo "⚠️  Cursor 正在运行，请先 Cmd+Q 完全退出后再执行本脚本。"
  echo "   执行：bash \"$(dirname "$0")/clear_cursor_cache.sh\""
  exit 1
fi

echo "🧹 正在清理 Cursor GPUCache 与 Cache..."
rm -rf "$CURSOR_SUPPORT/GPUCache" "$CURSOR_SUPPORT/Cache"
echo "✅ 清理完成。可重新打开 Cursor。"
