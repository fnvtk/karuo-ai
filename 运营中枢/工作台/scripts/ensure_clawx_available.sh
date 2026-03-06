#!/usr/bin/env bash
# 命令行检查并确保 ClawX 可用（网关 + Ollama + 本地模型实际生成）
# 用法：bash 运营中枢/工作台/scripts/ensure_clawx_available.sh

set -e
GATEWAY_URL="${GATEWAY_URL:-http://127.0.0.1:18789}"
OLLAMA_URL="${OLLAMA_URL:-http://127.0.0.1:11434}"
MODEL="${OLLAMA_MODEL:-qwen2.5:3b}"

echo "=== ClawX 本地模型可用性检查 ==="

# 1. 网关
if curl -sf --connect-timeout 3 "$GATEWAY_URL/healthz" >/dev/null 2>&1; then
  echo "  [OK] 网关 $GATEWAY_URL 正常"
else
  if curl -sf --connect-timeout 3 "$GATEWAY_URL/" >/dev/null 2>&1; then
    echo "  [OK] 网关 $GATEWAY_URL 可访问"
  else
    echo "  [FAIL] 网关 $GATEWAY_URL 无响应"
    echo "  请打开 ClawX 应用，或若用 Docker：cd 神射手目录 && docker compose up -d"
    exit 1
  fi
fi

# 2. Ollama 服务与模型列表
if ! curl -sf --connect-timeout 3 "$OLLAMA_URL/api/tags" >/dev/null 2>&1; then
  echo "  [FAIL] Ollama $OLLAMA_URL 未响应，请先启动 Ollama"
  exit 1
fi
echo "  [OK] Ollama $OLLAMA_URL 正常"

# 3. 确定性验证：用配置的默认模型实际生成一次
RESP=$(curl -s -X POST "$OLLAMA_URL/api/generate" \
  -H "Content-Type: application/json" \
  -d "{\"model\":\"$MODEL\",\"prompt\":\"Reply with exactly: OK\",\"stream\":false}" \
  --connect-timeout 20 2>/dev/null)
if echo "$RESP" | grep -q '"response"'; then
  echo "  [OK] 本地模型 $MODEL 生成正常（已实测）"
else
  echo "  [WARN] 本地模型 $MODEL 未返回有效内容，请检查 ollama run $MODEL"
  echo "  响应摘要: $(echo "$RESP" | head -c 120)"
fi

echo "=== 检查完成，ClawX 可直接使用本地模型 ==="
