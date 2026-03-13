#!/usr/bin/env bash
# ──────────────────────────────────────────────
#  艾叶 IM Bridge 启动脚本
#  用法: bash start.sh [端口]
# ──────────────────────────────────────────────
set -e
cd "$(dirname "$0")"

PORT="${1:-18900}"

if [ ! -d ".venv" ]; then
    echo "→ 创建虚拟环境 .venv"
    python3 -m venv .venv
fi

echo "→ 安装依赖"
.venv/bin/pip install -q -r requirements.txt

if [ ! -f "config/channels.yaml" ]; then
    echo "→ 初始化配置文件 config/channels.yaml"
    cp config/channels.example.yaml config/channels.yaml
fi

echo "→ 启动艾叶 IM Bridge (端口 $PORT)"
AIYE_PORT="$PORT" .venv/bin/python main.py
