#!/bin/bash
# 尝试通过 Gitea API 初始化百科（创建第一页），使后续 sync_wiki_to_gitea.sh 可推送
# 若 API 不支持或失败，请到 Gitea 仓库「百科」→「创建第一个页面」标题填 Home 保存一次

REPO_DIR="/Users/karuo/Documents/个人/卡若AI"
WIKI_SRC="$REPO_DIR/_共享模块/wiki_source"
API="http://open.quwanzhi.com:3000/api/v1"
AUTH="fnvtk:Zhiqun1984"
OWNER="fnvtk"
REPO="karuo-ai"

# Gitea wiki 创建第一页：POST /repos/{owner}/{repo}/wiki/new（请求体 title + content）
CONTENT_JSON=$(python3 -c "
import json
path = '''$WIKI_SRC/Home.md'''
try:
    with open(path) as f: raw = f.read()
except Exception: raw = '# 卡若AI 百科'
print(json.dumps({'title':'Home','content':raw}))
" 2>/dev/null) || CONTENT_JSON='{"title":"Home","content":"# 卡若AI 百科"}'

HTTP=$(curl -s -o /dev/null -w "%{http_code}" -u "$AUTH" -X POST "$API/repos/$OWNER/$REPO/wiki/new" \
  -H "Content-Type: application/json" \
  -d "$CONTENT_JSON" 2>/dev/null)

if [ "$HTTP" = "201" ] || [ "$HTTP" = "200" ]; then
  echo "百科已通过 API 初始化。"
  exit 0
fi

# 不支持或失败：提示手动创建第一页
echo "百科尚未初始化。请到 Gitea 仓库页操作一次："
echo "  1. 打开 http://open.quwanzhi.com:3000/fnvtk/karuo-ai/wiki"
echo "  2. 点击「创建第一个页面」"
echo "  3. 标题填 Home，内容随意，保存"
echo "  4. 再运行: bash _共享模块/scripts/sync_wiki_to_gitea.sh"
exit 1
