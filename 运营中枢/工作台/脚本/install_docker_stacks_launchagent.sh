#!/usr/bin/env bash
# 本机执行一次：安装登录兜底任务（com.karuo.docker-stacks-autostart）
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLIST_SRC="$SCRIPT_DIR/com.karuo.docker-stacks-autostart.plist"
SH_SRC="$SCRIPT_DIR/docker_mac_autostart_stacks.sh"
DEST="$HOME/Library/LaunchAgents/com.karuo.docker-stacks-autostart.plist"

for f in "$PLIST_SRC" "$SH_SRC"; do
  [[ -f "$f" ]] || { echo "缺少 $f" >&2; exit 1; }
done

chmod +x "$SH_SRC"
mkdir -p "$HOME/Library/Logs"
cp "$PLIST_SRC" "$DEST"

UIDN="$(id -u)"
launchctl bootout "gui/$UIDN/com.karuo.docker-stacks-autostart" 2>/dev/null || true
launchctl bootstrap "gui/$UIDN" "$DEST"

echo "已安装并加载 LaunchAgent: com.karuo.docker-stacks-autostart"
echo "日志: ~/Library/Logs/docker-stacks-autostart.log"
