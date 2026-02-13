#!/bin/bash
# 🔥 卡若AI Siri快捷指令一键安装脚本

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  🔥 卡若AI Siri快捷指令安装                              ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# 创建快捷指令目录
SHORTCUT_NAME="问卡若"
APP_PATH="/Users/karuo/Documents/个人/卡若AI/_共享模块/local_llm/app"

# 方法1：创建可被Siri调用的命令行别名
echo "1️⃣  创建命令行工具..."
sudo ln -sf "$APP_PATH/ask_karuo.sh" /usr/local/bin/ask_karuo 2>/dev/null || \
ln -sf "$APP_PATH/ask_karuo.sh" /usr/local/bin/ask_karuo

# 方法2：通过shortcuts命令创建（需要手动确认）
echo ""
echo "2️⃣  正在打开快捷指令App..."
echo "    请按以下步骤手动添加："
echo ""
echo "    步骤1: 点击 + 创建新快捷指令"
echo "    步骤2: 搜索并添加「要求输入」→ 提示：问卡若什么？"
echo "    步骤3: 搜索并添加「运行Shell脚本」"
echo "    步骤4: 粘贴脚本内容（已复制到剪贴板）"
echo "    步骤5: 命名为「问卡若」并添加到Siri"
echo ""

# 复制脚本到剪贴板
SCRIPT_CONTENT='/Users/karuo/Documents/个人/卡若AI/_共享模块/local_llm/app/ask_karuo.sh "$1"'
echo "$SCRIPT_CONTENT" | pbcopy

echo "📋 脚本已复制到剪贴板！"
echo ""

# 打开快捷指令App
open -a "Shortcuts"

echo "═══════════════════════════════════════════════════════════"
echo ""
echo "🎤 安装完成后，你可以说："
echo "   「Hey Siri，问卡若」"
echo ""
echo "💻 或在终端直接使用："
echo "   ask_karuo '今天有什么安排'"
echo ""
