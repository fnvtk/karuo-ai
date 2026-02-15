#!/bin/bash
# 在 Gitea 创建版本发布：打 tag 并可选创建 Release 说明
# 使用：bash _共享模块/scripts/create_gitea_release.sh [版本号] [说明]
# 例：  bash _共享模块/scripts/create_gitea_release.sh v1.0.0 "首次结构化发布"

set -e
REPO_DIR="/Users/karuo/Documents/个人/卡若AI"
GITEA_API="http://open.quwanzhi.com:3000/api/v1"
AUTH="fnvtk:Zhiqun1984"
REPO_OWNER="fnvtk"
REPO_NAME="karuo-ai"

VERSION="${1:-v$(date '+%Y.%m.%d')}"
NOTES="${2:-卡若AI 版本 $VERSION}"

cd "$REPO_DIR"
# 确保在 main 并拉取最新
git checkout main 2>/dev/null || true
git pull gitea main 2>/dev/null || true

# 打 tag 并推送
git tag -a "$VERSION" -m "$NOTES" 2>/dev/null || true
git push gitea "$VERSION" 2>/dev/null || true

# 调用 Gitea API 创建 Release（若 tag 已存在则更新说明）
curl -s -u "$AUTH" -X POST "$GITEA_API/repos/$REPO_OWNER/$REPO_NAME/releases" \
  -H "Content-Type: application/json" \
  -d "{\"tag_name\":\"$VERSION\",\"name\":\"$VERSION\",\"body\":\"$NOTES\"}" 2>/dev/null || \
curl -s -u "$AUTH" -X PATCH "$GITEA_API/repos/$REPO_OWNER/$REPO_NAME/releases/tags/$VERSION" \
  -H "Content-Type: application/json" \
  -d "{\"body\":\"$NOTES\"}" 2>/dev/null || true

echo "已创建/更新发布: $VERSION"
echo "打开: http://open.quwanzhi.com:3000/fnvtk/karuo-ai/releases"
