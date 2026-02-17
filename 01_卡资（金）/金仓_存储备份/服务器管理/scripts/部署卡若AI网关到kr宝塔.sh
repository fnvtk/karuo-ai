#!/bin/bash
# 将卡若AI 网关部署/更新到 kr宝塔 43.139.27.93，配合域名 kr-ai.quwanzhi.com 使用。
# 使用前：阿里云已添加 A 记录 kr-ai -> 43.139.27.93；宝塔已添加站点 kr-ai.quwanzhi.com 并反代 8000。
# 执行：bash 本脚本路径

set -e
# SSH 端口以 服务器管理/参考资料/端口配置表.md 及 SKILL 为准；kr宝塔 SSH=22022
HOST="43.139.27.93"
SSH_PORT="22022"
USER="root"
REPO_URL="http://fnvtk:Zhiqun1984@open.quwanzhi.com:3000/fnvtk/karuo-ai.git"
WWW="/www/wwwroot"
GATEWAY_DIR="$WWW/karuo-ai/运营中枢/scripts/karuo_ai_gateway"

echo "==> 连接 kr宝塔 $HOST (端口 $SSH_PORT)，部署/更新卡若AI 网关..."
ssh -p "$SSH_PORT" "$USER@$HOST" bash -s -- "$WWW" "$REPO_URL" "$GATEWAY_DIR" << 'REMOTE'
set -e
WWW="$1"
REPO_URL="$2"
GATEWAY_DIR="$3"

if [ ! -d "$WWW/karuo-ai" ]; then
  echo "  -> 克隆卡若AI 仓库..."
  cd "$WWW" && git clone "$REPO_URL" karuo-ai && cd karuo-ai
else
  echo "  -> 更新卡若AI 仓库..."
  cd "$WWW/karuo-ai" && git pull
fi

echo "  -> 安装依赖并重启网关..."
cd "$GATEWAY_DIR"
pip3 install -r requirements.txt -q

# 若已配置 systemd 则优先用 systemd 重启
if systemctl list-unit-files --type=service | grep -q karuo-ai-gateway; then
  sudo systemctl restart karuo-ai-gateway
  sudo systemctl status karuo-ai-gateway --no-pager
else
  pkill -f "uvicorn main:app" 2>/dev/null || true
  nohup python3 -m uvicorn main:app --host 127.0.0.1 --port 8000 > /tmp/karuo_ai_gateway.log 2>&1 &
  sleep 1
  curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/ || true
  echo "  -> 网关已后台启动，日志 /tmp/karuo_ai_gateway.log"
fi
REMOTE

echo "==> 部署完成。调用命令："
echo "  curl -s -X POST \"https://kr-ai.quwanzhi.com/v1/chat\" -H \"Content-Type: application/json\" -d '{\"prompt\":\"你的问题\"}' | jq -r '.reply'"
