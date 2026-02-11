#!/usr/bin/env bash
# 卡若AI · 本地 → GitHub 同步（路径：个人/卡若AI）
# 用法：./scripts/push-to-github.sh [提交说明]

set -e
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

if ! git remote get-url origin &>/dev/null; then
  echo "未配置 origin。请执行: git remote add origin <仓库URL>"
  exit 1
fi

if git diff --quiet && git diff --cached --quiet && [[ -z $(git status -s) ]]; then
  echo "[$(date '+%Y-%m-%d %H:%M')] 无变更，跳过推送。"
  exit 0
fi

git add -A
msg="${1:-同步卡若AI：$(date '+%Y-%m-%d %H:%M')}"
git commit -m "$msg" || true
git push origin HEAD
echo "[$(date '+%Y-%m-%d %H:%M')] 已推送到 GitHub。"
