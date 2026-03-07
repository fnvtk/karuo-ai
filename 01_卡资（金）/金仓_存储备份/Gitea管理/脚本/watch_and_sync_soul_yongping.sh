#!/bin/bash
# ============================================
# soul-yongping 文件监控 → 有更新自动同步到 Gitea
# 监控根目录（排除 node_modules、.git、dist），停止修改后 3 秒执行同步
# 提交说明写清：变更内容 + 修改原因
# 用法：bash 本脚本（后台运行，Ctrl+C 停止）
# ============================================

REPO="/Users/karuo/Documents/开发/3、自营项目/一场soul的创业实验-永平"
SYNC_SCRIPT="$(dirname "$0")/sync_soul_yongping.sh"
DEBOUNCE_SEC=3

cd "$REPO" || { echo "错误：目录不存在 $REPO"; exit 1; }
[ ! -x "$SYNC_SCRIPT" ] && chmod +x "$SYNC_SCRIPT"

debounce_pid=""
do_sync() {
    kill "$debounce_pid" 2>/dev/null
    ( sleep $DEBOUNCE_SEC; bash "$SYNC_SCRIPT" ) &
    debounce_pid=$!
}

echo "[watch] 开始监控 soul-yongping，停止修改 ${DEBOUNCE_SEC}s 后自动同步到 Gitea（Ctrl+C 停止）"

fswatch -0 -r -e "node_modules" -e ".git" -e "dist" -e "__pycache__" -e ".DS_Store" -e ".pnpm" "$REPO" 2>/dev/null | while IFS= read -r -d '' _; do
    kill "$debounce_pid" 2>/dev/null
    ( sleep $DEBOUNCE_SEC; bash "$SYNC_SCRIPT" ) &
    debounce_pid=$!
done
