#!/usr/bin/env bash
# 抖音链接 → 仅提取页面文案（不下载视频）
# 用法：./douyin_caption_only.sh "https://v.douyin.com/xxx"
# 输出：文案打印到终端，并保存到 卡若Ai的文件夹/视频/{aweme_id}_文案.txt

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT_DIR="${DOUYIN_CAPTION_OUT:-/Users/karuo/Documents/卡若Ai的文件夹/视频}"
mkdir -p "$OUT_DIR"

if [[ -z "$1" ]]; then
  echo "用法: $0 <抖音视频链接>"
  echo "示例: $0 'https://v.douyin.com/Wv8TNVjwduU/'"
  exit 1
fi

python3 "$SCRIPT_DIR/douyin_parse.py" "$1" --no-download -o "$OUT_DIR" 2>/dev/null || true
# 找到刚生成的 _文案.txt（按修改时间取最新）
TXT=$(find "$OUT_DIR" -name "*_文案.txt" -mmin -1 | head -1)
if [[ -n "$TXT" && -f "$TXT" ]]; then
  echo "--- 文案内容 ---"
  cat "$TXT"
  echo ""
  echo "--- 已保存: $TXT ---"
else
  echo "未找到文案文件，请检查链接是否有效"
  exit 1
fi
