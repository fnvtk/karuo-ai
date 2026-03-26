#!/usr/bin/env bash
# 卡若默认视频号分发：① channels_api_publish（纯 httpx CLI）→ 若 exit 2（缺 finder_raw 等 API 前置）则 ② channels_web_cli publish-dir（无头 Playwright CLI）
# 用法（与 API 一致，透传参数）:
#   ./publish_auto.sh --video-dir "/path/to/mp4目录"
#   CHANNELS_VIDEO_DIR=/path/to/dir ./publish_auto.sh
# 关闭回补（只跑 API）: CHANNELS_NO_WEB_FALLBACK=1 ./publish_auto.sh --video-dir "..."
set -uo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

WEB_EXTRA=(--min-gap 10 --max-gap 25 --start-after-min 5 --interval-min 15 --max-attempts 5)

if [ "${CHANNELS_NO_WEB_FALLBACK:-}" = "1" ]; then
  exec python3 channels_api_publish.py "$@"
fi

set +e
python3 channels_api_publish.py "$@"
ec=$?
set -e

if [ "$ec" -eq 0 ]; then
  exit 0
fi

if [ "$ec" -eq 2 ]; then
  echo "" >&2
  echo "[i] API 前置不满足（exit 2），回退 channels_web_cli publish-dir …" >&2
  exec python3 channels_web_cli.py publish-dir "${WEB_EXTRA[@]}" "$@"
fi

exit "$ec"
