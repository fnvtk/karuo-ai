#!/bin/bash
# 在 kr宝塔 43.139.27.93 上执行（通过 VNC/控制台 登录后运行）。本机 SSH 若被安全组拦截，用此脚本在服务器上直接部署。
set -e
WWW="/www/wwwroot"
REPO_URL="http://fnvtk:Zhiqun1984@open.quwanzhi.com:3000/fnvtk/karuo-ai.git"
GATEWAY_DIR="$WWW/karuo-ai/运营中枢/scripts/karuo_ai_gateway"
if [ ! -d "$WWW/karuo-ai" ]; then cd "$WWW" && git clone "$REPO_URL" karuo-ai; else cd "$WWW/karuo-ai" && git pull; fi
cd "$GATEWAY_DIR" && pip3 install -r requirements.txt -q
pkill -f "uvicorn main:app" 2>/dev/null || true; sleep 1
nohup python3 -m uvicorn main:app --host 127.0.0.1 --port 8000 > /tmp/karuo_ai_gateway.log 2>&1 &
sleep 2 && curl -s -o /dev/null -w "HTTP %{http_code}\n" http://127.0.0.1:8000/ && echo "部署完成。域名 kr-ai.quwanzhi.com 反代到 8000 后即可访问。"
