#!/bin/bash
# 会议电视 AirPlay（mPhotool/光元素等）：Mac 侧自检
# 用法：AIRPLAY_TARGET="mPhotool-45029" bash 会议电视_AirPlay_自检.sh
#       bash 会议电视_AirPlay_自检.sh --refresh-mdns   （需本机 sudo 密码，刷新 Bonjour）
# 说明：电视端软件「到期/未激活」须在大屏上续费，本脚本无法代续；通过则 Mac 与网络就绪。

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

TARGET="${AIRPLAY_TARGET:-mPhotool-45029}"
FAIL=0

log_ok() { echo -e "${GREEN}[OK]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_fail() { echo -e "${RED}[FAIL]${NC} $*"; FAIL=1; }

if [[ "${1:-}" == "--refresh-mdns" ]]; then
  echo "刷新 mDNS（需管理员密码）…"
  sudo dscacheutil -flushcache 2>/dev/null || true
  sudo killall -HUP mDNSResponder 2>/dev/null || sudo killall -HUP mDNSResponderHelper 2>/dev/null || true
  log_ok "已发送 HUP，请重新打开「屏幕镜像」列表"
  exit 0
fi

echo "=== 会议电视 AirPlay 自检 · 目标实例: ${TARGET} ==="
echo ""

# 1) 防火墙
FW=$(/usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate 2>/dev/null || echo "unknown")
if echo "$FW" | grep -qi "enabled"; then
  log_fail "系统防火墙已开启，可能拦截投屏；建议在 系统设置 → 网络 → 防火墙 中关闭或为 AirPlay 放行"
else
  log_ok "应用防火墙未全局阻断 (State 0 或等效)"
fi

# 2) 默认路由（应走 Wi‑Fi 会议网）
GW=$(route -n get default 2>/dev/null | awk '/interface:/{print $2}') || true
log_ok "当前默认出口网卡: ${GW:-未知}"

# 3) Bonjour 是否能看到目标
echo ""
echo "正在浏览 _airplay._tcp（约 6 秒）…"
BROWSE_FILE=$(mktemp)
( sleep 6; pkill -INT -f "dns-sd -B _airplay._tcp" 2>/dev/null ) &
set +e
dns-sd -B _airplay._tcp local. >"$BROWSE_FILE" 2>&1
set -e
if ! grep -q "$TARGET" "$BROWSE_FILE" 2>/dev/null; then
  log_fail "Bonjour 未发现「${TARGET}」。请确认大屏投屏应用已开、与 Mac 同网段（勿用访客隔离 Wi‑Fi）"
else
  log_ok "Bonjour 已发现「${TARGET}」"
fi
rm -f "$BROWSE_FILE"

# 4) 解析主机并 ping
echo ""
echo "正在解析服务地址（约 8 秒）…"
LOOKUP_FILE=$(mktemp)
( sleep 8; pkill -INT -f "dns-sd -L ${TARGET}" 2>/dev/null ) &
set +e
dns-sd -L "$TARGET" _airplay._tcp local. >"$LOOKUP_FILE" 2>&1
set -e
LINE=$(grep 'can be reached at' "$LOOKUP_FILE" | head -1 || true)
rm -f "$LOOKUP_FILE"

if [[ -z "$LINE" ]]; then
  log_fail "未能解析「${TARGET}」的可达主机名（dns-sd -L 无结果）"
else
  AIRPLAY_HOST=$(echo "$LINE" | sed -n 's/.*at \([^:]*\):.*/\1/p')
  log_ok "解析到主机: ${AIRPLAY_HOST}"
  if ping -c 3 -W 2000 "${AIRPLAY_HOST}" >/dev/null 2>&1; then
    log_ok "ICMP 到接收端正常（丢包视为网络或 AP 问题）"
  else
    log_fail "无法 ping 通 ${AIRPLAY_HOST}，请检查 Wi-Fi/网线或路由器 AP 隔离"
  fi
fi

echo ""
echo "──────── 结论 ────────"
if [[ $FAIL -eq 0 ]]; then
  echo -e "${GREEN}Mac 侧网络与发现就绪。${NC}请 控制中心 → 屏幕镜像 → 选「${TARGET}」。"
  echo "若仍提示「到期」：须在会议电视上打开 mPhotool（或对应 App）完成续费/登录；或改用「光元素投屏」、HDMI 有线。"
  exit 0
else
  echo -e "${RED}Mac 侧存在问题项，请先按上文 [FAIL] 处理。${NC}"
  echo "仍异常时可执行: bash \"$0\" --refresh-mdns"
  exit 1
fi
