#!/bin/bash
# 分布式算力矩阵 → Gitea 同步
# 本地有更新即推送到 open.quwanzhi.com:3000/fnvtk/suanli-juzhen
# 用法：定时执行 或 对话/任务结束后执行

REPO_DIR="/Users/karuo/Documents/1、金：项目/3、自营项目/分布式算力矩阵"
REMOTE="gitea"
BRANCH="main"
MAX_SIZE_MB=5
mkdir -p "$REPO_DIR/00_agent对话记录"
LOG_FILE="$REPO_DIR/00_agent对话记录/sync.log"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE" 2>/dev/null || true; }

cd "$REPO_DIR" || { log "错误：无法进入 $REPO_DIR"; exit 1; }

# 排除 >5MB
if [ -f ".gitignore" ] && grep -q "超过.*MB" .gitignore 2>/dev/null; then
  LARGE=$(find . -type f -size +${MAX_SIZE_MB}M -not -path "./.git/*" 2>/dev/null | wc -l)
  [ "$LARGE" -gt 0 ] && log "排除 ${LARGE} 个 >${MAX_SIZE_MB}MB 文件"
fi

git add -A 2>/dev/null
if git diff --cached --quiet 2>/dev/null; then
  log "无变更，跳过"
  exit 0
fi

CNT=$(git diff --cached --numstat | wc -l | tr -d ' ')
git commit -m "🔄 同步 $(date '+%Y-%m-%d %H:%M') | ${CNT} 个文件" --quiet 2>/dev/null || exit 1
git push "$REMOTE" "$BRANCH" --quiet 2>&1
[ $? -eq 0 ] && log "推送成功 ${CNT} 个文件" || log "推送失败"
