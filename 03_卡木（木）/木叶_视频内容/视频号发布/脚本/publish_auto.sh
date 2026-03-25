#!/usr/bin/env bash
# 全自动上传：先 API 预检，通过后再执行 publish-dir（参数原样透传）
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"
if ! python3 channels_web_cli.py check; then
  echo ""
  echo "[!] 请先登录视频号后再运行本脚本，例如："
  echo "    CHANNELS_SILENT_QR=1 python3 channels_login.py"
  echo "    打开 /tmp/channels_qr.png 用微信扫码"
  exit 1
fi
exec python3 channels_web_cli.py publish-dir "$@"
