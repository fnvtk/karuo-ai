#!/usr/bin/env bash
# 全自动：Cerebras Key 池补充 → 同步到卡若官网 Mongo（gw-cerebras / gw-cohere），供控制台网关多 Key + 轮换。
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
KARUO_AI="$(cd "$HERE/../../.." && pwd)"
TARGET="$KARUO_AI/03_卡木（木）/木根_逆向分析/全网AI自动注册/脚本"
cd "$TARGET"
exec python3 key_pool_manager.py auto-fill --sync-site-mongo "$@"
