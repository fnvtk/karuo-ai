#!/bin/bash
# ============================================
# 卡若AI → Gitea 实时同步（open.quwanzhi.com:13000/fnvtk/karuo-ai，frp 避开 kr 宝塔 3000 端口）
# 规则：超过 20MB 的文件不上传（与 Skill 目录规则一致）
# 推送成功后：1) 同步百科  2) 写入 gitea_push_log.md  3) 写入 代码管理.md
# ============================================

REPO_DIR="/Users/karuo/Documents/个人/卡若AI"
REMOTE="gitea"
BRANCH="main"
MAX_SIZE_MB=20
LOG_FILE="$REPO_DIR/01_卡资（金）/金仓_存储备份/Gitea管理/sync.log"
PUSH_LOG="$REPO_DIR/运营中枢/工作台/gitea_push_log.md"
CODE_MGMT="$REPO_DIR/运营中枢/工作台/代码管理.md"
GITEA_URL="http://open.quwanzhi.com:13000/fnvtk/karuo-ai"
GITIGNORE="$REPO_DIR/.gitignore"
WIKI_SCRIPT="$REPO_DIR/01_卡资（金）/金仓_存储备份/Gitea管理/脚本/sync_wiki_to_gitea.sh"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"; }

# 限制 sync.log 大小
if [ -f "$LOG_FILE" ] && [ $(stat -f%z "$LOG_FILE" 2>/dev/null || echo 0) -gt 512000 ]; then
    tail -100 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"
fi

cd "$REPO_DIR" || { log "错误：无法进入目录 $REPO_DIR"; exit 1; }

# ============================================
# Step 1: 排除 >20MB 文件（动态写入 .gitignore 区段）
# ============================================
MARKER_START="# === 自动排除：超过${MAX_SIZE_MB}MB的文件（脚本自动管理，勿手动修改）==="
MARKER_END="# === 自动排除结束 ==="

LARGE_FILES=$(find . -type f -size +${MAX_SIZE_MB}M -not -path "./.git/*" 2>/dev/null | sort)
NEW_SECTION="$MARKER_START"
if [ -n "$LARGE_FILES" ]; then
    while IFS= read -r file; do
        clean_path="${file#./}"
        NEW_SECTION="$NEW_SECTION
$clean_path"
    done <<< "$LARGE_FILES"
fi
NEW_SECTION="$NEW_SECTION
$MARKER_END"

if grep -q "$MARKER_START" "$GITIGNORE" 2>/dev/null; then
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
    echo "" >> "$GITIGNORE"
    echo "$NEW_SECTION" >> "$GITIGNORE"
fi

LARGE_COUNT=$(echo "$LARGE_FILES" | grep -c '.' 2>/dev/null || echo 0)
log "大文件扫描：$LARGE_COUNT 个 >${MAX_SIZE_MB}MB 已排除"

# ============================================
# Step 2: 检查是否有变更
# ============================================
git add -A 2>/dev/null
if git diff --cached --quiet 2>/dev/null; then
    log "无变更，跳过同步"
    exit 0
fi

# ============================================
# Step 3: 提交（提交说明写具体更新内容，不写「变更 N 个文件」）
# ============================================
CHANGED_COUNT=$(git diff --cached --numstat | wc -l | tr -d ' ')
TIMESTAMP=$(date '+%Y-%m-%d %H:%M')
SUMMARY_SCRIPT="$REPO_DIR/01_卡资（金）/金仓_存储备份/Gitea管理/脚本/生成同步说明.py"
if [ -f "$SUMMARY_SCRIPT" ]; then
    SUMMARY=$(git diff --cached --name-only 2>/dev/null | python3 "$SUMMARY_SCRIPT" 2>/dev/null)
    [ -z "$SUMMARY" ] && SUMMARY="多目录更新"
else
    SUMMARY="多目录更新"
