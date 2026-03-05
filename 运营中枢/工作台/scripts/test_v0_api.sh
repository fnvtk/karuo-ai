#!/usr/bin/env bash
# V0 接口检测：先测 /models（验证 Key），再测 /chat/completions（验证可用性）
# 用法：bash 运营中枢/工作台/scripts/test_v0_api.sh [模型名，默认 v0-1.5-md]

set -e
OPENCLAW_JSON="$HOME/.openclaw/openclaw.json"
BASE_URL="https://api.v0.dev/v1"
MODEL="${1:-v0-1.5-md}"

if [[ ! -f "$OPENCLAW_JSON" ]]; then
  echo "未找到 $OPENCLAW_JSON"
  exit 1
fi

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
echo "  Key: ${APIKEY:0:15}...${APIKEY: -6}"
echo ""

# 1. 验证 Key：GET /v1/models
MODELS_CODE=$(curl -s -o /tmp/v0_models.json -w "%{http_code}" -X GET "$BASE_URL/models" \
  -H "Authorization: Bearer $APIKEY" --connect-timeout 10 2>/dev/null || echo "000")

if [[ "$MODELS_CODE" == "200" ]]; then
  echo "  [OK] Key 有效 — GET /v1/models 返回 200，模型列表可读"
  if [[ -f /tmp/v0_models.json ]]; then
    python3 -c "
import json
try:
    d=json.load(open('/tmp/v0_models.json'))
    ids=[m.get('id','') for m in d.get('data',[])]
    if ids: print('  模型:', ', '.join(ids))
except: pass
" 2>/dev/null || true
  fi
else
  echo "  [FAIL] Key 无效或网络异常 — GET /v1/models 返回 $MODELS_CODE"
  echo "  请到 https://v0.app/chat/settings/keys 检查并重新生成 API Key，再更新到 openclaw 配置与《00_账号与API索引》"
  exit 1
fi

# 2. 验证 Completions：POST /v1/chat/completions
COMP_BODY=$(python3 -c "
import urllib.request, json
url = '$BASE_URL/chat/completions'
data = json.dumps({'model':'$MODEL','messages':[{'role':'user','content':'Hi'}],'max_tokens':20}).encode()
req = urllib.request.Request(url, data=data, method='POST', headers={
    'Content-Type': 'application/json',
    'Authorization': 'Bearer $APIKEY'
})
try:
    r = urllib.request.urlopen(req, timeout=15)
    print(r.read().decode())
except urllib.error.HTTPError as e:
    print(e.read().decode())
" 2>/dev/null)

if echo "$COMP_BODY" | grep -q '"choices"'; then
  echo "  [OK] Completions 可用 — POST /v1/chat/completions 返回 200"
  echo "$COMP_BODY" | python3 -c "
import sys, json
try:
    d=json.load(sys.stdin)
    c=d.get('choices',[{}])[0].get('message',{}).get('content','')[:100]
    if c: print('  内容预览:', c)
except: pass
" 2>/dev/null || true
  echo ""
  echo "=== V0 完全可用 ==="
  exit 0
fi

# Completions 失败（常见为 500 Unknown error）
echo "  [WARN] Completions 不可用 — 当前返回 500 或非 200"
echo "  响应摘要: $(echo "$COMP_BODY" | head -c 120)"
echo ""
echo "结论：Key 有效，但 chat/completions 接口在 v0 侧报错（多为账号额度或计费未开通）。"
echo "请到 v0.app 检查："
echo "  1. Billing — 已开通 Premium 或 Team"
echo "  2. Usage — 额度未用尽"
echo "  3. 已开启 usage-based billing（按量计费）"
echo "ClawX 默认使用本地模型（Ollama），不依赖 V0 即可正常使用；V0 仅作云端备选。"
exit 1
