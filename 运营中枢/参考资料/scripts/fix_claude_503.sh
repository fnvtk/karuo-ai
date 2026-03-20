#!/usr/bin/env bash
# 一键修复 Claude Code 503 / model_not_found（api123 无 claude-sonnet-4-6 通道时）
# 用法：bash 本脚本路径（本机或阿猫 Mac 均可，iCloud 同步后路径可能带「婼瑄」）
# 执行后请完全退出 Claude Code 再重新打开

set -e
CLAUDE_DIR="$HOME/.claude"
SETTINGS="$CLAUDE_DIR/settings.json"
# 备选模型，api123 通常可用
FALLBACK_MODEL="claude-sonnet-4-5-20250929"
BASE_URL="https://api123.icu"
API_KEY="sk-h7VW10iTSSXo6xJXe44nI1vUhsEcG3H8Z9XyFmWABvhaD4ZW"

mkdir -p "$CLAUDE_DIR"
python3 -c "
import json, os
p = '$SETTINGS'
data = {}
if os.path.exists(p):
    try:
        with open(p) as f:
            data = json.load(f)
    except Exception as e:
        print('读取原配置失败，将写入新配置:', e)
        data = {}
# 强制使用备选模型，避免 503
data['model'] = '$FALLBACK_MODEL'
if 'env' not in data:
    data['env'] = {}
env = data['env']
env['ANTHROPIC_API_KEY'] = env.get('ANTHROPIC_API_KEY') or '$API_KEY'
env['ANTHROPIC_BASE_URL'] = env.get('ANTHROPIC_BASE_URL') or '$BASE_URL'
env['ANTHROPIC_MODEL'] = '$FALLBACK_MODEL'
# 兼容旧字段
data['anthropicBaseUrl'] = data.get('anthropicBaseUrl') or '$BASE_URL'
data['anthropicApiKey'] = data.get('anthropicApiKey') or env['ANTHROPIC_API_KEY']
data['defaultModel'] = '$FALLBACK_MODEL'
with open(p, 'w') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
print('已写入:', p)
print('模型已设为:', '$FALLBACK_MODEL')
"
echo ""
echo "✅ 配置已更新为 Sonnet 4.5，可避免 503。"
echo "▶ 请完全退出 Claude Code（当前窗口按 esc 或 Cmd+C），然后重新打开终端执行: claude"
echo ""
