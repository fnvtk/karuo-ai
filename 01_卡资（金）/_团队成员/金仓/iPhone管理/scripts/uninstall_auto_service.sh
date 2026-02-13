#!/bin/bash
# iPhone 自动服务卸载脚本
# 作者：卡若AI

LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
PLIST_CONNECT="com.karuo.iphone.autoconnect.plist"
PLIST_BACKUP="com.karuo.iphone.autobackup.plist"

echo "=== iPhone 自动服务卸载 ==="

# 停止并卸载服务
echo "正在停止服务..."
launchctl unload "$LAUNCH_AGENTS_DIR/$PLIST_CONNECT" 2>/dev/null
launchctl unload "$LAUNCH_AGENTS_DIR/$PLIST_BACKUP" 2>/dev/null

# 删除配置文件
echo "正在删除配置文件..."
rm -f "$LAUNCH_AGENTS_DIR/$PLIST_CONNECT"
rm -f "$LAUNCH_AGENTS_DIR/$PLIST_BACKUP"

echo ""
echo "✓ 服务已卸载"
echo ""
echo "脚本文件保留在原位置，如需完全删除请手动操作"
