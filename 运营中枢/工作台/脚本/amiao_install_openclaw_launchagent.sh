#!/usr/bin/env bash
# 在「能 SSH 到阿猫」的机器上执行：安装 LaunchAgent，使龙虾网关登录自启 + 崩溃自动拉起。
# 默认：ssh -p 22203 kr@macbook.quwanzhi.com
set -euo pipefail
AMIAO_SSH="${AMIAO_SSH:-ssh -p 22203 kr@macbook.quwanzhi.com}"
REPO_PLIST="$(cd "$(dirname "$0")" && pwd)/com.openclaw.gateway.longmao.plist"

if [[ ! -f "$REPO_PLIST" ]]; then
  echo "缺少 $REPO_PLIST" >&2
  exit 1
fi

echo ">>> 推 plist 并加载 LaunchAgent（用户 kr）…"
$AMIAO_SSH bash -s <<'ENDREMOTE'
set -euo pipefail
PLIST_SRC="$HOME/Library/LaunchAgents/com.openclaw.gateway.longmao.plist"
mkdir -p "$HOME/Library/LaunchAgents"
# 先卸载旧任务（忽略不存在）
launchctl bootout "gui/$(id -u)/com.openclaw.gateway.longmao" 2>/dev/null || true
launchctl unload "$PLIST_SRC" 2>/dev/null || true
# 结束旧的手动网关，避免占端口
pkill -f "/openclaw/dist/index.js gateway" 2>/dev/null || true
# 停用旧 Label「ai.openclaw.gateway」（曾用错误 Node 版本，易与龙虾冲突）
UIDN="$(id -u)"
launchctl bootout "gui/$UIDN/ai.openclaw.gateway" 2>/dev/null || launchctl unload "$HOME/Library/LaunchAgents/ai.openclaw.gateway.plist" 2>/dev/null || true
if [[ -f "$HOME/Library/LaunchAgents/ai.openclaw.gateway.plist" ]]; then
  mv "$HOME/Library/LaunchAgents/ai.openclaw.gateway.plist" "$HOME/Library/LaunchAgents/ai.openclaw.gateway.plist.off_autodisable"
fi
sleep 2
ENDREMOTE

# 上传 plist（本机路径 → 远程）
$AMIAO_SSH "cat > /Users/kr/Library/LaunchAgents/com.openclaw.gateway.longmao.plist" < "$REPO_PLIST"

$AMIAO_SSH bash -s <<'ENDREMOTE'
set -euo pipefail
PLIST="$HOME/Library/LaunchAgents/com.openclaw.gateway.longmao.plist"
chmod 644 "$PLIST"
UID_NUM="$(id -u)"
# macOS 现代用法：bootstrap + enable + kickstart
launchctl bootstrap "gui/$UID_NUM" "$PLIST" 2>/dev/null || launchctl load -w "$PLIST"
launchctl enable "gui/$UID_NUM/com.openclaw.gateway.longmao" 2>/dev/null || true
launchctl kickstart -k "gui/$UID_NUM/com.openclaw.gateway.longmao" 2>/dev/null || true
sleep 4
echo "=== launchctl list (grep openclaw) ==="
launchctl list | grep -i openclaw || true
echo "=== 18789 ==="
lsof -iTCP:18789 -sTCP:LISTEN 2>/dev/null || echo "未监听（看 err 日志）"
echo "=== stderr 末 20 行 ==="
tail -20 "$HOME/.openclaw/launchd-gateway-longmao.err.log" 2>/dev/null || true
ENDREMOTE

echo ">>> 完成。阿猫重启或注销后需用户 kr 登录一次，LaunchAgent 才会再次加载（用户级规则）。"
