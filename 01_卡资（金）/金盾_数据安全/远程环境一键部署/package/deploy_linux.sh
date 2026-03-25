#!/usr/bin/env bash
set -euo pipefail

echo "== 卡若AI Feishu+龙虾 一键部署 (Linux) =="

req() { [ -n "${!1:-}" ] || { echo "[ERR] 缺少环境变量: $1" >&2; exit 1; }; }
req FEISHU_APP_ID
req FEISHU_APP_SECRET
req OPENCLAW_BASE_URL
req OPENCLAW_API_KEY

OPENCLAW_MODEL_PROVIDER="${OPENCLAW_MODEL_PROVIDER:-api123-icu}"
OPENCLAW_MODEL_ID="${OPENCLAW_MODEL_ID:-claude-sonnet-4-5-20250929}"
OPENCLAW_BIN="${HOME}/.local/share/npm-global/bin/openclaw"

if command -v apt-get >/dev/null 2>&1; then
  sudo apt-get update -y
  sudo apt-get install -y curl ca-certificates gnupg python3 python3-pip
fi

if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

npm config set prefix "${HOME}/.local/share/npm-global"
export PATH="${HOME}/.local/share/npm-global/bin:${PATH}"
if [ ! -x "$OPENCLAW_BIN" ]; then
  npm install -g openclaw@latest
fi

python3 - <<'PY'
import json, shutil, os
from pathlib import Path
from datetime import datetime

p = Path.home()/".openclaw"/"openclaw.json"
p.parent.mkdir(parents=True, exist_ok=True)
if not p.exists():
    p.write_text("{}", encoding="utf-8")

cfg = json.loads(p.read_text(encoding="utf-8") or "{}")
bak = p.with_name("openclaw.json.bak.deploy_" + datetime.now().strftime("%Y%m%d_%H%M%S"))
shutil.copy2(p, bak)

provider = os.environ.get("OPENCLAW_MODEL_PROVIDER", "api123-icu")
model_id = os.environ.get("OPENCLAW_MODEL_ID", "claude-sonnet-4-5-20250929")

cfg["models"] = {
  "providers": {
    provider: {
      "api": "anthropic-messages",
      "baseUrl": os.environ["OPENCLAW_BASE_URL"],
      "apiKey": os.environ["OPENCLAW_API_KEY"],
      "models": [{"id": model_id, "name": f"{model_id} ({provider})"}],
    }
  }
}
cfg.setdefault("agents", {})
cfg["agents"].setdefault("defaults", {})
cfg["agents"]["defaults"]["model"] = {"primary": f"{provider}/{model_id}", "fallbacks": []}
cfg["agents"]["defaults"]["models"] = [{"alias": "default", "provider": provider, "model": model_id}]

ch = cfg.setdefault("channels", {}).setdefault("feishu", {})
acc = {
  "enabled": True,
  "appId": os.environ["FEISHU_APP_ID"],
  "appSecret": os.environ["FEISHU_APP_SECRET"],
  "botName": "龙猫",
  "domain": "feishu",
  "dmPolicy": "open",
  "groupPolicy": "open",
  "allowFrom": ["*"],
  "groupAllowFrom": ["*"],
  "groups": {"*": {"requireMention": False}},
}
ch.update({"enabled": True, "accountId": "longmao", "accounts": {"longmao": acc}})
cfg.setdefault("plugins", {})["allow"] = ["feishu"]
p.write_text(json.dumps(cfg, ensure_ascii=False, indent=2), encoding="utf-8")
print("backup:", bak.name)
PY

"$OPENCLAW_BIN" gateway restart
sleep 2
"$OPENCLAW_BIN" channels status --probe --json || true

if [ -n "${FEISHU_TARGET_CHAT_ID:-}" ]; then
  "$OPENCLAW_BIN" message send \
    --channel feishu \
    --account longmao \
    --target "$FEISHU_TARGET_CHAT_ID" \
    --message "【龙猫】Linux 一键部署完成，当前机器已上线。"
fi

echo "[OK] 部署完成（Linux）"
