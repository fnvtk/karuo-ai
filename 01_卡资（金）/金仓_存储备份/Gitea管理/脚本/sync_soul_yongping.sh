#!/bin/bash
# ============================================
# soul-yongping → Gitea 同步（有变更则提交+推送）
# 提交说明写清：变更内容 + 修改原因（由 生成变更说明_soul_yongping.py 生成）
# 用法：bash 本脚本；或被 watch_and_sync_soul_yongping.sh 调用
# ============================================

REPO="/Users/karuo/Documents/开发/3、自营项目/一场soul的创业实验-永平"
REMOTE="gitea"
BRANCH="main"
TOKEN='07f82fbd81a64fb714d9a6c47b11cc5b98f2fa2e'
LOG_FILE="/Users/karuo/Documents/个人/卡若AI/01_卡资（金）/金仓_存储备份/Gitea管理/sync_soul_yongping.log"
SCRIPT_DIR="$(dirname "$0")"
SUMMARY_SCRIPT="$SCRIPT_DIR/生成变更说明_soul_yongping.py"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"; }

cd "$REPO" || { log "错误：目录不存在 $REPO"; exit 1; }

# 设置 remote URL（含 Token）
git remote set-url gitea "http://fnvtk:${TOKEN}@open.quwanzhi.com:3000/fnvtk/soul-yongping.git" 2>/dev/null

# 检查是否有变更
git add -A 2>/dev/null
if git diff --cached --quiet 2>/dev/null; then
    log "无变更，跳过同步"
    exit 0
fi

# 生成提交说明（变更内容 | 原因）
TIMESTAMP=$(date '+%Y-%m-%d %H:%M')
if [ -f "$SUMMARY_SCRIPT" ]; then
    SUMMARY=$(git diff --cached --name-only 2>/dev/null | python3 "$SUMMARY_SCRIPT" 2>/dev/null)
    [ -z "$SUMMARY" ] && SUMMARY="本地开发更新"
else
    SUMMARY="本地开发更新"
fi
COMMIT_MSG="sync: $SUMMARY"

git commit -m "$COMMIT_MSG" --quiet 2>/dev/null
if [ $? -ne 0 ]; then
    log "错误：提交失败"
    exit 1
fi
log "提交成功：$COMMIT_MSG"

# 推送（直连、无代理、HTTP/1.1，避免超时）
unset HTTP_PROXY HTTPS_PROXY ALL_PROXY
GIT_HTTP_VERSION=HTTP/1.1 git push "$REMOTE" "$BRANCH" --quiet 2>&1
PUSH_RESULT=$?

if [ $PUSH_RESULT -eq 0 ]; then
    log "推送成功 → gitea/$BRANCH"
else
    log "推送失败（code=$PUSH_RESULT）"
    exit 1
fi

exit 0
