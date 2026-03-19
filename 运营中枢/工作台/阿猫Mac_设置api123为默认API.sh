#!/bin/bash
# 在阿猫 Mac 上运行：将 Claude Code 默认 API 设为 api123.icu
# 用法：bash 本脚本路径  或  chmod +x 后 ./本脚本路径
# 路径示例（iCloud 同步后）：~/Library/Mobile\ Documents/com~apple~CloudDocs/Documents/婼瑄/卡若AI/运营中枢/工作台/阿猫Mac_设置api123为默认API.sh

set -e
CLAUDE_DIR="$HOME/.claude"
SETTINGS="$CLAUDE_DIR/settings.json"
BASE_URL="https://api123.icu"
API_KEY="sk-h7VW10iTSSXo6xJXe44nI1vUhsEcG3H8Z9XyFmWABvhaD4ZW"
MODEL="claude-sonnet-4-6"

mkdir -p "$CLAUDE_DIR"
# 保留已有配置，仅更新 api base 与 key（Claude Code 常用字段）
if [ -f "$SETTINGS" ]; then
  # 用 Python 合并，避免 jq 依赖
  python3 -c "
import json, os
p = '$SETTINGS'
data = {}
if os.path.exists(p):
    with open(p) as f:
        data = json.load(f)
data['anthropicBaseUrl'] = '$BASE_URL'
data['anthropicApiKey'] = '$API_KEY'
if 'defaultModel' not in data or not data.get('defaultModel'):
    data['defaultModel'] = '$MODEL'
with open(p, 'w') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
print('已更新:', p)
"
else
  cat > "$SETTINGS" << EOF
{
  "anthropicBaseUrl": "$BASE_URL",
  "anthropicApiKey": "$API_KEY",
  "defaultModel": "$MODEL"
}
EOF
  echo "已创建: $SETTINGS"
fi
echo "api123.icu 已设为默认 API，重启 Cursor/Claude Code 后生效。"
