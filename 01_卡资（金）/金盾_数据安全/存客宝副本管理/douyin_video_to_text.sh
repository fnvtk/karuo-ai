#!/bin/bash
# 抖音/任意视频 → 命令行提取文字（优先用本机 MLX-Whisper）
# 用法：
#   本地视频：  ./douyin_video_to_text.sh /path/to/video.mp4
#   抖音链接：  ./douyin_video_to_text.sh "https://v.douyin.com/xxx" [cookie.txt]
# 输出：卡若Ai的文件夹/导出/ 下同名的 .txt

set -e
OUT_ROOT="/Users/karuo/Documents/卡若Ai的文件夹/导出"
mkdir -p "$OUT_ROOT"

# 木叶 · 抖音解析（yt-dlp 无 Cookie 失败时兜底下载）
DOUYIN_PARSE_PY="/Users/karuo/Documents/个人/卡若AI/03_卡木（木）/木叶_视频内容/抖音视频解析/脚本/douyin_parse.py"

# 优先用本机 MLX-Whisper（Apple Silicon 更快）
MLX_WHISPER="/Users/karuo/miniforge3/envs/mlx-whisper/bin/mlx_whisper"
if [[ -x "$MLX_WHISPER" ]]; then
  TRANScribe="$MLX_WHISPER"
  TRANScribe_OPTS=(--language zh -f txt)
else
  TRANScribe="whisper"
  TRANScribe_OPTS=(--language zh --output_format txt --verbose False)
fi

if [[ -z "$1" ]]; then
  echo "用法: $0 <视频文件路径或抖音链接> [cookie.txt]"
  echo "示例: $0 ./路飞直播回放.mp4"
  echo "示例: $0 'https://v.douyin.com/Wv8TNVjwduU/' cookie.txt"
  exit 1
fi

INPUT="$1"
COOKIE="$2"
WORK="/tmp/douyin_extract_$$"
mkdir -p "$WORK"
trap "rm -rf '$WORK'" EXIT

if [[ -f "$INPUT" ]]; then
  VIDEO="$INPUT"
  BASE=$(basename "$INPUT" | sed 's/\.[^.]*$//')
else
  OPTS=(-o "$WORK/%(id)s.%(ext)s" --no-warnings)
  if [[ -n "$COOKIE" && -f "$COOKIE" ]]; then
    OPTS+=(--cookies "$COOKIE")
  else
    echo "提示: yt-dlp 拉抖音常需 Cookie；失败将自动改用 douyin_parse.py（无需 Cookie）" >&2
  fi
  if ! yt-dlp "${OPTS[@]}" "$INPUT"; then
    if [[ "$INPUT" == *"douyin"* ]] && [[ -f "$DOUYIN_PARSE_PY" ]]; then
      echo "yt-dlp 未成功，改用 douyin_parse.py 下载…" >&2
      python3 "$DOUYIN_PARSE_PY" "$INPUT" -o "$WORK" || { echo "下载失败，请提供 cookie.txt 或本地 mp4"; exit 1; }
    else
      echo "下载失败，请提供 cookie 或本地视频文件"; exit 1
    fi
  fi
  VIDEO=$(find "$WORK" -type f \( -name "*.mp4" -o -name "*.webm" -o -name "*.mkv" \) | head -1)
  [[ -z "$VIDEO" ]] && { echo "未找到下载的视频"; exit 1; }
  BASE=$(basename "$VIDEO" | sed 's/\.[^.]*$//')
fi

echo "正在转写（${TRANScribe}）: $VIDEO"
if [[ "$TRANScribe" == "$MLX_WHISPER" ]]; then
  "$MLX_WHISPER" "$VIDEO" "${TRANScribe_OPTS[@]}" -o "$WORK" --output-name "$BASE"
  TXT="$WORK/${BASE}.txt"
else
  "$TRANScribe" "$VIDEO" "${TRANScribe_OPTS[@]}" --output_dir "$WORK"
  TXT=$(find "$WORK" -name "*.txt" | head -1)
fi
if [[ -n "$TXT" && -f "$TXT" ]]; then
  FINAL="$OUT_ROOT/${BASE}_转写.txt"
  cp "$TXT" "$FINAL"
  echo "已保存: $FINAL"
  cat "$FINAL"
else
  echo "未生成 txt（若视频无音轨会失败）"; exit 1
fi
