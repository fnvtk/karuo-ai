#!/bin/bash
# iPhone 自动服务安装脚本
# 功能：安装 LaunchAgent 实现开机自动运行
# 作者：卡若AI

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
PLIST_CONNECT="com.karuo.iphone.autoconnect.plist"
PLIST_BACKUP="com.karuo.iphone.autobackup.plist"

echo "=== iPhone 自动服务安装 ==="

# 创建 LaunchAgents 目录
mkdir -p "$LAUNCH_AGENTS_DIR"

# 设置脚本可执行权限
chmod +x "$SCRIPT_DIR/iphone_auto_connect.sh"
chmod +x "$SCRIPT_DIR/iphone_auto_backup.sh"

# 1. 创建网络自动连接服务（每 60 秒检查一次）
cat > "$LAUNCH_AGENTS_DIR/$PLIST_CONNECT" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.karuo.iphone.autoconnect</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>$SCRIPT_DIR/iphone_auto_connect.sh</string>
    </array>
    <key>StartInterval</key>
    <integer>60</integer>
    <key>RunAtLoad</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/iphone_autoconnect.out</string>
    <key>StandardErrorPath</key>
    <string>/tmp/iphone_autoconnect.err</string>
</dict>
</plist>
EOF

echo "✓ 已创建网络自动连接服务配置"

# 2. 创建自动备份服务（USB 设备插入时触发）
cat > "$LAUNCH_AGENTS_DIR/$PLIST_BACKUP" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.karuo.iphone.autobackup</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>$SCRIPT_DIR/iphone_auto_backup.sh</string>
    </array>
    <key>WatchPaths</key>
    <array>
        <string>/var/run/usbmuxd</string>
    </array>
    <key>RunAtLoad</key>
    <false/>
    <key>StandardOutPath</key>
    <string>/tmp/iphone_autobackup.out</string>
    <key>StandardErrorPath</key>
    <string>/tmp/iphone_autobackup.err</string>
</dict>
</plist>
EOF

echo "✓ 已创建自动备份服务配置"

# 3. 加载服务
echo ""
echo "正在加载服务..."

# 先卸载旧服务（如果存在）
launchctl unload "$LAUNCH_AGENTS_DIR/$PLIST_CONNECT" 2>/dev/null
launchctl unload "$LAUNCH_AGENTS_DIR/$PLIST_BACKUP" 2>/dev/null

# 加载新服务
launchctl load "$LAUNCH_AGENTS_DIR/$PLIST_CONNECT"
launchctl load "$LAUNCH_AGENTS_DIR/$PLIST_BACKUP"

echo "✓ 服务已加载"

# 4. 检查服务状态
echo ""
echo "服务状态:"
launchctl list | grep "com.karuo.iphone"

echo ""
echo "=== 安装完成 ==="
echo ""
echo "功能说明:"
echo "1. 网络自动连接：每 60 秒检查网络，无网络时自动切换到 iPhone"
echo "2. 自动备份：iPhone 连接时自动触发备份（每 24 小时一次）"
echo ""
echo "如需卸载服务，运行: $SCRIPT_DIR/uninstall_auto_service.sh"
