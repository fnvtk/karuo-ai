#!/usr/bin/env bash
# Cursor 缓存清理（轻量版）—— 深度修复请用 cursor_deep_fix.sh
# 使用：完全退出 Cursor 后执行。若需在 Cursor 未退出时强制清理：SKIP_CURSOR_CHECK=1 bash 本脚本

set -e
CURSOR_SUPPORT="$HOME/Library/Application Support/Cursor"

# ── 未跳过检查时：若 Cursor 在运行则先强制退出 Cursor 及所有相关进程 ──
if [ -z "${SKIP_CURSOR_CHECK:-}" ] && pgrep -f "Cursor" >/dev/null 2>&1; then
  echo "🛑 检测到 Cursor 正在运行，正在强制退出 Cursor 及相关进程..."
  killall Cursor 2>/dev/null || true
  sleep 3
  pkill -9 -f "Cursor" 2>/dev/null || true
  sleep 2
  if pgrep -f "Cursor" >/dev/null 2>&1; then
    echo "⚠️  Cursor 仍在运行，请从「活动监视器」手动结束，或执行: SKIP_CURSOR_CHECK=1 bash \"$0\""
    exit 1
  fi
  echo "   ✅ Cursor 已退出，继续执行..."
fi

echo "🧹 清理 Cursor GPUCache / Cache / CachedData..."
rm -rf "$CURSOR_SUPPORT/GPUCache" "$CURSOR_SUPPORT/Cache" "$CURSOR_SUPPORT/CachedData"
echo "✅ 清理完成。可重新打开 Cursor。"
echo ""
echo "💡 如果仍频繁崩溃，请执行深度修复脚本："
echo "   bash \"$(dirname "$0")/cursor_deep_fix.sh\""
