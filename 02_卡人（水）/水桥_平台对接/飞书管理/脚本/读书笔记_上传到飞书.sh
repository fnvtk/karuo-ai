#!/bin/bash
# 读书笔记上传到飞书：无 Token 时打开授权页，等待落盘后自动执行 5 篇上传
# 用法: bash 读书笔记_上传到飞书.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"
TOKEN_FILE="$SCRIPT_DIR/.feishu_tokens.json"
NOTE_DIR="/Users/karuo/Documents/个人/2、我写的日记/读书笔记"
JSON_DIR="/Users/karuo/Documents/卡若Ai的文件夹/导出/读书笔记_feishu_json"
PARENT="KNf7wA8Rki1NSdkkSIqcdFtTnWb"
PUBLISH="python3 $SCRIPT_DIR/feishu_article_unified_publish.py"

# 若本地无 token，尝试从本地 API 拉取
if [ ! -f "$TOKEN_FILE" ]; then
  echo "📡 本地无 Token，尝试从 127.0.0.1:5050 拉取..."
  PAYLOAD=$(curl -s -m 3 "http://127.0.0.1:5050/api/token/export" 2>/dev/null || true)
  if echo "$PAYLOAD" | grep -q '"access_token"'; then
    echo "$PAYLOAD" > "$TOKEN_FILE"
    echo "✅ 已从本地 API 同步 Token 到 $TOKEN_FILE"
  else
    echo "⚠️ 需要先完成飞书授权。正在打开授权页..."
    AUTH_URL=$(curl -s -m 3 "http://127.0.0.1:5050/api/auth/url" 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('auth_url',''))")
    if [ -n "$AUTH_URL" ]; then
      open "$AUTH_URL"
      echo "请在浏览器中完成授权，授权成功后本脚本将自动继续（等待最多 90 秒）..."
    else
      echo "请先启动飞书 API 服务: cd $SCRIPT_DIR && python3 feishu_api.py &"
      echo "然后运行: python3 auto_log.py"
      exit 1
    fi
    for i in $(seq 1 90); do
      sleep 1
      if [ -f "$TOKEN_FILE" ]; then
        echo "✅ Token 已落盘，继续上传"
        break
      fi
      if [ "$i" -eq 90 ]; then
        echo "❌ 等待超时，未检测到 Token 文件。请完成授权后重新运行本脚本。"
        exit 1
      fi
    done
  fi
fi

mkdir -p "$JSON_DIR"

echo "📤 开始上传 5 篇读书笔记到飞书节点 $PARENT ..."

$PUBLISH --parent "$PARENT" --title "卡若读书笔记：Dan Koe 如何在一天内彻底改造你的人生" --md "$NOTE_DIR/Dan_Koe_如何在一天内彻底改造你的人生_读书笔记.md" --json "$JSON_DIR/Dan_Koe.json" && echo "  ✅ Dan Koe"
$PUBLISH --parent "$PARENT" --title "卡若读书笔记：纳瓦尔访谈｜五行结构化" --md "$NOTE_DIR/纳瓦尔访谈_读书笔记.md" --json "$JSON_DIR/纳瓦尔.json" && echo "  ✅ 纳瓦尔"
$PUBLISH --parent "$PARENT" --title "卡若读书笔记：曾仕强《易经》" --md "$NOTE_DIR/曾仕强_易经_读书笔记.md" --json "$JSON_DIR/曾仕强易经.json" && echo "  ✅ 曾仕强易经"
$PUBLISH --parent "$PARENT" --title "卡若读书笔记：5000天后的世界 - 凯文凯利" --md "$NOTE_DIR/卡若读书笔记：5000天后的世界 - 凯文凯利.md" --json "$JSON_DIR/凯文凯利.json" && echo "  ✅ 凯文凯利"
$PUBLISH --parent "$PARENT" --title "卡若读书笔记：盐铁之辩与AI之道" --md "$NOTE_DIR/卡若读书笔记：盐铁之辩与AI之道.md" --json "$JSON_DIR/盐铁之辩.json" && echo "  ✅ 盐铁之辩"

echo "📌 全部上传完成。飞书节点: https://cunkebao.feishu.cn/wiki/$PARENT"
