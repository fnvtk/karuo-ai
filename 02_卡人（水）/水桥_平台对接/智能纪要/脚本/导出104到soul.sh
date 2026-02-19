#!/bin/bash
# 将 104 场妙记文字记录导出到 聊天记录/soul，标题与 103 场一致（soul 派对 第104场 20260219）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="/Users/karuo/Documents/聊天记录/soul"
cd "$SCRIPT_DIR"
python3 feishu_minutes_export_github.py -t obcnyg5nj2l8q281v32de6qz --title "soul 派对 第104场 20260219" -o "$OUT"
exit $?
