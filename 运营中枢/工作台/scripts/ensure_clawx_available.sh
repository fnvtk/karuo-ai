#!/usr/bin/env bash
# 命令行检查并确保 ClawX 可用（网关 + Ollama）
# 用法：bash 运营中枢/工作台/scripts/ensure_clawx_available.sh

set -e

GATEWAY_URL="${GATEWAY_URL:-http://127.0.0.1:18789}"
OLLAMA_URL="${OLLAMA_URL:-http://localhost:11434}"

echo "=== ClawX 可用性检查 ==="

# 1. 网关健康
if curl -sf --connect-timeout 3 "$GATEWAY_URL/healthz" >/dev/null; then
  echo "  [OK] 网关 $GATEWAY_URL 正常 (healthz 200)"
else
  echo "  [FAIL] 网关 $GATEWAY_URL 无响应"
  echo "  请打开 ClawX 应用，或若用 Docker：cd 神射手目录 && docker compose up -d"
  exit 1
fi

# 2. Ollama（本地模型）
if curl -sf --connect-timeout 3 "$OLLAMA_URL/api/tags" >/dev/null; then
  echo "  [OK] Ollama $OLLAMA_URL 正常"
else
  echo "  [WARN] Ollama 未响应，本地小模型不可用（ClawX 可走云端回退）"
fi

echo "=== 检查完成，ClawX 可用 ==="
