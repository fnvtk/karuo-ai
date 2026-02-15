#!/bin/bash
# ============================================
# 卡若AI 自动同步脚本
# 功能：每5分钟自动提交并推送到存客宝NAS的Gitea
# 规则：超过5MB的文件自动排除不上传
# ============================================

REPO_DIR="/Users/karuo/Documents/个人/卡若AI"
REMOTE="gitea"
BRANCH="main"
MAX_SIZE_MB=5
LOG_FILE="$REPO_DIR/_共享模块/sync.log"
GITIGNORE="$REPO_DIR/.gitignore"

# 日志函数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# 限制日志文件大小（最大 500KB）
if [ -f "$LOG_FILE" ] && [ $(stat -f%z "$LOG_FILE" 2>/dev/null || echo 0) -gt 512000 ]; then
    tail -100 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"
fi

cd "$REPO_DIR" || { log "错误：无法进入目录 $REPO_DIR"; exit 1; }

# ============================================
# Step 1: 动态查找 >5MB 的文件，更新 .gitignore
# ============================================
MARKER_START="# === 自动排除：超过${MAX_SIZE_MB}MB的文件（脚本自动管理，勿手动修改）==="
MARKER_END="# === 自动排除结束 ==="

# 查找所有 >5MB 的文件（排除 .git 目录）
LARGE_FILES=$(find . -type f -size +${MAX_SIZE_MB}M -not -path "./.git/*" 2>/dev/null | sort)

# 生成新的大文件排除列表
NEW_SECTION="$MARKER_START"
if [ -n "$LARGE_FILES" ]; then
    while IFS= read -r file; do
        # 去掉开头的 ./
        clean_path="${file#./}"
        NEW_SECTION="$NEW_SECTION
$clean_path"
    done <<< "$LARGE_FILES"
fi
NEW_SECTION="$NEW_SECTION
$MARKER_END"

# 更新 .gitignore 中的自动管理区域
if grep -q "$MARKER_START" "$GITIGNORE" 2>/dev/null; then
    # 已存在标记，替换区域内容
    # 用 python 处理多行替换更可靠
    python3 -c "
import re
with open('$GITIGNORE', 'r') as f:
    content = f.read()
pattern = re.escape('$MARKER_START') + r'.*?' + re.escape('$MARKER_END')
new_content = re.sub(pattern, '''$NEW_SECTION''', content, flags=re.DOTALL)
with open('$GITIGNORE', 'w') as f:
    f.write(new_content)
" 2>/dev/null
else
    # 不存在标记，追加到末尾
    echo "" >> "$GITIGNORE"
    echo "$NEW_SECTION" >> "$GITIGNORE"
fi

LARGE_COUNT=$(echo "$LARGE_FILES" | grep -c '.' 2>/dev/null || echo 0)
log "大文件扫描：发现 $LARGE_COUNT 个超过 ${MAX_SIZE_MB}MB 的文件已排除"

# ============================================
# Step 2: 检查是否有变更
# ============================================
git add -A 2>/dev/null

# 检查是否有需要提交的变更
if git diff --cached --quiet 2>/dev/null; then
    log "无变更，跳过同步"
    exit 0
fi

# ============================================
# Step 3: 自动提交
# ============================================
CHANGED_COUNT=$(git diff --cached --numstat | wc -l | tr -d ' ')
TIMESTAMP=$(date '+%Y-%m-%d %H:%M')

git commit -m "$(cat <<EOF
🔄 自动同步 $TIMESTAMP

变更文件: ${CHANGED_COUNT} 个
排除大文件: ${LARGE_COUNT} 个 (>${MAX_SIZE_MB}MB)
EOF
)" --quiet 2>/dev/null

if [ $? -ne 0 ]; then
    log "错误：提交失败"
    exit 1
fi

log "提交成功：${CHANGED_COUNT} 个文件变更"

# ============================================
# Step 4: 推送到 Gitea
# ============================================
# 设置超时 60 秒
timeout 60 git push "$REMOTE" "$BRANCH" --quiet 2>&1
PUSH_RESULT=$?

if [ $PUSH_RESULT -eq 0 ]; then
    log "推送成功 → $REMOTE/$BRANCH"
elif [ $PUSH_RESULT -eq 124 ]; then
    log "警告：推送超时（60秒），下次重试"
else
    # 如果推送失败（可能远程有差异），尝试 force push
    log "推送失败（code=$PUSH_RESULT），尝试强制推送..."
    timeout 60 git push "$REMOTE" "$BRANCH" --force --quiet 2>&1
    if [ $? -eq 0 ]; then
        log "强制推送成功 → $REMOTE/$BRANCH"
    else
        log "错误：强制推送也失败，需要手动处理"
    fi
fi

exit 0
