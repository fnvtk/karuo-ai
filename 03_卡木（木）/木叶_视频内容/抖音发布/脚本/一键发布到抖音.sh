#!/usr/bin/env bash
# 一键发布 119 场成片到抖音。
# 若已有 tokens.json 或 DOUYIN_ACCESS_TOKEN/DOUYIN_OPEN_ID 则直接发布；
# 若未配置 token 但设置了 DOUYIN_CLIENT_KEY/DOUYIN_CLIENT_SECRET 则先走 OAuth 再发布。
set -e
cd "$(dirname "$0")"
if [ -f "tokens.json" ]; then
  python3 batch_publish_119.py
elif [ -n "$DOUYIN_CLIENT_KEY" ] && [ -n "$DOUYIN_CLIENT_SECRET" ]; then
  python3 douyin_oauth_then_publish.py
else
  python3 batch_publish_119.py
fi
