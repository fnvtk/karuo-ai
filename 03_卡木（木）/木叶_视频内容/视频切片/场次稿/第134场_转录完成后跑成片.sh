#!/usr/bin/env bash
# 在 transcript.srt 生成后执行（可与后台 transcribe_fast 衔接）
set -euo pipefail
OUT="${1:-$HOME/Movies/soul视频/第134场_20260326_output}"
SCRIPT="$(cd "$(dirname "$0")/../脚本" && pwd)"
SRT="$OUT/transcript.srt"
MAX_WAIT_SEC="${2:-7200}"

echo "等待 $SRT （最多 ${MAX_WAIT_SEC}s）…"
for ((i=0; i<MAX_WAIT_SEC; i+=30)); do
  if [[ -f "$SRT" ]] && [[ -s "$SRT" ]]; then
    echo "已找到 transcript.srt"
    break
  fi
  sleep 30
  echo "…已等待 ${i}s"
done
if [[ ! -f "$SRT" ]] || [[ ! -s "$SRT" ]]; then
  echo "超时未找到 transcript.srt，退出"
  exit 1
fi

rm -f "$OUT/成片"/*.mp4 2>/dev/null || true
python3 "$SCRIPT/soul_enhance.py" \
  -c "$OUT/切片" \
  -l "$OUT/highlights.json" \
  -t "$SRT" \
  -o "$OUT/成片" \
  --vertical --title-only --force-burn-subs --typewriter-subs \
  --crop-vf "crop=752:1080:416:0" --overlay-x 416 \
  --silence-gentle
echo "成片目录: $OUT/成片"
