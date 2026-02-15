#!/bin/bash
# 批量将 NAS 上有但 Gitea 界面不显示的仓库，通过 API 注册到 Gitea
# 用法：先获取 Gitea 已有列表，再对缺失的用 API 创建
# 注意：API 创建可能产生空仓库，若本地有内容需手动 push

GITEA="http://open.quwanzhi.com:3000"
AUTH="fnvtk:Zhiqun1984"

# 从 API 获取已存在的仓库
EXISTING=$(curl -s -u "$AUTH" "$GITEA/api/v1/user/repos" | python3 -c "
import json,sys
d=json.load(sys.stdin)
for r in d: print(r['name'])
" 2>/dev/null)

# NAS 上的仓库列表（需 SSH 获取，此处写死常用项）
NAS_REPOS="cunkebao cunkebao_v3 cunkebao_v4 kr kr-phone karuo-deploy wanzhi zhiji godeye my mybooks"

for repo in $NAS_REPOS; do
  if echo "$EXISTING" | grep -q "^${repo}$"; then
    echo "跳过(已存在): $repo"
  else
    echo "创建: $repo"
    curl -s -u "$AUTH" -X POST "$GITEA/api/v1/user/repos" \
      -H "Content-Type: application/json" \
      -d "{\"name\":\"$repo\",\"description\":\"\",\"private\":false}" | python3 -c "
import json,sys
try:
  d=json.load(sys.stdin)
  print('  OK ->', d.get('html_url',''))
except: print('  失败')
"
    sleep 0.5
  fi
done
