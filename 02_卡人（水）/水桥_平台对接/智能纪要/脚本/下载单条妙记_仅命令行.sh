#!/bin/bash
# 单条妙记：仅用命令行下载文字+视频，不弹浏览器。失败时 print 打开浏览器的正确方式。
# 用法: bash 下载单条妙记_仅命令行.sh "https://cunkebao.feishu.cn/minutes/obcn6yjg6866c3gl4ibd72vr"
#   或: bash 下载单条妙记_仅命令行.sh obcn6yjg6866c3gl4ibd72vr "soul 派对 113场 20260302"

URL_OR_TOKEN="${1:-}"
TITLE="${2:-}"
OUT="${3:-/Users/karuo/Documents/聊天记录/soul}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [[ -z "$URL_OR_TOKEN" ]]; then
  echo "用法: $0 <妙记URL或object_token> [标题] [输出目录]"
  echo "示例: $0 'https://cunkebao.feishu.cn/minutes/obcn6yjg6866c3gl4ibd72vr' 'soul 派对 113场 20260302'"
  exit 1
fi

# 提取 token
if [[ "$URL_OR_TOKEN" == *"/minutes/"* ]]; then
  TOKEN=$(echo "$URL_OR_TOKEN" | sed -n 's|.*/minutes/\([a-zA-Z0-9]*\).*|\1|p')
else
  TOKEN="$URL_OR_TOKEN"
fi
[[ -z "$TITLE" ]] && TITLE="妙记_${TOKEN:0:12}"

echo "📌 object_token: $TOKEN  输出: $OUT"
echo ""

# 1) 文字
echo "=== 1) 文字（仅 Cookie，不弹窗）==="
if python3 "$SCRIPT_DIR/feishu_minutes_one_url.py" "$URL_OR_TOKEN" --title "$TITLE" -o "$OUT" --cookie-only 2>&1; then
  echo "   ✅ 文字已保存"
else
  TEXT_FAIL=1
fi
echo ""

# 2) 视频
echo "=== 2) 视频（仅 Cookie）==="
if python3 "$SCRIPT_DIR/feishu_minutes_download_video.py" "$URL_OR_TOKEN" -o "$OUT" 2>&1; then
  echo "   ✅ 视频已保存"
else
  VIDEO_FAIL=1
fi
echo ""

if [[ -n "$TEXT_FAIL" || -n "$VIDEO_FAIL" ]]; then
  echo "----------------------------------------"
  echo "⚠️ 命令行未拿到有效 Cookie，需用浏览器取 Cookie 后重试："
  echo ""
  echo "  1) 用浏览器打开（复制下面整行）："
  echo "     https://cunkebao.feishu.cn/minutes/home"
  echo ""
  echo "  2) 登录后 F12 → 网络 → 刷新 → 找到 list?size= 请求 → 复制请求头里的 Cookie"
  echo ""
  echo "  3) 粘贴到下面文件第一行并保存："
  echo "     $SCRIPT_DIR/cookie_minutes.txt"
  echo ""
  echo "  4) 再执行本脚本："
  echo "     bash $0 '$URL_OR_TOKEN' '$TITLE' '$OUT'"
  echo "----------------------------------------"
  exit 1
fi

echo "✅ 文字+视频均已保存到 $OUT"
ls -la "$OUT"/*"${TOKEN:0:8}"* "$OUT"/*113* 2>/dev/null || true
