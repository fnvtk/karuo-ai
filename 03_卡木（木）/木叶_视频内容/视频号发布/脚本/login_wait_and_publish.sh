#!/usr/bin/env bash
# 静默出码 → 轮询 check 直到 API 正常 → 默认走 publish_auto.sh（API 优先，exit 2 再 web_cli）
# 用法: ./login_wait_and_publish.sh --video-dir "/path/成片" [--limit 2]
set -u
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR" || exit 1

run_publish() {
  exec bash "$DIR/publish_auto.sh" "$@"
}

if python3 channels_web_cli.py check; then
  echo "[✓] 会话已可用，执行 publish_auto.sh（API→CLI 回补）"
  run_publish "$@"
fi

echo "[i] API 不可用，后台启动静默登录（二维码 /tmp/channels_qr.png），请用微信扫码…"
CHANNELS_SILENT_QR=1 python3 channels_login.py >> /tmp/channels_login_bg.log 2>&1 &
LOGINPID=$!

cleanup() { kill "$LOGINPID" 2>/dev/null || true; }
trap cleanup EXIT

# 最长约 6 分钟（与 channels_login 内扫码等待对齐）
for i in $(seq 1 24); do
  sleep 15
  if python3 channels_web_cli.py check; then
    echo "[✓] 会话已可用（轮询第 ${i} 次）"
    cleanup
    trap - EXIT
    run_publish "$@"
  fi
  echo "[i] 仍等待扫码… ${i}/24（每 15s 检测）"
done

echo "[✗] 超时仍未登录：请查看 /tmp/channels_qr.png 与 /tmp/channels_login_bg.log"
exit 1
