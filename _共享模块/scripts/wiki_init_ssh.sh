#!/bin/bash
# 百科 SSH 初始化：在 NAS 上创建 karuo-ai.wiki.git 并推送 wiki_source 内容
# 当 API/HTTPS 无法初始化时用此脚本。需能 SSH 到 Gitea 所在主机。

REPO_DIR="/Users/karuo/Documents/个人/卡若AI"
WIKI_SRC="$REPO_DIR/_共享模块/wiki_source"
SSH_HOST="open.quwanzhi.com"
SSH_PORT="22201"
SSH_USER="fnvtk"
WIKI_PATH="/volume1/git/github/fnvtk/karuo-ai.wiki.git"
SSH_REMOTE="ssh://${SSH_USER}@${SSH_HOST}:${SSH_PORT}/${WIKI_PATH}"

set -e
cd "$REPO_DIR"

# 1. SSH 创建 wiki bare 仓库（若不存在）
echo "在 NAS 上创建 wiki 仓库..."
ssh -o StrictHostKeyChecking=no -o ConnectTimeout=15 -p "$SSH_PORT" "${SSH_USER}@${SSH_HOST}" \
  "mkdir -p $WIKI_PATH && (test -f $WIKI_PATH/HEAD || (cd $WIKI_PATH && git init --bare))"

# 2. 本地建临时仓库并推送
TMP_WIKI=$(mktemp -d)
trap "rm -rf $TMP_WIKI" EXIT
cd "$TMP_WIKI"
git init -q
cp -f "$WIKI_SRC"/*.md . 2>/dev/null || true
git add -A
git commit -m "wiki init $(date '+%Y-%m-%d %H:%M')" --allow-empty -q
git remote add origin "$SSH_REMOTE"
git push -u origin master 2>/dev/null || { git branch -M main; git push -u origin main; }

echo "百科已通过 SSH 初始化并推送完成。"
exit 0
