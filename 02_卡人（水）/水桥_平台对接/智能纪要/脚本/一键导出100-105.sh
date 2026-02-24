#!/bin/bash
# 一键导出 100～105 场妙记文字（全自动 Cookie + 导出）
# 用法: bash 一键导出100-105.sh
cd "$(dirname "$0")"
VENV="/tmp/feishu_cookie_venv"
if [ ! -d "$VENV" ]; then
  python3 -m venv /tmp/feishu_cookie_venv
  /tmp/feishu_cookie_venv/bin/pip install -q browser_cookie3 requests playwright
  /tmp/feishu_cookie_venv/bin/playwright install chromium
fi
/tmp/feishu_cookie_venv/bin/python3 auto_cookie_and_export.py --from 100 --to 105
