#!/bin/bash

# Moncter MCP Server 安装脚本

echo "正在安装 Moncter MCP Server..."

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "错误: 未找到 Node.js，请先安装 Node.js (>= 18)"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "错误: Node.js 版本过低，需要 >= 18"
    exit 1
fi

# 安装依赖
echo "安装依赖..."
npm install

# 编译 TypeScript
echo "编译 TypeScript..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Moncter MCP Server 安装成功！"
    echo ""
    echo "使用说明："
    echo "1. 确保后端服务运行在 http://127.0.0.1:8787"
    echo "2. 配置 MCP 客户端，添加 Moncter MCP 服务器"
    echo "3. 查看 MCP/MCP服务器使用说明.md 了解详细用法"
else
    echo "❌ 编译失败，请检查错误信息"
    exit 1
fi

