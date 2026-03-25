#!/bin/bash
# 跨平台模板：macOS 一键安装 Feishu + OpenClaw，并写入龙猫机器人配置

set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
ok(){ echo -e "${GREEN}[OK]${NC} $1"; }
warn(){ echo -e "${YELLOW}[WARN]${NC} $1"; }
err(){ echo -e "${RED}[ERR]${NC} $1"; }

require_env() {
  local n="$1"
  if [ -z "${!n:-}" ]; then
    err "缺少环境变量: $n"
    exit 1
  fi
}

echo "== 卡若AI Feishu+龙虾 一键部署 (macOS) =="

require_env FEISHU_APP_ID
require_env FEISHU_APP_SECRET
require_env OPENCLAW_BASE_URL
require_env OPENCLAW_API_KEY

OPENCLAW_MODEL_PROVIDER="${OPENCLAW_MODEL_PROVIDER:-api123-icu}"
OPENCLAW_MODEL_ID="${OPENCLAW_MODEL_ID:-claude-sonnet-4-5-20250929}"
OPENCLAW_GATEWAY_PORT="${OPENCLAW_GATEWAY_PORT:-18789}"
OPENCLAW_BIN="${HOME}/.local/share/npm-global/bin/openclaw"
OPENCLAW_NODE_BIN="${HOME}/.local/node22/bin"

if ! command -v brew >/dev/null 2>&1; then
  warn "未检测到 Homebrew，先安装 Homebrew"
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

if [ ! -d "/Applications/Lark.app" ] && [ ! -d "/Applications/Feishu.app" ]; then
  brew install --cask lark || warn "Lark cask 安装失败，可手动安装飞书客户端"
fi
ok "飞书客户端步骤完成"

if ! command -v node >/dev/null 2>&1; then
  brew install node@22
  export PATH="/opt/homebrew/opt/node@22/bin:/usr/local/opt/node@22/bin:$PATH"
fi

mkdir -p "${HOME}/.local/share/npm-global" "${HOME}/.local/node22/bin"
npm config set prefix "${HOME}/.local/share/npm-global"
export PATH="${HOME}/.local/share/npm-global/bin:${PATH}"

if [ ! -x "$OPENCLAW_BIN" ]; then
  npm install -g openclaw@latest
fi
ok "OpenClaw 安装完成"

python3 - <<'PY'
import json, shutil, os
from pathlib import Path
from datetime import datetime

p = Path.home()/".openclaw"/"openclaw.json"
p.parent.mkdir(parents=True, exist_ok=True)
if not p.exists():
    p.write_text("{}", encoding="utf-8")

cfg = json.loads(p.read_text(encoding="utf-8"))
bak = p.with_name("openclaw.json.bak.deploy_" + datetime.now().strftime("%Y%m%d_%H%M%S"))
shutil.copy2(p, bak)

provider = os.environ.get("OPENCLAW_MODEL_PROVIDER", "api123-icu")
model_id = os.environ.get("OPENCLAW_MODEL_ID", "claude-sonnet-4-5-20250929")
base_url = os.environ["OPENCLAW_BASE_URL"]
api_key = os.environ["OPENCLAW_API_KEY"]

cfg["models"] = {
    "providers": {
        provider: {
            "api": "anthropic-messages",
            "baseUrl": base_url,
            "apiKey": api_key,
            "models": [{"id": model_id, "name": f"{model_id} ({provider})"}],
        }
    }
}
cfg.setdefault("agents", {})
cfg["agents"].setdefault("defaults", {})
cfg["agents"]["defaults"]["model"] = {"primary": f"{provider}/{model_id}", "fallbacks": []}
cfg["agents"]["defaults"]["models"] = [{"alias": "default", "provider": provider, "model": model_id}]

ch = cfg.setdefault("channels", {}).setdefault("feishu", {})
acc = ch.setdefault("accounts", {}).get("longmao", {})
acc.update({
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
})
ch.update({
    "enabled": True,
    "accountId": "longmao",
    "accounts": {"longmao": acc},
})

cfg.setdefault("plugins", {})["allow"] = ["feishu"]
p.write_text(json.dumps(cfg, ensure_ascii=False, indent=2), encoding="utf-8")
print("backup:", bak.name)
PY

PATH="${OPENCLAW_NODE_BIN}:$PATH" "$OPENCLAW_BIN" gateway restart
sleep 2
PATH="${OPENCLAW_NODE_BIN}:$PATH" "$OPENCLAW_BIN" channels status --probe --json || true

if [ -n "${FEISHU_TARGET_CHAT_ID:-}" ]; then
  PATH="${OPENCLAW_NODE_BIN}:$PATH" "$OPENCLAW_BIN" message send \
    --channel feishu \
    --account longmao \
    --target "$FEISHU_TARGET_CHAT_ID" \
    --message "【龙猫】一键部署完成，当前机器已上线。"
fi

ok "部署完成（macOS）"
