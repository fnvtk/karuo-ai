#!/bin/bash
# 下载 soul 派对 第101、102、103 场妙记文字记录到 soul 目录（需已配置 cookie_minutes.txt）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
PY="python3"
[ -x "$SCRIPT_DIR/.venv/bin/python" ] && PY="$SCRIPT_DIR/.venv/bin/python"
exec $PY download_soul_minutes_101_to_103.py "$@"
