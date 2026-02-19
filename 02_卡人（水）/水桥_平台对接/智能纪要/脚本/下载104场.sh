#!/bin/bash
# 一键下载 104 场妙记文字到 soul 目录。配置好 cookie_minutes.txt 后执行本脚本即可。
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="/Users/karuo/Documents/聊天记录/soul"
cd "$SCRIPT_DIR"
PY="python3"
[ -x "$SCRIPT_DIR/.venv/bin/python" ] && PY="$SCRIPT_DIR/.venv/bin/python"

$PY download_soul_minutes_101_to_103.py --from 104 --to 104
if [ $? -eq 0 ]; then
  if ls "$OUT"/soul*104*20260219*.txt 1>/dev/null 2>&1; then
    echo "✅ 104 场已保存到: $OUT"
    exit 0
  fi
fi
echo ""
echo "未拿到 104 场正文（导出需含 bv_csrf_token 的 Cookie）。请："
echo "  1. 打开 https://cunkebao.feishu.cn/minutes/home → F12 → 网络 → 找到 list?size=20& 请求"
echo "  2. 复制该请求头中的完整 Cookie → 粘贴到 $SCRIPT_DIR/cookie_minutes.txt 第一行"
echo "  3. 再执行: bash $SCRIPT_DIR/下载104场.sh"
exit 1