fi
COMMIT_MSG="🔄 卡若AI 同步 $TIMESTAMP | 更新：$SUMMARY | 排除 >${MAX_SIZE_MB}MB: ${LARGE_COUNT} 个"

git commit -m "$COMMIT_MSG" --quiet 2>/dev/null
if [ $? -ne 0 ]; then
    log "错误：提交失败"
    exit 1
fi
log "提交成功：$COMMIT_MSG"

# ============================================
# Step 4: 推送到 Gitea（智能：局域网用 IP，外网用域名+代理）
# ============================================
PUSH_SCRIPT="$REPO_DIR/01_卡资（金）/金仓_存储备份/Gitea管理/脚本/gitea_push_smart.sh"
if [ -x "$PUSH_SCRIPT" ]; then
    bash "$PUSH_SCRIPT" "$REPO_DIR" "$REMOTE" "$BRANCH" 2>&1 | tee -a "$LOG_FILE"
    PUSH_RESULT=${PIPESTATUS[0]}
else
    git push "$REMOTE" "$BRANCH" --quiet 2>&1
    PUSH_RESULT=$?
fi

if [ $PUSH_RESULT -eq 0 ]; then
    log "推送成功 → gitea/$BRANCH"
    WIKI_STATUS="未执行"
    if [ -x "$WIKI_SCRIPT" ]; then
        if bash "$WIKI_SCRIPT" >> "$LOG_FILE" 2>&1; then
            WIKI_STATUS="成功"
            log "百科同步成功"
        else
            WIKI_STATUS="失败(百科未初始化或网络)"
            log "百科同步失败"
        fi
    fi
    # 建立推送记录
    mkdir -p "$(dirname "$PUSH_LOG")"
    if [ ! -f "$PUSH_LOG" ]; then
        echo -e "# Gitea 推送记录\n\n> 卡若AI 有更新即同步到 open.quwanzhi.com:13000/fnvtk/karuo-ai\n\n| 时间 | 提交说明 |\n|:---|:---|" > "$PUSH_LOG"
    fi
    echo "| $(date '+%Y-%m-%d %H:%M:%S') | $COMMIT_MSG |" >> "$PUSH_LOG"
    # 代码管理：写入本次上传（代码+百科+链接）
    if [ -f "$CODE_MGMT" ]; then
        echo "| $(date '+%Y-%m-%d %H:%M:%S') | 成功 | $WIKI_STATUS | $COMMIT_MSG | [仓库]($GITEA_URL) [百科]($GITEA_URL/wiki) |" >> "$CODE_MGMT"
    fi
else
    log "推送失败（code=$PUSH_RESULT），尝试强制推送..."
    git push "$REMOTE" "$BRANCH" --force --quiet 2>&1
    if [ $? -eq 0 ]; then
        log "强制推送成功 → gitea/$BRANCH"
        WIKI_STATUS="未执行"
        if [ -x "$WIKI_SCRIPT" ]; then
            if bash "$WIKI_SCRIPT" >> "$LOG_FILE" 2>&1; then WIKI_STATUS="成功"; else WIKI_STATUS="失败"; fi
        fi
        mkdir -p "$(dirname "$PUSH_LOG")"
        [ ! -f "$PUSH_LOG" ] && echo -e "# Gitea 推送记录\n\n| 时间 | 提交说明 |\n|:---|:---|" > "$PUSH_LOG"
        echo "| $(date '+%Y-%m-%d %H:%M:%S') | [强制] $COMMIT_MSG |" >> "$PUSH_LOG"
        if [ -f "$CODE_MGMT" ]; then
            echo "| $(date '+%Y-%m-%d %H:%M:%S') | 成功(强制) | $WIKI_STATUS | $COMMIT_MSG | [仓库]($GITEA_URL) [百科]($GITEA_URL/wiki) |" >> "$CODE_MGMT"
        fi
    else
        log "错误：强制推送也失败"
        exit 1
    fi
fi

exit 0
