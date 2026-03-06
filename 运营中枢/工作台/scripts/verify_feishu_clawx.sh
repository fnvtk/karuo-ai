#!/usr/bin/env bash
# ClawX 飞书通道连通与发消息能力验证
# 用法：bash 运营中枢/工作台/scripts/verify_feishu_clawx.sh

set -e
APP_ID="cli_a48818290ef8100d"
APP_SECRET="dhjU0qWd5AzicGWTf4cTqhCWJOrnuCk4"
OPENCLAW_JSON="$HOME/.openclaw/openclaw.json"

echo "=== ClawX 飞书连通验证 ==="

# 1. 检查 openclaw 配置中飞书已启用
if ! grep -q '"feishu"' "$OPENCLAW_JSON" 2>/dev/null || ! grep -q '"enabled": true' "$OPENCLAW_JSON" 2>/dev/null; then
  echo "  [WARN] 未在 $OPENCLAW_JSON 中找到飞书 channel 或 enabled:true"
fi
if grep -q "\"appId\": \"$APP_ID\"" "$OPENCLAW_JSON" 2>/dev/null; then
  echo "  [OK] openclaw 中已配置飞书 appId（与当前凭证一致）"
else
  echo "  [WARN] openclaw 中飞书 appId 与脚本内不一致，请以 openclaw.json 为准"
fi

# 2. 飞书凭证：获取 tenant_access_token（证明可连通开放平台）
TOKEN_RESP=$(curl -s -X POST "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal" \
  -H "Content-Type: application/json" \
  -d "{\"app_id\":\"$APP_ID\",\"app_secret\":\"$APP_SECRET\"}" 2>/dev/null)
CODE=$(echo "$TOKEN_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('code',-1))" 2>/dev/null)
if [[ "$CODE" == "0" ]]; then
  echo "  [OK] 飞书凭证有效，已成功获取 tenant_access_token（可连通开放平台）"
else
  echo "  [FAIL] 飞书凭证无效或网络异常，无法获取 token（code=$CODE）"
  echo "  请检查 App ID / App Secret 是否与飞书开放平台一致"
  exit 1
fi

# 3. 网关在运行时才能建立飞书长连接
if curl -sf --connect-timeout 3 "http://127.0.0.1:18789/healthz" >/dev/null 2>&1 || curl -sf --connect-timeout 3 "http://127.0.0.1:18789/" >/dev/null 2>&1; then
  echo "  [OK] ClawX 网关已运行（飞书长连接需在网关启动后由 OpenClaw 建立）"
else
  echo "  [WARN] 网关未检测到，请先打开 ClawX 或启动网关，飞书才能收发消息"
fi

echo ""
echo "=== 发消息能力说明 ==="
echo "  1. 飞书开放平台：事件订阅选择「使用长连接」、添加事件 im.message.receive_v1"
echo "  2. 应用已发布、机器人能力已开启、权限含 im:message:send_as_bot"
echo "  3. 在飞书内搜索机器人「卡若AI」并发消息，即可验证收消息与发消息"
echo ""
echo "=== 飞书连通验证通过；按上述 3 步可在飞书内直接发消息测试 ==="
