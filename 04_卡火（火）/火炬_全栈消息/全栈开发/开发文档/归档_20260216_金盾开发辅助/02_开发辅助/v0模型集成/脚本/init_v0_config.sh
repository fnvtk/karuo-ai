#!/bin/bash
# v0配置初始化脚本
# 用法: ./init_v0_config.sh [目标项目路径]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REFS_DIR="$SCRIPT_DIR/../references"
TARGET_DIR="${1:-.}"

echo "🚀 v0配置初始化"
echo "目标路径: $TARGET_DIR"

# 复制配置文件
cp "$REFS_DIR/.v0rc.json" "$TARGET_DIR/"
cp "$REFS_DIR/.cursorrules" "$TARGET_DIR/"

echo "✅ 配置文件已复制:"
echo "   - .v0rc.json (v0 API配置)"
echo "   - .cursorrules (Cursor规则)"
echo ""
echo "📝 默认模型: claude-opus"
echo "💡 修改模型: 编辑 .v0rc.json 的 defaultModel 字段"
echo ""
echo "可选模型:"
echo "   - claude-opus (复杂推理)"
echo "   - claude-3.5-sonnet (通用)"
echo "   - v0-1.5-md (生产UI)"
echo "   - v0-1.5-turbo (快速)"
