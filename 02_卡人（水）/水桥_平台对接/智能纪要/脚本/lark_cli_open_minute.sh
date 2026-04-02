#!/usr/bin/env bash
# 用 lark-cli 拉取妙记 Open API 返回的官方 url，再 macOS open。
# 前置：lark-cli 已 config init；且 lark-cli auth login 完成（建议 user，能打开自己有权限的妙记）。
# 用法：
#   ./lark_cli_open_minute.sh <minute_token>
#   ./lark_cli_open_minute.sh 'https://cunkebao.feishu.cn/minutes/obcxxxxxxxx'
#   ./lark_cli_open_minute.sh --home   # 仅打开妙记首页（不调用 API；lark-cli 无「首页」接口）

set -euo pipefail

HOME_URL="${FEISHU_MINUTES_HOME:-https://cunkebao.feishu.cn/minutes}"

if [[ "${1:-}" == "--home" ]]; then
  exec open "$HOME_URL"
fi

raw="${1:-}"
if [[ -z "$raw" ]]; then
  echo "用法: $0 <minute_token | 妙记完整URL> | --home" >&2
  echo "示例: $0 obcnq3b9jl72l83w4f14xxxx" >&2
  echo "首页: $0 --home  （或设 FEISHU_MINUTES_HOME）" >&2
  exit 1
fi

if [[ "$raw" == *"/minutes/"* ]]; then
  token="${raw##*/minutes/}"
  token="${token%%\?*}"
else
  token="$raw"
fi

json="$(lark-cli minutes minutes get --as user --params "$(printf '%s' "{\"minute_token\":\"$token\"}")" --format json)"

url="$(printf '%s' "$json" | python3 -c '
import json, sys
d = json.load(sys.stdin)
if d.get("ok") is False:
    err = d.get("error") or {}
    sys.stderr.write((err.get("message") or err.get("type") or "error") + "\n")
    if err.get("hint"):
        sys.stderr.write(err["hint"] + "\n")
    raise SystemExit(1)
data = d.get("data") or d
minute = (data.get("minute") if isinstance(data, dict) else None) or {}
url = minute.get("url") if isinstance(minute, dict) else None
if not url:
    sys.stderr.write("响应中无 minute.url，请检查 token 与权限。\n")
    print(json.dumps(d, ensure_ascii=False, indent=2), file=sys.stderr)
    raise SystemExit(1)
print(url)
')"

exec open "$url"
