#!/bin/bash
# 一键：先启动豆包浏览器（远程调试），再导出 104 场妙记并打开文件。
# 会先退出豆包再以调试端口重启，导出完成后可正常再打开豆包使用。
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT_FILE="/Users/karuo/Documents/聊天记录/soul/soul 派对 104场 20260219.txt"

echo "正在退出豆包浏览器…"
osascript -e 'quit app "Doubao"' 2>/dev/null || true
sleep 3
echo "正在以远程调试方式启动豆包（9222）…"
# 直接调用浏览器可执行文件才能传参；用 nohup 后台运行
"/Applications/Doubao.app/Contents/Helpers/Doubao Browser.app/Contents/MacOS/Doubao Browser" --remote-debugging-port=9222 &
BGPID=$!
echo "等待豆包就绪（约 12 秒）…"
sleep 12
# 检查 9222 是否在监听
if ! nc -z 127.0.0.1 9222 2>/dev/null; then
  echo "警告：9222 未就绪，继续尝试导出…"
fi
cd "$SCRIPT_DIR"
if python3 cdp_104_export.py 2>/dev/null; then
  echo "✅ 104 场已保存"
  open "$OUT_FILE"
  exit 0
fi
echo "导出未成功。请在本机浏览器打开 https://cunkebao.feishu.cn/minutes/obcnyg5nj2l8q281v32de6qz 手动「导出文字记录」后保存到："
echo "  $OUT_FILE"
open "https://cunkebao.feishu.cn/minutes/obcnyg5nj2l8q281v32de6qz"
exit 1
