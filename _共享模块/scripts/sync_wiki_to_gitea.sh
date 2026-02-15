#!/bin/bash
# 将 _共享模块/wiki_source/ 同步到 Gitea 百科（karuo-ai.wiki）
# 使用：bash _共享模块/scripts/sync_wiki_to_gitea.sh

set -e
REPO_DIR="/Users/karuo/Documents/个人/卡若AI"
WIKI_SRC="$REPO_DIR/_共享模块/wiki_source"
WIKI_CLONE="$REPO_DIR/_共享模块/.wiki_clone"
WIKI_REMOTE="http://fnvtk:Zhiqun1984@open.quwanzhi.com:3000/fnvtk/karuo-ai.wiki.git"

cd "$REPO_DIR"
mkdir -p "$(dirname "$WIKI_CLONE")"

if [ ! -d "$WIKI_CLONE/.git" ]; then
  rm -rf "$WIKI_CLONE" 2>/dev/null || true
  if ! git clone "$WIKI_REMOTE" "$WIKI_CLONE" 2>/dev/null; then
    echo "百科尚未初始化，尝试通过 API 初始化..."
    bash "$REPO_DIR/_共享模块/scripts/init_wiki_gitea.sh" 2>/dev/null || true
    if ! git clone "$WIKI_REMOTE" "$WIKI_CLONE" 2>/dev/null; then
      echo "请到 Gitea 仓库「百科」→「创建第一个页面」，标题填 Home 保存一次，再运行本脚本。"
      exit 1
    fi
  fi
fi

cd "$WIKI_CLONE"
git fetch origin
git reset --hard origin/master 2>/dev/null || git reset --hard origin/main 2>/dev/null || true

cp -f "$WIKI_SRC"/*.md . 2>/dev/null || true
git add -A
if git diff --cached --quiet; then
  echo "百科无变更，跳过推送。"
  exit 0
fi
git commit -m "百科同步: $(date '+%Y-%m-%d %H:%M')"
git push origin HEAD

echo "百科已同步到 Gitea → 打开仓库「百科」页查看。"
