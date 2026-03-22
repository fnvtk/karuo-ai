#!/bin/bash
# 在阿猫 Mac 上运行：将 Claude Code 默认 API 设为 api123.icu
# 用法：bash 本脚本路径  或  chmod +x 后 ./本脚本路径
# 路径示例（iCloud 同步后）：~/Library/Mobile\ Documents/com~apple~CloudDocs/Documents/婼瑄/卡若AI/运营中枢/工作台/阿猫Mac_设置api123为默认API.sh

set -e
CLAUDE_DIR="$HOME/.claude"
SETTINGS="$CLAUDE_DIR/settings.json"
BASE_URL="https://api123.icu"
API_KEY="${ANTHROPIC_API_KEY:-}"
if [[ -z "$API_KEY" ]]; then
  echo "ERROR: 请先在终端执行: export ANTHROPIC_API_KEY='（api123 控制台复制的令牌）'" >&2
  exit 1
fi
# 使用 Sonnet 4.5 避免 api123 default 分组 503（4.6 通道可能不可用）
MODEL="claude-sonnet-4-5-20250929"

mkdir -p "$CLAUDE_DIR"
# 保留已有配置，写入 CLI 用的 model/env 与旧版 anthropic* 字段
if [ -f "$SETTINGS" ]; then
  python3 -c "
import json, os
p = '$SETTINGS'
data = {}
if os.path.exists(p):
    with open(p) as f:
        data = json.load(f)
data['anthropicBaseUrl'] = '$BASE_URL'
data['anthropicApiKey'] = '$API_KEY'
data['defaultModel'] = '$MODEL'
data['model'] = '$MODEL'
if 'env' not in data:
    data['env'] = {}
data['env']['ANTHROPIC_API_KEY'] = '$API_KEY'
data['env']['ANTHROPIC_BASE_URL'] = '$BASE_URL'
data['env']['ANTHROPIC_MODEL'] = '$MODEL'
with open(p, 'w') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
print('已更新:', p)
"
else
  cat > "$SETTINGS" << EOF
{
  "model": "$MODEL",
  "anthropicBaseUrl": "$BASE_URL",
  "anthropicApiKey": "$API_KEY",
  "defaultModel": "$MODEL",
  "env": {
    "ANTHROPIC_API_KEY": "$API_KEY",
    "ANTHROPIC_BASE_URL": "$BASE_URL",
    "ANTHROPIC_MODEL": "$MODEL"
  }
}
EOF
  echo "已创建: $SETTINGS"
fi
echo "api123.icu 已设为默认 API，模型为 $MODEL（避免 503）。请完全退出 Claude Code 后重新打开生效。"
