#!/bin/bash
# 飞书管理 - 一键启动脚本
# 作者: 卡若

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "🦋 飞书管理工具启动中..."
echo "================================"

# 检查Python
if ! command -v python3 &> /dev/null; then
    echo "❌ 未找到Python3，请先安装"
    exit 1
fi

# 检查依赖
if ! python3 -c "import flask" 2>/dev/null; then
    echo "📦 安装依赖..."
    pip3 install -r requirements.txt
fi

# 启动后端服务
echo "🚀 启动飞书API服务 (端口5050)..."
python3 feishu_api.py &
API_PID=$!

# 等待服务启动
sleep 2

# 打开前端页面
FRONTEND_PATH="$SCRIPT_DIR/../frontend/index.html"
if [ -f "$FRONTEND_PATH" ]; then
    echo "🌐 打开Web界面..."
    open "$FRONTEND_PATH"
else
    echo "💡 请在浏览器打开: http://localhost:5050"
fi

echo ""
echo "================================"
echo "✅ 飞书工具箱已启动!"
echo "📍 API地址: http://localhost:5050"
echo "💡 按 Ctrl+C 停止服务"
echo "================================"

# 等待用户中断
trap "echo ''; echo '🛑 正在停止服务...'; kill $API_PID 2>/dev/null; echo '✅ 已停止'; exit 0" INT

wait $API_PID
