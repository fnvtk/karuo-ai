#!/usr/bin/env bash
# Cursor 深度修复脚本（解决反复崩溃 / code 5 / Reopen 弹窗）
# 使用：Cmd+Q 完全退出 Cursor → 执行本脚本 → 重新打开 Cursor
# 说明见：运营中枢/参考资料/Cursor闪退排查_20260304.md

set -euo pipefail

CURSOR_SUPPORT="$HOME/Library/Application Support/Cursor"
TRASH_DIR="$HOME/.Trash/cursor_cleanup_$(date +%Y%m%d_%H%M%S)"

# ── 检查 Cursor 是否在运行 ──
if pgrep -f "Cursor.app" >/dev/null 2>&1; then
  echo "⚠️  Cursor 正在运行！请先 Cmd+Q 完全退出后再执行。"
  exit 1
fi

echo "🔧 Cursor 深度修复开始..."
echo "   备份目录: $TRASH_DIR"
mkdir -p "$TRASH_DIR"

freed_mb=0

# ── 1. 重置膨胀的 state.vscdb（核心修复） ──
STATE_DB="$CURSOR_SUPPORT/User/globalStorage/state.vscdb"
if [ -f "$STATE_DB" ]; then
  size_mb=$(du -m "$STATE_DB" | python3 -c "import sys; print(sys.stdin.read().split()[0])")
  if [ "$size_mb" -gt 200 ]; then
    echo "🗄️  state.vscdb 已膨胀到 ${size_mb}MB（正常 <100MB），正在重置..."
    mv "$STATE_DB" "$TRASH_DIR/state.vscdb"
    [ -f "${STATE_DB}-shm" ] && mv "${STATE_DB}-shm" "$TRASH_DIR/"
    [ -f "${STATE_DB}-wal" ] && mv "${STATE_DB}-wal" "$TRASH_DIR/"
    [ -f "${STATE_DB}.backup" ] && mv "${STATE_DB}.backup" "$TRASH_DIR/"
    freed_mb=$((freed_mb + size_mb))
    echo "   ✅ 已移到废纸篓备份（Cursor 重启会自动重建干净的数据库）"
  else
    echo "🗄️  state.vscdb ${size_mb}MB，大小正常，跳过"
  fi
fi

# ── 2. 清理 GPUCache + Cache ──
for cache_dir in GPUCache Cache; do
  target="$CURSOR_SUPPORT/$cache_dir"
  if [ -d "$target" ]; then
    size=$(du -sm "$target" 2>/dev/null | python3 -c "import sys; print(sys.stdin.read().split()[0])" 2>/dev/null || echo 0)
    rm -rf "$target"
    freed_mb=$((freed_mb + size))
    echo "🧹 清理 $cache_dir（${size}MB）"
  fi
done

# ── 3. 清理 CachedData ──
CACHED="$CURSOR_SUPPORT/CachedData"
if [ -d "$CACHED" ]; then
  size=$(du -sm "$CACHED" 2>/dev/null | python3 -c "import sys; print(sys.stdin.read().split()[0])" 2>/dev/null || echo 0)
  rm -rf "$CACHED"
  freed_mb=$((freed_mb + size))
  echo "🧹 清理 CachedData（${size}MB）"
fi

# ── 4. 清理 >7天的旧日志 ──
LOGS_DIR="$CURSOR_SUPPORT/logs"
if [ -d "$LOGS_DIR" ]; then
  log_freed=0
  find "$LOGS_DIR" -mindepth 1 -maxdepth 1 -type d -mtime +7 | while read -r d; do
    rm -rf "$d"
  done
  remaining=$(du -sm "$LOGS_DIR" 2>/dev/null | python3 -c "import sys; print(sys.stdin.read().split()[0])" 2>/dev/null || echo 0)
  echo "🧹 清理 >7天旧日志（剩余 ${remaining}MB）"
fi

# ── 5. 清理 >30天的过期 workspaceStorage ──
WS_DIR="$CURSOR_SUPPORT/User/workspaceStorage"
if [ -d "$WS_DIR" ]; then
  ws_count=0
  find "$WS_DIR" -mindepth 1 -maxdepth 1 -type d -mtime +30 | while read -r d; do
    rm -rf "$d"
    ws_count=$((ws_count + 1))
  done
  remaining_ws=$(ls -1 "$WS_DIR" 2>/dev/null | wc -l | tr -d ' ')
  echo "🧹 清理过期工作区存储（保留 ${remaining_ws} 个活跃条目）"
fi

# ── 6. 清理 Crash Reports ──
CRASH_DIR="$CURSOR_SUPPORT/Crashpad"
if [ -d "$CRASH_DIR" ]; then
  size=$(du -sm "$CRASH_DIR" 2>/dev/null | python3 -c "import sys; print(sys.stdin.read().split()[0])" 2>/dev/null || echo 0)
  rm -rf "$CRASH_DIR"
  freed_mb=$((freed_mb + size))
  echo "🧹 清理 Crashpad（${size}MB）"
fi

echo ""
echo "═══════════════════════════════════════"
echo "✅ 深度修复完成！预计释放 ≥${freed_mb}MB"
echo "   备份已放入: $TRASH_DIR"
echo "   （确认无问题后可清空废纸篓）"
echo ""
echo "📋 修复内容:"
echo "   1. state.vscdb 膨胀数据库 → 已重置（重启自动重建）"
echo "   2. GPUCache / Cache / CachedData → 已清理"
echo "   3. 旧日志 / 过期工作区 → 已清理"
echo "   4. Crash Reports → 已清理"
echo ""
echo "🔑 下一步: 直接打开 Cursor 即可"
echo "   （首次启动会稍慢 10-20 秒，因为在重建状态数据库）"
echo "═══════════════════════════════════════"
