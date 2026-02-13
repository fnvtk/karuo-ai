#!/bin/bash
# ====================================
# 上帝之眼 - 一键交易执行脚本
# ====================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo "👁️  上帝之眼 - 实盘交易系统"
echo "======================================"
echo ""

# 检查Python
if ! command -v python3 &> /dev/null; then
    echo "❌ 错误: 未找到 python3"
    exit 1
fi

# 检查并安装依赖
echo "📦 检查依赖..."

python3 -c "import akshare" 2>/dev/null || {
    echo "   安装 akshare..."
    pip3 install akshare -q
}

python3 -c "import pandas" 2>/dev/null || {
    echo "   安装 pandas..."
    pip3 install pandas numpy -q
}

python3 -c "import aiohttp" 2>/dev/null || {
    echo "   安装 aiohttp..."
    pip3 install aiohttp -q
}

echo "✅ 依赖检查完成"
echo ""

# 运行交易
echo "🚀 启动交易系统..."
echo ""

cd scripts
python3 real_trade.py

echo ""
echo "======================================"
echo "📊 打开数据报告..."
echo ""

# 打开报告页面
REPORT_PATH="$SCRIPT_DIR/reports/dashboard.html"
if [ -f "$REPORT_PATH" ]; then
    open "$REPORT_PATH" 2>/dev/null || xdg-open "$REPORT_PATH" 2>/dev/null || echo "请手动打开: $REPORT_PATH"
fi

echo "✅ 完成"
