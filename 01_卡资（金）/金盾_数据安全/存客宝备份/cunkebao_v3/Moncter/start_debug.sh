#!/bin/bash

# 数据采集任务调试启动脚本（显示实时日志）
# 使用方法: chmod +x start_debug.sh && ./start_debug.sh

set -e

echo "=================================================="
echo "  数据采集任务 - 调试模式启动"
echo "  实时显示所有日志输出"
echo "=================================================="
echo ""

# 检查 PHP
if ! command -v php &> /dev/null; then
    echo "❌ 错误: 未找到 PHP，请先安装 PHP"
    exit 1
fi

echo "✓ PHP 版本: $(php -v | head -n 1)"
echo ""

# 停止已有进程
if [ -f "runtime/webman.pid" ]; then
    echo "🛑 停止已运行的进程..."
    php start.php stop
    sleep 2
fi

# 以调试模式启动（不使用 daemon 模式，输出到终端）
echo "🚀 启动 Workerman（调试模式）..."
echo "   提示: 按 Ctrl+C 停止"
echo "=================================================="
echo ""

# 使用 start 而不是 start -d（daemon），这样输出会显示在终端
php start.php start

