#!/usr/bin/env bash
# 从卡若AI / 本机向 NAS 上的 AI 发一条消息（仅公司 CKB NAS 支持，家里 Station 无 AI 网关）
# 用法：./send_message_to_nas.sh "帮我检查一下服务器和磁盘"
# 可选：NAS_TARGET=ckb（默认）| station（会提示不支持）
# 依赖：curl、python3

set -e
# 目标：ckb=公司NAS（默认），station=家里NAS（无AI，仅DSM）
NAS_TARGET="${NAS_TARGET:-ckb}"

if [ "$NAS_TARGET" = "station" ]; then
  echo "⚠️ 家里 Station NAS（192.168.110.29）未部署卡若AI 网关，无法发消息。"
  echo "   仅公司 CKB NAS 支持。请用 NAS_TARGET=ckb 或省略。"
  exit 1
fi

# 公司 CKB NAS：默认 open.quwanzhi.com；内网可用 192.168.1.201
NAS_HOST="${NAS_HOST:-open.quwanzhi.com}"
NAS_PORT="${NAS_PORT:-8081}"
EXECUTOR_URL="http://${NAS_HOST}:${NAS_PORT}/execute"

if [ -z "$1" ]; then
  echo "用法: $0 \"<要发给 NAS AI 的消息>\""
  echo "示例: $0 \"帮我检查一下服务器和磁盘\""
  echo ""
  echo "环境变量: NAS_TARGET=ckb(默认)|station  NAS_HOST  NAS_PORT"
  echo "  公司 CKB: 默认 open.quwanzhi.com  家里 Station: 无AI，仅 DSM 192.168.110.29:5000"
  exit 1
fi

CONTENT="$1"
MSG_ID="karuo-skill-$(date +%s)"
JSON=$(python3 -c "import json,sys; print(json.dumps({'source':'karuo-skill','user_id':'cursor','content':sys.argv[1],'message_id':sys.argv[2]}))" "$CONTENT" "$MSG_ID")

echo "→ 发送到公司 CKB NAS AI (${EXECUTOR_URL})：${CONTENT}"
echo ""

curl -s -X POST "${EXECUTOR_URL}" \
  -H "Content-Type: application/json" \
  -d "$JSON" | python3 -m json.tool 2>/dev/null || cat

echo ""
