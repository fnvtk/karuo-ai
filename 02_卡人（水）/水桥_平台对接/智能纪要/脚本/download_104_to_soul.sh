#!/bin/bash
# 一键下载 104 场妙记：优先 GitHub 同款 Cookie 导出，再试通用 Cookie，最后试应用/用户 token
# 核心逻辑参考：https://github.com/bingsanyu/feishu_minutes
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="/Users/karuo/Documents/聊天记录/soul"
TOKEN="obcnxrkz6k459k669544228c"
URL="https://cunkebao.feishu.cn/minutes/${TOKEN}"
cd "$SCRIPT_DIR"
PY="python3"
[ -x "$SCRIPT_DIR/.venv/bin/python" ] && PY="$SCRIPT_DIR/.venv/bin/python"

_check_saved() {
  for f in "$OUT"/*.txt; do
    [ -f "$f" ] && [ -s "$f" ] && ! grep -q "未解析到文字内容\|需在飞书妙记页面" "$f" 2>/dev/null && grep -q . "$f" && echo "已保存: $f" && return 0
  done
  return 1
}

# 0) 已有该场完整文字记录则直接成功
for f in "$OUT"/*.txt; do
  [ -f "$f" ] && [ -s "$f" ] || continue
  lines=$(wc -l < "$f" 2>/dev/null)
  if [ "${lines:-0}" -ge 500 ] && grep -q "说话人" "$f" 2>/dev/null; then
    echo "已存在完整文字记录，跳过下载: $f"
    exit 0
  fi
done

# 1) GitHub 同款：cookie_minutes.txt 需含 bv_csrf_token（来自 list?size=20& 请求）
if [ -f "$SCRIPT_DIR/cookie_minutes.txt" ] && grep -q "bv_csrf_token=" "$SCRIPT_DIR/cookie_minutes.txt" 2>/dev/null; then
  echo "使用 GitHub 同款导出（meetings.feishu.cn）..."
  if $PY feishu_minutes_export_github.py -t "$TOKEN" -o "$OUT" 2>/dev/null && _check_saved; then exit 0; fi
fi

# 2) 通用 Cookie（含自动读浏览器）
echo "尝试 Cookie（文件/浏览器）拉取..."
if $PY fetch_single_minute_by_cookie.py "$URL" -o "$OUT" 2>/dev/null && _check_saved; then exit 0; fi

# 3) 应用/用户 token
echo "尝试应用/用户 token..."
$PY fetch_feishu_minutes.py "$URL" -o "$OUT"
exit 0
