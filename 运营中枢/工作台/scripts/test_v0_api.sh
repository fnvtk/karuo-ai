#!/usr/bin/env bash
# V0 接口检测：用 openclaw 配置里的 apiKey 请求 v0，并给出结论与建议
# 用法：bash 运营中枢/工作台/scripts/test_v0_api.sh

set -e
OPENCLAW_JSON="$HOME/.openclaw/openclaw.json"
BASE_URL="https://api.v0.dev/v1"
MODEL="${1:-v0-1.5-md}"

if [[ ! -f "$OPENCLAW_JSON" ]]; then
  echo "未找到 $OPENCLAW_JSON"
  exit 1
fi

# 从 openclaw 配置里取 custom-custom21 的 apiKey（简单提取）
APIKEY=$(python3 -c "
import json
with open('$OPENCLAW_JSON') as f:
    d = json.load(f)
p = d.get('models', {}).get('providers', {}).get('custom-custom21', {})
print(p.get('apiKey', '') or '')
" 2>/dev/null)

if [[ -z "$APIKEY" ]]; then
  echo "未在 openclaw 配置中找到 custom-custom21.apiKey，请先在 ClawX 设置中填写 V0 API Key"
  exit 1
fi

echo "=== V0 接口检测 ==="
echo "  Base URL: $BASE_URL"
echo "  Model: $MODEL"
echo "  Key: ${APIKEY:0:12}...${APIKEY: -4}"
echo ""

RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $APIKEY" \
  -d "{\"model\":\"$MODEL\",\"messages\":[{\"role\":\"user\",\"content\":\"Hello\"}],\"max_tokens\":20}" \
  --connect-timeout 12 2>/dev/null)
HTTP_CODE=$(echo "$RESP" | tail -1)
HTTP_BODY=$(echo "$RESP" | sed '$d')

if [[ "$HTTP_CODE" == "200" ]]; then
  echo "  [OK] HTTP 200，V0 可用"
  echo "$HTTP_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print('  内容:', d.get('choices',[{}])[0].get('message',{}).get('content','')[:80])" 2>/dev/null || true
  exit 0
fi

echo "  [FAIL] HTTP $HTTP_CODE"
echo "  响应: $HTTP_BODY"
echo ""
echo "排查建议："
echo "  1. 打开 https://v0.app/chat/settings/keys 检查 API Key 是否有效、是否重新生成过"
echo "  2. 确认账号已开通 Premium/Team 且开通了 Model API（按量计费）"
echo "  3. ClawX 默认已用本地模型（Ollama），不依赖 V0 即可使用；V0 仅作云端备选"
exit 1
