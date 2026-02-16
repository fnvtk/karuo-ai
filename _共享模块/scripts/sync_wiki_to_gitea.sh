#!/bin/bash
# 将 _共享模块/wiki_source/ 同步到 Gitea 百科（karuo-ai.wiki）
# HTTPS 失败时自动用 SSH 初始化并同步。

set -e
REPO_DIR="/Users/karuo/Documents/个人/卡若AI"
WIKI_SRC="$REPO_DIR/_共享模块/wiki_source"
WIKI_CLONE="$REPO_DIR/_共享模块/.wiki_clone"
WIKI_HTTPS="http://fnvtk:Zhiqun1984@open.quwanzhi.com:3000/fnvtk/karuo-ai.wiki.git"
WIKI_SSH="ssh://fnvtk@open.quwanzhi.com:22201/volume1/git/github/fnvtk/karuo-ai.wiki.git"

cd "$REPO_DIR"
mkdir -p "$(dirname "$WIKI_CLONE")"

if [ ! -d "$WIKI_CLONE/.git" ]; then
  rm -rf "$WIKI_CLONE" 2>/dev/null || true
  if ! git clone "$WIKI_HTTPS" "$WIKI_CLONE" 2>/dev/null; then
    echo "HTTPS 克隆失败，尝试 SSH 初始化百科..."
    bash "$REPO_DIR/_共享模块/scripts/wiki_init_ssh.sh" 2>/dev/null || true
    if ! git clone "$WIKI_SSH" "$WIKI_CLONE" 2>/dev/null; then
      if ! git clone "$WIKI_HTTPS" "$WIKI_CLONE" 2>/dev/null; then
        echo "请到 Gitea 仓库「百科」→「创建第一个页面」保存一次，或检查 SSH：ssh -p 22201 fnvtk@open.quwanzhi.com"
        exit 1
      fi
    else
      cd "$WIKI_CLONE" && git remote set-url origin "$WIKI_SSH" && cd "$REPO_DIR"
    fi
  fi
fi

cd "$WIKI_CLONE"
git fetch origin 2>/dev/null || true
git reset --hard origin/master 2>/dev/null || git reset --hard origin/main 2>/dev/null || true

cp -f "$WIKI_SRC"/*.md . 2>/dev/null || true
git add -A
if git diff --cached --quiet; then
  echo "百科无变更，跳过推送。"
  exit 0
fi
git commit -m "百科同步: $(date '+%Y-%m-%d %H:%M')"
git push origin HEAD 2>/dev/null || git remote set-url origin "$WIKI_SSH" && git push origin HEAD
git push origin HEAD:master 2>/dev/null || true

echo "百科已同步 → http://open.quwanzhi.com:3000/fnvtk/karuo-ai/wiki"
