#!/usr/bin/env bash
# 第 127 场：高光 Hook 封面 + 逐字字幕 + 去静音 + 片尾 CTA + 竖屏成片（文件名=Hook）
set -euo pipefail
BASE="/Users/karuo/Movies/soul视频/第127场_20260318_output"
SCRIPT="/Users/karuo/Documents/个人/卡若AI/03_卡木（木）/木叶_视频内容/视频切片/脚本/soul_enhance.py"

# 尽量停掉本输出目录相关的 ffmpeg，避免与本次成片抢资源
pkill -f "ffmpeg.*第127场_20260318_output" 2>/dev/null || true

if [[ ! -f "$BASE/transcript.srt" ]]; then
  echo "缺少 $BASE/transcript.srt，请先准备整场字幕（建议对 audio.wav 跑 Whisper）。"
  exit 1
fi

BK="$BASE/成片_backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BK"
shopt -s nullglob
for f in "$BASE/成片"/*.mp4; do
  mv "$f" "$BK/" || true
done
shopt -u nullglob

python3 "$SCRIPT" \
  --clips "$BASE/切片" \
  --output "$BASE/成片" \
  --highlights "$BASE/highlights.json" \
  --transcript "$BASE/transcript.srt" \
  --vertical \
  --typewriter-subs \
  --force-burn-subs \
  --title-only

echo "完成。成片：$BASE/成片/ ，备份：$BK"
