#!/bin/bash
# 一键：用 Cookie 拉取 soul/派对 妙记链接 → 批量下载 TXT 到「聊天记录/soul」
# 前置：在脚本同目录创建 cookie_minutes.txt 并粘贴飞书妙记页的 Cookie（仅首行有效）
# Cookie 获取：浏览器打开 https://cunkebao.feishu.cn/minutes/home → 搜索「soul 派对」→ F12→网络→找 list 请求→复制 Cookie

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOUL_DIR="/Users/karuo/Documents/聊天记录/soul"
URLS_FILE="$SCRIPT_DIR/urls_soul_party.txt"

cd "$SCRIPT_DIR"

# 1) 若有 Cookie，拉取链接列表
if [ -f "cookie_minutes.txt" ] && [ -s "cookie_minutes.txt" ]; then
  echo "📋 检测到 cookie_minutes.txt，拉取 soul/派对 妙记列表…"
  python3 fetch_minutes_list_by_cookie.py || true
fi

# 2) 检查 url 列表
if [ ! -f "$URLS_FILE" ] || ! grep -q "feishu.cn/minutes/" "$URLS_FILE" 2>/dev/null; then
  echo "❌ urls_soul_party.txt 中无有效链接。"
  echo ""
  echo "请二选一："
  echo "  A) 在脚本同目录创建 cookie_minutes.txt，粘贴飞书妙记列表页的 Cookie，然后重试"
  echo "  B) 手动编辑 urls_soul_party.txt，每行一个妙记链接（https://cunkebao.feishu.cn/minutes/xxx）"
  echo ""
  echo "Cookie 获取步骤："
  echo "  1. 打开 https://cunkebao.feishu.cn/minutes/home"
  echo "  2. 搜索框输入「soul 派对」"
  echo "  3. F12 → 网络 → 找到 list?size= 请求 → 复制请求头中的 Cookie"
  exit 1
fi

mkdir -p "$SOUL_DIR"
echo "📂 输出目录: $SOUL_DIR"
echo "🚀 开始批量下载…"
python3 batch_download_minutes_txt.py \
  --list "$URLS_FILE" \
  --output "$SOUL_DIR" \
  --skip-existing

echo ""
echo "✅ 完成。TXT 保存在: $SOUL_DIR"
