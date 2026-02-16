#!/bin/bash
# 批量排除开发目录（使用 .nosync 方案）
# 使用方法: chmod +x 排除开发目录.sh && ./排除开发目录.sh

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║           🔧 批量排除开发目录 (iCloud)                ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

TARGET_DIR="${1:-$HOME/Documents}"

echo "📂 扫描目录: $TARGET_DIR"
echo ""

# 统计
NODE_COUNT=0
VENV_COUNT=0
PYCACHE_COUNT=0

# 1. 排除 node_modules
echo "[1/4] 📦 处理 node_modules..."
while IFS= read -r -d '' dir; do
    if [ -d "$dir" ] && [ ! -L "$dir" ]; then
        echo "      → $dir"
        mv "$dir" "${dir}.nosync"
        ln -s "node_modules.nosync" "$dir"
        NODE_COUNT=$((NODE_COUNT + 1))
    fi
done < <(find "$TARGET_DIR" -maxdepth 8 -type d -name "node_modules" -print0 2>/dev/null)
echo "      ✓ 处理了 $NODE_COUNT 个 node_modules"

# 2. 排除 venv
echo ""
echo "[2/4] 🐍 处理 venv..."
while IFS= read -r -d '' dir; do
    if [ -d "$dir" ] && [ ! -L "$dir" ]; then
        echo "      → $dir"
        mv "$dir" "${dir}.nosync"
        ln -s "venv.nosync" "$dir"
        VENV_COUNT=$((VENV_COUNT + 1))
    fi
done < <(find "$TARGET_DIR" -maxdepth 8 -type d -name "venv" -print0 2>/dev/null)

# 3. 排除 .venv
echo ""
echo "[3/4] 🐍 处理 .venv..."
while IFS= read -r -d '' dir; do
    if [ -d "$dir" ] && [ ! -L "$dir" ]; then
        echo "      → $dir"
        mv "$dir" "${dir}.nosync"
        ln -s ".venv.nosync" "$dir"
        VENV_COUNT=$((VENV_COUNT + 1))
    fi
done < <(find "$TARGET_DIR" -maxdepth 8 -type d -name ".venv" -print0 2>/dev/null)
echo "      ✓ 处理了 $VENV_COUNT 个 Python 虚拟环境"

# 4. 排除 __pycache__
echo ""
echo "[4/4] 📁 处理 __pycache__..."
while IFS= read -r -d '' dir; do
    if [ -d "$dir" ] && [ ! -L "$dir" ]; then
        mv "$dir" "${dir}.nosync" 2>/dev/null
        ln -s "__pycache__.nosync" "$dir" 2>/dev/null
        PYCACHE_COUNT=$((PYCACHE_COUNT + 1))
    fi
done < <(find "$TARGET_DIR" -maxdepth 10 -type d -name "__pycache__" -print0 2>/dev/null)
echo "      ✓ 处理了 $PYCACHE_COUNT 个 __pycache__"

echo ""
echo "=========================================="
echo ""
echo "📊 处理统计:"
echo "   node_modules: $NODE_COUNT 个"
echo "   Python 虚拟环境: $VENV_COUNT 个"
echo "   __pycache__: $PYCACHE_COUNT 个"
echo ""

TOTAL=$((NODE_COUNT + VENV_COUNT + PYCACHE_COUNT))
if [ $TOTAL -gt 0 ]; then
    echo "💡 这些目录已转换为 .nosync 格式，iCloud 将不再同步它们"
    echo "   原目录变为符号链接，不影响项目正常运行"
else
    echo "✅ 未发现需要处理的目录，或所有目录已处理过"
fi

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║           ✅ 处理完成!                                ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
