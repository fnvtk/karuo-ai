#!/usr/bin/env bash
# 将 Cursor 的 globalStorage（含 state.vscdb）迁移到其他硬盘/目录，原位置用符号链接指向新位置。
# 效果：数据实际存在别处，减轻主盘占用与单库读取压力；Cursor 仍从原路径访问，功能不变。
# 使用：Cmd+Q 完全退出 Cursor → 执行本脚本并传入目标目录 → 重新打开 Cursor。
# 说明见：运营中枢/参考资料/Cursor闪退排查_20260304.md 第十节

set -euo pipefail

CURSOR_SUPPORT="$HOME/Library/Application Support/Cursor"
GLOBAL_STORAGE="$CURSOR_SUPPORT/User/globalStorage"

# ── 检查 Cursor 是否在运行 ──
if pgrep -f "Cursor.app" >/dev/null 2>&1; then
  echo "⚠️  Cursor 正在运行！请先 Cmd+Q 完全退出后再执行。"
  exit 1
fi

# ── 目标目录：第一个参数，或使用默认 ──
TARGET="${1:-}"
if [ -z "$TARGET" ]; then
  echo "用法: $0 <目标目录>"
  echo "  将 globalStorage（含 state.vscdb）移动到目标目录，并在原位置创建符号链接。"
  echo ""
  echo "示例:"
  echo "  $0 /Volumes/外置硬盘/CursorGlobalStorage   # 移到外置硬盘"
  echo "  $0 \$HOME/CursorData/globalStorage           # 移到用户目录下"
  echo ""
  echo "注意: 目标目录的父目录必须已存在；若目标目录已存在且非空，会先备份为 *.bak.\$(date)。"
  exit 1
fi

# 展开 ~ 和 $HOME
TARGET="${TARGET/#\~/$HOME}"
TARGET="$(cd -P "$(dirname "$TARGET")" 2>/dev/null && pwd)/$(basename "$TARGET")" || true
if [ -z "$TARGET" ] || [ ! -d "$(dirname "$TARGET")" ]; then
  echo "❌ 目标路径的父目录不存在: $(dirname "$TARGET")"
  exit 1
fi

# ── 若当前已是符号链接，仅报告并退出 ──
if [ -L "$GLOBAL_STORAGE" ]; then
  LINK_TO="$(readlink "$GLOBAL_STORAGE")"
  echo "✅ globalStorage 已是符号链接，指向: $LINK_TO"
  echo "   无需重复迁移。若要改到新位置，请先删除该链接并恢复原目录后再运行本脚本。"
  exit 0
fi

# ── 若原路径不存在（例如首次安装），无需迁移 ──
if [ ! -d "$GLOBAL_STORAGE" ]; then
  echo "ℹ️  原路径不存在: $GLOBAL_STORAGE"
  echo "   无需迁移。"
  exit 0
fi

# ── 若目标目录已存在且非空，备份 ──
if [ -d "$TARGET" ] && [ -n "$(ls -A "$TARGET" 2>/dev/null)" ]; then
  BAK="${TARGET}.bak.$(date +%Y%m%d_%H%M%S)"
  echo "📦 目标目录已存在且非空，先备份为: $BAK"
  mv "$TARGET" "$BAK"
fi
mkdir -p "$(dirname "$TARGET")"

# ── 移动目录并创建符号链接 ──
echo "📂 正在将 globalStorage 移动到: $TARGET"
mv "$GLOBAL_STORAGE" "$TARGET"
ln -s "$TARGET" "$GLOBAL_STORAGE"
echo "🔗 已创建符号链接: $GLOBAL_STORAGE -> $TARGET"
echo ""
echo "═══════════════════════════════════════"
echo "✅ 迁移完成。Cursor 仍从原路径读写，功能不变。"
echo "   实际数据位置: $TARGET"
echo "   下一步: 直接打开 Cursor 即可。"
echo "═══════════════════════════════════════"
