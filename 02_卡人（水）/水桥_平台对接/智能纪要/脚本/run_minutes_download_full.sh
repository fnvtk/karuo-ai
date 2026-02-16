#!/bin/bash
# 飞书 API + token 全命令行：收集妙记链接 → 批量下载 TXT
# 使用：./run_minutes_download_full.sh
# 可选环境变量：FEISHU_APP_ID FEISHU_APP_SECRET FEISHU_USER_ACCESS_TOKEN

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"
ROOT="$(dirname "$SCRIPT_DIR")"
OUT_DIR="$ROOT/soul_party_100_txt"
URLS="$SCRIPT_DIR/urls_soul_party.txt"

# 1) 用 API + token 尝试收集链接（不打开浏览器）
echo "=== 1) 飞书 API 收集妙记链接 ==="
python3 feishu_api_collect_minutes.py || true

# 2) 若已有链接文件则批量下载
if [ -f "urls_soul_party.txt" ] && grep -qE '^https?://[^#]+/minutes/' urls_soul_party.txt 2>/dev/null; then
  echo ""
  echo "=== 2) 批量下载 TXT ==="
  python3 batch_download_minutes_txt.py --list urls_soul_party.txt --output "$OUT_DIR" --skip-existing
  echo "TXT 输出目录: $OUT_DIR"
else
  echo "未检测到有效链接。可将妙记 URL 每行一个写入 scripts/urls_soul_party.txt 后重新执行本脚本。"
fi
