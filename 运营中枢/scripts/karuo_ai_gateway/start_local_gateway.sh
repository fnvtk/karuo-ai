#!/usr/bin/env bash
set -euo pipefail

DIR="/Users/karuo/Documents/个人/卡若AI/运营中枢/scripts/karuo_ai_gateway"
PORT="${1:-18080}"

cd "$DIR"

if [ ! -f ".env" ] && [ -f ".env.api_keys.local" ]; then
  cp .env.api_keys.local .env
fi

if [ -f ".env" ]; then
  set -a
  # shellcheck source=/dev/null
  source .env
  set +a
fi

if [ ! -x ".venv/bin/python" ]; then
  python3 -m venv .venv
fi

.venv/bin/pip install -r requirements.txt >/tmp/karuo_local_pip.log 2>&1

PIDS=$(lsof -iTCP:"$PORT" -sTCP:LISTEN -t 2>/dev/null || true)
if [ -n "$PIDS" ]; then
  kill $PIDS || true
fi

nohup .venv/bin/python -m uvicorn main:app --host 127.0.0.1 --port "$PORT" >/tmp/karuo_gateway_local.log 2>&1 &

echo "local_gateway_started port=$PORT"
