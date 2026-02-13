#!/bin/bash
# 安全清理脚本 - 只清理可恢复内容
# 使用方法: chmod +x 安全清理.sh && ./安全清理.sh

set -e

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║           🧹 macOS 安全清理脚本                       ║"
echo "║           $(date '+%Y-%m-%d %H:%M:%S')                          ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# 清理前空间
BEFORE=$(df -h /System/Volumes/Data | awk 'NR==2{print $4}')
echo "📊 清理前可用空间: $BEFORE"
echo ""
echo "=========================================="

# 1. 回收站
echo "[1/7] 🗑️  清空回收站..."
rm -rf ~/.Trash/* 2>/dev/null || true
echo "      ✓ 回收站已清空"

# 2. 系统缓存
echo "[2/7] 📁 清理系统缓存..."
rm -rf ~/Library/Caches/* 2>/dev/null || true
echo "      ✓ 系统缓存已清理"

# 3. 开发缓存 - npm/yarn/pnpm
echo "[3/7] 📦 清理 Node.js 缓存..."
rm -rf ~/.npm/_npx ~/.npm/_logs ~/.npm/_cacache 2>/dev/null || true
rm -rf ~/.pnpm-store 2>/dev/null || true
rm -rf ~/.yarn/cache 2>/dev/null || true
echo "      ✓ Node.js 缓存已清理"

# 4. Python 缓存
echo "[4/7] 🐍 清理 Python 缓存..."
find ~/ -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find ~/ -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
rm -rf ~/.cache/pip 2>/dev/null || true
echo "      ✓ Python 缓存已清理"

# 5. 通用缓存
echo "[5/7] 🔧 清理通用缓存..."
rm -rf ~/.cache/* 2>/dev/null || true
rm -rf ~/.gradle/caches 2>/dev/null || true
echo "      ✓ 通用缓存已清理"

# 6. Xcode
echo "[6/7] 📱 清理 Xcode..."
rm -rf ~/Library/Developer/Xcode/DerivedData/* 2>/dev/null || true
rm -rf ~/Library/Developer/Xcode/Archives/* 2>/dev/null || true
echo "      ✓ Xcode 已清理"

# 7. Homebrew
echo "[7/7] 🍺 清理 Homebrew..."
if command -v brew &> /dev/null; then
    brew cleanup --prune=all 2>/dev/null || true
    brew autoremove 2>/dev/null || true
    echo "      ✓ Homebrew 已清理"
else
    echo "      ⏭️  Homebrew 未安装，跳过"
fi

echo ""
echo "=========================================="

# 清理后空间
AFTER=$(df -h /System/Volumes/Data | awk 'NR==2{print $4}')
echo ""
echo "📊 清理后可用空间: $AFTER"
echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║           🎉 清理完成!                                ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
